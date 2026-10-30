/**
 * Tiny i18n layer. Thai is the source language: wrap user-facing Thai text in `tr('…')`.
 * English text comes from dictionaries keyed by the exact Thai string (src/i18n/en/*.ts).
 * Missing entries fall back to Thai, so a partial dictionary never breaks the UI.
 *
 * Placeholders: `tr('เก็บ{item}แล้ว ({n}/5)', { item, n })` — keep the same {names} in the English value.
 * Language is chosen before the 3D scenes are built, so canvas labels use it too.
 */
export type Lang = 'th' | 'en';

const KEY = 'umrahsim:lang';
const en: Record<string, string> = {};
const missing = new Set<string>();
let lang: Lang = loadLang();

function loadLang(): Lang {
  try { return localStorage.getItem(KEY) === 'en' ? 'en' : 'th'; } catch { return 'th'; }
}

export function getLang(): Lang { return lang; }

export function setLang(l: Lang) {
  lang = l;
  document.documentElement.lang = l;
  try { localStorage.setItem(KEY, l); } catch { /* ignore */ }
}

/** Add English entries (Thai source string → English). */
export function registerEn(entries: Record<string, string>) {
  Object.assign(en, entries);
}

/** Translate a Thai source string into the current language. */
export function tr(th: string, params?: Record<string, string | number>): string {
  let s = th;
  if (lang === 'en') {
    const hit = en[th];
    if (hit !== undefined) s = hit;
    else missing.add(th);
  }
  if (params) s = s.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
  return s;
}

/** Thai strings looked up in English mode without a dictionary entry (for coverage checks). */
export function missingTranslations(): string[] {
  return [...missing];
}

/** BCP-47 tag for speech and date formatting. */
export function speechLang(): string {
  return lang === 'en' ? 'en-US' : 'th-TH';
}

document.documentElement.lang = lang;
