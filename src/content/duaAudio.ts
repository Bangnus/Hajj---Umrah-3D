import type { Dua } from './duaTypes';
import { localDua } from './duaTypes';
import * as audio from '../engine/audio';

/**
 * Authentic recitation audio recordings (Mishary Rashid Alafasy - EveryAyah CDN).
 * 128kbps crystal-clear MP3 with high reliability and zero latency.
 */
export const REAL_DUA_AUDIO: Record<string, string> = {
  // Surah Al-Baqarah 158 (Safa & Marwah recitation)
  safa_approach: 'https://everyayah.com/data/Alafasy_128kbps/002158.mp3',
  // Surah Al-Baqarah 201 (Rabbana Atina - Tawaf lap ending)
  rabbana_atina: 'https://everyayah.com/data/Alafasy_128kbps/002201.mp3',
  // Surah Al-Baqarah 125 (Maqam Ibrahim)
  maqam_ibrahim: 'https://everyayah.com/data/Alafasy_128kbps/002125.mp3',
  // Surah Az-Zukhruf 13 (Du'a al-Safar / Vehicle mounted)
  safar: 'https://everyayah.com/data/Alafasy_128kbps/043013.mp3',
};

let currentAudio: HTMLAudioElement | null = null;
let currentKind: 'ar' | 'th' | 'meaning' | null = null;

export const hasRealAudio = (d: Dua) => !!(d.audio || REAL_DUA_AUDIO[d.id]);
export const getActiveAudioKind = () => currentKind;

export function stopDuaAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  currentKind = null;
  audio.stopSpeech();
}

/**
 * Play authentic Arabic recitation or synthesize via Chrome TTS.
 * Gracefully falls back to Chrome TTS if offline or audio file fails to load.
 */
export function playDuaArabic(d: Dua, onEnd?: () => void): boolean {
  stopDuaAudio();
  if (!d.arabic?.trim()) return false;
  currentKind = 'ar';
  const url = d.audio || REAL_DUA_AUDIO[d.id];
  if (url) {
    try {
      const a = new Audio(url);
      currentAudio = a;
      a.onended = () => { currentAudio = null; currentKind = null; onEnd?.(); };
      a.onerror = () => {
        currentAudio = null;
        audio.speak(d.arabic, 'ar', () => { currentKind = null; onEnd?.(); });
      };
      a.play().catch(() => {
        currentAudio = null;
        audio.speak(d.arabic, 'ar', () => { currentKind = null; onEnd?.(); });
      });
      return true;
    } catch { /* fallback to TTS */ }
  }
  return audio.speak(d.arabic, 'ar', () => { currentKind = null; onEnd?.(); });
}

/** Play Thai transliteration using Chrome TTS. */
export function playDuaReading(d: Dua, onEnd?: () => void): boolean {
  stopDuaAudio();
  const t = localDua(d);
  if (!t.reading?.trim()) return false;
  currentKind = 'th';
  const lang = audio.narrationLang();
  return audio.speak(t.reading, lang, () => { currentKind = null; onEnd?.(); });
}

/** Play Thai meaning / translation using Chrome TTS. */
export function playDuaMeaning(d: Dua, onEnd?: () => void): boolean {
  stopDuaAudio();
  const t = localDua(d);
  if (!t.meaning?.trim()) return false;
  currentKind = 'meaning';
  const lang = audio.narrationLang();
  return audio.speak(t.meaning, lang, () => { currentKind = null; onEnd?.(); });
}
