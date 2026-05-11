import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { PlayerAvatar } from '../ui/PlayerAvatar';
import type { GameSettings } from '../../lib/types';

export type ClueMode = 'verbal' | 'typed';

interface LocalLobbyProps {
  players: { id: string; name: string }[];
  settings: GameSettings;
  clueMode: ClueMode;
  onClueModeChange: (mode: ClueMode) => void;
  onAddPlayer: (name: string) => void;
  onRemovePlayer: (id: string) => void;
  onUpdateSettings: (settings: Partial<GameSettings>) => void;
  onStartGame: () => void;
}

const timerOptions = [
  { label: 'Off', value: 0 },
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
  { label: '90s', value: 90 },
];

export function LocalLobby({ players, settings, clueMode, onClueModeChange, onAddPlayer, onRemovePlayer, onUpdateSettings, onStartGame }: LocalLobbyProps) {
  const [name, setName] = useState('');
  const maxSpies = Math.max(0, players.length - 2);
  const canStart = players.length >= 3;

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddPlayer(name.trim());
    setName('');
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full px-4">
      <GlassCard className="w-full max-w-sm">
        <form onSubmit={handleAdd} className="flex gap-3 mb-4">
          <Input
            placeholder="Player name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            autoFocus
          />
          <Button type="submit" disabled={!name.trim()}>Add</Button>
        </form>

        <div className="text-sm text-white/50 mb-2">{players.length} player{players.length !== 1 ? 's' : ''}</div>
        <AnimatePresence mode="popLayout">
          {players.map((p) => (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/5 mb-2"
            >
              <PlayerAvatar name={p.name} />
              <span className="text-white font-medium flex-1 truncate">{p.name}</span>
              <button
                onClick={() => onRemovePlayer(p.id)}
                className="text-white/20 hover:text-red-400 transition-colors cursor-pointer text-sm"
              >
                &times;
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </GlassCard>

      <GlassCard className="w-full max-w-sm">
        <h3 className="text-lg font-semibold text-white/90 mb-4">Game Settings</h3>
        <div className="flex flex-col gap-5">
          <div>
            <label className="text-sm text-white/50 block mb-2">Spies</label>
            <div className="flex items-center gap-3 justify-center">
              <button
                onClick={() => onUpdateSettings({ spyCount: settings.spyCount - 1 })}
                disabled={settings.spyCount <= 0}
                className="w-10 h-10 rounded-lg bg-white/10 text-white font-bold hover:bg-white/15 disabled:opacity-30 transition-colors cursor-pointer"
              >-</button>
              <span className="text-2xl font-bold text-white w-10 text-center">{settings.spyCount}</span>
              <button
                onClick={() => onUpdateSettings({ spyCount: settings.spyCount + 1 })}
                disabled={settings.spyCount >= maxSpies}
                className="w-10 h-10 rounded-lg bg-white/10 text-white font-bold hover:bg-white/15 disabled:opacity-30 transition-colors cursor-pointer"
              >+</button>
            </div>
            {maxSpies === 0 && <p className="text-xs text-white/30 mt-1">Need 4+ players for spies</p>}
          </div>

          <div>
            <label className="text-sm text-white/50 block mb-2">Turn Timer</label>
            <div className="flex gap-2 justify-center">
              {timerOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onUpdateSettings({ describeTimerSeconds: opt.value })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                    settings.describeTimerSeconds === opt.value
                      ? 'bg-violet-600 text-white'
                      : 'bg-white/10 text-white/60 hover:bg-white/15'
                  }`}
                >{opt.label}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-white/50 block mb-2">Clues</label>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => onClueModeChange('verbal')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  clueMode === 'verbal' ? 'bg-violet-600 text-white' : 'bg-white/10 text-white/60 hover:bg-white/15'
                }`}
              >Verbal</button>
              <button
                onClick={() => onClueModeChange('typed')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  clueMode === 'typed' ? 'bg-violet-600 text-white' : 'bg-white/10 text-white/60 hover:bg-white/15'
                }`}
              >Typed</button>
            </div>
            <p className="text-xs text-white/30 mt-1 text-center">
              {clueMode === 'verbal' ? 'Describe out loud, press Done' : 'Type your clue on the device'}
            </p>
          </div>

          <Button onClick={onStartGame} disabled={!canStart} className="mt-2">
            {canStart ? 'Start Game' : `Need ${3 - players.length} more player${3 - players.length !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}
