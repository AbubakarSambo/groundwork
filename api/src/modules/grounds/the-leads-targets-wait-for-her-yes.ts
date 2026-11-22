import { flatten, numbersIn } from './a-plan-is-many-proposals';
import { aThingToDoIsWhatItCounts } from '../board/an-aim-is-a-sentence-about-somebody';

/**
 * THE TARGETS FROM THE LEAD'S OWN WORDS WAIT FOR HER YES (Hafsah, 18 October 2026: "Targets: at the end of setup, one confirm card
 * lists the targets you took down; the lead taps right or corrects them before they go on record.").
 *
 * Until now the targets read from the lead's check-in went straight on the record (conversation.service extractExpectations: the
 * team's aims, and the numbers she gave each person). Now, on a sales check-in with Release 1's sales board on, each is kept as a
 * waiting proposal (PlanProposal, kind GOAL), the same path a plan's cards take, marked as coming from her check-in. The Context
 * tab shows them together as one card, "Waiting for you to confirm": Confirm puts them all on record, Edit corrects one, and Not
 * now keeps them all off it. Nothing is written to the targets until she confirms.
 *
 * Each is held with the sentence of hers that holds its number, so the confirm can check it again against her own words, as a
 * plan's card is checked against the plan. A target added on the board by the lead, a target she confirms in the Context
 * conversation, and a person's own promise, are unchanged.
 */
export const FROM_YOUR_CHECK_IN = 'your check-in';

export interface ATargetToHold { name: string; target: number | null; ownerParticipantId: string | null; personName: string | null }

/** Her sentences, from her own turns. */
function sentencesOf(turns: readonly string[]): string[] {
  return turns
    .flatMap((t) => String(t ?? '').replace(/\s+/g, ' ').split(/(?<=[.!?])\s+(?=[A-Z0-9“"])/))
    .map((s) => s.trim())
    .filter((s) => s.length >= 3);
}

/** The sentence of hers this target comes from: the one that holds its number, or, with no number, the one that shares most of its words. */
export function theWordsItCameFrom(t: ATargetToHold, turns: readonly string[]): string | null {
  const said = sentencesOf(turns);
  if (typeof t.target === 'number') {
    const holds = said.filter((s) => numbersIn(s).has(t.target as number));
    if (!holds.length) return null;
    const words = new Set(flatten(t.name).split(' ').filter((w) => w.length > 3));
    return [...holds].sort((a, b) => flatten(b).split(' ').filter((w) => words.has(w)).length - flatten(a).split(' ').filter((w) => words.has(w)).length)[0];
  }
  const words = new Set(flatten(t.name).split(' ').filter((w) => w.length > 3));
  const scored = said.map((s) => ({ s, n: flatten(s).split(' ').filter((w) => words.has(w)).length })).sort((a, b) => b.n - a.n);
  return scored[0] && scored[0].n >= 2 ? scored[0].s : null;
}

const ended = (s: string) => (/[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);
const lower = (s: string) => (/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);

/** The line the lead reads for one target on the card, in a full sentence. */
export function theTargetAsALine(t: ATargetToHold): string {
  const name = t.name.trim().replace(/[.\s]+$/, '');
  const whose = t.personName ? `${t.personName}’s` : 'The team’s';
  /* "Sell 8 freezers per week" is "8 freezers per week", read the way the board reads it: the card read "Brian Otieno’s target is 8 sell 8
     freezers per week." (Drop Access re-read, 22 November). */
  const thing = aThingToDoIsWhatItCounts(name);
  /* A name the extraction wrote as a sentence ("Kevin sells 40 water dispensers by 30 October") is kept as she would read it. */
  const isASentence = thing === name && /^[A-Z][a-z]/.test(name) && name.split(/\s+/).length > 5
    && (typeof t.target !== 'number' || new RegExp(`\\s${t.target}\\b`).test(name));
  if (isASentence) return typeof t.target === 'number' ? `${ended(name)} The number is ${t.target.toLocaleString('en-GB')}.` : ended(name);
  if (typeof t.target !== 'number') return `${whose} target is ${lower(thing)}.`;
  const startsWithTheNumber = new RegExp(`^${t.target}\\b`).test(thing);
  return startsWithTheNumber ? `${whose} target is ${lower(thing)}.` : `${whose} target is ${t.target.toLocaleString('en-GB')} ${lower(thing)}.`;
}
