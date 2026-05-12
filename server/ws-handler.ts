import type { WebSocket } from 'ws';
import type { GameState } from './types.js';
import {
  createGame,
  generateGameCode,
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

const games = new Map<string, GameState>();
const connections = new Map<WebSocket, { gameCode: string; playerId: string }>();

function getOrCreateGame(code: string | null): GameState {
  if (code) {
    const existing = games.get(code);
    if (existing) return existing;
  }
  let gameCode = code || generateGameCode();
  while (games.has(gameCode)) gameCode = generateGameCode();
  const game = createGame(gameCode);
  games.set(gameCode, game);
  return game;
}

function broadcastGame(gameCode: string): void {
  const game = games.get(gameCode);
  if (!game) return;
  for (const [ws, info] of connections) {
    if (info.gameCode === gameCode && ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(getClientState(game, info.playerId)));
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

export function handleConnection(ws: WebSocket, gameCode: string | null): void {
  const game = getOrCreateGame(gameCode);
  const connInfo = { gameCode: game.gameCode, playerId: '' };

  ws.on('message', (raw) => {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      sendError(ws, 'Invalid message format');
      return;
    }

    const currentGame = games.get(connInfo.gameCode);
    if (!currentGame) {
      sendError(ws, 'Game not found');
      return;
    }

    switch (msg.type) {
      case 'join':
        handleJoin(ws, msg, currentGame, connInfo);
        break;
      case 'update_settings':
        handleUpdateSettings(ws, msg, currentGame, connInfo);
        break;
      case 'start_game':
        handleStartGame(ws, currentGame, connInfo);
        break;
      case 'word_seen':
        handleWordSeen(currentGame, connInfo);
        break;
      case 'submit_description':
        handleSubmitDescription(ws, msg, currentGame, connInfo);
        break;
      case 'vote':
        handleVote(ws, msg, currentGame, connInfo);
        break;
      case 'continue_after_vote':
        processVoteResult(currentGame);
        broadcastGame(connInfo.gameCode);
        break;
      case 'guess_word':
        handleGuessWord(ws, msg, currentGame, connInfo);
        break;
      case 'play_again':
      case 'reset_game':
        handlePlayAgain(ws, currentGame, connInfo);
        break;
      case 'kick_player':
        handleKick(ws, msg, currentGame, connInfo);
        break;
      default:
        sendError(ws, 'Unknown message type');
    }
  });

  ws.on('close', () => {
    const info = connections.get(ws);
    if (info?.playerId) {
      const g = games.get(info.gameCode);
      if (g) {
        removePlayer(g, info.playerId);
        broadcastGame(info.gameCode);
        if (g.players.length === 0) games.delete(info.gameCode);
      }
    }
    connections.delete(ws);
  });
}

function handleJoin(ws: WebSocket, msg: Record<string, unknown>, game: GameState, connInfo: { gameCode: string; playerId: string }): void {
  const name = msg.name as string;
  const existingId = msg.playerId as string | undefined;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    sendError(ws, 'Name is required');
    return;
  }

  if (existingId) {
    const reconnected = reconnectPlayer(game, existingId);
    if (reconnected) {
      connInfo.playerId = existingId;
      connections.set(ws, connInfo);
      broadcastGame(connInfo.gameCode);
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

  connInfo.playerId = player.id;
  connections.set(ws, connInfo);
  broadcastGame(connInfo.gameCode);
}

function handleUpdateSettings(ws: WebSocket, msg: Record<string, unknown>, game: GameState, connInfo: { gameCode: string; playerId: string }): void {
  if (!connInfo.playerId) return;
  const settings = msg.settings as Record<string, unknown>;
  if (!settings) return;
  if (!updateSettings(game, connInfo.playerId, settings as { spyCount?: number; describeTimerSeconds?: number; strictMode?: boolean })) {
    sendError(ws, 'Only the host can change settings');
    return;
  }
  broadcastGame(connInfo.gameCode);
}

function handleStartGame(ws: WebSocket, game: GameState, connInfo: { gameCode: string; playerId: string }): void {
  if (!connInfo.playerId) return;
  if (!startGame(game, connInfo.playerId)) {
    sendError(ws, 'Cannot start game. Need at least 3 players.');
    return;
  }
  broadcastGame(connInfo.gameCode);
}

function handleWordSeen(game: GameState, connInfo: { gameCode: string; playerId: string }): void {
  if (!connInfo.playerId) return;
  markWordSeen(game, connInfo.playerId);
  broadcastGame(connInfo.gameCode);
}

function handleSubmitDescription(ws: WebSocket, msg: Record<string, unknown>, game: GameState, connInfo: { gameCode: string; playerId: string }): void {
  if (!connInfo.playerId) return;
  const text = msg.text as string;
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    sendError(ws, 'Description cannot be empty');
    return;
  }
  if (!submitDescription(game, connInfo.playerId, text)) {
    sendError(ws, "It's not your turn");
    return;
  }
  broadcastGame(connInfo.gameCode);
}

function handleVote(ws: WebSocket, msg: Record<string, unknown>, game: GameState, connInfo: { gameCode: string; playerId: string }): void {
  if (!connInfo.playerId) return;
  const targetId = msg.targetId as string;
  if (!targetId) {
    sendError(ws, 'Must select a player to vote for');
    return;
  }
  const accusedRole = msg.accusedRole as 'mr_white' | 'spy' | undefined;
  if (!submitVote(game, connInfo.playerId, targetId, accusedRole)) {
    sendError(ws, 'Invalid vote');
    return;
  }
  broadcastGame(connInfo.gameCode);
}

function handleGuessWord(ws: WebSocket, msg: Record<string, unknown>, game: GameState, connInfo: { gameCode: string; playerId: string }): void {
  if (!connInfo.playerId) return;
  const word = msg.word as string;
  if (!word || typeof word !== 'string') {
    sendError(ws, 'Must provide a guess');
    return;
  }
  if (!guessWord(game, connInfo.playerId, word)) {
    sendError(ws, 'You cannot guess right now');
    return;
  }
  broadcastGame(connInfo.gameCode);
}

function handlePlayAgain(ws: WebSocket, game: GameState, connInfo: { gameCode: string; playerId: string }): void {
  if (!connInfo.playerId) return;
  if (!resetGame(game, connInfo.playerId)) {
    sendError(ws, 'Only the host can restart the game');
    return;
  }
  broadcastGame(connInfo.gameCode);
}

function handleKick(ws: WebSocket, msg: Record<string, unknown>, game: GameState, connInfo: { gameCode: string; playerId: string }): void {
  if (!connInfo.playerId) return;
  const targetId = msg.targetId as string;
  if (!targetId) return;

  const result = kickPlayer(game, connInfo.playerId, targetId);
  if (!result) {
    sendError(ws, 'Cannot kick this player');
    return;
  }

  for (const [socket, info] of connections) {
    if (info.gameCode === connInfo.gameCode && info.playerId === targetId) {
      sendTo(socket, { type: 'toast', message: result === 'removed' ? 'You have been kicked from the game' : 'You have been removed from the game', variant: 'warning' });
      if (result === 'removed') {
        socket.close();
        connections.delete(socket);
      }
    }
  }
  broadcastGame(connInfo.gameCode);
}
