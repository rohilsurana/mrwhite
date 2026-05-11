import { useState } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';
import { PlayerAvatar } from '../ui/PlayerAvatar';
import type { ClientGameState, ClientMessage } from '../../lib/types';

export function VotingPhase({ state, onSend }: { state: ClientGameState; onSend: (msg: ClientMessage) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const hasVoted = state.players.find((p) => p.id === state.myId)?.hasVoted;

  const votablePlayers = state.players.filter((p) => p.isAlive && p.id !== state.myId);
  const totalAlive = state.players.filter((p) => p.isAlive).length;
  const votedCount = state.players.filter((p) => p.hasVoted).length;

  const handleVote = () => {
    if (!selected || hasVoted) return;
    onSend({ type: 'vote', targetId: selected });
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
          <Button onClick={handleVote} disabled={!selected} className="w-full">
            Submit Vote
          </Button>
        </>
      ) : (
        <GlassCard className="text-center">
          <p className="text-white/60">Vote submitted. Waiting for others...</p>
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
