import type { Settings } from '../journey/types';
import { loadSettings } from '../journey/progress';
import { getLang } from '../i18n';
import { playSfx, type Sfx } from './audioSfx';

/**
 * Browser-only audio: Thai/English/Arabic narration through the Web Speech API and sound effects.
 * Supports Chrome speech synthesis for Arabic/Thai and authentic audio recordings.
 */

export type VoiceLang = 'th' | 'en' | 'ar';
type Lang = VoiceLang;
export type { Sfx };

/** Language of narration and du'a meanings: follows the UI language. */
export const narrationLang = (): 'th' | 'en' => getLang();

let getSettings: () => Settings = loadSettings;

/** Read the current settings on every call (narration / sfx / rate). */
export function bindSettings(get: () => Settings) { getSettings = get; }

const synth: SpeechSynthesis | null = typeof window !== 'undefined' && 'speechSynthesis' in window
  && typeof SpeechSynthesisUtterance !== 'undefined' ? window.speechSynthesis : null;
const voices: Partial<Record<Lang, SpeechSynthesisVoice>> = {};
const voiceListeners = new Set<() => void>();
let live: SpeechSynthesisUtterance[] = [];
let session = 0;

function pickVoices() {
  if (!synth) return;
  let list: SpeechSynthesisVoice[] = [];
  try { list = synth.getVoices(); } catch { /* ignore */ }
  const norm = (v: SpeechSynthesisVoice) => v.lang.replace('_', '-').toLowerCase();
  const score = (v: SpeechSynthesisVoice) => (/natural|online|premium|enhanced/i.test(v.name) ? 2 : 0) + (v.localService ? 1 : 0);
  const best = (pred: (l: string) => boolean) => list.filter((v) => pred(norm(v))).sort((a, b) => score(b) - score(a))[0];
  voices.th = best((l) => l.startsWith('th'));
  voices.en = best((l) => l === 'en-us') ?? best((l) => l === 'en-gb') ?? best((l) => l.startsWith('en'));
  voices.ar = best((l) => l.startsWith('ar'));
  voiceListeners.forEach((f) => f());
}

if (synth) {
  pickVoices();
  try { synth.addEventListener('voiceschanged', pickVoices); } catch { /* ignore */ }
  let tries = 0;
  const poll = window.setInterval(() => {
    if (voices[narrationLang()] && voices.ar) { clearInterval(poll); return; }
    pickVoices();
    if (++tries > 8) clearInterval(poll);
  }, 750);
}

export const ttsSupported = () => !!synth;
export const hasVoice = (lang: Lang) => !!synth || !!voices[lang];
export const voiceName = (lang: Lang) => voices[lang]?.name || (synth ? `${lang.toUpperCase()} (Default)` : '');
export function onVoices(fn: () => void) { voiceListeners.add(fn); }

function chunks(text: string, max = 160): string[] {
  const out: string[] = [];
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
  try {
    if (synth.speaking || synth.pending) synth.cancel();
  } catch { /* ignore */ }
}

export function speak(text: string, lang: Lang, onEnd?: () => void): boolean {
  if (!synth || !text.trim()) return false;
  const wasSpeaking = synth.speaking || synth.pending;
  stopSpeech();
  const id = session;
  const slow = getSettings().rate === 'slow';
  const voice = voices[lang];
  const langTag = lang === 'ar' ? 'ar-SA' : lang === 'th' ? 'th-TH' : 'en-US';
  const parts = chunks(text);

  const doSpeak = () => {
    if (id !== session || !synth) return;
    try {
      if (synth.paused) synth.resume();
      parts.forEach((part, k) => {
        const u = new SpeechSynthesisUtterance(part);
        if (voice) u.voice = voice;
        u.lang = voice?.lang || langTag;
        u.rate = slow ? (lang === 'ar' ? 0.75 : 0.8) : (lang === 'ar' ? 0.9 : 1);
        u.pitch = 1;
        if (k === parts.length - 1) {
          const done = () => { if (id === session) { live = []; onEnd?.(); } };
          u.onend = done;
          u.onerror = done;
        }
        live.push(u);
        synth.speak(u);
      });
    } catch { /* ignore */ }
  };

  if (wasSpeaking) {
    window.setTimeout(doSpeak, 30);
  } else {
    doSpeak();
  }
  return true;
}

export function narrate(text: string): boolean {
  if (!getSettings().narration) return false;
  return speak(text, narrationLang());
}

export function sfx(kind: Sfx) {
  playSfx(kind, getSettings().sfx);
}
