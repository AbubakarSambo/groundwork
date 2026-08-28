import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ImportJobState } from '@prisma/client';
import { SubjectsService, SubjectPush } from './subjects.service';
import { quietPeriodFor, quietUntil } from './detection-holds-its-tongue';

/** A ceiling, so one request cannot ask us to hold an unbounded array in memory. */
export const MAX_BATCH = 5_000;

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
      data: { organizationId, sourceSystem, kind: 'subjects', total: rows.length, state: ImportJobState.QUEUED },
    });

    /*
     * IN-PROCESS, AND HONEST ABOUT IT.
     *
     * There is no queue in this deployment, so the work runs in the background of this process
     * after the response goes out. A restart mid-job abandons it - which is survivable ONLY because
     * every row is an upsert on the customer's own key, so re-sending the whole batch is safe and
     * is the documented recovery. A real queue belongs here before anybody imports at volume, and
     * this comment is the marker for that rather than a claim it is already fine.
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

  private async run(jobId: string, organizationId: string, sourceSystem: string, rows: SubjectPush[]) {
    await this.prisma.importJob.update({
      where: { id: jobId },
      data: { state: ImportJobState.RUNNING, startedAt: new Date() },
    });

    let succeeded = 0;
    const failures: { index: number; externalId: string | null; message: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
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
        completedAt: new Date(),
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
