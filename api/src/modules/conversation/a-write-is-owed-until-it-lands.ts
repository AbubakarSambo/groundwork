/**
 * A WRITE TO THE RECORD IS OWED UNTIL IT LANDS (Hafsah, 1 November 2026: "a failed model call that writes the record or the assessment
 * is retried, and if it still fails, it's flagged and retried later, never just logged and lost").
 *
 * WHY. On the assessment test's setup, one network blip failed the record (model call 38) and the promise read that the targets wait
 * behind (model call 39). Each was logged once and never asked again, so the lead's board said "No targets set yet" about the two
 * targets she had just given, and 21 of the run's failures came from that one second.
 *
 * HOW. Every writer of the record or the assessment runs through `writeOrOwe`. The model call itself already tries again when it is
 * busy or the line dropped (anthropic.service.ts, worthWaitingOut). If the write still fails, the check-in keeps a stored note of what
 * it owes (`CheckIn.writesOwed`, never only a log line), and the scheduled pass (TheOwedWritesCron) runs it again, waiting longer each
 * time, until it lands. Pages read the record and the assessment, so they show it as soon as it does: the assessment's retry says
 * ASSESSMENT_READY again, which rebuilds the board and the report.
 *
 * ONE PATH FOR ALL OF THEM. The steps are named here, and the pass knows how to run each one again from what was kept with it.
 */

/** The writes a check-in can owe. */
export type AnOwedStep = 'the record' | 'the aims and expectations' | 'the assessment';

export interface AnOwedWrite {
  step: AnOwedStep;
  /** How many times it has been tried and failed. */
  tries: number;
  firstFailedAt: string;
  lastError: string;
  /** When the scheduled pass may try it again. */
  nextTryAt: string;
  /** What the step needs to run again that is not on the record (setup's conversation, how the conversation ended). */
  input?: unknown;
}

/** How long the pass waits before each new try, in minutes; after the last, once a day, for as long as it is owed. */
export const THE_WAITS_BETWEEN_TRIES_MIN = [5, 15, 60, 180, 720] as const;
const A_DAY_MIN = 24 * 60;

export function whenToTryAgain(tries: number, from: Date): Date {
  const wait = THE_WAITS_BETWEEN_TRIES_MIN[tries - 1] ?? A_DAY_MIN;
  return new Date(from.getTime() + wait * 60_000);
}

/** The writes a check-in owes, read from its column. */
export function theWritesOwedIn(column: unknown): AnOwedWrite[] {
  return Array.isArray(column) ? (column as AnOwedWrite[]).filter((w) => w && typeof w.step === 'string') : [];
}

type Db = { checkIn: { findUnique: (a: any) => Promise<any>; update: (a: any) => Promise<any> } };

async function owedOn(prisma: Db, checkInId: string): Promise<AnOwedWrite[]> {
  const row = await prisma.checkIn.findUnique({ where: { id: checkInId }, select: { writesOwed: true } as any }).catch(() => null);
  return theWritesOwedIn(row?.writesOwed);
}

/** The step is owed: kept on the check-in with the error and the next time to try. A step already owed counts one more try. */
export async function owe(prisma: Db, checkInId: string, step: AnOwedStep, err: unknown, input?: unknown, now: Date = new Date()): Promise<AnOwedWrite> {
  const owed = await owedOn(prisma, checkInId);
  const before = owed.find((w) => w.step === step);
  const tries = (before?.tries ?? 0) + 1;
  const write: AnOwedWrite = {
    step,
    tries,
    firstFailedAt: before?.firstFailedAt ?? now.toISOString(),
    lastError: String((err as any)?.message ?? err ?? 'it failed').slice(0, 300),
    nextTryAt: whenToTryAgain(tries, now).toISOString(),
    ...(input !== undefined ? { input } : before?.input !== undefined ? { input: before.input } : {}),
  };
  await prisma.checkIn.update({ where: { id: checkInId }, data: { writesOwed: [...owed.filter((w) => w.step !== step), write] as any } as any });
  return write;
}

/** The step landed: nothing of it is owed any more. */
export async function paid(prisma: Db, checkInId: string, step: AnOwedStep): Promise<void> {
  const owed = await owedOn(prisma, checkInId);
  if (!owed.some((w) => w.step === step)) return;
  const left = owed.filter((w) => w.step !== step);
  await prisma.checkIn.update({ where: { id: checkInId }, data: { writesOwed: (left.length ? left : null) as any } as any });
}

/**
 * RUN A WRITE, AND OWE IT IF IT FAILS. `run` throws when its model call failed (anthropic.extract throws once its own tries are
 * spent). True when it landed. Never throws: the conversation it belongs to is finished either way.
 */
export async function writeOrOwe(
  prisma: Db,
  checkInId: string,
  step: AnOwedStep,
  run: () => Promise<unknown>,
  input?: unknown,
  logger?: { warn: (m: string) => void },
): Promise<boolean> {
  try {
    await run();
    await paid(prisma, checkInId, step).catch(() => undefined);
    return true;
  } catch (err: any) {
    const kept = await owe(prisma, checkInId, step, err, input).catch(() => null);
    logger?.warn(`Check-in ${checkInId}: ${step} could not be written (${err?.message ?? err}); ${kept ? `owed, tried ${kept.tries} time(s), next at ${kept.nextTryAt}` : 'and it could not be marked as owed'}.`);
    return false;
  }
}
