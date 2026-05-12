import { wordPairs } from './word-pairs.js';
import type {
  GameState,
  Player,
  GameSettings,
  Role,
} from './types.js';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export function createGame(gameCode: string): GameState {
  return {
    gameCode,
    phase: 'lobby',
    players: [],
    round: 0,
    currentTurnIndex: 0,
    currentWordPair: null,
    votes: {},
    voteResult: null,
    descriptions: [],
    winner: null,
    settings: { spyCount: 1, describeTimerSeconds: 60 },
    usedWordPairIndices: [],
    turnOrder: [],
    describedThisRound: new Set(),
    votedThisRound: new Set(),
  };
}

export function addPlayer(game: GameState, name: string, playerId?: string): Player | null {
  if (game.phase !== 'lobby') return null;
  if (game.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) return null;

  const id = playerId || crypto.randomUUID();
  const existing = game.players.find((p) => p.id === id);
  if (existing) {
    existing.isConnected = true;
    return existing;
  }

  const player: Player = {
    id,
    name,
    role: null,
    word: null,
    isHost: game.players.length === 0,
    isAlive: true,
    isConnected: true,
    order: game.players.length,
    hasSeenWord: false,
  };
  game.players.push(player);
  return player;
}

export function reconnectPlayer(game: GameState, playerId: string): Player | null {
  const player = game.players.find((p) => p.id === playerId);
  if (player) {
    player.isConnected = true;
  }
  return player ?? null;
}

export function removePlayer(game: GameState, playerId: string): void {
  if (game.phase === 'lobby') {
    game.players = game.players.filter((p) => p.id !== playerId);
    if (game.players.length > 0 && !game.players.some((p) => p.isHost)) {
      game.players[0].isHost = true;
    }
  } else {
    const player = game.players.find((p) => p.id === playerId);
    if (player) {
      player.isConnected = false;
    }
  }
}

export function updateSettings(game: GameState, playerId: string, settings: Partial<GameSettings>): boolean {
  const player = game.players.find((p) => p.id === playerId);
  if (!player?.isHost || game.phase !== 'lobby') return false;

  if (settings.spyCount !== undefined) {
    game.settings.spyCount = Math.max(0, settings.spyCount);
  }
  if (settings.describeTimerSeconds !== undefined) {
    game.settings.describeTimerSeconds = Math.max(0, settings.describeTimerSeconds);
  }
  return true;
}

export function startGame(game: GameState, playerId: string): boolean {
  const player = game.players.find((p) => p.id === playerId);
  if (!player?.isHost || game.phase !== 'lobby') return false;
  if (game.players.length < 3) return false;

  const maxSpies = Math.max(0, game.players.length - 2);
  game.settings.spyCount = Math.min(game.settings.spyCount, maxSpies);

  const pairIndex = pickWordPair(game);
  game.currentWordPair = wordPairs[pairIndex];
  game.usedWordPairIndices.push(pairIndex);

  assignRoles(game);

  game.phase = 'word_reveal';
  game.round = 1;
  game.descriptions = [];
  game.winner = null;
  game.voteResult = null;

  return true;
}

function pickWordPair(game: GameState): number {
  const available = wordPairs
    .map((_, i) => i)
    .filter((i) => !game.usedWordPairIndices.includes(i));

  if (available.length === 0) {
    game.usedWordPairIndices = [];
    return Math.floor(Math.random() * wordPairs.length);
  }
  return available[Math.floor(Math.random() * available.length)];
}

function assignRoles(game: GameState): void {
  const shuffled = shuffle(game.players);

  shuffled[0].role = 'mr_white';
  shuffled[0].word = null;

  for (let i = 1; i <= game.settings.spyCount && i < shuffled.length; i++) {
    shuffled[i].role = 'spy';
    shuffled[i].word = game.currentWordPair!.spy;
  }

  for (let i = 1 + game.settings.spyCount; i < shuffled.length; i++) {
    shuffled[i].role = 'normal';
    shuffled[i].word = game.currentWordPair!.normal;
  }

  game.turnOrder = shuffle(game.players.map((p) => p.id));
  const mrWhiteId = shuffled[0].id;
  if (game.turnOrder[0] === mrWhiteId && game.turnOrder.length > 1) {
    const swapIdx = 1 + Math.floor(Math.random() * (game.turnOrder.length - 1));
    [game.turnOrder[0], game.turnOrder[swapIdx]] = [game.turnOrder[swapIdx], game.turnOrder[0]];
  }
  game.players.forEach((p) => {
    p.isAlive = true;
    p.hasSeenWord = false;
    p.order = game.turnOrder.indexOf(p.id);
  });
}

