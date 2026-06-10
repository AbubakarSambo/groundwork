import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { BillingService } from '../billing';
import { CreateGroundDto, AddParticipantDto } from './dto';
import { GroundworkEvents, GroundActivatedEvent } from '../../common';
import { GroundScenario, GroundStatus, PartyType, CheckInStatus, Cadence } from '@prisma/client';
import { endStatesFor } from '../resolution/end-states';

// Default timelines per scenario (Part 2 — timeline and cadence).
const DEFAULT_TIMELINE_DAYS: Record<GroundScenario, number> = {
  NEW_HIRE: 90,
  NEW_COFOUNDER: 90,
  NEW_ADVISOR: 365,
  NEW_PROJECT: 90,
  NEW_MANAGER: 90,
  CONTRACT_RENEWAL: 60,
  RECOGNITION: 30,
  DRIFT: 90,
  CRISIS_ALIGNMENT: 60,
};

// Multi-party scenarios can hold more than two parties (project & team grounds).
// Every other scenario is strictly two-party — the gap between two independent
// accounts is the mechanism, and the report/resolution are two-party there.
const MULTI_PARTY_SCENARIOS: GroundScenario[] = [GroundScenario.NEW_PROJECT, GroundScenario.CRISIS_ALIGNMENT];
export function isMultiPartyScenario(scenario: GroundScenario): boolean {
  return MULTI_PARTY_SCENARIOS.includes(scenario);
}

// Fields safe to expose on a participant to anyone who can view the ground.
// Trust-critical: NEVER serialize inviteToken (magic link → account takeover),
// soloArtifact (the AI summary of this party's PRIVATE record), specificityHistory
// (a behavioural signal about them), or willingness answers. Those belong to the
// participant alone — record ownership is the mechanism, enforced here, not by
// policy. (GW-01.)
export const SAFE_PARTICIPANT_SELECT = {
  id: true,
  email: true,
  partyType: true,
  userId: true,
  roleAsDescribed: true,
  invitedAt: true,
  notifiedAt: true,
  soloArtifactAt: true, // timestamp only — never the artifact content
  createdAt: true,
} as const;

