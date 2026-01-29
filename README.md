# Time Bomb Board Game

A browser-based, real-time multiplayer deduction game. Players join via room code, receive hidden roles (Good Team or Bad Team), and work together—or secretly sabotage—to find defusing wires while avoiding the bomb.

## Features

- **Real-time multiplayer** using WebSockets via Socket.IO
- **Server-authoritative** game logic prevents cheating
- **Hidden information** - roles and cards are only visible to the appropriate players
- **No authentication required** - join with just a name and room code
- **4-8 players** supported with balanced role distribution
- **Mobile and desktop friendly** UI

## Architecture

- **Backend**: Node.js + Express server with Socket.IO for real-time communication
- **Frontend**: React with Vite bundler
- **Multiplayer**: WebSocket-based real-time synchronization
- **Game Logic**: Custom server-side state management (`gameManager.js`)
- **No database**: All game state is in-memory (games reset on server restart)

---

## Local Development

### Prerequisites

- Node.js (v18 or higher recommended)
- npm

### Installation

1. **Clone the repository**:
```bash
git clone https://github.com/your-username/timebomb-boardgame.git
cd timebomb-boardgame
```

2. **Install all dependencies** (root, server, and client):
```bash
npm run install-all
```

### Running in Development Mode

Start both the backend and frontend simultaneously:

```bash
npm run dev
```

This launches:
- **Backend server** on `http://localhost:8000` (Socket.IO + Express)
- **Frontend client** on `http://localhost:3000` (Vite dev server with hot reload)

Open `http://localhost:3000` in your browser to play.

### Testing Production Build Locally

1. **Build the client**:
```bash
npm run build
```

2. **Start the production server**:
```bash
NODE_ENV=production npm run start
```

3. **Open** `http://localhost:8000` — both frontend and backend are served from this single URL.

---

## Deployment (Render)

