import { DurableObject } from 'cloudflare:workers';
import type { GameState } from '../server/types';
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
} from '../server/game-engine';

export class GameRoom extends DurableObject {
  private game: GameState;

  constructor(ctx: DurableObjectState, env: Record<string, unknown>) {
    super(ctx, env);
    this.game = createGame();
  }

  async fetch(request: Request): Promise<Response> {
    const upgrade = request.headers.get('Upgrade');
    if (upgrade !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const raw = typeof message === 'string' ? message : new TextDecoder().decode(message);

    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw);
    } catch {
      this.sendError(ws, 'Invalid message format');
      return;
    }

    switch (msg.type) {
      case 'join':
        this.handleJoin(ws, msg);
        break;
      case 'update_settings':
        this.handleUpdateSettings(ws, msg);
        break;
      case 'start_game':
        this.handleStartGame(ws);
        break;
      case 'word_seen':
        this.handleWordSeen(ws);
        break;
      case 'submit_description':
        this.handleSubmitDescription(ws, msg);
        break;
      case 'vote':
        this.handleVote(ws, msg);
        break;
      case 'continue_after_vote':
        this.handleContinueAfterVote();
        break;
      case 'guess_word':
        this.handleGuessWord(ws, msg);
        break;
      case 'play_again':
      case 'reset_game':
        this.handlePlayAgain(ws);
        break;
      case 'kick_player':
        this.handleKick(ws, msg);
        break;
      default:
        this.sendError(ws, 'Unknown message type');
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const playerId = this.getPlayerId(ws);
    if (playerId) {
      removePlayer(this.game, playerId);
      this.broadcast();
    }
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    const playerId = this.getPlayerId(ws);
    if (playerId) {
      removePlayer(this.game, playerId);
      this.broadcast();
    }
  }

  private getPlayerId(ws: WebSocket): string | null {
    const attachment = ws.deserializeAttachment() as { playerId?: string } | null;
    return attachment?.playerId ?? null;
  }

  private setPlayerId(ws: WebSocket, playerId: string): void {
    ws.serializeAttachment({ playerId });
  }

  private broadcast(): void {
    for (const ws of this.ctx.getWebSockets()) {
      const playerId = this.getPlayerId(ws);
      if (playerId) {
        try {
          ws.send(JSON.stringify(getClientState(this.game, playerId)));
        } catch {
          // connection already closed
        }
      }
    }
  }

  private sendTo(ws: WebSocket, msg: Record<string, unknown>): void {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // connection already closed
    }
  }

  private sendError(ws: WebSocket, message: string): void {
    this.sendTo(ws, { type: 'error', message });
  }

  private handleJoin(ws: WebSocket, msg: Record<string, unknown>): void {
    const name = msg.name as string;
    const existingId = msg.playerId as string | undefined;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      this.sendError(ws, 'Name is required');
      return;
    }

    if (existingId) {
      const reconnected = reconnectPlayer(this.game, existingId);
      if (reconnected) {
        this.setPlayerId(ws, existingId);
        this.broadcast();
        return;
      }
    }

    const player = addPlayer(this.game, name.trim(), existingId);
    if (!player) {
      if (this.game.phase !== 'lobby') {
        this.sendError(ws, 'Game is already in progress');
      } else {
        this.sendError(ws, 'Name is already taken');
      }
      return;
    }

    this.setPlayerId(ws, player.id);
    this.broadcast();
  }

  private handleUpdateSettings(ws: WebSocket, msg: Record<string, unknown>): void {
    const playerId = this.getPlayerId(ws);
    if (!playerId) return;

    const settings = msg.settings as Record<string, unknown>;
    if (!settings) return;

    if (!updateSettings(this.game, playerId, settings as { spyCount?: number; describeTimerSeconds?: number })) {
      this.sendError(ws, 'Only the host can change settings');
      return;
    }
    this.broadcast();
  }

  private handleStartGame(ws: WebSocket): void {
    const playerId = this.getPlayerId(ws);
    if (!playerId) return;

    if (!startGame(this.game, playerId)) {
      this.sendError(ws, 'Cannot start game. Need at least 3 players.');
      return;
    }
    this.broadcast();
  }

  private handleWordSeen(ws: WebSocket): void {
    const playerId = this.getPlayerId(ws);
    if (!playerId) return;

    markWordSeen(this.game, playerId);
    this.broadcast();
  }

  private handleSubmitDescription(ws: WebSocket, msg: Record<string, unknown>): void {
    const playerId = this.getPlayerId(ws);
    if (!playerId) return;

    const text = msg.text as string;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      this.sendError(ws, 'Description cannot be empty');
      return;
    }

    if (!submitDescription(this.game, playerId, text)) {
      this.sendError(ws, "It's not your turn");
      return;
    }
    this.broadcast();
  }

  private handleVote(ws: WebSocket, msg: Record<string, unknown>): void {
    const playerId = this.getPlayerId(ws);
    if (!playerId) return;

    const targetId = msg.targetId as string;
    if (!targetId) {
      this.sendError(ws, 'Must select a player to vote for');
      return;
    }

    if (!submitVote(this.game, playerId, targetId)) {
      this.sendError(ws, 'Invalid vote');
      return;
    }
    this.broadcast();
  }

  private handleContinueAfterVote(): void {
    processVoteResult(this.game);
    this.broadcast();
  }

  private handleGuessWord(ws: WebSocket, msg: Record<string, unknown>): void {
    const playerId = this.getPlayerId(ws);
    if (!playerId) return;

    const word = msg.word as string;
    if (!word || typeof word !== 'string') {
      this.sendError(ws, 'Must provide a guess');
      return;
    }

    if (!guessWord(this.game, playerId, word)) {
      this.sendError(ws, 'You cannot guess right now');
      return;
    }
    this.broadcast();
  }

  private handlePlayAgain(ws: WebSocket): void {
    const playerId = this.getPlayerId(ws);
    if (!playerId) return;

    if (!resetGame(this.game, playerId)) {
      this.sendError(ws, 'Only the host can restart the game');
      return;
    }
    this.broadcast();
  }

  private handleKick(ws: WebSocket, msg: Record<string, unknown>): void {
    const playerId = this.getPlayerId(ws);
    if (!playerId) return;

    const targetId = msg.targetId as string;
    if (!targetId) return;

    const result = kickPlayer(this.game, playerId, targetId);
    if (!result) {
      this.sendError(ws, 'Cannot kick this player');
      return;
    }

    if (result === 'removed') {
      for (const socket of this.ctx.getWebSockets()) {
        if (this.getPlayerId(socket) === targetId) {
          this.sendTo(socket, { type: 'toast', message: 'You have been kicked from the game', variant: 'warning' });
          socket.close(1000, 'Kicked');
        }
      }
    } else {
      for (const socket of this.ctx.getWebSockets()) {
        if (this.getPlayerId(socket) === targetId) {
          this.sendTo(socket, { type: 'toast', message: 'You have been removed from the game', variant: 'warning' });
        }
      }
    }
    this.broadcast();
  }
}
