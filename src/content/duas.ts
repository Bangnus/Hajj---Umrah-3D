import data from './duas-th.json';
import { getLang } from '../i18n';

export interface Dua {
  id: string;
  type: 'dua' | 'dhikr' | 'quran' | 'hadith_info' | 'guidance';
  stages: string[];
  trigger_th: string;
  title_th: string;
  arabic: string;
  reading_th: string;
  meaning_th: string;
  source: string;
  grade_th: string;
  note_th: string;
  title_en: string;
  /** Latin transliteration of the Arabic ('' when there is no Arabic text). */
  reading_en: string;
  meaning_en: string;
  source_en: string;
  grade_en: string;
  note_en: string;
}

const byId = new Map<string, Dua>((data.duas as Dua[]).map((d) => [d.id, d]));

export function getDua(id: string): Dua | undefined {
  return byId.get(id);
}

export const DUA_TYPE_TH: Record<Dua['type'], string> = {
  dua: 'ดุอาอ์',
  dhikr: 'ซิกร์',
  quran: 'อัลกุรอาน',
  hadith_info: 'หะดีษ',
  guidance: 'คำแนะนำ',
};

export const DUA_TYPE_EN: Record<Dua['type'], string> = {
  dua: "Du'a",
  dhikr: 'Dhikr',
  quran: "Qur'an",
  hadith_info: 'Hadith',
  guidance: 'Guidance',
};

/** The displayable texts of a du'a in the current UI language (Arabic is shown as is). */
export function localDua(d: Dua) {
  if (getLang() === 'en') {
    return {
      typeName: DUA_TYPE_EN[d.type],
      title: d.title_en || d.title_th,
      reading: d.reading_en ?? '',
      meaning: d.meaning_en || d.meaning_th,
      note: d.note_en ?? '',
      source: d.source_en || d.source,
      grade: d.grade_en || d.grade_th,
    };
  }
  return {
    typeName: DUA_TYPE_TH[d.type],
    title: d.title_th,
    reading: d.reading_th,
    meaning: d.meaning_th,
    note: d.note_th,
    source: d.source,
    grade: d.grade_th,
  };
}
