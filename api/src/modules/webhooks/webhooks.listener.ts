import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { WebhooksService } from './webhooks.service';
import { GroundworkEvents, RoundCompletedEvent, CheckInCompletedEvent, CheckInOpenedEvent, BlockerEvent, HandoverReadyEvent, ScenarioProposedEvent } from '../../common/events';
import { roundCompletedPayload, checkInCompletedPayload, checkInOpenedPayload, blockerPayload, handoverReadyPayload, scenarioProposedPayload } from './what-a-webhook-may-carry';
import { WorkspaceNotifierService } from '../workspace/workspace-notifier.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

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
    /* A connected Slack or Teams channel. An escalated blocker is the notice that most wants one. */
    private readonly workspace: WorkspaceNotifierService,
    private readonly whatsapp: WhatsAppService,
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
        select: { organizationId: true, label: true },
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

      /*
       * AND THE CHANNEL. Distinct from "a report is ready", which fires when an admin RELEASES it:
       * a round finishing is the moment somebody has to decide to. Without this, the person who
       * presses release learns about it only by opening the product.
       */
      await this.workspace
        .tell(ground.organizationId, {
          what: 'a round finished',
          about: ground.label,
          howMany: e.participantCount,
          link: `${this.appUrl()}/grounds/${e.groundId}`,
        })
        .catch((err) => this.logger.warn(`Workspace notice failed for ${e.groundId}: ${err?.message}`));
    } catch (err: any) {
      this.logger.warn(`Could not queue round.completed for ${e.groundId}: ${err.message}`);
    }
  }

  @OnEvent(GroundworkEvents.CHECK_IN_OPENED)
  async onCheckInOpened(e: CheckInOpenedEvent) {
    try {
      const ground = await this.prisma.ground.findUnique({ where: { id: e.groundId }, select: { organizationId: true, label: true } });
      if (!ground) return;
      /*
       * AND ON WHATSAPP, WHEN THE ORGANISATION HAS ITS OWN NUMBER. The person replies to this message
       * and the reply is their first answer. Best effort: a message that could not go is logged, and
       * the webhook below still fires.
       */
      if (e.personExternalId) {
        const person = await this.prisma.person.findFirst({
          where: { organizationId: ground.organizationId, externalId: e.personExternalId },
          select: { phone: true },
        });
        const connected = await this.prisma.whatsAppConnection.findUnique({ where: { organizationId: ground.organizationId }, select: { enabled: true } }).catch(() => null);
        if (person?.phone && connected?.enabled) {
          const which = e.sessionNumber === 1 ? 'Your first check-in' : `Check-in ${e.sessionNumber}`;
          /* Business-initiated: goes as free text inside the window, as a template outside it, or not at all. */
          await this.whatsapp.sendFor(ground.organizationId, person.phone, `${which} on "${ground.label}" is open. Reply here to do it: about ten minutes, and what you say is released with everybody else's, not before.`, { checkInId: e.checkInId, kind: 'opening' })
            .catch((err) => this.logger.warn(`WhatsApp opening notice failed for ${e.checkInId}: ${err?.message}`));
        }
      }
      await this.webhooks.emit(
        ground.organizationId,
        'checkin.opened',
        checkInOpenedPayload({
          groundId: e.groundId,
          checkInId: e.checkInId,
          roundNumber: e.sessionNumber,
          personExternalId: e.personExternalId,
          openedAt: new Date(),
          appUrl: this.appUrl(),
        }) as any,
      );
    } catch (err: any) {
      this.logger.warn(`Could not queue checkin.opened for ${e.checkInId}: ${err.message}`);
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

  @OnEvent(GroundworkEvents.BLOCKER_RAISED)
  async onBlockerRaised(e: BlockerEvent) {
    await this.sendBlocker('blocker.raised', e);
  }

  @OnEvent(GroundworkEvents.BLOCKER_ESCALATED)
  async onBlockerEscalated(e: BlockerEvent) {
    await this.sendBlocker('blocker.escalated', e);
  }

  /**
   * Both blocker events differ only in their name and whether a duration is known, so they share
   * one path. Keeping them apart would mean two chances for the payload rules to drift, and the
   * payload rules are the whole reason this file is careful.
   */
  private async sendBlocker(event: 'blocker.raised' | 'blocker.escalated', e: BlockerEvent) {
    try {
      const ground = await this.prisma.ground.findUnique({
        where: { id: e.groundId },
        select: { organizationId: true, label: true },
      });
      if (!ground) return;

      await this.webhooks.emit(
        ground.organizationId,
        event,
        blockerPayload({
          groundId: e.groundId,
          blockerId: e.blockerId,
          waitingDays: e.waitingDays,
          occurredAt: new Date(),
          appUrl: this.appUrl(),
        }) as any,
      );

      /*
       * AND THE CHANNEL, WHERE ONE IS CONNECTED.
       *
       * `what-a-channel-may-be-told.ts` defines four kinds of notice and exactly one was ever
       * sent, so an admin who wired up Slack saw the test post and then near-silence. This is the
       * one that most wants a channel: somebody is waiting on somebody else, and the person who
       * can unblock it is often neither of them.
       *
       * The check-in's LABEL and a link, never who is blocked or on what — that file's whole
       * argument is that a channel is read by more people than a check-in, which is why `Notice`
       * has nowhere to put a name. Escalations only: a blocker raised in the ordinary course of a
       * conversation is not news, and a channel that reports every one stops being read.
       */
      if (event === 'blocker.escalated') {
        await this.workspace
          .tell(ground.organizationId, {
            what: 'somebody is blocked',
            about: ground.label,
            link: `${this.appUrl()}/grounds/${e.groundId}`,
          })
          .catch((err) => this.logger.warn(`Workspace notice failed for ${e.groundId}: ${err?.message}`));
      }
    } catch (err: any) {
      this.logger.warn(`Could not queue ${event} for ${e.blockerId}: ${err.message}`);
    }
  }


  @OnEvent(GroundworkEvents.HANDOVER_READY)
  async onHandoverReady(e: HandoverReadyEvent) {
    try {
      await this.webhooks.emit(
        e.organizationId,
        'handover.ready',
        handoverReadyPayload({
          roleAssignmentId: e.roleAssignmentId,
          empty: e.empty,
          occurredAt: new Date(),
          appUrl: this.appUrl(),
        }) as any,
      );
    } catch (err: any) {
      this.logger.warn(`Could not queue handover.ready for ${e.roleAssignmentId}: ${err.message}`);
    }
  }


  @OnEvent(GroundworkEvents.SCENARIO_PROPOSED)
  async onScenarioProposed(e: ScenarioProposedEvent) {
    try {
      await this.webhooks.emit(
        e.organizationId,
        'scenario.proposed',
        scenarioProposedPayload({
          candidateId: e.candidateId,
          scenario: e.scenario,
          occurredAt: new Date(),
          appUrl: this.appUrl(),
        }) as any,
      );
    } catch (err: any) {
      this.logger.warn(`Could not queue scenario.proposed for ${e.candidateId}: ${err.message}`);
    }
  }

}
