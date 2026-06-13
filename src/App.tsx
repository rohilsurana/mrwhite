import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePolling } from './hooks/usePolling';
import { useNotifyTurn } from './hooks/useNotifyTurn';
import { useLocalGame } from './hooks/useLocalGame';
import { PlayerList } from './components/lobby/PlayerList';
import { GameSettings } from './components/lobby/GameSettings';
import { LocalLobby } from './components/lobby/LocalLobby';
import { WordReveal } from './components/game/WordReveal';
import { DescriptionPhase } from './components/game/DescriptionPhase';
import { VotingPhase } from './components/game/VotingPhase';
import { VoteResults } from './components/game/VoteResults';
import { GuessPhase } from './components/game/GuessPhase';
import { GameOver } from './components/game/GameOver';
import { HostControls } from './components/game/HostControls';
import { PassDevice } from './components/game/PassDevice';
import { PeekWord } from './components/game/PeekWord';
import { HowToPlayDialog } from './components/game/HowToPlayDialog';
import { GlassCard } from './components/ui/GlassCard';
import { PlayerAvatar } from './components/ui/PlayerAvatar';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import type { ClientGameState, ClientMessage, RoundDescriptions } from './lib/types';

type Mode = 'select' | 'online' | 'local';
type OnlineStep = 'choose' | 'create' | 'join' | 'playing';

function getInitialState(): { mode: Mode; gameCode: string | null; step: OnlineStep } {
  const params = new URLSearchParams(window.location.search);
  const urlCode = params.get('code');
  if (urlCode) return { mode: 'online', gameCode: urlCode, step: 'join' };

  const savedCode = sessionStorage.getItem('mr_white_game_code');
  const savedName = sessionStorage.getItem('mr_white_player_name');
  if (savedCode && savedName) return { mode: 'online', gameCode: savedCode, step: 'playing' };

  return { mode: 'select', gameCode: null, step: 'choose' };
}

function App() {
  const initial = getInitialState();
  const [mode, setMode] = useState<Mode>(initial.mode);

  const handleBack = () => {
    sessionStorage.removeItem('mr_white_game_code');
    sessionStorage.removeItem('mr_white_player_id');
    sessionStorage.removeItem('mr_white_player_name');
    window.history.replaceState({}, '', window.location.pathname);
    setMode('select');
  };

  return (
    <div className="min-h-dvh bg-gradient-game flex flex-col">
      <header className="py-6 text-center shrink-0">
        <h1 className="text-4xl md:text-5xl font-bold text-white glow-text tracking-tight">
          Mr. White
        </h1>
      </header>

      <main className="flex-1 flex flex-col items-center pb-8">
        {mode === 'select' && <ModeSelect onSelect={setMode} />}
        {mode === 'online' && <OnlineGame onBack={handleBack} initialStep={initial.step} initialCode={initial.gameCode} />}
        {mode === 'local' && <LocalGame onBack={handleBack} />}
      </main>
      <HowToPlayDialog />
    </div>
  );
}

function ModeSelect({ onSelect }: { onSelect: (m: Mode) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-4 px-4 w-full max-w-sm"
    >
      <p className="text-white/50 text-center mb-2">How do you want to play?</p>
      <Button onClick={() => onSelect('online')} className="w-full">
        Online — Each player on their device
      </Button>
      <Button onClick={() => onSelect('local')} variant="secondary" className="w-full">
        Single Device — Pass & play
      </Button>
    </motion.div>
  );
}

