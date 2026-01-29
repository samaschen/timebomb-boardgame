/**
 * Time Bomb Game Logic
 * 
 * Game State Structure:
 * - gamePhase: 'lobby' | 'setup' | 'playing' | 'finished'
 * - playerReady: Object mapping player ID to ready status
 * - currentRound: number (1-4)
 * - currentTurn: player ID or null
 * - turnOrder: Array of player IDs for current round
 * - turnIndex: Index in turnOrder for current turn
 * - wireDeck: Array of wire cards (shuffled)
 * - playerWires: Object mapping player ID to array of wire indices
 * - revealedWires: Array of revealed wire objects { playerId, wireIndex, wireType, round }
 * - defusingWires: Array of defusing wires in the middle { playerId, wireIndex }
 * - playerClaims: Object mapping player ID to claimed number of defusing wires
 * - allClaimsReady: Boolean indicating if all players have submitted claims
 * - winner: 'good' | 'bad' | null
 * - winReason: String describing why the game ended
 */

// Wire types
export const WIRE_TYPES = {
  DEFUSING: 'defusing',
  SAFE: 'safe',
  BOMB: 'bomb',
};

// Team types
export const TEAMS = {
  GOOD: 'good',
  BAD: 'bad',
};

/**
 * Determine role distribution based on player count
 */
export function getRoleDistribution(playerCount) {
  const distributions = {
    4: [3, 1], // 3G1B or 2G2B (random)
    5: [3, 2], // 3G2B
    6: [4, 2], // 4G2B
    7: [4, 3], // 4G3B or 5G2B (random)
    8: [5, 3], // 5G3B
  };

  if (playerCount === 4) {
    // Random: 3G1B or 2G2B
    return Math.random() < 0.5 ? [3, 1] : [2, 2];
  }
  if (playerCount === 7) {
    // Random: 4G3B or 5G2B
    return Math.random() < 0.5 ? [4, 3] : [5, 2];
  }

  return distributions[playerCount] || [4, 2];
}

/**
 * Create wire deck based on player count
 */
export function createWireDeck(playerCount) {
  const deck = [];
  
  // X defusing wires (X = player count)
  for (let i = 0; i < playerCount; i++) {
    deck.push({ type: WIRE_TYPES.DEFUSING, id: `defusing-${i}` });
  }
  
  // Exactly one bomb
  deck.push({ type: WIRE_TYPES.BOMB, id: 'bomb-0' });
  
  // 4*X - 1 Safe wires
  const safeCount = 4 * playerCount - 1;
  for (let i = 0; i < safeCount; i++) {
    deck.push({ type: WIRE_TYPES.SAFE, id: `safe-${i}` });
  }
  
  // Shuffle deck
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  
  return deck;
}

/**
 * Shuffle array using Fisher-Yates algorithm for better randomization
 */
export function shuffleArray(array) {
  const shuffled = [...array];
  // Use multiple passes for better randomization
  for (let pass = 0; pass < 3; pass++) {
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
  }
  return shuffled;
}

/**
 * Check win conditions
 */
export function checkWinConditions(G) {
  if (G.winner) return; // Already won
  
  // Count defusing wires revealed
  const defusingCount = G.defusingWires.length;
  const totalDefusingWires = Object.keys(G.playerWires).length; // Equal to player count
  
  // Check if all defusing wires are revealed
  if (defusingCount >= totalDefusingWires) {
    G.winner = TEAMS.GOOD;
    G.winReason = 'All defusing wires have been revealed!';
    G.gamePhase = 'finished';
    return;
  }
  
  // Check if bomb was revealed (handled in selectWire move)
  // Check if round 4 ended
  if (G.currentRound > 4 && G.gamePhase === 'playing') {
    G.winner = TEAMS.BAD;
    G.winReason = 'Round 4 ended without all defusing wires revealed!';
    G.gamePhase = 'finished';
    return;
  }
}

