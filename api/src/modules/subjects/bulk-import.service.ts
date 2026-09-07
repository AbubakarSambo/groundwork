import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ImportJobState, Prisma } from '@prisma/client';
import { SubjectsService, SubjectPush } from './subjects.service';
import { quietPeriodFor, quietUntil } from './detection-holds-its-tongue';
import { MAX_BATCH } from './how-heavy-a-batch-may-be';

/* The two limits live in their own leaf file - see how-heavy-a-batch-may-be.ts for why that
   matters more than it looks. Re-exported so existing importers are unaffected. */
export { MAX_BATCH, MAX_BATCH_BYTES } from './how-heavy-a-batch-may-be';

/**
 * A BULK IMPORT SKIPS AND REPORTS. IT DOES NOT HALT AND IT DOES NOT ROLL BACK.
 *
 * Four thousand objectives arrive and row 2,847 is malformed. The three options are not equal:
 *
 *   HALT. One bad row blocks the other 3,999 for however long it takes somebody to notice, and the
 *   customer's data is half-loaded in a way that looks identical to a crash.
 *
 *   ROLL BACK. Same, plus their entire sync has to be re-run for a typo, and the second attempt
 *   fails on the same row.
 *
 *   SKIP AND REPORT. They get 3,999 working subjects and a specific list of what to fix.
 *
 * The third, and the list is the part that matters. "3,999 succeeded" with no way to find the other
 * one is worse than a plain error, because it looks like it was handled.
 */
/**
 * How long without a heartbeat before a job counts as abandoned.
 *
 * The heartbeat is written every fifty rows, so the gap between two of them is however long fifty
 * upserts take against the customer's data. Generous on purpose: taking a job that is merely slow
 * puts a second writer on it, which is the failure this exists to prevent, while waiting a few
 * extra minutes to resume a genuinely dead one costs nothing anybody notices.
 */
export const HEARTBEAT_STALE_MS = 10 * 60_000;

@Injectable()
export class BulkImportService {
  private readonly logger = new Logger(BulkImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subjects: SubjectsService,
  ) {}

  async start(organizationId: string, sourceSystem: string, rows: SubjectPush[]) {
    if (!Array.isArray(rows)) throw new BadRequestException('Expected an array of subjects.');
    if (!rows.length) throw new BadRequestException('Nothing to import.');
    if (rows.length > MAX_BATCH) {
      throw new BadRequestException(`At most ${MAX_BATCH} subjects per request. Split the batch.`);
    }

    const job = await this.prisma.importJob.create({
      /* The rows are stored WITH the job, so the work no longer depends on this process surviving. */
      data: {
        organizationId, sourceSystem, kind: 'subjects',
        total: rows.length, state: ImportJobState.QUEUED,
        payload: rows as any,
      },
    });

    /*
     * THE WORK RUNS IN THIS PROCESS AND NO LONGER DEPENDS ON IT.
     *
     * There is still no external queue: the rows are processed here, in the background, after the
     * response goes out. The difference is that the batch is now IN THE DATABASE, so a restart
     * mid-import leaves a resumable job rather than a job stuck RUNNING with its rows gone. See
     * `resumeAbandoned`, which runs on boot.
     *
     * A dedicated queue would still buy real things - work spread across instances, and a job that
     * survives the whole deployment going away rather than just one process. This is the version
     * that makes the data safe without either.
     */
    void this.run(job.id, organizationId, sourceSystem, rows).catch(async (err) => {
      this.logger.error(`Import job ${job.id} died: ${err.message}`);
      await this.prisma.importJob.update({
        where: { id: job.id },
        data: { state: ImportJobState.ABANDONED, error: String(err.message ?? err), completedAt: new Date() },
      }).catch(() => undefined);
    });

    return { jobId: job.id, state: job.state, total: job.total };
  }

