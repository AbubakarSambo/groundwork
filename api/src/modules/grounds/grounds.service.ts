import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { BillingService } from '../billing';
import { UsageService } from '../usage/usage.service';
import { CreateGroundDto, AddParticipantDto } from './dto';
import { GroundworkEvents, GroundActivatedEvent } from '../../common';
import { GroundScenario, GroundStatus, PartyType, CheckInStatus, Cadence, UsageEventType } from '@prisma/client';
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
  OKR_ALIGNMENT: 90,
  WORKPLAN_BUDGET: 90,
  PULSE_CHECK: 30,
  REALIGN_TEAM: 60,
  PIP: 90,
};

// All scenarios support any number of participants — the initiator decides who
// needs to be in the ground. No hard-coded per-scenario cap.
export function isMultiPartyScenario(_scenario: GroundScenario): boolean {
  return true;
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
  soloArtifactShared: true, // whether participant chose to share; content fetched separately via get()
  soloArtifact: true, // included in select; caller must strip unless soloArtifactShared = true
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
    private usage: UsageService,
  ) {}

  async create(organizationId: string, initiatorId: string, dto: CreateGroundDto) {
    // --- Billing gate ---
    // Resolve whether this org may create a ground right now, and how.
    const canCreate = await this.billing.canCreateGround(organizationId, dto.accessCode);
    if (!canCreate.allowed) {
      throw new BadRequestException(canCreate.reason ?? 'Ground creation not allowed');
    }

    const ground = await this.prisma.$transaction(async (tx) => {
      const initiator = await tx.user.findUnique({ where: { id: initiatorId } });
      if (!initiator) throw new NotFoundException('Initiator not found');

      // Determine free-ground fields from the billing gate result.
      const isFreeGround = canCreate.freeReason !== undefined;
      const groundData: Record<string, unknown> = {
        organizationId,
        initiatorId,
        label: dto.label,
        scenario: dto.scenario,
        moment: dto.moment,
        timelineDays: dto.timelineDays ?? DEFAULT_TIMELINE_DAYS[dto.scenario],
        cadence: dto.cadence ?? Cadence.FORTNIGHTLY,
        status: GroundStatus.OPEN,
        resolutionState: dto.resolutionState ?? null,
        brief: dto.brief ?? null,
        joinToken: crypto.randomBytes(24).toString('hex'),
        freeParticipantCap: dto.freeParticipantCap ?? 4,
        isFreeGround,
        sessionsBalance: 1,
        ...(canCreate.freeReason === 'ACCESS_CODE' && canCreate.codeId
          ? { accessCodeId: canCreate.codeId, freeReason: 'ACCESS_CODE' }
          : canCreate.freeReason === 'FIRST_GROUND'
            ? { freeReason: 'FIRST_GROUND' }
            : {}),
      };

      const ground = await tx.ground.create({ data: groundData as any });

      // Mark org.firstGroundUsed atomically when this is the first free ground.
      if (canCreate.freeReason === 'FIRST_GROUND') {
        await tx.organization.update({
          where: { id: organizationId },
          data: { firstGroundUsed: true },
        });
      }

      // Record access-code redemption atomically.
      if (canCreate.freeReason === 'ACCESS_CODE' && canCreate.codeId) {
        await tx.contributorCodeRedemption.create({
          data: {
            codeId: canCreate.codeId,
            groundId: ground.id,
            redeemedByUserId: initiatorId,
            freeReason: 'ACCESS_CODE',
          },
        });
        // Increment sessionsUsed on the code.
        await tx.contributorCode.update({
          where: { id: canCreate.codeId },
          data: { sessionsUsed: { increment: 1 } },
        });
      }

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

    // Best-effort — event log failure must never block ground creation.
    this.usage.emit(UsageEventType.GROUND_CREATED, { organizationId, groundId: ground.id, userId: initiatorId }).catch(() => undefined);

    return { ...ground, contract, ...(contraindicationWarning ? { contraindicationWarning } : {}) };
  }

  /** Public: resolve a ground-level join token → name + scenario for the join page. */
  async getJoinPreview(joinToken: string) {
    const ground = await this.prisma.ground.findUnique({
      where: { joinToken },
      include: { initiator: { select: { firstName: true } } },
    });
    if (!ground) throw new NotFoundException('Join link not found or has expired');
    return {
      groundId: ground.id,
      groundLabel: ground.label,
      scenario: ground.scenario,
      initiatorName: ground.initiator.firstName,
    };
  }

  async list(organizationId: string, userId?: string) {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const orgGrounds = await this.prisma.ground.findMany({
      where: { organizationId },
      include: {
        participants: { select: { id: true, email: true, partyType: true, userId: true } },
        checkIns: {
          select: { id: true, participantId: true, sessionNumber: true, status: true, completedAt: true, createdAt: true },
        },
      },
    });

    // Also include grounds from other orgs where this user is a participant.
    let participantGrounds: typeof orgGrounds = [];
    if (userId) {
      const links = await this.prisma.groundParticipant.findMany({
        where: { userId, ground: { organizationId: { not: organizationId } } },
        select: { groundId: true },
      });
      if (links.length) {
        participantGrounds = await this.prisma.ground.findMany({
          where: { id: { in: links.map(l => l.groundId) } },
          include: {
            participants: { select: { id: true, email: true, partyType: true, userId: true } },
            checkIns: {
              select: { id: true, participantId: true, sessionNumber: true, status: true, completedAt: true, createdAt: true },
            },
          },
        });
      }
    }

    return [...orgGrounds, ...participantGrounds]
      .map(g => {
        const checkIns = g.checkIns;
        const completedCount = checkIns.filter(ci => ci.status === CheckInStatus.COMPLETED).length;
        const confidence = completedCount > 0 ? Math.min(5, Math.max(1, completedCount)) : undefined;
        const overdue = checkIns.filter(ci => ci.status === CheckInStatus.NOT_STARTED && ci.createdAt < threeDaysAgo).length;
        const checkInsToday = checkIns.filter(ci => ci.status === CheckInStatus.COMPLETED && ci.completedAt != null && ci.completedAt >= todayStart).length;
        const lastCompletion = checkIns
          .map(ci => ci.completedAt)
          .filter((d): d is Date => d !== null)
          .sort((a, b) => b.getTime() - a.getTime())[0];
        const lastActivity = lastCompletion ?? g.updatedAt;
        return { ...g, confidence, overdue, checkInsToday, lastActivity };
      })
      .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
  }

  async get(id: string, organizationId: string, requestingUserId?: string) {
    // Primary lookup by org — works for org members and the initiator.
    const CHECKIN_SELECT = { id: true, participantId: true, sessionNumber: true, status: true, completedAt: true, specificityLevel: true, recallConfidence: true, specificityDimensions: true } as const;

    let ground = await this.prisma.ground.findFirst({
      where: { id, organizationId },
      include: {
        participants: { select: SAFE_PARTICIPANT_SELECT },
        checkIns: { select: CHECKIN_SELECT },
        report: { select: { id: true, releasedAt: true, sharedPicture: true, createdAt: true } },
        resolution: true,
        patternDetections: {
          select: { id: true, code: true, periodsObserved: true, status: true, observationText: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    // External participant (different org): fall back to participant membership check.
    if (!ground && requestingUserId) {
      const link = await this.prisma.groundParticipant.findFirst({ where: { groundId: id, userId: requestingUserId } });
      if (link) {
        ground = await this.prisma.ground.findUnique({
          where: { id },
          include: {
            participants: { select: SAFE_PARTICIPANT_SELECT },
            checkIns: { select: CHECKIN_SELECT },
            report: { select: { id: true, releasedAt: true, sharedPicture: true, createdAt: true } },
            resolution: true,
            patternDetections: {
              select: { id: true, code: true, periodsObserved: true, status: true, observationText: true, createdAt: true },
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
        });
      }
    }

    if (!ground) throw new NotFoundException('Ground not found');

    // Computed display fields — derived here so the client never needs to repeat the logic.
    const completedCount = (ground.checkIns ?? []).filter((ci) => ci.status === CheckInStatus.COMPLETED).length;
    const confidence = Math.min(5, Math.max(1, completedCount || 1));

    const daysLeft =
      ground.timelineDays != null
        ? Math.max(0, Math.round((ground.createdAt.getTime() + ground.timelineDays * 86_400_000 - Date.now()) / 86_400_000))
        : null;

    // brief: prefer the ground's own opening brief; fall back to the released report summary
    const brief = (ground as any).brief ?? (ground.report?.releasedAt ? (ground.report as any).sharedPicture ?? null : null);

    const signals = (ground.patternDetections ?? [])
      .filter((pd) => pd.observationText)
      .map((pd) => ({
        id: pd.id,
        groundId: id,
        sessionNum: pd.periodsObserved,
        type: 'Pattern' as const,
        text: pd.observationText!,
        confidenceDelta: null,
        createdAt: pd.createdAt.toISOString(),
      }));

    // Extract context notes from groundAuditLog (stored under key contextNotes).
    const rawLog = (ground as any).groundAuditLog;
    const contextNotes: string[] =
      rawLog && !Array.isArray(rawLog) && typeof rawLog === 'object' ? (rawLog as any).contextNotes ?? [] : [];

    // Nest checkIns under each participant so the client can show per-party status.
    const checkInsByParticipant = new Map<string, typeof ground.checkIns>();
    for (const ci of ground.checkIns ?? []) {
      const list = checkInsByParticipant.get(ci.participantId) ?? [];
      list.push(ci);
      checkInsByParticipant.set(ci.participantId, list);
    }
    const participantsWithCheckIns = (ground.participants ?? []).map((p) => {
      const { soloArtifact, soloArtifactShared, ...safeP } = p as any;
      return {
        ...safeP,
        soloArtifactShared: soloArtifactShared ?? false,
        // Only expose the content when the participant explicitly shared it
        sharedSoloReport: soloArtifactShared && soloArtifact
          ? (() => { try { return JSON.parse(soloArtifact); } catch { return null; } })()
          : null,
        checkIns: checkInsByParticipant.get(p.id) ?? [],
      };
    });

    const { patternDetections: _pd, ...rest } = ground as any;
    return { ...rest, participants: participantsWithCheckIns, confidence, daysLeft, brief, signals, contextNotes };
  }

  /**
   * Add the second party. They are NEVER added silently — we send an invite
   * (magic link) and stamp notifiedAt. (OPTION FOUR RULE, Part 1.)
   */
  async addParticipant(groundId: string, organizationId: string, initiatorId: string, dto: AddParticipantDto) {
    const ground = await this.prisma.ground.findFirst({ where: { id: groundId, organizationId } });
    if (!ground) throw new NotFoundException('Ground not found');
    if (ground.initiatorId !== initiatorId) throw new ForbiddenException('Only the initiator can add a participant');

    const initiator = await this.prisma.user.findUnique({ where: { id: initiatorId } });

    // Magic-link invite token, persisted on the participant. They accept it to
    // create/link a user, set userId, and enter their private check-in.
    // If the entry flow pre-generated a token (so the share link could be shown
    // immediately before auth), honour it here — no separate lookup needed.
    const token = dto.inviteToken ?? crypto.randomBytes(32).toString('hex');
    const inviteTokenExpiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days

    // Prevent duplicate participant — surface a clean 400 instead of a Prisma constraint error.
    // Exception: if the existing record was never accepted (userId=null), refresh the token and
    // re-send the invite rather than permanently blocking the address.
    const existing = await this.prisma.groundParticipant.findFirst({
      where: { groundId, email: dto.email.toLowerCase() },
    });
    if (existing) {
      if (existing.userId !== null) throw new BadRequestException('This email is already a participant on this ground');
      // Unaccepted invite — refresh token and re-send.
      const freshToken = crypto.randomBytes(32).toString('hex');
      const freshExpiry = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      await this.prisma.groundParticipant.update({
        where: { id: existing.id },
        data: { inviteToken: freshToken, inviteTokenExpiresAt: freshExpiry, notifiedAt: null },
      });
      const emailResult = await this.email.sendParticipantInvite(
        dto.email.toLowerCase(),
        `${initiator?.firstName ?? 'A founder'}`,
        ground.label,
        freshToken,
        dto.note,
      );
      await this.prisma.groundParticipant.update({ where: { id: existing.id }, data: { notifiedAt: new Date() } });
      return { ...existing, inviteToken: undefined, devUrl: emailResult?.devUrl };
    }

    const participant = await this.prisma.$transaction(async (tx) => {
      const participant = await tx.groundParticipant.create({
        data: {
          groundId,
          email: dto.email.toLowerCase(),
          partyType: PartyType.PARTICIPANT,
          roleAsDescribed: dto.roleAsDescribed,
          invitedAt: new Date(),
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

    let emailResult: { devUrl?: string } | undefined;
    try {
      emailResult = await this.email.sendParticipantInvite(
        dto.email.toLowerCase(),
        `${initiator?.firstName ?? 'A founder'}`,
        ground.label,
        token,
        dto.note,
      );
    } catch (err: any) {
      // Roll back the participant row so the caller can retry cleanly.
      await this.prisma.groundParticipant.delete({ where: { id: participant.id } }).catch(() => undefined);
      throw err;
    }

    // Stamp notifiedAt only after the email succeeds (Rule 3 — nobody added silently).
    await this.prisma.groundParticipant.update({
      where: { id: participant.id },
      data: { notifiedAt: new Date() },
    });

    this.usage.emit(UsageEventType.PARTICIPANT_INVITED, { organizationId, groundId, participantId: participant.id }).catch(() => undefined);

    // GW-01: strip private fields (inviteToken, inviteTokenExpiresAt, soloArtifact,
    // specificityHistory, willingnessAnswers, willingnessGateAnswers) before
    // returning to the caller. Only fields in SAFE_PARTICIPANT_SELECT are exposed.
    const { id, email, partyType, userId, roleAsDescribed, invitedAt, notifiedAt, soloArtifactAt, createdAt } = participant;
    return { id, email, partyType, userId, roleAsDescribed, invitedAt, notifiedAt, soloArtifactAt, createdAt, devUrl: emailResult?.devUrl };
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

    // Block resend if the participant has already completed a check-in via the invite flow.
    const completedCheckIn = await this.prisma.checkIn.findFirst({
      where: { participantId, status: CheckInStatus.COMPLETED },
    });
    if (completedCheckIn) throw new BadRequestException('This participant has already completed their check-in');

    const token = crypto.randomBytes(32).toString('hex');
    const inviteTokenExpiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    await this.prisma.groundParticipant.update({
      where: { id: participantId },
      data: { inviteToken: token, inviteTokenExpiresAt },
    });

    const initiator = await this.prisma.user.findUnique({ where: { id: ground.initiatorId } });
    await this.email.sendParticipantInvite(
      participant.email,
      `${initiator?.firstName ?? 'A founder'}`,
      ground.label,
      token,
    );

    // Stamp notifiedAt only after the email succeeds so the field reliably
    // reflects actual notification, not just intent to notify.
    await this.prisma.groundParticipant.update({
      where: { id: participantId },
      data: { notifiedAt: new Date() },
    });

    return { message: 'Invite resent' };
  }

  /**
   * Return the current invite URL for a participant who has not yet accepted.
   * Only accessible to the initiator — they may need to share the link manually
   * if the invite email was missed.
   */
  async getParticipantInviteUrl(groundId: string, participantId: string, initiatorId: string): Promise<{ inviteUrl: string }> {
    const ground = await this.prisma.ground.findFirst({ where: { id: groundId, initiatorId } });
    if (!ground) throw new ForbiddenException('Not the initiator of this ground');

    const participant = await this.prisma.groundParticipant.findFirst({
      where: { id: participantId, groundId },
      select: { inviteToken: true, userId: true },
    });
    if (!participant) throw new NotFoundException('Participant not found');
    if (participant.userId) throw new BadRequestException('This participant has already accepted their invite');
    if (!participant.inviteToken) throw new BadRequestException('No active invite token');

    return { inviteUrl: this.email.buildInviteUrl(participant.inviteToken) };
  }

  /**
   * Activate a ground. Moves status directly to ACTIVE with no payment gate.
   * Reports are generated and released automatically after each session completes.
   */
  async activate(groundId: string, organizationId: string) {
    const ground = await this.prisma.ground.findFirst({ where: { id: groundId, organizationId }, include: { report: true } });
    if (!ground) throw new NotFoundException('Ground not found');

    const activated = await this.prisma.ground.update({
      where: { id: groundId },
      data: { status: GroundStatus.ACTIVE, billingActivatedAt: new Date() },
    });

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
    dto: { timelineWeeks?: number; cadence?: string; contextNote?: string },
  ) {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId } });
    if (!ground) throw new NotFoundException('Ground not found');

    // Only parties to this ground may adjust its timeline / cadence or add notes.
    const link = await this.prisma.groundParticipant.findFirst({
      where: { groundId, userId: requestingUserId },
    });
    if (!link && ground.initiatorId !== requestingUserId) throw new ForbiddenException('You are not a party to this ground');

    // Normalize and validate cadence if provided.
    if (dto.cadence) {
      (dto as any).cadence = (dto.cadence as string).toUpperCase();
      if (!Object.values(Cadence).includes(dto.cadence as Cadence)) {
        throw new BadRequestException(`Invalid cadence. Must be one of: ${Object.values(Cadence).join(', ')}`);
      }
    }

    // Parse existing audit log — migrate legacy array format to structured object.
    const rawLog = ground.groundAuditLog;
    const auditData: { timeline: object[]; contextNotes: string[] } =
      rawLog && !Array.isArray(rawLog) && typeof rawLog === 'object'
        ? { timeline: (rawLog as any).timeline ?? [], contextNotes: (rawLog as any).contextNotes ?? [] }
        : { timeline: Array.isArray(rawLog) ? (rawLog as object[]) : [], contextNotes: [] };

    if (dto.timelineWeeks !== undefined || dto.cadence !== undefined) {
      auditData.timeline.push({
        changedAt: new Date().toISOString(),
        changedBy: requestingUserId,
        changes: {
          ...(dto.timelineWeeks !== undefined && { timelineWeeks: { from: ground.timelineWeeks, to: dto.timelineWeeks } }),
          ...(dto.cadence !== undefined && { cadence: { from: ground.cadence, to: dto.cadence } }),
        },
      });
    }

    if (dto.contextNote?.trim()) {
      auditData.contextNotes.push(dto.contextNote.trim());
    }

    return this.prisma.ground.update({
      where: { id: groundId },
      data: {
        ...(dto.timelineWeeks !== undefined && { timelineWeeks: dto.timelineWeeks }),
        ...(dto.cadence !== undefined && { cadence: dto.cadence as Cadence }),
        groundAuditLog: auditData,
      },
    });
  }

  async getMySpecificity(groundId: string, userId: string): Promise<{ scores: number[]; label: string }> {
    const participant = await this.prisma.groundParticipant.findFirst({
      where: { groundId, userId },
      select: { specificityHistory: true },
    });
    if (!participant) throw new ForbiddenException('You are not a party to this ground');
    const raw: number[] = (participant.specificityHistory as number[]) ?? [];
    const scores = raw.filter(n => typeof n === 'number' && isFinite(n));
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const label = avg >= 0.65 ? 'high' : avg >= 0.35 ? 'moderate' : 'low';
    return { scores, label };
  }

  /**
   * Pause a ground — marks status = PAUSED, stamps pausedAt. Typically called
   * when active legal proceedings are detected in a check-in (GW-08 / context.service.ts)
   * and the admin or user confirms they want to pause. Billing continues to run
   * (the ground is not RESOLVED or CLOSED); an admin can un-pause by
   * transitioning back to the prior status.
   *
   * Only OPEN, AWAITING_PARTIES, ACTIVE, or REPORT_READY grounds can be paused;
   * terminal grounds (RESOLVED, STALLED, CLOSED) are immutable.
   */
  async getMyCheckinStatus(groundId: string, userId: string) {
    const participant = await this.prisma.groundParticipant.findFirst({ where: { groundId, userId } });
    if (!participant) throw new ForbiddenException('You are not a party to this ground');

    const checkIns = await this.prisma.checkIn.findMany({
      where: { participantId: participant.id },
      orderBy: { sessionNumber: 'asc' },
      select: { id: true, sessionNumber: true, status: true, completedAt: true },
    });

    const latest = checkIns[checkIns.length - 1];
    return {
      participantId: participant.id,
      partyType: participant.partyType,
      checkIns,
      latestStatus: latest?.status ?? null,
      latestSessionNumber: latest?.sessionNumber ?? null,
    };
  }

  /**
   * GET /grounds/:id/conversation — returns all participant conversation transcripts
   * grouped by participant. Accessible to the ground initiator only.
   */
  async getConversation(groundId: string, requestingUserId: string) {
    const ground = await this.prisma.ground.findFirst({
      where: { id: groundId, initiatorId: requestingUserId },
      select: { id: true, label: true },
    });
    if (!ground) throw new ForbiddenException('Only the initiator can view conversation transcripts');

    const participants = await this.prisma.groundParticipant.findMany({
      where: { groundId },
      select: { id: true, email: true, partyType: true },
    });

    const results = await Promise.all(
      participants.map(async (p) => {
        const checkIns = await this.prisma.checkIn.findMany({
          where: { participantId: p.id },
          orderBy: { sessionNumber: 'asc' },
          select: { id: true, sessionNumber: true, status: true, completedAt: true },
        });
        const sessions = await Promise.all(
          checkIns.map(async (ci) => {
            const turns = await this.prisma.conversationTurn.findMany({
              where: { checkInId: ci.id },
              orderBy: { createdAt: 'asc' },
              select: { id: true, role: true, content: true, createdAt: true },
            });
            return { ...ci, turns };
          }),
        );
        return { participantId: p.id, email: p.email, partyType: p.partyType, sessions };
      }),
    );

    return { groundId, groundLabel: ground.label, participants: results };
  }

  async pauseGround(groundId: string, adminUserId: string, reason: string): Promise<void> {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId } });
    if (!ground) throw new NotFoundException('Ground not found');

    const PAUSABLE_STATUSES: GroundStatus[] = [
      GroundStatus.OPEN,
      GroundStatus.AWAITING_PARTIES,
      GroundStatus.REPORT_READY,
      GroundStatus.ACTIVE,
    ];
    if (!PAUSABLE_STATUSES.includes(ground.status)) {
      throw new BadRequestException(`Ground in status "${ground.status}" cannot be paused`);
    }

    // Verify the requesting user belongs to this ground's org or is the initiator.
    const initiatorOrAdmin = await this.prisma.user.findFirst({
      where: { id: adminUserId, organizationId: ground.organizationId },
    });
    if (!initiatorOrAdmin) throw new ForbiddenException('Only an org member may pause a ground');

    await this.prisma.ground.update({
      where: { id: groundId },
      data: { status: GroundStatus.PAUSED, pausedAt: new Date() },
    });

    this.logger.warn(`Ground ${groundId} paused by user ${adminUserId}. Reason: ${reason}`);
  }

  /**
   * Returns true once every ACTIVE party has completed the given session number.
   * "Active" = a party who accepted their invite (userId set);
   * invited-but-never-accepted no-shows never block the report.
   * Works for two-party and multi-party grounds.
   */
  async isSessionReadyForReport(groundId: string, sessionNumber: number): Promise<boolean> {
    // A participant is "active" if they accepted the invite (userId set) OR if
    // they already completed a check-in for this session (participant-chat flow
    // can complete a session before the user registers a full account).
    const active = await this.prisma.groundParticipant.findMany({
      where: {
        groundId,
        OR: [
          { userId: { not: null } },
          { checkIns: { some: { sessionNumber, status: CheckInStatus.COMPLETED } } },
        ],
      },
      select: { id: true },
    });
    if (active.length < 2) return false;

    for (const p of active) {
      const ci = await this.prisma.checkIn.findFirst({
        where: { participantId: p.id, sessionNumber, status: CheckInStatus.COMPLETED },
      });
      if (!ci) return false;
    }
    return true;
  }

  /** Backward-compat alias — checks session 1 readiness. */
  async isReportReady(groundId: string): Promise<boolean> {
    return this.isSessionReadyForReport(groundId, 1);
  }

  /**
   * Return the authenticated contributor's private longitudinal record for a ground.
   * Specificity trend and pattern observations are gated behind billing — they
   * require careFeeStatus === ACTIVE. Without billing, only session history is returned.
   */
  async getMyRecord(groundId: string, userId: string): Promise<{
    sessions: { sessionNumber: number; completedAt: Date | null; status: string }[];
    specificity: { scores: number[]; avg: number; label: string } | null;
    confidence: { score: number; label: string; description: string } | null;
    patterns: { observation: string; sessionNumber: number | null }[] | null;
    insightsLocked: boolean;
  }> {
    const participant = await this.prisma.groundParticipant.findFirst({
      where: { groundId, userId },
      select: {
        id: true,
        specificityHistory: true,
        patternDetections: {
          where: { status: 'SURFACED' },
          select: { observationText: true, lastPeriodNumber: true, code: true },
          orderBy: { lastSeenAt: 'desc' },
        },
        checkIns: {
          select: { sessionNumber: true, completedAt: true, status: true },
          orderBy: { sessionNumber: 'asc' },
        },
      },
    });
    if (!participant) throw new ForbiddenException('You are not a party to this ground');

    const sessions = (participant.checkIns ?? []).map(ci => ({
      sessionNumber: ci.sessionNumber,
      completedAt: ci.completedAt,
      status: ci.status,
    }));

    // Insights unlock once the participant has at least one completed session.
    // First session per ground is always free, so no separate billing gate needed.
    const hasCompleted = sessions.some(s => s.status === 'COMPLETED');
    if (!hasCompleted) {
      return { sessions, specificity: null, confidence: null, patterns: null, insightsLocked: true };
    }

    // Specificity trend
    const raw: number[] = (participant.specificityHistory as number[]) ?? [];
    const scores = raw.filter(n => typeof n === 'number' && isFinite(n));
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const specLabel = avg >= 0.65 ? 'high' : avg >= 0.35 ? 'moderate' : 'low';

    // Confidence score — how many completed sessions cross-referenced against specificity
    const completedCount = sessions.filter(s => s.status === 'COMPLETED').length;
    const confScore = Math.min(5, completedCount + (avg >= 0.5 ? 1 : 0));
    const confLabel = confScore >= 4 ? 'High' : confScore >= 2 ? 'Building' : 'Early';
    const confDesc = confScore >= 4
      ? 'Multiple sessions cross-referenced. Your record carries strong evidential weight.'
      : confScore >= 2
        ? 'Your record is taking shape. Each session adds depth and specificity to the picture.'
        : 'Your record is just beginning. One more session will start to show the full picture.';

    // Diplomatic pattern observations — never name the code, never frame as a verdict
    const POSITIVE_CODES = new Set(['R3']);
    const patterns = (participant.patternDetections ?? []).map(d => ({
      observation: POSITIVE_CODES.has(d.code)
        ? d.observationText ?? ''
        : diplomaticObservation(d.observationText ?? ''),
      sessionNumber: d.lastPeriodNumber,
    })).filter(p => p.observation.length > 0);

    return {
      sessions,
      specificity: { scores, avg, label: specLabel },
      confidence: { score: confScore, label: confLabel, description: confDesc },
      patterns,
      insightsLocked: false,
    };
  }

  async getMySoloReport(groundId: string, userId: string): Promise<{ report: unknown | null; shared: boolean }> {
    const participant = await this.prisma.groundParticipant.findFirst({
      where: { groundId, userId },
      select: { soloArtifact: true, soloArtifactShared: true },
    });
    if (!participant) throw new ForbiddenException('You are not a party to this ground');
    const report = participant.soloArtifact
      ? (() => { try { return JSON.parse(participant.soloArtifact); } catch { return null; } })()
      : null;
    return { report, shared: participant.soloArtifactShared };
  }

  async setMySoloReportShared(groundId: string, userId: string, shared: boolean): Promise<{ shared: boolean }> {
    const participant = await this.prisma.groundParticipant.findFirst({
      where: { groundId, userId },
      select: { id: true },
    });
    if (!participant) throw new ForbiddenException('You are not a party to this ground');
    await this.prisma.groundParticipant.update({
      where: { id: participant.id },
      data: { soloArtifactShared: shared },
    });
    return { shared };
  }
}

/**
 * Rewrites a raw pattern observation into a diplomatic first-person reflection.
 * The original observation describes a behaviour; this wraps it so the contributor
 * reads it as something worth noticing in their own record — not a verdict.
 */
function diplomaticObservation(raw: string): string {
  if (!raw.trim()) return '';
  // Strip any period tags from the three-period rule bookkeeping
  const cleaned = raw.replace(/^\[period=\d+\]\s*/i, '').trim();
  return `Your record across sessions shows something worth noticing: ${cleaned.charAt(0).toLowerCase()}${cleaned.slice(1)} It is worth being aware of as your record builds.`;
}
