let audioCtx: AudioContext | null = null;
let userHasInteracted = false;

function initOnInteraction(): void {
  if (userHasInteracted) return;
  userHasInteracted = true;
  document.removeEventListener('click', initOnInteraction);
  document.removeEventListener('touchstart', initOnInteraction);
}

document.addEventListener('click', initOnInteraction, { once: true });
document.addEventListener('touchstart', initOnInteraction, { once: true });

function getAudioCtx(): AudioContext | null {
  if (!userHasInteracted) return null;
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

export function playTurnSound(): void {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // audio not available
  }
}

export function vibrate(): void {
  try {
    navigator.vibrate?.(200);
  } catch {
    // vibration not available
  }
}

export function notifyTurn(): void {
  playTurnSound();
  vibrate();
}
