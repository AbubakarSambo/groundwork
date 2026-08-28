import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { WebhooksService } from './webhooks.service';
import { GroundworkEvents, RoundCompletedEvent, CheckInCompletedEvent } from '../../common/events';
import { roundCompletedPayload, checkInCompletedPayload } from './what-a-webhook-may-carry';

/**
 * WHERE `round.completed` FINALLY REACHES SOMEBODY.
 *
 * The event has existed since round completion became a server-side fact, and until now nothing
 * listened - it was a correct record of something nobody was told. This is the half that makes it
 * worth having.
 *
 * Every handler is best-effort and swallows its own errors. A webhook is a courtesy to a customer's
 * system; a failure to queue one must never roll back the round that closed or the session that
 * finished. The queue is durable, so a failure here loses a notification, not a fact.
 */
@Injectable()
export class WebhooksListener {
  private readonly logger = new Logger(WebhooksListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhooks: WebhooksService,
    private readonly config: ConfigService,
  ) {}

  /*
   * The same FRONTEND_URL every email link is built from, rather than a new setting. A permalink in
   * a webhook and a permalink in a report have to point at the same place, and two settings that
   * must agree is the failure this codebase keeps finding.
   */
  private appUrl(): string {
    return this.config.get<string>('resend.frontendUrl') ?? 'http://localhost:5173';
  }

  @OnEvent(GroundworkEvents.ROUND_COMPLETED)
  async onRoundCompleted(e: RoundCompletedEvent) {
    try {
      const ground = await this.prisma.ground.findUnique({
        where: { id: e.groundId },
        select: { organizationId: true },
      });
      if (!ground) return;

      await this.webhooks.emit(
        ground.organizationId,
        'round.completed',
        roundCompletedPayload({
          groundId: e.groundId,
          roundNumber: e.roundNumber,
          participantCount: e.participantCount,
          completedAt: new Date(),
          appUrl: this.appUrl(),
        }) as any,
      );
    } catch (err: any) {
      this.logger.warn(`Could not queue round.completed for ${e.groundId}: ${err.message}`);
    }
  }

  @OnEvent(GroundworkEvents.CHECK_IN_COMPLETED)
  async onCheckInCompleted(e: CheckInCompletedEvent) {
    try {
      const ground = await this.prisma.ground.findUnique({
        where: { id: e.groundId },
        select: { organizationId: true },
      });
      if (!ground) return;

      await this.webhooks.emit(
        ground.organizationId,
        'checkin.completed',
        checkInCompletedPayload({
          groundId: e.groundId,
          roundNumber: e.sessionNumber,
          completedAt: new Date(),
          appUrl: this.appUrl(),
        }) as any,
      );
    } catch (err: any) {
      this.logger.warn(`Could not queue checkin.completed for ${e.checkInId}: ${err.message}`);
    }
  }
}
