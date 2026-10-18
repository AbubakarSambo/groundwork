import { isASalesKind, type AServedRecord, type AServedSection, type KindOfWork } from './the-kind-of-work';
import { theDayInWords } from './the-day-in-words';
import { STALLED_AFTER_WORKING_DAYS, hasStalled, workingDaysSince } from './a-deal-that-has-stalled';

/**
 * EACH DEAL IN ITS GROUP (screens request 112 a; the prototype's B5, board-as-lead.txt).
 *
 * The prototype groups the deal grid under "Likely by 30 September", "Possible", "Next quarter", "Cooling"
 * and "Cold", each with its one-line reason. Each group is built here only from what the record holds for
 * a deal, never from anything else:
 *   - how it is known: its mark (`proven` or `confirmed`, or somebody's word);
 *   - the date somebody gave for it (`due`), against the day this check-in ends;
 *   - the last day somebody spoke about it in a check-in (`lastSaidOn`, the day of the line it came from);
 *   - whether somebody has said what happens next (`next`, an open commitment that names it);
 *   - its stage, for a deal reported at the last stage.
 *
 * WHAT IT NEVER CLAIMS. The record holds no rules for what a deal must show at each stage (request 107 c,
 * part 4), so no group says a criterion is met. Nothing counts the follow-ups that had no reply, so the
 * stall rule cannot be applied and no deal is put under "Cold"; `groupsNote` says so.
 *
 * Built from the rows this reader is already served, after every wall, so a group tells nobody anything
 * they could not read row by row.
 */

/** How recent "recent" is: somebody spoke about it in the last 7 days. Decided for Hafsah to confirm. */
export const RECENT_DAYS = 7;

export type ADealGroup = 'likely' | 'possible' | 'next-quarter' | 'cooling' | 'cold' | 'said-won' | 'won';
const ORDER: ADealGroup[] = ['likely', 'possible', 'next-quarter', 'cooling', 'cold', 'said-won', 'won'];

const dayKey = (d: Date): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const aDay = (s: string | null | undefined): Date | null => (s && /^\d{4}-\d{2}-\d{2}/.test(s) ? new Date(`${s.slice(0, 10)}T12:00:00Z`) : null);

/** The end of a quarter: 31 March, 30 June, 30 September, 31 December, in Lagos time. */
function isTheEndOfAQuarter(d: Date): boolean {
  const [, m, day] = dayKey(d).split('-').map(Number);
  return (m === 3 && day === 31) || (m === 6 && day === 30) || (m === 9 && day === 30) || (m === 12 && day === 31);
}

interface Facts {
  shown: boolean;
  confirmed: boolean;
  addedOnTheBoard: boolean;
  due: Date | null;
  lastSaid: Date | null;
  recent: boolean;
  next: boolean;
  won: boolean;
  /** The customer has not answered for STALLED_AFTER_WORKING_DAYS working days, from the record (pilots after fixes, A4). */
  stalled: boolean;
  silentSince: Date | null;
}

function theFacts(r: AServedRecord & { lastSaidOn?: string | null; proofOnAnotherLine?: boolean; notAnsweringSince?: string | null }, lastStage: string | null, now: Date): Facts {
  const lastSaid = aDay(r.lastSaidOn ?? null);
  const silentSince = r.notAnsweringSince ? new Date(r.notAnsweringSince) : null;
  return {
    stalled: hasStalled(silentSince, now),
    silentSince,
    /* Proof on the line the deal came from, or on another line this reader may read that names the customer (problem 2). */
    shown: r.mark === 'proven' || !!r.proofOnAnotherLine,
    confirmed: r.mark === 'confirmed',
    addedOnTheBoard: r.mark === 'none' || r.from === 'lead',
    due: aDay(r.due),
    lastSaid,
    recent: !!lastSaid && now.getTime() - lastSaid.getTime() < RECENT_DAYS * 86_400_000,
    next: !!r.next,
    won: !!lastStage && !!r.stage && r.stage.toLowerCase() === lastStage.toLowerCase(),
  };
}

