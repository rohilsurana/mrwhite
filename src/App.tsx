import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useWebSocket } from './hooks/useWebSocket';
import { useLocalGame } from './hooks/useLocalGame';
import { JoinForm } from './components/lobby/JoinForm';
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
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import type { ClientGameState, ClientMessage, RoundDescriptions } from './lib/types';

type Mode = 'select' | 'online' | 'local';

function App() {
  const [mode, setMode] = useState<Mode>('select');

  return (
    <div className="min-h-dvh bg-gradient-game flex flex-col">
      <header className="py-6 text-center shrink-0">
        <h1 className="text-4xl md:text-5xl font-bold text-white glow-text tracking-tight">
          Mr. White
        </h1>
      </header>

      <main className="flex-1 flex flex-col items-center pb-8">
        {mode === 'select' && <ModeSelect onSelect={setMode} />}
        {mode === 'online' && <OnlineGame onBack={() => setMode('select')} />}
        {mode === 'local' && <LocalGame onBack={() => setMode('select')} />}
      </main>
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

function OnlineGame({ onBack }: { onBack: () => void }) {
  const { gameState, error, toast, connected, send, sendRaw } = useWebSocket();
  const isInGame = gameState?.myId && gameState.players.some((p) => p.id === gameState.myId);
  const showHostControls = gameState && isInGame && gameState.isHost && gameState.phase !== 'lobby';

  return (
    <>
      {!connected && <div className="mb-2 text-sm text-amber-400">Connecting...</div>}
      <Notifications error={error} toast={toast} />

      {showHostControls && (
        <HostControls
          players={gameState.players}
          myId={gameState.myId}
          onReset={() => sendRaw({ type: 'reset_game' })}
          onKick={(id) => send({ type: 'kick_player', targetId: id })}
        />
      )}

      {(!gameState || !isInGame) && (
        <motion.div key="join" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-6 w-full px-4">
          <JoinForm onSend={send} />
          {gameState && gameState.players.length > 0 && (
            <div className="w-full max-w-sm">
              <PlayerList players={gameState.players} myId="" isHost={false} onSend={send} />
            </div>
          )}
          <BackButton onBack={onBack} />
        </motion.div>
      )}

      {gameState && isInGame && (
        <GamePhaseRenderer
          state={gameState}
          onSend={send}
          onSendRaw={sendRaw}
          isOnline
        />
      )}
    </>
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
          <PassDevice
            playerName={activePlayer.name}
            phase="word_reveal"
            onReady={() => { local.revealWord(); setPassReady(true); }}
          />
        )}

        {gameState.phase === 'word_reveal' && activePlayer && passReady && (
          <WordReveal
            state={gameState}
            onConfirm={() => {
              local.hideAndPass();
              setPassReady(false);
            }}
          />
        )}

        {gameState.phase === 'describing' && activePlayer && clueMode === 'typed' && isDescribingPass && (
          <PassDevice
            playerName={activePlayer.name}
            phase="word_reveal"
            onReady={() => setPassReady(true)}
          />
        )}

        {gameState.phase === 'describing' && activePlayer && clueMode === 'typed' && passReady && (
          <LocalTypedClue
            playerName={activePlayer.name}
            round={gameState.round}
            descriptions={gameState.descriptions}
            onSubmit={(text) => {
              local.submitTypedClue(text);
              setPassReady(false);
            }}
          />
        )}

        {gameState.phase === 'describing' && activePlayer && clueMode === 'verbal' && (
          <LocalVerbalClue
            gameState={gameState}
            activeViewerId={localState.activeViewerId}
            onDone={local.skipTurn}
          />
        )}

        {gameState.phase === 'voting' && activePlayer && isVotingPass && (
          <PassDevice
            playerName={activePlayer.name}
            phase="voting"
            onReady={() => setPassReady(true)}
          />
        )}

        {gameState.phase === 'voting' && activePlayer && passReady && (
          <LocalVoting
            state={gameState}
            activePlayer={activePlayer}
            onVote={(targetId) => {
              local.submitVote(targetId);
              setPassReady(false);
            }}
          />
        )}

        {gameState.phase === 'vote_result' && (
          <VoteResults state={gameState} onContinue={local.continueAfterVote} />
        )}

        {gameState.phase === 'mr_white_guess' && (
          <GuessPhase
            state={{ ...gameState, myRole: 'mr_white' }}
            onSend={(msg) => {
              if (msg.type === 'guess_word') local.guessWord(msg.word);
            }}
          />
        )}

        {gameState.phase === 'game_over' && (
          <GameOver
            state={{ ...gameState, isHost: true }}
            onSend={() => local.resetGame()}
          />
        )}
      </>
    );
  }
}

