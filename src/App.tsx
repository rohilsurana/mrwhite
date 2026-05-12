import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useWebSocket } from './hooks/useWebSocket';
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
    <div className="min-h-dvh flex flex-col">
      <header className="py-6 text-center shrink-0">
        <h1 className="text-3xl md:text-4xl font-bold text-zinc-100 tracking-tight">
          Mr. White
        </h1>
      </header>

      <main className="flex-1 flex flex-col items-center pb-8">
        {mode === 'select' && <ModeSelect onSelect={setMode} />}
        {mode === 'online' && <OnlineGame onBack={handleBack} initialStep={initial.step} initialCode={initial.gameCode} />}
        {mode === 'local' && <LocalGame onBack={handleBack} />}
      </main>
    </div>
  );
}

function ModeSelect({ onSelect }: { onSelect: (m: Mode) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-3 px-4 w-full max-w-sm"
    >
      <p className="text-zinc-500 text-sm text-center mb-1">How do you want to play?</p>
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
  const [gameCode, setGameCode] = useState<string | null>(initialCode);
  const [joinCode, setJoinCode] = useState(initialCode || '');
  const [name, setName] = useState('');

  const isReconnecting = initialStep === 'playing';
  const wsGameCode = step === 'playing' ? gameCode : null;
  const { gameState, error, toast, connected, send, sendRaw } = useWebSocket(wsGameCode);

  const isInGame = gameState?.myId && gameState.players.some((p) => p.id === gameState.myId);
  const showHostControls = gameState && isInGame && gameState.isHost && gameState.phase !== 'lobby';
  const effectiveCode = gameState?.gameCode || gameCode;

  useEffect(() => {
    if (effectiveCode) {
      window.history.replaceState({}, '', `?code=${effectiveCode}`);
    }
  }, [effectiveCode]);

  const handleCreate = (playerName: string) => {
    sessionStorage.setItem('mr_white_player_id', crypto.randomUUID());
    sessionStorage.setItem('mr_white_player_name', playerName);
    setName(playerName);
    setGameCode(null);
    setStep('playing');
  };

  const handleJoin = (code: string, playerName: string) => {
    sessionStorage.setItem('mr_white_player_id', crypto.randomUUID());
    sessionStorage.setItem('mr_white_player_name', playerName);
    setName(playerName);
    setGameCode(code.toUpperCase());
    setStep('playing');
  };

  useEffect(() => {
    if (step === 'playing' && connected && !isInGame) {
      const storedName = sessionStorage.getItem('mr_white_player_name') || name;
      const storedId = sessionStorage.getItem('mr_white_player_id');
      if (storedName) {
        send({ type: 'join', name: storedName, playerId: storedId || undefined });
      }
    }
  }, [step, connected, isInGame, name, send]);

  if (step === 'choose') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4 px-4 w-full max-w-sm">
        <CreateGameForm onSubmit={handleCreate} />
        <div className="text-zinc-600 text-xs">or</div>
        <JoinGameForm joinCode={joinCode} setJoinCode={setJoinCode} onSubmit={handleJoin} />
        <BackButton onBack={onBack} />
      </motion.div>
    );
  }

  if (step === 'join' && !isInGame) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4 px-4 w-full max-w-sm">
        <JoinGameForm joinCode={joinCode} setJoinCode={setJoinCode} onSubmit={handleJoin} />
        <BackButton onBack={() => { setStep('choose'); onBack(); }} />
      </motion.div>
    );
  }

  if (step === 'playing') {
    return (
      <>
        {!connected && <div className="mb-2 text-xs text-zinc-500">{isReconnecting ? 'Reconnecting...' : 'Connecting...'}</div>}
        <Notifications error={error} toast={toast} />

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
              <GameCodeDisplay code={effectiveCode} />
            )}
            <GamePhaseRenderer state={gameState} onSend={send} onSendRaw={sendRaw} isOnline />
          </>
        )}

        {gameState && !isInGame && !connected && (
          <div className="text-zinc-500 text-xs">Reconnecting to game...</div>
        )}
      </>
    );
  }

  return null;
}

