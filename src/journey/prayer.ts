import type { Pose } from '../engine/player';

export interface Beat {
  title: string;
  text: string;
  pose: Pose;
  /** Minimum seconds before "next" is enabled. */
  min: number;
}

const ruku: Beat = { title: 'รุกูอ์', text: 'กล่าว "อัลลอฮุอักบัร" แล้วก้มโค้ง มือจับเข่า หลังตรง กล่าว "ซุบฮานะ ร็อบบิยัล อะซีม" 3 ครั้ง', pose: 'ruku', min: 3 };
const itidal: Beat = { title: 'อิอ์ติดาล', text: 'เงยขึ้นยืนตรงพร้อมกล่าว "สะมิอัลลอฮุ ลิมัน ฮะมิดะฮ์" แล้วกล่าว "ร็อบบะนา วะละกัลฮัมด์"', pose: 'stand', min: 2 };
const sujud: Beat = { title: 'สุญูด', text: 'กล่าว "อัลลอฮุอักบัร" แล้วก้มกราบให้หน้าผาก จมูก ฝ่ามือ เข่า และปลายเท้าแตะพื้น กล่าว "ซุบฮานะ ร็อบบิยัล อะอ์ลา" 3 ครั้ง', pose: 'sujud', min: 3 };
const jalsa: Beat = { title: 'นั่งระหว่างสองสุญูด', text: 'กล่าว "อัลลอฮุอักบัร" แล้วลุกขึ้นนั่งสงบ กล่าว "ร็อบบิฆฟิรลี"', pose: 'sit', min: 2 };

/**
 * A two-rakaat sunnah prayer (Shafi'i order): al-Kafirun in the first rakaah, al-Ikhlas in the second.
 * `intention` is the full instruction text for the opening takbir (it should state the niyyah).
 */
export function twoRakaat(intention: string): Beat[] {
  return [
    { title: 'ตักบีเราะตุลอิห์รอม', text: intention, pose: 'raise', min: 3 },
    { title: 'ยืนตรง (ร็อกอะฮ์ที่ 1)', text: 'วางมือขวาทับมือซ้ายที่อก อ่านซูเราะฮ์อัลฟาติหะฮ์ ตามด้วยซูเราะฮ์อัลกาฟิรูน', pose: 'stand', min: 4 },
    ruku, itidal, sujud, jalsa, { ...sujud, title: 'สุญูดครั้งที่สอง' },
    { title: 'ยืนตรง (ร็อกอะฮ์ที่ 2)', text: 'กล่าว "อัลลอฮุอักบัร" แล้วลุกขึ้นยืน อ่านซูเราะฮ์อัลฟาติหะฮ์ ตามด้วยซูเราะฮ์อัลอิคลาศ', pose: 'stand', min: 4 },
    ruku, itidal, sujud, jalsa, { ...sujud, title: 'สุญูดครั้งที่สอง' },
    { title: 'ตะชะฮ์ฮุด', text: 'กล่าว "อัลลอฮุอักบัร" แล้วลุกขึ้นนั่ง อ่านตะชะฮ์ฮุดและเศาะละวาตต่อท่านนบี ﷺ', pose: 'sit', min: 4 },
    { title: 'ให้สลาม', text: 'หันหน้าไปทางขวา กล่าว "อัสสะลามุอะลัยกุม วะเราะห์มะตุลลอฮ์" แล้วหันไปทางซ้ายกล่าวซ้ำ', pose: 'sit', min: 2 },
  ];
}

/** Two-rakaat sunnah prayer after tawaf (behind Maqam Ibrahim). */
export const PRAYER_BEATS: Beat[] = twoRakaat(
  'หันหน้าไปทางกะอ์บะฮ์ ยกมือขึ้นระดับหูหรือไหล่ กล่าว "อัลลอฮุอักบัร" พร้อมตั้งเจตนาในใจว่าจะละหมาดซุนนะฮ์หลังเฏาะวาฟ 2 ร็อกอะฮ์',
);

/** Optional sunnah prayer before entering ihram (before the niyyah at the miqat). */
export const IHRAM_PRAYER_BEATS: Beat[] = twoRakaat(
  'หันหน้าไปทางกิบละฮ์ ยกมือขึ้นระดับหูหรือไหล่ กล่าว "อัลลอฮุอักบัร" พร้อมตั้งเจตนาในใจว่าจะละหมาดซุนนะฮ์อิห์รอม 2 ร็อกอะฮ์ เพื่ออัลลอฮ์',
);
