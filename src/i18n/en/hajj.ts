/** English dictionary: hajj (Thai source string → English). */
import { HAJJ_PART1 } from './hajj/part1';
import { HAJJ_PART2 } from './hajj/part2';
import { HAJJ_PART3 } from './hajj/part3';

export const EN_HAJJ: Record<string, string> = {
  ...HAJJ_PART1,
  ...HAJJ_PART2,
  ...HAJJ_PART3,
};
