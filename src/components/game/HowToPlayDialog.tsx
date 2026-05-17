import { useState } from 'react';

export function HowToPlayDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 w-10 h-10 rounded-full bg-white/10 border border-white/10 text-white/40 hover:text-white/70 transition-colors flex items-center justify-center cursor-pointer text-sm font-bold"
        title="How to play"
      >
        ?
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-lg max-h-[90dvh] overflow-y-auto m-4 mt-8 bg-gray-950 border border-white/10 rounded-2xl p-6">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-white/30 hover:text-white/70 transition-colors cursor-pointer text-lg"
            >&times;</button>

            <h2 className="text-lg font-semibold text-white mb-4">How to Play</h2>
            <div className="flex flex-col gap-4 text-sm text-white/70">
              <section>
                <h3 className="text-white/90 font-medium mb-1">The Setup</h3>
                <p>3 or more players join a game. Each player is secretly assigned a role:</p>
                <ul className="list-disc list-inside mt-1.5 space-y-1 text-white/60">
                  <li><span className="text-white/80">Civilians</span> — all receive the same secret word (e.g. "Beach")</li>
                  <li><span className="text-amber-400">Spies</span> — receive a similar but different word (e.g. "Pool"). They don't know they're spies.</li>
                  <li><span className="text-red-400">Mr. White</span> — receives no word at all. Must bluff their way through.</li>
                </ul>
              </section>

              <section>
                <h3 className="text-white/90 font-medium mb-1">Each Round</h3>
                <ol className="list-decimal list-inside space-y-1 text-white/60">
                  <li><span className="text-white/80">Describe</span> — each player gives a one-word or short clue about their word.</li>
                  <li><span className="text-white/80">Vote</span> — everyone votes on who they think is Mr. White. Most votes = eliminated.</li>
                </ol>
              </section>

              <section>
                <h3 className="text-white/90 font-medium mb-1">Winning</h3>
                <ul className="list-disc list-inside space-y-1 text-white/60">
                  <li><span className="text-white/80">Civilians win</span> if they catch Mr. White and Mr. White fails to guess the word.</li>
                  <li><span className="text-red-400">Mr. White wins</span> by surviving to the final 2, or correctly guessing the word when caught.</li>
                </ul>
              </section>

              <section>
                <h3 className="text-white/90 font-medium mb-1">Mr. White's Last Chance</h3>
                <p className="text-white/60">When voted out, Mr. White gets one guess at the word. Guess right and they win despite being caught.</p>
              </section>

              <section>
                <h3 className="text-white/90 font-medium mb-1">The Spy Twist</h3>
                <p className="text-white/60">Spies have a similar but different word and don't know it. Their clues might subtly mismatch, creating confusion.</p>
              </section>

              <section>
                <h3 className="text-white/90 font-medium mb-1">Tips</h3>
                <ul className="list-disc list-inside space-y-1 text-white/60">
                  <li>Mr. White never goes first — use early clues to figure out the theme.</li>
                  <li>Too vague and Mr. White blends in. Too specific and they'll guess the word.</li>
                  <li>Watch for clues that don't quite fit — could be the spy's different word.</li>
                  <li>As Mr. White, echo the vibe of other clues without being too generic.</li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
