import { getLang, speechLang, tr } from '../../i18n';

export interface CertOptions {
  /** Thai ritual name (an internal key, translated for display): "อุมเราะฮ์" or "ฮัจญ์". */
  ritual: string;
  name: string;
  stages: { title: string }[];
  date?: Date;
}

export const W = 1600;
export const H = 1130;
export const C = {
  paper: '#fbf6e8',
  paperEdge: '#efe2c0',
  green: '#0d3b33',
  green2: '#14524a',
  gold: '#c9a640',
  goldDark: '#8f7120',
  ink: '#22332f',
  muted: '#5c6d67',
  note: '#8a3b2b',
};
export const TH = '"Noto Sans Thai", system-ui, sans-serif';
export const AR = 'Amiri, "Noto Naskh Arabic", serif';

const HIJRI_MONTHS = ['มุฮัรร็อม', 'ศ็อฟัร', 'ร็อบีอุลเอาวัล', 'ร็อบีอุษษานี', 'ญุมาดัลอูลา', 'ญุมาดัลอาคิเราะฮ์',
  'รอญับ', 'ชะอ์บาน', 'รอมฎอน', 'เชาวาล', 'ซุลเกาะอ์ดะฮ์', 'ซุลหิจญะฮ์'];
const HIJRI_MONTHS_EN = ['Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani", 'Jumada al-Ula', 'Jumada al-Akhirah',
  'Rajab', "Sha'ban", 'Ramadan', 'Shawwal', "Dhul-Qa'dah", 'Dhul-Hijjah'];

/** Gregorian date line: Buddhist era in Thai, "30 October 2026" in English. */
export function localDate(d: Date): string {
  if (getLang() === 'en') {
    try {
      return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
    } catch {
      return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    }
  }
  try {
    return `วันที่ ${new Intl.DateTimeFormat('th-TH-u-ca-buddhist', { day: 'numeric', month: 'long', year: 'numeric' }).format(d).replace(/(\d{4})$/, 'พ.ศ. $1')}`;
  } catch {
    return `วันที่ ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear() + 543}`;
  }
}

/** Hijri date in the UI language, or '' when the browser has no Islamic calendar. */
export function hijriDate(d: Date): string {
  for (const cal of ['islamic-umalqura', 'islamic', 'islamic-civil']) {
    try {
      const f = new Intl.DateTimeFormat(`en-u-ca-${cal}-nu-latn`, { day: 'numeric', month: 'numeric', year: 'numeric' });
      if (!f.resolvedOptions().calendar.startsWith('islamic')) continue;
      const parts = Object.fromEntries(f.formatToParts(d).map((p) => [p.type, p.value]));
      const day = Number(parts.day), month = Number(parts.month), year = Number(String(parts.year).replace(/\D/g, ''));
      if (!day || !month || !year || month > 12) continue;
      return getLang() === 'en' ? `${day} ${HIJRI_MONTHS_EN[month - 1]} ${year} AH` : `${day} ${HIJRI_MONTHS[month - 1]} ฮ.ศ. ${year}`;
    } catch { /* try next */ }
  }
  try {
    const f = new Intl.DateTimeFormat(`${speechLang()}-u-ca-islamic`, { day: 'numeric', month: 'long', year: 'numeric' });
    if (f.resolvedOptions().calendar.startsWith('islamic')) return f.format(d);
  } catch { /* none */ }
  return '';
}

export function slug(ritual: string) { return ritual === 'ฮัจญ์' ? 'hajj' : 'umrah'; }

/** Display name of the internal Thai ritual key. */
export function ritualName(ritual: string): string { return ritual === 'ฮัจญ์' ? tr('ฮัจญ์') : tr('อุมเราะฮ์'); }
