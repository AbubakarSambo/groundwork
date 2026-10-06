import { Injectable, Logger, Optional } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { onceAcrossCopies, theDay } from '../prisma/once-across-copies';
import { LeaveBoardService } from './the-leave-board.service';
import { SpendingService } from './the-spending.service';
import { TimeSheetsService } from './the-time-sheets.service';
import { WORKFLOWS_ROW, workflowsFrom } from './the-approval-steps';
import { ARequestToldOnWhatsApp } from './a-request-told-on-whatsapp.service';
import type { AWaitingRequest } from './a-request-in-words';

/**
 * ONCE A DAY, A REQUEST THAT WAITS TOO LONG IS PASSED ON (decision 85, build step 4; see
 * a-request-waits-too-long.ts). Only organisations whose admin set a number of working days on leave,
 * time sheets or spending are looked at, so nothing changes by itself. Once across every copy of the
 * API (decision 74, item 7), so nobody is told twice.
 */
@Injectable()
export class ARequestWaitsTooLongCron {
  private readonly logger = new Logger(ARequestWaitsTooLongCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly leave: LeaveBoardService,
    private readonly spending: SpendingService,
    private readonly time: TimeSheetsService,
    /* Who is told, once for everything passed on to them (a-request-told-on-whatsapp.service.ts). Left out, the suites tell as they pass. */
    @Optional() private readonly told?: ARequestToldOnWhatsApp,
  ) {}

  @Cron('0 7 * * *', { timeZone: 'UTC' })
  async passOnTheRequestsThatWaitTooLong(today = new Date()): Promise<{ passedOn: number }> {
    let passedOn = 0;
    await onceAcrossCopies(this.prisma, 'pass-on-the-requests-that-wait-too-long', theDay(today), async () => {
      ({ passedOn } = await this.passOnNow(today));
    });
    if (passedOn) this.logger.log(`Passed on ${passedOn} ${passedOn === 1 ? 'request' : 'requests'} that waited too long for an answer.`);
    return { passedOn };
  }

  /** The work itself, without the once-a-day claim, for the spec. */
  async passOnNow(today = new Date()): Promise<{ passedOn: number }> {
    const rows = await this.prisma.organizationSuite.findMany({ where: { suite: WORKFLOWS_ROW }, select: { organizationId: true, answers: true } });
    let passedOn = 0;
    for (const row of rows) {
      const w = workflowsFrom(row.answers);
      /* What leave and spending pass on is collected, and told once at the end: somebody whom both passed requests to is written to once. */
      const batch: { approverUserIds: string[]; request: AWaitingRequest }[] = [];
      const collect = this.told && typeof this.told.waitingMany === 'function' ? batch : undefined;
      const jobs: [boolean, () => Promise<unknown[]>][] = [
        [!!w.leave?.escalateAfter, () => this.leave.passOnWhatWaitsTooLong(row.organizationId, today, collect)],
        [!!w.spend?.escalateAfter, () => this.spending.passOnWhatWaitsTooLong(row.organizationId, today, collect)],
        [!!w.time?.escalateAfter, () => this.time.passOnWhatWaitsTooLong(row.organizationId, today)],
      ];
      for (const [on, job] of jobs) {
        if (!on) continue;
        try {
          passedOn += (await job()).length;
        } catch (err: any) {
          this.logger.warn(`Could not pass on the requests of one organisation: ${err?.message}`);
        }
      }
      if (collect?.length) await this.told!.waitingMany(row.organizationId, collect, today).catch((err: any) => this.logger.warn(`Could not tell who the requests were passed on to: ${err?.message}`));
    }
    return { passedOn };
  }
}
