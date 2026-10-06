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
  /** The stand-in's full name, when one was given. */
  standIn: string | null;
  /** What the person owns that falls in those days, each a full sentence. */
  owns: string[];
  /** Anything else to say, each a full sentence (questions asked and answered, rules that apply). */
  more?: string[];
}

export function aLeaveRequestAsTheApproverReadsIt(v: TheApproversView): string[] {
  const name = v.firstName.trim() || 'This person';
  const oneDay = v.startsOn === v.endsOn;
  const what = leaveInWords(v.startsOn, v.endsOn);
  const asked = v.kindName ? `${v.kindName}${what.slice('leave'.length)}` : what;
  const out = [`${name} asked for ${asked}, which is ${v.days} working ${v.days === 1 ? 'day' : 'days'}.`];
  if (v.daysLeft != null) out.push(`${name} has ${v.daysLeft} ${v.daysLeft === 1 ? 'day' : 'days'}${v.kindName ? ` of ${v.kindName}` : ''} left.`);
  if (v.team) {
    if (!v.alsoOff.length) out.push(`Nobody else in ${v.team} is off ${oneDay ? 'that day' : 'those days'}.`);
    else {
      const when = oneDay ? 'that day' : 'on some of those days';
      out.push(`${listed(v.alsoOff)} ${v.alsoOff.length === 1 ? 'is' : 'are'} also off ${when}, so ${v.team} would be ${inWords(v.alsoOff.length + 1)} short.`);
    }
  }
  if (v.standIn) out.push(`${v.standIn} will stand in for ${name}.`);
  out.push(...v.owns, ...(v.more ?? []));
  return out;
}
