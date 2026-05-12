import { ToggleGroup } from '@base-ui/react/toggle-group';
import { Toggle } from '@base-ui/react/toggle';
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

const toggleCls = 'px-3 py-1.5 rounded-md text-sm transition-colors cursor-pointer text-zinc-400 data-[pressed]:bg-zinc-100 data-[pressed]:text-zinc-900';

export function GameSettings({ settings, playerCount, onSend, onSendRaw }: GameSettingsProps) {
  const maxSpies = Math.max(0, playerCount - 2);
  const canStart = playerCount >= 3;

  const updateSpy = (delta: number) => {
    const next = Math.max(0, Math.min(maxSpies, settings.spyCount + delta));
    onSendRaw({ type: 'update_settings', settings: { spyCount: next } });
  };

  return (
    <GlassCard className="w-full max-w-sm">
      <h3 className="text-sm font-semibold text-zinc-300 mb-4">Settings</h3>
      <div className="flex flex-col gap-5">
        <div>
          <label className="text-xs text-zinc-500 block mb-2">Spies</label>
          <div className="flex items-center gap-3 justify-center">
            <button onClick={() => updateSpy(-1)} disabled={settings.spyCount <= 0}
              className="w-8 h-8 rounded-md bg-zinc-800 text-zinc-300 text-sm font-medium hover:bg-zinc-700 disabled:opacity-25 transition-colors cursor-pointer">-</button>
            <span className="text-xl font-semibold text-zinc-100 w-8 text-center">{settings.spyCount}</span>
            <button onClick={() => updateSpy(1)} disabled={settings.spyCount >= maxSpies}
              className="w-8 h-8 rounded-md bg-zinc-800 text-zinc-300 text-sm font-medium hover:bg-zinc-700 disabled:opacity-25 transition-colors cursor-pointer">+</button>
          </div>
          {maxSpies === 0 && <p className="text-xs text-zinc-600 mt-1 text-center">Need 4+ players for spies</p>}
        </div>

        <div>
          <label className="text-xs text-zinc-500 block mb-2">Turn timer</label>
          <ToggleGroup
            value={[String(settings.describeTimerSeconds)]}
            onValueChange={(val) => {
              if (val.length > 0) onSendRaw({ type: 'update_settings', settings: { describeTimerSeconds: Number(val[0]) } });
            }}
            className="flex gap-1 justify-center"
          >
            {timerOptions.map((opt) => (
              <Toggle key={opt.value} value={String(opt.value)} className={toggleCls}>
                {opt.label}
              </Toggle>
            ))}
          </ToggleGroup>
        </div>

        <Button onClick={() => onSend({ type: 'start_game' })} disabled={!canStart} className="w-full mt-1">
          {canStart ? 'Start Game' : `Need ${3 - playerCount} more`}
        </Button>
      </div>
    </GlassCard>
  );
}