This project is designed to deploy as a **single service** on [Render](https://render.com), where the Node.js server serves both the API (Socket.IO) and the built React frontend.

### Step-by-step

1. **Push your code to GitHub**

2. **Create a Render account** at [render.com](https://render.com) (GitHub login works)

3. **Create a new Web Service**:
   - Click **"New +"** → **"Web Service"**
   - Connect your GitHub repository

4. **Configure the service**:

   | Setting | Value |
   |---------|-------|
   | **Name** | `timebomb-game` (or any name) |
   | **Branch** | `main` |
   | **Root Directory** | *(leave empty)* |
   | **Runtime** | `Node` |
   | **Build Command** | `npm run render-build` |
   | **Start Command** | `npm run start` |
   | **Instance Type** | `Free` (or paid for always-on) |

5. **Add Environment Variable**:
   - **Key:** `NODE_ENV`
   - **Value:** `production`

6. **Deploy** — Render will build and start your app. You'll get a URL like:
   ```
   https://timebomb-game.onrender.com
   ```

### Free Tier Note

Render's free tier spins down after 15 minutes of inactivity. The first request after idle takes ~30 seconds to "wake up". Upgrade to a paid plan ($7/month) if this is an issue.

---

## How to Play

### Overview

Time Bomb is a social deduction game where players are secretly divided into two teams:
- **Good Team (SWAT)**: Find all the defusing wires before time runs out
- **Bad Team (Terrorists)**: Prevent the Good Team from winning, ideally by triggering the bomb

Players don't know each other's roles. Each round, players take turns cutting wires from other players' hands. Communication, bluffing, and deduction are key!

### Game Flow

#### 1. Create or Join a Room
- **Create**: Enter your name, leave room code empty, click "Create Room"
- **Join**: Enter your name and the room code (or use a shared link)
- Share the room code with friends (4-8 players required)

#### 2. Lobby
- All players click **"Click to Ready"** when ready
- The host (room creator) clicks **"Start Game"** once everyone is ready

#### 3. Setup Phase (each round)
- View your **secret role** (Good Team or Bad Team)
- View your **wire cards** (5 cards in Round 1, then 4, 3, 2 in subsequent rounds)
- **Claim** how many defusing wires you have (you can lie!)
- Click **"Ready for Turn"** when done
- Host clicks **"Start Turn"** to begin the round

#### 4. Playing Phase
Players take turns in a randomized order. On your turn:
1. Choose another player's face-down card to **cut**
2. Confirm your choice in the popup
3. The wire is revealed to everyone:
   - **Safe wire**: Nothing happens, next player's turn
   - **Defusing wire**: Added to the "Defusing wires found" section (progress toward Good Team win)
   - **Bomb**: Game ends immediately — **Bad Team wins!**

After all players have taken one turn, the round ends.

#### 5. Between Rounds
- All **face-down** cards are collected and reshuffled
- Already-revealed defusing wires are **permanently removed** (they count toward the win condition)
- The **bomb** stays in the deck if not yet revealed
- Each player receives **one fewer card** than the previous round
- Players re-enter their claims for the new round
- A new random turn order is generated

#### 6. Win Conditions
| Winner | Condition |
|--------|-----------|
| **Good Team** | All defusing wires (equal to player count) are revealed |
| **Bad Team** | The bomb is revealed, OR Round 4 ends without all defusing wires found |

### Strategy Tips

- **Good Team**: Share information honestly, identify suspicious players, and coordinate to find defusing wires quickly
- **Bad Team**: Blend in, mislead others, protect the bomb, and stall until Round 4
- **Claims are public but unverified** — use them to deduce who's lying
- **Watch the turn order** — Bad Team members may try to cut "safe" cards to avoid progress

---

## Game Rules Reference

### Role Distribution

| Players | Good Team | Bad Team |
|---------|-----------|----------|
| 4 | 3 or 2 | 1 or 2 (random) |
| 5 | 3 | 2 |
| 6 | 4 | 2 |
| 7 | 4 or 5 | 3 or 2 (random) |
| 8 | 5 | 3 |

### Wire Deck Composition

For X players:
- **X** defusing wires
- **1** bomb
- **4X - X - 1** = **3X - 1** safe wires
- **Total**: 4X cards

### Cards Per Player Per Round

| Round | Cards per player |
|-------|------------------|
| 1 | 5 |
| 2 | 4 |
| 3 | 3 |
| 4 | 2 |

### Turn Order

- Each round has a **new random turn order**
- Every player gets exactly **1 turn** per round
- You **cannot cut your own cards**

---

## Project Structure

```
timebomb-boardgame/
├── server/
│   ├── server.js          # Express + Socket.IO server
│   ├── gameManager.js     # Core game logic and state management
│   └── package.json
├── client/
│   ├── src/
│   │   ├── App.jsx        # Main app component, socket connection
│   │   ├── main.jsx       # React entry point
│   │   ├── components/
│   │   │   ├── Lobby.jsx      # Room/lobby UI
│   │   │   └── GameBoard.jsx  # In-game UI (setup, playing, game over)
│   │   └── index.css      # Styles
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── shared/
│   └── game.js            # Shared constants and types
├── package.json           # Root scripts (dev, build, deploy)
└── README.md
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `8000` |
| `NODE_ENV` | Set to `production` for production builds | `development` |
| `VITE_SERVER_URL` | (Optional) Override server URL in client | Auto-detected |

---

## Troubleshooting

### Connection Issues
- Ensure the server is running (`npm run dev` or `npm run start`)
- Check that WebSocket connections are not blocked by firewall/proxy
- In production, verify `NODE_ENV=production` is set

### Game Not Starting
- Need at least **4 players** to start
- All players must click **"Ready"**
- Only the **host** can start the game

### Render Deployment Issues
- Check the **Logs** tab in Render dashboard for errors
- Ensure `Build Command` is `npm run render-build`
- Ensure `Start Command` is `npm run start`
- Verify `NODE_ENV=production` environment variable is set

---

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
