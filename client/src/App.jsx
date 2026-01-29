import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';

// In production (on Render), client and server are on the same origin, so use empty string
// In development, use localhost:8000
const SERVER_URL = import.meta.env.VITE_SERVER_URL || (import.meta.env.PROD ? '' : 'http://localhost:8000');

function App() {
  const [socket, setSocket] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [gameState, setGameState] = useState(null);
  const [players, setPlayers] = useState([]);
  const [playerID, setPlayerID] = useState(null);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);

  // Check for room code in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) {
      setRoomCode(room.toUpperCase());
    }
  }, []);

  // Initialize socket connection
  useEffect(() => {
    // Only create socket if it doesn't exist
    if (socket && socket.connected) {
      return;
    }

    const newSocket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    let connectionTimeout;

    const handleConnect = () => {
      console.log('Connected to server');
      if (connectionTimeout) clearTimeout(connectionTimeout);
      setConnected(true);
      setError(null);
    };

    const handleConnectError = (error) => {
      console.error('Connection error:', error);
      if (connectionTimeout) clearTimeout(connectionTimeout);
      setConnected(false);
      // Don't set error on initial connection attempt - let it retry
      if (newSocket.recovered) {
        setError('Connection lost. Reconnecting...');
      }
    };

    const handleDisconnect = (reason) => {
      console.log('Disconnected from server:', reason);
      setConnected(false);
      
      // Only show error if it's not a normal disconnection
      if (reason === 'io server disconnect') {
        // Server disconnected, don't reconnect
        setError('Server disconnected. Please refresh the page.');
        newSocket.disconnect();
      } else if (reason === 'io client disconnect') {
        // Client disconnected, don't show error
      } else {
        // Network error, will auto-reconnect
        console.log('Will attempt to reconnect...');
      }
    };

    const handleError = (data) => {
      console.error('Server error:', data);
      if (data && data.message) {
        setError(data.message);
        // Always show alert for errors (especially duplicate names)
        alert(data.message);
      }
    };

    const handleGameState = (state) => {
      console.log('Received game state:', state);
      console.log('Game phase:', state?.gamePhase, 'Round:', state?.currentRound);
      setGameState(state);
      // Update playerID from game state if available
      if (state && state.playerID !== undefined) {
        setPlayerID(state.playerID.toString());
      }
    };

    const handleRoomUpdated = (data) => {
      console.log('Room updated:', data);
      setPlayers(data.players || []);
      if (data.gameState) {
        setGameState((prev) => {
          if (prev) {
            return { ...prev, ...data.gameState };
          }
          return data.gameState;
        });
      }
    };

    const handleGameFinished = (data) => {
      setGameState((prev) => ({
        ...prev,
        gamePhase: 'finished',
        winner: data.winner,
        winReason: data.winReason,
      }));
    };

    // Set up event listeners
    newSocket.on('connect', handleConnect);
    newSocket.on('connect_error', handleConnectError);
    newSocket.on('disconnect', handleDisconnect);
    newSocket.on('error', handleError);
    newSocket.on('game-state', handleGameState);
    newSocket.on('room-updated', handleRoomUpdated);
    newSocket.on('game-finished', handleGameFinished);

    // Connection timeout
    connectionTimeout = setTimeout(() => {
      if (!newSocket.connected) {
        setError('Connection timeout. Make sure the server is running on ' + SERVER_URL);
        setConnected(false);
      }
    }, 5000);

    setSocket(newSocket);

    // Cleanup function
    return () => {
      if (connectionTimeout) clearTimeout(connectionTimeout);
      // Only close if we're actually cleaning up (not just re-rendering)
      // Don't close on every render - let Socket.io handle reconnection
      if (newSocket && !newSocket.connected) {
        newSocket.removeAllListeners();
        newSocket.close();
      }
    };
  }, []); // Empty deps - only run once

  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }

    if (!socket) {
      alert('Not connected to server. Please wait for connection...');
      return;
    }

    // Generate a random room code - exactly 6 uppercase letters
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let newRoomCode = '';
    for (let i = 0; i < 6; i++) {
      newRoomCode += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    setRoomCode(newRoomCode);
    connectToRoom(newRoomCode, playerName);
  };

  const handleJoinRoom = () => {
    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }
    if (!roomCode.trim()) {
      alert('Please enter a room code');
      return;
    }
    // Validate room code is exactly 6 uppercase letters
    const normalizedCode = roomCode.toUpperCase().replace(/[^A-Z]/g, '');
    if (normalizedCode.length !== 6) {
      alert('Room code must be exactly 6 letters');
      return;
    }
    if (!socket) {
      alert('Not connected to server. Please wait for connection...');
      return;
    }

    connectToRoom(normalizedCode, playerName);
  };

  const connectToRoom = (code, name) => {
    if (!socket) {
      alert('Socket not available. Please wait for connection...');
      return;
    }

    if (!socket.connected) {
      alert('Not connected to server. Please wait...');
      // Try to reconnect
      socket.connect();
      return;
    }

    console.log('Joining room:', code, 'as', name);
    socket.emit('join-room', { roomCode: code, playerName: name });
  };

  // Update playerID when gameState changes or socket connects
  useEffect(() => {
    if (socket && socket.playerID !== undefined) {
      // Get playerID from socket (set by server)
      setPlayerID(socket.playerID.toString());
    } else if (gameState && players.length > 0) {
      // Fallback: try to find player by name
      const player = players.find((p) => p.name === playerName);
      if (player) {
        setPlayerID(player.id.toString());
      }
    }
  }, [gameState, players, playerName, socket]);

  // Show connection error only if it's a critical error (not just "connecting")
  // Allow user to still interact with the form

  // Show lobby if not in a game
  if (!gameState || gameState.gamePhase === 'lobby') {
    return (
      <Lobby
        socket={socket}
        connected={connected}
        playerName={playerName}
        setPlayerName={setPlayerName}
        roomCode={roomCode}
        setRoomCode={setRoomCode}
        players={players}
        playerID={playerID}
        gameState={gameState}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
      />
    );
  }

  // Handle return to lobby (not used anymore - server handles reset via 'new-game')
  const handleReturnToLobby = () => {
    // This is kept for compatibility but shouldn't be called anymore
    // Server's 'new-game' handler now resets everyone
  };

  // Show game board
  return (
    <GameBoard
      socket={socket}
      gameState={gameState}
      players={players}
      playerID={playerID}
      playerName={playerName}
      onReturnToLobby={handleReturnToLobby}
    />
  );
}

export default App;
