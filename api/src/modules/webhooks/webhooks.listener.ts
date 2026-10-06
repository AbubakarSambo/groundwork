import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { WebhooksService } from './webhooks.service';
import { GroundworkEvents, RoundCompletedEvent, CheckInCompletedEvent, CheckInOpenedEvent, BlockerEvent, HandoverReadyEvent, ScenarioProposedEvent } from '../../common/events';
import { roundCompletedPayload, checkInCompletedPayload, checkInOpenedPayload, blockerPayload, handoverReadyPayload, scenarioProposedPayload } from './what-a-webhook-may-carry';
import { WorkspaceNotifierService } from '../workspace/workspace-notifier.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { theCheckInIsOpen } from '../whatsapp/what-goes-to-a-phone';
import { isAGuestIn } from '../participants/a-guest-is-never-somebody-on-the-hosts-list';
import { leaveOfThePeopleOn, awayUntilOn } from '../suites/who-is-away';

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

      /*
       * TWO NAMES FOR ONE EVENT, FOR ONE RELEASE. "Round" was retired from every human surface and
       * survived as the published name of the first webhook event. `session.completed` is the name
       * now; `round.completed` still fires so no integrator breaks, and goes next release (B13).
       */
      const payload = roundCompletedPayload({
        groundId: e.groundId,
        sessionNumber: e.sessionNumber,
        participantCount: e.participantCount,
        completedAt: new Date(),
        appUrl: this.appUrl(),
      }) as any;
      await this.webhooks.emit(ground.organizationId, 'session.completed', payload);
      await this.webhooks.emit(ground.organizationId, 'round.completed', payload);

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
      const ground = await this.prisma.ground.findUnique({ where: { id: e.groundId }, select: { organizationId: true, label: true, overWhatsApp: true } });
      if (!ground) return;
      /*
       * AND ON WHATSAPP, EVERY SESSION, ON WHICHEVER NUMBER THE ORGANISATION USES (survey item 7).
       *
       * This went only to an organisation with its own number connected, so on Groundwork's number
       * the first session was never announced on WhatsApp at all, and later ones went as a second,
       * separate message from the session-ready sweep. Now this is the one notice for every session:
       * `sendFor` sends from the organisation's own number when it has one, and from Groundwork's
       * otherwise. The person replies to this message and the reply is their first answer. Best
       * effort: a message that could not go is recorded and logged, and the webhook below still fires.
       */
      await this.announceOnWhatsApp(e, ground).catch((err) => this.logger.warn(`WhatsApp opening notice failed for ${e.checkInId}: ${err?.message}`));
      await this.webhooks.emit(
        ground.organizationId,
        'checkin.opened',
        checkInOpenedPayload({
          groundId: e.groundId,
          checkInId: e.checkInId,
          sessionNumber: e.sessionNumber,
          personExternalId: e.personExternalId,
          openedAt: new Date(),
          appUrl: this.appUrl(),
        }) as any,
      );
    } catch (err: any) {
      this.logger.warn(`Could not queue checkin.opened for ${e.checkInId}: ${err.message}`);
    }
  }

  /**
   * THE OPENING NOTICE, TO THE PERSON'S PHONE.
   *
   * Their number is the roster's, then the one they gave in Settings; a guest is never matched to an
   * entry on the host's list (see a-guest-is-never-somebody-on-the-hosts-list). Nobody on approved
   * leave today is told, as with the email. A check-in the lead keeps in the app never goes to a
   * phone (`overWhatsApp = false`; null is "whatever the organisation does"). STOP and the 24-hour
   * window are the sender's to keep.
   */
  private async announceOnWhatsApp(
    e: CheckInOpenedEvent,
    ground: { organizationId: string; label: string; overWhatsApp: boolean | null },
  ): Promise<void> {
    if (ground.overWhatsApp === false) return;
    const participant = await this.prisma.groundParticipant.findUnique({
      where: { id: e.participantId },
      select: { id: true, email: true, userId: true, user: { select: { firstName: true, email: true, phoneNumber: true } } },
    });
    if (!participant) return;
    const guest = await isAGuestIn(this.prisma, ground.organizationId, { userId: participant.userId, email: participant.email, userEmail: participant.user?.email });
    if (guest) return;
    const person = e.personExternalId
      ? await this.prisma.person.findFirst({ where: { organizationId: ground.organizationId, externalId: e.personExternalId }, select: { phone: true } })
      : null;
    const phone = person?.phone ?? participant.user?.phoneNumber ?? null;
    if (!phone) return;
    const leave = await leaveOfThePeopleOn(this.prisma, [e.groundId]);
    if (awayUntilOn(leave.get(participant.id))) return;
    const said = theCheckInIsOpen({ firstName: participant.user?.firstName, label: ground.label });
    /* Business-initiated: goes as free text inside the window, as a template outside it, or not at all. */
    await this.whatsapp.sendFor(ground.organizationId, phone, said.text, { checkInId: e.checkInId, kind: said.kind, params: said.params });
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
          sessionNumber: e.sessionNumber,
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
