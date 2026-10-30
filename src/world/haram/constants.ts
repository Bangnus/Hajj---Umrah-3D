/**
 * Masjid al-Haram around the Ka'bah. Ka'bah centred at the origin, walls on the axes:
 * +x = east, -z = north. Corners: Black Stone SE (+x,+z), Yamani SW, Shami NW, Iraqi NE.
 * Hijr Ismail is the half-disc on the north side. Tawaf runs counter-clockwise seen
 * from above, i.e. the angle atan2(-z, x) increases.
 */
export const KAABA = { hx: 6, hz: 5.2, h: 13 };
export const HIJR = { z: -KAABA.hz, r: 7.4 };
export const MATAF_R = 36;
/** Angle of the Black Stone line (atan2(-z, x) of the SE corner). */
export const STONE_ANGLE = Math.atan2(-KAABA.hz, KAABA.hx);
/** Angle of the Yamani corner (SW), as the CCW-preceding corner of the Black Stone. */
export const YAMANI_ANGLE = Math.atan2(-KAABA.hz, -KAABA.hx);

export function polar(r: number, a: number) {
  return { x: r * Math.cos(a), z: -r * Math.sin(a) };
}

export const SPOTS = {
  tawafStart: polar(9.6, STONE_ANGLE),
  // Close enough that the follow camera (≈7 m behind) stays inside the open mataf, clear of the arcade columns.
  entry: { x: 19, z: 19 },
  maqam: { x: 16, z: 1.2 },
  prayer: { x: 20.5, z: 1.2 },
  zamzam: { x: 30, z: -9 },
};

export interface HaramOpts {
  floorLine: boolean;
  crowd: number;
}
