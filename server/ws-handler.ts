import type { WebSocket } from 'ws';
import type { GameState } from './types.js';
import {
  createGame,
  addPlayer,
  reconnectPlayer,
  removePlayer,
  updateSettings,
  startGame,
  markWordSeen,
  submitDescription,
  submitVote,
  processVoteResult,
  guessWord,
  resetGame,
  kickPlayer,
  getClientState,
} from './game-engine.js';

const game: GameState = createGame();
const connections = new Map<WebSocket, string>();

function broadcast(): void {
  for (const [ws, playerId] of connections) {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(getClientState(game, playerId)));
    }
  }
}

function sendTo(ws: WebSocket, msg: Record<string, unknown>): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function sendError(ws: WebSocket, message: string): void {
  sendTo(ws, { type: 'error', message });
}

export function handleConnection(ws: WebSocket): void {
  ws.on('message', (raw) => {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      sendError(ws, 'Invalid message format');
      return;
    }

    switch (msg.type) {
      case 'join':
        handleJoin(ws, msg);
        break;
      case 'update_settings':
        handleUpdateSettings(ws, msg);
        break;
      case 'start_game':
        handleStartGame(ws);
        break;
      case 'word_seen':
        handleWordSeen(ws);
        break;
      case 'submit_description':
        handleSubmitDescription(ws, msg);
        break;
      case 'vote':
        handleVote(ws, msg);
        break;
      case 'continue_after_vote':
        handleContinueAfterVote();
        break;
      case 'guess_word':
        handleGuessWord(ws, msg);
        break;
      case 'play_again':
      case 'reset_game':
        handlePlayAgain(ws);
        break;
      case 'kick_player':
        handleKick(ws, msg);
        break;
      default:
        sendError(ws, 'Unknown message type');
    }
  });

  ws.on('close', () => {
    const playerId = connections.get(ws);
    if (playerId) {
      removePlayer(game, playerId);
      connections.delete(ws);
      broadcast();
    }
  });
}

function handleJoin(ws: WebSocket, msg: Record<string, unknown>): void {
  const name = msg.name as string;
  const existingId = msg.playerId as string | undefined;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    sendError(ws, 'Name is required');
    return;
  }

  if (existingId) {
    const reconnected = reconnectPlayer(game, existingId);
    if (reconnected) {
      connections.set(ws, existingId);
      broadcast();
      return;
    }
  }

  const player = addPlayer(game, name.trim(), existingId);
  if (!player) {
    if (game.phase !== 'lobby') {
      sendError(ws, 'Game is already in progress');
    } else {
      sendError(ws, 'Name is already taken');
    }
    return;
  }

  connections.set(ws, player.id);
  broadcast();
}

function handleUpdateSettings(ws: WebSocket, msg: Record<string, unknown>): void {
  const playerId = connections.get(ws);
  if (!playerId) return;

  const settings = msg.settings as Record<string, unknown>;
  if (!settings) return;

  if (!updateSettings(game, playerId, settings as { spyCount?: number; describeTimerSeconds?: number })) {
    sendError(ws, 'Only the host can change settings');
    return;
  }
  broadcast();
}

function handleStartGame(ws: WebSocket): void {
  const playerId = connections.get(ws);
  if (!playerId) return;

  if (!startGame(game, playerId)) {
    sendError(ws, 'Cannot start game. Need at least 3 players.');
    return;
  }
  broadcast();
}

function handleWordSeen(ws: WebSocket): void {
  const playerId = connections.get(ws);
  if (!playerId) return;

  markWordSeen(game, playerId);
  broadcast();
}

function handleSubmitDescription(ws: WebSocket, msg: Record<string, unknown>): void {
  const playerId = connections.get(ws);
  if (!playerId) return;

  const text = msg.text as string;
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    sendError(ws, 'Description cannot be empty');
    return;
  }

  if (!submitDescription(game, playerId, text)) {
    sendError(ws, "It's not your turn");
    return;
  }
  broadcast();
}

function handleVote(ws: WebSocket, msg: Record<string, unknown>): void {
  const playerId = connections.get(ws);
  if (!playerId) return;

  const targetId = msg.targetId as string;
  if (!targetId) {
    sendError(ws, 'Must select a player to vote for');
    return;
  }

  if (!submitVote(game, playerId, targetId)) {
    sendError(ws, 'Invalid vote');
    return;
  }
  broadcast();
}

function handleContinueAfterVote(): void {
  processVoteResult(game);
  broadcast();
}

function handleGuessWord(ws: WebSocket, msg: Record<string, unknown>): void {
  const playerId = connections.get(ws);
  if (!playerId) return;

  const word = msg.word as string;
  if (!word || typeof word !== 'string') {
    sendError(ws, 'Must provide a guess');
    return;
  }

  if (!guessWord(game, playerId, word)) {
    sendError(ws, 'You cannot guess right now');
    return;
  }
  broadcast();
}

function handlePlayAgain(ws: WebSocket): void {
  const playerId = connections.get(ws);
  if (!playerId) return;

  if (!resetGame(game, playerId)) {
    sendError(ws, 'Only the host can restart the game');
    return;
  }
  broadcast();
}

function handleKick(ws: WebSocket, msg: Record<string, unknown>): void {
  const playerId = connections.get(ws);
  if (!playerId) return;

  const targetId = msg.targetId as string;
  if (!targetId) return;

  const result = kickPlayer(game, playerId, targetId);
  if (!result) {
    sendError(ws, 'Cannot kick this player');
    return;
  }

  if (result === 'removed') {
    for (const [socket, id] of connections) {
      if (id === targetId) {
        sendTo(socket, { type: 'toast', message: 'You have been kicked from the game', variant: 'warning' });
        socket.close();
        connections.delete(socket);
      }
    }
  } else {
    for (const [socket, id] of connections) {
      if (id === targetId) {
        sendTo(socket, { type: 'toast', message: 'You have been removed from the game', variant: 'warning' });
      }
    }
  }
  broadcast();
}
