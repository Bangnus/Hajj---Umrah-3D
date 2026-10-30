import part1 from './duas/part1.json';
import part2 from './duas/part2.json';
import part3 from './duas/part3.json';
import part4 from './duas/part4.json';
import part5 from './duas/part5.json';
import part6 from './duas/part6.json';
import part7 from './duas/part7.json';
import part8 from './duas/part8.json';
import type { Dua } from './duaTypes';

export { DUA_TYPE_EN, DUA_TYPE_TH, localDua, type Dua } from './duaTypes';

const allDuas = [
  ...part1,
  ...part2,
  ...part3,
  ...part4,
  ...part5,
  ...part6,
  ...part7,
  ...part8,
] as Dua[];

const byId = new Map<string, Dua>(allDuas.map((d) => [d.id, d]));

export function getDua(id: string): Dua | undefined {
  return byId.get(id);
}
