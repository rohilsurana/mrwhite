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

  return (
    <div className="flex flex-col gap-5 px-4 max-w-lg mx-auto w-full">
      <div className="text-center">
        <h2 className="text-base font-semibold text-zinc-200 mb-1">Who is Mr. White?</h2>
        <p className="text-xs text-zinc-500">{votedCount}/{totalAlive} votes</p>
      </div>

      {!hasVoted ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            {votablePlayers.map((p) => (
              <motion.button
                key={p.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelected(p.id)}
                className={`flex items-center gap-2.5 p-3 rounded-lg border transition-all cursor-pointer ${
                  selected === p.id ? 'bg-zinc-800 border-zinc-600 ring-1 ring-zinc-500' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <PlayerAvatar name={p.name} size="sm" />
                <span className="text-sm text-zinc-300 truncate">{p.name}</span>
              </motion.button>
            ))}
          </div>
          <Button onClick={() => { if (selected) onSend({ type: 'vote', targetId: selected }); }} disabled={!selected} className="w-full">
            Submit Vote
          </Button>
        </>
      ) : (
        <GlassCard className="text-center">
          <p className="text-sm text-zinc-500">Vote submitted. Waiting for others...</p>
        </GlassCard>
      )}

      <ClueHistoryCompact descriptions={state.descriptions} />
    </div>
  );
}

function ClueHistoryCompact({ descriptions }: { descriptions: ClientGameState['descriptions'] }) {
  if (descriptions.length === 0) return null;
  const reversed = [...descriptions].reverse();

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs text-zinc-500 uppercase tracking-wider">Clue history</h3>
      {reversed.map((round) => (
        <div key={round.round} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
          <div className="text-[10px] text-zinc-600 mb-1.5">Round {round.round}</div>
          {round.entries.map((entry, i) => (
            <div key={i} className="flex items-center gap-2 py-0.5">
              <span className="text-xs text-zinc-500 min-w-[45px]">{entry.playerName}</span>
              <span className="text-sm text-zinc-400">"{entry.text}"</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
