import { whenThesePromisesWereKept } from '../conversation/a-promise-said-done-is-kept';

/**
 * WHAT THE RECORD SAYS IS DONE IS READ AS DONE, ON EVERY PAGE THAT SHOWS THE PROMISE (browser test, 21 October, Kevin; first written
 * for the You board in the messages test, third run, item 4).
 *
 * Mercy said on Monday "I'll follow up with Joseph again", and on Wednesday "I called Joseph yesterday about the samples". The same
 * reading the lead's summary uses (a-promise-said-done-is-kept) marks an open promise kept, as served: nothing is written. The You board
 * read it this way and My work did not, so Kevin's "Call her tomorrow morning" was Kept on one and Late on the other. Both now read
 * their promises through here, and then through `onePromiseOneState` (your-board.ts), so a promise has one state wherever it is shown.
 *
 * Only the rows handed in are read, and they are already the reader's own, or the person's whose page a lead is reading.
 */
export async function thePromisesAsTheRecordKeepsThem<
  C extends { id: string; groundId: string; participantId: string | null; text: string; status: string | null; createdAt?: Date | string | null },
  O extends { id: string; groundId: string; participantId: string; text: string; status: string | null; kind: string | null; authoredBy: string | null; createdAt?: Date | string | null },
>(prisma: any, commitments: readonly C[], objectives: readonly O[]): Promise<{ commitments: C[]; objectives: (O & { statusChangedAt?: Date | string | null })[] }> {
  const openOnes = [
    ...commitments.filter((c) => c.status === 'UNKNOWN' && c.participantId && c.createdAt).map((c) => ({ id: c.id, groundId: c.groundId, participantId: c.participantId as string, text: c.text, createdAt: c.createdAt as Date | string })),
    ...objectives.filter((o) => (o.status ?? 'OPEN') === 'OPEN' && o.authoredBy === 'self' && ['COMMITMENT', 'TODO'].includes(o.kind ?? '') && o.createdAt).map((o) => ({ id: o.id, groundId: o.groundId, participantId: o.participantId, text: o.text, createdAt: o.createdAt as Date | string })),
  ];
  const keptSaid = openOnes.length ? await whenThesePromisesWereKept(prisma, openOnes).catch(() => new Map<string, Date>()) : new Map<string, Date>();
  return {
    commitments: commitments.map((c) => (keptSaid.has(c.id) ? { ...c, status: 'DONE', settledBy: 'SAID', settledAt: keptSaid.get(c.id) } : c)),
    objectives: objectives.map((o) => (keptSaid.has(o.id) ? { ...o, status: 'MET', statusChangedAt: keptSaid.get(o.id) } : o)),
  };
}
