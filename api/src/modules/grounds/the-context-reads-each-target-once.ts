import { theTargetItSaysAgain, eachTargetOnce, type ATargetOnRecord } from '../board/a-target-said-again-is-that-target';
import { isASalesKind } from '../board/the-kind-of-work';

/**
 * THE CONTEXT TAB READS EACH TARGET ONCE (Hafsah, 18 October 2026: "Repeated targets in the Context tab: apply the board's fix
 * there too, so each target shows once.").
 *
 * The board already read each target once (a-target-said-again-is-that-target). The Context tab is served by the check-in's own
 * read (GET /grounds/:id), and it did not: Grace's Context listed Kevin's "The target is still 120 units by October 30th." under
 * him beside the team's 120, Joseph's "My main aim is still the 40 units Grace expects." and "My goal is the 40 units Grace
 * expects." beside his own 40, and Mercy's "I'm still aiming for 30 units with Tuskys Westgate." beside the 30 on record for
 * Tuskys Westgate. Muchemi's listed the Kamau filing twice, in two wordings with no number.
 *
 * THE SAME RULE, AT THE READ. Targets: eachTargetOnce, as the board. What each person is expected to do: an aim they said themselves
 * (a target or a goal, or a line that says it is their aim, goal or target; never one the lead set for them) whose number and the thing it counts are a target on
 * record, the team's or their own, is that target said again, and is left out of what they are expected to do; the target is
 * listed once, under Targets. Nothing is deleted.
 *
 * WHERE. Every check-in, except a sales check-in in an organisation whose Release 1 sales board is off: that one reads as it
 * did, as its board does.
 */
export function theContextReadsEachTargetOnce(kindOfWork: string | null | undefined, releaseOneIsOn: boolean): boolean {
  return releaseOneIsOn || !isASalesKind(kindOfWork ?? null);
}

const MONTHS = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const A_DAY = new RegExp(`\\b\\d{1,2}(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MONTHS}\\b|\\b${MONTHS}\\s+\\d{1,2}(?:st|nd|rd|th)?\\b`, 'gi');
/** The numbers said in a line, leaving out the day of a date ("by October 30th"). */
export function theNumbersSaid(text: string): number[] {
  const withoutDays = String(text ?? '').replace(A_DAY, ' ');
  return (withoutDays.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => Number(n.replace(/,/g, ''))).filter((n) => Number.isFinite(n) && n > 0);
}

const SAYS_IT_IS_AN_AIM = /\b(?:aim|aims|aiming|goal|goals|target|targets)\b/i;

export interface AnExpectation { text?: string | null; kind?: string | null; participantId?: string | null; authoredBy?: string | null }

/** Whether this expectation is only a target on record, the team's or its person's own, said again. */
export function isATargetSaidAgain(e: AnExpectation, targets: readonly ATargetOnRecord[]): boolean {
  /* Only what the person said themselves: an expectation the lead set for somebody is the lead's, and stays (decision 86, item 3). */
  if (e.authoredBy && e.authoredBy !== 'self') return false;
  const text = String(e.text ?? '');
  const anAim = e.kind === 'TARGET' || e.kind === 'GOAL' || SAYS_IT_IS_AN_AIM.test(text);
  if (!anAim) return false;
  return theNumbersSaid(text).some((n) => !!theTargetItSaysAgain({ name: text, target: n, ownerParticipantId: e.participantId ?? null }, targets));
}

/** The targets, each once, and each person's expectations without the targets said again. */
export function eachTargetOnceOnTheContextTab<T extends ATargetOnRecord, E extends AnExpectation>(targets: readonly T[], expectations: readonly E[]): { targets: T[]; expectations: E[] } {
  return {
    targets: eachTargetOnce(targets),
    expectations: expectations.filter((e) => !isATargetSaidAgain(e, targets)),
  };
}