export const TimeBombGame = {
  name: 'timebomb',
  
  minPlayers: 4,
  maxPlayers: 8,
  
  setup: (ctx, setupData) => {
    return {
      gamePhase: 'lobby',
      playerReady: {},
      currentRound: 0,
      currentTurn: null,
      turnOrder: [],
      turnIndex: 0,
      wireDeck: [],
      playerWires: {},
      playerRoles: {},
      revealedWires: [],
      defusingWires: [],
      playerClaims: {},
      allClaimsReady: false,
      winner: null,
      winReason: null,
      setupComplete: false,
    };
  },
  
  phases: {
    lobby: {
      start: true,
      turn: {
        order: {
          first: () => 0,
          next: () => undefined,
        },
      },
      moves: {
        setReady: {
          move: (G, ctx, ready) => {
            const playerId = ctx.playerID;
            G.playerReady[playerId] = ready === true;
            return G;
          },
        },
        startGame: {
          move: (G, ctx) => {
            const playerCount = ctx.numPlayers;
            if (playerCount < 4 || playerCount > 8) return G;
            
            // Check all players are ready
            const allPlayers = Object.keys(ctx.playOrder);
            if (!allPlayers.every(id => G.playerReady[id] === true)) {
              return G;
            }
            
            // Assign roles
            const [goodCount, badCount] = getRoleDistribution(playerCount);
            const roles = [];
            for (let i = 0; i < goodCount; i++) roles.push(TEAMS.GOOD);
            for (let i = 0; i < badCount; i++) roles.push(TEAMS.BAD);
            shuffleArray(roles);
            
            // Create wire deck
            const wireDeck = createWireDeck(playerCount);
            
            // Deal initial 5 wires to each player
            const playerWires = {};
            let deckIndex = 0;
            for (let i = 0; i < playerCount; i++) {
              const playerId = i.toString();
              const wires = [];
              for (let j = 0; j < 5; j++) {
                wires.push(deckIndex++);
              }
              playerWires[playerId] = wires;
            }
            
            G.gamePhase = 'setup';
            G.wireDeck = wireDeck;
            G.playerWires = playerWires;
            G.playerRoles = roles.reduce((acc, role, idx) => {
              acc[idx.toString()] = role;
              return acc;
            }, {});
            
            return G;
          },
        },
      },
    },
    setup: {
      turn: {
        order: {
          first: () => 0,
          next: () => undefined, // No turns in setup
        },
      },
      endIf: (G, ctx) => {
        // End setup phase when setupComplete is true
        return G.setupComplete === true;
      },
      onEnd: (G, ctx) => {
        // Transition to playing phase
        G.gamePhase = 'playing';
        G.currentRound = 1;
        return G;
      },
      moves: {
        // Player views their wires
        viewWires: {
          move: (G, ctx) => {
            // This is just for viewing - no state change needed
            // The client will handle displaying the wires
            return G;
          },
        },
        
        // Player confirms they've viewed their wires and shuffles
        confirmViewAndShuffle: {
          move: (G, ctx) => {
            const playerId = ctx.playerID;
            if (!playerId || !G.playerWires[playerId]) return G;
            // Shuffle the player's wire indices (not the actual cards)
            G.playerWires[playerId] = shuffleArray(G.playerWires[playerId]);
            return G;
          },
        },
        
        // Start the game (after viewing wires) - can be called by any player
        startPlaying: {
          move: (G, ctx) => {
            if (G.setupComplete) return G;
            
            // Mark setup as complete - phase will transition automatically via endIf
            G.setupComplete = true;
            
            return G;
          },
        },
      },
    },
    
    playing: {
      turn: {
        order: {
          first: (G, ctx) => {
            // Determine turn order for the round
            const playerIds = Object.keys(G.playerWires);
            G.turnOrder = shuffleArray([...playerIds]);
            G.turnIndex = 0;
            G.currentTurn = G.turnOrder[0];
            G.allClaimsReady = false;
            G.playerClaims = {};
            return 0;
          },
          next: (G, ctx) => {
            // Move to next player in turn order
            G.turnIndex++;
            if (G.turnIndex < G.turnOrder.length) {
              G.currentTurn = G.turnOrder[G.turnIndex];
              return parseInt(G.currentTurn);
            }
            // Round ended
            return undefined;
          },
        },
        onBegin: (G, ctx) => {
          // Reset claims at the start of each round
          if (G.turnIndex === 0) {
            G.allClaimsReady = false;
            G.playerClaims = {};
          }
        },
        onEnd: (G, ctx) => {
          // Check win conditions after each turn
          checkWinConditions(G);
        },
      },
      moves: {
        // Submit claim for number of defusing wires
        submitClaim: {
          move: (G, ctx, claim) => {
            const playerId = ctx.playerID;
            if (G.playerClaims[playerId] !== undefined) return G;
            
            // Validate claim is a number between 0 and total wires
            const totalWires = Object.values(G.playerWires).reduce((sum, wires) => sum + wires.length, 0);
            if (typeof claim !== 'number' || claim < 0 || claim > totalWires) {
              return G;
            }
            
            G.playerClaims[playerId] = claim;
            
            // Check if all players have submitted claims
            const allPlayers = Object.keys(G.playerWires);
            if (allPlayers.every(id => G.playerClaims[id] !== undefined)) {
              G.allClaimsReady = true;
            }
            
            return G;
          },
        },
        
        // Select a wire from another player
        selectWire: {
          move: (G, ctx, { targetPlayerId, wireIndex }) => {
            // Validation
            if (G.currentTurn !== ctx.playerID) {
              return G; // Not this player's turn
            }
            
            if (targetPlayerId === ctx.playerID) {
              return G; // Cannot select own wire
            }
            
            if (!G.playerWires[targetPlayerId] || !G.playerWires[targetPlayerId][wireIndex]) {
              return G; // Invalid wire index
            }
            
            // Get the actual wire card
            const wireDeckIndex = G.playerWires[targetPlayerId][wireIndex];
            const wire = G.wireDeck[wireDeckIndex];
            
            // Remove wire from player's hand
            G.playerWires[targetPlayerId].splice(wireIndex, 1);
            
            // Reveal the wire
            const revealedWire = {
              playerId: targetPlayerId,
              wireIndex: wireDeckIndex,
              wireType: wire.type,
              round: G.currentRound,
            };
            G.revealedWires.push(revealedWire);
            
            // Handle based on wire type
            if (wire.type === WIRE_TYPES.DEFUSING) {
              // Add to defusing wires in the middle
              G.defusingWires.push({
                playerId: targetPlayerId,
                wireIndex: wireDeckIndex,
              });
            } else if (wire.type === WIRE_TYPES.BOMB) {
              // Bomb revealed - bad team wins immediately
              G.winner = TEAMS.BAD;
              G.winReason = 'Bomb was revealed!';
              G.gamePhase = 'finished';
            }
            // Safe wires are just discarded (already removed from playerWires)
            
            // Check win conditions
            checkWinConditions(G);
            
            return G;
          },
        },
      },
      endIf: (G, ctx) => {
        // End phase if game is finished
        if (G.gamePhase === 'finished') {
          return { winner: G.winner };
        }
        return false;
      },
      onEnd: (G, ctx) => {
        // End of round - redeal cards
        if (G.gamePhase === 'finished') return G;
        
        // Collect all unrevealed wires
        const allUnrevealedIndices = [];
        Object.values(G.playerWires).forEach(wires => {
          wires.forEach(wireIndex => {
            allUnrevealedIndices.push(wireIndex);
          });
        });
        
        // Shuffle
        shuffleArray(allUnrevealedIndices);
        
        // Redeal (one fewer wire per player)
        const playerIds = Object.keys(G.playerWires);
        const wiresPerPlayer = G.playerWires[playerIds[0]].length - 1;
        
        if (wiresPerPlayer <= 0) {
          // No more wires to deal - game should end
          G.currentRound = 4;
          checkWinConditions(G);
          return G;
        }
        
        let deckIndex = 0;
        playerIds.forEach(playerId => {
          G.playerWires[playerId] = [];
          for (let i = 0; i < wiresPerPlayer; i++) {
            if (deckIndex < allUnrevealedIndices.length) {
              G.playerWires[playerId].push(allUnrevealedIndices[deckIndex++]);
            }
          }
        });
        
        // Increment round
        G.currentRound++;
        
        // Check if max rounds reached
        if (G.currentRound > 4) {
          checkWinConditions(G);
        }
        
        return G;
      },
    },
  },
  
  // Hide information from players
  playerView: (G, ctx, playerID) => {
    const view = { ...G };
    
    // Hide other players' roles
    if (playerID) {
      // Only show this player's role
      const playerRole = G.playerRoles[playerID];
      view.playerRoles = { [playerID]: playerRole };
    } else {
      // Observer - no roles visible
      view.playerRoles = {};
    }
    
    // Hide unrevealed wires from other players
    if (playerID) {
      const playerWiresView = {};
      Object.keys(G.playerWires).forEach(id => {
        if (id === playerID) {
          // This player sees their own wire indices (but shuffled order)
          playerWiresView[id] = G.playerWires[id];
        } else {
          // Other players only see the count, not the actual wires
          playerWiresView[id] = Array(G.playerWires[id].length).fill(null);
        }
      });
      view.playerWires = playerWiresView;
    }
    
    return view;
  },
};
