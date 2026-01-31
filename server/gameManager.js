import {
  getRoleDistribution,
  createWireDeck,
  shuffleArray,
  checkWinConditions,
  WIRE_TYPES,
  TEAMS,
} from '../shared/game.js';

/**
 * Game Manager - Handles all game state and logic
 * Server-authoritative game state management
 */
export class GameManager {
  constructor() {
    // Map of roomCode -> Room
    this.rooms = new Map();
  }

  /**
   * Join or create a room
   */
  joinRoom(roomCode, socketID, playerName) {
    if (!roomCode || !socketID || !playerName) {
      return { success: false, error: 'Missing required parameters' };
    }

    // Validate and normalize room code - must be exactly 6 uppercase letters
    roomCode = roomCode.toUpperCase().replace(/[^A-Z]/g, '');
    if (roomCode.length !== 6) {
      return { success: false, error: 'Room code must be exactly 6 letters' };
    }

    // Get or create room
    let room = this.rooms.get(roomCode);
    if (!room) {
      room = {
        code: roomCode,
        players: new Map(), // socketID -> { id, name, ready }
        nextPlayerID: 0, // Counter for unique player IDs (prevents collision when players leave/rejoin)
        gameState: {
          matchID: roomCode, // Store room code for display
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
          roundEnded: false,
          roundReady: {},
          winner: null,
          winReason: null,
          setupComplete: false,
        },
        hostSocketID: socketID, // First player is host
        // Store per-viewer randomization for card positions to ensure equal probability
        // Maps: viewerPlayerID -> { targetPlayerID -> [shuffled array indices] }
        cardPositionMappings: new Map(), // playerID -> { targetPlayerId -> [mapped indices] }
      };
      this.rooms.set(roomCode, room);
    }
    
    // Ensure nextPlayerID exists (for rooms created before this update)
    if (room.nextPlayerID === undefined) {
      // Find max existing ID and set nextPlayerID to max + 1
      let maxID = -1;
      room.players.forEach((player) => {
        const id = parseInt(player.id, 10);
        if (!isNaN(id) && id > maxID) {
          maxID = id;
        }
      });
      room.nextPlayerID = maxID + 1;
    }
    
    // Ensure cardPositionMappings exists (for rooms created before this update)
    if (!room.cardPositionMappings) {
      room.cardPositionMappings = new Map();
    }

    // Check if room is full
    if (room.players.size >= 8) {
      return { success: false, error: 'Room is full (max 8 players)' };
    }

    // Check if game has already started
    if (room.gameState.gamePhase !== 'lobby') {
      return { success: false, error: 'Game has already started' };
    }

    // Check for duplicate player names (case-insensitive)
    const normalizedPlayerName = playerName.trim().toLowerCase();
    const existingNames = Array.from(room.players.values()).map(p => p.name.trim().toLowerCase());
    if (existingNames.includes(normalizedPlayerName)) {
      return { success: false, error: `Name "${playerName}" is already taken. Please choose a different name.` };
    }

    // Assign player ID using the counter (prevents collision when players leave/rejoin)
    const playerID = room.nextPlayerID.toString();
    room.nextPlayerID++; // Increment for next player

    // Add player
    room.players.set(socketID, {
      id: playerID,
      name: playerName,
      ready: false,
    });

    // Initialize ready status in game state
    room.gameState.playerReady[playerID] = false;

    return { success: true, playerID };
  }

  /**
   * Leave a room
   */
  leaveRoom(roomCode, socketID) {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    room.players.delete(socketID);

    // If room is empty, delete it
    if (room.players.size === 0) {
      this.rooms.delete(roomCode);
    }

    return { success: true };
  }