function OnlineGame({ onBack, initialStep, initialCode }: { onBack: () => void; initialStep: OnlineStep; initialCode: string | null }) {
  const [step, setStep] = useState<OnlineStep>(initialStep);
  const [joinCode, setJoinCode] = useState(initialCode || '');

  const pollingCode = step === 'playing' ? (initialCode || null) : null;
  const { gameState, error, joined, join, send, sendRaw } = usePolling(pollingCode);
  useNotifyTurn(gameState);

  const isInGame = gameState?.myId && gameState.players.some((p) => p.id === gameState.myId);
  const showHostControls = gameState && isInGame && gameState.isHost && gameState.phase !== 'lobby';
  const effectiveCode = gameState?.gameCode;

  useEffect(() => {
    if (effectiveCode) {
      window.history.replaceState({}, '', `?code=${effectiveCode}`);
    }
  }, [effectiveCode]);

  const handleCreate = async (playerName: string) => {
    sessionStorage.setItem('mr_white_player_id', crypto.randomUUID());
    sessionStorage.setItem('mr_white_player_name', playerName);
    await join(null, playerName);
    setStep('playing');
  };

  const handleJoin = async (code: string, playerName: string) => {
    sessionStorage.setItem('mr_white_player_id', crypto.randomUUID());
    sessionStorage.setItem('mr_white_player_name', playerName);
    await join(code.toUpperCase(), playerName);
    setStep('playing');
  };

  if (step === 'choose') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4 px-4 w-full max-w-sm">
        <CreateGameForm onSubmit={handleCreate} />
        <div className="text-white/30 text-sm">or</div>
        <JoinGameForm joinCode={joinCode} setJoinCode={setJoinCode} onSubmit={handleJoin} />
        <BackButton onBack={onBack} />
      </motion.div>
    );
  }

  if (step === 'join' && !isInGame && !joined) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4 px-4 w-full max-w-sm">
        <JoinGameForm joinCode={joinCode} setJoinCode={setJoinCode} onSubmit={handleJoin} />
        <BackButton onBack={() => { setStep('choose'); onBack(); }} />
      </motion.div>
    );
  }

  return (
    <>
      <Notifications error={error} toast={null} />

      {showHostControls && (
        <HostControls
          players={gameState.players}
          myId={gameState.myId}
          onReset={() => sendRaw({ type: 'reset_game' })}
          onKick={(id) => send({ type: 'kick_player', targetId: id })}
        />
      )}

      {gameState && isInGame && (
        <>
          {gameState.phase === 'lobby' && effectiveCode && (
            <>
              <GameCodeDisplay code={effectiveCode} />
              <div className="mb-4">
                <BackButton onBack={onBack} />
              </div>
            </>
          )}
          <GamePhaseRenderer state={gameState} onSend={send} onSendRaw={sendRaw} isOnline />
          {(gameState.phase === 'describing' || gameState.phase === 'discussion' || gameState.phase === 'voting') && (
            <PeekWord state={gameState} />
          )}
        </>
      )}

      {!gameState && step === 'playing' && (
        <div className="text-white/40 text-sm">Loading game...</div>
      )}
    </>
  );
}

function CreateGameForm({ onSubmit }: { onSubmit: (name: string) => void }) {
  const [name, setName] = useState('');

  return (
    <GlassCard className="w-full">
      <h2 className="text-lg font-semibold text-white/90 mb-3">Create a Game</h2>
      <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) onSubmit(name.trim()); }} className="flex flex-col gap-3">
        <Input placeholder="Your name..." value={name} onChange={(e) => setName(e.target.value)} maxLength={20} autoFocus />
        <Button type="submit" disabled={!name.trim()}>Create Game</Button>
      </form>
    </GlassCard>
  );
}

function JoinGameForm({ joinCode, setJoinCode, onSubmit }: { joinCode: string; setJoinCode: (c: string) => void; onSubmit: (code: string, name: string) => void }) {
  const [name, setName] = useState('');

  return (
    <GlassCard className="w-full">
      <h2 className="text-lg font-semibold text-white/90 mb-3">Join a Game</h2>
      <form onSubmit={(e) => { e.preventDefault(); if (joinCode.trim() && name.trim()) onSubmit(joinCode.trim(), name.trim()); }} className="flex flex-col gap-3">
        <Input
          placeholder="Game code"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          maxLength={4}
          className="text-center text-xl tracking-[0.3em] font-bold uppercase"
        />
        <Input placeholder="Your name..." value={name} onChange={(e) => setName(e.target.value)} maxLength={20} />
        <Button type="submit" disabled={!joinCode.trim() || !name.trim()}>Join Game</Button>
      </form>
    </GlassCard>
  );
}

