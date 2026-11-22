import { thePromisesAsTheRecordKeepsThem } from './a-promise-said-done-is-read-the-same-everywhere';
import { onePromiseOneState, type APromiseAndItsState } from './your-board';
import { theCommitmentsTheBoardReads } from './the-commitments-the-board-reads';

/**
 * A PERSON'S PROMISES, READ AND COUNTED ONCE, FOR EVERY PAGE (fix plan, pattern 1; quarter test, 28 October 2026).
 *
 * Joseph's My work read "17 of 18 promises kept" and his You page, the same day, "You said you would do 17 things. 4 done, 1 not done,
 * 12 still open." Mercy read "7 of 9" and "2 done, 2 not done". My work read the promises the record keeps (said done is done, a
 * commitment and the to-do they wrote for it are one promise), and the You page re-read the raw commitment rows on its own. Both, and
 * the self-review draft, now read the promises here, and count them with `thePromisesCounted`, so a promise has one state and a count
 * has one number wherever it is shown.
 *
 * Only the participants handed in are read, and they are the reader's own, or the person whose page a lead may read.
 */
export async function thePromisesOf(
  prisma: any,
  participantIds: readonly string[],
  labelOf: (groundId: string) => string,
  opts: { groundId?: string; now?: Date } = {},
): Promise<APromiseAndItsState[]> {
  if (!participantIds.length) return [];
  const inThem = { participantId: participantIds.length === 1 ? participantIds[0] : { in: [...participantIds] }, ...(opts.groundId ? { groundId: opts.groundId } : {}) };
  const [commitments, ownToDos] = await Promise.all([
    Promise.resolve(prisma.groundCommitment?.findMany?.({ where: inThem, orderBy: { createdAt: 'asc' } })).catch(() => []),
    Promise.resolve(prisma.personObjective?.findMany?.({
      where: { ...inThem, authoredBy: 'self', kind: { in: ['COMMITMENT', 'TODO'] } },
      select: { id: true, groundId: true, participantId: true, text: true, kind: true, status: true, statusChangedAt: true, authoredBy: true, dueSaid: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })).catch(() => []),
  ]);
  /* And the commitments kept only as record lines, which the board shows (the-commitments-the-board-reads.ts). */
  const all = await theCommitmentsTheBoardReads(prisma, participantIds, ((commitments as any[]) ?? []), { groundId: opts.groundId });
  const asKept = await thePromisesAsTheRecordKeepsThem(prisma, all as any[], ((ownToDos as any[]) ?? []));
  return onePromiseOneState(asKept.commitments as any, asKept.objectives as any, labelOf, opts.now ?? new Date()).sort((a, b) => a.t - b.t);
}

export interface PromisesCounted {
  /** Every promise they made themselves: a line the lead asked for is not theirs to count. */
  said: number;
  kept: number;
  notDone: number;
  open: number;
}

/** The one count of promises: what My work's tile, the You page's line and the self-review draft all say. */
export function thePromisesCounted(promises: readonly { status: string; explicit?: boolean | null }[]): PromisesCounted {
  const theirs = promises.filter((p) => p.explicit !== false);
  const kept = theirs.filter((p) => p.status === 'DONE').length;
  const notDone = theirs.filter((p) => p.status === 'NOT_DONE').length;
  return { said: theirs.length, kept, notDone, open: theirs.length - kept - notDone };
}

/**
 * WHAT HAPPENED TO WHAT THEY SAID THEY WOULD DO, IN ONE PLAIN SENTENCE (plan round 32: Brian's own My work read "0/2 promises kept this
 * month", a score on a person, from a count of its own). Said from the one count, everywhere it is said: My work and the You page.
 * "You said you would do 6 things. 2 were not done, and 4 are still open."
 */
export function whatHappenedToThePromises(c: PromisesCounted): string {
  if (!c.said) return 'Nothing you said you would do is on record yet.';
  const parts = [
    c.kept ? (c.kept === c.said ? (c.said === 1 ? 'It is done' : 'All of them are done') : `${c.kept} ${c.kept === 1 ? 'is' : 'are'} done`) : '',
    c.notDone ? `${c.notDone} ${c.notDone === 1 ? 'was' : 'were'} not done` : '',
    c.open ? (c.open === c.said ? (c.said === 1 ? 'It is still open' : 'All of them are still open') : `${c.open} ${c.open === 1 ? 'is' : 'are'} still open`) : '',
  ].filter(Boolean);
  const joined = parts.length <= 1 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
  return `You said you would do ${c.said === 1 ? 'one thing' : `${c.said} things`}. ${joined}.`;
}
