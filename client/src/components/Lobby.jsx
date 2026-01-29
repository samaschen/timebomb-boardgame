import React, { useState, useEffect } from 'react';

function Lobby({
  socket,
  connected,
  playerName,
  setPlayerName,
  roomCode,
  setRoomCode,
  players,
  playerID,
  gameState,
  onCreateRoom,
  onJoinRoom,
}) {
  const [ready, setReady] = useState(false);
  const isHost = players.length > 0 && players[0].id === playerID;

  useEffect(() => {
    if (gameState && playerID !== undefined) {
      setReady(gameState.playerReady?.[playerID] || false);
    }
  }, [gameState, playerID]);

  const handleReady = () => {
    if (!socket || !connected) return;
    const newReady = !ready;
    setReady(newReady);
    socket.emit('set-ready', { ready: newReady });
  };

  const handleStartGame = () => {
    if (!socket || !connected) return;
    socket.emit('start-game');
  };

  const allReady = players.length > 0 && players.every((p) => gameState?.playerReady?.[p.id] === true);
  const canStart = players.length >= 4 && players.length <= 8 && allReady;

  // Show create/join form if not in a room
  if (!gameState || players.length === 0) {
    return (
      <div className="card" style={{ transform: 'scale(0.75)', transformOrigin: 'top center', marginBottom: '-25%' }}>
        <h1>Time Bomb Game</h1>
        {!connected && (
          <p style={{ color: '#ff9800', marginBottom: '16px' }}>
            Connecting to server... {socket ? '(Attempting connection)' : '(Initializing)'}
          </p>
        )}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            Your Name:
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            maxLength={20}
          />
        </div>
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            Room Code (leave empty to create new room):
          </label>
          <input
            type="text"
            value={roomCode}
            onChange={(e) => {
              // Only allow letters, convert to uppercase, limit to 6 characters
              const value = e.target.value.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 6);
              setRoomCode(value);
            }}
            placeholder="Enter 6-letter code (e.g., ABCDEF)"
            maxLength={6}
            style={{ textTransform: 'uppercase', letterSpacing: '2px', fontFamily: 'monospace' }}
          />
          {roomCode.length > 0 && roomCode.length < 6 && (
            <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              {6 - roomCode.length} more letter{6 - roomCode.length !== 1 ? 's' : ''} needed
            </p>
          )}
        </div>
        <div className="button-group">
          <button
            onClick={onCreateRoom}
            style={{ background: '#2196F3' }}
            disabled={!socket || !playerName.trim()}
            title={!socket ? 'Connecting to server...' : !playerName.trim() ? 'Please enter your name' : ''}
          >
            Create Room
          </button>
          <button
            onClick={onJoinRoom}
            style={{ background: '#4CAF50' }}
            disabled={!socket || !playerName.trim() || !roomCode.trim() || roomCode.length !== 6}
            title={
              !socket ? 'Connecting to server...' :
              !playerName.trim() ? 'Please enter your name' :
              !roomCode.trim() ? 'Please enter a room code' :
              roomCode.length !== 6 ? 'Room code must be 6 letters' : ''
            }
          >
            Join Room
          </button>
        </div>
        {!connected && (
          <div style={{ marginTop: '16px', padding: '12px', background: '#fff3cd', borderRadius: '8px' }}>
            <p style={{ fontSize: '14px', color: '#856404', margin: 0 }}>
              <strong>Connection Issue:</strong> Make sure the server is running. Open a terminal and run:
            </p>
            <code style={{ display: 'block', marginTop: '8px', padding: '8px', background: '#fff', borderRadius: '4px' }}>
              npm run dev
            </code>
          </div>
        )}
      </div>
    );
  }

  // Show waiting room
  return (
    <div className="card" style={{ transform: 'scale(0.75)', transformOrigin: 'top center', marginBottom: '-25%' }}>
      <h1>Waiting Room</h1>
      <div className="game-info">
        <p><strong>Room Code:</strong> {gameState?.matchID || roomCode}</p>
        <p><strong>Players:</strong> {players.length} / 8</p>
        {players.length < 4 && (
          <p style={{ color: '#f44336', marginTop: '8px' }}>
            Need at least 4 players to start
          </p>
        )}
      </div>

      <h2>Players in Room:</h2>
      <ul className="player-list">
        {players.map((player) => {
          const isCurrentPlayer = player.id === playerID;
          const playerReady = gameState?.playerReady?.[player.id] || false;
          const isHost = player.isHost || false;
          return (
            <li
              key={player.id}
              className={`player-item ${isCurrentPlayer ? 'current-player' : ''} ${playerReady ? 'ready' : ''}`}
            >
              <span>
                {player.name || `Player ${player.id}`}
                {isHost && <span style={{ marginLeft: '8px', color: '#FF9800', fontWeight: 'bold', fontSize: '12px' }}>(Host)</span>}
              </span>
              <span className="ready-status">
                {playerReady ? '✓ READY' : 'Not Ready'}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="button-group">
        <button
          onClick={handleReady}
          style={{ background: ready ? '#4CAF50' : '#ff9800' }}
          disabled={!socket}
        >
          {ready ? '✓ READY' : 'Click to Ready'}
        </button>
        <button
          className="share-link"
          onClick={() => {
            const url = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
            navigator.clipboard.writeText(url);
            alert('Room link copied to clipboard!');
          }}
        >
          Share Room Link
        </button>
        {isHost && (
          <button
            className="start-game"
            disabled={!canStart || !socket}
            onClick={handleStartGame}
          >
            Start Game
          </button>
        )}
      </div>
    </div>
  );
}

export default Lobby;