function GameCodeDisplay({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}?code=${code}`;

  const handleCopy = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Mr. White Game', url: shareUrl });
        return;
      } catch { /* fallback to clipboard */ }
    }
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mb-4 flex flex-col items-center gap-2">
      <div className="text-sm text-white/40">Game Code</div>
      <div className="text-4xl font-bold tracking-[0.3em] text-white glow-text">{code}</div>
      <button
        onClick={handleCopy}
        className="text-sm text-violet-400 hover:text-violet-300 transition-colors cursor-pointer"
      >
        {copied ? 'Copied!' : 'Share invite link'}
      </button>
    </div>
  );
}

function LocalGame({ onBack }: { onBack: () => void }) {
  const local = useLocalGame();
  const { gameState, localState } = local;
  const [passReady, setPassReady] = useState(false);
  const [clueMode, setClueMode] = useState<'verbal' | 'typed'>('typed');

  const activePlayer = localState.players.find((p) => p.id === localState.activeViewerId);
  const needsPass = localState.passQueue.length > 0 && !passReady;
  const isVotingPass = localState.phase === 'voting' && localState.activeViewerId && !passReady;
  const isDescribingPass = clueMode === 'typed' && localState.phase === 'describing' && !passReady;

  if (gameState.phase === 'lobby') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
        <LocalLobby
          players={localState.players}
          settings={localState.settings}
          clueMode={clueMode}
          onClueModeChange={setClueMode}
          onAddPlayer={local.addPlayer}
          onRemovePlayer={local.removePlayer}
          onUpdateSettings={local.updateSettings}
          onStartGame={local.startGame}
        />
        <div className="flex justify-center mt-4">
          <BackButton onBack={onBack} />
        </div>
      </motion.div>
    );
  }

  {
    const showControls = gameState.phase !== 'game_over';

    return (
      <>
        {showControls && (
          <HostControls
            players={gameState.players}
            myId=""
            onReset={local.resetGame}
            onKick={(id) => local.removePlayer(id)}
          />
        )}

        {gameState.phase === 'word_reveal' && activePlayer && needsPass && (
          <PassDevice playerName={activePlayer.name} phase="word_reveal" onReady={() => { local.revealWord(); setPassReady(true); }} />
        )}

        {gameState.phase === 'word_reveal' && activePlayer && passReady && (
          <WordReveal state={gameState} onConfirm={() => { local.hideAndPass(); setPassReady(false); }} singleDevice />
        )}

        {gameState.phase === 'describing' && activePlayer && clueMode === 'typed' && isDescribingPass && (
          <PassDevice playerName={activePlayer.name} phase="describing" onReady={() => setPassReady(true)} />
        )}

        {gameState.phase === 'describing' && activePlayer && clueMode === 'typed' && passReady && (
          <LocalTypedClue playerName={activePlayer.name} round={gameState.round} descriptions={gameState.descriptions} onSubmit={(text) => { local.submitTypedClue(text); setPassReady(false); }} />
        )}

        {gameState.phase === 'describing' && activePlayer && clueMode === 'verbal' && (
          <LocalVerbalClue gameState={gameState} activeViewerId={localState.activeViewerId} onDone={local.skipTurn} />
        )}

        {gameState.phase === 'discussion' && (
          <DiscussionPhase state={gameState} onStartVoting={local.startLocalVoting} />
        )}

        {gameState.phase === 'voting' && activePlayer && isVotingPass && (
          <PassDevice playerName={activePlayer.name} phase="voting" onReady={() => setPassReady(true)} />
        )}

        {gameState.phase === 'voting' && activePlayer && passReady && (
          <LocalVoting state={gameState} activePlayer={activePlayer} onVote={(targetId, accusedRole) => { local.submitVote(targetId, accusedRole); setPassReady(false); }} />
        )}

        {gameState.phase === 'vote_result' && (
          <VoteResults state={gameState} onContinue={local.continueAfterVote} />
        )}

        {gameState.phase === 'mr_white_guess' && activePlayer && !passReady && (
          <PassDevice playerName={activePlayer.name} phase="guess" onReady={() => setPassReady(true)} />
        )}

        {gameState.phase === 'mr_white_guess' && passReady && (
          <GuessPhase state={{ ...gameState, myRole: 'mr_white' }} onSend={(msg) => { if (msg.type === 'guess_word') { local.guessWord(msg.word); setPassReady(false); } }} />
        )}

        {gameState.phase === 'game_over' && (
          <GameOver state={{ ...gameState, isHost: true }} onSend={() => local.resetGame()} />
        )}
      </>
    );
  }
}

function LocalVoting({ state, activePlayer, onVote }: { state: ClientGameState; activePlayer: { id: string; name: string }; onVote: (targetId: string, accusedRole?: 'mr_white' | 'spy') => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [accusedRole, setAccusedRole] = useState<'mr_white' | 'spy' | null>(null);
  const votable = state.players.filter((p) => p.isAlive && p.id !== activePlayer.id);
  const strict = state.settings.strictMode;
  const canSubmit = selected && (!strict || accusedRole);

  return (
    <div className="flex flex-col gap-6 px-4 max-w-lg mx-auto w-full">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">{activePlayer.name}'s Vote</h2>
        <p className="text-white/40 text-sm">Who is Mr. White?</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {votable.map((p) => (
          <motion.button
            key={p.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelected(p.id)}
            className={`flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
              selected === p.id ? 'bg-violet-500/20 border-violet-500/50 ring-1 ring-violet-500/30' : 'bg-white/5 border-white/5 hover:bg-white/10'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">{p.name.charAt(0).toUpperCase()}</div>
            <span className="text-white font-medium text-sm truncate">{p.name}</span>
          </motion.button>
        ))}
      </div>
      {strict && selected && (
        <div>
          <p className="text-sm text-white/50 mb-2 text-center">They are a...</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setAccusedRole('mr_white')}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer border ${accusedRole === 'mr_white' ? 'bg-red-500/20 border-red-500/50 text-red-300 ring-1 ring-red-500/30' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}>Mr. White</button>
            <button onClick={() => setAccusedRole('spy')}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer border ${accusedRole === 'spy' ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 ring-1 ring-amber-500/30' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}>Spy</button>
          </div>
        </div>
      )}
      <Button onClick={() => canSubmit && onVote(selected!, accusedRole ?? undefined)} disabled={!canSubmit} className="w-full">Submit Vote</Button>
      <ClueHistory descriptions={state.descriptions} />
    </div>
  );
}