/** Why this one deal is where it is, in full sentences, from its own record only. */
export function whyThisDealIsHere(f: Facts, now: Date): string {
  const out: string[] = [];
  out.push(f.shown ? 'Proof shows it.' : f.confirmed ? 'A colleague confirmed it.' : f.addedOnTheBoard ? 'It was added on the board, not said in a check-in.' : 'It rests on what somebody said, with no proof yet.');
  out.push(f.due ? `The date given for it is ${theDayInWords(f.due, now)}.` : 'No date has been given for it.');
  out.push(f.lastSaid ? `It was last spoken about on ${theDayInWords(f.lastSaid, now)}.` : 'Nobody has spoken about it in a check-in yet.');
  out.push(f.next ? 'Somebody has said what happens next.' : 'Nobody has said what happens next.');
  if (f.stalled && f.silentSince) out.push(`The customer has not answered since ${theDayInWords(f.silentSince, now)}, which is ${workingDaysSince(f.silentSince, now)} working days.`);
  return out.join(' ');
}

function theGroup(f: Facts, endKey: string | null): ADealGroup {
  /*
   * A DEAL IS WON ONLY WHEN PROOF OR A COLLEAGUE SHOWS IT (decision 12, decision 138 point 1, change 3; night quality run 1,
   * problem 3). Collins's "I did eleven, all the deliveries are done." sat under Won with no M-Pesa code, and a week later
   * he said "maybe four or five". Reported at the last stage on somebody's word, it is their claim, in its own group.
   * A deal the lead put at the last stage on the board is the lead's own entry, and stays under Won.
   */
  if (f.won) return f.shown || f.confirmed || f.addedOnTheBoard ? 'won' : 'said-won';
  /* Not answering for three working days or more, said in a check-in: stalled, whatever else is said about it (A4). */
  if (f.stalled) return 'cold';
  if (endKey && f.due && dayKey(f.due) > endKey) return 'next-quarter';
  if (f.lastSaid && !f.recent && !f.next) return 'cooling';
  if (endKey && (f.shown || f.confirmed) && f.due && dayKey(f.due) <= endKey && f.recent) return 'likely';
  return 'possible';
}

/* How the deals at the last stage got there (request 118, part 5): all said in a check-in, all put there on the board, or some of each. */
type HowTheyGotThere = 'said' | 'on the board' | 'both';

function headingAndReason(g: ADealGroup, end: Date | null, now: Date, lastStage: string | null, how: HowTheyGotThere = 'said'): { heading: string; reason: string } {
  const endDay = end ? theDayInWords(end, now) : null;
  switch (g) {
    case 'likely':
      return { heading: `Likely by ${endDay}`, reason: `Each of these has proof or a colleague's confirmation, a date on or before ${endDay}, and word about it in the last week.` };
    case 'possible':
      return {
        heading: 'Possible',
        reason: endDay
          ? `Each of these is still open, but is missing proof, a date on or before ${endDay}, or word about it in the last week.`
          : 'Each of these is still open. This check-in has no end date, so none can be said to be likely before the end.',
      };
    case 'next-quarter':
      return { heading: end && isTheEndOfAQuarter(end) ? 'Next quarter' : `After ${endDay}`, reason: `The date given for each of these is after ${endDay}, when this check-in ends.` };
    case 'cooling':
      return { heading: 'Cooling', reason: 'Nobody has spoken about these in the last week, and nobody has said what happens next.' };
    case 'cold':
      return { heading: 'Stalled', reason: `The customer has not answered for ${STALLED_AFTER_WORKING_DAYS} working days or more, as said in a check-in, and nobody has said since that they answered.` };
    case 'said-won':
    {
      const at = lastStage ?? 'won';
      return {
        heading: `Said to be ${at.toLowerCase()}, not shown yet`,
        reason: `Somebody said each of these was ${at.toLowerCase()}, in their own words. Nothing has been shown to back them yet, so they are not counted as ${at.toLowerCase()}.`,
      };
    }
    case 'won':
    {
      /* "Somebody reported each of these at Won" was said of a deal the lead added on the board, which nobody reported. */
      const at = lastStage ? `${lastStage}, the last stage` : 'the last stage';
      return {
        heading: lastStage ?? 'Won',
        reason: how === 'on the board'
          ? `Each of these was put at ${at}, on the board.`
          : how === 'both'
            ? `Each of these is at ${at}. Some were reported in a check-in, and some were put there on the board.`
            : `Somebody reported each of these at ${at}.`,
      };
    }
  }
}

