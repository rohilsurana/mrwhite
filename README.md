# Mr. White

A real-time multiplayer party game where players try to identify Mr. White — the player who doesn't know the secret word.

## How to Play

- **Normal players** all receive the same secret word (e.g., "Beach")
- **Spies** receive a similar but different word (e.g., "Pool") — they don't know they're spies
- **Mr. White** receives no word at all and must blend in
- Each round, players describe their word with a short clue, then vote on who they think Mr. White is
- If Mr. White is caught, they get one chance to guess the word and still win

## Game Modes

- **Online** — each player joins from their own device via WebSocket
- **Single Device** — pass-and-play on one phone/tablet, with typed or verbal clues

## Tech Stack

- **Frontend:** Vite + React 19 + TypeScript + Tailwind CSS v4 + Framer Motion
- **Backend:** Node.js + Express + ws (WebSocket)
- **State:** In-memory (no database)

## Development

```bash
pnpm install
pnpm dev
```

This starts Vite dev server on `http://localhost:5173` and the WebSocket backend on port 3001. The Vite proxy forwards `/ws` to the backend.

## Production Build

```bash
pnpm build          # builds the frontend
pnpm build:server   # compiles the server
pnpm start          # serves frontend + WebSocket from one process
```

## Deployment

### VM / VPS

Build and run `node dist-server/index.js`. The server serves the built frontend and WebSocket on a single port (default 3001, configurable via `PORT` env var).

### Cloudflare Pages + VM

Deploy the `dist/` folder to Cloudflare Pages for the static frontend. Set `VITE_WS_URL` at build time to point to your WebSocket backend:

```bash
VITE_WS_URL=wss://your-server.example.com/ws pnpm build
```

## Project Structure

```
server/           # Express + WebSocket backend
  index.ts        # Server entry point
  game-engine.ts  # Game state machine
  ws-handler.ts   # WebSocket message routing
  word-pairs.ts   # 70 word pairs across 6 categories
src/              # Vite React frontend
  hooks/          # useWebSocket, useLocalGame
  components/     # UI components (lobby, game phases)
  lib/            # Shared types, client word pairs
```
