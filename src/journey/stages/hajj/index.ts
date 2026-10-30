import type { Profile, StageDef } from '../../types';

/**
 * Hajj stage list for the chosen Hajj type (profile.hajjType). Filled by the Hajj task.
 * An empty list means Hajj is not available yet (the start screen disables it).
 */
export function hajjStages(_p: Profile): StageDef[] {
  return [];
}