  /**
   * Write down what has failed so far and forget it locally.
   *
   * Called at every cursor step and once at the end. Idempotent by construction: the array is
   * emptied on the way out, so a flush that happens twice writes nothing the second time.
   */
  private async flush(
    jobId: string,
    failures: { index: number; externalId: string | null; message: string }[],
  ): Promise<void> {
    if (!failures.length) return;
    const batch = failures.splice(0, failures.length);
    await this.prisma.importJobFailure.createMany({ data: batch.map((f) => ({ jobId, ...f })) }).catch((err) =>
      this.logger?.error?.(`Could not record ${batch.length} import failure(s) for job ${jobId}: ${err?.message}`),
    );
  }

  private async run(
    jobId: string,
    organizationId: string,
    sourceSystem: string,
    rows: SubjectPush[],
    startAt = 0,
  ) {
    await this.prisma.importJob.update({
      where: { id: jobId },
      data: { state: ImportJobState.RUNNING, startedAt: new Date(), heartbeatAt: new Date() },
    });

    /* A resumed job keeps the count it had already earned rather than starting from zero. */
    const prior = startAt > 0
      ? await this.prisma.importJob.findUnique({ where: { id: jobId }, select: { succeeded: true, failed: true } })
      : null;
    let succeeded = prior?.succeeded ?? 0;
    /* Unflushed failures only. `failedSoFar` is the running total, because `failures` is emptied
       every time it is written down. */
    const failures: { index: number; externalId: string | null; message: string }[] = [];
    let failedSoFar = prior?.failed ?? 0;
    /* How many rows named a source system of their own and had it replaced by the batch's. Counted
       because it is silent: the row was accepted, under a key the caller did not ask for. */
    let rowsWhoseSourceWasOverridden = 0;

    for (let i = startAt; i < rows.length; i++) {
      const row = rows[i];
      try {
        /* The batch names its source system once; a row claiming a different one is taken as the
           batch's, because a mixed batch is almost certainly a client bug and silently splitting it
           across two source systems would be a very hard thing for them to unpick later. */
        if (row?.sourceSystem && row.sourceSystem !== sourceSystem) rowsWhoseSourceWasOverridden++;
        await this.subjects.push(organizationId, { ...row, sourceSystem });
        succeeded++;
      } catch (err: any) {
        failures.push({
          index: i,
          externalId: row?.externalId ?? null,
          /* Their message, not a stack trace - this is read by somebody fixing a spreadsheet. */
          message: String(err?.response?.message ?? err?.message ?? 'Unknown error'),
        });
        failedSoFar++;
      }

      /*
       * The cursor moves in steps rather than per row. Per row would double the writes for no gain
       * - a resumed job repeating a handful of upserts costs nothing, because every one of them is
       * idempotent on the customer's own key.
       */
      if ((i + 1) % 50 === 0) {
        /*
         * AND THE FAILURES GO DOWN WITH IT.
         *
         * They were held in memory and written only after the whole loop, so a crash, a deploy or
         * a killed process lost every failure recorded so far — and the resumed job then wrote
         * only the ones it found after resuming. The customer's report of what did not import was
         * therefore quietly incomplete, which is worse than absent: they fix the twelve rows they
         * can see and never learn about the other ninety.
         *
         * Flushed at the same cadence as the cursor, so what the cursor claims has been processed
         * and what the failure table holds cannot come apart by more than one batch.
         */
        await this.flush(jobId, failures);
        await this.prisma.importJob.update({
          where: { id: jobId },
          data: { cursor: i + 1, succeeded, failed: failedSoFar, heartbeatAt: new Date() },
        });
      }
    }

    await this.flush(jobId, failures);

    /*
     * AND SAY SO WHERE A ROW'S OWN SOURCE SYSTEM WAS REPLACED.
     *
     * Taking the batch's is the right call — a mixed batch is almost certainly a client bug, and
     * splitting it across two source systems would be very hard for them to unpick later. What was
     * wrong is that it happened in silence: the row was accepted, keyed under something the caller
     * did not ask for, and nothing anywhere said it had been changed.
     */
    if (rowsWhoseSourceWasOverridden) {
      this.logger.warn(
        `Import job ${jobId}: ${rowsWhoseSourceWasOverridden} row(s) named their own sourceSystem and were ` +
          `stored under the batch's ("${sourceSystem}") instead. A mixed batch is usually a client bug.`,
      );
    }

    await this.prisma.importJob.update({
      where: { id: jobId },
      data: {
        state: ImportJobState.COMPLETED,
        succeeded,
        failed: failedSoFar,
        cursor: rows.length,
        completedAt: new Date(),
        heartbeatAt: null,
        /* Dropped once it can no longer be needed, so this table does not become an archive of
           every batch anybody ever sent. */
        payload: Prisma.DbNull,
      },
    });

    await this.stampQuietPeriod(organizationId, jobId, succeeded);
    this.logger.log(`Import job ${jobId}: ${succeeded} in, ${failures.length} skipped.`);
  }

