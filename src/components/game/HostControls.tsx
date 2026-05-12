import { useState } from 'react';
import { Menu } from '@base-ui/react/menu';
import { Dialog } from '@base-ui/react/dialog';
import { PlayerAvatar } from '../ui/PlayerAvatar';
import type { ClientPlayer } from '../../lib/types';

interface HostControlsProps {
  players: ClientPlayer[];
  onReset: () => void;
  onKick: (playerId: string) => void;
  myId: string;
}

export function HostControls({ players, onReset, onKick, myId }: HostControlsProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const alivePlayers = players.filter((p) => p.isAlive && p.id !== myId);

  return (
    <div className="fixed top-4 right-4 z-50">
      <Menu.Root>
        <Menu.Trigger className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors flex items-center justify-center cursor-pointer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
          </svg>
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner className="z-50" sideOffset={6} align="end">
            <Menu.Popup className="w-56 bg-zinc-900 border border-zinc-700 rounded-lg py-1 shadow-xl outline-none">
              <Menu.Item
                className="flex items-center px-3 py-2 text-sm text-red-400 cursor-pointer data-[highlighted]:bg-zinc-800 outline-none"
                onClick={() => setConfirmOpen(true)}
              >
                Reset Game
              </Menu.Item>

              {alivePlayers.length > 0 && (
                <>
                  <Menu.Separator className="my-1 border-t border-zinc-800" />
                  <div className="px-3 py-1 text-xs text-zinc-500 uppercase tracking-wider">Remove</div>
                  {alivePlayers.map((p) => (
                    <Menu.Item
                      key={p.id}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 cursor-pointer data-[highlighted]:bg-zinc-800 outline-none"
                      onClick={() => onKick(p.id)}
                    >
                      <PlayerAvatar name={p.name} size="sm" />
                      <span className="truncate">{p.name}</span>
                    </Menu.Item>
                  ))}
                </>
              )}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>

      <Dialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 bg-black/60 z-50" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-80 bg-zinc-900 border border-zinc-700 rounded-xl p-5 outline-none">
            <Dialog.Title className="text-base font-semibold text-zinc-100 mb-2">Reset game?</Dialog.Title>
            <Dialog.Description className="text-sm text-zinc-400 mb-5">This will end the current game and return everyone to the lobby.</Dialog.Description>
            <div className="flex gap-2 justify-end">
              <Dialog.Close className="px-4 py-2 text-sm rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 cursor-pointer transition-colors">Cancel</Dialog.Close>
              <button
                onClick={() => { onReset(); setConfirmOpen(false); }}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-500 cursor-pointer transition-colors"
              >Reset</button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
