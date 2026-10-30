import type { Profile, Settings } from './types';

const KEY = 'umrahsim:progress:v1';
const SETTINGS_KEY = 'umrahsim:settings:v1';

export interface Saved {
  profile: Profile;
  stageIndex: number;
}

export function saveProgress(s: Saved | null) {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify({ ...s, at: Date.now() }));
    else localStorage.removeItem(KEY);
  } catch { /* storage unavailable */ }
}

export function loadProgress(): Saved | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!Number.isInteger(v?.stageIndex) || v.stageIndex < 0 || !['male', 'female'].includes(v?.profile?.gender)) return null;
    // Older saves have no journey type: default to classic Umrah.
    v.profile.mode = v.profile.mode === 'hajj' ? 'hajj' : 'umrah';
    v.profile.route = v.profile.route === 'madinah-first' ? 'madinah-first' : 'miqat-first';
    v.profile.hajjType = ['tamattu', 'ifrad', 'qiran'].includes(v.profile.hajjType) ? v.profile.hajjType : 'tamattu';
    return v;
  } catch { return null; }
}

export const DEFAULT_SETTINGS: Settings = { floorLine: true, narration: true, sfx: true, rate: 'normal' };

export function loadSettings(): Settings {
  try {
    const v = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') ?? {};
    const bool = (x: unknown, d: boolean) => (typeof x === 'boolean' ? x : d);
    return {
      floorLine: bool(v.floorLine, DEFAULT_SETTINGS.floorLine),
      narration: bool(v.narration, DEFAULT_SETTINGS.narration),
      sfx: bool(v.sfx, DEFAULT_SETTINGS.sfx),
      rate: v.rate === 'slow' ? 'slow' : 'normal',
    };
  } catch { return { ...DEFAULT_SETTINGS }; }
}

export function saveSettings(s: Settings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}
