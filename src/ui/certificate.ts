/**
 * Learning certificate shown at the end of a journey: a canvas drawing (no images) with an
 * Islamic geometric border, the pilgrim's editable name, completed stages and Gregorian/Hijri dates
 * (Thai Buddhist-era dates in Thai, English dates in English).
 * It is for learning only, never proof of a real Umrah/Hajj.
 */
export { hijriDate, localDate, ritualName, type CertOptions } from './certificate/dates';
export { openCertificate } from './certificate/modal';
export { drawCertificate } from './certificate/render';
