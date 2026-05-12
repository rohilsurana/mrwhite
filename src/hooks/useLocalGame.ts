import { useState, useCallback } from 'react';
import { wordPairs } from '../lib/word-pairs';
import type {
  ClientGameState,
  ClientPlayer,
  GameSettings,
  RoundDescriptions,
  VoteResult,
  Role,
} from '../lib/types';

interface LocalPlayer {
  id: string;
  name: string;
  role: Role | null;
  word: string | null;
  isAlive: boolean;
  order: number;
  hasSeenWord: boolean;
}

interface LocalState {
  phase: ClientGameState['phase'];
  players: LocalPlayer[];
  round: number;
  currentTurnIndex: number;
  wordPairIndex: number | null;
  votes: Record<string, string>;
  voteResult: VoteResult | null;
  descriptions: RoundDescriptions[];
  winner: 'mr_white' | 'players' | null;
  settings: GameSettings;
  usedWordPairIndices: number[];
  turnOrder: string[];
  describedThisRound: Set<string>;
  votedThisRound: Set<string>;
  accusations: Record<string, 'mr_white' | 'spy'>;
  activeViewerId: string | null;
  wordVisible: boolean;
  passQueue: string[];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function createLocalState(): LocalState {
  return {
    phase: 'lobby',
    players: [],
    round: 0,
    currentTurnIndex: 0,
    wordPairIndex: null,
    votes: {},
    voteResult: null,
    descriptions: [],
    winner: null,
    settings: { spyCount: 1, describeTimerSeconds: 0, strictMode: false },
    usedWordPairIndices: [],
    turnOrder: [],
    describedThisRound: new Set(),
    votedThisRound: new Set(),
    accusations: {},
    activeViewerId: null,
    wordVisible: false,
    passQueue: [],
  };
}

function getAliveTurnOrder(state: LocalState): string[] {
  return state.turnOrder.filter((id) => {
    const p = state.players.find((pl) => pl.id === id);
    return p?.isAlive;
  });
}

function getCurrentTurnPlayerId(state: LocalState): string | null {
  if (state.phase !== 'describing') return null;
  const alive = getAliveTurnOrder(state);
  if (state.currentTurnIndex >= alive.length) return null;
  return alive[state.currentTurnIndex];
}

function toClientState(state: LocalState): ClientGameState {
  const viewer = state.players.find((p) => p.id === state.activeViewerId);

  const players: ClientPlayer[] = state.players.map((p) => ({
    id: p.id,
    name: p.name,
    isHost: p.id === state.players[0]?.id,
    isAlive: p.isAlive,
    isConnected: true,
    order: p.order,
    hasDescribed: state.describedThisRound.has(p.id),
    hasVoted: state.votedThisRound.has(p.id),
    revealedRole: state.phase === 'game_over'
      ? (p.role ?? undefined)
      : state.voteResult?.eliminatedPlayerId === p.id
        ? state.voteResult.eliminatedRole
        : undefined,
  }));

  return {
    gameCode: '',
    phase: state.phase,
    players,
    myRole: viewer?.role ?? null,
    myWord: state.wordVisible ? (viewer?.word ?? null) : null,
    myId: state.activeViewerId ?? '',
    isHost: true,
    round: state.round,
    currentTurnPlayerId: getCurrentTurnPlayerId(state),
    descriptions: state.descriptions,
    votes: state.phase === 'vote_result' || state.phase === 'game_over' ? state.votes : {},
    voteResult: state.voteResult,
    winner: state.winner,
    settings: state.settings,
    timerSeconds: null,
    words: state.phase === 'game_over' && state.wordPairIndex !== null
      ? { normal: wordPairs[state.wordPairIndex].normal, spy: wordPairs[state.wordPairIndex].spy }
      : null,
  };
}

export function useLocalGame() {
  const [state, setState] = useState<LocalState>(createLocalState);

  const update = useCallback((fn: (s: LocalState) => LocalState) => {
    setState((prev) => fn({ ...prev }));
  }, []);

  const addPlayer = useCallback((name: string) => {
    update((s) => {
      if (s.phase !== 'lobby') return s;
      if (s.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) return s;
      s.players = [...s.players, {
        id: crypto.randomUUID(),
        name,
        role: null,
        word: null,
        isAlive: true,
        order: s.players.length,
        hasSeenWord: false,
      }];
      return s;
    });
  }, [update]);

  const removePlayer = useCallback((id: string) => {
    update((s) => {
      if (s.phase === 'lobby') {
        s.players = s.players.filter((p) => p.id !== id);
      } else {
        const p = s.players.find((pl) => pl.id === id);
        if (p) p.isAlive = false;
      }
      return s;
    });
  }, [update]);

  const updateSettings = useCallback((settings: Partial<GameSettings>) => {
    update((s) => {
      if (settings.spyCount !== undefined) s.settings.spyCount = Math.max(0, settings.spyCount);
      if (settings.describeTimerSeconds !== undefined) s.settings.describeTimerSeconds = Math.max(0, settings.describeTimerSeconds);
      if (settings.strictMode !== undefined) s.settings.strictMode = settings.strictMode;
      return s;
    });
  }, [update]);

  const startGame = useCallback(() => {
    update((s) => {
      if (s.players.length < 3) return s;

      const maxSpies = Math.max(0, s.players.length - 2);
      s.settings.spyCount = Math.min(s.settings.spyCount, maxSpies);

      const available = wordPairs.map((_, i) => i).filter((i) => !s.usedWordPairIndices.includes(i));
      const idx = available.length > 0
        ? available[Math.floor(Math.random() * available.length)]
        : Math.floor(Math.random() * wordPairs.length);

      if (available.length === 0) s.usedWordPairIndices = [];
      s.usedWordPairIndices = [...s.usedWordPairIndices, idx];
      s.wordPairIndex = idx;
      const pair = wordPairs[idx];

      const shuffled = shuffle(s.players);
      shuffled[0].role = 'mr_white';
      shuffled[0].word = null;
      for (let i = 1; i <= s.settings.spyCount && i < shuffled.length; i++) {
        shuffled[i].role = 'spy';
        shuffled[i].word = pair.spy;
      }
      for (let i = 1 + s.settings.spyCount; i < shuffled.length; i++) {
        shuffled[i].role = 'normal';
        shuffled[i].word = pair.normal;
      }

      s.turnOrder = shuffle(s.players.map((p) => p.id));
      const mrWhiteId = shuffled[0].id;
      if (s.turnOrder[0] === mrWhiteId && s.turnOrder.length > 1) {
        const swapIdx = 1 + Math.floor(Math.random() * (s.turnOrder.length - 1));
        [s.turnOrder[0], s.turnOrder[swapIdx]] = [s.turnOrder[swapIdx], s.turnOrder[0]];
      }
      s.players.forEach((p) => {
        p.isAlive = true;
        p.hasSeenWord = false;
        p.order = s.turnOrder.indexOf(p.id);
      });

      s.phase = 'word_reveal';
      s.round = 1;
      s.descriptions = [];
      s.winner = null;
      s.voteResult = null;
      s.passQueue = s.players.map((p) => p.id);
      s.activeViewerId = s.passQueue[0];
      s.wordVisible = false;

      return s;
    });
  }, [update]);

  const revealWord = useCallback(() => {
    update((s) => ({ ...s, wordVisible: true }));
  }, [update]);

  const hideAndPass = useCallback(() => {
    update((s) => {
      const currentIdx = s.passQueue.indexOf(s.activeViewerId!);
      const player = s.players.find((p) => p.id === s.activeViewerId);
      if (player) player.hasSeenWord = true;

      if (currentIdx >= s.passQueue.length - 1) {
        s.phase = 'describing';
        s.currentTurnIndex = 0;
        s.describedThisRound = new Set();
        s.descriptions = [...s.descriptions, { round: s.round, entries: [] }];
        const currentId = getCurrentTurnPlayerId(s);
        s.activeViewerId = currentId;
        s.passQueue = [];
      } else {
        s.activeViewerId = s.passQueue[currentIdx + 1];
      }
      s.wordVisible = false;
      return s;
    });
  }, [update]);

  const advanceDescribing = useCallback((s: LocalState, clueText: string) => {
    const currentId = getCurrentTurnPlayerId(s);
    if (!currentId) return s;
    const player = s.players.find((p) => p.id === currentId);
    if (!player) return s;

    const newEntry = { playerId: player.id, playerName: player.name, text: clueText };
    s.descriptions = s.descriptions.map((r, i) =>
      i === s.descriptions.length - 1
        ? { ...r, entries: [...r.entries, newEntry] }
        : r,
    );
    s.describedThisRound = new Set(s.describedThisRound);
    s.describedThisRound.add(currentId);
    s.currentTurnIndex++;

    const alive = getAliveTurnOrder(s);
    if (s.currentTurnIndex >= alive.length) {
      s.phase = 'voting';
      s.votes = {};
      s.votedThisRound = new Set();
      s.voteResult = null;
      const aliveVoters = s.players.filter((p) => p.isAlive);
      s.passQueue = aliveVoters.map((p) => p.id);
      s.activeViewerId = s.passQueue[0];
    } else {
      s.activeViewerId = alive[s.currentTurnIndex];
    }
    return s;
  }, []);

  const skipTurn = useCallback(() => {
    update((s) => {
      if (s.phase !== 'describing') return s;
      return advanceDescribing(s, '(verbal)');
    });
  }, [update, advanceDescribing]);

  const submitTypedClue = useCallback((text: string) => {
    update((s) => {
      if (s.phase !== 'describing') return s;
      return advanceDescribing(s, text.trim());
    });
  }, [update, advanceDescribing]);

  const submitVote = useCallback((targetId: string, accusedRole?: 'mr_white' | 'spy') => {
    update((s) => {
      if (s.phase !== 'voting' || !s.activeViewerId) return s;
      if (s.activeViewerId === targetId) return s;
      if (s.settings.strictMode && !accusedRole) return s;

      s.votes = { ...s.votes, [s.activeViewerId]: targetId };
      s.votedThisRound = new Set(s.votedThisRound);
      s.votedThisRound.add(s.activeViewerId);
      if (accusedRole) s.accusations = { ...s.accusations, [s.activeViewerId]: accusedRole };

      const currentIdx = s.passQueue.indexOf(s.activeViewerId);
      if (currentIdx >= s.passQueue.length - 1) {
        const counts: Record<string, number> = {};
        s.players.filter((p) => p.isAlive).forEach((p) => (counts[p.id] = 0));
        Object.values(s.votes).forEach((tid) => { counts[tid] = (counts[tid] || 0) + 1; });

        const maxVotes = Math.max(...Object.values(counts));
        const topPlayers = Object.entries(counts).filter(([, c]) => c === maxVotes);
        const isTie = topPlayers.length > 1;

        let eliminatedPlayerId: string | null = null;
        let eliminatedRole: Role | undefined;
        let wrongAccusation = false;

        if (!isTie) {
          eliminatedPlayerId = topPlayers[0][0];
          const eliminated = s.players.find((p) => p.id === eliminatedPlayerId);

          if (eliminated && s.settings.strictMode) {
            const acc: Record<string, number> = { mr_white: 0, spy: 0 };
            Object.entries(s.votes).forEach(([vid, tid]) => {
              if (tid === eliminatedPlayerId && s.accusations[vid]) acc[s.accusations[vid]]++;
            });
            const majority = acc.mr_white >= acc.spy ? 'mr_white' : 'spy';
            if (eliminated.role !== majority) wrongAccusation = true;
          }

          if (eliminated && !wrongAccusation) {
            eliminated.isAlive = false;
            eliminatedRole = eliminated.role ?? undefined;
          }
        }

        s.voteResult = {
          eliminatedPlayerId: wrongAccusation ? null : eliminatedPlayerId,
          voteCounts: counts,
          isTie,
          eliminatedRole,
          wrongAccusation,
        };
        s.phase = 'vote_result';
        s.activeViewerId = null;
      } else {
        s.activeViewerId = s.passQueue[currentIdx + 1];
      }
      s.wordVisible = false;
      return s;
    });
  }, [update]);

  const continueAfterVote = useCallback(() => {
    update((s) => {
      if (s.phase !== 'vote_result' || !s.voteResult) return s;

      if (s.voteResult.isTie) {
        return nextRound(s);
      }

      const eliminated = s.players.find((p) => p.id === s.voteResult!.eliminatedPlayerId);
      if (!eliminated) return nextRound(s);

      if (eliminated.role === 'mr_white') {
        s.phase = 'mr_white_guess';
        s.activeViewerId = eliminated.id;
        return s;
      }

      const normals = s.players.filter((p) => p.isAlive && p.role === 'normal');
      if (normals.length <= 1) {
        s.winner = 'mr_white';
        s.phase = 'game_over';
        return s;
      }

      const mrWhitesAlive = s.players.filter((p) => p.isAlive && p.role === 'mr_white');
      if (mrWhitesAlive.length === 0) {
        s.winner = 'players';
        s.phase = 'game_over';
        return s;
      }

      return nextRound(s);
    });
  }, [update]);

  const guessWord = useCallback((guess: string) => {
    update((s) => {
      if (s.phase !== 'mr_white_guess' || s.wordPairIndex === null) return s;
      const normalWord = wordPairs[s.wordPairIndex].normal.toLowerCase().trim();
      s.winner = guess.toLowerCase().trim() === normalWord ? 'mr_white' : 'players';
      s.phase = 'game_over';
      return s;
    });
  }, [update]);

  const resetGame = useCallback(() => {
    update((s) => {
      s.phase = 'lobby';
      s.round = 0;
      s.currentTurnIndex = 0;
      s.wordPairIndex = null;
      s.votes = {};
      s.voteResult = null;
      s.descriptions = [];
      s.winner = null;
      s.turnOrder = [];
      s.describedThisRound = new Set();
      s.votedThisRound = new Set();
      s.activeViewerId = null;
      s.wordVisible = false;
      s.passQueue = [];
      s.players.forEach((p) => {
        p.role = null;
        p.word = null;
        p.isAlive = true;
        p.hasSeenWord = false;
        p.order = 0;
      });
      return s;
    });
  }, [update]);

  const clientState = toClientState(state);

  return {
    gameState: clientState,
    localState: state,
    addPlayer,
    removePlayer,
    updateSettings,
    startGame,
    revealWord,
    hideAndPass,
    skipTurn,
    submitTypedClue,
    submitVote,
    continueAfterVote,
    guessWord,
    resetGame,
  };
}

function nextRound(s: LocalState): LocalState {
  s.round++;
  s.voteResult = null;
  s.votes = {};
  s.phase = 'describing';
  s.currentTurnIndex = 0;
  s.describedThisRound = new Set();
  s.descriptions = [...s.descriptions, { round: s.round, entries: [] }];
  const alive = getAliveTurnOrder(s);
  s.activeViewerId = alive[0] ?? null;
  s.passQueue = [];
  return s;
}