export function markWordSeen(game: GameState, playerId: string): boolean {
  if (game.phase !== 'word_reveal') return false;
  const player = game.players.find((p) => p.id === playerId);
  if (!player) return false;

  player.hasSeenWord = true;

  if (game.players.every((p) => p.hasSeenWord)) {
    startDescribingPhase(game);
  }
  return true;
}

function startDescribingPhase(game: GameState): void {
  game.phase = 'describing';
  game.currentTurnIndex = 0;
  game.describedThisRound = new Set();
  game.descriptions.push({ round: game.round, entries: [] });

  skipDeadPlayers(game);
}

function skipDeadPlayers(game: GameState): void {
  const aliveTurnOrder = getAliveTurnOrder(game);
  if (aliveTurnOrder.length === 0) return;

  while (
    game.currentTurnIndex < aliveTurnOrder.length &&
    !game.players.find((p) => p.id === aliveTurnOrder[game.currentTurnIndex])?.isAlive
  ) {
    game.currentTurnIndex++;
  }
}

function getAliveTurnOrder(game: GameState): string[] {
  return game.turnOrder.filter((id) => {
    const p = game.players.find((pl) => pl.id === id);
    return p?.isAlive && p?.isConnected;
  });
}

export function getCurrentTurnPlayerId(game: GameState): string | null {
  if (game.phase !== 'describing') return null;
  const alive = getAliveTurnOrder(game);
  if (game.currentTurnIndex >= alive.length) return null;
  return alive[game.currentTurnIndex];
}

export function submitDescription(game: GameState, playerId: string, text: string): boolean {
  if (game.phase !== 'describing') return false;
  const currentId = getCurrentTurnPlayerId(game);
  if (currentId !== playerId) return false;

  const player = game.players.find((p) => p.id === playerId);
  if (!player) return false;

  const currentRound = game.descriptions[game.descriptions.length - 1];
  currentRound.entries.push({
    playerId: player.id,
    playerName: player.name,
    text: text.trim(),
  });
  game.describedThisRound.add(playerId);
  game.currentTurnIndex++;

  const alive = getAliveTurnOrder(game);
  if (game.currentTurnIndex >= alive.length) {
    startVotingPhase(game);
  }

  return true;
}

function startVotingPhase(game: GameState): void {
  game.phase = 'voting';
  game.votes = {};
  game.votedThisRound = new Set();
  game.voteResult = null;
}

export function submitVote(game: GameState, voterId: string, targetId: string): boolean {
  if (game.phase !== 'voting') return false;
  const voter = game.players.find((p) => p.id === voterId);
  const target = game.players.find((p) => p.id === targetId);
  if (!voter?.isAlive || !target?.isAlive) return false;
  if (voterId === targetId) return false;

  game.votes[voterId] = targetId;
  game.votedThisRound.add(voterId);

  const alivePlayers = game.players.filter((p) => p.isAlive && p.isConnected);
  if (game.votedThisRound.size >= alivePlayers.length) {
    tallyVotes(game);
  }

  return true;
}

function tallyVotes(game: GameState): void {
  const counts: Record<string, number> = {};
  game.players.filter((p) => p.isAlive).forEach((p) => (counts[p.id] = 0));

  Object.values(game.votes).forEach((targetId) => {
    counts[targetId] = (counts[targetId] || 0) + 1;
  });

  const maxVotes = Math.max(...Object.values(counts));
  const topPlayers = Object.entries(counts).filter(([, c]) => c === maxVotes);
  const isTie = topPlayers.length > 1;

  let eliminatedPlayerId: string | null = null;
  let eliminatedRole: Role | undefined;

  if (!isTie) {
    eliminatedPlayerId = topPlayers[0][0];
    const eliminated = game.players.find((p) => p.id === eliminatedPlayerId);
    if (eliminated) {
      eliminated.isAlive = false;
      eliminatedRole = eliminated.role ?? undefined;
    }
  }

  game.voteResult = {
    eliminatedPlayerId,
    voteCounts: counts,
    isTie,
    eliminatedRole,
  };

  game.phase = 'vote_result';
}

export function processVoteResult(game: GameState): void {
  if (game.phase !== 'vote_result' || !game.voteResult) return;

  if (game.voteResult.isTie) {
    nextRound(game);
    return;
  }

  const eliminated = game.players.find((p) => p.id === game.voteResult!.eliminatedPlayerId);
  if (!eliminated) {
    nextRound(game);
    return;
  }

  if (eliminated.role === 'mr_white') {
    game.phase = 'mr_white_guess';
    return;
  }

  if (checkMrWhiteWinsByNumbers(game)) {
    game.winner = 'mr_white';
    game.phase = 'game_over';
    return;
  }

  const mrWhitesAlive = game.players.filter((p) => p.isAlive && p.role === 'mr_white');
  if (mrWhitesAlive.length === 0) {
    game.winner = 'players';
    game.phase = 'game_over';
    return;
  }

  nextRound(game);
}

