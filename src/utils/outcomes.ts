import type { OutcomeResult } from '@/types';
import { NOT_MATCHED_LABEL } from '@/types';

export function filterOutcomes(outcomes: OutcomeResult[]): OutcomeResult[] {
  return outcomes.filter((o) => !(o.label === NOT_MATCHED_LABEL && o.probability === 0));
}
