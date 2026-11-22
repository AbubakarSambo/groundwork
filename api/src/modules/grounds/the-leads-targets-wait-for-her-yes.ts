import { flatten, numbersIn } from './a-plan-is-many-proposals';
import { anAimAsASentence } from '../board/an-aim-is-a-sentence-about-somebody';

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

/*
 * THE CARD READS EACH TARGET THE WAY THE BOARD DOES (final test, 22 November 2026). The card had its own sentence-maker and read "The
 * team’s target is 12,000,000 the teams hit a total revenue target of 12 million for the quarter.": it put the number before any name
 * that did not repeat the figure word for word. One function turns a stored target into a sentence, anAimAsASentence, for the board,
 * the check-in brief and this card, whatever shape the name has: a full sentence, a thing to do, or only what is counted.
 */
export function theTargetAsALine(t: ATargetToHold): string {
  return anAimAsASentence(t.name.trim(), { speaker: null, holder: t.personName ?? null, target: t.target });
}
