/**
 * Madinah task stages (each in its own file, re-exported here for the registry):
 * - madinah: ziyarah of Masjid an-Nabawi (Raudhah, salam to the Prophet ﷺ, Baqi; optional Quba, Uhud)
 * - miqatBirAli: miqat at Dhul-Hulayfah (Bir Ali) for the Madinah-first route
 * - returnHome: farewell, flight and arrival home
 */
export { madinah } from './ziyarah';
export { miqatBirAli } from './birAli';
export { returnHome } from './returnHome';
