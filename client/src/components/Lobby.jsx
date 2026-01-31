import React, { useState, useEffect } from 'react';
import { useTranslation } from '../i18n/LanguageContext';

// How to Play content component
const HowToPlayContent = ({ t }) => (
  <div style={{ textAlign: 'left', fontSize: '14px', lineHeight: '1.6' }}>
    <h2 style={{ marginBottom: '16px', textAlign: 'center' }}>{t('howToPlay.title')}</h2>
    
    <h3 style={{ marginTop: '20px', marginBottom: '8px' }}>{t('howToPlay.overview')}</h3>
    <p style={{ marginBottom: '12px' }}>
      {t('howToPlay.overviewDesc')}
    </p>
    <ul style={{ marginBottom: '12px', paddingLeft: '20px' }}>
      <li><strong>{t('howToPlay.goodTeamLabel')}</strong>: {t('howToPlay.goodTeamDesc')}</li>
      <li><strong>{t('howToPlay.badTeamLabel')}</strong>: {t('howToPlay.badTeamDesc')}</li>
    </ul>
    <p style={{ marginBottom: '16px', fontStyle: 'italic' }}>
      {t('howToPlay.socialDeductionNote')}
    </p>

    <h3 style={{ marginTop: '20px', marginBottom: '8px' }}>{t('howToPlay.teamsRoles')}</h3>
    <p style={{ marginBottom: '8px' }}>
      {t('howToPlay.teamsRolesDesc')}
    </p>
    <table style={{ width: '100%', marginBottom: '12px', borderCollapse: 'collapse', fontSize: '13px' }}>
      <thead>
        <tr style={{ background: '#f5f5f5' }}>
          <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{t('howToPlay.playersHeader')}</th>
          <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{t('howToPlay.distributionHeader')}</th>
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

    <h3 style={{ marginTop: '20px', marginBottom: '8px' }}>{t('howToPlay.theCards')}</h3>
    <p style={{ marginBottom: '8px' }}>{t('howToPlay.cardsDesc')}</p>
    <ul style={{ marginBottom: '12px', paddingLeft: '20px' }}>
      <li>🟢 <strong>{t('howToPlay.defusingWires')}</strong></li>
      <li>💣 <strong>{t('howToPlay.oneBomb')}</strong></li>
      <li>⚪ <strong>{t('howToPlay.safeWires')}</strong></li>
    </ul>
    <p style={{ marginBottom: '16px' }}>
      {t('howToPlay.cardsPerRound')}
    </p>

    <h3 style={{ marginTop: '20px', marginBottom: '8px' }}>{t('howToPlay.gameFlow')}</h3>
    
    <p style={{ fontWeight: '600', marginTop: '12px', marginBottom: '4px' }}>{t('howToPlay.setupPhase')}</p>
    <ul style={{ marginBottom: '12px', paddingLeft: '20px' }}>
      <li>{t('howToPlay.setupStep1')}</li>
      <li>{t('howToPlay.setupStep2')}</li>
      <li>{t('howToPlay.setupStep3')}</li>
    </ul>

    <p style={{ fontWeight: '600', marginTop: '12px', marginBottom: '4px' }}>{t('howToPlay.playingPhase')}</p>
    <ul style={{ marginBottom: '12px', paddingLeft: '20px' }}>
      <li>{t('howToPlay.playingStep1')}</li>
      <li>{t('howToPlay.playingStep2')}</li>
      <li>{t('howToPlay.playingStep3')}</li>
    </ul>

    <p style={{ fontWeight: '600', marginTop: '12px', marginBottom: '4px' }}>{t('howToPlay.betweenRounds')}</p>
    <ul style={{ marginBottom: '16px', paddingLeft: '20px' }}>
      <li>{t('howToPlay.betweenStep1')}</li>
      <li>{t('howToPlay.betweenStep2')}</li>
      <li>{t('howToPlay.betweenStep3')}</li>
    </ul>

    <h3 style={{ marginTop: '20px', marginBottom: '8px' }}>{t('howToPlay.winConditions')}</h3>
    <table style={{ width: '100%', marginBottom: '16px', borderCollapse: 'collapse', fontSize: '13px' }}>
      <thead>
        <tr style={{ background: '#f5f5f5' }}>
          <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>{t('howToPlay.teamHeader')}</th>
          <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>{t('howToPlay.howToWinHeader')}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={{ padding: '6px', border: '1px solid #ddd' }}>{t('howToPlay.goodTeamName')}</td>
          <td style={{ padding: '6px', border: '1px solid #ddd' }}>{t('howToPlay.goodTeamWin')}</td>
        </tr>
        <tr>
          <td style={{ padding: '6px', border: '1px solid #ddd' }}>{t('howToPlay.badTeamName')}</td>
          <td style={{ padding: '6px', border: '1px solid #ddd' }}>{t('howToPlay.badTeamWin')}</td>
        </tr>
      </tbody>
    </table>

    <h3 style={{ marginTop: '20px', marginBottom: '8px' }}>{t('howToPlay.tips')}</h3>
    <ul style={{ paddingLeft: '20px' }}>
      <li>{t('howToPlay.tip1')}</li>
      <li>{t('howToPlay.tip2')}</li>
      <li>{t('howToPlay.tip3')}</li>
      <li>{t('howToPlay.tip4')}</li>
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
  const { t } = useTranslation();
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
        <h1>{t('lobby.title')}</h1>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '16px', fontSize: '14px' }}>
          {t('lobby.welcome')}
        </p>
        {!connected && (
          <p style={{ color: '#ff9800', marginBottom: '16px' }}>
            {t('common.connecting')} {socket ? t('lobby.attemptingConnection') : t('lobby.initializing')}
          </p>
        )}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            {t('lobby.yourName')}
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder={t('lobby.enterName')}
            maxLength={20}
          />
        </div>
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            {t('lobby.roomCode')}
          </label>
          <input
            type="text"
            value={roomCode}
            onChange={(e) => {
              // Only allow letters, convert to uppercase, limit to 6 characters
              const value = e.target.value.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 6);
              setRoomCode(value);
            }}
            placeholder={t('lobby.enterRoomCode')}
            maxLength={6}
            style={{ textTransform: 'uppercase', letterSpacing: '2px', fontFamily: 'monospace' }}
          />
          {roomCode.length > 0 && roomCode.length < 6 && (
            <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              {t('lobby.lettersNeeded', { count: 6 - roomCode.length })}
            </p>
          )}
        </div>
        <div className="button-group">
          <button
            onClick={onCreateRoom}
            style={{ background: '#2196F3' }}
            disabled={!socket || !playerName.trim()}
          >
            {t('lobby.createRoom')}
          </button>
          <button
            onClick={onJoinRoom}
            style={{ background: '#4CAF50' }}
            disabled={!socket || !playerName.trim() || !roomCode.trim() || roomCode.length !== 6}
          >
            {t('lobby.joinRoom')}
          </button>
        </div>
        {!connected && (
          <div style={{ marginTop: '16px', padding: '12px', background: '#fff3cd', borderRadius: '8px' }}>
            <p style={{ fontSize: '14px', color: '#856404', margin: 0 }}>
              <strong>{t('common.connectionIssue')}:</strong> {t('lobby.connectingNote')}
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
      {/* Title row with How to Play button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ margin: 0 }}>{t('lobby.waitingRoom')}</h1>
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
            flexShrink: 0,
          }}
        >
          {t('lobby.howToPlay')}
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
            <HowToPlayContent t={t} />
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
                {t('common.gotIt')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="game-info">
        <p><strong>{t('lobby.roomCode').replace(' (leave empty to create new room):', '')}:</strong> {gameState?.matchID || roomCode}</p>
        <p><strong>{t('common.players')}:</strong> {players.length} / 8</p>
        {players.length < 4 && (
          <p style={{ color: '#f44336', marginTop: '8px' }}>
            {t('lobby.needPlayers')}
          </p>
        )}
      </div>

      <h2>{t('lobby.playersInRoom')}</h2>
      <ul className="player-list">
        {players.map((player) => {
          const isCurrentPlayer = player.id === playerID;
          const playerReady = gameState?.playerReady?.[player.id] || false;
          const isHostPlayer = player.isHost || false;
          return (
            <li
              key={player.id}
              className={`player-item ${isCurrentPlayer ? 'current-player' : ''} ${playerReady ? 'ready' : ''}`}
            >
              <span>
                {player.name || `Player ${player.id}`}
                {isHostPlayer && <span style={{ marginLeft: '8px', color: '#FF9800', fontWeight: 'bold', fontSize: '12px' }}>{t('common.host')}</span>}
              </span>
              <span className="ready-status">
                {playerReady ? t('lobby.readyStatus') : t('common.notReady')}
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
          {ready ? t('lobby.readyStatus') : t('lobby.getReady')}
        </button>
        <button
          className="share-link"
          onClick={() => {
            const url = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
            navigator.clipboard.writeText(url);
            alert(t('lobby.linkCopied'));
          }}
        >
          {t('lobby.roomLink')}
        </button>
        <button
          onClick={onLeaveRoom}
          style={{ background: '#f44336' }}
        >
          {t('lobby.exit')}
        </button>
        {isHost && (
          <button
            className="start-game"
            disabled={!canStart || !socket}
            onClick={handleStartGame}
          >
            {t('lobby.startGame')}
          </button>
        )}
      </div>
    </div>
  );
}

export default Lobby;
