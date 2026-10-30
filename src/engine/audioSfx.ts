export type Sfx = 'chime' | 'complete' | 'buzz' | 'click' | 'rise';

type Ctx = AudioContext;
let ctx: Ctx | null = null;
let master: GainNode | null = null;

function ensureCtx(): Ctx | null {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
    return ctx;
  }
  const AC: typeof AudioContext | undefined = window.AudioContext
    ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
  } catch { ctx = null; }
  return ctx;
}

// The AudioContext may only start after a user gesture: create it lazily on the first one.
if (typeof document !== 'undefined') {
  const unlock = () => { ensureCtx(); };
  for (const ev of ['pointerdown', 'keydown', 'touchstart']) {
    document.addEventListener(ev, unlock, { capture: true, passive: true });
  }
}

function tone(c: Ctx, o: { type?: OscillatorType; f0: number; f1?: number; at?: number; dur: number; gain: number; attack?: number; filter?: number }) {
  const t = c.currentTime + (o.at ?? 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.f0, t);
  if (o.f1) osc.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
  const a = o.attack ?? 0.008;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(o.gain, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
  let node: AudioNode = osc;
  if (o.filter) {
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = o.filter;
    osc.connect(lp);
    node = lp;
  }
  node.connect(g);
  g.connect(master!);
  osc.start(t);
  osc.stop(t + o.dur + 0.05);
}

export function playSfx(kind: Sfx, enabled: boolean) {
  if (!enabled) return;
  // Only play once a gesture has created the context; never create it from a timer.
  if (!ctx || !master) return;
  if (ctx.state === 'suspended') { ctx.resume().catch(() => undefined); }
  const c = ctx;
  try {
    switch (kind) {
      case 'chime':
        tone(c, { f0: 1046.5, dur: 0.7, gain: 0.07 });
        tone(c, { f0: 1568, dur: 0.55, gain: 0.035, at: 0.01 });
        break;
      case 'complete':
        [784, 987.8, 1174.7, 1568].forEach((f, k) => {
          tone(c, { f0: f, dur: 0.9, gain: 0.06, at: k * 0.09 });
          tone(c, { f0: f * 2, dur: 0.5, gain: 0.015, at: k * 0.09 });
        });
        break;
      case 'buzz':
        tone(c, { type: 'sawtooth', f0: 150, dur: 0.16, gain: 0.06, filter: 520, attack: 0.01 });
        tone(c, { type: 'sawtooth', f0: 130, dur: 0.2, gain: 0.06, filter: 480, attack: 0.01, at: 0.17 });
        break;
      case 'click':
        tone(c, { type: 'triangle', f0: 1500, f1: 700, dur: 0.035, gain: 0.04, attack: 0.002 });
        break;
      case 'rise':
        tone(c, { f0: 523, f1: 880, dur: 0.38, gain: 0.05, attack: 0.03 });
        tone(c, { f0: 784, f1: 1318, dur: 0.38, gain: 0.018, attack: 0.04 });
        break;
    }
  } catch { /* ignore */ }
}

