import React, { useState, useEffect, useRef } from 'react';

// Clear session storage when starting a new game
const clearGameSession = () => {
  sessionStorage.removeItem('timebomb_roomCode');
  sessionStorage.removeItem('timebomb_playerName');
  sessionStorage.removeItem('timebomb_playerID');
};

function GameBoard({ socket, gameState, players, playerID, playerName, onReturnToLobby }) {
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedWireIndex, setSelectedWireIndex] = useState(null);
  const [claimValue, setClaimValue] = useState('');
  const [viewedCards, setViewedCards] = useState(false);
  const [showAllCards, setShowAllCards] = useState(false);
  const [reshuffleAnimating, setReshuffleAnimating] = useState(false);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [showConfirmCut, setShowConfirmCut] = useState(false);
  const [pendingCut, setPendingCut] = useState(null); // { targetPlayerId, wireIndex }
  
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

  // NOW we can do early returns - all hooks are above this point
  if (!gameState) {
    console.log('GameBoard - No gameState, showing loading');
    return <div className="card">Loading game...</div>;
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
      <div className="card">
        <h1>Game Setup</h1>
        <div className="game-info">
          <p>
            Your role: <strong style={{ 
              color: G.playerRoles?.[playerID?.toString()] === 'good' ? '#4CAF50' : '#f44336',
              fontSize: '18px'
            }}>
              {(() => {
                const role = G.playerRoles?.[playerID?.toString()];
                if (role === 'good') return 'Good Team ✓';
                if (role === 'bad') return 'Bad Team ✗';
                return 'Loading...';
              })()}
            </strong>
          </p>
          {!G.playerRoles?.[playerID?.toString()] && (
            <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
              Waiting for role assignment...
            </p>
          )}
        </div>

        {reshuffleAnimating ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div className="reshuffle-animation">
              <h2>🔄 Reshuffling Cards...</h2>
              <p>Cards are being reshuffled for the next round</p>
            </div>
          </div>
        ) : (!viewedCards || showAllCards) ? (
          <>
            <h2>Your Cards:</h2>
            <p style={{ marginBottom: '12px', color: '#666', fontSize: '14px' }}>
              Remember your cards before clicking "I've Viewed My Cards"!
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
                        <div style={{ fontSize: '24px', marginBottom: '4px' }}>✓</div>
                        <div style={{ fontSize: '12px', fontWeight: 'bold' }}>DEFUSING</div>
                      </>
                    )}
                    {wire.type === 'safe' && (
                      <>
                        <div style={{ fontSize: '24px', marginBottom: '4px' }}>○</div>
                        <div style={{ fontSize: '12px', fontWeight: 'bold' }}>SAFE</div>
                      </>
                    )}
                    {wire.type === 'bomb' && (
                      <>
                        <div style={{ fontSize: '32px', marginBottom: '4px' }}>💣</div>
                        <div style={{ fontSize: '12px', fontWeight: 'bold' }}>BOMB!</div>
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
              I've Viewed My Cards
            </button>
          </>
        ) : G.playerClaims?.[playerID] === undefined ? (
          <>
            <p style={{ marginBottom: '16px' }}>Your cards have been shuffled and placed face-down.</p>
            <div className="claim-input">
              <h2>Submit Your Claim</h2>
              <p style={{ marginBottom: '12px', color: '#666' }}>
                Claim how many defusing wires you have (you don't have to tell the truth):
              </p>
              <input
                type="number"
                min="0"
                max={maxDefusingWires}
                value={claimValue}
                onChange={(e) => setClaimValue(e.target.value)}
                placeholder={`Enter number (0 to ${maxDefusingWires})`}
                disabled={G.playerClaims?.[playerID] !== undefined}
              />
              <button
                onClick={() => {
                  const claim = parseInt(claimValue);
                  if (!isNaN(claim) && claim >= 0 && claim <= maxDefusingWires && socket) {
                    socket.emit('submit-claim', { claim });
                    setClaimValue('');
                  } else {
                    alert(`Please enter a number between 0 and ${maxDefusingWires}`);
                  }
                }}
                disabled={G.playerClaims?.[playerID] !== undefined || !claimValue}
                style={{ marginTop: '12px' }}
              >
                {G.playerClaims?.[playerID] !== undefined ? 'Claim Submitted ✓' : 'Submit Claim'}
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
                View Cards Again
              </button>
            </div>
          </>
        ) : (
          <>
            <p style={{ marginBottom: '16px' }}>Your claim has been submitted. Waiting for other players...</p>
            <div className="game-info">
              <h3 style={{ marginBottom: '12px' }}>Players Ready to Start:</h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(4, 1fr)', 
                gap: '12px',
                maxWidth: '600px',
                margin: '0 auto'
              }}>
                {players.map((player) => {
                  const isReady = G.setupReady?.[player.id] || false;
                  const hasClaimed = G.playerClaims?.[player.id] !== undefined;
                  const isCurrentPlayer = player.id === playerID;
                  return (
                    <div 
                      key={player.id} 
                      style={{
                        width: '120px',
                        height: '160px',
                        border: `3px solid ${isReady ? '#4CAF50' : hasClaimed ? '#FF9800' : '#e0e0e0'}`,
                        borderRadius: '8px',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isReady ? '#e8f5e9' : hasClaimed ? '#fff3e0' : '#f5f5f5',
                        position: 'relative',
                        boxShadow: isCurrentPlayer ? '0 0 8px rgba(33, 150, 243, 0.5)' : 'none',
                      }}
                    >
                      <div style={{ 
                        fontSize: '32px', 
                        marginBottom: '8px',
                        color: isReady ? '#4CAF50' : hasClaimed ? '#FF9800' : '#999'
                      }}>
                        {isReady ? '✓' : hasClaimed ? '⏳' : '○'}
                      </div>
                      <div style={{ 
                        fontSize: '14px', 
                        fontWeight: 'bold',
                        textAlign: 'center',
                        marginBottom: '4px',
                        color: '#333'
                      }}>
                        {player.name}
                      </div>
                      {isCurrentPlayer && (
                        <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>(You)</div>
                      )}
                      <div style={{ 
                        fontSize: '11px', 
                        color: isReady ? '#4CAF50' : hasClaimed ? '#FF9800' : '#999',
                        fontWeight: isReady ? 'bold' : 'normal',
                        marginTop: '8px'
                      }}>
                        {isReady ? 'Ready' : hasClaimed ? 'Claimed' : 'Waiting'}
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
                View Cards Again
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
                {setupReady ? '✓ Ready to Start' : 'Ready for Round'}
              </button>
            </div>
            {allPlayersReady && (
              <div style={{ marginTop: '16px' }}>
                <p style={{ color: '#4CAF50', fontWeight: 'bold', marginBottom: '12px' }}>
                  All players are ready!
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
                    Start Round
                  </button>
                )}
                {players.length > 0 && players[0].id !== playerID && (
                  <p style={{ color: '#666', fontSize: '14px' }}>
                    Waiting for host to start the game...
                  </p>
                )}
              </div>
            )}
          </>
        )}
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
          <h1>Loading Game...</h1>
          <p>Waiting for players...</p>
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
              <div className="winner-banner">You Win! 🎉</div>
            ) : (
              <div className="loser-banner">You Lose 😢</div>
            )}
            <div className="game-info">
              <p>
                <strong>Winner:</strong> {G.winner === 'good' ? 'Good Team' : 'Bad Team'}
              </p>
              <p>
                <strong>Reason:</strong> {G.winReason}
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
                New Game
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
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: '12px', fontSize: '14px' }}>
        {/* Compact header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h1 style={{ margin: 0, fontSize: '20px' }}>Round {G.currentRound || 1}</h1>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {isMyTurn && G.allClaimsReady && (
              <div style={{ 
                fontSize: '14px', 
                fontWeight: 'bold', 
                color: '#f44336',
                background: '#ffebee',
                padding: '4px 8px',
                borderRadius: '4px'
              }}>
                YOUR TURN
              </div>
            )}
          </div>
        </div>

        {/* Turn order - compact */}
        {G.turnOrder && G.turnOrder.length > 0 && (
          <div style={{ marginBottom: '12px', fontSize: '12px' }}>
            <strong>Turn:</strong>{' '}
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
            {G.turnOrder.map((pid, idx) => {
              const player = players.find((p) => p.id === pid);
              const isCurrent = idx === (G.turnIndex || 0);
              const isLast = idx === G.turnOrder.length - 1;
              
              return (
                <React.Fragment key={pid}>
                  <span
                    style={{
                      padding: '4px 8px',
                      background: isCurrent ? '#4CAF50' : 'transparent',
                      color: isCurrent ? 'white' : '#333',
                      borderRadius: '3px',
                      fontWeight: isCurrent ? 'bold' : 'normal',
                      border: isCurrent ? '2px solid #4CAF50' : '1px solid #e0e0e0',
                      fontSize: '11px',
                    }}
                  >
                    {player?.name || `P${pid}`}
                  </span>
                  {!isLast && <span style={{ color: '#666', fontSize: '10px' }}>→</span>}
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
                      fontSize: '11px',
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
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: '12px',
          marginTop: '12px'
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
                style={{
                  background: containerColor.bg,
                  border: `2px solid ${containerColor.border}`,
                  borderRadius: '8px',
                  padding: '12px',
                  minHeight: '150px',
                }}
              >
                {/* Player name and claim */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#333' }}>
                    {player.name} {player.id === playerID && '(You)'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>
                    Claim: {playerClaim}
                  </div>
                </div>

                {/* Player's cards */}
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
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
                          width: '46px',
                          height: '58px',
                          fontSize: '10px',
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
                                <div style={{ fontSize: '16px', marginBottom: '2px' }}>✓</div>
                                <div style={{ fontSize: '8px', fontWeight: 'bold' }}>DEF</div>
                              </>
                            )}
                            {revealedWire.wireType === 'safe' && (
                              <>
                                <div style={{ fontSize: '16px', marginBottom: '2px' }}>○</div>
                                <div style={{ fontSize: '8px', fontWeight: 'bold' }}>SAFE</div>
                              </>
                            )}
                            {revealedWire.wireType === 'bomb' && (
                              <>
                                <div style={{ fontSize: '20px', marginBottom: '2px' }}>💣</div>
                                <div style={{ fontSize: '8px', fontWeight: 'bold' }}>BOMB</div>
                              </>
                            )}
                          </>
                        ) : (
                          <div style={{ fontSize: '14px' }}>?</div>
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
              <h2>Confirm Cut</h2>
              <p>
                Are you sure you want to cut this card from{' '}
                <strong>{players.find((p) => p.id === pendingCut.targetPlayerId)?.name}</strong>?
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
                  Yes
                </button>
                <button
                  onClick={() => {
                    setShowConfirmCut(false);
                    setPendingCut(null);
                  }}
                  style={{ background: '#666', color: 'white' }}
                >
                  No
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Round ended - show "Next Round" button - compact */}
        {G.roundEnded && (
          <div style={{ marginTop: '12px', padding: '12px', background: '#f5f5f5', borderRadius: '8px', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <strong>Round {G.currentRound} Ended</strong>
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
              {G.roundReady?.[playerID] ? '✓ Ready for Next Round' : 'Next Round'}
            </button>
            {players.length > 0 && players.every((p) => G.roundReady?.[p.id] === true) && (
              <p style={{ marginTop: '8px', color: '#4CAF50', fontWeight: 'bold', fontSize: '11px', textAlign: 'center' }}>
                All ready! Reshuffling...
              </p>
            )}
          </div>
        )}
      </div>
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