  /**
   * Mark a player as disconnected (but keep their slot during active game)
   */
  markPlayerDisconnected(roomCode, socketID) {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    const player = room.players.get(socketID);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    // Store disconnected player info for potential reconnection
    if (!room.disconnectedPlayers) {
      room.disconnectedPlayers = new Map();
    }
    
    // Save player info with their original playerID
    room.disconnectedPlayers.set(player.id, {
      id: player.id,
      name: player.name,
      disconnectedAt: Date.now(),
      oldSocketID: socketID,
    });

    // Remove from active players map
    room.players.delete(socketID);

    return { success: true, playerName: player.name };
  }

  /**
   * Rejoin a room (reconnection after refresh/disconnect)
   */
  rejoinRoom(roomCode, socketID, playerName, requestedPlayerID) {
    roomCode = roomCode.toUpperCase().replace(/[^A-Z]/g, '');
    
    const room = this.rooms.get(roomCode);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    // Check if this player was disconnected
    if (room.disconnectedPlayers && room.disconnectedPlayers.has(requestedPlayerID)) {
      const disconnectedPlayer = room.disconnectedPlayers.get(requestedPlayerID);
      
      // Verify the name matches (case-insensitive)
      if (disconnectedPlayer.name.toLowerCase() !== playerName.toLowerCase()) {
        return { success: false, error: 'Player name does not match' };
      }

      // Restore the player with their original ID
      room.players.set(socketID, {
        id: disconnectedPlayer.id,
        name: disconnectedPlayer.name,
        ready: true, // Keep them ready since game is in progress
      });

      // Remove from disconnected list
      room.disconnectedPlayers.delete(requestedPlayerID);

      return { success: true, playerID: disconnectedPlayer.id };
    }

    // If game is in lobby, allow normal join
    if (room.gameState.gamePhase === 'lobby') {
      // Check for duplicate names
      const normalizedPlayerName = playerName.trim().toLowerCase();
      const existingNames = Array.from(room.players.values()).map(p => p.name.trim().toLowerCase());
      if (existingNames.includes(normalizedPlayerName)) {
        return { success: false, error: `Name "${playerName}" is already taken. Please choose a different name.` };
      }

      // Check if room is full
      if (room.players.size >= 8) {
        return { success: false, error: 'Room is full (max 8 players)' };
      }

      // Ensure nextPlayerID exists
      if (room.nextPlayerID === undefined) {
        room.nextPlayerID = 0;
      }

      // Assign new player ID using counter (prevents collision)
      const playerID = room.nextPlayerID.toString();
      room.nextPlayerID++;
      
      room.players.set(socketID, {
        id: playerID,
        name: playerName,
        ready: false,
      });
      room.gameState.playerReady[playerID] = false;

      return { success: true, playerID };
    }

    // Game is in progress but player wasn't in disconnected list
    // Check if they're trying to rejoin by name
    const existingPlayerEntry = Array.from(room.players.entries()).find(
      ([_, p]) => p.name.toLowerCase() === playerName.toLowerCase()
    );
    
    if (existingPlayerEntry) {
      // Player with this name exists and is connected
      return { success: false, error: 'A player with this name is already connected' };
    }

    return { success: false, error: 'Cannot join a game in progress' };
  }

  /**
   * Get list of players in a room
   */
  getRoomPlayers(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return [];

    const hostSocketID = room.hostSocketID;
    return Array.from(room.players.values()).map(player => {
      // Find the socket ID for this player to check if they're host
      const playerSocketId = Array.from(room.players.entries()).find(([socketId, p]) => p.id === player.id)?.[0];
      return {
        ...player,
        isHost: playerSocketId === hostSocketID
      };
    });
  }

  /**
   * Get public game state (visible to all players)
   */
  getPublicState(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    return {
      ...room.gameState,
      // Hide sensitive information in public state
      playerRoles: {}, // Roles are hidden
      wireDeck: [], // Deck is hidden
    };
  }

