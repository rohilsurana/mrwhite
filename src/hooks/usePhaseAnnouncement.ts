import { useSyncExternalStore } from 'react';
import type { GamePhase } from '../lib/types';

const announcements: Partial<Record<GamePhase, string>> = {
  discussion: 'All clues are in!',
  voting: 'Time to vote!',
  vote_result: 'Votes are in!',
  mr_white_guess: 'Mr. White was caught!',
  game_over: 'Game over!',
};

let currentMessage: string | null = null;
let prevPhase: GamePhase | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function notify() { listeners.forEach((cb) => cb()); }
function subscribe(cb: () => void) { listeners.add(cb); return () => listeners.delete(cb); }
function getSnapshot() { return currentMessage; }

export function triggerPhaseAnnouncement(phase: GamePhase | undefined) {
  if (!phase || phase === prevPhase) return;
  prevPhase = phase;
  const text = announcements[phase];
  if (text) {
    currentMessage = text;
    notify();
    clearTimeout(timer);
    timer = setTimeout(() => { currentMessage = null; notify(); }, 1500);
  }
}

export function usePhaseAnnouncement(phase: GamePhase | undefined): string | null {
  triggerPhaseAnnouncement(phase);
  return useSyncExternalStore(subscribe, getSnapshot);
}
