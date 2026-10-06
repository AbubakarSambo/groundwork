import type { AServedRecord, AServedSection, KindOfWork } from './the-kind-of-work';
import { theDayInWords, aDateOnly } from './the-day-in-words';

/**
 * TO CLOSE THE GAP (request 115 c; the prototype's B5 board-as-lead.txt, "To close the gap, two of these
 * three", each deal with its rep and its next step).
 *
 * ONLY FROM WHAT THE RECORD HOLDS. The gap is the team's own aim and its count: how many more are needed.
 * The deals that could close it are the open deals this reader is already served, in the groups the record
 * puts them in ("Likely" and "Possible", whose date is on or before the end). Each comes with whose it is
 * and what happens next only as somebody said it, or that nobody has said.
 *
 * WHAT IT NEVER CLAIMS. The record holds no chance of any deal closing, so nothing here says which ones
 * will. And a deal counts as one toward the aim only where the aim counts things, not money or a rate:
 * where the aim is money ("KES 8 million") or a share, no deal list is offered, because nothing on record
 * says what each deal is worth against it, and the section says that plainly.
 */
export interface ToCloseTheGap {
  /** How many more the team's aim needs. */
  gap: number;
  /** The aim it is measured against, in the lead's own words. */
  aim: string;
  /** One or two full sentences. */
  says: string;
  deals: { id: string; name: string; owner: string | null; says: string }[];
}

const NOT_A_COUNT_OF_THINGS = /(?:\b(?:KES|NGN|USD|GHS|ZAR|revenue|worth|value|naira|shillings?|dollars?|cedis|rand|percent|rate|share)\b|%)/i;
const OPEN_GROUPS = new Set(['likely', 'possible']);

export function toCloseTheGap(
  kind: KindOfWork | null,
  sections: AServedSection[] | null | undefined,
  teamAims: { name: string; target: number | null; count: number; ownerParticipantId?: string | null; dueOn?: Date | string | null }[],
  end: Date | null,
  now: Date,
): ToCloseTheGap | null {
  if (kind !== 'sales org' || !Array.isArray(sections)) return null;
  const aim = teamAims.find((a) => !a.ownerParticipantId && typeof a.target === 'number' && a.target > a.count);
  if (!aim || typeof aim.target !== 'number') return null;
  const gap = aim.target - aim.count;
  /* The day the aim itself is due, when it has one, is the day the headline and "Where each target stands" say; the check-in's end is only the fallback. */
  const day = aDateOnly(aim.dueOn ?? null) ?? end;
  const by = day ? ` by ${theDayInWords(day, now)}` : '';
  const aimName = aim.name.trim().replace(/[.!?]+$/, '');
  if (NOT_A_COUNT_OF_THINGS.test(aimName)) {
    return {
      gap, aim: aimName, deals: [],
      says: `${gap} more ${gap === 1 ? 'is' : 'are'} needed${by}. Nothing on record says what each deal is worth against this aim, so no deals are listed as closing the gap.`,
    };
  }
  const grid = sections.find((s: any) => Array.isArray(s.rows) && s.rows.some((r: AServedRecord) => r.kind === 'deal')) as any;
  const open: AServedRecord[] = grid
    ? (grid.rows as AServedRecord[])
      .filter((r) => r.kind === 'deal' && !!r.group && OPEN_GROUPS.has(r.group))
      .sort((a, b) => (a.group === b.group ? 0 : a.group === 'likely' ? -1 : 1))
    : [];
  const deals = open.map((r) => ({
    id: r.id,
    name: r.name,
    owner: r.owner ?? null,
    says: `${r.name} is ${r.owner ? `${r.owner === 'You' ? 'your' : `${r.owner}'s`} deal` : 'a deal with nobody\'s name on it yet'}. ${r.nextSays ?? 'Nobody has said what happens next.'}`,
  }));
  const counted = `Each open deal is counted as one toward the aim of ${aim.target}.`;
  if (!deals.length) {
    return { gap, aim: aimName, deals, says: `${gap} more ${gap === 1 ? 'is' : 'are'} needed${by}, and no deal on record is still open before then. ${counted}` };
  }
  if (deals.length >= gap) {
    return {
      gap, aim: aimName, deals,
      says: `To close the gap${by}, ${gap === deals.length ? `all ${deals.length}` : `${gap} of these ${deals.length}`} open ${deals.length === 1 ? 'deal' : 'deals'} would need to close. ${counted}`,
    };
  }
  return {
    gap, aim: aimName, deals,
    says: `${gap} more ${gap === 1 ? 'is' : 'are'} needed${by}. There ${deals.length === 1 ? 'is 1 open deal' : `are ${deals.length} open deals`} on record, so even if ${deals.length === 1 ? 'it closes' : 'all of them close'}, ${gap - deals.length} more would be needed. ${counted}`,
  };
}