function CreateGameForm({ onSubmit }: { onSubmit: (name: string) => void }) {
  const [name, setName] = useState('');

  return (
    <GlassCard className="w-full">
      <h2 className="text-sm font-semibold text-zinc-300 mb-3">Create a Game</h2>
      <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) onSubmit(name.trim()); }} className="flex flex-col gap-2.5">
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
      <h2 className="text-sm font-semibold text-zinc-300 mb-3">Join a Game</h2>
      <form onSubmit={(e) => { e.preventDefault(); if (joinCode.trim() && name.trim()) onSubmit(joinCode.trim(), name.trim()); }} className="flex flex-col gap-2.5">
        <Input placeholder="Game code" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} maxLength={4}
          className="text-center text-xl tracking-[0.3em] font-bold uppercase" />
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
    <div className="mb-4 flex flex-col items-center gap-1.5">
      <div className="text-xs text-zinc-500">Game Code</div>
      <div className="text-3xl font-bold tracking-[0.3em] text-zinc-100">{code}</div>
      <button onClick={handleCopy} className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer">
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
          <WordReveal state={gameState} onConfirm={() => { local.hideAndPass(); setPassReady(false); }} />
        )}

        {gameState.phase === 'describing' && activePlayer && clueMode === 'typed' && isDescribingPass && (
          <PassDevice playerName={activePlayer.name} phase="word_reveal" onReady={() => setPassReady(true)} />
        )}

        {gameState.phase === 'describing' && activePlayer && clueMode === 'typed' && passReady && (
          <LocalTypedClue playerName={activePlayer.name} round={gameState.round} descriptions={gameState.descriptions} onSubmit={(text) => { local.submitTypedClue(text); setPassReady(false); }} />
        )}

        {gameState.phase === 'describing' && activePlayer && clueMode === 'verbal' && (
          <LocalVerbalClue gameState={gameState} activeViewerId={localState.activeViewerId} onDone={local.skipTurn} />
        )}

        {gameState.phase === 'voting' && activePlayer && isVotingPass && (
          <PassDevice playerName={activePlayer.name} phase="voting" onReady={() => setPassReady(true)} />
        )}

        {gameState.phase === 'voting' && activePlayer && passReady && (
          <LocalVoting state={gameState} activePlayer={activePlayer} onVote={(targetId) => { local.submitVote(targetId); setPassReady(false); }} />
        )}

        {gameState.phase === 'vote_result' && (
          <VoteResults state={gameState} onContinue={local.continueAfterVote} />
        )}

        {gameState.phase === 'mr_white_guess' && (
          <GuessPhase state={{ ...gameState, myRole: 'mr_white' }} onSend={(msg) => { if (msg.type === 'guess_word') local.guessWord(msg.word); }} />
        )}

        {gameState.phase === 'game_over' && (
          <GameOver state={{ ...gameState, isHost: true }} onSend={() => local.resetGame()} />
        )}
      </>
    );
  }
}

