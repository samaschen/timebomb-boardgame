import React, { useState, useEffect } from 'react';

// How to Play content component
const HowToPlayContent = () => (
  <div style={{ textAlign: 'left', fontSize: '14px', lineHeight: '1.6' }}>
    <h2 style={{ marginBottom: '16px', textAlign: 'center' }}>🎮 How to Play</h2>
    
    <h3 style={{ marginTop: '20px', marginBottom: '8px' }}>Overview</h3>
    <p style={{ marginBottom: '12px' }}>
      Time Bomb is a social deduction game where players are secretly divided into two teams:
    </p>
    <ul style={{ marginBottom: '12px', paddingLeft: '20px' }}>
      <li><strong>Good Team (SWAT)</strong>: Find all the defusing wires before time runs out</li>
      <li><strong>Bad Team (Terrorists)</strong>: Prevent the Good Team from winning, ideally by triggering the bomb</li>
    </ul>
    <p style={{ marginBottom: '16px', fontStyle: 'italic' }}>
      Players don't know each other's roles. Communication, bluffing, and deduction are key!
    </p>

    <h3 style={{ marginTop: '20px', marginBottom: '8px' }}>👥 Teams & Roles</h3>
    <p style={{ marginBottom: '8px' }}>
      Players are secretly divided into two teams — <em>you won't know who's on which team!</em>
    </p>
    <table style={{ width: '100%', marginBottom: '12px', borderCollapse: 'collapse', fontSize: '13px' }}>
      <thead>
        <tr style={{ background: '#f5f5f5' }}>
          <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Players</th>
          <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Distribution</th>
        </tr>
      </thead>
      <tbody>
        <tr><td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center' }}>4</td><td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center' }}>2🟢2🔴 or 3🟢1🔴</td></tr>
        <tr><td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center' }}>5</td><td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center' }}>3🟢2🔴</td></tr>
        <tr><td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center' }}>6</td><td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center' }}>4🟢2🔴</td></tr>
        <tr><td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center' }}>7</td><td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center' }}>4🟢3🔴 or 5🟢2🔴</td></tr>
        <tr><td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center' }}>8</td><td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center' }}>5🟢3🔴</td></tr>
      </tbody>
    </table>

    <h3 style={{ marginTop: '20px', marginBottom: '8px' }}>🃏 The Cards</h3>
    <p style={{ marginBottom: '8px' }}>For <strong>X players</strong>, the deck contains <strong>5X cards</strong>:</p>
    <ul style={{ marginBottom: '12px', paddingLeft: '20px' }}>
      <li>🟢 <strong>X Defusing Wires</strong></li>
      <li>💣 <strong>1 Bomb</strong></li>
      <li>⚪ <strong>4X - 1 Safe Wires</strong></li>
    </ul>
    <p style={{ marginBottom: '16px' }}>
      Each player starts with <strong>5 cards</strong> (Round 1), then <strong>4 → 3 → 2</strong> in later rounds.
    </p>

    <h3 style={{ marginTop: '20px', marginBottom: '8px' }}>🔄 Game Flow</h3>
    
    <p style={{ fontWeight: '600', marginTop: '12px', marginBottom: '4px' }}>Setup Phase</p>
    <ul style={{ marginBottom: '12px', paddingLeft: '20px' }}>
      <li>View your secret role and cards</li>
      <li>Claim how many defusing wires you have — everyone sees your claim <em>(you can lie!)</em></li>
      <li>Click "Ready" when done</li>
    </ul>

    <p style={{ fontWeight: '600', marginTop: '12px', marginBottom: '4px' }}>Playing Phase</p>
    <ul style={{ marginBottom: '12px', paddingLeft: '20px' }}>
      <li>Players take turns in random order (1 turn each per round)</li>
      <li>On your turn: cut one wire from another player <em>(not yourself!)</em></li>
      <li>The wire is revealed to everyone</li>
    </ul>

    <p style={{ fontWeight: '600', marginTop: '12px', marginBottom: '4px' }}>Between Rounds</p>
    <ul style={{ marginBottom: '16px', paddingLeft: '20px' }}>
      <li>Unrevealed cards are reshuffled and redealt (1 fewer card per player)</li>
      <li>Found defusing wires stay revealed permanently</li>
      <li>The bomb stays hidden if not yet cut</li>
    </ul>

    <h3 style={{ marginTop: '20px', marginBottom: '8px' }}>🏆 Win Conditions</h3>
    <table style={{ width: '100%', marginBottom: '16px', borderCollapse: 'collapse', fontSize: '13px' }}>
      <thead>
        <tr style={{ background: '#f5f5f5' }}>
          <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Team</th>
          <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>How to Win</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={{ padding: '6px', border: '1px solid #ddd' }}>🟢 Good Team</td>
          <td style={{ padding: '6px', border: '1px solid #ddd' }}>Reveal ALL defusing wires before Round 4 ends</td>
        </tr>
        <tr>
          <td style={{ padding: '6px', border: '1px solid #ddd' }}>🔴 Bad Team</td>
          <td style={{ padding: '6px', border: '1px solid #ddd' }}>Bomb is revealed OR Round 4 ends without all defusing wires</td>
        </tr>
      </tbody>
    </table>

    <h3 style={{ marginTop: '20px', marginBottom: '8px' }}>💡 Tips</h3>
    <ul style={{ paddingLeft: '20px' }}>
      <li>🔍 Watch claims closely — who's lying?</li>
      <li>🤔 Good Team players may also lie if they have the 💣 in their hand that round</li>
      <li>🤔 Bad Team players may cut defusing wires to blend in, cut safe wires to stall, or reveal their identity at the "right" moment</li>
      <li>🗣️ Communicate, but trust wisely!</li>
    </ul>
  </div>
);

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
  onLeaveRoom,
}) {
  const [ready, setReady] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
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
      <div className="card">
        <h1>Time Bomb Game</h1>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '16px', fontSize: '14px' }}>
          Welcome to the Time Bomb board game! 💣🎉🤩
        </p>
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
    <div className="card">
      {/* How to Play button - below title */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
        <button
          onClick={() => setShowHowToPlay(true)}
          style={{
            padding: '6px 10px',
            fontSize: 'clamp(10px, 1.5vw, 12px)',
            background: '#9c27b0',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          📖 How to Play
        </button>
      </div>

      {/* How to Play Modal */}
      {showHowToPlay && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setShowHowToPlay(false)}
        >
          <div
            className="how-to-play-modal"
            style={{
              background: 'white',
              borderRadius: '12px',
              overflow: 'auto',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <HowToPlayContent />
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button
                onClick={() => setShowHowToPlay(false)}
                style={{
                  padding: '10px 24px',
                  fontSize: '14px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

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
        <button
          onClick={onLeaveRoom}
          style={{ background: '#f44336' }}
        >
          Exit Room
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
