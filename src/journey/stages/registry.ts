import type { Profile, StageDef } from '../types';
import { airport } from './umrah/airport';
import { madinah, miqatBirAli, returnHome } from './umrah/madinah';
import { miqatPlane } from './umrah/miqat';
import { prayerZamzam } from './umrah/prayerZamzam';
import { preparation } from './umrah/preparation';
import { sai } from './umrah/sai';
import { tahalul } from './umrah/tahalul';
import { tawaf } from './umrah/tawaf';
import { hajjStages } from './hajj';

const list = (...xs: (StageDef | null | undefined)[]) => xs.filter((x): x is StageDef => !!x);

/** Ordered stages for the journey the user picked on the start screen. */
export function buildStages(p: Profile): StageDef[] {
  if (p.mode === 'hajj') return hajjStages(p);
  if (p.route === 'madinah-first') {
    return list(preparation, airport, madinah, madinah ? miqatBirAli ?? miqatPlane : miqatPlane, tawaf, prayerZamzam, sai, tahalul, returnHome);
  }
  return list(preparation, airport, miqatPlane, tawaf, prayerZamzam, sai, tahalul, madinah, returnHome);
}

export const HAJJ_AVAILABLE = hajjStages({ name: '', gender: 'male', mode: 'hajj', route: 'miqat-first', hajjType: 'tamattu' }).length > 0;
export const MADINAH_AVAILABLE = !!madinah;
