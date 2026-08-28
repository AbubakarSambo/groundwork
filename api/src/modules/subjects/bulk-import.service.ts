import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ImportJobState, Prisma } from '@prisma/client';
import { SubjectsService, SubjectPush } from './subjects.service';
import { quietPeriodFor, quietUntil } from './detection-holds-its-tongue';

/** A ceiling, so one request cannot ask us to hold an unbounded array in memory. */
export const MAX_BATCH = 5_000;

/**
 * WHAT A BATCH IS ALLOWED TO WEIGH, AND WHY IT IS HERE RATHER THAN IN main.ts.
 *
 * `MAX_BATCH` was a promise the server could not keep. Express defaults to a 100kb body, so a batch
 * of three thousand plain objectives - 233kb, nothing exotic - was refused with "request entity too
 * large" while the documented cap said five thousand. The count and the weight are two numbers that
 * have to agree, and they disagreed by a factor of four.
 *
 * Kept beside MAX_BATCH so the next person to raise one sees the other. A rich subject with a
 * measure, a target and a dozen contributors runs to about a kilobyte, so this is MAX_BATCH times
 * roughly two kilobytes with room to spare.
 */
export const MAX_BATCH_BYTES = 10 * 1024 * 1024;

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
      ? await this.prisma.importJob.findUnique({ where: { id: jobId }, select: { succeeded: true } })
      : null;
    let succeeded = prior?.succeeded ?? 0;
    const failures: { index: number; externalId: string | null; message: string }[] = [];

    for (let i = startAt; i < rows.length; i++) {
      const row = rows[i];
      try {
        /* The batch names its source system once; a row claiming a different one is taken as the
           batch's, because a mixed batch is almost certainly a client bug and silently splitting it
           across two source systems would be a very hard thing for them to unpick later. */
        await this.subjects.push(organizationId, { ...row, sourceSystem });
        succeeded++;
      } catch (err: any) {
        failures.push({
          index: i,
          externalId: row?.externalId ?? null,
          /* Their message, not a stack trace - this is read by somebody fixing a spreadsheet. */
          message: String(err?.response?.message ?? err?.message ?? 'Unknown error'),
        });
      }

      /*
       * The cursor moves in steps rather than per row. Per row would double the writes for no gain
       * - a resumed job repeating a handful of upserts costs nothing, because every one of them is
       * idempotent on the customer's own key.
       */
      if ((i + 1) % 50 === 0) {
        await this.prisma.importJob.update({
          where: { id: jobId },
          data: { cursor: i + 1, succeeded, heartbeatAt: new Date() },
        });
      }
    }

    if (failures.length) {
      await this.prisma.importJobFailure.createMany({
        data: failures.map((f) => ({ jobId, ...f })),
      });
    }

    await this.prisma.importJob.update({
      where: { id: jobId },
      data: {
        state: ImportJobState.COMPLETED,
        succeeded,
        failed: failures.length,
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
  async resumeAbandoned() {
    const stranded = await this.prisma.importJob.findMany({
      where: {
        state: { in: [ImportJobState.QUEUED, ImportJobState.RUNNING] },
        payload: { not: Prisma.DbNull },
      },
      select: { id: true, organizationId: true, sourceSystem: true, payload: true, cursor: true, total: true },
    });
    if (!stranded.length) return { resumed: 0 };

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
      this.logger.log(`Resuming import ${j.id} at row ${j.cursor} of ${j.total}.`);
      void this.run(j.id, j.organizationId, j.sourceSystem, rows, j.cursor).catch(async (err) => {
        this.logger.error(`Resumed import ${j.id} died again: ${err.message}`);
        await this.prisma.importJob.update({
          where: { id: j.id },
          data: { state: ImportJobState.ABANDONED, error: String(err.message ?? err), completedAt: new Date() },
        }).catch(() => undefined);
      });
    }
    return { resumed: stranded.length };
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
