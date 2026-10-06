import { Injectable, Logger } from '@nestjs/common';
import { onceAcrossCopies, theDay, theHour } from '../prisma/once-across-copies';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { DayOfCalls, isARead, isAReportRead, isATranscriptRead, whatLooksWrong } from './the-api-is-watched';
import { KEEP_RECORDS_HOURS } from './idempotency.service';

/**
 * ONCE AN HOUR, EVERY ORGANISATION'S LAST DAY OF MACHINE CALLS IS READ FOR THE SHAPE OF A SCRAPER.
 * See the-api-is-watched.ts for what that shape is. A flag of a kind already open for that
 * organisation is not raised twice; it is left where the admin can see it until cleared.
 */
@Injectable()
export class ApiWatchCron {
  private readonly logger = new Logger(ApiWatchCron.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * A RECORD OF A RETRY IS NOT KEPT FOR EVER. The replay window is a day; the rows behind it were
   * never deleted, so a table whose whole meaning is "the last day" grew without bound and every
   * lookup in it got slower. Anything older than the keep period cannot be replayed and cannot
   * conflict, so it goes.
   */
  @Cron('0 1 * * *', { timeZone: 'UTC' })
  async pruneIdempotencyRecords() {
    /* Once for its time across every copy of the API (decision 74, item 7). */
    await onceAcrossCopies(this.prisma, 'prune-idempotency-records', theDay(), () => this.pruneIdempotencyRecordsHere());
  }

  private async pruneIdempotencyRecordsHere() {
    try {
      const before = new Date(Date.now() - KEEP_RECORDS_HOURS * 3600_000);
      const gone = await this.prisma.idempotencyRecord.deleteMany({ where: { createdAt: { lt: before } } });
      if (gone.count > 0) this.logger.log(`Pruned ${gone.count} idempotency record(s) older than ${KEEP_RECORDS_HOURS}h`);
    } catch (err: any) {
      this.logger.warn(`Idempotency prune failed: ${err?.message}`);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async sweep() {
    /* Once for its time across every copy of the API (decision 74, item 7). */
    await onceAcrossCopies(this.prisma, 'api-watch-sweep', theHour(), () => this.sweepHere());
  }

  private async sweepHere() {
    try {
      const since = new Date(Date.now() - 24 * 3600_000);
      const calls = await this.prisma.apiCall.findMany({
        where: { at: { gte: since } },
        select: { organizationId: true, method: true, path: true, at: true },
      });
      const byOrg = new Map<string, typeof calls>();
      for (const c of calls) (byOrg.get(c.organizationId) ?? byOrg.set(c.organizationId, []).get(c.organizationId)!).push(c);

      let raised = 0;
      for (const [organizationId, rows] of byOrg) {
        const flags = whatLooksWrong(this.dayOf(rows));
        if (!flags.length) continue;
        const open = await this.prisma.apiUsageFlag.findMany({ where: { organizationId, clearedAt: null }, select: { kind: true } });
        const openKinds = new Set(open.map((f) => f.kind));
        for (const f of flags) {
          if (openKinds.has(f.kind)) continue;
          await this.prisma.apiUsageFlag.create({ data: { organizationId, kind: f.kind, detail: f.detail } });
          raised++;
        }
      }
      const pruned = await this.prisma.apiCall.deleteMany({ where: { at: { lt: new Date(Date.now() - 30 * 24 * 3600_000) } } });
      this.logger.log(`API watch: ${byOrg.size} organisation(s) read, ${raised} flag(s) raised, ${pruned.count} old call(s) pruned.`);
    } catch (err: any) {
      this.logger.warn(`API watch failed: ${err?.message}`);
    }
  }

  /** The same day, for one organisation, as the admin page shows it. */
  async lastDayFor(organizationId: string): Promise<DayOfCalls> {
    const rows = await this.prisma.apiCall.findMany({
      where: { organizationId, at: { gte: new Date(Date.now() - 24 * 3600_000) } },
      select: { organizationId: true, method: true, path: true, at: true },
    });
    return this.dayOf(rows);
  }

  private dayOf(rows: { method: string; path: string; at: Date }[]): DayOfCalls {
    const perMinute = new Map<number, number>();
    const d: DayOfCalls = { calls: 0, reads: 0, writes: 0, reportReads: 0, transcriptReads: 0, busiestMinute: 0, checkInsOpened: 0, peopleWritten: 0 };
    for (const r of rows) {
      d.calls++;
      if (isARead(r.method)) d.reads++; else d.writes++;
      if (isAReportRead(r.method, r.path)) d.reportReads++;
      if (isATranscriptRead(r.method, r.path)) d.transcriptReads++;
      if (r.method === 'POST' && /\/check-ins(\?|$)/.test(r.path)) d.checkInsOpened++;
      if (r.method === 'POST' && /\/(people|scim\/v2\/Users)(\?|$)/.test(r.path)) d.peopleWritten++;
      const m = Math.floor(r.at.getTime() / 60_000);
      perMinute.set(m, (perMinute.get(m) ?? 0) + 1);
    }
    d.busiestMinute = Math.max(0, ...perMinute.values());
    return d;
  }
}
