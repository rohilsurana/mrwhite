export interface WordPair {
  normal: string;
  spy: string;
  category: string;
}

export type Role = 'normal' | 'mr_white' | 'spy';

export type GamePhase =
  | 'lobby'
  | 'word_reveal'
  | 'describing'
  | 'voting'
  | 'vote_result'
  | 'mr_white_guess'
  | 'game_over';

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

export interface ClientPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isAlive: boolean;
  isConnected: boolean;
  order: number;
  hasDescribed: boolean;
  hasVoted: boolean;
  revealedRole?: Role;
}

export interface ClientGameState {
  gameCode: string;
  phase: GamePhase;
  players: ClientPlayer[];
  myRole: Role | null;
  myWord: string | null;
  myId: string;
  isHost: boolean;
  round: number;
  currentTurnPlayerId: string | null;
  descriptions: RoundDescriptions[];
  votes: Record<string, string>;
  voteResult: VoteResult | null;
  winner: 'mr_white' | 'players' | null;
  settings: GameSettings;
  timerSeconds: number | null;
  words: { normal: string; spy: string } | null;
}

export type ClientMessage =
  | { type: 'join'; name: string; playerId?: string }
  | { type: 'update_settings'; settings: Partial<GameSettings> }
  | { type: 'start_game' }
  | { type: 'word_seen' }
  | { type: 'submit_description'; text: string }
  | { type: 'vote'; targetId: string; accusedRole?: 'mr_white' | 'spy' }
  | { type: 'guess_word'; word: string }
  | { type: 'play_again' }
  | { type: 'kick_player'; targetId: string };

export type ServerMessage =
  | { type: 'state'; state: ClientGameState }
  | { type: 'error'; message: string }
  | { type: 'toast'; message: string; variant: 'info' | 'warning' | 'success' };
