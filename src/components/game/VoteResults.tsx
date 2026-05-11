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
    <div className="flex flex-col gap-6 px-4 max-w-lg mx-auto w-full">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Vote Results</h2>
      </div>

      <GlassCard>
        <div className="flex flex-col gap-3">
          {sortedPlayers.map((p) => {
            const count = result.voteCounts[p.id] || 0;
            const isEliminated = p.id === result.eliminatedPlayerId;
            const maxVotes = Math.max(...Object.values(result.voteCounts));

            return (
              <div
                key={p.id}
                className={`flex items-center gap-3 p-3 rounded-xl ${isEliminated ? 'bg-red-500/10 border border-red-500/20' : ''}`}
              >
                <PlayerAvatar name={p.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium text-sm">{p.name}</span>
                    {isEliminated && p.revealedRole && (
                      <span className={`text-xs font-medium ${roleLabels[p.revealedRole]?.color}`}>
                        {roleLabels[p.revealedRole]?.text}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: maxVotes > 0 ? `${(count / maxVotes) * 100}%` : '0%' }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                      className={`h-full rounded-full ${isEliminated ? 'bg-red-500' : 'bg-violet-500/60'}`}
                    />
                  </div>
                </div>
                <span className="text-lg font-bold text-white/70 w-8 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </GlassCard>

      <GlassCard className="text-center">
        {result.isTie ? (
          <p className="text-amber-400 font-medium">It's a tie! No one is eliminated.</p>
        ) : eliminated ? (
          <p className="text-white/80">
            <span className="font-bold text-red-400">{eliminated.name}</span> has been eliminated!
            {eliminated.revealedRole && (
              <span className={`ml-2 ${roleLabels[eliminated.revealedRole]?.color}`}>
                They were a {roleLabels[eliminated.revealedRole]?.text}.
              </span>
            )}
          </p>
        ) : null}
      </GlassCard>

      {state.isHost && (
        <Button onClick={onContinue} className="w-full">
          Continue
        </Button>
      )}
      {!state.isHost && (
        <p className="text-center text-white/30 text-sm">Waiting for host to continue...</p>
      )}
    </div>
  );
}
