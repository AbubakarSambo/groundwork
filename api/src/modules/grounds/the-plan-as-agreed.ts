import { theAimItself } from '../board/an-aim-is-a-sentence-about-somebody';

/**
 * THE PLAN, AS AGREED (Hafsah, 18 October 2026: "Plan section: only if the prototype shows one; otherwise leave it."). The
 * prototype's full Context page has "The plan, as agreed", each line what, who and when ("10 new leads a week", "Samuel, Weekly";
 * "Quotes followed up within 48h", "Everyone, Ongoing"). Built only from what the record holds as the plan, never invented:
 *
 *  - a plan card the lead confirmed (a target or a commitment it wrote);
 *  - a target that belongs to one person and comes round on a cadence ("10 new leads a week", Kevin, Weekly);
 *  - a team target that says each person does it, on a cadence ("each rep to open 10 new leads each week"), as Everyone's.
 *
 * Read from the targets and commitments this reader is already served, so it shows nobody a number they could not read. With
 * nothing on record, there is no line, and the page leaves the section out (the prototype has no empty wording for it).
 */
export interface APlanLine { id: string; what: string; who: string; when: string }

const CADENCE: [RegExp, string][] = [
  [/\b(?:daily|every\s+day|each\s+day|a\s+day|per\s+day)\b/i, 'Daily'],
  [/\b(?:weekly|every\s+week|each\s+week|a\s+week|per\s+week)\b/i, 'Weekly'],
  [/\b(?:monthly|every\s+month|each\s+month|a\s+month|per\s+month)\b/i, 'Monthly'],
  [/\b(?:quarterly|every\s+quarter|each\s+quarter|a\s+quarter|per\s+quarter|this\s+quarter)\b/i, 'Quarter'],
];
const EACH_OF_THEM = /\b(?:each|every)\s+(?:rep|person|member|team\s+member|one|seller|salesperson|of\s+(?:us|them|you))\b|\beveryone\b/i;

export function theCadenceIn(text: string): string | null {
  for (const [re, word] of CADENCE) if (re.test(text)) return word;
  return null;
}

const first = (name: string | null | undefined) => String(name ?? '').trim().split(/\s+/)[0] || null;

export function thePlanAsAgreed(input: {
  targets: readonly { id?: string; name: string; target: number | null; ownerParticipantId?: string | null; dueOn?: string | Date | null }[];
  commitments: readonly { id: string; participantId: string | null; text: string; whenSaid?: string | null }[];
  /** The ids of rows a confirmed plan card wrote. */
  confirmed: ReadonlySet<string>;
  nameOf: (participantId: string) => string | null;
  meId: string | null;
}): APlanLine[] {
  const who = (pid: string | null | undefined) => (!pid ? 'Everyone' : pid === input.meId ? 'You' : (first(input.nameOf(pid)) ?? 'Somebody'));
  const out: APlanLine[] = [];
  for (const t of input.targets) {
    const name = String(t.name ?? '').trim();
    if (!name) continue;
    const cadence = theCadenceIn(name);
    const fromACard = !!t.id && input.confirmed.has(t.id);
    const mine = !!t.ownerParticipantId && !!cadence;
    const everyone = !t.ownerParticipantId && !!cadence && EACH_OF_THEM.test(name);
    if (!fromACard && !mine && !everyone) continue;
    const short = theAimItself(name, t.target ?? null) ?? name;
    const what = typeof t.target === 'number' && !new RegExp(`\\b${t.target}\\b`).test(short) ? `${t.target} ${short}` : short;
    const due = t.dueOn ? new Date(t.dueOn) : null;
    const when = cadence ?? (due && !Number.isNaN(due.getTime()) ? `By ${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(due)}` : 'Ongoing');
    out.push({ id: `t-${t.id ?? out.length}`, what: what.charAt(0).toUpperCase() + what.slice(1), who: who(t.ownerParticipantId), when });
  }
  for (const c of input.commitments) {
    if (!input.confirmed.has(c.id)) continue;
    const text = String(c.text ?? '').trim();
    if (!text) continue;
    out.push({ id: `c-${c.id}`, what: text.charAt(0).toUpperCase() + text.slice(1), who: who(c.participantId), when: theCadenceIn(text) ?? (c.whenSaid?.trim() || 'Ongoing') });
  }
  return out;
}
