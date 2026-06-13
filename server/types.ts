import type { WordPair } from './word-pairs.js';

export type Role = 'normal' | 'mr_white' | 'spy';

export type GamePhase =
  | 'lobby'
  | 'word_reveal'
  | 'describing'
  | 'discussion'
  | 'voting'
  | 'vote_result'
  | 'mr_white_guess'
  | 'game_over';

export interface Player {
  id: string;
  name: string;
  role: Role | null;
  word: string | null;
  isHost: boolean;
  isAlive: boolean;
  isConnected: boolean;
  order: number;
  hasSeenWord: boolean;
}

export interface GameSettings {
  spyCount: number;
  describeTimerSeconds: number;
  strictMode: boolean;
}

export interface DescriptionEntry {
  playerId: string;
  playerName: string;
  text: string;
}

export interface RoundDescriptions {
  round: number;
  entries: DescriptionEntry[];
}

export interface VoteResult {
  eliminatedPlayerId: string | null;
  voteCounts: Record<string, number>;
  isTie: boolean;
  eliminatedRole?: Role;
  wrongAccusation?: boolean;
}

export interface GameState {
  gameCode: string;
  phase: GamePhase;
  players: Player[];
  round: number;
  currentTurnIndex: number;
  currentWordPair: WordPair | null;
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
  mrWhiteGuess: string | null;
}
