import { useEffect, useRef, useState } from 'react';
import type { ClientGameState, ServerMessage, ClientMessage } from '../lib/types';

const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const WS_BASE = import.meta.env.VITE_WS_URL || `${wsProtocol}//${window.location.host}/ws`;

function sendMessage(ws: WebSocket | null, msg: ClientMessage | Record<string, unknown>) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

export function useWebSocket(gameCode: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const retryDelay = useRef(500);
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: string } | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let stopped = false;

    function connect() {
      if (stopped) return;
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      const code = gameCode || sessionStorage.getItem('mr_white_game_code');
      const url = code ? `${WS_BASE}?code=${code}` : WS_BASE;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setError(null);
        retryDelay.current = 500;

        const playerId = sessionStorage.getItem('mr_white_player_id');
        const playerName = sessionStorage.getItem('mr_white_player_name');
        if (playerId && playerName) {
          sendMessage(ws, { type: 'join', name: playerName, playerId });
        }
      };

      ws.onmessage = (event) => {
        const msg: ServerMessage = JSON.parse(event.data);
        switch (msg.type) {
          case 'state':
            setGameState(msg.state);
            setError(null);
            if (msg.state.gameCode) {
              sessionStorage.setItem('mr_white_game_code', msg.state.gameCode);
            }
            break;
          case 'error':
            setError(msg.message);
            setTimeout(() => setError(null), 4000);
            break;
          case 'toast':
            setToast({ message: msg.message, variant: msg.variant });
            setTimeout(() => setToast(null), 4000);
            break;
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (!stopped) {
          reconnectTimer.current = setTimeout(connect, retryDelay.current);
          retryDelay.current = Math.min(retryDelay.current * 1.5, 5000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();
    return () => {
      stopped = true;
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [gameCode]);

  const send = (msg: ClientMessage) => sendMessage(wsRef.current, msg);
  const sendRaw = (msg: Record<string, unknown>) => sendMessage(wsRef.current, msg);

  return { gameState, error, toast, connected, send, sendRaw };
}