function LocalVoting({ state, activePlayer, onVote }: { state: ClientGameState; activePlayer: { id: string; name: string }; onVote: (targetId: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const votable = state.players.filter((p) => p.isAlive && p.id !== activePlayer.id);

  return (
    <div className="flex flex-col gap-5 px-4 max-w-lg mx-auto w-full">
      <div className="text-center">
        <h2 className="text-base font-semibold text-zinc-200 mb-1">{activePlayer.name}'s Vote</h2>
        <p className="text-xs text-zinc-500">Who is Mr. White?</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {votable.map((p) => (
          <motion.button key={p.id} whileTap={{ scale: 0.97 }} onClick={() => setSelected(p.id)}
            className={`flex items-center gap-2.5 p-3 rounded-lg border transition-all cursor-pointer ${
              selected === p.id ? 'bg-zinc-800 border-zinc-600 ring-1 ring-zinc-500' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
            }`}>
            <PlayerAvatar name={p.name} size="sm" />
            <span className="text-sm text-zinc-300 truncate">{p.name}</span>
          </motion.button>
        ))}
      </div>
      <Button onClick={() => selected && onVote(selected)} disabled={!selected} className="w-full">Submit Vote</Button>
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
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center text-zinc-500 text-sm max-w-sm w-full">
            Waiting for host to start...
          </div>
        )}
      </motion.div>
    );
  }

  if (state.phase === 'word_reveal') return <WordReveal state={state} onConfirm={() => onSend({ type: 'word_seen' })} />;
  if (state.phase === 'describing') return <DescriptionPhase state={state} onSend={onSend} />;
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
        <motion.div key="error" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs max-w-sm">{error}</motion.div>
      )}
      {toast && (
        <motion.div key="toast" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="mb-3 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs max-w-sm">{toast.message}</motion.div>
      )}
    </AnimatePresence>
  );
}

function LocalTypedClue({ playerName, round, descriptions, onSubmit }: { playerName: string; round: number; descriptions: RoundDescriptions[]; onSubmit: (text: string) => void }) {
  const [clue, setClue] = useState('');

  return (
    <div className="flex flex-col gap-5 px-4 max-w-lg mx-auto w-full">
      <div className="text-center">
        <div className="text-xs text-zinc-500 mb-1">Round {round}</div>
        <h2 className="text-base font-semibold text-zinc-200">{playerName}, type your clue</h2>
        <p className="text-xs text-zinc-500 mt-1">Only you should see the screen</p>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (clue.trim()) { onSubmit(clue.trim()); setClue(''); } }} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex gap-2">
        <Input value={clue} onChange={(e) => setClue(e.target.value)} placeholder="Type your clue..." maxLength={100} autoFocus />
        <Button type="submit" disabled={!clue.trim()}>Send</Button>
      </form>
      <ClueHistory descriptions={descriptions} />
    </div>
  );
}

function LocalVerbalClue({ gameState, activeViewerId, onDone }: { gameState: ClientGameState; activeViewerId: string | null; onDone: () => void }) {
  return (
    <div className="flex flex-col gap-5 px-4 max-w-lg mx-auto w-full">
      <div className="text-center">
        <div className="text-xs text-zinc-500 mb-1">Round {gameState.round}</div>
        <h2 className="text-base font-semibold text-zinc-200">{gameState.players.find((p) => p.id === activeViewerId)?.name}'s turn</h2>
        <p className="text-xs text-zinc-500 mt-1">Describe verbally, then press Done</p>
      </div>
      <div className="flex gap-1.5 justify-center flex-wrap">
        {gameState.players.filter((p) => p.isAlive).map((p) => {
          const isCurrent = p.id === activeViewerId;
          return (
            <div key={p.id} className={`flex flex-col items-center gap-1 px-2 py-1 rounded-lg transition-all ${isCurrent ? 'bg-zinc-800 ring-1 ring-zinc-600' : ''}`}>
              <PlayerAvatar name={p.name} size="sm" alive={!p.hasDescribed || isCurrent} />
              <span className={`text-[10px] ${isCurrent ? 'text-zinc-300' : 'text-zinc-600'}`}>{p.name.slice(0, 6)}</span>
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
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
      <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Clue history</div>
      {[...withEntries].reverse().map((round) => (
        <div key={round.round} className="mb-2.5 last:mb-0">
          <div className="text-[10px] text-zinc-600 mb-1">Round {round.round}</div>
          {round.entries.map((e, i) => (
            <div key={i} className="text-sm text-zinc-400 py-0.5">
              <span className="text-zinc-500 text-xs">{e.playerName}:</span> "{e.text}"
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button onClick={onBack} className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors cursor-pointer">
      &larr; Back
    </button>
  );
}

export default App;
