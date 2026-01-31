import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GameManager } from './gameManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server and Socket.IO server
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? (process.env.CLIENT_URL || true)  // In production, allow same-origin or explicit CLIENT_URL
      : ['http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Serve static files from client build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  
  // Serve index.html for all routes (SPA routing)
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// Game state management
const gameManager = new GameManager();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Join or create a room
  socket.on('join-room', async ({ roomCode, playerName }) => {
    try {
      console.log(`Player ${playerName} (${socket.id}) attempting to join room ${roomCode}`);
      
      if (!roomCode || !playerName) {
        socket.emit('error', { message: 'Room code and player name are required' });
        return;
      }

      const result = gameManager.joinRoom(roomCode, socket.id, playerName);
      
      if (result.success) {
        socket.join(roomCode);
        socket.roomCode = roomCode;
        socket.playerID = result.playerID;
        
        console.log(`Player ${playerName} joined room ${roomCode} as player ${result.playerID}`);
        
        // Send current game state to the player with playerID included
        const playerView = gameManager.getPlayerView(roomCode, result.playerID);
        // Include playerID in the game state so client knows which player they are
        playerView.playerID = result.playerID.toString();
        socket.emit('game-state', playerView);
        
        // Notify all players in the room of the update
        const roomPlayers = gameManager.getRoomPlayers(roomCode);
        const publicState = gameManager.getPublicState(roomCode);
        
        io.to(roomCode).emit('room-updated', {
          players: roomPlayers,
          gameState: publicState,
        });
      } else {
        console.error(`Failed to join room: ${result.error}`);
        socket.emit('error', { message: result.error });
      }
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room: ' + error.message });
    }
  });

  // Set player ready status
  socket.on('set-ready', ({ ready }) => {
    const roomCode = socket.roomCode;
    const playerID = socket.playerID;
    
    if (!roomCode || playerID === undefined) {
      socket.emit('error', { message: 'Not in a room' });
      return;
    }

    const result = gameManager.setReady(roomCode, playerID, ready);
    if (result.success) {
      io.to(roomCode).emit('room-updated', {
        players: gameManager.getRoomPlayers(roomCode),
        gameState: gameManager.getPublicState(roomCode),
      });
      
        // Send updated player views
        const room = gameManager.rooms.get(roomCode);
        room.players.forEach((player, socketId) => {
          const playerView = gameManager.getPlayerView(roomCode, player.id);
          playerView.playerID = player.id.toString();
          playerView.wireDeck = room.gameState.wireDeck;
          io.to(socketId).emit('game-state', playerView);
        });
    }
  });

  // Leave room (exit to join/create page)
  socket.on('leave-room', () => {
    const roomCode = socket.roomCode;
    const playerID = socket.playerID;
    
    if (!roomCode) {
      socket.emit('left-room');
      return;
    }

    const result = gameManager.leaveRoom(roomCode, socket.id);
    if (result.success) {
      socket.leave(roomCode);
      
      // Clear socket's room data
      socket.roomCode = null;
      socket.playerID = null;
      
      // Notify the player they've left
      socket.emit('left-room');
      
      // Notify remaining players
      const roomPlayers = gameManager.getRoomPlayers(roomCode);
      const publicState = gameManager.getPublicState(roomCode);
      
      if (roomPlayers) {
        io.to(roomCode).emit('room-updated', {
          players: roomPlayers,
          gameState: publicState,
        });
        io.to(roomCode).emit('player-left', { playerID });
      }
      
      console.log(`Player ${playerID} left room ${roomCode}`);
    } else {
      socket.emit('left-room'); // Still let them leave on client side
    }
  });

  // Start the game
  socket.on('start-game', () => {
    const roomCode = socket.roomCode;
    const playerID = socket.playerID;
    
    if (!roomCode || playerID === undefined) {
      socket.emit('error', { message: 'Not in a room' });
      return;
    }

    const result = gameManager.startGame(roomCode, playerID);
    if (result.success) {
      const room = gameManager.rooms.get(roomCode);
      // Immediately send game state to all players with roles and cards
      room.players.forEach((player, socketId) => {
        const playerView = gameManager.getPlayerView(roomCode, player.id);
        playerView.playerID = player.id.toString();
        // Ensure wireDeck is included in the view
        playerView.wireDeck = room.gameState.wireDeck;
        io.to(socketId).emit('game-state', playerView);
      });
      console.log(`Game setup started in room ${roomCode}, roles assigned:`, room.gameState.playerRoles);
    } else {
      socket.emit('error', { message: result.error });
    }
  });

  // View wires (setup phase)
  socket.on('view-wires', () => {
    const roomCode = socket.roomCode;
    const playerID = socket.playerID;
    
    if (!roomCode || playerID === undefined) return;
    
    // Revert the player's setup ready status and clear their claim when they view cards again
    const room = gameManager.rooms.get(roomCode);
    if (room) {
      if (room.gameState.setupReady) {
        room.gameState.setupReady[playerID] = false;
      }
      // Clear the player's claim so they can submit it again
      if (room.gameState.playerClaims) {
        delete room.gameState.playerClaims[playerID];
      }
    }
    
    // Broadcast updated state to all players
    room.players.forEach((player, socketId) => {
      const playerView = gameManager.getPlayerView(roomCode, player.id);
      playerView.playerID = player.id.toString();
      playerView.wireDeck = room.gameState.wireDeck;
      playerView.setupReady = room.gameState.setupReady || {};
      playerView.playerClaims = room.gameState.playerClaims || {};
      io.to(socketId).emit('game-state', playerView);
    });
  });

  // Confirm view and shuffle
  socket.on('confirm-view-and-shuffle', () => {
    const roomCode = socket.roomCode;
    const playerID = socket.playerID;
    
    if (!roomCode || playerID === undefined) return;

    const result = gameManager.confirmViewAndShuffle(roomCode, playerID);
    if (result.success) {
      const room = gameManager.rooms.get(roomCode);
      // Broadcast to all players using socket IDs
      room.players.forEach((player, socketId) => {
        const playerView = gameManager.getPlayerView(roomCode, player.id);
        playerView.playerID = player.id.toString();
        playerView.wireDeck = room.gameState.wireDeck;
        io.to(socketId).emit('game-state', playerView);
      });
    }
  });

  // Mark player as ready to start (after viewing cards)
  socket.on('mark-setup-ready', () => {
    const roomCode = socket.roomCode;
    const playerID = socket.playerID;
    
    if (!roomCode || playerID === undefined) return;

    const result = gameManager.markSetupReady(roomCode, playerID);
    if (result.success) {
      const room = gameManager.rooms.get(roomCode);
      // Broadcast to all players using socket IDs
      room.players.forEach((player, socketId) => {
        const playerView = gameManager.getPlayerView(roomCode, player.id);
        playerView.playerID = player.id.toString();
        playerView.wireDeck = room.gameState.wireDeck;
        io.to(socketId).emit('game-state', playerView);
      });
      
      // Don't auto-start - wait for host to click "Start Turn" button
      // The allReady status is broadcast to all players, and the host will see the "Start Turn" button
    }
  });

  // Start playing (after setup) - requires all players ready
  socket.on('start-playing', () => {
    const roomCode = socket.roomCode;
    const playerID = socket.playerID;
    
    if (!roomCode || playerID === undefined) return;

    const result = gameManager.startPlaying(roomCode);
    if (result.success) {
      const room = gameManager.rooms.get(roomCode);
      // Broadcast to all players using socket IDs
      room.players.forEach((player, socketId) => {
        const playerView = gameManager.getPlayerView(roomCode, player.id);
        playerView.playerID = player.id.toString();
        playerView.wireDeck = room.gameState.wireDeck;
        // Ensure all necessary fields are present
        playerView.gamePhase = room.gameState.gamePhase;
        playerView.currentRound = room.gameState.currentRound;
        playerView.turnOrder = room.gameState.turnOrder;
        playerView.turnIndex = room.gameState.turnIndex;
        playerView.currentTurn = room.gameState.currentTurn;
        playerView.allClaimsReady = room.gameState.allClaimsReady;
        playerView.playerClaims = room.gameState.playerClaims;
        io.to(socketId).emit('game-state', playerView);
      });
      console.log(`Game playing started in room ${roomCode}, phase: ${room.gameState.gamePhase}, round: ${room.gameState.currentRound}`);
    } else {
      socket.emit('error', { message: result.error });
    }
  });

  // Submit claim
  socket.on('submit-claim', ({ claim }) => {
    const roomCode = socket.roomCode;
    const playerID = socket.playerID;
    
    if (!roomCode || playerID === undefined) return;

    const result = gameManager.submitClaim(roomCode, playerID, claim);
    if (result.success) {
      const room = gameManager.rooms.get(roomCode);
      // Broadcast to all players using socket IDs
      room.players.forEach((player, socketId) => {
        const playerView = gameManager.getPlayerView(roomCode, player.id);
        playerView.playerID = player.id.toString();
        playerView.wireDeck = room.gameState.wireDeck;
        // Include all relevant fields for both setup and playing phases
        playerView.gamePhase = room.gameState.gamePhase;
        playerView.currentRound = room.gameState.currentRound;
        playerView.turnOrder = room.gameState.turnOrder || [];
        playerView.turnIndex = room.gameState.turnIndex || 0;
        playerView.currentTurn = room.gameState.currentTurn || null;
        playerView.allClaimsReady = room.gameState.allClaimsReady || false;
        playerView.playerClaims = room.gameState.playerClaims || {};
        playerView.playerWires = playerView.playerWires || {};
        playerView.setupReady = room.gameState.setupReady || {};
        playerView.revealedWires = room.gameState.revealedWires || [];
        playerView.defusingWires = room.gameState.defusingWires || [];
        io.to(socketId).emit('game-state', playerView);
      });
      console.log(`Claim submitted in room ${roomCode}, phase: ${room.gameState.gamePhase}, allClaimsSubmitted: ${result.allClaimsSubmitted}`);
    } else {
      socket.emit('error', { message: result.error });
    }
  });

  // Select wire
  socket.on('select-wire', ({ targetPlayerId, wireIndex }) => {
    const roomCode = socket.roomCode;
    const playerID = socket.playerID;
    
    if (!roomCode || playerID === undefined) return;

    const result = gameManager.selectWire(roomCode, playerID, targetPlayerId, wireIndex);
    if (result.success) {
      const room = gameManager.rooms.get(roomCode);
      
      // Check if round ended (cards need reshuffling)
      const needsReshuffle = room.gameState.gamePhase === 'setup' && room.gameState.currentRound > 1;
      
      // Broadcast to all players using socket IDs
      room.players.forEach((player, socketId) => {
        const playerView = gameManager.getPlayerView(roomCode, player.id);
        playerView.playerID = player.id.toString();
        playerView.wireDeck = room.gameState.wireDeck;
        playerView.roundEnded = room.gameState.roundEnded || false;
        playerView.roundReady = room.gameState.roundReady || {};
        io.to(socketId).emit('game-state', playerView);
      });
      
      // Check if game ended
      if (room.gameState.gamePhase === 'finished') {
        io.to(roomCode).emit('game-finished', {
          winner: room.gameState.winner,
          winReason: room.gameState.winReason,
        });
      }
    } else {
      socket.emit('error', { message: result.error });
    }
  });

  // Mark player as ready for next round
  socket.on('mark-round-ready', () => {
    const roomCode = socket.roomCode;
    const playerID = socket.playerID;
    
    if (!roomCode || playerID === undefined) return;

    const result = gameManager.markRoundReady(roomCode, playerID);
    if (result.success) {
      const room = gameManager.rooms.get(roomCode);
      
      // Broadcast to all players
      room.players.forEach((player, socketId) => {
        const playerView = gameManager.getPlayerView(roomCode, player.id);
        playerView.playerID = player.id.toString();
        playerView.wireDeck = room.gameState.wireDeck;
        playerView.roundEnded = room.gameState.roundEnded || false;
        playerView.roundReady = room.gameState.roundReady || {};
        io.to(socketId).emit('game-state', playerView);
      });
      
      // If all players are ready, proceed to reshuffle
      if (result.allReady) {
        setTimeout(() => {
          gameManager.endRound(room);
          const updatedRoom = gameManager.rooms.get(roomCode);
          if (updatedRoom) {
            // Broadcast new round state with all necessary fields
            updatedRoom.players.forEach((player, socketId) => {
              const playerView = gameManager.getPlayerView(roomCode, player.id);
              playerView.playerID = player.id.toString();
              playerView.wireDeck = updatedRoom.gameState.wireDeck;
              // CRITICAL: Explicitly include currentRound after endRound increments it
              playerView.gamePhase = updatedRoom.gameState.gamePhase;
              playerView.currentRound = updatedRoom.gameState.currentRound; // This should be the NEW round number
              playerView.roundEnded = updatedRoom.gameState.roundEnded || false;
              playerView.roundReady = updatedRoom.gameState.roundReady || {};
              playerView.setupReady = updatedRoom.gameState.setupReady || {};
              playerView.playerWires = playerView.playerWires || {};
              playerView.revealedWires = updatedRoom.gameState.revealedWires || [];
              playerView.defusingWires = updatedRoom.gameState.defusingWires || [];
              playerView.playerClaims = updatedRoom.gameState.playerClaims || {};
              console.log(`Broadcasting round ${updatedRoom.gameState.currentRound} to player ${player.id}`);
              io.to(socketId).emit('game-state', playerView);
            });
            console.log(`Round ended, reshuffling for round ${updatedRoom.gameState.currentRound} in room ${roomCode}`);
          }
        }, 500); // Small delay before reshuffling
      }
    } else {
      socket.emit('error', { message: result.error });
    }
  });

  // Reset game to lobby (new game)
  socket.on('new-game', () => {
    const roomCode = socket.roomCode;
    
    if (!roomCode) {
      socket.emit('error', { message: 'Not in a room' });
      return;
    }

    const result = gameManager.resetGame(roomCode);
    if (result.success) {
      const room = gameManager.rooms.get(roomCode);
      
      // Broadcast updated game state to all players - complete reset to lobby
      room.players.forEach((player, socketId) => {
        const playerView = gameManager.getPlayerView(roomCode, player.id);
        playerView.playerID = player.id.toString();
        // Ensure all lobby phase fields are included and reset
        playerView.gamePhase = room.gameState.gamePhase;
        playerView.playerReady = room.gameState.playerReady || {};
        playerView.setupReady = room.gameState.setupReady || {};
        playerView.playerClaims = room.gameState.playerClaims || {};
        playerView.currentRound = room.gameState.currentRound || 0;
        playerView.wireDeck = [];
        playerView.playerWires = {};
        playerView.playerRoles = {};
        playerView.revealedWires = [];
        playerView.defusingWires = [];
        playerView.turnOrder = [];
        playerView.currentTurn = null;
        playerView.allClaimsReady = false;
        playerView.roundEnded = false;
        playerView.roundReady = {};
        playerView.winner = null;
        playerView.winReason = null;
        playerView.setupComplete = false;
        console.log(`Game reset to lobby in room ${roomCode} for player ${player.id}`);
        io.to(socketId).emit('game-state', playerView);
      });
      
      // Also send room-updated event
      io.to(roomCode).emit('room-updated', {
        players: gameManager.getRoomPlayers(roomCode),
        gameState: gameManager.getPublicState(roomCode),
      });
      
      console.log(`Game reset to lobby in room ${roomCode}`);
    } else {
      socket.emit('error', { message: result.error });
    }
  });

  // Handle rejoin (reconnection after refresh/disconnect)
  socket.on('rejoin-room', ({ roomCode, playerName, playerID }) => {
    try {
      console.log(`Player ${playerName} (${socket.id}) attempting to rejoin room ${roomCode} as player ${playerID}`);
      
      if (!roomCode || !playerName) {
        socket.emit('rejoin-failed', { message: 'Room code and player name are required' });
        return;
      }

      const result = gameManager.rejoinRoom(roomCode, socket.id, playerName, playerID);
      
      if (result.success) {
        socket.join(roomCode);
        socket.roomCode = roomCode;
        socket.playerID = result.playerID;
        
        console.log(`Player ${playerName} rejoined room ${roomCode} as player ${result.playerID}`);
        
        // Send current game state to the rejoined player
        const playerView = gameManager.getPlayerView(roomCode, result.playerID);
        playerView.playerID = result.playerID.toString();
        const room = gameManager.rooms.get(roomCode);
        if (room && room.gameState.wireDeck) {
          playerView.wireDeck = room.gameState.wireDeck;
        }
        socket.emit('game-state', playerView);
        socket.emit('rejoin-success', { playerID: result.playerID });
        
        // Notify all players in the room of the reconnection
        const roomPlayers = gameManager.getRoomPlayers(roomCode);
        const publicState = gameManager.getPublicState(roomCode);
        
        io.to(roomCode).emit('room-updated', {
          players: roomPlayers,
          gameState: publicState,
        });
      } else {
        console.log(`Rejoin failed: ${result.error}`);
        socket.emit('rejoin-failed', { message: result.error });
      }
    } catch (error) {
      console.error('Error rejoining room:', error);
      socket.emit('rejoin-failed', { message: 'Failed to rejoin room: ' + error.message });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const roomCode = socket.roomCode;
    const playerID = socket.playerID;
    
    if (roomCode) {
      const room = gameManager.rooms.get(roomCode);
      
      // If game is in progress (not lobby), mark player as disconnected but keep them in the game
      if (room && room.gameState.gamePhase !== 'lobby') {
        const result = gameManager.markPlayerDisconnected(roomCode, socket.id);
        if (result.success) {
          console.log(`Player ${playerID} disconnected from active game in room ${roomCode}, keeping slot reserved`);
          io.to(roomCode).emit('room-updated', {
            players: gameManager.getRoomPlayers(roomCode),
            gameState: gameManager.getPublicState(roomCode),
          });
          io.to(roomCode).emit('player-disconnected', { playerID, playerName: result.playerName });
        }
      } else {
        // In lobby, remove player completely
        const result = gameManager.leaveRoom(roomCode, socket.id);
        if (result.success) {
          socket.leave(roomCode);
          io.to(roomCode).emit('room-updated', {
            players: gameManager.getRoomPlayers(roomCode),
            gameState: gameManager.getPublicState(roomCode),
          });
        }
      }
    }
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 8000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Game server available at http://localhost:${PORT}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Socket.IO server ready for connections`);
  }
});