function checkMrWhiteWinsByNumbers(game: GameState): boolean {
  const alive = game.players.filter((p) => p.isAlive);
  const normals = alive.filter((p) => p.role === 'normal');
  return normals.length <= 1;
}

function nextRound(game: GameState): void {
  game.round++;
  game.voteResult = null;
  game.votes = {};
  startDescribingPhase(game);
}

export function guessWord(game: GameState, playerId: string, guess: string): boolean {
  if (game.phase !== 'mr_white_guess') return false;
  const player = game.players.find((p) => p.id === playerId);
  if (!player || player.role !== 'mr_white') return false;

  const normalWord = game.currentWordPair!.normal.toLowerCase().trim();
  const playerGuess = guess.toLowerCase().trim();

  if (playerGuess === normalWord) {
    game.winner = 'mr_white';
  } else {
    game.winner = 'players';
  }
  game.phase = 'game_over';
  return true;
}

export function resetGame(game: GameState, playerId: string): boolean {
  const player = game.players.find((p) => p.id === playerId);
  if (!player?.isHost) return false;

  game.phase = 'lobby';
  game.round = 0;
  game.currentTurnIndex = 0;
  game.currentWordPair = null;
  game.votes = {};
  game.voteResult = null;
  game.descriptions = [];
  game.winner = null;
  game.turnOrder = [];
  game.describedThisRound = new Set();
  game.votedThisRound = new Set();

  game.players.forEach((p) => {
    p.role = null;
    p.word = null;
    p.isAlive = true;
    p.hasSeenWord = false;
    p.order = 0;
  });

  return true;
}

export function kickPlayer(game: GameState, hostId: string, targetId: string): 'removed' | 'eliminated' | false {
  const host = game.players.find((p) => p.id === hostId);
  if (!host?.isHost) return false;
  if (hostId === targetId) return false;

  const target = game.players.find((p) => p.id === targetId);
  if (!target) return false;

  if (game.phase === 'lobby') {
    game.players = game.players.filter((p) => p.id !== targetId);
    return 'removed';
  }

  target.isAlive = false;
  target.isConnected = false;

  if (game.phase === 'describing') {
    const currentId = getCurrentTurnPlayerId(game);
    if (currentId === targetId) {
      const alive = getAliveTurnOrder(game);
      if (game.currentTurnIndex >= alive.length) {
        startVotingPhase(game);
      }
    }
  }

  if (game.phase === 'voting') {
    const alivePlayers = game.players.filter((p) => p.isAlive && p.isConnected);
    if (game.votedThisRound.size >= alivePlayers.length && alivePlayers.length > 0) {
      tallyVotes(game);
    }
  }

  const mrWhitesAlive = game.players.filter((p) => p.isAlive && p.role === 'mr_white');
  if (mrWhitesAlive.length === 0 && game.phase !== 'game_over') {
    game.winner = 'players';
    game.phase = 'game_over';
  }

  return 'eliminated';
}

export interface SerializedGameState extends Omit<GameState, 'describedThisRound' | 'votedThisRound'> {
  describedThisRound: string[];
  votedThisRound: string[];
}

export function serializeGame(game: GameState): SerializedGameState {
  return {
    ...game,
    describedThisRound: [...game.describedThisRound],
    votedThisRound: [...game.votedThisRound],
  };
}

export function deserializeGame(data: SerializedGameState): GameState {
  return {
    ...data,
    describedThisRound: new Set(data.describedThisRound),
    votedThisRound: new Set(data.votedThisRound),
  };
}

export function getClientState(game: GameState, playerId: string): Record<string, unknown> {
  const me = game.players.find((p) => p.id === playerId);
  const isGameOver = game.phase === 'game_over';

  return {
    type: 'state',
    state: {
      gameCode: game.gameCode,
      phase: game.phase,
      players: game.players.map((p) => ({
        id: p.id,
        name: p.name,
        isHost: p.isHost,
        isAlive: p.isAlive,
        isConnected: p.isConnected,
        order: p.order,
        hasDescribed: game.describedThisRound.has(p.id),
        hasVoted: game.votedThisRound.has(p.id),
        revealedRole: isGameOver
          ? p.role
          : game.voteResult?.eliminatedPlayerId === p.id
            ? game.voteResult.eliminatedRole
            : undefined,
      })),
      myRole: me?.role ?? null,
      myWord: me?.word ?? null,
      myId: playerId,
      isHost: me?.isHost ?? false,
      round: game.round,
      currentTurnPlayerId: getCurrentTurnPlayerId(game),
      descriptions: game.descriptions,
      votes: game.phase === 'vote_result' || isGameOver ? game.votes : {},
      voteResult: game.voteResult,
      winner: game.winner,
      settings: game.settings,
      timerSeconds: null,
    },
  };
}
