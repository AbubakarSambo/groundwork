import { Logger } from '@nestjs/common';

/**
 * A SCHEDULED JOB RUNS ONCE FOR ITS TIME, HOWEVER MANY COPIES OF THE API ARE RUNNING (decision 74,
 * item 7).
 *
 * Every copy of the API has the same timers, so at 02:00 every copy starts the same nightly job: two
 * copies would send every email twice and make every model call twice. The advisory lock
 * (`PrismaService.withAdvisoryLock`) only keeps two runs from overlapping, and only when the lock and
 * the unlock happen to go through the same pooled connection; it does not stop a second copy whose
 * timer fires a moment after the first has finished.
 *
 * So each run first claims its time slot in one `platform_settings` row per job,
 * `job.<name>.ran_for`, whose value is the slot it last ran for (the UTC day, the week or the hour).
 * The claim is a single statement: it writes the slot only if the row holds a different one. The copy
 * whose statement changed the row runs the job; every other copy finds the slot already claimed and
 * does nothing. No row grows: each job has one row, overwritten each time.
 *
 * If the claim cannot be made because the database is not answering, the job does not run, so
 * nothing is sent twice; it runs again at its next time. A stand-in database with no raw SQL, as in
 * the unit tests of each job, is not a database the API can run on, and the job simply runs.
 */
const logger = new Logger('OnceAcrossCopies');

export const JOB_RUN_KEY_PREFIX = 'job.';

export function jobRunKey(job: string): string {
  return `${JOB_RUN_KEY_PREFIX}${job}.ran_for`;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** The UTC day, for a job that runs once a day: "2026-10-02". */
export function theDay(now: Date = new Date()): string {
  return `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}`;
}

/** The UTC hour, for a job that runs once an hour: "2026-10-02T03". */
export function theHour(now: Date = new Date()): string {
  return `${theDay(now)}T${pad(now.getUTCHours())}`;
}

/** The week, named by its Monday in UTC, for a job that runs once a week: "week of 2026-09-28". */
export function theWeek(now: Date = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const sinceMonday = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - sinceMonday);
  return `week of ${theDay(d)}`;
}

/** Claims the slot for this copy. True only for the one copy whose statement wrote it. */
export async function claimTheSlot(prisma: any, job: string, slot: string): Promise<boolean> {
  const key = jobRunKey(job);
  const value = JSON.stringify(slot);
  const changed: number = await prisma.$executeRaw`
    INSERT INTO platform_settings (key, value, updated_at, updated_by)
    VALUES (${key}, ${value}::jsonb, now(), 'a scheduled job')
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at, updated_by = EXCLUDED.updated_by
    WHERE platform_settings.value IS DISTINCT FROM EXCLUDED.value`;
  return Number(changed) === 1;
}

/**
 * Runs `fn` only on the copy that claims this job's slot. Returns whether it ran here.
 */
export async function onceAcrossCopies(prisma: any, job: string, slot: string, fn: () => Promise<unknown>): Promise<boolean> {
  if (typeof prisma?.$executeRaw !== 'function') {
    await fn();
    return true;
  }
  let mine = false;
  try {
    mine = await claimTheSlot(prisma, job, slot);
  } catch (err: any) {
    logger.error(`The job "${job}" did not run for ${slot}, because its run could not be claimed: ${err?.message ?? err}. It runs again at its next time.`);
    return false;
  }
  if (!mine) {
    logger.debug(`The job "${job}" already ran for ${slot} on another copy of the API.`);
    return false;
  }
  await fn();
  return true;
}

/**
 * SPREADS ONE PIECE OF WORK PER ORGANISATION OVER TIME (decision 74, item 7). On the first night
 * nothing is stored yet for anybody, so a nightly job that makes one model call per organisation
 * would otherwise make all of them back to back. After each organisation whose work wrote something
 * (a model call, or a row), it waits `pauseMs` before the next. One whose record had not changed
 * cost nothing, so it does not wait.
 */
export const PAUSE_BETWEEN_ORGANISATIONS_MS = 20_000;

export async function oneOrganisationAtATime<T>(
  organisationIds: readonly string[],
  work: (organizationId: string) => Promise<T>,
  opts: { pauseMs?: number; didSomething?: (result: T) => boolean; wait?: (ms: number) => Promise<void> } = {},
): Promise<{ done: number; withWork: number }> {
  const pauseMs = opts.pauseMs ?? PAUSE_BETWEEN_ORGANISATIONS_MS;
  const didSomething = opts.didSomething ?? ((r: T) => (r as unknown) === 'built');
  const wait = opts.wait ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  let done = 0;
  let withWork = 0;
  for (let i = 0; i < organisationIds.length; i += 1) {
    const result = await work(organisationIds[i]);
    done += 1;
    if (didSomething(result)) {
      withWork += 1;
      if (i < organisationIds.length - 1 && pauseMs > 0) await wait(pauseMs);
    }
  }
  return { done, withWork };
}
