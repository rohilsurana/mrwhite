import type { GameState } from './types.js';
import {
  createGame,
  generateGameCode,
  addPlayer,
  reconnectPlayer,
  updateSettings,
  startGame,
  markWordSeen,
  submitDescription,
  submitVote,
  startVoting,
  processVoteResult,
  guessWord,
  resetGame,
  kickPlayer,
  getClientState,
} from './game-engine.js';

const games = new Map<string, GameState>();

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

export function handleJoin(body: { gameCode?: string; name?: string; playerId?: string }): { ok: true; playerId: string; state: Record<string, unknown> } | { ok: false; error: string } {
  const { name, playerId: existingId } = body;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return { ok: false, error: 'Name is required' };
  }

  const game = getOrCreateGame(body.gameCode || null);

  if (existingId) {
    const reconnected = reconnectPlayer(game, existingId);
    if (reconnected) {
      return { ok: true, playerId: existingId, state: getClientState(game, existingId) };
    }
  }

  const player = addPlayer(game, name.trim(), existingId);
  if (!player) {
    if (game.phase !== 'lobby') {
      return { ok: false, error: 'Game is already in progress' };
    }
    return { ok: false, error: 'Name is already taken' };
  }

  return { ok: true, playerId: player.id, state: getClientState(game, player.id) };
}

export function handleGetState(code: string, playerId: string): { ok: true; state: Record<string, unknown> } | { ok: false; error: string } {
  const game = games.get(code);
  if (!game) return { ok: false, error: 'Game not found' };
  const player = game.players.find((p) => p.id === playerId);
  if (!player) return { ok: false, error: 'Player not found' };
  return { ok: true, state: getClientState(game, playerId) };
}

export function handleAction(body: { gameCode: string; playerId: string; type: string; [key: string]: unknown }): { ok: true; state: Record<string, unknown> } | { ok: false; error: string } {
  const { gameCode, playerId, type } = body;
  const game = games.get(gameCode);
  if (!game) return { ok: false, error: 'Game not found' };

  switch (type) {
    case 'update_settings': {
      const settings = body.settings as Record<string, unknown> | undefined;
      if (!settings || !updateSettings(game, playerId, settings as { spyCount?: number; describeTimerSeconds?: number; strictMode?: boolean })) {
        return { ok: false, error: 'Cannot update settings' };
      }
      break;
    }
    case 'start_game':
      if (!startGame(game, playerId)) return { ok: false, error: 'Cannot start game' };
      break;
    case 'word_seen':
      markWordSeen(game, playerId);
      break;
    case 'submit_description': {
      const text = body.text as string;
      if (!text || !submitDescription(game, playerId, text)) return { ok: false, error: 'Cannot submit description' };
      break;
    }
    case 'start_voting':
      if (!startVoting(game, playerId)) return { ok: false, error: 'Cannot start voting' };
      break;
    case 'vote': {
      const targetId = body.targetId as string;
      const accusedRole = body.accusedRole as 'mr_white' | 'spy' | undefined;
      if (!targetId || !submitVote(game, playerId, targetId, accusedRole)) return { ok: false, error: 'Invalid vote' };
      break;
    }
    case 'continue_after_vote':
      processVoteResult(game);
      break;
    case 'guess_word': {
      const word = body.word as string;
      if (!word || !guessWord(game, playerId, word)) return { ok: false, error: 'Cannot guess' };
      break;
    }
    case 'play_again':
    case 'reset_game':
      if (!resetGame(game, playerId)) return { ok: false, error: 'Cannot reset' };
      break;
    case 'kick_player': {
      const target = body.targetId as string;
      if (!target || !kickPlayer(game, playerId, target)) return { ok: false, error: 'Cannot kick' };
      break;
    }
    default:
      return { ok: false, error: 'Unknown action' };
  }

  if (game.players.length === 0) games.delete(gameCode);

  return { ok: true, state: getClientState(game, playerId) };
}
