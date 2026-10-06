import { howManyHaveAnswered } from '../reports/how-many-have-answered';
import type { TheActiveLine } from '../entry/the-anchor-served-shapes';

/**
 * THE "ACTIVE" LINE ON THE LEAD'S BOARD (docs/anchor-scenario.md, section 26; decision 98; request 149).
 *
 * "18/20 active · Groundwork has nudged the remaining 2." It is a status line, so Hafsah's own wording
 * overrides the house wording rule here. Counts only: no name, nothing anybody said.
 *
 * ACTIVE is the people who have answered the round that is open now, counted exactly as "N of M have
 * answered" counts them (nobody an admin has not let in, nobody away). TOTAL is those same people, the
 * lead included, and never more than 20. NUDGED is, of the people who have not answered, those Groundwork
 * has nudged since this round opened.
 */
export const THE_MOST_PEOPLE_AN_ANCHOR_CHECK_IN_HOLDS = 20;

export function theActiveLine(input: { answered: number; expected: number; nudgedOfThoseWhoHaveNot: number }): TheActiveLine {
  const total = Math.min(Math.max(input.expected, 0), THE_MOST_PEOPLE_AN_ANCHOR_CHECK_IN_HOLDS);
  const active = Math.min(Math.max(input.answered, 0), total);
  const remaining = total - active;
  const nudged = Math.min(Math.max(input.nudgedOfThoseWhoHaveNot, 0), remaining);
  const head = `${active}/${total} active`;
  let line: string;
  if (remaining === 0) line = `${head}.`;
  else if (nudged === remaining) line = `${head} · Groundwork has nudged the remaining ${remaining}.`;
  else if (nudged === 0) line = `${head} · Groundwork has not nudged the remaining ${remaining} yet.`;
  else line = `${head} · Groundwork has nudged ${nudged} of the remaining ${remaining}.`;
  return { active, total, nudged, line };
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
