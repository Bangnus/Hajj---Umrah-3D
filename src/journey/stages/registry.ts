import type { Profile, StageDef } from '../types';

const list = (...xs: (StageDef | null | undefined)[]) => xs.filter((x): x is StageDef => !!x);

const loadUmrah = () => import('./umrah');
const loadHajj = () => import('./hajj');

/** Prefetch the chunk for a ritual mode in the background while the user is on the start screen. */
export function preloadMode(mode: Profile['mode']): Promise<unknown> {
  return mode === 'hajj' ? loadHajj() : loadUmrah();
}

/** Ordered stages for the journey the user picked on the start screen. */
export async function loadStages(p: Profile): Promise<StageDef[]> {
  if (p.mode === 'hajj') {
    const { hajjStages } = await loadHajj();
    return hajjStages(p);
  }
  const u = await loadUmrah();
  if (p.route === 'madinah-first') {
    return list(u.preparation, u.airport, u.madinah, u.madinah ? u.miqatBirAli ?? u.miqatPlane : u.miqatPlane, u.tawaf, u.prayerZamzam, u.sai, u.tahalul, u.returnHome);
  }
  return list(u.preparation, u.airport, u.miqatPlane, u.tawaf, u.prayerZamzam, u.sai, u.tahalul, u.madinah, u.returnHome);
}
