# Time Bomb Board Game

A browser-based, real-time multiplayer game inspired by Time Bomb. Players join via room code, receive hidden roles, and work together (or against each other) to find defusing wires while avoiding the bomb.

## Features

- **Real-time multiplayer** using WebSockets via Socket.io
- **Server-authoritative** game logic prevents cheating
- **Hidden information** - roles and cards are only visible to the appropriate players
- **No authentication required** - join with just a name and room code
- **4-8 players** supported with balanced role distribution
- **Mobile and desktop friendly** UI

## Architecture

- **Backend**: Node.js server with Socket.io for real-time communication
- **Frontend**: React with Vite bundler
- **Multiplayer**: WebSocket-based real-time synchronization via Socket.io
- **Game Logic**: Custom server-side state management
- **No database**: All game state is in-memory (games reset on server restart)

## Installation

### Prerequisites

- Node.js (v16 or higher)
- npm

### Setup

1. Install all dependencies:
```bash
npm run install-all
```

This will install dependencies for:
- Root project (concurrently for running both servers)
- Server (socket.io, express, cors)
- Client (React, Vite, socket.io-client)

## Running Locally

### Development Mode

Run both server and client in development mode:

```bash
npm run dev
```

This will start:
- **Backend server** on `http://localhost:8000` (Socket.io server)
- **Frontend client** on `http://localhost:3000` (Vite dev server)

Open `http://localhost:3000` in your browser to play.

**Note**: The frontend connects to the backend via Socket.io WebSocket connection. Make sure both servers are running.

### Production Build

A production build compiles your React frontend into optimized static files and serves them from the same server as your backend. This is useful for deployment or testing the final version locally.

#### Steps to Create a Production Build:

1. **Build the client** (compiles React app into static HTML/CSS/JS files):
```bash
npm run build
```
This creates a `client/dist` folder with all the compiled frontend files.

2. **Start the production server**:
```bash
cd server
npm start
```
This starts the server in production mode, which will:
- Run the backend game server on `http://localhost:8000`
- Serve the compiled frontend files from the same URL

3. **Access the game**:
   - Open your browser and go to: **`http://localhost:8000`**
   - This is the **only URL you need** - both frontend and backend are served from the same port
   - The server automatically serves the React app when you visit the root URL

#### Key Differences: Development vs Production

| Aspect | Development Mode | Production Build |
|--------|-----------------|------------------|
| **Frontend URL** | `http://localhost:3000` | `http://localhost:8000` |
| **Backend URL** | `http://localhost:8000` | `http://localhost:8000` |
| **How to Start** | `npm run dev` (starts both) | `npm run build` then `cd server && npm start` |
| **File Serving** | Vite dev server (port 3000) | Express serves static files (port 8000) |
| **Hot Reload** | ✅ Yes (auto-refresh on changes) | ❌ No (must rebuild) |
| **Code Optimization** | ❌ No (development mode) | ✅ Yes (minified, optimized) |
| **Use Case** | Development & testing | Deployment & final testing |

#### Production Deployment

For deploying to a live server (Heroku, Vercel, AWS, etc.):

1. **Build the client**: `npm run build`
2. **Deploy the entire project** (both `server/` and `client/dist/`)
3. **Set environment variables**:
   - `NODE_ENV=production`
   - `PORT=8000` (or your server's port)
4. **Start the server**: The server will automatically serve the built frontend files
5. **Access via your domain**: e.g., `https://yourgame.com` (all traffic goes to port 8000)

**Important**: In production, make sure to update the `multiplayer: { server: 'http://localhost:8000' }` in `client/src/App.jsx` to point to your production server URL (e.g., `https://api.yourgame.com` or your server's public URL).

## How to Play

### Creating a Room

1. Enter your display name
2. Leave the room code field empty
3. Click "Create Room"
4. Share the room link with other players

### Joining a Room

1. Enter your display name
2. Enter the room code (or use a shared link)
3. Click "Join Room"

### Lobby Phase

- Wait for 4-8 players to join
- Click "READY" when you're ready to start
- The host (room creator) can start the game once all players are ready

### Setup Phase

- View your role (Good Team or Bad Team)
- View your 5 wire cards
- Click "I've Viewed My Wires" to shuffle them face-down
- The host starts the game when everyone is ready

### Playing Phase

Each round consists of:

1. **Claim Phase**: All players claim how many defusing wires they have (you can lie!)
2. **Turn Phase**: Players take turns selecting a wire from another player
   - **Defusing wire**: Added to the middle (visible to all)
   - **Safe wire**: Discarded
   - **Bomb**: Game ends immediately - Bad Team wins!

### Win Conditions

- **Good Team wins**: All defusing wires are revealed
- **Bad Team wins**: 
  - Bomb is revealed, OR
  - Round 4 ends without all defusing wires revealed

## Game Rules

### Role Distribution

- **4 players**: 3 Good / 1 Bad OR 2 Good / 2 Bad (random)
- **5 players**: 3 Good / 2 Bad
- **6 players**: 4 Good / 2 Bad
- **7 players**: 4 Good / 3 Bad OR 5 Good / 2 Bad (random)
- **8 players**: 5 Good / 3 Bad

### Wire Deck

- X defusing wires (X = number of players)
- 1 bomb
- 4*X - 1 safe wires

### Rounds

- Each player gets exactly 1 turn per round
- At the end of each round, all unrevealed wires are collected, shuffled, and redealt
- Each player receives one fewer wire than the previous round
- Maximum 4 rounds

## Project Structure

```
timebomb-boardgame/
├── server/
│   ├── server.js          # Express server with boardgame.io
│   ├── game.js            # Re-exports shared game logic
│   └── package.json
├── client/
│   ├── src/
│   │   ├── App.jsx        # Main app component
│   │   ├── main.jsx       # React entry point
│   │   ├── components/
│   │   │   └── GameBoard.jsx  # In-game UI
│   │   └── index.css      # Styles
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── shared/
│   └── game.js            # Game logic (used by both client and server)
├── package.json           # Root package.json
└── README.md
```

## Deployment

### Environment Variables

- `PORT`: Server port (default: 8000)
- `NODE_ENV`: Set to `production` for production builds

### Deployment Options

1. **Heroku**: Deploy the server, build the client, and serve static files
2. **Vercel/Netlify**: Deploy frontend, point to backend server
3. **Docker**: Containerize the application
4. **VPS**: Run both server and serve built client files

## Technical Details

### Game State Management

The game uses boardgame.io's state management system:
- All game logic is server-side
- Client receives filtered game state (hidden information removed)
- Moves are validated server-side before applying

### Hidden Information

- **Roles**: Only visible to the player themselves
- **Wires**: Players only see their own wire cards, others see face-down cards
- **Revealed wires**: Visible to all players

### Server Validation

All moves are validated:
- Players cannot cut their own wires
- Only the active player can make moves
- Turn order is enforced
- Win conditions are checked after each move

## Troubleshooting

### Connection Issues

- Ensure the server is running on port 8000
- Check that WebSocket connections are allowed
- Verify CORS settings if accessing from different domains

### Game Not Starting

- Ensure at least 4 players have joined
- All players must click "READY"
- Only the host (first player) can start the game

### Version Issues

If you encounter issues with boardgame.io:
- This project uses version 0.50.2
- If installation fails, try clearing node_modules and package-lock.json
- Ensure Node.js version is 16 or higher

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
