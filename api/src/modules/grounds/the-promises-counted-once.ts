import { thePromisesAsTheRecordKeepsThem } from './a-promise-said-done-is-read-the-same-everywhere';
import { onePromiseOneState, type APromiseAndItsState } from './your-board';

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
  const asKept = await thePromisesAsTheRecordKeepsThem(prisma, ((commitments as any[]) ?? []), ((ownToDos as any[]) ?? []));
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
