import { useEffect, useRef } from 'react';
import { notifyTurn } from '../lib/notify';
import type { ClientGameState } from '../lib/types';

export function useNotifyTurn(state: ClientGameState | null) {
  const prevRef = useRef<{ phase: string; turnId: string | null; hasVoted: boolean } | null>(null);

  useEffect(() => {
    if (!state) return;

    const myId = state.myId;
    const me = state.players.find((p) => p.id === myId);
    if (!me) return;

    const current = {
      phase: state.phase,
      turnId: state.currentTurnPlayerId,
      hasVoted: me.hasVoted,
    };

    const prev = prevRef.current;
    prevRef.current = current;
    if (!prev) return;

    if (state.phase === 'describing' && state.currentTurnPlayerId === myId && prev.turnId !== myId) {
      notifyTurn();
      return;
    }

    if (state.phase === 'voting' && prev.phase !== 'voting') {
      notifyTurn();
      return;
    }

    if (state.phase === 'mr_white_guess' && state.myRole === 'mr_white' && prev.phase !== 'mr_white_guess') {
      notifyTurn();
      return;
    }

    if (state.phase === 'vote_result' && prev.phase !== 'vote_result') {
      notifyTurn();
      return;
    }

    if (state.phase === 'game_over' && prev.phase !== 'game_over') {
      notifyTurn();
    }
  }, [state]);
}
