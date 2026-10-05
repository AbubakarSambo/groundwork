import { whatHappenedIn, type AServedPattern, type APatternRow } from './who-reads-a-pattern';
import { oldWordingPutPlain } from '../reports/a-stored-sentence-reads-right';

/**
 * WHAT THE REPORT KEPT ABOUT A PATTERN, READ BESIDE THAT PATTERN (6 October 2026; Hafsah to confirm).
 *
 * The live line shows the lead the pattern lines stored in the record over time ("Upward reporting was optimistic while a major
 * account was being lost."). This release stopped serving them on 27 September, because the stored object is written at synthesis
 * with the engine's own code and name ("B1", "CEO-Pleasing"), a label on the person ("Participant A") and a count out of the
 * sessions then. None of that is served here. Only the stored sentence of what happened is, and only as one more line on the
 * pattern the lead is ALREADY served from the live row: its plain heading, its own count, and the person's own words. So the lead
 * reads each pattern once.
 *
 * It rides on `servedPatterns`, so decision 86's wall is that function's: three periods, and the person it is about has had their
 * turn. A stored line with no served pattern beside it is not served. A participant is never given one (they read only their own,
 * and a pattern about the reader is not given a stored line), and an admin who only reads is served no pattern at all.
 */
const A_LABEL_ON_A_PERSON = /\b(?:participant\s+[a-z]\b|the initiator|the lead\b)/i;

export function withTheEarlierRead(
  served: readonly AServedPattern[] | null | undefined,
  rows: readonly APatternRow[] | null | undefined,
  storedPatterns: readonly any[] | null | undefined,
  reader: { runsIt: boolean },
): AServedPattern[] {
  const list = [...(served ?? [])];
  if (!reader.runsIt || !storedPatterns?.length) return list;
  const rowOf = new Map((rows ?? []).map((r) => [r.id, r]));
  return list.map((p) => {
    if (p.yours) return p;
    const row = rowOf.get(p.id);
    const stored = row ? storedPatterns.find((x) => x && x.participantId === row.participantId && x.code === row.code && typeof x.observation === 'string') : null;
    if (!stored) return p;
    const plain = whatHappenedIn(oldWordingPutPlain(stored.observation));
    if (!plain || A_LABEL_ON_A_PERSON.test(plain) || plain === p.whatHappened) return p;
    return { ...p, earlierRead: plain };
  });
}
