/**
 * WHAT A PARTICIPANT IS TOLD ABOUT THIS CHECK-IN: THE SITUATION AND THE GOALS, NEVER THE INSTRUCTION.
 *
 * Hafsah, 20 September 2026, looking at a participant's page: "the about-the-check-in is way too
 * long and pulling direct words." Under "About this check-in" the person read the lead's whole
 * brief, verbatim - including "Do not begin by asking them to define their goals", "Follow up on
 * their answers; probe what is unclear", "Pay attention to the difference between what they say they
 * want and what their behaviour suggests". Those sentences are the lead telling the product how to
 * interview this person. The person was reading them before their first answer.
 *
 * The block exists for a fair reason: nobody should be read against a target they were never shown.
 * That reason covers the SITUATION and the GOALS. It does not cover the interviewing instructions,
 * and the lead's own words about the person are the lead's, not a shared fact.
 *
 * So a participant gets: the sentences of the brief that describe the situation (declaratives), the
 * goals that apply to them, and nothing that tells anybody what to do. Decided in code: an
 * imperative is an imperative whatever it is about. The lead still sees their full brief on Setup
 * and Context.
 */

/* A sentence that tells somebody what to do. The verb comes first, or right after "please" / "then". */
const AN_INSTRUCTION =
  /^(?:please\s+|then\s+|also\s+|and\s+)?(?:do not|don't|never|always|help|ask|probe|follow|explore|pay|treat|find|discover|understand|make|get|use|check|look|surface|notice|interrogate|connect|record|note|capture|keep|start|begin|end|avoid|ensure|focus|push|press|challenge|compare|hold|tell|say|give|show|read|watch|listen|see|think|remember|try|consider|identify|establish|determine|confirm|clarify|track|by the end)\b/i;

/* "They should", "the person must", "you should" - an expectation of the reader written as a rule. */
const A_RULE_ABOUT_THEM = /\b(they|the person|you|participants?|people)\s+(should|must|need to|ought to|have to)\b/i;

/* A sentence addressed to the product about the person: "help the person", "the goal should emerge". */
const ABOUT_THE_INTERVIEW = /\b(the (?:goal|answer) should emerge|what they say (?:they want|as the answer)|their behaviour suggests|treat what they say|the interview|this conversation should|in the check-in|during the check-in)\b/i;

const sentencesOf = (text: string): string[] => (text ?? '').replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+/).filter(Boolean);

/** The situation as the brief describes it: declarative sentences only, at most three. */
export function theSituationIn(brief: string | null | undefined, max = 3): string | null {
  const kept = sentencesOf(brief ?? '').filter((s) => !AN_INSTRUCTION.test(s) && !A_RULE_ABOUT_THEM.test(s) && !ABOUT_THE_INTERVIEW.test(s));
  if (!kept.length) return null;
  return kept.slice(0, max).join(' ');
}

export interface AGoalTheyMaySee {
  name: string;
  target: number | null;
}

/**
 * The whole block for a participant: the situation, then the goals they may see, in one short
 * paragraph. `goals` is already filtered by whose-number-is-whose-business; this only says them.
 */
export function whatAParticipantIsToldAboutThis(brief: string | null | undefined, goals: AGoalTheyMaySee[]): string | null {
  const parts: string[] = [];
  const situation = theSituationIn(brief);
  if (situation) parts.push(situation);
  const named = (goals ?? []).filter((g) => g?.name?.trim());
  if (named.length) {
    const said = named
      .slice(0, 4)
      .map((g) => (g.target != null ? `${g.name.trim().replace(/[.]+$/, '')} (${g.target.toLocaleString('en-GB')})` : g.name.trim().replace(/[.]+$/, '')))
      .join('; ');
    parts.push(`${named.length === 1 ? 'The goal on this check-in' : 'The goals on this check-in'}: ${said}.`);
  }
  return parts.length ? parts.join(' ') : null;
}