function GamePhaseRenderer({ state, onSend, onSendRaw, isOnline }: { state: ClientGameState; onSend: (msg: ClientMessage) => void; onSendRaw: (msg: Record<string, unknown>) => void; isOnline: boolean }) {
  if (state.phase === 'lobby') {
    return (
      <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-6 w-full px-4">
        <div className="w-full max-w-sm">
          <PlayerList players={state.players} myId={state.myId} isHost={state.isHost} onSend={onSend} />
        </div>
        {state.isHost && (
          <GameSettings settings={state.settings} playerCount={state.players.length} onSend={onSend} onSendRaw={onSendRaw} />
        )}
        {!state.isHost && isOnline && (
          <div className="glass p-4 rounded-xl text-center text-white/40 max-w-sm w-full">
            Waiting for host to start the game...
          </div>
        )}
      </motion.div>
    );
  }

  if (state.phase === 'word_reveal') return <WordReveal state={state} onConfirm={() => onSend({ type: 'word_seen' })} />;
  if (state.phase === 'describing') return <DescriptionPhase state={state} onSend={onSend} />;
  if (state.phase === 'discussion') return <DiscussionPhase state={state} onStartVoting={() => onSend({ type: 'start_voting' })} />;
  if (state.phase === 'voting') return <VotingPhase state={state} onSend={onSend} />;
  if (state.phase === 'vote_result') return <VoteResults state={state} onContinue={() => onSendRaw({ type: 'continue_after_vote' })} />;
  if (state.phase === 'mr_white_guess') return <GuessPhase state={state} onSend={onSend} />;
  if (state.phase === 'game_over') return <GameOver state={state} onSend={onSend} />;
  return null;
}

function Notifications({ error, toast }: { error: string | null; toast: { message: string; variant: string } | null }) {
  return (
    <AnimatePresence mode="wait">
      {error && (
        <motion.div key="error" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="mb-4 px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm max-w-sm">{error}</motion.div>
      )}
      {toast && (
        <motion.div key="toast" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="mb-4 px-4 py-2 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-300 text-sm max-w-sm">{toast.message}</motion.div>
      )}
    </AnimatePresence>
  );
}

