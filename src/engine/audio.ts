import type { Settings } from '../journey/types';
import { loadSettings } from '../journey/progress';
import { getLang } from '../i18n';

/**
 * Browser-only audio: Thai/English/Arabic narration through the Web Speech API and small sound
 * effects synthesised with WebAudio. No audio files. Everything degrades silently when the
 * browser lacks speechSynthesis, a matching voice or AudioContext.
 *
 * TTS is a temporary stand-in: recorded talbiyah/du'a by a qualified reciter and professional
 * narration are planned.
 */

export type VoiceLang = 'th' | 'en' | 'ar';
type Lang = VoiceLang;

/** Language of narration and du'a meanings: follows the UI language. */
export const narrationLang = (): 'th' | 'en' => getLang();
export type Sfx = 'chime' | 'complete' | 'buzz' | 'click' | 'rise';

let getSettings: () => Settings = loadSettings;

/** Read the current settings on every call (narration / sfx / rate). */
export function bindSettings(get: () => Settings) { getSettings = get; }

// ---------------------------------------------------------------- speech

const synth: SpeechSynthesis | null = typeof window !== 'undefined' && 'speechSynthesis' in window
  && typeof SpeechSynthesisUtterance !== 'undefined' ? window.speechSynthesis : null;
const voices: Partial<Record<Lang, SpeechSynthesisVoice>> = {};
const voiceListeners = new Set<() => void>();
/** Chrome drops `onend` if the utterance object is garbage-collected mid-speech. */
let live: SpeechSynthesisUtterance[] = [];
let session = 0;

function pickVoices() {
  if (!synth) return;
  let list: SpeechSynthesisVoice[] = [];
  try { list = synth.getVoices(); } catch { /* ignore */ }
  const norm = (v: SpeechSynthesisVoice) => v.lang.replace('_', '-').toLowerCase();
  // Prefer natural/online voices, then local ones.
  const score = (v: SpeechSynthesisVoice) => (/natural|online|premium|enhanced/i.test(v.name) ? 2 : 0) + (v.localService ? 1 : 0);
  const best = (pred: (l: string) => boolean) => list.filter((v) => pred(norm(v))).sort((a, b) => score(b) - score(a))[0];
  voices.th = best((l) => l.startsWith('th'));
  voices.en = best((l) => l === 'en-us') ?? best((l) => l === 'en-gb') ?? best((l) => l.startsWith('en'));
  voices.ar = best((l) => l === 'ar-sa') ?? best((l) => l.startsWith('ar'));
  voiceListeners.forEach((f) => f());
}

if (synth) {
  pickVoices();
  try { synth.addEventListener('voiceschanged', pickVoices); } catch { /* old Safari */ }
  // Some browsers never fire voiceschanged: poll a few times.
  let tries = 0;
  const poll = window.setInterval(() => {
    if (voices[narrationLang()] && voices.ar) { clearInterval(poll); return; }
    pickVoices();
    if (++tries > 8) clearInterval(poll);
  }, 750);
}

export const ttsSupported = () => !!synth;
export const hasVoice = (lang: Lang) => !!voices[lang];
export const voiceName = (lang: Lang) => voices[lang]?.name ?? '';
/** Called whenever the voice list changes (they load asynchronously). */
export function onVoices(fn: () => void) { voiceListeners.add(fn); }

/** Split long text: Chrome cuts utterances off after ~15 s. Thai separates phrases with spaces (as English separates words). */
function chunks(text: string, max = 160): string[] {
  const out: string[] = [];
  // (No regex lookbehind: older Safari fails to parse it.)
  for (const sentence of text.replace(/[ \t]+/g, ' ').replace(/([.!?…])\s+/g, '$1\n').split(/\s*\n+\s*/)) {
    let cur = '';
    for (const word of sentence.split(' ')) {
      if (cur && (cur + ' ' + word).length > max) { out.push(cur); cur = word; } else cur = cur ? `${cur} ${word}` : word;
      while (cur.length > max) { out.push(cur.slice(0, max)); cur = cur.slice(max); }
    }
    if (cur) out.push(cur);
  }
  return out.filter((c) => c.trim());
}

export function stopSpeech() {
  session++;
  live = [];
  if (!synth) return;
  try { synth.cancel(); } catch { /* ignore */ }
}

/**
 * Speak text in a voice for `lang`. Returns false (and does nothing) when that is impossible.
 * Interrupts whatever is being spoken.
 */
export function speak(text: string, lang: Lang, onEnd?: () => void): boolean {
  const voice = voices[lang];
  if (!synth || !voice || !text.trim()) return false;
  stopSpeech();
  const id = session;
  const slow = getSettings().rate === 'slow';
  const parts = chunks(text);
  try {
    if (synth.paused) synth.resume();
    parts.forEach((part, k) => {
      const u = new SpeechSynthesisUtterance(part);
      u.voice = voice;
      u.lang = voice.lang;
      u.rate = slow ? (lang === 'ar' ? 0.7 : 0.8) : (lang === 'ar' ? 0.9 : 1);
      u.pitch = 1;
      if (k === parts.length - 1) {
        const done = () => { if (id === session) { live = []; onEnd?.(); } };
        u.onend = done;
        u.onerror = done;
      }
      live.push(u);
      synth.speak(u);
    });
  } catch { return false; }
  return true;
}

/** Narration in the UI language (stage intros, mission messages); obeys the narration setting. */
export function narrate(text: string): boolean {
  if (!getSettings().narration) return false;
  return speak(text, narrationLang());
}

// ---------------------------------------------------------------- sound effects

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
  for (const ev of ['pointerdown', 'keydown', 'touchstart']) document.addEventListener(ev, unlock, { capture: true, passive: true });
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

export function sfx(kind: Sfx) {
  if (!getSettings().sfx) return;
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