@Injectable()
export class GroundsService {
  private readonly logger = new Logger(GroundsService.name);

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
    private billing: BillingService,
    private events: EventEmitter2,
  ) {}

  async create(organizationId: string, initiatorId: string, dto: CreateGroundDto) {
    const ground = await this.prisma.$transaction(async (tx) => {
      const initiator = await tx.user.findUnique({ where: { id: initiatorId } });
      if (!initiator) throw new NotFoundException('Initiator not found');

      const ground = await tx.ground.create({
        data: {
          organizationId,
          initiatorId,
          label: dto.label,
          scenario: dto.scenario,
          moment: dto.moment,
          timelineDays: dto.timelineDays ?? DEFAULT_TIMELINE_DAYS[dto.scenario],
          cadence: dto.cadence ?? Cadence.FORTNIGHTLY,
          status: GroundStatus.OPEN,
        },
      });

      // The initiator is the first party.
      const participant = await tx.groundParticipant.create({
        data: {
          groundId: ground.id,
          userId: initiatorId,
          email: initiator.email,
          partyType: PartyType.INITIATOR,
        },
      });

      // Session 1 is created up front and is free.
      await tx.checkIn.create({
        data: { groundId: ground.id, participantId: participant.id, sessionNumber: 1, status: CheckInStatus.NOT_STARTED },
      });

      return ground;
    });

    // GW-19: no-verdict expectation contract — set at creation so the initiator
    // sees this before they invite anyone or pay. "Evidence both of you can stand
    // on" is the feature; the product is symmetry, not a verdict for one side.
    const contract = {
      noVerdict: true,
      message: 'Groundwork does not produce a verdict. Both parties read the same report at the same moment. The product is evidence both of you can stand on — not a ruling for one side.',
    };

    // GW-69: contraindication check for conflict-scenario grounds. If any flag is
    // set, the ground is created but a warning is returned so the initiator can
    // self-select out before inviting anyone or paying. Declining bad-fit revenue
    // keeps the dataset clean.
    const CONTRAINDICATED_SCENARIOS: GroundScenario[] = [GroundScenario.DRIFT, GroundScenario.RECOGNITION, GroundScenario.CRISIS_ALIGNMENT];
    let contraindicationWarning: string | undefined;
    if (CONTRAINDICATED_SCENARIOS.includes(dto.scenario) && dto.contraindicationAnswers) {
      const { legalProceedings, fearOfRetaliation, decisionAlreadyMade } = dto.contraindicationAnswers;
      if (legalProceedings) {
        contraindicationWarning = 'Active legal proceedings: Groundwork is designed for alignment before formal processes begin. Where proceedings are active, the record could interact with them in ways we cannot advise on. We recommend pausing until proceedings conclude or speaking with legal counsel first.';
      } else if (fearOfRetaliation) {
        contraindicationWarning = 'Fear of retaliation: Groundwork works best when participation is genuinely voluntary. If anyone involved fears retaliation, the record-building process may cause harm. Consider HR mediation or external facilitation instead.';
      } else if (decisionAlreadyMade) {
        contraindicationWarning = 'Decision already made: Groundwork is built for before a decision is finalised. Using it after the fact risks the process feeling performative to the other party, which is the opposite of what builds trust. Consider a direct conversation instead.';
      }
    }

    return { ...ground, contract, ...(contraindicationWarning ? { contraindicationWarning } : {}) };
  }

  async list(organizationId: string) {
    return this.prisma.ground.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: { participants: { select: { id: true, email: true, partyType: true, userId: true } } },
    });
  }

  async get(id: string, organizationId: string) {
    const ground = await this.prisma.ground.findFirst({
      where: { id, organizationId },
      include: {
        participants: { select: SAFE_PARTICIPANT_SELECT },
        checkIns: { select: { id: true, participantId: true, sessionNumber: true, status: true, completedAt: true } },
        report: { select: { id: true, releasedAt: true } },
        resolution: true,
      },
    });
    if (!ground) throw new NotFoundException('Ground not found');
    return ground;
  }

  /**
   * Add the second party. They are NEVER added silently — we send an invite
   * (magic link) and stamp notifiedAt. (OPTION FOUR RULE, Part 1.)
   */
  async addParticipant(groundId: string, organizationId: string, initiatorId: string, dto: AddParticipantDto) {
    const ground = await this.prisma.ground.findFirst({ where: { id: groundId, organizationId } });
    if (!ground) throw new NotFoundException('Ground not found');
    if (ground.initiatorId !== initiatorId) throw new ForbiddenException('Only the initiator can add a participant');

    // Two-party scenarios may hold exactly one participant. Only project / team
    // grounds may hold more than two parties.
    if (!isMultiPartyScenario(ground.scenario)) {
      const participantCount = await this.prisma.groundParticipant.count({
        where: { groundId, partyType: PartyType.PARTICIPANT },
      });
      if (participantCount >= 1) {
        throw new BadRequestException(
          'This scenario is two-party — it already has a participant. Use a project or team-alignment ground for more than two parties.',
        );
      }
    }

    const initiator = await this.prisma.user.findUnique({ where: { id: initiatorId } });

    // Magic-link invite token, persisted on the participant. They accept it to
    // create/link a user, set userId, and enter their private check-in.
    const token = crypto.randomBytes(32).toString('hex');
    const inviteTokenExpiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days

    const participant = await this.prisma.$transaction(async (tx) => {
      const participant = await tx.groundParticipant.create({
        data: {
          groundId,
          email: dto.email.toLowerCase(),
          partyType: PartyType.PARTICIPANT,
          roleAsDescribed: dto.roleAsDescribed,
          invitedAt: new Date(),
          notifiedAt: new Date(),
          inviteToken: token,
          inviteTokenExpiresAt,
        },
      });

      await tx.checkIn.create({
        data: { groundId, participantId: participant.id, sessionNumber: 1, status: CheckInStatus.NOT_STARTED },
      });

      await tx.ground.update({ where: { id: groundId }, data: { status: GroundStatus.AWAITING_PARTIES } });

      return participant;
    });

    await this.email.sendParticipantInvite(
      dto.email.toLowerCase(),
      `${initiator?.firstName ?? 'A founder'}`,
      ground.label,
      token,
    );

    // GW-01: strip private fields (inviteToken, inviteTokenExpiresAt, soloArtifact,
    // specificityHistory, willingnessAnswers, willingnessGateAnswers) before
    // returning to the caller. Only fields in SAFE_PARTICIPANT_SELECT are exposed.
    const { id, email, partyType, userId, roleAsDescribed, invitedAt, notifiedAt, soloArtifactAt, createdAt } = participant;
    return { id, email, partyType, userId, roleAsDescribed, invitedAt, notifiedAt, soloArtifactAt, createdAt };
  }

  /**
   * GW-24: Resend an expired invite to a ground participant who has not yet
   * accepted. Generates a fresh token (invalidating the old one by overwrite),
   * resets the expiry, and re-sends the invite email.
   */
  async resendParticipantInvite(groundId: string, participantId: string, organizationId: string): Promise<{ message: string }> {
    const ground = await this.prisma.ground.findFirst({ where: { id: groundId, organizationId } });
    if (!ground) throw new NotFoundException('Ground not found');

    const participant = await this.prisma.groundParticipant.findFirst({ where: { id: participantId, groundId } });
    if (!participant) throw new NotFoundException('Participant not found');
    if (participant.userId) throw new BadRequestException('This participant has already accepted their invite');

    const token = crypto.randomBytes(32).toString('hex');
    const inviteTokenExpiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    await this.prisma.groundParticipant.update({
      where: { id: participantId },
      data: { inviteToken: token, inviteTokenExpiresAt, notifiedAt: new Date() },
    });

    const initiator = await this.prisma.user.findUnique({ where: { id: ground.initiatorId } });
    await this.email.sendParticipantInvite(
      participant.email,
      `${initiator?.firstName ?? 'A founder'}`,
      ground.label,
      token,
    );

    return { message: 'Invite resent' };
  }

  /**
   * Admin activates the ground after the report is ready — billing starts here.
   * Session 1 is free; the paywall sits between REPORT_READY and ACTIVE.
   */
  async activate(groundId: string, organizationId: string) {
    const ground = await this.prisma.ground.findFirst({ where: { id: groundId, organizationId }, include: { report: true } });
    if (!ground) throw new NotFoundException('Ground not found');
    if (ground.status !== GroundStatus.REPORT_READY) {
      throw new BadRequestException('Ground is not ready to activate (report not generated yet)');
    }

    // The paywall. The org must have an active care fee (card on file) before a
    // ground can be activated. If not, return a Checkout URL with HTTP 402 so
    // the client can redirect to set up billing, then retry activation.
    if (!(await this.billing.isBillingReady(organizationId))) {
      const { checkoutUrl } = await this.billing.createCareFeeCheckout(organizationId, groundId);
      throw new HttpException(
        { message: 'Billing setup required before activating this ground.', requiresBilling: true, checkoutUrl },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    const activated = await this.prisma.ground.update({
      where: { id: groundId },
      data: { status: GroundStatus.ACTIVE, billingActivatedAt: new Date() },
    });

    // Billing has started — charge the first scenario fee for this period.
    await this.billing.chargeScenarioFeeOnActivation(groundId).catch((err) =>
      this.logger.error(`Scenario fee on activation failed for ground ${groundId}: ${err.message}`),
    );

    // Release the report to both parties simultaneously.
    this.events.emit(GroundworkEvents.GROUND_ACTIVATED, { groundId } satisfies GroundActivatedEvent);

    return activated;
  }

  /**
   * GET /grounds/:id/mediator-brief
   * Returns structural, non-session information for use with a facilitator.
   * Accessible only to the initiator or an org admin.
   */
  async getMediatorBrief(groundId: string, requestingUserId: string) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      include: { report: { select: { centralQuestion: true } } },
    });
    if (!ground) throw new NotFoundException('Ground not found');

    // Only the initiator may request the mediator brief. Org admins access it
    // via the admin surface (not this endpoint), so we check userId here.
    const requesterLink = await this.prisma.groundParticipant.findFirst({
      where: { groundId, userId: requestingUserId },
    });
    const isInitiator = ground.initiatorId === requestingUserId;
    if (!isInitiator && !requesterLink) {
      throw new ForbiddenException('Only the initiator or a party to this ground may request a mediator brief');
    }

    const daysOpen = Math.floor((Date.now() - ground.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const endStateOptions = endStatesFor(ground.scenario).map((s) => s.label);
    const gapSummary = ground.report?.centralQuestion ?? 'Not yet synthesised';

    return {
      groundLabel: ground.label,
      scenario: ground.scenario,
      openedAt: ground.createdAt,
      daysOpen,
      endStateOptions,
      gapSummary,
      note: 'This brief is for use with a facilitator. It contains structural information only, not session content.',
    };
  }

  /**
   * PATCH /grounds/:id — update timeline and/or cadence.
   * Writes an audit entry to groundAuditLog (Json[] appended) so changes are
   * traceable without a separate audit table.
   */
  async updateTimeline(
    groundId: string,
    requestingUserId: string,
    dto: { timelineWeeks?: number; cadence?: string },
  ) {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId } });
    if (!ground) throw new NotFoundException('Ground not found');

    // Only parties to this ground may adjust its timeline / cadence.
    const link = await this.prisma.groundParticipant.findFirst({
      where: { groundId, userId: requestingUserId },
    });
    if (!link) throw new ForbiddenException('You are not a party to this ground');

    // Validate cadence if provided.
    if (dto.cadence && !Object.values(Cadence).includes(dto.cadence as Cadence)) {
      throw new BadRequestException(`Invalid cadence. Must be one of: ${Object.values(Cadence).join(', ')}`);
    }

    const auditEntry = {
      changedAt: new Date().toISOString(),
      changedBy: requestingUserId,
      changes: {
        ...(dto.timelineWeeks !== undefined && {
          timelineWeeks: { from: ground.timelineWeeks, to: dto.timelineWeeks },
        }),
        ...(dto.cadence !== undefined && {
          cadence: { from: ground.cadence, to: dto.cadence },
        }),
      },
    };

    const existingLog: object[] = Array.isArray(ground.groundAuditLog) ? (ground.groundAuditLog as object[]) : [];
    const updatedLog = [...existingLog, auditEntry];

    return this.prisma.ground.update({
      where: { id: groundId },
      data: {
        ...(dto.timelineWeeks !== undefined && { timelineWeeks: dto.timelineWeeks }),
        ...(dto.cadence !== undefined && { cadence: dto.cadence as Cadence }),
        groundAuditLog: updatedLog,
      },
    });
  }

  /**
   * Returns true once every ACTIVE party has completed session 2 — the
   * condition for generating the report. "Active" = a party who accepted their
   * invite (userId set); invited-but-never-accepted no-shows never block the
   * report (the synthesis notes them as absent). Works for two-party and
   * multi-party (project / team) grounds. Called by ConversationService.complete().
   */
  async isReportReady(groundId: string): Promise<boolean> {
    const active = await this.prisma.groundParticipant.findMany({
      where: { groundId, userId: { not: null } },
      select: { id: true },
    });
    if (active.length < 2) return false;

    for (const p of active) {
      const session2 = await this.prisma.checkIn.findFirst({ where: { participantId: p.id, sessionNumber: 2, status: CheckInStatus.COMPLETED } });
      if (!session2) return false;
    }
    return true;
  }
}