function LocalTypedClue({ playerName, round, descriptions, onSubmit }: { playerName: string; round: number; descriptions: RoundDescriptions[]; onSubmit: (text: string) => void }) {
  const [clue, setClue] = useState('');

  return (
    <div className="flex flex-col gap-6 px-4 max-w-lg mx-auto w-full">
      <div className="text-center">
        <div className="text-sm text-white/50 mb-1">Round {round}</div>
        <h2 className="text-xl font-bold text-white">{playerName}, type your clue</h2>
        <p className="text-white/40 text-sm mt-1">Only you should see the screen right now</p>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (clue.trim()) { onSubmit(clue.trim()); setClue(''); } }} className="glass p-4 rounded-xl flex gap-3">
        <Input value={clue} onChange={(e) => setClue(e.target.value)} placeholder="Type your clue..." maxLength={100} autoFocus />
        <Button type="submit" disabled={!clue.trim()}>Send</Button>
      </form>
      <ClueHistory descriptions={descriptions} />
    </div>
  );
}

function LocalVerbalClue({ gameState, activeViewerId, onDone }: { gameState: ClientGameState; activeViewerId: string | null; onDone: () => void }) {
  return (
    <div className="flex flex-col gap-6 px-4 max-w-lg mx-auto w-full">
      <div className="text-center">
        <div className="text-sm text-white/50 mb-1">Round {gameState.round}</div>
        <h2 className="text-xl font-bold text-white">{gameState.players.find((p) => p.id === activeViewerId)?.name}'s turn to describe</h2>
        <p className="text-white/40 text-sm mt-1">Describe your word verbally, then press Done</p>
      </div>
      <div className="flex gap-2 justify-center flex-wrap">
        {gameState.players.filter((p) => p.isAlive).map((p) => {
          const isCurrent = p.id === activeViewerId;
          return (
            <div key={p.id} className={`flex flex-col items-center gap-1 px-2 py-1 rounded-lg transition-all ${isCurrent ? 'bg-violet-500/20 ring-1 ring-violet-500/50' : p.hasDescribed ? 'opacity-40' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm ${isCurrent ? 'bg-violet-500' : 'bg-white/20'}`}>{p.name.charAt(0).toUpperCase()}</div>
              <span className="text-xs text-white/50">{p.name.slice(0, 6)}</span>
            </div>
          );
        })}
      </div>
      <Button onClick={onDone} className="w-full">Done — Next Player</Button>
    </div>
  );
}

function ClueHistory({ descriptions }: { descriptions: RoundDescriptions[] }) {
  const withEntries = descriptions.filter((r) => r.entries.length > 0);
  if (withEntries.length === 0) return null;

  return (
    <div className="glass p-4 rounded-xl">
      <div className="text-xs text-white/30 uppercase tracking-wider mb-2">Clue History</div>
      {[...withEntries].reverse().map((round) => (
        <div key={round.round} className="mb-3 last:mb-0">
          <div className="text-xs text-white/20 mb-1">Round {round.round}</div>
          {round.entries.map((e, i) => (
            <div key={i} className="text-sm text-white/50 py-0.5">
              <span className="text-white/40 font-medium">{e.playerName}:</span> "{e.text}"
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function DiscussionPhase({ state, onStartVoting }: { state: ClientGameState; onStartVoting: () => void }) {
  const currentRound = state.descriptions[state.descriptions.length - 1];

  return (
    <div className="flex flex-col gap-6 px-4 max-w-lg mx-auto w-full">
      <div className="text-center">
        <div className="text-sm text-white/50 mb-1">Round {state.round}</div>
        <h2 className="text-xl font-bold text-white">Discuss the clues</h2>
        <p className="text-white/40 text-sm mt-1">Review the clues and discuss who might be Mr. White</p>
      </div>

      {currentRound && currentRound.entries.length > 0 && (
        <GlassCard>
          <div className="flex flex-col gap-2">
            {currentRound.entries.map((entry, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                <PlayerAvatar name={entry.playerName} size="sm" />
                <span className="text-sm text-white/50 min-w-[50px]">{entry.playerName}</span>
                <span className="text-white/80">"{entry.text}"</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {state.isHost ? (
        <Button onClick={onStartVoting} className="w-full">
          Start Voting
        </Button>
      ) : (
        <p className="text-center text-white/30 text-sm">Waiting for host to start voting...</p>
      )}
    </div>
  );
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button onClick={onBack} className="text-white/30 hover:text-white/60 text-sm transition-colors cursor-pointer">
      &larr; Back
    </button>
  );
}

export default App;
