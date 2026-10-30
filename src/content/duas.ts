import data from './duas-th.json';

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