/** Said under the grid, so nobody reads a group as more than it is. */
export const NO_CRITERIA_ARE_CHECKED = 'Nothing on record says what a deal must show at each stage, so no group here says whether a criterion is met.';
export const NO_DEAL_IS_COLD = 'No deal is put under Cold, because nothing on record counts how many times a customer was followed up without a reply, so the stall rule cannot be applied.';
/** The stall rule, said under the grid (A4). */
export const THE_STALL_RULE = `A deal is stalled when a check-in says the customer has not answered and ${STALLED_AFTER_WORKING_DAYS} working days have passed, with nothing said since that they answered.`;
export const NO_END_DATE = 'This check-in has no end date, so no deal can be said to be likely by the end, or to fall after it.';

/**
 * The deal grid with each row's `group` and `groupSays`, and the section's `groups` and `groupsNote`. Only on
 * a sales board's deal grid; every other section is returned as it was.
 */
/**
 * A DELIVERY OF STOCK IS NOT A SALE (night quality run 1, problem 7). The person who runs the stock sent kits out on
 * numbered delivery notes, and the board listed them under Won ("Kisii, DN-1231"), so "8 deals were reported at Won"
 * counted stock moving between the team's own people. A row whose name or line is a delivery note or a dispatch keeps
 * its place on the grid as a delivery, and no deal count, group or total reads it.
 */
const A_DISPATCH = /\bDN-?\s?\d+\b|\bdelivery notes?\b|\bdispatch(?:ed|es|ing)?\b|\bstock count\b/i;
export function isADispatchNotADeal(r: Pick<AServedRecord, 'name' | 'said'>): boolean {
  return A_DISPATCH.test(`${r.name ?? ''} ${r.said ?? ''}`);
}
export const A_DISPATCH_SAYS = 'This is stock sent out on a delivery note, not a sale, so it is not counted as a deal.';

export function eachDealInItsGroup(kind: KindOfWork | null, sections: AServedSection[] | null | undefined, end: Date | null, now: Date): AServedSection[] | null | undefined {
  if (!isASalesKind(kind) || !Array.isArray(sections)) return sections;
  const endKey = end ? dayKey(end) : null;
  return sections.map((sec: any) => {
    if (!Array.isArray(sec.rows) || !sec.rows.some((r: AServedRecord) => r.kind === 'deal')) return sec;
    const stages: string[] = Array.isArray(sec.stages) ? sec.stages : [];
    const lastStage = stages.length ? stages[stages.length - 1] : null;
    const rows = sec.rows.map((r: any) => {
      if (r.kind === 'deal' && isADispatchNotADeal(r)) return { ...r, kind: 'delivery', groupSays: A_DISPATCH_SAYS };
      if (r.kind !== 'deal') return r;
      const f = theFacts(r, lastStage, now);
      const group = theGroup(f, endKey);
      /*
       * A DEAL IS WON ONLY WITH PROOF OR A COLLEAGUE'S OR THE LEAD'S CONFIRMATION, ON EVERY READER'S BOARD (night quality run 2). Collins's own
       * board showed "eleven" and "The group orders six" as Won while the lead's grid said "Said to be won, not shown yet". The stage a
       * reader sees is filled in here, from the record; the stage as said stays on the row for the lead's own edit.
       */
      return { ...r, group, groupSays: whyThisDealIsHere(f, now), ...(group === 'said-won' ? { stageSays: `Said to be ${(lastStage ?? 'won').toLowerCase()}, not shown yet` } : {}) };
    });
    const groups = ORDER
      .map((g) => ({ g, ids: rows.filter((r: any) => r.group === g).map((r: any) => r.id) }))
      .filter((x) => x.ids.length)
      .map((x) => {
        const onBoard = rows.filter((r: any) => x.ids.includes(r.id)).map((r: any) => theFacts(r, lastStage, now).addedOnTheBoard);
        const how: HowTheyGotThere = onBoard.every(Boolean) ? 'on the board' : onBoard.some(Boolean) ? 'both' : 'said';
        return { group: x.g, ...headingAndReason(x.g, end, now, lastStage, how), rowIds: x.ids };
      });
    const groupsNote = [NO_CRITERIA_ARE_CHECKED, THE_STALL_RULE, ...(endKey ? [] : [NO_END_DATE])];
    return { ...sec, rows, groups, groupsNote };
  });
}
