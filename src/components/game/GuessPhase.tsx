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
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center"
      >
        <div className="text-5xl mb-4">🚨</div>
        <h2 className="text-2xl font-bold text-red-400">Mr. White has been caught!</h2>
        <p className="text-white/50 mt-2">But they get one chance to guess the word...</p>
      </motion.div>

      {isMrWhite ? (
        <GlassCard className="w-full max-w-sm">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <p className="text-white/70 text-center">Guess the word to win!</p>
            <Input
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="Type your guess..."
              autoFocus
            />
            <Button type="submit" disabled={!guess.trim()}>
              Submit Guess
            </Button>
          </form>
        </GlassCard>
      ) : (
        <GlassCard className="w-full max-w-sm text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-white/50">Mr. White is guessing the word...</p>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
