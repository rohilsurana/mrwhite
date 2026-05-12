# Technical Guide: Building Real-Time Multiplayer Games

This document covers the architecture, tech stack, and patterns used in Mr. White — a real-time multiplayer party game deployed fully on Cloudflare. Use it as a reference for building similar games.

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                  Cloudflare                      │
│                                                  │
│  ┌──────────┐    /ws?code=ABCD    ┌───────────┐ │
│  │  Worker   │ ──────────────────> │ Durable   │ │
│  │ (router)  │                     │ Object    │ │
│  └──────────┘                     │ (per game)│ │
│       │                            │           │ │
│       │ static assets              │ GameState │ │
│       ▼                            │ WebSocket │ │
│  ┌──────────┐                     │ Storage   │ │
│  │  Assets   │                     └───────────┘ │
│  │ (dist/)   │                                   │
│  └──────────┘                                    │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│              Alternative: VM / VPS               │
│                                                  │
│  ┌──────────────────────────────────────┐        │
│  │  Node.js (Express + ws)              │        │
│  │  - Serves static files from dist/    │        │
│  │  - WebSocket server on /ws           │        │
│  │  - In-memory Map<code, GameState>    │        │
│  └──────────────────────────────────────┘        │
└─────────────────────────────────────────────────┘
```

The same game engine runs in both environments. The frontend is a static SPA that connects via WebSocket.

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Vite + React 19 + TypeScript | SPA, builds to static files |
| Styling | Tailwind CSS v4 | Utility-first CSS |
| Animations | Framer Motion | Page transitions, micro-interactions |
| UI primitives | Base UI (`@base-ui/react`) | Accessible headless components (Menu, Dialog, ToggleGroup) |
| Backend (Cloudflare) | Workers + Durable Objects | Serverless WebSocket handling with per-game state |
| Backend (VM) | Node.js + Express + ws | Traditional WebSocket server |
| Persistence | Durable Object Storage | KV store per game room, survives hibernation |
| Deployment | Cloudflare Workers (wrangler) | Single command deploys worker + static assets |
| CI/CD | GitHub Actions | Type-check, lint, build, deploy |

### Why These Choices

**Vite** — fast dev server with HMR, produces optimized static builds. No SSR needed for a game UI.

**Durable Objects** — each game room is an isolated stateful instance that handles WebSocket connections. The hibernation API keeps connections alive while the DO is evicted from memory, and `this.ctx.storage` persists state across wake-ups. This is the key primitive that makes real-time multiplayer possible on Cloudflare's edge.

**Shared game engine** — `server/game-engine.ts` is pure TypeScript with no platform dependencies. It's imported by both the Node.js server (`server/ws-handler.ts`) and the Cloudflare worker (`worker/game-room.ts`). This avoids duplicating game logic.

## Project Structure

```
├── server/                    # Backend (shared + Node.js specific)
│   ├── game-engine.ts         # Pure game logic state machine (shared)
│   ├── word-pairs.ts          # Game data (shared)
│   ├── types.ts               # Server-side types (shared)
│   ├── ws-handler.ts          # Node.js WebSocket handler
│   └── index.ts               # Node.js Express server entry
│
├── worker/                    # Cloudflare Worker backend
│   ├── index.ts               # Worker entry, routes requests
│   └── game-room.ts           # Durable Object, wraps game engine
│
├── src/                       # Frontend (Vite + React)
│   ├── App.tsx                # Root component, routing, game flow
│   ├── hooks/
│   │   ├── useWebSocket.ts    # Online mode WebSocket connection
│   │   └── useLocalGame.ts    # Single device mode (client-only)
│   ├── components/
│   │   ├── ui/                # Shared primitives (Button, Input, etc.)
│   │   ├── lobby/             # Lobby screens
│   │   └── game/              # Game phase screens
│   └── lib/
│       ├── types.ts           # Client-side types
│       └── word-pairs.ts      # Client copy of game data (for local mode)
│
├── wrangler.toml              # Cloudflare Worker config
├── tsconfig.json              # Frontend TS config
├── tsconfig.server.json       # Node.js server TS config
├── tsconfig.worker.json       # Cloudflare worker TS config
└── .github/workflows/
    ├── ci.yml                 # Type-check + lint + build
    ├── deploy.yml             # Production deploy (after CI passes)
    └── preview.yml            # PR preview deployments