  /**
   * Counted on what actually landed, not on what was sent. A batch of four thousand rows that all
   * failed has imported nothing, and starting a fortnight of silence over it would mean a customer
   * whose sync was entirely broken also sees nothing telling them so.
   */
  private async stampQuietPeriod(organizationId: string, importJobId: string, subjectCount: number) {
    const priorJobs = await this.prisma.importJob.count({
      where: { organizationId, id: { not: importJobId }, succeeded: { gt: 0 } },
    });
    const quiet = quietPeriodFor({ subjectCount, isFirstImport: priorJobs === 0 }, new Date());
    if (!quiet) return;

    await this.prisma.detectionQuietPeriod.create({
      data: { organizationId, reason: quiet.reason, importJobId, subjectCount, endsAt: quiet.endsAt },
    });
    this.logger.log(`Detection quiet until ${quiet.endsAt.toISOString()} for org ${organizationId} (${quiet.reason}).`);
  }

  /**
   * PICK UP WHAT A DEAD PROCESS LEFT BEHIND.
   *
   * Called on boot. A job left QUEUED or RUNNING with its rows still attached was interrupted - the
   * only way to leave that state is to finish, and a finished job has no payload. So the test is
   * simply "is there work here", not a timeout: a heartbeat older than N minutes would guess, and
   * this does not have to.
   *
   * Safe to run while another instance is working, for the one reason that runs through all of
   * this: every row is an upsert on the customer's own key, so the worst case is a few rows written
   * twice with the same values. It is deliberately NOT a lock, because a lock would need releasing
   * by the process that died.
   */
  /**
   * A JOB SOMEBODY ELSE IS STILL RUNNING IS NOT AN ABANDONED JOB.
   *
   * `heartbeatAt` is written on every batch and its own comment says what it is for - "so a job
   * whose process died can be told from a slow one". Nothing read it. This selected every job in
   * QUEUED or RUNNING and started it, so an instance booting while another was half way through a
   * ten thousand row import took that import over, and both ran it: two writers on one cursor, two
   * sets of counters, and the same rows pushed twice. Idempotent upserts are what stopped this
   * being visible as corruption, which is also why it could sit here unnoticed.
   *
   * THE CLAIM AND THE LIVENESS CHECK ARE THE SAME STATEMENT. A job is taken only if its heartbeat
   * is stale or absent, and taking it stamps a fresh heartbeat, so a second instance running this
   * at the same moment finds nothing to take. `FOR UPDATE SKIP LOCKED` settles the tie when two
   * instances boot together, which is the normal case in a rolling deploy rather than a rare one.
   */
  async resumeAbandoned(now = new Date()) {
    /*
     * THE DATABASE'S CLOCK. `heartbeat_at` is `timestamp without time zone` holding UTC, because
     * every write to it goes through Prisma - but a JS Date passed as a raw parameter is converted
     * using the session timezone instead, three hours out on this machine. The first version of
     * this compared a UTC heartbeat against a local-clock threshold and so declared a job that had
     * been beating for one second to be ten minutes dead, and took it over while another instance
     * was writing to it. Driving it is what showed that; the code reads correctly.
     */
    const claimed = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      UPDATE import_jobs
         SET heartbeat_at = (now() AT TIME ZONE 'UTC'), state = 'RUNNING'
       WHERE id IN (
         SELECT id FROM import_jobs
          WHERE state IN ('QUEUED', 'RUNNING')
            AND payload IS NOT NULL
            AND (heartbeat_at IS NULL
                 OR heartbeat_at < (now() AT TIME ZONE 'UTC') - ${`${HEARTBEAT_STALE_MS} milliseconds`}::interval)
          FOR UPDATE SKIP LOCKED
       )
      RETURNING id
    `);
    if (!claimed.length) return { resumed: 0 };

    const stranded = await this.prisma.importJob.findMany({
      where: { id: { in: claimed.map((c) => c.id) } },
      select: { id: true, organizationId: true, sourceSystem: true, payload: true, cursor: true, total: true },
    });

    let resumed = 0;
    for (const j of stranded) {
      const rows = (j.payload ?? []) as unknown as SubjectPush[];
      if (!Array.isArray(rows) || !rows.length) {
        /* A payload we cannot read is not something to retry forever. Marked, with the reason. */
        await this.prisma.importJob.update({
          where: { id: j.id },
          data: { state: ImportJobState.ABANDONED, error: 'The stored batch could not be read on resume.', completedAt: new Date(), payload: Prisma.DbNull },
        });
        continue;
      }
      resumed++;
      this.logger.log(`Resuming import ${j.id} at row ${j.cursor} of ${j.total}.`);
      void this.run(j.id, j.organizationId, j.sourceSystem, rows, j.cursor).catch(async (err) => {
        this.logger.error(`Resumed import ${j.id} died again: ${err.message}`);
        await this.prisma.importJob.update({
          where: { id: j.id },
          data: { state: ImportJobState.ABANDONED, error: String(err.message ?? err), completedAt: new Date() },
        }).catch(() => undefined);
      });
    }
    /* Counts what was actually started, not what was claimed - an unreadable payload is neither. */
    return { resumed };
  }

  /**
   * The org's recent imports, for the console.
   *
   * The counts only - the failure rows come from `status` when somebody opens one. A list that
   * carried every failure of every job would be the whole import history in one response, and the
   * screen that renders it only shows the counts until asked.
   */
  async recentJobs(organizationId: string, take = 20) {
    const jobs = await this.prisma.importJob.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true, sourceSystem: true, kind: true, state: true,
        total: true, succeeded: true, failed: true, error: true,
        startedAt: true, completedAt: true, createdAt: true,
      },
    });
    const periods = await this.prisma.detectionQuietPeriod.findMany({
      where: { organizationId },
      select: { endsAt: true, reason: true, subjectCount: true, startedAt: true },
      orderBy: { startedAt: 'desc' },
    });
    return { jobs, detectionQuietUntil: quietUntil(periods, new Date()), quietPeriods: periods };
  }

  /**
   * The job, its counts, and EVERY row it could not take.
   *
   * Scoped by organisation, so a job id guessed or leaked from another tenant resolves to nothing
   * rather than to somebody else's import and its failure messages - which would carry their
   * external ids and their objectives' titles.
   */
  async status(organizationId: string, jobId: string) {
    const job = await this.prisma.importJob.findFirst({
      where: { id: jobId, organizationId },
      include: { failures: { orderBy: { index: 'asc' } } },
    });
    if (!job) throw new NotFoundException('No such job.');

    const periods = await this.prisma.detectionQuietPeriod.findMany({
      where: { organizationId },
      select: { endsAt: true, reason: true },
    });
    const until = quietUntil(periods, new Date());

    return {
      jobId: job.id,
      state: job.state,
      sourceSystem: job.sourceSystem,
      total: job.total,
      succeeded: job.succeeded,
      failed: job.failed,
      error: job.error,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      failures: job.failures.map((f) => ({ index: f.index, externalId: f.externalId, message: f.message })),
      /*
       * Surfaced here because during onboarding this is the question behind "why am I seeing
       * nothing" - and an answer of "detection is quiet until the 10th because your import started
       * a window" is a very different experience from silence.
       */
      detectionQuietUntil: until,
    };
  }
}
