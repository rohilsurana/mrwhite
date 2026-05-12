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
    <div className="flex flex-col gap-1.5">
      <div className="text-xs text-zinc-500 mb-1">{players.length} player{players.length !== 1 ? 's' : ''}</div>
      <AnimatePresence mode="popLayout">
        {players.map((p) => (
          <motion.div
            key={p.id}
            layout
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-zinc-800/50 border border-zinc-800"
          >
            <PlayerAvatar name={p.name} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-zinc-200 truncate">
                {p.name}
                {p.id === myId && <span className="text-zinc-500 ml-1.5 text-xs">(you)</span>}
              </div>
              {p.isHost && <div className="text-[10px] text-zinc-500 uppercase tracking-wider">host</div>}
            </div>
            {!p.isConnected && <span className="text-[10px] text-red-400/70">offline</span>}
            {isHost && p.id !== myId && (
              <button
                onClick={() => onSend({ type: 'kick_player', targetId: p.id })}
                className="text-zinc-600 hover:text-red-400 transition-colors cursor-pointer text-sm"
              >&times;</button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
