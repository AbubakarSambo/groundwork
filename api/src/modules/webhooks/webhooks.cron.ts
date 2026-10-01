import { Injectable, Logger } from '@nestjs/common';
import { onceAcrossCopies, theDay } from '../prisma/once-across-copies';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WebhooksService } from './webhooks.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { DependencyStatus } from '@prisma/client';
import { GroundworkEvents, BlockerEvent } from '../../common';
import { blockerHasSubstance } from '../board/reads';
import { daysWaiting } from '../board/what-the-whole-place-is-waiting-on';
import { shouldEscalate } from './a-handoff-that-has-sat-too-long';

/**
 * THE RETRY LOOP, which is what makes the queue a queue rather than a log of attempts.
 *
 * Every minute, take whatever is due. The backoff decides what "due" means, so this does not need
 * to be clever - it needs to run often enough that a thirty second first retry is roughly thirty
 * seconds rather than five minutes.
 */
@Injectable()
export class WebhooksCron {
  private readonly logger = new Logger(WebhooksCron.name);
  private running = false;

  private escalating = false;

  constructor(
    private readonly webhooks: WebhooksService,
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  /**
   * THE SWEEP THAT NOTICES NOBODY HAS NOTICED.
   *
   * Every other event in this product is caused by somebody doing something - a session finishes, a
   * round closes. This one exists because the thing worth knowing about a stuck handoff is that
   * nothing has happened to it, and an absence never emits an event by itself.
   *
   * Daily rather than hourly: the threshold is measured in days, so anything finer would only move
   * an alert around inside the day it was always going to arrive in.
   */
  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async escalateStaleHandoffs() {
    /* Once for its time across every copy of the API (decision 74, item 7). */
    await onceAcrossCopies(this.prisma, 'escalate-stale-handoffs', theDay(), () => this.escalateStaleHandoffsHere());
  }

  private async escalateStaleHandoffsHere() {
    if (this.escalating) return;
    this.escalating = true;
    try {
      const open = await this.prisma.groundDependency.findMany({
        where: {
          status: { in: [DependencyStatus.BLOCKING, DependencyStatus.WAITING] },
          escalatedAt: null,
        },
        select: {
          id: true, groundId: true, createdAt: true, escalatedAt: true,
          fromParticipantId: true, onParticipantId: true, onLabel: true, what: true, status: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      const now = new Date();
      let sent = 0;
      for (const d of open) {
        /* The same bar as the raise. A handoff that was never substantial enough to alert on does
           not become substantial by sitting still for a fortnight. */
        if (!blockerHasSubstance(d)) continue;
        const waitingDays = daysWaiting(d.createdAt, now);
        if (!shouldEscalate(waitingDays, d.escalatedAt)) continue;

        /*
         * STAMP FIRST, THEN EMIT. The stamp is what stops this firing again tomorrow, so if the
         * process dies between the two the cost is one alert never sent - a customer misses a
         * notification. The other order costs an alert re-sent every night forever, which is how a
         * channel gets muted.
         */
        await this.prisma.groundDependency.update({ where: { id: d.id }, data: { escalatedAt: now } });
        this.events.emit(GroundworkEvents.BLOCKER_ESCALATED, {
          blockerId: d.id, groundId: d.groundId, waitingDays,
        } as BlockerEvent);
        sent++;
      }
      if (sent) this.logger.log(`Escalated ${sent} handoff(s) open past the threshold.`);
    } catch (err: any) {
      this.logger.error(`Handoff escalation sweep failed: ${err.message}`);
    } finally {
      this.escalating = false;
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async deliverDue() {
    /*
     * One pass at a time. A batch of slow endpoints can take longer than a minute, and a second
     * pass starting on top of it would attempt the same rows twice - which for a receiver that
     * dedupes is noise and for one that does not is a duplicate.
     */
    if (this.running) return;
    this.running = true;
    try {
      const result = await this.webhooks.deliverDue();
      if (result.attempted) {
        this.logger.log(`Webhook sweep: ${result.delivered}/${result.attempted} delivered.`);
      }
    } catch (err: any) {
      this.logger.error(`Webhook sweep failed: ${err.message}`);
    } finally {
      this.running = false;
    }
  }
}
