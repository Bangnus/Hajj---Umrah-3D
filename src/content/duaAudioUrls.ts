/**
 * Authentic recitation audio recordings:
 * - Sheikh Hanif Hisnul Muslim Fastly CDN (sheikhhanif/hisnul_muslim_audio)
 * - EveryAyah CDN (Mishary Rashid Alafasy 128kbps MP3)
 */
const HM = 'https://raw.githubusercontent.com/sheikhhanif/hisnul_muslim_audio/master/audio/';
const EA = 'https://everyayah.com/data/Alafasy_128kbps/';

export const REAL_DUA_AUDIO: Record<string, string> = {
  // Travel & Miqat
  leave_home: HM + '16hm.mp3',
  farewell_traveler: HM + '211hm.mp3',
  farewell_resident: HM + '212hm.mp3',
  safar: HM + '207hm.mp3',
  return_home: HM + '217hm.mp3',
  talbiyah: HM + '233hm.mp3',

  // Masjid al-Haram
  masjid_enter: HM + '20hm.mp3',
  masjid_enter_audhu: HM + '20hm.mp3',
  masjid_exit: HM + '21hm.mp3',

  // Tawaf & Ka'bah
  istilam: HM + '234hm.mp3',
  rabbana_atina: EA + '002201.mp3',
  tawaf_lap_1: EA + '002127.mp3',
  tawaf_lap_2: EA + '007023.mp3',
  tawaf_lap_3: EA + '003008.mp3',
  tawaf_lap_4: EA + '014040.mp3',
  tawaf_lap_5: EA + '014041.mp3',
  tawaf_lap_6: EA + '025074.mp3',
  tawaf_lap_7: HM + '255hm.mp3',
  maqam_ibrahim: EA + '002125.mp3',

  // Sa'i (Safa & Marwah)
  safa_approach: EA + '002158.mp3',
  safa_marwah_dhikr: HM + '236hm.mp3',

  // Hajj Rituals
  arafah_best_dua: HM + '237hm.mp3',
  muzdalifah_mashar: EA + '002198.mp3',
  jamarat_takbir: HM + '234hm.mp3',
  slaughter_dam: HM + '246hm.mp3',
  takbir_tashriq: HM + '254hm.mp3',

  // Madinah & Virtues
  sayyid_istighfar: HM + '79hm.mp3',
  salawat_ibrahimiyyah: HM + '53hm.mp3',
  graves_visit: HM + '165hm.mp3',
};

