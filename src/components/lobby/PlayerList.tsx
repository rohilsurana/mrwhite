import { motion, AnimatePresence } from 'framer-motion';
import { PlayerAvatar } from '../ui/PlayerAvatar';
import type { ClientPlayer, ClientMessage } from '../../lib/types';

interface PlayerListProps {
  players: ClientPlayer[];
  myId: string;
  isHost: boolean;
  onSend: (msg: ClientMessage) => void;
}

export function PlayerList({ players, myId, isHost, onSend }: PlayerListProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm text-white/50 mb-1">{players.length} player{players.length !== 1 ? 's' : ''} joined</div>
      <AnimatePresence mode="popLayout">
        {players.map((p) => (
          <motion.div
            key={p.id}
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/5"
          >
            <PlayerAvatar name={p.name} />
            <div className="flex-1 min-w-0">
              <div className="text-white font-medium truncate">
                {p.name}
                {p.id === myId && <span className="text-violet-400 ml-2 text-sm">(You)</span>}
              </div>
              {p.isHost && <div className="text-xs text-amber-400">Host</div>}
            </div>
            {!p.isConnected && (
              <span className="text-xs text-red-400">Disconnected</span>
            )}
            {isHost && p.id !== myId && (
              <button
                onClick={() => onSend({ type: 'kick_player', targetId: p.id })}
                className="text-white/20 hover:text-red-400 transition-colors cursor-pointer text-sm"
                title="Kick player"
              >
                &times;
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
