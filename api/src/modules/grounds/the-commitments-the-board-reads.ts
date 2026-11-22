import { theSameMeasure } from './a-dump-is-many-things';
import { cleanText } from '../reports/what-the-record-actually-holds';
import type { GroundCommitmentRow } from './your-board';

/**
 * THE COMMITMENTS THE BOARD READS, FOR EVERY PAGE THAT LISTS A PERSON'S PROMISES (release test, 21 November 2026, bug 50).
 *
 * Wairimu's board said, under her name in "Who owns what", that she made commitments in check-ins 1 and 2, while her You page said
 * "You have not said you would do anything in a check-in yet." The board reads two places a commitment is kept: the record's own
 * COMMITMENT lines, and the promises stored from a check-in (GroundCommitment). You, My work and Ask read only the second, so a
 * commitment kept only as a record line was on the board and nowhere else.
 *
 * Every reader of a person's promises now takes both, by the board's own rule: a record line that says the same as a stored promise
 * (theSameMeasure, the rule the board uses) is that promise, and the stored one is kept, because it carries the state. A record line
 * with no stored promise is an open promise, as the board shows it. A line the person disputed is left out, as on the board.
 *
 * Only the participants handed in are read, and they are the reader's own, or the person whose page a lead may read.
 */
export async function theCommitmentsTheBoardReads<C extends GroundCommitmentRow>(
  prisma: any,
  participantIds: readonly string[],
  stored: readonly C[],
  opts: { groundId?: string } = {},
): Promise<(C | GroundCommitmentRow)[]> {
  if (!participantIds.length) return [...stored];
  const lines: any[] = (await Promise.resolve(prisma.recordEntry?.findMany?.({
    where: {
      participantId: participantIds.length === 1 ? participantIds[0] : { in: [...participantIds] },
      type: 'COMMITMENT',
      disputedAt: null,
      ...(opts.groundId ? { participant: { groundId: opts.groundId } } : {}),
    },
    select: { id: true, participantId: true, text: true, createdAt: true, participant: { select: { groundId: true } } },
    orderBy: { createdAt: 'asc' },
  })).catch(() => [])) ?? [];
  const onlyOnTheRecord: GroundCommitmentRow[] = lines
    .map((l) => ({ id: l.id as string, groundId: l.participant?.groundId as string, participantId: l.participantId as string, text: cleanText(String(l.text ?? '')).trim(), createdAt: l.createdAt ?? null }))
    .filter((l) => l.groundId && l.text)
    .filter((l) => !stored.some((c) => c.participantId === l.participantId && c.groundId === l.groundId && theSameMeasure(cleanText(c.text ?? ''), l.text)))
    .map((l) => ({ ...l, whenSaid: null, status: 'UNKNOWN', settledBy: null, settledAt: null }));
  return [...stored, ...onlyOnTheRecord];
}
