import { motion } from 'framer-motion';
import { Button } from '../ui/Button';
import type { ClientGameState } from '../../lib/types';

export function WordReveal({ state, onConfirm }: { state: ClientGameState; onConfirm: () => void }) {
  const isMrWhite = state.myRole === 'mr_white';

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 max-w-xs w-full text-center"
      >
        {isMrWhite ? (
          <>
            <div className="text-4xl mb-3">?</div>
            <h2 className="text-lg font-semibold text-red-400 mb-1">You are Mr. White</h2>
            <p className="text-sm text-zinc-500">You have no word. Blend in.</p>
          </>
        ) : (
          <>
            <div className="text-xs text-zinc-500 mb-1.5">Your word is</div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-bold text-zinc-100 mb-2"
            >
              {state.myWord}
            </motion.div>
            <p className="text-xs text-zinc-500">Remember your word</p>
          </>
        )}

        <Button onClick={onConfirm} className="mt-5 w-full">Got it</Button>
      </motion.div>
    </div>
  );
}
