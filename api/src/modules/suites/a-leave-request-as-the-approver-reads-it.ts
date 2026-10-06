import { leaveInWords } from './a-request-in-words';

/**
 * A LEAVE REQUEST, AS THE PERSON WHO DECIDES IT READS IT (decision 85, item 1; build step 7).
 *
 * Decision 85: "Sarah, Annual Leave, Oct 12 to 16, 5 working days, 18 days remaining, 2 other team
 * members already away, Sarah owns Project X milestone due Oct 15". Said here in full sentences, with
 * names, the way the prototype's leave board says it ("16 days left. Nobody else in Sales is off those
 * days." and "Brian is also off that day, so Sales would be two short."):
 *
 *   "Aisha asked for leave from Monday 12 October to Friday 16 October, which is 5 working days."
 *   "Aisha has 18 days left."
 *   "Brian and Neema are also off on some of those days, so Sales would be three short."
 *   "Miriam Wanjiku will stand in for Aisha."
 *   "Aisha owns “Project X milestone” on Sales, Q3, due on Thursday 15 October."
 *
 * Served to whoever already reads the request on the board: an admin, a lead of the person's team,
 * and whoever decides it. What the person owns is read for each reader (what-they-own-while-away.ts).
 */

const NUMBERS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const inWords = (n: number) => (n >= 0 && n <= 10 ? NUMBERS[n] : String(n));
const listed = (names: string[]) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

export interface TheApproversView {
  firstName: string;
  startsOn: string;
  endsOn: string;
  /** Working days it takes. */
  days: number;
  /** The kind of leave as a person says it ("annual leave"), or null when the organisation has set no kinds. */
  kindName?: string | null;
  daysLeft: number | null;
  team: string | null;
  /** First names of others in the team already off on any of those days. */
  alsoOff: string[];
  /** The most of them off on any one working day of the request; the names' count when left out. */
  busiest?: number;
  /** The stand-in's full name, when one was given. */
  standIn: string | null;
  /** What the person owns that falls in those days, each a full sentence. */
  owns: string[];
  /** Anything else to say, each a full sentence (questions asked and answered, rules that apply). */
  more?: string[];
}

/**
 * The people off, each once, by their first name, and by their full name where two of them share a first name, so "Amara and Amara
 * are also off" is never what an approver reads. `people` may name somebody twice (two stretches of leave); they are counted once.
 * `busiest` is the most of them off on any one working day of the request, which is how short the team would really be (with the
 * person asking, one more): four people off on different days of a week is not a team four short on any day.
 */
export function whoIsOffNamed(
  people: { id: string; first: string; full: string; startsOn?: Date; endsOn?: Date }[],
  request?: { startsOn: Date; endsOn: Date },
): { count: number; names: string[]; busiest: number } {
  /* In the order of their names, so the board and the queue say the same sentence whichever read comes first. */
  const once = [...new Map(people.filter((p) => p.first).map((p) => [p.id, p])).values()].sort((a, b) => a.first.localeCompare(b.first) || a.full.localeCompare(b.full) || a.id.localeCompare(b.id));
  const firsts = new Map<string, number>();
  for (const p of once) firsts.set(p.first, (firsts.get(p.first) ?? 0) + 1);
  const names = once.map((p) => ((firsts.get(p.first) ?? 0) > 1 ? p.full || p.first : p.first));
  return { count: once.length, names, busiest: request ? busiestDay(people.filter((p) => p.first), request) : once.length };
}

const DAY = 86_400_000;
/** The most people off on any one working day of the request (Monday to Friday; a request that is only a weekend counts every day). */
export function busiestDay(people: { id: string; startsOn?: Date; endsOn?: Date }[], request: { startsOn: Date; endsOn: Date }): number {
  let busiest = 0;
  let any = 0;
  for (const onlyWorkingDays of [true, false]) {
    for (let t = request.startsOn.getTime(); t <= request.endsOn.getTime(); t += DAY) {
      const weekday = new Date(t).getUTCDay();
      if (onlyWorkingDays && (weekday === 0 || weekday === 6)) continue;
      any += 1;
      const off = new Set(people.filter((p) => p.startsOn && p.endsOn && p.startsOn.getTime() <= t && p.endsOn.getTime() >= t).map((p) => p.id)).size;
      busiest = Math.max(busiest, off);
    }
    if (any) break;
  }
  return busiest;
}

/** How many names are said before the rest are counted: "Brian, Joy, Neema, Aisha, Kofi and 7 others". */
export const NAMES_SAID_BEFORE_COUNTING = 5;

/**
 * WHO ELSE IN THE TEAM IS OFF THOSE DAYS, SAID PLAINLY (the clash). Names the people, up to five, then counts the rest. For one day:
 * "Brian is also off that day, so Sales would be two short." For several days it says how short the team would be on the busiest:
 * "Imani, Kofi, Zainab and Zuri are also off on some of those days. On the busiest of them, Operations would be four short."
 * "Nobody else in Sales is off those days." when nobody is. Only names the board already shows to whoever reads it.
 */
export function theClashSaid(team: string, alsoOff: string[], oneDay: boolean, busiest: number = alsoOff.length): string {
  if (!alsoOff.length) return `Nobody else in ${team} is off ${oneDay ? 'that day' : 'those days'}.`;
  const rest = alsoOff.length - NAMES_SAID_BEFORE_COUNTING;
  const who = rest > 1 ? listed([...alsoOff.slice(0, NAMES_SAID_BEFORE_COUNTING), `${rest} others`]) : listed(alsoOff);
  const is = alsoOff.length === 1 ? 'is' : 'are';
  if (oneDay) return `${who} ${is} also off that day, so ${team} would be ${inWords(alsoOff.length + 1)} short.`;
  return `${who} ${is} also off on some of those days. On the busiest of them, ${team} would be ${inWords(busiest + 1)} short.`;
}

export function aLeaveRequestAsTheApproverReadsIt(v: TheApproversView): string[] {
  const name = v.firstName.trim() || 'This person';
  const oneDay = v.startsOn === v.endsOn;
  const what = leaveInWords(v.startsOn, v.endsOn);
  const asked = v.kindName ? `${v.kindName}${what.slice('leave'.length)}` : what;
  const out = [`${name} asked for ${asked}, which is ${v.days} working ${v.days === 1 ? 'day' : 'days'}.`];
  if (v.daysLeft != null) out.push(`${name} has ${v.daysLeft} ${v.daysLeft === 1 ? 'day' : 'days'}${v.kindName ? ` of ${v.kindName}` : ''} left.`);
  if (v.team) out.push(theClashSaid(v.team, v.alsoOff, oneDay, v.busiest));
  if (v.standIn) out.push(`${v.standIn} will stand in for ${name}.`);
  out.push(...v.owns, ...(v.more ?? []));
  return out;
}
