import { motion } from 'framer-motion';
import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';
import { PlayerAvatar } from '../ui/PlayerAvatar';
import type { ClientGameState, ClientMessage } from '../../lib/types';

const roleConfig: Record<string, { label: string; color: string }> = {
  normal: { label: 'Civilian', color: 'text-emerald-400' },
  mr_white: { label: 'Mr. White', color: 'text-red-400' },
  spy: { label: 'Spy', color: 'text-amber-400' },
};

export function GameOver({ state, onSend }: { state: ClientGameState; onSend: (msg: ClientMessage) => void }) {
  const mrWhiteWon = state.winner === 'mr_white';

  return (
    <div className="flex flex-col gap-6 px-4 max-w-lg mx-auto w-full py-8">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', duration: 0.6 }}
        className="text-center"
      >
        <div className="text-6xl mb-4">{mrWhiteWon ? '🕵️' : '🎉'}</div>
        <h1 className={`text-3xl font-bold ${mrWhiteWon ? 'text-red-400' : 'text-emerald-400'}`}>
          {mrWhiteWon ? 'Mr. White Wins!' : 'Players Win!'}
        </h1>
      </motion.div>

      <GlassCard>
        <h3 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-4">Roles Revealed</h3>
        <div className="flex flex-col gap-3">
          {state.players.map((p) => {
            const role = p.revealedRole ? roleConfig[p.revealedRole] : null;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5"
              >
                <PlayerAvatar name={p.name} size="sm" />
                <span className="text-white font-medium flex-1">{p.name}</span>
                {role && (
                  <span className={`text-sm font-medium ${role.color}`}>{role.label}</span>
                )}
              </motion.div>
            );
          })}
        </div>
      </GlassCard>

      {state.descriptions.length > 0 && (
        <GlassCard>
          <h3 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-4">Game History</h3>
          {state.descriptions.map((round) => (
            <div key={round.round} className="mb-4 last:mb-0">
              <div className="text-xs text-white/30 mb-2">Round {round.round}</div>
              {round.entries.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 py-1">
                  <span className="text-xs text-white/40 min-w-[60px]">{entry.playerName}</span>
                  <span className="text-sm text-white/70">"{entry.text}"</span>
                </div>
              ))}
            </div>
          ))}
        </GlassCard>
      )}

      {state.isHost && (
        <Button onClick={() => onSend({ type: 'play_again' })} className="w-full">
          Play Again
        </Button>
      )}
      {!state.isHost && (
        <p className="text-center text-white/30 text-sm">Waiting for host to start a new game...</p>
      )}
    </div>
  );
}