function LocalVoting({ state, activePlayer, onVote }: {
  state: ClientGameState;
  activePlayer: { id: string; name: string };
  onVote: (targetId: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const votable = state.players.filter((p) => p.isAlive && p.id !== activePlayer.id);

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
              selected === p.id
                ? 'bg-violet-500/20 border-violet-500/50 ring-1 ring-violet-500/30'
                : 'bg-white/5 border-white/5 hover:bg-white/10'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
              {p.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-white font-medium text-sm truncate">{p.name}</span>
          </motion.button>
        ))}
      </div>
      <Button onClick={() => selected && onVote(selected)} disabled={!selected} className="w-full">
        Submit Vote
      </Button>
      <ClueHistory descriptions={state.descriptions} />
    </div>
  );
}

function GamePhaseRenderer({ state, onSend, onSendRaw, isOnline }: {
  state: ClientGameState;
  onSend: (msg: ClientMessage) => void;
  onSendRaw: (msg: Record<string, unknown>) => void;
  isOnline: boolean;
}) {
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

  if (state.phase === 'word_reveal') {
    return <WordReveal state={state} onConfirm={() => onSend({ type: 'word_seen' })} />;
  }

  if (state.phase === 'describing') {
    return <DescriptionPhase state={state} onSend={onSend} />;
  }

  if (state.phase === 'voting') {
    return <VotingPhase state={state} onSend={onSend} />;
  }

  if (state.phase === 'vote_result') {
    return <VoteResults state={state} onContinue={() => onSendRaw({ type: 'continue_after_vote' })} />;
  }

  if (state.phase === 'mr_white_guess') {
    return <GuessPhase state={state} onSend={onSend} />;
  }

  if (state.phase === 'game_over') {
    return <GameOver state={state} onSend={onSend} />;
  }

  return null;
}

function Notifications({ error, toast }: { error: string | null; toast: { message: string; variant: string } | null }) {
  return (
    <AnimatePresence mode="wait">
      {error && (
        <motion.div
          key="error"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="mb-4 px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm max-w-sm"
        >
          {error}
        </motion.div>
      )}
      {toast && (
        <motion.div
          key="toast"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="mb-4 px-4 py-2 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-300 text-sm max-w-sm"
        >
          {toast.message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function LocalTypedClue({ playerName, round, descriptions, onSubmit }: {
  playerName: string;
  round: number;
  descriptions: RoundDescriptions[];
  onSubmit: (text: string) => void;
}) {
  const [clue, setClue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clue.trim()) return;
    onSubmit(clue.trim());
    setClue('');
  };

  return (
    <div className="flex flex-col gap-6 px-4 max-w-lg mx-auto w-full">
      <div className="text-center">
        <div className="text-sm text-white/50 mb-1">Round {round}</div>
        <h2 className="text-xl font-bold text-white">{playerName}, type your clue</h2>
        <p className="text-white/40 text-sm mt-1">Only you should see the screen right now</p>
      </div>

      <form onSubmit={handleSubmit} className="glass p-4 rounded-xl flex gap-3">
        <Input
          value={clue}
          onChange={(e) => setClue(e.target.value)}
          placeholder="Type your clue..."
          maxLength={100}
          autoFocus
        />
        <Button type="submit" disabled={!clue.trim()}>Send</Button>
      </form>

      <ClueHistory descriptions={descriptions} />
    </div>
  );
}

function LocalVerbalClue({ gameState, activeViewerId, onDone }: {
  gameState: ClientGameState;
  activeViewerId: string | null;
  onDone: () => void;
}) {
  return (
    <div className="flex flex-col gap-6 px-4 max-w-lg mx-auto w-full">
      <div className="text-center">
        <div className="text-sm text-white/50 mb-1">Round {gameState.round}</div>
        <h2 className="text-xl font-bold text-white">
          {gameState.players.find((p) => p.id === activeViewerId)?.name}'s turn to describe
        </h2>
        <p className="text-white/40 text-sm mt-1">Describe your word verbally, then press Done</p>
      </div>

      <div className="flex gap-2 justify-center flex-wrap">
        {gameState.players.filter((p) => p.isAlive).map((p) => {
          const isCurrent = p.id === activeViewerId;
          return (
            <div
              key={p.id}
              className={`flex flex-col items-center gap-1 px-2 py-1 rounded-lg transition-all ${
                isCurrent ? 'bg-violet-500/20 ring-1 ring-violet-500/50' : p.hasDescribed ? 'opacity-40' : ''
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm ${
                isCurrent ? 'bg-violet-500' : 'bg-white/20'
              }`}>
                {p.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs text-white/50">{p.name.slice(0, 6)}</span>
            </div>
          );
        })}
      </div>

      <Button onClick={onDone} className="w-full">
        Done — Next Player
      </Button>
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

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      onClick={onBack}
      className="text-white/30 hover:text-white/60 text-sm transition-colors cursor-pointer"
    >
      &larr; Change mode
    </button>
  );
}

export default App;