```

## Core Patterns

### 1. Game State Machine

The game engine (`server/game-engine.ts`) is a pure state machine. Every function takes a `GameState` object and mutates it. No I/O, no timers, no WebSocket awareness.

```typescript
// State transitions
createGame(code) → GameState { phase: 'lobby' }
startGame(game, playerId) → phase: 'word_reveal'
markWordSeen(game, playerId) → (all seen?) → phase: 'describing'
submitDescription(game, playerId, text) → (all done?) → phase: 'voting'
submitVote(game, voterId, targetId) → (all voted?) → phase: 'vote_result'
processVoteResult(game) → phase: 'describing' | 'mr_white_guess' | 'game_over'
guessWord(game, playerId, guess) → phase: 'game_over'
resetGame(game, playerId) → phase: 'lobby'
```

The transport layer (WebSocket handler or Durable Object) calls these functions and broadcasts the result. This separation makes the engine testable and reusable across runtimes.

### 2. Personalized State Broadcasting

The server never sends other players' roles or words. `getClientState(game, playerId)` produces a view tailored to each player:

```typescript
{
  myRole: 'normal',        // only YOUR role
  myWord: 'Beach',         // only YOUR word
  players: [               // other players have no role/word
    { id, name, isAlive, hasVoted, revealedRole? }
  ],
  ...
}
```

After every state mutation, the server broadcasts a personalized state snapshot to each connected player. Full state sync (not incremental events) eliminates sync bugs — the state is small enough (<2KB) that this is fine.

### 3. Durable Object Per Game

Each game room is a separate Durable Object instance, identified by the game code:

```typescript
// Worker routes to the correct DO
const id = env.GAME_ROOM.idFromName(gameCode);
const room = env.GAME_ROOM.get(id);
return room.fetch(request);
```

The DO handles:
- **WebSocket lifecycle** via the hibernation API (`acceptWebSocket`, `webSocketMessage`, `webSocketClose`)
- **State persistence** via `this.ctx.storage.put/get` — survives hibernation, deploys, restarts
- **Auto-cleanup** via `this.ctx.storage.setAlarm` — deletes stale games after 2 hours of inactivity
- **Per-connection state** via `ws.serializeAttachment` — stores playerId on each WebSocket

### 4. Dual Runtime Support

The game engine has no platform-specific imports. Both runtimes wrap it the same way:

**Node.js** (`server/ws-handler.ts`):
```typescript
const games = new Map<string, GameState>();
// On WebSocket message → find game → call engine function → broadcast
```

**Cloudflare** (`worker/game-room.ts`):
```typescript
class GameRoom extends DurableObject {
  private game!: GameState;
  // On webSocketMessage → call engine function → broadcast + save to storage
}
```

The only difference: the DO persists state and uses the Web API WebSocket, while Node.js uses in-memory maps and the `ws` library.

### 5. Client-Side Local Game

Single device mode runs entirely in the browser with no server. `useLocalGame.ts` reimplements the game state machine in React state, adding a "pass the device" flow:

- `passQueue` — ordered list of players who need to view the screen
- `activeViewerId` — who is currently looking at the device
- `wordVisible` — whether the current viewer's word is revealed
- Pass screens between turns prevent other players from seeing private info

### 6. Serialization for Durable Object Storage

`GameState` uses `Set` objects which aren't JSON-serializable. The engine provides `serializeGame`/`deserializeGame` that convert Sets to arrays and back:

```typescript
export function serializeGame(game: GameState): SerializedGameState {
  return { ...game, describedThisRound: [...game.describedThisRound], ... };
}
```

The DO calls `saveState()` after every mutation and `loadState()` on construction.

## Deployment

### Cloudflare (Production)

```
wrangler.toml → defines worker entry, assets directory, DO bindings, migrations
pnpm build   → builds static frontend to dist/
wrangler deploy → uploads worker + assets + DO config
```

The `[assets]` binding serves static files with SPA fallback. The `routes` config maps a custom domain.

### CI/CD Pipeline

```
Push to main → CI (type-check, lint, build) → Deploy (wrangler deploy)
Push to PR   → CI + Preview (wrangler deploy --name mrwhite-pr-{number})
```

Preview deploys strip the custom domain route so each PR gets its own `*.workers.dev` URL. The preview URL is commented on the PR automatically.

### Required Secrets

| Secret | Purpose |
|--------|---------|
| `CLOUDFLARE_API_TOKEN` | Wrangler auth ("Edit Cloudflare Workers" template) |
| `CLOUDFLARE_ACCOUNT_ID` | Target Cloudflare account |

### VM Deployment (Alternative)

```bash
pnpm build && pnpm build:server
PORT=3001 node dist-server/index.js
```

Single process serves both static files and WebSocket.

## Adapting for Another Game

To build a different multiplayer game with this stack:

### 1. Define Your State Machine

Replace `server/game-engine.ts` with your game's logic. Keep it pure — no I/O, no platform APIs.

```typescript
interface GameState {
  gameCode: string;
  phase: YourPhase;
  players: Player[];
  // your game-specific state
}

export function createGame(code: string): GameState { ... }
export function yourAction(game: GameState, ...args): boolean { ... }
export function getClientState(game: GameState, playerId: string): ClientView { ... }
```

### 2. Define Client Messages

Map player actions to WebSocket messages:

```typescript
type ClientMessage =
  | { type: 'join'; name: string }
  | { type: 'your_action'; payload: any }
  | { type: 'another_action'; ... };
```

### 3. Wire Up the Transport

Copy `server/ws-handler.ts` and `worker/game-room.ts`, replacing the message handlers with your actions. The structure stays the same — receive message, call engine, broadcast.

### 4. Build the UI

Each game phase gets a React component. The `useWebSocket` hook and reconnection logic are reusable as-is. Replace the game phase components in `App.tsx`.

### 5. Deploy

The `wrangler.toml`, CI workflows, and deploy scripts are reusable. Just change the worker name and custom domain.

### Checklist

- [ ] Game engine with pure state machine functions
- [ ] `getClientState` that personalizes per player (hide secret info)
- [ ] `serializeGame`/`deserializeGame` for DO storage
- [ ] WebSocket message types for all player actions
- [ ] Node.js ws-handler wrapping the engine
- [ ] Durable Object wrapping the engine
- [ ] React components for each game phase
- [ ] `useWebSocket` hook (reusable)
- [ ] `useLocalGame` hook if supporting single device mode
- [ ] `wrangler.toml` with assets + DO binding
- [ ] CI + deploy + preview workflows
