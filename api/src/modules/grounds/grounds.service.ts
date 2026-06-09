import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { BillingService } from '../billing';
import { CreateGroundDto, AddParticipantDto } from './dto';
import { GroundworkEvents, GroundActivatedEvent } from '../../common';
import { GroundScenario, GroundStatus, PartyType, CheckInStatus, Cadence } from '@prisma/client';

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

    return ground;
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
        participants: true,
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

    return participant;
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
