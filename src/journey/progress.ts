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
    return v;
  } catch { return null; }
}

export function loadSettings(): Settings {
  try {
    const v = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}');
    return { floorLine: v.floorLine ?? true };
  } catch { return { floorLine: true }; }
}

export function saveSettings(s: Settings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}
