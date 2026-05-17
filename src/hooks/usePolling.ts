import { useEffect, useRef, useState, useCallback } from 'react';
import type { ClientGameState, ClientMessage } from '../lib/types';

const API_BASE = import.meta.env.VITE_API_URL || '';

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  return res.json() as Promise<T>;
}

type ApiResult = { ok: true; state: { state: Record<string, unknown> }; playerId?: string } | { ok: false; error: string };

export function usePolling(gameCode: string | null) {
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const playerIdRef = useRef<string | null>(sessionStorage.getItem('mr_white_player_id'));
  const activeCodeRef = useRef(gameCode);

  const applyState = useCallback((result: ApiResult) => {
    if (result.ok) {
      const state = (result.state as unknown as { state: ClientGameState }).state;
      setGameState(state);
      setError(null);
      if (state.gameCode) {
        sessionStorage.setItem('mr_white_game_code', state.gameCode);
        activeCodeRef.current = state.gameCode;
      }
      if ('playerId' in result && result.playerId) {
        playerIdRef.current = result.playerId;
        sessionStorage.setItem('mr_white_player_id', result.playerId);
      }
    } else {
      setError(result.error);
      setTimeout(() => setError(null), 4000);
    }
  }, []);

  const poll = useCallback(async () => {
    const code = activeCodeRef.current || sessionStorage.getItem('mr_white_game_code');
    const pid = playerIdRef.current;
    if (!code || !pid) return;
    try {
      const result = await api<ApiResult>(`/api/game?code=${code}&playerId=${pid}`);
      applyState(result);
    } catch {
      // network error, retry on next tick
    }
  }, [applyState]);

  const join = useCallback(async (code: string | null, name: string) => {
    const existingId = sessionStorage.getItem('mr_white_player_id');
    const result = await api<ApiResult>('/api/game', {
      method: 'POST',
      body: JSON.stringify({ gameCode: code || undefined, name, playerId: existingId || undefined }),
    });
    applyState(result);
    if (result.ok) setJoined(true);
    return result;
  }, [applyState]);

  const sendAction = useCallback(async (action: ClientMessage | Record<string, unknown>) => {
    const code = activeCodeRef.current || sessionStorage.getItem('mr_white_game_code');
    const pid = playerIdRef.current;
    if (!code || !pid) return;
    const result = await api<ApiResult>('/api/game/action', {
      method: 'POST',
      body: JSON.stringify({ gameCode: code, playerId: pid, ...action }),
    });
    applyState(result);
  }, [applyState]);

  useEffect(() => {
    activeCodeRef.current = gameCode || sessionStorage.getItem('mr_white_game_code');
    const interval = setInterval(poll, 1000);
    poll();
    return () => clearInterval(interval);
  }, [gameCode, poll]);

  const send = useCallback((msg: ClientMessage) => sendAction(msg), [sendAction]);
  const sendRaw = useCallback((msg: Record<string, unknown>) => sendAction(msg), [sendAction]);

  return { gameState, error, joined, join, send, sendRaw };
}
