import type { Dua } from './duaTypes';
import { localDua } from './duaTypes';
import * as audio from '../engine/audio';
import { REAL_DUA_AUDIO } from './duaAudioUrls';

export { REAL_DUA_AUDIO } from './duaAudioUrls';

export type AudioKind = 'ar' | 'th' | 'meaning';

let currentAudio: HTMLAudioElement | null = null;
let currentKind: AudioKind | null = null;
let playSession = 0;

export const hasRealAudio = (d: Dua) => !!(d.audio || REAL_DUA_AUDIO[d.id]);
export const getActiveAudioKind = () => currentKind;

export function stopDuaAudio() {
  playSession++;
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio.src = '';
    } catch { /* ignore */ }
    currentAudio = null;
  }
  currentKind = null;
  audio.stopSpeech();
}

/** Build Google TTS audio stream URL for natural pronunciation. */
function ttsUrl(text: string, lang: 'ar' | 'th' | 'en'): string {
  const clean = text.replace(/[\n\r]+/g, ' ').trim().slice(0, 190);
  return `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(clean)}`;
}

function playStream(url: string, kind: AudioKind, onEnd?: () => void, onFallback?: () => void): boolean {
  stopDuaAudio();
  currentKind = kind;
  const sess = playSession;
  try {
    const a = new Audio(url);
    currentAudio = a;
    a.onended = () => {
      if (sess === playSession) {
        currentAudio = null;
        currentKind = null;
        onEnd?.();
      }
    };
    a.onerror = () => {
      if (sess === playSession) {
        currentAudio = null;
        if (onFallback) onFallback();
        else {
          currentKind = null;
          onEnd?.();
        }
      }
    };
    const p = a.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        if (sess === playSession) {
          currentAudio = null;
          if (onFallback) onFallback();
          else {
            currentKind = null;
            onEnd?.();
          }
        }
      });
    }
    return true;
  } catch {
    if (onFallback) onFallback();
    else {
      currentKind = null;
      onEnd?.();
    }
    return false;
  }
}

/** Play authentic Arabic recitation (Hisnul Muslim / EveryAyah / Google TTS). */
export function playDuaArabic(d: Dua, onEnd?: () => void): boolean {
  if (!d.arabic?.trim()) return false;
  const realUrl = d.audio || REAL_DUA_AUDIO[d.id];
  const url = realUrl || ttsUrl(d.arabic, 'ar');
  return playStream(
    url,
    'ar',
    onEnd,
    () => audio.speak(d.arabic, 'ar', () => { currentKind = null; onEnd?.(); }),
  );
}

/** Play Thai transliteration using high-fidelity stream or Chrome TTS. */
export function playDuaReading(d: Dua, onEnd?: () => void): boolean {
  const t = localDua(d);
  if (!t.reading?.trim()) return false;
  const lang = audio.narrationLang();
  return playStream(
    ttsUrl(t.reading, lang),
    'th',
    onEnd,
    () => audio.speak(t.reading, lang, () => { currentKind = null; onEnd?.(); }),
  );
}

/** Play Thai meaning / translation using high-fidelity stream or Chrome TTS. */
export function playDuaMeaning(d: Dua, onEnd?: () => void): boolean {
  const t = localDua(d);
  if (!t.meaning?.trim()) return false;
  const lang = audio.narrationLang();
  return playStream(
    ttsUrl(t.meaning, lang),
    'meaning',
    onEnd,
    () => audio.speak(t.meaning, lang, () => { currentKind = null; onEnd?.(); }),
  );
}