  /**
   * Get player-specific view (with hidden information)
   */
  getPlayerView(roomCode, playerID) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    const gameState = room.gameState;
    // Create a deep copy of game state to avoid mutations
    const view = {
      ...gameState,
      // Ensure all arrays/objects are properly copied
      turnOrder: gameState.turnOrder ? [...gameState.turnOrder] : [],
      playerClaims: gameState.playerClaims ? { ...gameState.playerClaims } : {},
      playerWires: gameState.playerWires ? { ...gameState.playerWires } : {},
      revealedWires: gameState.revealedWires ? [...gameState.revealedWires] : [],
      defusingWires: gameState.defusingWires ? [...gameState.defusingWires] : [],
      wireDeck: gameState.wireDeck ? [...gameState.wireDeck] : [],
      roundEnded: gameState.roundEnded || false,
      roundReady: gameState.roundReady ? { ...gameState.roundReady } : {},
      setupReady: gameState.setupReady ? { ...gameState.setupReady } : {},
      playerReady: gameState.playerReady ? { ...gameState.playerReady } : {},
      // Include card position mappings so client can reverse-map display positions to actualArrayIndex
      cardPositionMappings: {},
    };

    // Only show this player's role
    // Ensure playerID is a string for comparison
    const pid = playerID !== undefined ? playerID.toString() : undefined;
    if (pid && gameState.playerRoles && gameState.playerRoles[pid]) {
      view.playerRoles = { [pid]: gameState.playerRoles[pid] };
    } else {
      view.playerRoles = {};
    }

    // Hide unrevealed wires from other players
    // For other players, create a per-viewer randomized display order so each position has equal probability
    if (pid !== undefined) {
      const playerWiresView = {};
      
      // Initialize or get the mapping for this viewer
      if (!room.cardPositionMappings.has(pid)) {
        room.cardPositionMappings.set(pid, {});
      }
      const viewerMapping = room.cardPositionMappings.get(pid);
      
      Object.keys(gameState.playerWires || {}).forEach((id) => {
        if (id === pid) {
          // This player sees their own wire indices (already shuffled)
          playerWiresView[id] = gameState.playerWires[id] ? [...gameState.playerWires[id]] : [];
        } else {
          // For other players, create a randomized mapping for this specific viewer
          // This ensures each display position has equal probability of being any card
          const wireCount = gameState.playerWires[id]?.length || 0;
          
          // Create or reuse the mapping for this target player
          if (!viewerMapping[id] || viewerMapping[id].length !== wireCount) {
            // Create a shuffled array of indices [0, 1, 2, ..., n-1]
            const indices = Array.from({ length: wireCount }, (_, i) => i);
            shuffleArray(indices);
            viewerMapping[id] = indices;
          }
          
          // Return the mapping (display position -> actual array index)
          // Client will see these as positions 0, 1, 2, etc., but they map to randomized actual positions
          playerWiresView[id] = viewerMapping[id];
        }
      });
      view.playerWires = playerWiresView;
      
      // Include this viewer's card position mappings so client can match revealed cards
      // Convert Map to plain object for JSON serialization
      const mappingsObj = {};
      if (room.cardPositionMappings.has(pid)) {
        const viewerMapping = room.cardPositionMappings.get(pid);
        Object.keys(viewerMapping).forEach((targetId) => {
          mappingsObj[targetId] = viewerMapping[targetId];
        });
      }
      view.cardPositionMappings = mappingsObj;
    }

