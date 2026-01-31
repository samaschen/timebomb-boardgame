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

### 👥 Teams & Roles

Players are secretly divided into two teams — *you won't know who's on which team!*

| 🟢 Good Team (SWAT) | 🔴 Bad Team (Terrorists) |
|---------------------|--------------------------|
| Find all defusing wires to win | Stop them or detonate the bomb |

**Role distribution by player count:**

| Players | Distribution |
|:-------:|:-------:|
| 4 | 2🟢2🔴 or 3🟢1🔴 | 
| 5 | 3🟢2🔴 |
| 6 | 4🟢2🔴 |
| 7 | 4🟢3🔴 or 5🟢2🔴 |
| 8 | 5🟢3🔴 |

### 🃏 The Cards

For **X players**, the deck contains **5X cards**:
- 🟢 **X Defusing Wires**
- 💣 **1 Bomb**
- ⚪ **4X - 1 Safe Wires**

Each player starts with **5 cards** (Round 1), then **4 → 3 → 2** in later rounds.

### 🔄 Game Flow

#### 1️⃣ Create or Join a Room
- **Create**: Enter your name, leave room code empty, click "Create Room"
- **Join**: Enter your name and the room code (or use a shared link)
- Share the room code with friends (4-8 players required)

#### 2️⃣ Lobby
- All players click **"Click to Ready"** when ready
- The host (room creator) clicks **"Start Game"** once everyone is ready

#### 3️⃣ Setup Phase
- View your secret role and cards
- Claim how many defusing wires you have — everyone sees your claim *(you can lie!)*
- Click "Ready" when done

#### 4️⃣ Playing Phase
- Players take turns in random order (1 turn each per round)
- On your turn: cut one wire from another player *(not yourself!)*
- The wire is revealed to everyone

#### 5️⃣ Between Rounds
- Unrevealed cards are reshuffled and redealt (1 fewer card per player)
- Found defusing wires stay revealed permanently
- The bomb stays hidden if not yet cut

### 🏆 Win Conditions

| Team | How to Win |
|------|------------|
| 🟢 Good Team | Reveal ALL defusing wires before Round 4 ends |
| 🔴 Bad Team | Bomb is revealed OR Round 4 ends without all defusing wires |

### 💡 Tips
- 🔍 Watch claims closely — who's lying?
- 🤔 Good Team players may also lie if they have the 💣 in their hand that round
- 🤔 Bad Team players may cut defusing wires to blend in, cut safe wires to stall, or reveal their identity at the "right" moment (they just need to detonate the 💣!)
- 🗣️ Communicate, but trust wisely!

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
