import { useState } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';
import { PlayerAvatar } from '../ui/PlayerAvatar';
import type { ClientGameState, ClientMessage } from '../../lib/types';

export function VotingPhase({ state, onSend }: { state: ClientGameState; onSend: (msg: ClientMessage) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [accusedRole, setAccusedRole] = useState<'mr_white' | 'spy' | null>(null);
  const hasVoted = state.players.find((p) => p.id === state.myId)?.hasVoted;

  const votablePlayers = state.players.filter((p) => p.isAlive && p.id !== state.myId);
  const totalAlive = state.players.filter((p) => p.isAlive).length;
  const votedCount = state.players.filter((p) => p.hasVoted).length;
  const strict = state.settings.strictMode;
  const canSubmit = selected && (!strict || accusedRole);

  const handleVote = () => {
    if (!selected || hasVoted) return;
    if (strict && !accusedRole) return;
    onSend({ type: 'vote', targetId: selected, accusedRole: accusedRole ?? undefined });
  };

  return (
    <div className="flex flex-col gap-6 px-4 max-w-lg mx-auto w-full">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Who is Mr. White?</h2>
        <p className="text-white/40 text-sm">{votedCount}/{totalAlive} votes submitted</p>
      </div>

      {!hasVoted ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            {votablePlayers.map((p) => (
              <motion.button
                key={p.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelected(p.id)}
                className={`flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
                  selected === p.id
                    ? 'bg-violet-500/20 border-violet-500/50 ring-1 ring-violet-500/30'
                    : 'bg-white/5 border-white/5 hover:bg-white/10'
                }`}
              >
                <PlayerAvatar name={p.name} size="sm" />
                <span className="text-white font-medium text-sm truncate">{p.name}</span>
              </motion.button>
            ))}
          </div>

          {strict && selected && (
            <div>
              <p className="text-sm text-white/50 mb-2 text-center">They are a...</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setAccusedRole('mr_white')}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer border ${
                    accusedRole === 'mr_white'
                      ? 'bg-red-500/20 border-red-500/50 text-red-300 ring-1 ring-red-500/30'
                      : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                  }`}
                >Mr. White</button>
                <button
                  onClick={() => setAccusedRole('spy')}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer border ${
                    accusedRole === 'spy'
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 ring-1 ring-amber-500/30'
                      : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                  }`}
                >Spy</button>
              </div>
            </div>
          )}

          <Button onClick={handleVote} disabled={!canSubmit} className="w-full">
            Submit Vote
          </Button>
        </>
      ) : (
        <GlassCard className="text-center">
          <p className="text-white/60 mb-3">Vote submitted. Waiting for others...</p>
          <div className="flex gap-2 flex-wrap justify-center">
            {state.players.filter((p) => p.isAlive).map((p) => (
              <div key={p.id} className="flex items-center gap-1.5 text-xs">
                <span className={p.hasVoted ? 'text-emerald-400' : 'text-white/20'}>{p.hasVoted ? '✓' : '○'}</span>
                <span className={p.hasVoted ? 'text-white/30' : 'text-white/50'}>{p.name}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      <DescriptionHistoryCompact descriptions={state.descriptions} />
    </div>
  );
}

function DescriptionHistoryCompact({ descriptions }: { descriptions: ClientGameState['descriptions'] }) {
  if (descriptions.length === 0) return null;

  const reversed = [...descriptions].reverse();

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-white/40 uppercase tracking-wider">Clue History</h3>
      {reversed.map((round) => (
        <div key={round.round} className="glass p-3 rounded-xl">
          <div className="text-xs text-white/30 mb-2">Round {round.round}</div>
          {round.entries.map((entry, i) => (
            <div key={i} className="flex items-center gap-2 py-1">
              <span className="text-xs text-white/40 min-w-[50px]">{entry.playerName}</span>
              <span className="text-sm text-white/70">"{entry.text}"</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