    return view;
  }

  /**
   * Set player ready status
   */
  setReady(roomCode, playerID, ready) {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    room.gameState.playerReady[playerID] = ready === true;

    return { success: true };
  }

  /**
   * Start the game (from lobby)
   */
  startGame(roomCode, playerID) {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    // Check if player is host - use hostSocketID to reliably identify host
    const playerSocketId = Array.from(room.players.entries()).find(([socketId, p]) => p.id === playerID)?.[0];
    if (playerSocketId !== room.hostSocketID) {
      return { success: false, error: 'Only the host can start the game' };
    }

    const playerCount = room.players.size;
    if (playerCount < 4 || playerCount > 8) {
      return { success: false, error: 'Need 4-8 players to start' };
    }

    // Check all players are ready
    const allReady = Array.from(room.players.values()).every(
      (p) => room.gameState.playerReady[p.id] === true
    );
    if (!allReady) {
      return { success: false, error: 'All players must be ready' };
    }

    // Reset game-specific state so a brand new game can start in this room
    // This is important when starting a second game without recreating the room
    room.gameState.currentRound = 0;
    room.gameState.currentTurn = null;
    room.gameState.turnOrder = [];
    room.gameState.turnIndex = 0;
    room.gameState.wireDeck = [];
    room.gameState.playerWires = {};
    room.gameState.playerRoles = {};
    room.gameState.revealedWires = [];
    room.gameState.defusingWires = [];
    room.gameState.playerClaims = {};
    room.gameState.allClaimsReady = false;
    room.gameState.roundEnded = false;
    room.gameState.roundReady = {};
    room.gameState.setupReady = {};
    room.gameState.winner = null;
    room.gameState.winReason = null;
    room.gameState.setupComplete = false;

    // Clear per-viewer card position mappings from any previous game
    if (room.cardPositionMappings) {
      room.cardPositionMappings.clear();
    }

    // Assign roles - create array and shuffle BEFORE assigning to players
    const [goodCount, badCount] = getRoleDistribution(playerCount);
    const roles = [];
    for (let i = 0; i < goodCount; i++) roles.push(TEAMS.GOOD);
    for (let i = 0; i < badCount; i++) roles.push(TEAMS.BAD);
    
    // Shuffle roles array using Fisher-Yates for better randomization
    const shuffledRoles = shuffleArray([...roles]);

    // Create wire deck
    const wireDeck = createWireDeck(playerCount);

    // Get all player IDs in order (sorted to ensure consistent assignment)
    const playerIds = Array.from(room.players.values())
      .map(p => p.id)
      .sort((a, b) => parseInt(a) - parseInt(b));

    // Deal initial 5 wires to each player
    const playerWires = {};
    let deckIndex = 0;
    playerIds.forEach((pid) => {
      const wires = [];
      for (let j = 0; j < 5; j++) {
        wires.push(deckIndex++);
      }
      playerWires[pid] = wires;
    });

    // Update game state - assign shuffled roles to players
    room.gameState.gamePhase = 'setup';
    room.gameState.currentRound = 1; // Set round 1 when dealing initial 5 cards
    room.gameState.wireDeck = wireDeck;
    room.gameState.playerWires = playerWires;
    room.gameState.playerRoles = {};
    
    // Assign shuffled roles to players - ensure proper randomization
    playerIds.forEach((pid, idx) => {
      room.gameState.playerRoles[pid] = shuffledRoles[idx];
    });
    
    // Track who has viewed cards and is ready to start
    room.gameState.setupReady = {};
    
    // Log role assignment for debugging
    console.log(`Room ${roomCode} - Role assignment:`, room.gameState.playerRoles);
    console.log(`Good count: ${goodCount}, Bad count: ${badCount}`);
    console.log(`Round 1 started with 5 cards per player`);

    return { success: true };
  }

  /**
   * Confirm view and shuffle wires
   */
  confirmViewAndShuffle(roomCode, playerID) {
    const room = this.rooms.get(roomCode);
    if (!room || room.gameState.gamePhase !== 'setup') {
      return { success: false, error: 'Not in setup phase' };
    }

    if (!room.gameState.playerWires[playerID]) {
      return { success: false, error: 'Player wires not found' };
    }

    // Shuffle the player's wire indices
    room.gameState.playerWires[playerID] = shuffleArray(
      room.gameState.playerWires[playerID]
    );

    return { success: true };
  }

  /**
   * Mark player as ready to start (after viewing cards and submitting claim)
   */
  markSetupReady(roomCode, playerID) {
    const room = this.rooms.get(roomCode);
    if (!room || room.gameState.gamePhase !== 'setup') {
      return { success: false, error: 'Not in setup phase' };
    }

    // Check if player has submitted their claim
    if (room.gameState.playerClaims[playerID] === undefined) {
      return { success: false, error: 'Please submit your claim first' };
    }

    if (!room.gameState.setupReady) {
      room.gameState.setupReady = {};
    }

    room.gameState.setupReady[playerID] = true;

    // Check if all players are ready to start (both claimed and marked ready)
    const allPlayers = Object.keys(room.gameState.playerWires);
    const allReady = allPlayers.every((id) => 
      room.gameState.setupReady[id] === true && room.gameState.playerClaims[id] !== undefined
    );

    return { success: true, allReady };
  }

  /**
   * Start playing (after setup) - requires all players to be ready and have submitted claims
   */
  startPlaying(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room || room.gameState.gamePhase !== 'setup') {
      return { success: false, error: 'Not in setup phase' };
    }

    if (room.gameState.setupComplete) {
      return { success: false, error: 'Game already started' };
    }

    // Check all players are ready and have submitted claims
    const allPlayers = Object.keys(room.gameState.playerWires);
    const allReady = allPlayers.every((id) => 
      room.gameState.setupReady?.[id] === true && room.gameState.playerClaims[id] !== undefined
    );
    
    if (!allReady) {
      return { success: false, error: 'All players must submit claims and click "Ready for Turn" first' };
    }

    room.gameState.gamePhase = 'playing';
    // currentRound is already set to 1 in startGame when dealing cards
    // Don't reset it here - it should already be 1
    if (!room.gameState.currentRound || room.gameState.currentRound === 0) {
      room.gameState.currentRound = 1; // Fallback safety check
    }
    room.gameState.setupComplete = true;
    
    // Set allClaimsReady to true since all claims are already submitted
    room.gameState.allClaimsReady = true;

    // Initialize first round
    this.initializeRound(room);

    return { success: true };
  }

  /**
   * Initialize a new round
   */
  initializeRound(room) {
    const playerIds = Object.keys(room.gameState.playerWires);
    room.gameState.turnOrder = shuffleArray([...playerIds]);
    room.gameState.turnIndex = 0;
    room.gameState.currentTurn = room.gameState.turnOrder[0] ? room.gameState.turnOrder[0].toString() : null;
    
    // Log for debugging
    console.log(`Round initialized - Turn order:`, room.gameState.turnOrder, 'Current turn:', room.gameState.currentTurn, 'Round:', room.gameState.currentRound);
  }

  /**
   * Submit claim
   */
  submitClaim(roomCode, playerID, claim) {
    const room = this.rooms.get(roomCode);
    // Allow claims in both setup and playing phases
    if (!room || (room.gameState.gamePhase !== 'playing' && room.gameState.gamePhase !== 'setup')) {
      return { success: false, error: 'Not in a valid phase for claims' };
    }

    if (room.gameState.playerClaims[playerID] !== undefined) {
      return { success: false, error: 'Claim already submitted' };
    }

    // Claim limit should be 0 to number of defusing wires (which equals player count)
    const maxDefusingWires = Object.keys(room.gameState.playerWires).length;

    if (typeof claim !== 'number' || claim < 0 || claim > maxDefusingWires) {
      return { success: false, error: `Invalid claim. Must be between 0 and ${maxDefusingWires}` };
    }

    room.gameState.playerClaims[playerID] = claim;

    // Check if all players have submitted claims
    const allPlayers = Object.keys(room.gameState.playerWires);
    const allClaimsSubmitted = allPlayers.every((id) => room.gameState.playerClaims[id] !== undefined);
    
    // Only set allClaimsReady to true if we're in playing phase
    // In setup phase, claims are collected but don't trigger gameplay yet
    if (allClaimsSubmitted && room.gameState.gamePhase === 'playing') {
      room.gameState.allClaimsReady = true;
    }

    return { success: true, allClaimsSubmitted };
  }

  /**
   * Select a wire
   */
  selectWire(roomCode, playerID, targetPlayerId, wireIndex) {
    const room = this.rooms.get(roomCode);
    if (!room || room.gameState.gamePhase !== 'playing') {
      return { success: false, error: 'Not in playing phase' };
    }

    // Validation
    if (room.gameState.currentTurn !== playerID) {
      return { success: false, error: 'Not your turn' };
    }

    if (targetPlayerId === playerID) {
      return { success: false, error: 'Cannot select your own wire' };
    }

    if (
      !room.gameState.playerWires[targetPlayerId] ||
      wireIndex < 0 ||
      wireIndex >= room.gameState.playerWires[targetPlayerId].length
    ) {
      return { success: false, error: 'Invalid wire index' };
    }

    // Map the display position to the actual array index using the viewer's randomization
    // Get the mapping for this player (the one cutting)
    const viewerMapping = room.cardPositionMappings.get(playerID);
    let actualArrayIndex = wireIndex;
    
    if (viewerMapping && viewerMapping[targetPlayerId]) {
      // Use the mapping: display position -> actual array position
      actualArrayIndex = viewerMapping[targetPlayerId][wireIndex];
      if (actualArrayIndex === undefined || actualArrayIndex === null) {
        return { success: false, error: 'Invalid mapped wire index' };
      }
    }
    // If no mapping exists (shouldn't happen), use wireIndex directly as fallback

    // Get the actual wire card from the target player's hand using the mapped index
    const wireDeckIndex = room.gameState.playerWires[targetPlayerId][actualArrayIndex];
    if (wireDeckIndex === undefined || wireDeckIndex === null) {
      return { success: false, error: 'Wire not found at that position' };
    }
    const wire = room.gameState.wireDeck[wireDeckIndex];
    if (!wire) {
      return { success: false, error: 'Invalid wire card' };
    }

    // Track which display position was cut for each viewer
    // IMPORTANT: We do NOT remove the card from the array - it stays in place but is revealed
    const cutDisplayPositions = {}; // viewerId -> display position that was cut
    room.cardPositionMappings.forEach((mapping, viewerId) => {
      if (mapping[targetPlayerId]) {
        // Find which display position maps to the actualArrayIndex that was cut
        const displayPos = mapping[targetPlayerId].indexOf(actualArrayIndex);
        if (displayPos !== -1) {
          cutDisplayPositions[viewerId] = displayPos;
        }
      }
    });

    // DO NOT remove the card from the array - it stays in place but is marked as revealed
    // The card remains at its position, just becomes face-up

    // Reveal the wire
    // Store the actual wireDeckIndex and actualArrayIndex (consistent across all viewers)
    // The card stays in the array at actualArrayIndex, we just mark it as revealed
    // Use actualArrayIndex for matching - each viewer can map their display position to actualArrayIndex
    const revealedWire = {
      playerId: targetPlayerId,
      wireIndex: wireDeckIndex, // Store the actual wire deck index for matching
      actualArrayIndex: actualArrayIndex, // The array position that was cut (stays in place, consistent for all viewers)
      wireType: wire.type,
      round: room.gameState.currentRound,
    };
    room.gameState.revealedWires.push(revealedWire);

    // Handle based on wire type
    if (wire.type === WIRE_TYPES.DEFUSING) {
      room.gameState.defusingWires.push({
        playerId: targetPlayerId,
        wireIndex: wireDeckIndex,
        round: room.gameState.currentRound, // Store round number for the notes
      });
    } else if (wire.type === WIRE_TYPES.BOMB) {
      room.gameState.winner = TEAMS.BAD;
      room.gameState.winReason = 'Bomb was revealed!';
      room.gameState.gamePhase = 'finished';
      return { success: true };
    }

    // Check win conditions
    checkWinConditions(room.gameState);

    // Move to next turn
    room.gameState.turnIndex++;
    if (room.gameState.turnIndex < room.gameState.turnOrder.length) {
      room.gameState.currentTurn = room.gameState.turnOrder[room.gameState.turnIndex].toString();
    } else {
      // Round ended - set flag instead of immediately reshuffling
      room.gameState.roundEnded = true;
      room.gameState.roundReady = {};
      room.gameState.currentTurn = null; // No current turn when round ended
    }

    return { success: true };
  }

  /**
   * Mark player as ready for next round
   */
  markRoundReady(roomCode, playerID) {
    const room = this.rooms.get(roomCode);
    if (!room || !room.gameState.roundEnded) {
      return { success: false, error: 'Round has not ended' };
    }

    if (!room.gameState.roundReady) {
      room.gameState.roundReady = {};
    }

    room.gameState.roundReady[playerID] = true;

    // Check if all players are ready
    const allPlayers = Object.keys(room.gameState.playerWires);
    const allReady = allPlayers.every((id) => room.gameState.roundReady[id] === true);

    return { success: true, allReady };
  }

  /**
   * End of round - redeal cards
   */
  endRound(room) {
    if (room.gameState.gamePhase === 'finished') return;

    // Collect all wires that are still in players' hands (unrevealed)
    // IMPORTANT:
    // - Already-used defusing wires (in defusingWires) are PERMANENTLY removed from future rounds
    // - The bomb MUST stay in the deck across rounds until it is revealed
    const revealedDefusingWireIndices = new Set();
    room.gameState.defusingWires.forEach((dw) => {
      revealedDefusingWireIndices.add(dw.wireIndex);
    });

    const unrevealedBombIndices = [];
    const unrevealedDefusingIndices = [];
    const unrevealedSafeIndices = [];

    Object.values(room.gameState.playerWires).forEach((wires) => {
      wires.forEach((wireIndex) => {
        const wire = room.gameState.wireDeck[wireIndex];
        if (!wire) return;

        if (wire.type === WIRE_TYPES.DEFUSING) {
          // Skip defusing wires that have already been revealed (they're "used up")
          if (!revealedDefusingWireIndices.has(wireIndex)) {
            unrevealedDefusingIndices.push(wireIndex);
          }
        } else if (wire.type === WIRE_TYPES.BOMB) {
          // Bomb is always carried through to future rounds until revealed
          unrevealedBombIndices.push(wireIndex);
        } else if (wire.type === WIRE_TYPES.SAFE) {
          unrevealedSafeIndices.push(wireIndex);
        }
      });
    });

    // There should normally be exactly one unrevealed bomb if the game is still going
    const bombIndex = unrevealedBombIndices.length > 0 ? unrevealedBombIndices[0] : null;

    // Redeal based on round number (5, 4, 3, 2 cards per player)
    const playerIds = Object.keys(room.gameState.playerWires);
    const currentRound = room.gameState.currentRound;
    
    // Calculate cards per player for the NEXT round based on current round
    // Round 1 ends → deal 4 cards for round 2
    // Round 2 ends → deal 3 cards for round 3
    // Round 3 ends → deal 2 cards for round 4
    // Round 4 ends → game should end
    let wiresPerPlayer;
    const nextRound = currentRound + 1;
    if (nextRound === 2) {
      wiresPerPlayer = 4; // Round 2: 4 cards per player
    } else if (nextRound === 3) {
      wiresPerPlayer = 3; // Round 3: 3 cards per player
    } else if (nextRound === 4) {
      wiresPerPlayer = 2; // Round 4: 2 cards per player
    } else {
      wiresPerPlayer = 0; // No more cards
    }

    if (wiresPerPlayer <= 0) {
      // Game should end - all rounds completed
      checkWinConditions(room.gameState);
      return;
    }

    const totalPlayers = playerIds.length;
    let totalNeededCards = wiresPerPlayer * totalPlayers;

    // Build the pool of indices for the NEXT round.
    // We want:
    // - Exactly 1 bomb (if still unrevealed)
    // - ALL remaining defusing wires (X - P)
    // - Fill the rest with safe wires
    const nextRoundIndices = [];

    if (bombIndex !== null) {
      nextRoundIndices.push(bombIndex);
    }

    // Add all remaining defusing wires
    unrevealedDefusingIndices.forEach((idx) => {
      nextRoundIndices.push(idx);
    });

    // Fill remaining slots with safe wires
    const remainingSlots = totalNeededCards - nextRoundIndices.length;
    if (remainingSlots < 0) {
      console.warn(
        `More bomb/defusing wires (${nextRoundIndices.length}) than capacity (${totalNeededCards}) for round ${nextRound}. Trimming extras.`
      );
    }

    // Shuffle safe wires before selecting (shuffleArray returns a new array)
    const shuffledSafe = shuffleArray(unrevealedSafeIndices);
    for (let i = 0; i < remainingSlots && i < shuffledSafe.length; i++) {
      nextRoundIndices.push(shuffledSafe[i]);
    }

    // If we still don't have enough cards (extreme edge case), just use what we have
    if (nextRoundIndices.length < totalNeededCards) {
      console.warn(
        `Not enough cards to fully populate round ${nextRound}. Have ${nextRoundIndices.length}, need ${totalNeededCards}.`
      );
      totalNeededCards = nextRoundIndices.length;
      wiresPerPlayer = Math.floor(totalNeededCards / totalPlayers);
    }

    // Final shuffle of the pool for fair distribution (shuffleArray returns a new array)
    const shuffledPool = shuffleArray(nextRoundIndices);

    let deckIndex = 0;
    playerIds.forEach((playerId) => {
      room.gameState.playerWires[playerId] = [];
      for (let i = 0; i < wiresPerPlayer; i++) {
        if (deckIndex < shuffledPool.length) {
          room.gameState.playerWires[playerId].push(shuffledPool[deckIndex++]);
        }
      }
    });

    // Increment round to the next round BEFORE transitioning to setup
    room.gameState.currentRound = nextRound;
    
    console.log(
      `Round ${currentRound} ended. Dealt ${wiresPerPlayer} cards per player for round ${room.gameState.currentRound}. Total cards in pool: ${nextRoundIndices.length}`
    );

    // Reset round ended and round ready flags
    room.gameState.roundEnded = false;
    room.gameState.roundReady = {};
    
    // Reset setup ready for new round viewing
    room.gameState.setupReady = {};
    
    // Reset claims for the new round - players need to submit new claims
    room.gameState.playerClaims = {};
    room.gameState.allClaimsReady = false;
    
    // Clear ALL revealed cards from previous rounds - new round starts fresh with all cards face-down
    // Only keep defusing wire info for the notes (defusingWires array persists)
    room.gameState.revealedWires = [];
    
    // Clear card position mappings for the new round (will be regenerated when players view)
    room.cardPositionMappings.clear();
    
    // Go back to setup phase so players can view their new cards
    room.gameState.gamePhase = 'setup';
    room.gameState.setupComplete = false;

    // Check if max rounds reached
    if (room.gameState.currentRound > 4) {
      checkWinConditions(room.gameState);
    }
  }

  /**
   * Reset game to lobby (for new game)
   */
  resetGame(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    // Reset all game state but keep players, room code, and host
    // hostSocketID is preserved - the first player remains the host
    room.gameState = {
      matchID: roomCode, // Keep room code
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
      roundEnded: false,
      roundReady: {},
      setupReady: {}, // Reset setup ready status
      winner: null,
      winReason: null,
      setupComplete: false,
    };

    // Reset all players' ready status - everyone starts unready
    Array.from(room.players.values()).forEach((player) => {
      room.gameState.playerReady[player.id] = false;
    });

    // Clear card position mappings
    if (room.cardPositionMappings) {
      room.cardPositionMappings.clear();
    }

    return { success: true };
  }
}
