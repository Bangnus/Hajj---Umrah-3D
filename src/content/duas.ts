import data from './duas-th.json';
import type { Dua } from './duaTypes';

export { DUA_TYPE_EN, DUA_TYPE_TH, localDua, type Dua } from './duaTypes';

const byId = new Map<string, Dua>((data.duas as Dua[]).map((d) => [d.id, d]));

export function getDua(id: string): Dua | undefined {
  return byId.get(id);
}
