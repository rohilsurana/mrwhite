import { motion } from 'framer-motion';
import { Button } from '../ui/Button';
import { PlayerAvatar } from '../ui/PlayerAvatar';

interface PassDeviceProps {
  playerName: string;
  phase: 'word_reveal' | 'describing' | 'voting' | 'guess';
  onReady: () => void;
}

export function PassDevice({ playerName, phase, onReady }: PassDeviceProps) {
  const labels: Record<string, string> = {
    word_reveal: 'to see your word',
    describing: 'to type your clue',
    voting: 'to cast your vote',
    guess: 'to guess the word',
  };
  const label = labels[phase];

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 px-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass p-8 rounded-2xl max-w-sm w-full text-center"
      >
        <div className="text-sm text-white/40 mb-4">Pass the device to</div>
        <div className="flex justify-center mb-4">
          <PlayerAvatar name={playerName} size="lg" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{playerName}</h2>
        <p className="text-white/40 mb-6">{label}</p>
        <Button onClick={onReady} className="w-full">
          I'm {playerName}
        </Button>
      </motion.div>
    </div>
  );
}
