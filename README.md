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
- **Backend (Node.js):** Express + ws (WebSocket) — for VM deployment
- **Backend (Cloudflare):** Workers + Durable Objects — fully serverless
- **State:** In-memory (no database)

## Development

```bash
pnpm install
pnpm dev
```

Starts Vite dev server on `http://localhost:5173` and the Node.js WebSocket backend on port 3001.

To test with the Cloudflare Worker locally:

```bash
pnpm dev:cf
```

## Deployment

### Cloudflare (recommended)

Deploys the frontend as static assets and the WebSocket backend as a Worker with Durable Objects — fully on Cloudflare, no VM needed.

```bash
pnpm deploy
```

Or via CI: push to `main` triggers the deploy workflow. Add these GitHub secrets:

- `CLOUDFLARE_API_TOKEN` — [Create one](https://dash.cloudflare.com/profile/api-tokens) with "Edit Cloudflare Workers" permissions
- `CLOUDFLARE_ACCOUNT_ID` — found in your Cloudflare dashboard sidebar

### VM / VPS

```bash
pnpm build && pnpm build:server
node dist-server/index.js
```

Serves frontend + WebSocket on a single port (default 3001, configurable via `PORT`).

## Project Structure

```
worker/           # Cloudflare Worker + Durable Object backend
  index.ts        # Worker entry point, routes /ws to Durable Object
  game-room.ts    # Durable Object with WebSocket game handling
server/           # Node.js backend (VM deployment)
  index.ts        # Express + ws server entry point
  game-engine.ts  # Game state machine (shared with worker)
  ws-handler.ts   # WebSocket message routing
  word-pairs.ts   # 70 word pairs across 6 categories
src/              # Vite React frontend
  hooks/          # useWebSocket, useLocalGame
  components/     # UI components (lobby, game phases)
  lib/            # Shared types, client word pairs
```
