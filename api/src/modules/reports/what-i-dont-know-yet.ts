import { theOwedThingAskedPlainly } from '../conversation/each-owed-thing-asked-plainly';
import { ASK_TWICE_THEN_LET_IT_GO } from '../conversation/what-a-check-in-owes';

/**
 * WHAT I DON'T KNOW YET (screen match; team-report.jpg and every check-in's team report: "Things Groundwork can’t
 * tell from what it has, and what it will ask next").
 *
 * Read from the record, never from a model: each `CheckInGap` still open in this check-in, which is something a
 * check-in asked a person for and did not get. What happens next is what the conversation does with that gap:
 * asked once, it is asked again in a later check-in; asked twice, it is let go so nobody is pressed
 * (`ASK_TWICE_THEN_LET_IT_GO`), and the lead is told they could ask themselves.
 *
 * WHO READS IT. Whoever runs the check-in, as the board's "still unanswered" (board.service.ts, `stillUnanswered`):
 * a gap is never a mark against anybody, and a team member never reads another person's gaps. The caller serves it
 * to nobody else. The stored `what` is the engine's own working note and goes nowhere: only the plain question that
 * was owed is served.
 */

export interface AGapOnRecord {
  participantId: string;
  what: string;
  firstRound: number | null;
  asked: number;
  certain: boolean | null;
}

export interface SomethingIDontKnowYet {
  /** The question that was put, in plain words, or "Something the check-in asked". */
  title: string;
  /** What is known about it, and what happens next, in full sentences. */
  says: string;
}

export function whatIDontKnowYet(
  gaps: AGapOnRecord[],
  sessionNumber: number,
  nameOf: (participantId: string) => string | null,
): SomethingIDontKnowYet[] {
  return gaps
    .filter((g) => (g.firstRound ?? 1) <= sessionNumber)
    .sort((a, b) => (a.firstRound ?? 1) - (b.firstRound ?? 1))
    .map((g) => {
      const name = nameOf(g.participantId);
      const who = name ?? 'a colleague';
      const theyHave = name ? `${name} has` : 'they have';
      const them = name ?? 'them';
      const question = theOwedThingAskedPlainly(String(g.what ?? ''));
      const n = g.firstRound ?? 1;
      const askedOnce = g.asked < ASK_TWICE_THEN_LET_IT_GO;
      const known = g.certain === false
        ? `Groundwork asked ${who} this in check-in ${n}, and nothing on record can confirm the answer yet.`
        : askedOnce
          ? `Groundwork asked ${who} this in check-in ${n}, and ${theyHave} not answered it yet.`
          : `Groundwork asked ${who} this in check-in ${n} and once more since, and ${theyHave} not answered it yet.`;
      const next = askedOnce
        ? 'They’ll be asked again in a later check-in.'
        : `It won’t be asked again. You could ask ${them} yourself.`;
      return { title: question ? `“${question}”` : 'Something the check-in asked', says: `${known} ${next}` };
    });
}

/** The line under the heading when nothing is open. */
export const NOTHING_IS_WAITING_FOR_AN_ANSWER = 'Nothing Groundwork asked for in this check-in is still waiting for an answer.';
