import { DurableObject } from 'cloudflare:workers';
import type { GameState } from '../server/types';
import {
  createGame,
  addPlayer,
  reconnectPlayer,
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
  serializeGame,
  deserializeGame,
  type SerializedGameState,
} from '../server/game-engine';

const TTL_MS = 2 * 60 * 60 * 1000;

export class GameRoom extends DurableObject {
  private game!: GameState;
  private initialized = false;

  constructor(ctx: DurableObjectState, env: Record<string, unknown>) {
    super(ctx, env);
    this.ctx.blockConcurrencyWhile(async () => {
      await this.loadState();
    });
  }

  private async loadState(): Promise<void> {
    const stored = await this.ctx.storage.get<SerializedGameState>('game');
    if (stored) {
      this.game = deserializeGame(stored);
    }
    this.initialized = true;
  }

  private async saveState(): Promise<void> {
    await this.ctx.storage.put('game', serializeGame(this.game));
    await this.ctx.storage.setAlarm(Date.now() + TTL_MS);
  }

  async alarm(): Promise<void> {
    await this.ctx.storage.deleteAll();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const gameCode = url.searchParams.get('_code') || 'XXXX';

    if (!this.initialized || !this.game) {
      this.game = createGame(gameCode);
      await this.saveState();
    }

    const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

    if (request.method === 'POST' && url.pathname === '/api/game') {
      const body = await request.json() as Record<string, unknown>;
      const result = this.handleJoin(body);
      if (result.ok) await this.saveState();
      return new Response(JSON.stringify(result), { headers });
    }

    if (request.method === 'GET' && url.pathname === '/api/game') {
      const playerId = url.searchParams.get('playerId');
      if (!playerId) {
        return new Response(JSON.stringify({ ok: false, error: 'Missing playerId' }), { headers });
      }
      const player = this.game.players.find((p) => p.id === playerId);
      if (!player) {
        return new Response(JSON.stringify({ ok: false, error: 'Player not found' }), { headers });
      }
      return new Response(JSON.stringify({ ok: true, state: getClientState(this.game, playerId) }), { headers });
    }

    if (request.method === 'POST' && url.pathname === '/api/game/action') {
      const body = await request.json() as Record<string, unknown>;
      const result = this.handleAction(body);
      if (result.ok) await this.saveState();
      return new Response(JSON.stringify(result), { headers });
    }

    return new Response('Not found', { status: 404 });
  }

  private handleJoin(body: Record<string, unknown>): { ok: true; playerId: string; state: Record<string, unknown> } | { ok: false; error: string } {
    const name = body.name as string;
    const existingId = body.playerId as string | undefined;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return { ok: false, error: 'Name is required' };
    }

    if (existingId) {
      const reconnected = reconnectPlayer(this.game, existingId);
      if (reconnected) {
        return { ok: true, playerId: existingId, state: getClientState(this.game, existingId) };
      }
    }

    const player = addPlayer(this.game, name.trim(), existingId);
    if (!player) {
      if (this.game.phase !== 'lobby') {
        return { ok: false, error: 'Game is already in progress' };
      }
      return { ok: false, error: 'Name is already taken' };
    }

    return { ok: true, playerId: player.id, state: getClientState(this.game, player.id) };
  }

  private handleAction(body: Record<string, unknown>): { ok: true; state: Record<string, unknown> } | { ok: false; error: string } {
    const playerId = body.playerId as string;
    const type = body.type as string;
    if (!playerId || !type) return { ok: false, error: 'Missing playerId or type' };

    switch (type) {
      case 'update_settings': {
        const settings = body.settings as Record<string, unknown>;
        if (!settings || !updateSettings(this.game, playerId, settings as { spyCount?: number; describeTimerSeconds?: number; strictMode?: boolean })) {
          return { ok: false, error: 'Cannot update settings' };
        }
        break;
      }
      case 'start_game':
        if (!startGame(this.game, playerId)) return { ok: false, error: 'Cannot start game' };
        break;
      case 'word_seen':
        markWordSeen(this.game, playerId);
        break;
      case 'submit_description': {
        const text = body.text as string;
        if (!text || !submitDescription(this.game, playerId, text)) return { ok: false, error: 'Cannot submit' };
        break;
      }
      case 'vote': {
        const targetId = body.targetId as string;
        const accusedRole = body.accusedRole as 'mr_white' | 'spy' | undefined;
        if (!targetId || !submitVote(this.game, playerId, targetId, accusedRole)) return { ok: false, error: 'Invalid vote' };
        break;
      }
      case 'continue_after_vote':
        processVoteResult(this.game);
        break;
      case 'guess_word': {
        const word = body.word as string;
        if (!word || !guessWord(this.game, playerId, word)) return { ok: false, error: 'Cannot guess' };
        break;
      }
      case 'play_again':
      case 'reset_game':
        if (!resetGame(this.game, playerId)) return { ok: false, error: 'Cannot reset' };
        break;
      case 'kick_player': {
        const target = body.targetId as string;
        if (!target || !kickPlayer(this.game, playerId, target)) return { ok: false, error: 'Cannot kick' };
        break;
      }
      default:
        return { ok: false, error: 'Unknown action' };
    }

    return { ok: true, state: getClientState(this.game, playerId) };
  }
}
