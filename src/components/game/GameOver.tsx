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
    <div className="flex flex-col gap-5 px-4 max-w-lg mx-auto w-full py-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
        <h1 className={`text-2xl font-bold ${mrWhiteWon ? 'text-red-400' : 'text-emerald-400'}`}>
          {mrWhiteWon ? 'Mr. White Wins' : 'Players Win'}
        </h1>
      </motion.div>

      <GlassCard>
        <h3 className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Roles</h3>
        <div className="flex flex-col gap-2">
          {state.players.map((p) => {
            const role = p.revealedRole ? roleConfig[p.revealedRole] : null;
            return (
              <motion.div key={p.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-800/50">
                <PlayerAvatar name={p.name} size="sm" />
                <span className="text-sm text-zinc-200 flex-1">{p.name}</span>
                {role && <span className={`text-xs ${role.color}`}>{role.label}</span>}
              </motion.div>
            );
          })}
        </div>
      </GlassCard>

      {state.descriptions.length > 0 && (
        <GlassCard>
          <h3 className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Game history</h3>
          {state.descriptions.map((round) => (
            <div key={round.round} className="mb-3 last:mb-0">
              <div className="text-[10px] text-zinc-600 mb-1">Round {round.round}</div>
              {round.entries.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 py-0.5">
                  <span className="text-xs text-zinc-500 min-w-[50px]">{entry.playerName}</span>
                  <span className="text-sm text-zinc-400">"{entry.text}"</span>
                </div>
              ))}
            </div>
          ))}
        </GlassCard>
      )}

      {state.isHost ? (
        <Button onClick={() => onSend({ type: 'play_again' })} className="w-full">Play Again</Button>
      ) : (
        <p className="text-center text-xs text-zinc-600">Waiting for host...</p>
      )}
    </div>
  );
}
