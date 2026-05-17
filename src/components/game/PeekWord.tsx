import { useState } from 'react';
import type { ClientGameState } from '../../lib/types';

export function PeekWord({ state }: { state: ClientGameState }) {
  const [visible, setVisible] = useState(false);

  if (state.myRole === 'mr_white' || !state.myWord) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50">
      {visible && (
        <div className="absolute bottom-12 left-0 glass px-4 py-2 rounded-xl text-white font-bold text-lg whitespace-nowrap">
          {state.myWord}
        </div>
      )}
      <button
        onPointerDown={() => setVisible(true)}
        onPointerUp={() => setVisible(false)}
        onPointerLeave={() => setVisible(false)}
        className="w-10 h-10 rounded-full bg-white/10 border border-white/10 text-white/40 hover:text-white/70 transition-colors flex items-center justify-center cursor-pointer select-none"
        title="Hold to see your word"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
    </div>
  );
}
