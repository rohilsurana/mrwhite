import { useState, type FormEvent } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { ClientMessage } from '../../lib/types';

export function JoinForm({ onSend }: { onSend: (msg: ClientMessage) => void }) {
  const [name, setName] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const playerId = sessionStorage.getItem('mr_white_player_id') || crypto.randomUUID();
    sessionStorage.setItem('mr_white_player_id', playerId);
    sessionStorage.setItem('mr_white_player_name', name.trim());

    onSend({ type: 'join', name: name.trim(), playerId });
  };

  return (
    <GlassCard className="w-full max-w-sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-white/90">Enter your name</h2>
        <Input
          placeholder="Your name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          autoFocus
        />
        <Button type="submit" disabled={!name.trim()}>
          Join Game
        </Button>
      </form>
    </GlassCard>
  );
}
