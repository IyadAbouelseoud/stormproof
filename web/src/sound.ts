import { reducedMotion } from './format';

let ctx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) ctx = new AudioCtx();
  }
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('sp-sound') === '1';
  } catch {
    return false;
  }
}

export function setSoundEnabled(on: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('sp-sound', on ? '1' : '0');
  } catch {}
}

function canPlay(): boolean {
  return isSoundEnabled() && !reducedMotion();
}

/** Crisp part snap blip */
export function playPartSnap(): void {
  if (!canPlay()) return;
  const ac = getAudioContext();
  if (!ac) return;
  try {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const now = ac.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(350, now + 0.04);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(ac.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  } catch {}
}

/** Countdown woodblock tick */
export function playLaunchTick(): void {
  if (!canPlay()) return;
  const ac = getAudioContext();
  if (!ac) return;
  try {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const now = ac.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.03);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(ac.destination);

    osc.start(now);
    osc.stop(now + 0.035);
  } catch {}
}

/** Low descent reentry tone */
export function playReentryLowTone(): void {
  if (!canPlay()) return;
  const ac = getAudioContext();
  if (!ac) return;
  try {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const now = ac.currentTime;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.5);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc.connect(gain);
    gain.connect(ac.destination);

    osc.start(now);
    osc.stop(now + 0.55);
  } catch {}
}

/** Impact stamp thud */
export function playStampThud(): void {
  if (!canPlay()) return;
  const ac = getAudioContext();
  if (!ac) return;
  try {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const now = ac.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(ac.destination);

    osc.start(now);
    osc.stop(now + 0.14);
  } catch {}
}

/** Three-note harmonic success chord */
export function playSuccessChord(): void {
  if (!canPlay()) return;
  const ac = getAudioContext();
  if (!ac) return;
  try {
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    const now = ac.currentTime;

    notes.forEach((freq, idx) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      const delay = idx * 0.08;
      const t = now + delay;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(ac.destination);

      osc.start(t);
      osc.stop(t + 0.35);
    });
  } catch {}
}
