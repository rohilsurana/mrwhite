import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ToggleGroup } from '@base-ui/react/toggle-group';
import { Toggle } from '@base-ui/react/toggle';
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

const STORAGE_KEY = 'mr_white_saved_names';

function getSavedNames(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveName(name: string): void {
  const names = getSavedNames();
  if (!names.some((n) => n.toLowerCase() === name.toLowerCase())) {
    names.push(name);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
  }
}

function removeSavedName(name: string): void {
  const names = getSavedNames().filter((n) => n.toLowerCase() !== name.toLowerCase());
  localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
}

const timerOptions = [
  { label: 'Off', value: 0 },
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
  { label: '90s', value: 90 },
];

const toggleCls = 'px-3 py-1.5 rounded-md text-sm transition-colors cursor-pointer text-zinc-400 data-[pressed]:bg-zinc-100 data-[pressed]:text-zinc-900';

export function LocalLobby({ players, settings, clueMode, onClueModeChange, onAddPlayer, onRemovePlayer, onUpdateSettings, onStartGame }: LocalLobbyProps) {
  const [name, setName] = useState('');
  const [savedNames, setSavedNames] = useState<string[]>(getSavedNames);
  const maxSpies = Math.max(0, players.length - 2);
  const canStart = players.length >= 3;

  const currentNames = new Set(players.map((p) => p.name.toLowerCase()));
  const availableSaved = savedNames.filter((n) => !currentNames.has(n.toLowerCase()));

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    saveName(name.trim());
    setSavedNames(getSavedNames());
    onAddPlayer(name.trim());
    setName('');
  };

  const handleDeleteSaved = (savedName: string) => {
    removeSavedName(savedName);
    setSavedNames(getSavedNames());
  };

  return (
    <div className="flex flex-col items-center gap-5 w-full px-4">
      <GlassCard className="w-full max-w-sm">
        <form onSubmit={handleAdd} className="flex gap-2 mb-4">
          <Input placeholder="Player name..." value={name} onChange={(e) => setName(e.target.value)} maxLength={20} autoFocus />
          <Button type="submit" disabled={!name.trim()}>Add</Button>
        </form>

        {availableSaved.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-zinc-500 mb-2">Quick add</div>
            <div className="flex flex-wrap gap-1.5">
              {availableSaved.map((n) => (
                <div key={n} className="group flex items-center gap-0.5 pl-2.5 pr-1 py-1 rounded-full bg-zinc-800 border border-zinc-700 hover:border-zinc-500 transition-colors">
                  <button onClick={() => onAddPlayer(n)} className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer">{n}</button>
                  <button onClick={() => handleDeleteSaved(n)} className="w-4 h-4 flex items-center justify-center text-zinc-600 hover:text-red-400 transition-colors cursor-pointer text-xs">&times;</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-zinc-500 mb-2">{players.length} player{players.length !== 1 ? 's' : ''}</div>
        <AnimatePresence mode="popLayout">
          {players.map((p) => (
            <motion.div key={p.id} layout initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-zinc-800/50 border border-zinc-800 mb-1.5">
              <PlayerAvatar name={p.name} size="sm" />
              <span className="text-sm text-zinc-200 flex-1 truncate">{p.name}</span>
              <button onClick={() => onRemovePlayer(p.id)} className="text-zinc-600 hover:text-red-400 transition-colors cursor-pointer text-sm">&times;</button>
            </motion.div>
          ))}
        </AnimatePresence>
      </GlassCard>

      <GlassCard className="w-full max-w-sm">
        <h3 className="text-sm font-semibold text-zinc-300 mb-4">Settings</h3>
        <div className="flex flex-col gap-5">
          <div>
            <label className="text-xs text-zinc-500 block mb-2">Spies</label>
            <div className="flex items-center gap-3 justify-center">
              <button onClick={() => onUpdateSettings({ spyCount: settings.spyCount - 1 })} disabled={settings.spyCount <= 0}
                className="w-8 h-8 rounded-md bg-zinc-800 text-zinc-300 text-sm font-medium hover:bg-zinc-700 disabled:opacity-25 transition-colors cursor-pointer">-</button>
              <span className="text-xl font-semibold text-zinc-100 w-8 text-center">{settings.spyCount}</span>
              <button onClick={() => onUpdateSettings({ spyCount: settings.spyCount + 1 })} disabled={settings.spyCount >= maxSpies}
                className="w-8 h-8 rounded-md bg-zinc-800 text-zinc-300 text-sm font-medium hover:bg-zinc-700 disabled:opacity-25 transition-colors cursor-pointer">+</button>
            </div>
            {maxSpies === 0 && <p className="text-xs text-zinc-600 mt-1 text-center">Need 4+ players</p>}
          </div>

          <div>
            <label className="text-xs text-zinc-500 block mb-2">Turn timer</label>
            <ToggleGroup value={[String(settings.describeTimerSeconds)]} onValueChange={(val) => { if (val.length > 0) onUpdateSettings({ describeTimerSeconds: Number(val[0]) }); }} className="flex gap-1 justify-center">
              {timerOptions.map((opt) => (<Toggle key={opt.value} value={String(opt.value)} className={toggleCls}>{opt.label}</Toggle>))}
            </ToggleGroup>
          </div>

          <div>
            <label className="text-xs text-zinc-500 block mb-2">Clues</label>
            <ToggleGroup value={[clueMode]} onValueChange={(val) => { if (val.length > 0) onClueModeChange(val[0] as ClueMode); }} className="flex gap-1 justify-center">
              <Toggle value="verbal" className={toggleCls}>Verbal</Toggle>
              <Toggle value="typed" className={toggleCls}>Typed</Toggle>
            </ToggleGroup>
            <p className="text-xs text-zinc-600 mt-1.5 text-center">{clueMode === 'verbal' ? 'Describe out loud' : 'Type clues on the device'}</p>
          </div>

          <Button onClick={onStartGame} disabled={!canStart} className="w-full mt-1">
            {canStart ? 'Start Game' : `Need ${3 - players.length} more`}
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}
