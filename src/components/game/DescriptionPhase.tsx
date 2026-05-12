import { useState, type FormEvent, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { PlayerAvatar } from '../ui/PlayerAvatar';
import type { ClientGameState, ClientMessage } from '../../lib/types';

export function DescriptionPhase({ state, onSend }: { state: ClientGameState; onSend: (msg: ClientMessage) => void }) {
  const [clue, setClue] = useState('');
  const isMyTurn = state.currentTurnPlayerId === state.myId;
  const currentPlayer = state.players.find((p) => p.id === state.currentTurnPlayerId);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isMyTurn) inputRef.current?.focus();
  }, [isMyTurn]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!clue.trim() || !isMyTurn) return;
    onSend({ type: 'submit_description', text: clue.trim() });
    setClue('');
  };

  const alivePlayers = state.players.filter((p) => p.isAlive);

  return (
    <div className="flex flex-col gap-5 px-4 max-w-lg mx-auto w-full">
      <div className="text-center">
        <div className="text-xs text-zinc-500 mb-1">Round {state.round}</div>
        <h2 className="text-base font-semibold text-zinc-200">
          {isMyTurn ? 'Your turn — describe your word' : `Waiting for ${currentPlayer?.name}`}
        </h2>
      </div>

      <div className="flex gap-1.5 justify-center flex-wrap">
        {alivePlayers.map((p) => {
          const isCurrent = p.id === state.currentTurnPlayerId;
          const hasDone = p.hasDescribed;
          return (
            <div key={p.id} className={`flex flex-col items-center gap-1 px-2 py-1 rounded-lg transition-all ${isCurrent ? 'bg-zinc-800 ring-1 ring-zinc-600' : ''}`}>
              <PlayerAvatar name={p.name} size="sm" alive={!hasDone || isCurrent} />
              <span className={`text-[10px] ${isCurrent ? 'text-zinc-300' : hasDone ? 'text-zinc-600' : 'text-zinc-500'}`}>{p.name.slice(0, 6)}</span>
            </div>
          );
        })}
      </div>

      {isMyTurn && (
        <GlassCard className="!p-3">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input ref={inputRef} value={clue} onChange={(e) => setClue(e.target.value)} placeholder="Type your clue..." maxLength={100} />
            <Button type="submit" disabled={!clue.trim()}>Send</Button>
          </form>
        </GlassCard>
      )}

      <DescriptionHistory descriptions={state.descriptions} currentRound={state.round} />
    </div>
  );
}

function DescriptionHistory({ descriptions, currentRound }: { descriptions: ClientGameState['descriptions']; currentRound: number }) {
  if (descriptions.length === 0) return null;
  const reversed = [...descriptions].reverse();

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs text-zinc-500 uppercase tracking-wider">Clue history</h3>
      {reversed.map((round) => (
        <div key={round.round} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
          <div className="text-[10px] text-zinc-600 mb-2">Round {round.round} {round.round === currentRound && '(current)'}</div>
          <div className="flex flex-col gap-1.5">
            <AnimatePresence mode="popLayout">
              {round.entries.map((entry, i) => (
                <motion.div key={`${round.round}-${i}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2">
                  <PlayerAvatar name={entry.playerName} size="sm" />
                  <span className="text-xs text-zinc-500 min-w-[50px]">{entry.playerName}</span>
                  <span className="text-sm text-zinc-300">"{entry.text}"</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      ))}
    </div>
  );
}
