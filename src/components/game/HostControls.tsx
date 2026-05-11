import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PlayerAvatar } from '../ui/PlayerAvatar';
import type { ClientPlayer } from '../../lib/types';

interface HostControlsProps {
  players: ClientPlayer[];
  onReset: () => void;
  onKick: (playerId: string) => void;
  myId: string;
}

export function HostControls({ players, onReset, onKick, myId }: HostControlsProps) {
  const [open, setOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const alivePlayers = players.filter((p) => p.isAlive && p.id !== myId);

  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={() => { setOpen(!open); setConfirmReset(false); }}
        className="w-10 h-10 rounded-full bg-white/10 border border-white/10 text-white/60 hover:text-white hover:bg-white/15 transition-all flex items-center justify-center cursor-pointer"
        title="Host menu"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -8 }}
            className="absolute top-12 right-0 w-64 glass p-3 rounded-xl"
          >
            <div className="text-xs text-white/40 uppercase tracking-wider mb-2 px-2">Host Controls</div>

            {!confirmReset ? (
              <button
                onClick={() => setConfirmReset(true)}
                className="w-full text-left px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors text-sm cursor-pointer"
              >
                Reset Game
              </button>
            ) : (
              <div className="px-3 py-2">
                <p className="text-xs text-red-400 mb-2">Are you sure? This ends the current game.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { onReset(); setOpen(false); setConfirmReset(false); }}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-red-600/80 text-white text-sm hover:bg-red-500/80 transition-colors cursor-pointer"
                  >
                    Yes, reset
                  </button>
                  <button
                    onClick={() => setConfirmReset(false)}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm hover:bg-white/15 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {alivePlayers.length > 0 && (
              <>
                <div className="border-t border-white/5 my-2" />
                <div className="text-xs text-white/40 uppercase tracking-wider mb-1 px-2">Remove Player</div>
                {alivePlayers.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { onKick(p.id); setOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white/70 hover:bg-white/10 transition-colors text-sm cursor-pointer"
                  >
                    <PlayerAvatar name={p.name} size="sm" />
                    <span className="truncate">{p.name}</span>
                  </button>
                ))}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
