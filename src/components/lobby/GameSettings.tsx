import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';
import type { GameSettings as Settings, ClientMessage } from '../../lib/types';

interface GameSettingsProps {
  settings: Settings;
  playerCount: number;
  onSend: (msg: ClientMessage) => void;
  onSendRaw: (msg: Record<string, unknown>) => void;
}

const timerOptions = [
  { label: 'Off', value: 0 },
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
  { label: '90s', value: 90 },
];

export function GameSettings({ settings, playerCount, onSend, onSendRaw }: GameSettingsProps) {
  const maxSpies = Math.max(0, playerCount - 2);
  const canStart = playerCount >= 3;

  const updateSpy = (delta: number) => {
    const next = Math.max(0, Math.min(maxSpies, settings.spyCount + delta));
    onSendRaw({ type: 'update_settings', settings: { spyCount: next } });
  };

  const updateTimer = (value: number) => {
    onSendRaw({ type: 'update_settings', settings: { describeTimerSeconds: value } });
  };

  return (
    <GlassCard className="w-full max-w-sm">
      <h3 className="text-lg font-semibold text-white/90 mb-4">Game Settings</h3>

      <div className="flex flex-col gap-5">
        <div>
          <label className="text-sm text-white/50 block mb-2">Spies</label>
          <div className="flex items-center gap-3 justify-center">
            <button
              onClick={() => updateSpy(-1)}
              disabled={settings.spyCount <= 0}
              className="w-10 h-10 rounded-lg bg-white/10 text-white font-bold hover:bg-white/15 disabled:opacity-30 transition-colors cursor-pointer"
            >
              -
            </button>
            <span className="text-2xl font-bold text-white w-10 text-center">{settings.spyCount}</span>
            <button
              onClick={() => updateSpy(1)}
              disabled={settings.spyCount >= maxSpies}
              className="w-10 h-10 rounded-lg bg-white/10 text-white font-bold hover:bg-white/15 disabled:opacity-30 transition-colors cursor-pointer"
            >
              +
            </button>
          </div>
          {maxSpies === 0 && (
            <p className="text-xs text-white/30 mt-1">Need 4+ players for spies</p>
          )}
        </div>

        <div>
          <label className="text-sm text-white/50 block mb-2">Turn Timer</label>
          <div className="flex gap-2 justify-center">
            {timerOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateTimer(opt.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  settings.describeTimerSeconds === opt.value
                    ? 'bg-violet-600 text-white'
                    : 'bg-white/10 text-white/60 hover:bg-white/15'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={() => onSend({ type: 'start_game' })}
          disabled={!canStart}
          className="mt-2"
        >
          {canStart ? 'Start Game' : `Need ${3 - playerCount} more player${3 - playerCount !== 1 ? 's' : ''}`}
        </Button>
      </div>
    </GlassCard>
  );
}
