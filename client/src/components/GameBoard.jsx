import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../i18n/LanguageContext';

// Clear session storage when starting a new game
const clearGameSession = () => {
  sessionStorage.removeItem('timebomb_roomCode');
  sessionStorage.removeItem('timebomb_playerName');
  sessionStorage.removeItem('timebomb_playerID');
};

function GameBoard({ socket, gameState, players, playerID, playerName, onReturnToLobby }) {
  const { t } = useTranslation();
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedWireIndex, setSelectedWireIndex] = useState(null);
  const [claimValue, setClaimValue] = useState('');
  const [viewedCards, setViewedCards] = useState(false);
  const [showAllCards, setShowAllCards] = useState(false);
  const [reshuffleAnimating, setReshuffleAnimating] = useState(false);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [showConfirmCut, setShowConfirmCut] = useState(false);
  const [pendingCut, setPendingCut] = useState(null); // { targetPlayerId, wireIndex }
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  
  // Auto-show cards when entering setup phase - preserve state when switching browsers
  useEffect(() => {
    if (gameState?.gamePhase === 'setup') {
      // Reset viewedCards when entering setup phase (for new game or new round)
      // This ensures players can view cards and submit claims
      if (gameState?.currentRound === 1 || gameState?.currentRound === 0) {
        // For initial setup (round 1 or new game), reset viewing state
        setViewedCards(false);
        setShowAllCards(true);
      } else if (gameState?.currentRound > 1) {
        // For new rounds (round > 1), reset state for reshuffle animation
        if (reshuffleAnimating === false) {
          setViewedCards(false);
        }
        return;
      }
    } else if (gameState?.gamePhase === 'lobby') {
      // Reset viewing state when returning to lobby (new game)
      setViewedCards(false);
      setShowAllCards(false);
      setReshuffleAnimating(false);
    }
  }, [gameState?.gamePhase, gameState?.currentRound, reshuffleAnimating]); // Only depend on gamePhase to avoid resetting on every state update

  // Check for round transition (reshuffle animation)
  // Use a ref to track the previous round to detect round changes
  const prevRoundRef = useRef(gameState?.currentRound || 0);
  
  useEffect(() => {
    const currentRound = gameState?.currentRound || 0;
    const isNewRound = currentRound > 1 && currentRound !== prevRoundRef.current;
    
    // Only trigger animation when transitioning to setup phase with round > 1 and it's a new round
    if (gameState?.gamePhase === 'setup' && currentRound > 1 && isNewRound) {
      // Update the ref to track this round
      prevRoundRef.current = currentRound;
      
      // Start animation and reset card viewing state
      setReshuffleAnimating(true);
      setViewedCards(false);
      setShowAllCards(false);
      
      // After 2 seconds, show the new cards
      const timer = setTimeout(() => {
        setReshuffleAnimating(false);
        setShowAllCards(true);
        setViewedCards(false); // Reset so players can view their new cards
      }, 2000); // 2 seconds max
      
      return () => {
        clearTimeout(timer);
      };
    } else if (gameState?.gamePhase === 'setup' && currentRound === 1) {
      // For round 1, no animation needed, just show cards
      setReshuffleAnimating(false);
      prevRoundRef.current = currentRound;
    } else if (gameState?.gamePhase !== 'setup') {
      // If not in setup phase, make sure animation is off
      setReshuffleAnimating(false);
    }
  }, [gameState?.gamePhase, gameState?.currentRound]);

  // Debug logging useEffect - MUST be before any conditional returns
  useEffect(() => {
    if (gameState?.gamePhase) {
      const calculatedIsMyTurn = gameState.currentTurn !== null && gameState.currentTurn !== undefined && String(gameState.currentTurn) === String(playerID);
      console.log('GameBoard - Phase:', gameState.gamePhase, 'Round:', gameState.currentRound, 'Turn:', gameState.currentTurn, 'TurnOrder:', gameState.turnOrder);
      console.log('GameBoard - allClaimsReady:', gameState.allClaimsReady, 'playerID:', playerID, 'isMyTurn:', calculatedIsMyTurn);
      console.log('GameBoard - playerClaims:', gameState.playerClaims);
    }
  }, [gameState?.gamePhase, gameState?.currentRound, gameState?.currentTurn, gameState?.turnOrder, gameState?.allClaimsReady, playerID, gameState?.playerClaims]);

  // Show game over modal when game finishes - MUST be before any conditional returns
  useEffect(() => {
    if (gameState?.gamePhase === 'finished' && !showGameOverModal) {
      setShowGameOverModal(true);
    }
  }, [gameState?.gamePhase, showGameOverModal]);

  // Handle exit to lobby
  const handleExitToLobby = () => {
    if (socket) {
      socket.emit('exit-to-lobby');
    }
    setShowExitConfirm(false);
  };

  // Exit Confirmation Popup Component
  const ExitConfirmPopup = () => (
    showExitConfirm && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}>
        <div style={{
          background: 'white',
          padding: 'clamp(20px, 4vw, 32px)',
          borderRadius: '12px',
          maxWidth: 'min(90vw, 400px)',
          textAlign: 'center',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        }}>
          <div style={{ fontSize: 'clamp(32px, 6vw, 48px)', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ color: '#333', marginBottom: '16px', fontSize: 'clamp(16px, 3vw, 20px)' }}>
            {t('game.exitConfirmTitle')}
          </h2>
          <p style={{ color: '#666', fontSize: 'clamp(12px, 2vw, 14px)', marginBottom: '24px' }}>
            {t('game.exitConfirmMessage')}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => setShowExitConfirm(false)}
              style={{
                padding: '10px 24px',
                background: 'white',
                color: '#333',
                border: '2px solid #e0e0e0',
                borderRadius: '6px',
                fontSize: 'clamp(12px, 2vw, 14px)',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              {t('common.no')}
            </button>
            <button
              onClick={handleExitToLobby}
              style={{
                padding: '10px 24px',
                background: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: 'clamp(12px, 2vw, 14px)',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              {t('common.yes')}
            </button>
          </div>
        </div>
      </div>
    )
  );

  // Exit to Lobby Button Component
  const ExitToLobbyButton = () => (
    <div style={{ marginTop: 'clamp(16px, 3vw, 24px)', textAlign: 'center' }}>
      <button
        onClick={() => setShowExitConfirm(true)}
        style={{
          padding: 'clamp(8px, 1.5vw, 12px) clamp(16px, 3vw, 24px)',
          background: '#9e9e9e',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: 'clamp(11px, 1.8vw, 14px)',
          cursor: 'pointer',
        }}
      >
        {t('game.exitToLobby')}
      </button>
    </div>
  );

  // NOW we can do early returns - all hooks are above this point
  if (!gameState) {
    console.log('GameBoard - No gameState, showing loading');
    return <div className="card">{t('common.loading')}</div>;
  }

  const G = gameState;
  console.log('GameBoard - Received gameState:', {
    gamePhase: G.gamePhase,
    currentRound: G.currentRound,
    currentTurn: G.currentTurn,
    turnOrder: G.turnOrder,
    playersCount: players?.length,
    playerID: playerID
  });
  
  const currentPlayerName = G.currentTurn ? (players.find((p) => p.id === G.currentTurn)?.name || `Player ${G.currentTurn}`) : 'Waiting...';
  // Ensure both are strings for comparison
  const isMyTurn = G.currentTurn !== null && G.currentTurn !== undefined && String(G.currentTurn) === String(playerID);
  const myWires = G.playerWires?.[playerID] || [];
  // Claim limit should be 0 to X - P, where X = player count and P = defusing wires already revealed in previous rounds
  const totalPlayers = players.length;
  const defusingsFoundSoFar = G.defusingWires ? G.defusingWires.length : 0;
  const maxDefusingWires = Math.max(0, totalPlayers - defusingsFoundSoFar);

  // Setup phase: View cards
  if (G.gamePhase === 'setup') {
    console.log('GameBoard - Rendering setup phase');
    const playerWires = G.playerWires?.[playerID] || [];
    const wireDeck = G.wireDeck || [];
    const setupReady = G.setupReady?.[playerID] || false;
    const allPlayersReady = players.length > 0 && players.every((p) => G.setupReady?.[p.id] === true);

    return (
      <div className="card game-board-card" style={{ marginTop: 'clamp(30px, 5vw, 50px)' }}>
        <h1>{t('game.gameSetup')}</h1>
        <div className="game-info">
          <p>
            {t('game.yourRole')} <strong style={{ 
              color: G.playerRoles?.[playerID?.toString()] === 'good' ? '#4CAF50' : '#f44336',
            }}>
              {(() => {
                const role = G.playerRoles?.[playerID?.toString()];
                if (role === 'good') return t('game.goodTeam');
                if (role === 'bad') return t('game.badTeam');
                return t('common.loading');
              })()}
            </strong>
          </p>
          {!G.playerRoles?.[playerID?.toString()] && (
            <p style={{ fontSize: 'clamp(10px, 1.5vw, 12px)', color: '#999', marginTop: '4px' }}>
              {t('game.waitingForRole')}
            </p>
          )}
        </div>

        {reshuffleAnimating ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div className="reshuffle-animation">
              <h2>{t('game.reshuffling')}</h2>
              <p>{t('game.reshufflingDesc')}</p>
            </div>
          </div>
        ) : (!viewedCards || showAllCards) ? (
          <>
            <h2>{t('game.yourCards')}</h2>
            <p style={{ marginBottom: '12px', color: '#666', fontSize: '14px' }}>
              {t('game.rememberCards')}
            </p>
            <div className="wire-row">
              {playerWires.map((wireIndex, idx) => {
                const wire = wireDeck[wireIndex];
                if (!wire) {
                  return (
                    <div key={idx} className="wire-card">
                      <div style={{ fontSize: '20px', opacity: 0.5 }}>?</div>
                    </div>
                  );
                }
                return (
                  <div
                    key={idx}
                    className={`wire-card ${wire.type} revealed`}
                  >
                    {wire.type === 'defusing' && (
                      <>
                        <div style={{ fontSize: 'clamp(16px, 4vw, 24px)', marginBottom: '4px' }}>✓</div>
                        <div style={{ fontWeight: 'bold' }}>{t('game.defusing')}</div>
                      </>
                    )}
                    {wire.type === 'safe' && (
                      <>
                        <div style={{ fontSize: 'clamp(16px, 4vw, 24px)', marginBottom: '4px' }}>○</div>
                        <div style={{ fontWeight: 'bold' }}>{t('game.safe')}</div>
                      </>
                    )}
                    {wire.type === 'bomb' && (
                      <>
                        <div style={{ fontSize: 'clamp(20px, 5vw, 32px)', marginBottom: '4px' }}>💣</div>
                        <div style={{ fontWeight: 'bold' }}>{t('game.bombExclaim')}</div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => {
                setViewedCards(true);
                setShowAllCards(false);
                if (socket) {
                  socket.emit('confirm-view-and-shuffle');
                }
              }}
              style={{ marginTop: '16px' }}
            >
              {t('game.viewedCards')}
            </button>
          </>
        ) : G.playerClaims?.[playerID] === undefined ? (
          <>
            <p style={{ marginBottom: '16px' }}>{t('game.claimDefusing')}</p>
            <div className="claim-input">
              <h2>{t('game.submitClaim')}</h2>
              <p style={{ marginBottom: '12px', color: '#666' }}>
                {t('game.howManyDefusing')}
              </p>
              <input
                type="number"
                min="0"
                max={maxDefusingWires}
                value={claimValue}
                onChange={(e) => setClaimValue(e.target.value)}
                placeholder={`0 - ${maxDefusingWires}`}
                disabled={G.playerClaims?.[playerID] !== undefined}
              />
              <button
                onClick={() => {
                  const claim = parseInt(claimValue);
                  if (!isNaN(claim) && claim >= 0 && claim <= maxDefusingWires && socket) {
                    socket.emit('submit-claim', { claim });
                    setClaimValue('');
                  }
                }}
                disabled={G.playerClaims?.[playerID] !== undefined || !claimValue}
                style={{ marginTop: '12px' }}
              >
                {t('game.submitClaim')}
              </button>
            </div>
            <div className="button-group" style={{ marginTop: '16px' }}>
              <button
                onClick={() => {
                  setViewedCards(false);
                  setShowAllCards(true);
                  if (socket) {
                    socket.emit('view-wires');
                  }
                }}
              >
                {t('game.viewCardsAgain')}
              </button>
            </div>
          </>
        ) : (
          <>
            <p style={{ marginBottom: 'clamp(8px, 2vw, 16px)' }}>{t('game.claimSubmitted')}</p>
            <div className="game-info">
              <h3 style={{ marginBottom: 'clamp(6px, 1.5vw, 12px)' }}>{t('game.playersReadyToStart')}</h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(clamp(70px, 15vw, 100px), 1fr))', 
                gap: 'clamp(6px, 1.5vw, 12px)',
                maxWidth: '100%',
                margin: '0 auto'
              }}>
                {players.map((player) => {
                  const isReady = G.setupReady?.[player.id] || false;
                  const hasClaimed = G.playerClaims?.[player.id] !== undefined;
                  const isCurrentPlayer = player.id === playerID;
                  return (
                    <div 
                      key={player.id}
                      className="player-status-card"
                      style={{
                        border: `2px solid ${isReady ? '#4CAF50' : hasClaimed ? '#FF9800' : '#e0e0e0'}`,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isReady ? '#e8f5e9' : hasClaimed ? '#fff3e0' : '#f5f5f5',
                        position: 'relative',
                        boxShadow: isCurrentPlayer ? '0 0 8px rgba(33, 150, 243, 0.5)' : 'none',
                      }}
                    >
                      <div className="icon" style={{ 
                        color: isReady ? '#4CAF50' : hasClaimed ? '#FF9800' : '#999'
                      }}>
                        {isReady ? '✓' : hasClaimed ? '⏳' : '○'}
                      </div>
                      <div className="name" style={{ 
                        fontWeight: 'bold',
                        textAlign: 'center',
                        color: '#333'
                      }}>
                        {player.name}
                      </div>
                      {isCurrentPlayer && (
                        <div style={{ fontSize: 'clamp(8px, 1.3vw, 10px)', color: '#666', marginTop: '4px' }}>{t('common.you')}</div>
                      )}
                      <div className="status" style={{ 
                        color: isReady ? '#4CAF50' : hasClaimed ? '#FF9800' : '#999',
                        fontWeight: isReady ? 'bold' : 'normal',
                        marginTop: 'clamp(4px, 1vw, 8px)'
                      }}>
                        {isReady ? t('common.ready') : hasClaimed ? t('common.claimed') : t('common.waiting')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="button-group">
              <button
                onClick={() => {
                  setViewedCards(false);
                  setShowAllCards(true);
                  if (socket) {
                    socket.emit('view-wires');
                  }
                }}
              >
                {t('game.viewCardsAgain')}
              </button>
              <button
                className="start-game"
                onClick={() => {
                  if (socket) {
                    socket.emit('mark-setup-ready');
                  }
                }}
                disabled={setupReady}
                style={{ background: setupReady ? '#4CAF50' : '#FF9800' }}
              >
                {setupReady ? t('game.readyToStart') : t('game.readyForRound')}
              </button>
            </div>
            {allPlayersReady && (
              <div style={{ marginTop: '16px' }}>
                <p style={{ color: '#4CAF50', fontWeight: 'bold', marginBottom: '12px' }}>
                  {t('game.allPlayersReady')}
                </p>
                {players.length > 0 && players[0].id === playerID && (
                  <button
                    className="start-game"
                    onClick={() => {
                      if (socket) {
                        socket.emit('start-playing');
                      }
                    }}
                    style={{ 
                      background: '#FF9800',
                      fontSize: '18px',
                      padding: '12px 24px',
                      fontWeight: 'bold'
                    }}
                  >
                    {t('game.startRound')}
                  </button>
                )}
                {players.length > 0 && players[0].id !== playerID && (
                  <p style={{ color: '#666', fontSize: '14px' }}>
                    {t('game.waitingForHost')}
                  </p>
                )}
              </div>
            )}
          </>
        )}
        
        {/* Exit to Lobby Button */}
        <ExitToLobbyButton />
        
        {/* Exit Confirmation Popup */}
        <ExitConfirmPopup />
      </div>
    );
  }

  // Simple rendering logic: if not setup, render the playing board
  // This is the key - don't over-complicate with too many checks
  console.log('GameBoard render - gamePhase:', G.gamePhase, 'players:', players?.length, 'currentRound:', G.currentRound);
  
  // Handle playing and finished phases
  if (G.gamePhase === 'playing' || G.gamePhase === 'finished') {
    console.log('GameBoard - Rendering playing/finished board. Phase:', G.gamePhase);
    
    if (!players || players.length === 0) {
      console.log('GameBoard - No players, showing loading');
      return (
        <div className="card">
          <h1>{t('game.loadingGame')}</h1>
          <p>{t('game.waitingForPlayers')}</p>
        </div>
      );
    }

    const isWinner = G.gamePhase === 'finished' && G.winner === G.playerRoles?.[playerID?.toString()];
    console.log('GameBoard - Rendering board. Round:', G.currentRound, 'TurnOrder:', G.turnOrder, 'CurrentTurn:', G.currentTurn);
  
    return (
    <>
      {/* Game Over Modal */}
      {showGameOverModal && G.gamePhase === 'finished' && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={(e) => {
            // Close modal if clicking outside
            if (e.target === e.currentTarget) {
              setShowGameOverModal(false);
            }
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '500px',
              width: '90%',
              position: 'relative',
              zIndex: 1001,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h1>Game Over</h1>
            {isWinner ? (
              <div className="winner-banner">{t('gameOver.victory')}</div>
            ) : (
              <div className="loser-banner">{t('gameOver.defeat')}</div>
            )}
            <div className="game-info">
              <p>
                <strong>{t('gameOver.winner')}:</strong> {G.winner === 'good' ? t('gameOver.goodTeamWins') : t('gameOver.badTeamWins')}
              </p>
              <p>
                <strong>{t('gameOver.reason')}:</strong>{' '}
                {G.winReason?.includes('All defusing') 
                  ? t('gameOver.reasonAllDefusing')
                  : G.winReason?.includes('Bomb') 
                    ? t('gameOver.reasonBombRevealed')
                    : t('gameOver.reasonTimeOut')}
              </p>
            </div>
            <div className="button-group" style={{ marginTop: '24px' }}>
              <button
                className="start-game"
                onClick={() => {
                  setShowGameOverModal(false);
                  // Clear session storage since we're starting fresh
                  clearGameSession();
                  // Reset game for everyone in the room - server will broadcast to all players
                  if (socket) {
                    socket.emit('new-game');
                  }
                }}
                style={{ 
                  background: '#2196F3',
                  fontSize: '16px',
                  padding: '12px 24px'
                }}
              >
                {t('gameOver.newGame')}
              </button>
              <button
                onClick={() => setShowGameOverModal(false)}
                style={{ 
                  background: '#666',
                  fontSize: '16px',
                  padding: '12px 24px',
                  marginLeft: '12px'
                }}
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card game-board-card" style={{ marginTop: 'clamp(30px, 5vw, 50px)' }}>
        {/* Your Turn indicator - centered at top */}
        {isMyTurn && G.allClaimsReady && (
          <div style={{ 
            textAlign: 'center',
            marginBottom: 'clamp(8px, 1.5vw, 12px)',
          }}>
            <span style={{ 
              fontSize: 'clamp(12px, 2.5vw, 18px)', 
              fontWeight: 'bold', 
              color: '#f44336',
              background: '#ffebee',
              padding: 'clamp(4px, 1vw, 8px) clamp(12px, 2vw, 20px)',
              borderRadius: '6px',
              display: 'inline-block',
            }}>
              🎯 {t('game.yourTurn')}
            </span>
          </div>
        )}
        
        {/* Round header - left aligned */}
        <div style={{ marginBottom: 'clamp(6px, 1.5vw, 12px)' }}>
          <h1 style={{ margin: 0 }}>{t('common.round')} {G.currentRound || 1}</h1>
        </div>

        {/* Turn order - compact */}
        {G.turnOrder && G.turnOrder.length > 0 && (
          <div className="turn-order-container" style={{ marginBottom: 'clamp(6px, 1.5vw, 12px)' }}>
            <strong>{t('common.turn')}:</strong>{' '}
            <span style={{ display: 'flex', alignItems: 'center', gap: 'clamp(2px, 0.5vw, 4px)', flexWrap: 'wrap', marginTop: '4px' }}>
            {G.turnOrder.map((pid, idx) => {
              const player = players.find((p) => p.id === pid);
              const isCurrent = idx === (G.turnIndex || 0);
              const isLast = idx === G.turnOrder.length - 1;
              
              return (
                <React.Fragment key={pid}>
                  <span
                    className="turn-player-name"
                    style={{
                      background: isCurrent ? '#4CAF50' : 'transparent',
                      color: isCurrent ? 'white' : '#333',
                      borderRadius: '3px',
                      fontWeight: isCurrent ? 'bold' : 'normal',
                      border: isCurrent ? '2px solid #4CAF50' : '1px solid #e0e0e0',
                    }}
                  >
                    {player?.name || `P${pid}`}
                  </span>
                  {!isLast && <span style={{ color: '#666', fontSize: 'clamp(8px, 1.3vw, 10px)' }}>→</span>}
                </React.Fragment>
              );
            })}
            </span>
          </div>
        )}

        {/* Defusing wires info - compact at top with individual containers */}
        {G.defusingWires && G.defusingWires.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#333' }}>
              Defusing wire found so far:
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {G.defusingWires.map((wire, idx) => {
                const player = players.find((p) => p.id === wire.playerId);
                // Get round from defusingWires array (persists across rounds) or fallback to revealedWires
                const round = wire.round || G.revealedWires?.find(
                  (rw) => rw.playerId === wire.playerId && rw.wireIndex === wire.wireIndex && rw.wireType === 'defusing'
                )?.round || '?';
                return (
                  <div 
                    key={idx} 
                    style={{
                      padding: '6px 10px',
                      background: '#e8f5e9',
                      border: '1px solid #4caf50',
                      borderRadius: '4px',
                      fontSize: 'clamp(9px, 1.5vw, 11px)',
                      fontWeight: '500',
                      color: '#2e7d32'
                    }}
                  >
                    from {player?.name || `P${wire.playerId}`} in R{round}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2-column grid of player containers */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(clamp(140px, 40vw, 250px), 1fr))', 
          gap: 'clamp(6px, 1.5vw, 12px)',
          marginTop: 'clamp(6px, 1.5vw, 12px)'
        }}>
          {players.map((player) => {
            const playerWires = G.playerWires?.[player.id] || [];
            const playerClaim = G.playerClaims?.[player.id] ?? '?';
            const canCut = G.allClaimsReady && isMyTurn && player.id !== playerID;
            
            // All containers use blue color scheme
            const containerColor = { bg: '#e3f2fd', border: '#2196F3' }; // Blue

            return (
              <div
                key={player.id}
                className="player-game-container"
                style={{
                  background: containerColor.bg,
                  border: `2px solid ${containerColor.border}`,
                  minHeight: 'clamp(100px, 20vw, 150px)',
                }}
              >
                {/* Player name and claim */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'clamp(4px, 1vw, 8px)' }}>
                  <div className="player-name" style={{ fontWeight: 'bold', color: '#333' }}>
                    {player.name} {player.id === playerID && t('common.you')}
                  </div>
                  <div className="claim-badge" style={{ color: '#666', fontWeight: 'bold', background: 'rgba(255,255,255,0.5)', borderRadius: '4px' }}>
                    {t('game.claim')} {playerClaim}
                  </div>
                </div>

                {/* Player's cards */}
                <div style={{ display: 'flex', gap: 'clamp(2px, 0.5vw, 4px)', flexWrap: 'wrap' }}>
                  {playerWires.map((wireValue, idx) => {
                    // For other players: wireValue is a display position index (0, 1, 2, ...) that maps to actual position
                    // For own cards: wireValue is the actual wire deck index
                    // Map display position to actualArrayIndex using the viewer's randomization mapping
                    let actualArrayIndex = idx; // Default for own cards
                    
                    // For other players, reverse-map display position to actualArrayIndex
                    if (player.id !== playerID && G.cardPositionMappings && G.cardPositionMappings[player.id]) {
                      // The mapping is: displayPositions[idx] -> actualArrayIndex
                      // So actualArrayIndex = mapping[idx]
                      const mapping = G.cardPositionMappings[player.id];
                      if (mapping && mapping[idx] !== undefined) {
                        actualArrayIndex = mapping[idx];
                      }
                    }
                    
                    // Check if this position (by actualArrayIndex) has a revealed card - ONLY from current round
                    // Match by actualArrayIndex which is consistent across all viewers
                    const revealedWire = G.revealedWires?.find(
                      (rw) => rw.playerId === player.id && 
                             rw.actualArrayIndex === actualArrayIndex &&
                             rw.round === G.currentRound
                    ) || null;
                    const isRevealed = revealedWire !== null;
                    
                    return (
                      <div
                        key={idx}
                        className={`wire-card ${revealedWire ? `revealed ${revealedWire.wireType}` : ''}`}
                        onClick={() => {
                          if (canCut && !isRevealed) {
                            // wireIndex is the display position (0, 1, 2, ...)
                            // Server will map this to the actual card using the per-viewer randomization
                            setPendingCut({ targetPlayerId: player.id, wireIndex: idx });
                            setShowConfirmCut(true);
                          }
                        }}
                        style={{
                          width: 'clamp(32px, 8vw, 46px)',
                          height: 'clamp(40px, 10vw, 58px)',
                          fontSize: 'clamp(8px, 1.5vw, 10px)',
                          cursor: canCut && !isRevealed ? 'pointer' : 'default',
                          opacity: canCut && !isRevealed ? 1 : (isRevealed ? 1 : 0.7),
                          transform: canCut && !isRevealed ? 'scale(1)' : 'scale(0.9)',
                          transition: 'all 0.2s',
                        }}
                      >
                        {revealedWire ? (
                          <>
                            {revealedWire.wireType === 'defusing' && (
                              <>
                                <div style={{ fontSize: 'clamp(12px, 2.5vw, 16px)', marginBottom: '2px' }}>✓</div>
                                <div style={{ fontSize: 'clamp(6px, 1.2vw, 8px)', fontWeight: 'bold' }}>{t('game.def')}</div>
                              </>
                            )}
                            {revealedWire.wireType === 'safe' && (
                              <>
                                <div style={{ fontSize: 'clamp(12px, 2.5vw, 16px)', marginBottom: '2px' }}>○</div>
                                <div style={{ fontSize: 'clamp(6px, 1.2vw, 8px)', fontWeight: 'bold' }}>{t('game.safe')}</div>
                              </>
                            )}
                            {revealedWire.wireType === 'bomb' && (
                              <>
                                <div style={{ fontSize: 'clamp(14px, 3vw, 20px)', marginBottom: '2px' }}>💣</div>
                                <div style={{ fontSize: 'clamp(6px, 1.2vw, 8px)', fontWeight: 'bold' }}>{t('game.bomb')}</div>
                              </>
                            )}
                          </>
                        ) : (
                          <div style={{ fontSize: 'clamp(10px, 2vw, 14px)' }}>?</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Confirmation popup */}
        {showConfirmCut && pendingCut && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowConfirmCut(false);
                setPendingCut(null);
              }
            }}
          >
            <div
              className="card"
              style={{
                maxWidth: '400px',
                width: '90%',
                position: 'relative',
                zIndex: 1001,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2>{t('game.confirmCut')}</h2>
              <p>
                {t('game.areYouSureCut', { playerName: players.find((p) => p.id === pendingCut.targetPlayerId)?.name })}
              </p>
              <div className="button-group" style={{ marginTop: '20px' }}>
                <button
                  onClick={() => {
                    if (socket && pendingCut) {
                      socket.emit('select-wire', {
                        targetPlayerId: pendingCut.targetPlayerId,
                        wireIndex: pendingCut.wireIndex, // This is the array index, which is what the server expects
                      });
                    }
                    setShowConfirmCut(false);
                    setPendingCut(null);
                  }}
                  style={{ background: '#4CAF50', color: 'white' }}
                >
                  {t('game.confirm')}
                </button>
                <button
                  onClick={() => {
                    setShowConfirmCut(false);
                    setPendingCut(null);
                  }}
                  style={{ background: '#666', color: 'white' }}
                >
                  {t('game.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Round ended - show "Next Round" button - compact */}
        {G.roundEnded && (
          <div style={{ marginTop: '12px', padding: '12px', background: '#f5f5f5', borderRadius: '8px', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <strong>{t('common.round')} {G.currentRound} {t('game.roundEnded')}</strong>
              <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
                {players.map((player) => {
                  const isReady = G.roundReady?.[player.id] || false;
                  return (
                    <span key={player.id} style={{ color: isReady ? '#4CAF50' : '#999' }}>
                      {isReady ? '✓' : '○'} {player.name}
                    </span>
                  );
                })}
              </div>
            </div>
            <button
              onClick={() => {
                if (socket) {
                  socket.emit('mark-round-ready');
                }
              }}
              disabled={G.roundReady?.[playerID] || false}
              style={{ 
                background: G.roundReady?.[playerID] ? '#4CAF50' : '#FF9800',
                fontSize: '12px',
                padding: '8px 16px',
                width: '100%'
              }}
            >
              {G.roundReady?.[playerID] ? t('game.readyForNextRound') : t('game.nextRound')}
            </button>
            {players.length > 0 && players.every((p) => G.roundReady?.[p.id] === true) && (
              <p style={{ marginTop: '8px', color: '#4CAF50', fontWeight: 'bold', fontSize: '11px', textAlign: 'center' }}>
                {t('game.allReadyReshuffling')}
              </p>
            )}
          </div>
        )}
        
        {/* Exit to Lobby Button - only show if game is not finished */}
        {G.gamePhase !== 'finished' && <ExitToLobbyButton />}
      </div>
      
      {/* Exit Confirmation Popup */}
      <ExitConfirmPopup />
    </>
    );
  }

  // If we somehow get here (unknown phase or null), show debug info
  console.error('GameBoard - Unexpected state! gamePhase:', G.gamePhase, 'Full state:', G);
  return (
    <div className="card">
      <h1>Game Board Error</h1>
      <p>Unexpected game phase: {G.gamePhase || 'undefined'}</p>
      <p style={{ fontSize: '12px', color: '#666' }}>
        Round: {G.currentRound || 'N/A'}, Players: {players?.length || 0}
      </p>
      <p style={{ fontSize: '10px', color: '#999', marginTop: '8px' }}>
        Check console for details
      </p>
    </div>
  );
}

export default GameBoard;
