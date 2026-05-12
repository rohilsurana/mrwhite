import { motion } from 'framer-motion';
import { Button } from '../ui/Button';
import { PlayerAvatar } from '../ui/PlayerAvatar';

interface PassDeviceProps {
  playerName: string;
  phase: 'word_reveal' | 'voting';
  onReady: () => void;
}

export function PassDevice({ playerName, phase, onReady }: PassDeviceProps) {
  const label = phase === 'word_reveal' ? 'to see your word' : 'to cast your vote';

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 max-w-xs w-full text-center"
      >
        <div className="text-xs text-zinc-500 mb-4">Pass the device to</div>
        <div className="flex justify-center mb-3">
          <PlayerAvatar name={playerName} size="lg" />
        </div>
        <h2 className="text-lg font-semibold text-zinc-200 mb-1">{playerName}</h2>
        <p className="text-xs text-zinc-500 mb-5">{label}</p>
        <Button onClick={onReady} className="w-full">I'm {playerName}</Button>
      </motion.div>
    </div>
  );
}
