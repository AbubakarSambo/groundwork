/**
 * THE PICTURE GETS WHAT THE CONVERSATION GETS.
 *
 * Run 3, 20 Sep 2026: the conversation was handed "what does not add up" per person and put it to
 * them - Sani's late money, the maize yield, sales all on credit against a 35% cap all came out.
 * The synthesis was handed the raw entries and wrote "All participants are using their financed
 * assets"; the boards said "All are actively using the asset the loan was for". The better the
 * conversation got, the worse those sentences read, and the judge scored the reports down while the
 * conversations went up.
 *
 * Two moves, the same shape as the conversation's:
 *
 *   1. The synthesis is handed the product's own arithmetic, per person: the same thing counted
 *      differently across sessions, the lead's number against their own, the goal stated in session
 *      one that nothing since mentions. Facts, quoted, with the instruction to say so.
 *   2. A sentence that says "all", "every" or "everyone" about the people is a count the product
 *      cannot verify and the model has got wrong in four runs of four. It does not ship. Rule 15
 *      asked for this in words; this does it in code.
 */
import { whatDoesNotAddUp, type ADifference, type AThingOnRecord, type ATargetTheyHold } from '../conversation/what-does-not-add-up';

export interface APersonOnRecord {
  participantId: string;
  label: string;
  said: AThingOnRecord[];
  targets: ATargetTheyHold[];
}

/** The block the synthesis reads: per person, what the record itself says does not add up. */
export function whatDoesNotAddUpPerPerson(people: APersonOnRecord[], thisSession: number, onASalesCheckIn: { customers?: string[] | null; people?: string[]; roundUnit?: string | null } = {}): string {
  const lines: string[] = [];
  for (const p of people) {
    /* On a sales check-in, one customer's units are that deal's (Drop Access run 1, items 27 and 28; answer 7). */
    const diffs: ADifference[] = whatDoesNotAddUp({ said: p.said, thisSession, targets: p.targets, sessionsLeft: null, aiTurnsThisSession: [], customers: onASalesCheckIn.customers ?? null, people: onASalesCheckIn.people ?? [], roundUnit: onASalesCheckIn.roundUnit ?? null });
    if (!diffs.length) continue;
    lines.push(`${p.label}:`);
    for (const d of diffs.slice(0, 3)) lines.push(`  - ${d.kind}: ${d.lines.join(' ')}`);
  }
  if (!lines.length) return '';
  return (
    'WHAT DOES NOT ADD UP, PER PERSON. Worked out by the product from each person\'s own record; the words are theirs. ' +
    'For each person listed here, write one plain sentence that says both sides of it. Never smooth it over. Never turn it into "all are on track". ' +
    'Where a person is not listed, do not invent a gap for them.\n' +
    lines.join('\n') +
    '\n\n'
  );
}

/**
 * "All participants", "every borrower", "everyone is using the asset": the model's count, and wrong in
 * every run. The sentence comes out; the rest of the picture stands. "All of the N180m", "all fourteen
 * modules" are about things, not people, and stay.
 */
const A_COUNT_OF_THE_PEOPLE =
  /\b(all|every|everyone|everybody|each)\b(?:\s+(?:of\s+the|the|of|five|six|four|three|two)\b)?\s+(?:\w+\s+){0,2}?(participants?|business owners?|owners?|clients?|borrowers?|members?|people|persons?|reps?|parties|sales reps?|farmers?|team members?|respondents?|organisations?|organizations?)\b|\b(everyone|everybody)\s+(is|are|has|have|reports?|says?|agrees?|uses?)\b/i;

export function withoutUncountedAlls(picture: string): { text: string; cut: string[] } {
  const sentences = (picture ?? '').split(/(?<=[.!?])\s+/).filter((s) => s.trim());
  const cut = sentences.filter((s) => A_COUNT_OF_THE_PEOPLE.test(s));
  if (!cut.length) return { text: picture, cut };
  const kept = sentences.filter((s) => !cut.includes(s)).join(' ').trim();
  return { text: kept, cut };
}
