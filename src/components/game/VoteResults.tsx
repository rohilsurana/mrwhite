import { motion } from 'framer-motion';
import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';
import { PlayerAvatar } from '../ui/PlayerAvatar';
import type { ClientGameState } from '../../lib/types';

const roleLabels: Record<string, { text: string; color: string }> = {
  normal: { text: 'Civilian', color: 'text-emerald-400' },
  mr_white: { text: 'Mr. White', color: 'text-red-400' },
  spy: { text: 'Spy', color: 'text-amber-400' },
};

export function VoteResults({ state, onContinue }: { state: ClientGameState; onContinue: () => void }) {
  const result = state.voteResult;
  if (!result) return null;

  const eliminated = state.players.find((p) => p.id === result.eliminatedPlayerId);
  const sortedPlayers = [...state.players]
    .filter((p) => p.isAlive || p.id === result.eliminatedPlayerId)
    .sort((a, b) => (result.voteCounts[b.id] || 0) - (result.voteCounts[a.id] || 0));

  return (
    <div className="flex flex-col gap-5 px-4 max-w-lg mx-auto w-full">
      <div className="text-center">
        <h2 className="text-base font-semibold text-zinc-200">Vote Results</h2>
      </div>

      <GlassCard>
        <div className="flex flex-col gap-2.5">
          {sortedPlayers.map((p) => {
            const count = result.voteCounts[p.id] || 0;
            const isEliminated = p.id === result.eliminatedPlayerId;
            const maxVotes = Math.max(...Object.values(result.voteCounts));
            return (
              <div key={p.id} className={`flex items-center gap-3 p-2.5 rounded-lg ${isEliminated ? 'bg-red-500/5 border border-red-500/15' : ''}`}>
                <PlayerAvatar name={p.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-200">{p.name}</span>
                    {isEliminated && p.revealedRole && (
                      <span className={`text-xs ${roleLabels[p.revealedRole]?.color}`}>{roleLabels[p.revealedRole]?.text}</span>
                    )}
                  </div>
                  <div className="mt-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: maxVotes > 0 ? `${(count / maxVotes) * 100}%` : '0%' }}
                      transition={{ duration: 0.6, delay: 0.1 }}
                      className={`h-full rounded-full ${isEliminated ? 'bg-red-500' : 'bg-zinc-600'}`}
                    />
                  </div>
                </div>
                <span className="text-sm font-semibold text-zinc-400 w-6 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </GlassCard>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center">
        {result.isTie ? (
          <p className="text-sm text-amber-400">Tie — no one eliminated.</p>
        ) : eliminated ? (
          <p className="text-sm text-zinc-300">
            <span className="text-red-400 font-medium">{eliminated.name}</span> eliminated.
            {eliminated.revealedRole && <span className={`ml-1 ${roleLabels[eliminated.revealedRole]?.color}`}>{roleLabels[eliminated.revealedRole]?.text}.</span>}
          </p>
        ) : null}
      </div>

      {state.isHost ? (
        <Button onClick={onContinue} className="w-full">Continue</Button>
      ) : (
        <p className="text-center text-xs text-zinc-600">Waiting for host...</p>
      )}
    </div>
  );
}
