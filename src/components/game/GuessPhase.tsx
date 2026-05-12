import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { ClientGameState, ClientMessage } from '../../lib/types';

export function GuessPhase({ state, onSend }: { state: ClientGameState; onSend: (msg: ClientMessage) => void }) {
  const [guess, setGuess] = useState('');
  const isMrWhite = state.myRole === 'mr_white';

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!guess.trim()) return;
    onSend({ type: 'guess_word', word: guess.trim() });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 px-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
        <h2 className="text-lg font-semibold text-red-400 mb-1">Mr. White was caught</h2>
        <p className="text-sm text-zinc-500">One chance to guess the word...</p>
      </motion.div>

      {isMrWhite ? (
        <GlassCard className="w-full max-w-xs">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <p className="text-sm text-zinc-400 text-center">Guess the word to win</p>
            <Input value={guess} onChange={(e) => setGuess(e.target.value)} placeholder="Your guess..." autoFocus />
            <Button type="submit" disabled={!guess.trim()}>Submit Guess</Button>
          </form>
        </GlassCard>
      ) : (
        <GlassCard className="w-full max-w-xs text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-zinc-500">Mr. White is guessing...</p>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
