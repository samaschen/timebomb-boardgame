import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';

// In production (on Render), client and server are on the same origin, so use empty string
// In development, use localhost:8000
const SERVER_URL = import.meta.env.VITE_SERVER_URL || (import.meta.env.PROD ? '' : 'http://localhost:8000');

// Session storage keys
const SESSION_KEYS = {
  ROOM_CODE: 'timebomb_roomCode',
  PLAYER_NAME: 'timebomb_playerName',
  PLAYER_ID: 'timebomb_playerID',
};

// Helper functions for session storage
const saveSession = (roomCode, playerName, playerID) => {
  sessionStorage.setItem(SESSION_KEYS.ROOM_CODE, roomCode);
  sessionStorage.setItem(SESSION_KEYS.PLAYER_NAME, playerName);
  sessionStorage.setItem(SESSION_KEYS.PLAYER_ID, playerID);
};

const getSession = () => {
  return {
    roomCode: sessionStorage.getItem(SESSION_KEYS.ROOM_CODE),
    playerName: sessionStorage.getItem(SESSION_KEYS.PLAYER_NAME),
    playerID: sessionStorage.getItem(SESSION_KEYS.PLAYER_ID),
  };
};

const clearSession = () => {
  sessionStorage.removeItem(SESSION_KEYS.ROOM_CODE);
  sessionStorage.removeItem(SESSION_KEYS.PLAYER_NAME);
  sessionStorage.removeItem(SESSION_KEYS.PLAYER_ID);
};

function App() {
  const [socket, setSocket] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [gameState, setGameState] = useState(null);
  const [players, setPlayers] = useState([]);
  const [playerID, setPlayerID] = useState(null);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [attemptingRejoin, setAttemptingRejoin] = useState(false);

  // Check for room code in URL or saved session
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) {
      setRoomCode(room.toUpperCase());
    }
    
    // Load saved session data
    const session = getSession();
    if (session.playerName) {
      setPlayerName(session.playerName);
    }
    if (session.roomCode && !room) {
      setRoomCode(session.roomCode);
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
      
      // Try to rejoin if we have a saved session
      const session = getSession();
      if (session.roomCode && session.playerName && session.playerID) {
        console.log('Attempting to rejoin room:', session.roomCode);
        setAttemptingRejoin(true);
        newSocket.emit('rejoin-room', {
          roomCode: session.roomCode,
          playerName: session.playerName,
          playerID: session.playerID,
        });
      }
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
      setAttemptingRejoin(false);
      // Update playerID from game state if available
      if (state && state.playerID !== undefined) {
        setPlayerID(state.playerID.toString());
        // Save session when we have valid game state with playerID
        if (state.matchID) {
          const currentName = sessionStorage.getItem(SESSION_KEYS.PLAYER_NAME) || '';
          if (currentName) {
            saveSession(state.matchID, currentName, state.playerID.toString());
          }
        }
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

    const handleRejoinSuccess = (data) => {
      console.log('Rejoin successful:', data);
      setAttemptingRejoin(false);
      setPlayerID(data.playerID.toString());
    };

    const handleRejoinFailed = (data) => {
      console.log('Rejoin failed:', data.message);
      setAttemptingRejoin(false);
      // Clear the invalid session
      clearSession();
      // Don't show error - just let user join normally
    };

    const handlePlayerDisconnected = (data) => {
      console.log('Player disconnected:', data);
      // Could show a notification here if desired
    };

    const handleLeftRoom = () => {
      console.log('Left room successfully');
      // Clear all game state
      setGameState(null);
      setPlayers([]);
      setPlayerID(null);
      setRoomCode('');
      // Clear session storage
      clearSession();
    };

    // Set up event listeners
    newSocket.on('connect', handleConnect);
    newSocket.on('connect_error', handleConnectError);
    newSocket.on('disconnect', handleDisconnect);
    newSocket.on('error', handleError);
    newSocket.on('game-state', handleGameState);
    newSocket.on('room-updated', handleRoomUpdated);
    newSocket.on('game-finished', handleGameFinished);
    newSocket.on('rejoin-success', handleRejoinSuccess);
    newSocket.on('rejoin-failed', handleRejoinFailed);
    newSocket.on('player-disconnected', handlePlayerDisconnected);
    newSocket.on('left-room', handleLeftRoom);

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
    // Save player name to session immediately (roomCode and playerID will be saved when we get game-state)
    sessionStorage.setItem(SESSION_KEYS.PLAYER_NAME, name);
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

  // Handle return to lobby (not used anymore - server handles reset via 'new-game')
  const handleReturnToLobby = () => {
    // This is kept for compatibility but shouldn't be called anymore
    // Server's 'new-game' handler now resets everyone
  };

  // Handle leaving the room
  const handleLeaveRoom = () => {
    if (socket) {
      socket.emit('leave-room');
    }
    // Clear session immediately (server will also confirm via 'left-room' event)
    clearSession();
    setGameState(null);
    setPlayers([]);
    setPlayerID(null);
    setRoomCode('');
  };

  // Show reconnecting indicator if attempting to rejoin
  if (attemptingRejoin) {
    return (
      <div className="app-container">
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <h2>Reconnecting...</h2>
          <p style={{ marginTop: '16px', color: '#666' }}>
            Attempting to rejoin your game session
          </p>
          <div style={{ marginTop: '24px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }} />
          </div>
        </div>
      </div>
    );
  }

  // Show lobby if not in a game
  if (!gameState || gameState.gamePhase === 'lobby') {
    return (
      <div className="app-container">
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
          onLeaveRoom={handleLeaveRoom}
        />
      </div>
    );
  }

  // Show game board
  return (
    <div className="app-container">
      <GameBoard
        socket={socket}
        gameState={gameState}
        players={players}
        playerID={playerID}
        playerName={playerName}
        onReturnToLobby={handleReturnToLobby}
      />
    </div>
  );
}

export default App;
