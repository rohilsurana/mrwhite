import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/Button';
import type { ClientGameState } from '../../lib/types';

export function WordReveal({ state, onConfirm }: { state: ClientGameState; onConfirm: () => void }) {
  const [confirmed, setConfirmed] = useState(false);
  const isMrWhite = state.myRole === 'mr_white';
  const waitingFor = state.players.filter((p) => !p.hasDescribed && p.isConnected);

  const handleConfirm = () => {
    setConfirmed(true);
    onConfirm();
  };

  if (confirmed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <div className="glass p-8 rounded-2xl max-w-sm w-full text-center">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/50 text-sm">Waiting for other players...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 px-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', duration: 0.6 }}
        className="glass p-8 rounded-2xl max-w-sm w-full text-center"
      >
        {isMrWhite ? (
          <>
            <div className="text-6xl mb-4">🕵️</div>
            <h2 className="text-2xl font-bold text-red-400 mb-2">You are Mr. White!</h2>
            <p className="text-white/50">You have no word. Blend in and survive.</p>
          </>
        ) : (
          <>
            <div className="text-sm text-white/50 mb-2">Your word is</div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl font-bold text-white glow-text mb-4"
            >
              {state.myWord}
            </motion.div>
            <p className="text-white/30 text-sm">Remember your word</p>
          </>
        )}

        <Button onClick={handleConfirm} className="mt-6 w-full">
          Got it
        </Button>
      </motion.div>

      {waitingFor.length > 0 && (
        <div className="text-sm text-white/30">
          Waiting for {waitingFor.length} player{waitingFor.length !== 1 ? 's' : ''} to confirm...
        </div>
      )}
    </div>
  );
}
