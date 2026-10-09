import { howManyHaveAnswered } from '../reports/how-many-have-answered';
import type { TheActiveLine } from '../entry/the-anchor-served-shapes';

/**
 * THE "ACTIVE" LINE ON THE LEAD'S BOARD (docs/anchor-scenario.md, section 26; decision 98; request 149).
 *
 * Said as a sentence: "Three of the five have checked in this week, and Groundwork has reminded the two who have not." Counts only: no name, nothing
 * anybody said.
 *
 * ACTIVE is the people who have answered the round that is open now, counted exactly as "N of M have
 * answered" counts them (nobody an admin has not let in, nobody away). TOTAL is those same people, the
 * lead not among them (decision 121, item 4), and never more than 20. NUDGED is, of the people who have not answered, those Groundwork
 * has nudged since this round opened.
 */
export const THE_MOST_PEOPLE_AN_ANCHOR_CHECK_IN_HOLDS = 20;

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const say = (n: number) => (n <= 10 ? WORDS[n] : String(n));
const capital = (t: string) => `${t.charAt(0).toUpperCase()}${t.slice(1)}`;

/**
 * THE LINE, AS ONE PLAIN SENTENCE (B-089, screens requests 202 and 204). It was "0/3 active · Groundwork has not nudged the remaining 3 yet.", a
 * fraction and a dot joining pieces. Now: "None of the three has checked in this week, and Groundwork has not reminded them yet." It still counts
 * people and names nobody (an admin who only reads is served it too). `active`, `total` and `nudged` are served as before.
 */
export function theActiveLine(input: { answered: number; expected: number; nudgedOfThoseWhoHaveNot: number }): TheActiveLine {
  const total = Math.min(Math.max(input.expected, 0), THE_MOST_PEOPLE_AN_ANCHOR_CHECK_IN_HOLDS);
  const active = Math.min(Math.max(input.answered, 0), total);
  const remaining = total - active;
  const nudged = Math.min(Math.max(input.nudgedOfThoseWhoHaveNot, 0), remaining);
  const theOnes = remaining === total ? 'them' : remaining === 1 ? 'the one' : `the ${say(remaining)}`;
  const tail = remaining === 0 ? ''
    : nudged === remaining ? `, and Groundwork has reminded ${theOnes}${remaining === total ? '' : remaining === 1 ? ' who has not' : ' who have not'}`
      : nudged === 0 ? `, and Groundwork has not reminded ${theOnes} yet`
        : `, and Groundwork has reminded ${say(nudged)} of the ${say(remaining)} who have not`;
  let head: string;
  if (total === 0) head = 'Nobody is in this check-in yet';
  else if (total === 1) head = active === 1 ? 'The one person has checked in this week' : 'The one person has not checked in this week';
  else if (remaining === 0) head = `${total === 2 ? 'Both people have' : `All ${say(total)} people have`} checked in this week`;
  else if (active === 0) head = `${total === 2 ? 'Neither of the two has' : `None of the ${say(total)} has`} checked in this week`;
  else head = `${capital(say(active))} of the ${say(total)} ${active === 1 ? 'has' : 'have'} checked in this week`;
  return { active, total, nudged, line: `${head}${tail}.` };
}

/** Reads the record: who answered the open round, and which of the rest were nudged since it opened. Writes nothing. */
export async function theActiveLineFor(prisma: any, groundId: string, openRound: number, roundOpenedAt: Date | null): Promise<TheActiveLine> {
  const counted = await howManyHaveAnswered(prisma, groundId, openRound);
  const waiting: string[] = counted.waitingOn ?? [];
  const rows: { id: string; lastNudgedAt: Date | null }[] = waiting.length
    ? await prisma.groundParticipant.findMany({ where: { id: { in: waiting } }, select: { id: true, lastNudgedAt: true } })
    : [];
  const nudged = rows.filter((r) => r.lastNudgedAt && (!roundOpenedAt || r.lastNudgedAt.getTime() >= roundOpenedAt.getTime())).length;
  return theActiveLine({ answered: counted.answered, expected: counted.expected, nudgedOfThoseWhoHaveNot: nudged });
}
