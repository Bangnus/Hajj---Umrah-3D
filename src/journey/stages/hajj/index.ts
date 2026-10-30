import type { Profile, StageDef } from '../../types';
import { hajjAqabah } from './aqabah';
import { hajjArafah } from './arafah';
import { hajjIfadhah } from './ifadhah';
import { hajjIhram } from './ihram';
import { hajjMuzdalifah } from './muzdalifah';
import { hajjSai } from './sai';
import { hajjTarwiyah } from './tarwiyah';
import { hajjTasyriq } from './tasyriq';
import { hajjWada } from './wada';

/**
 * Hajj stage list for the chosen Hajj type (profile.hajjType: tamattu' / ifrad / qiran).
 * Texts and mission totals adapt to the type (dam, sa'i note, niyyah wording).
 */
export function hajjStages(p: Profile): StageDef[] {
  return [
    hajjIhram(p),
    hajjTarwiyah(p),
    hajjArafah(p),
    hajjMuzdalifah(p),
    hajjAqabah(p),
    hajjIfadhah(p),
    hajjSai(p),
    hajjTasyriq(p),
    hajjWada(p),
  ];
}
