import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { contextGaps, contextChatPrompt } from './the-context-chat';
import { AnthropicService } from '../conversation/anthropic.service';
import { EmailService } from '../email/email.service';
import { BillingService } from '../billing';
import { UsageService } from '../usage/usage.service';
import { CreateGroundDto, AddParticipantDto, CreateGroundForLeadDto } from './dto';
import { GroundworkEvents, GroundActivatedEvent } from '../../common';
import { GroundScenario, GroundStatus, PartyType, CheckInStatus, Cadence, UsageEventType, TokenType, Prisma } from '@prisma/client';
import { endStatesFor } from '../resolution/end-states';
import { canSignIn } from './can-sign-in';
import { defaultModeFor, boardRendersFor } from '../board/board-families';
import { BoardFamily, familyFor } from '../board/board-families';
import { runIntake } from '../conversation/intake';

// Default timelines per scenario (Part 2 - timeline and cadence).
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
  BOARD_STRATEGY: 90,
  COHORT_CHECK: 30,
  // A shock is days-fresh by definition: the shared picture is built fast, and
  // the suggested optional follow-up ("what turned out different from your
  // first read?") sits about a week later - two weeks covers the whole arc.
  ACUTE_SHOCK: 14,
};

// All scenarios support any number of participants - the initiator decides who
// needs to be in the ground. No hard-coded per-scenario cap.
export function isMultiPartyScenario(_scenario: GroundScenario): boolean {
  return true;
}

// Fields safe to expose on a participant to anyone who can view the ground.
// Trust-critical: NEVER serialize inviteToken (magic link → account takeover),
// soloArtifact (the AI summary of this party's PRIVATE record), specificityHistory
// (a behavioural signal about them), or willingness answers. Those belong to the
// participant alone - record ownership is the mechanism, enforced here, not by
// policy. (GW-01.)
export const SAFE_PARTICIPANT_SELECT = {
  id: true,
  email: true,
  partyType: true,
  userId: true,
  roleAsDescribed: true,
  invitedAt: true,
  notifiedAt: true,
  inviteDeliveryStatus: true, // SENT | DELIVERED | BOUNCED | COMPLAINED (Resend webhook mirror)
  soloArtifactAt: true, // timestamp only - never the artifact content
  soloArtifactShared: true, // whether participant chose to share; content fetched separately via get()
  signedOffAt: true, // "my account is accurate" confirmation - safe to show all parties, same tier as soloArtifactAt
  createdAt: true,
  // ONLY the display name of the linked user - so a participant can see WHO is here
  // by name when their email is hidden. Deliberately firstName/lastName only: no email,
  // no other user PII is pulled through this nested select.
  user: { select: { firstName: true, lastName: true } },
} as const;

/**
 * What the parties actually agree on, and what is still open.
 *
 * The ground's old "confidence" was min(5, completedCheckIns) rendered as
 * "5/5 Aligned". It measured ACTIVITY, not agreement, and could not tell the
 * two apart: an advisor ground with five real agreements and zero divergences
 * scored identically to a performance-improvement plan whose report contained
 * nothing at all, which told both parties on a formal process that they were
 * fully aligned.
 *
 * This reads the only place agreement is actually recorded - the report's own
 * `agreements` and `divergences`. When neither holds anything there is nothing
 * to say, and it returns null so the surface shows no read rather than
 * rounding an empty record up to a score.
 */
export function alignmentRead(report: { agreements?: unknown; divergences?: unknown } | null | undefined):
  { agreed: number; open: number } | null {
  if (!report) return null;
  const count = (v: unknown) => (Array.isArray(v) ? v.length : 0);
  const agreed = count(report.agreements);
  const open = count(report.divergences);
  if (agreed + open === 0) return null;
  return { agreed, open };
}

@Injectable()
export class GroundsService {
  private readonly logger = new Logger(GroundsService.name);

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
    private billing: BillingService,
    private events: EventEmitter2,
    private usage: UsageService,
    private config: ConfigService,
    /**
     * The context chat needs a model. Injected here rather than routed through
     * ConversationService because that service is about check-ins - somebody's
     * account - and this conversation is deliberately not one.
     */
    private anthropic: AnthropicService,
  ) {}

  /**
   * @param creatorRole the caller's role in the organisation. A ground created by
   *   somebody who is not an ADMIN waits for one to accept it - her requirement, and
   *   the reason it is a parameter rather than a lookup is that the controller already
   *   has it on the token and a second read could disagree with the guard.
   */
  async create(organizationId: string, initiatorId: string, dto: CreateGroundDto, creatorRole?: string) {
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
        // Immutable after this point. Omitting it takes the family default so a
        // sensing-family ground is never accidentally created shared.
        mode: dto.mode ?? defaultModeFor(dto.scenario),
        moment: dto.moment,
        timelineDays: dto.timelineDays ?? DEFAULT_TIMELINE_DAYS[dto.scenario],
        cadence: dto.cadence ?? Cadence.FORTNIGHTLY,
        cadenceAnchorDay: dto.cadenceAnchorDay ?? null,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        /**
         * AN ORG ADMIN ACCEPTS A GROUND BEFORE ANYBODY IS INVITED TO IT.
         *
         * A member's ground waits. An admin's does not - they are the approver, and
         * making them approve their own work is a step that teaches people to click
         * through steps.
         *
         * The status is the whole gate: `addParticipant` refuses while it holds, so
         * nobody can be invited, and an approval nobody could pre-empt is the only
         * kind worth having.
         */
        status: creatorRole === 'ADMIN' ? GroundStatus.OPEN : GroundStatus.AWAITING_APPROVAL,
        resolutionState: dto.resolutionState ?? null,
        brief: dto.brief ?? null,
        joinToken: crypto.randomBytes(24).toString('hex'),
        freeParticipantCap: dto.freeParticipantCap ?? 4,
        isFreeGround,
        sessionsBalance: 1,
        ...(canCreate.freeReason === 'ACCESS_CODE' && canCreate.codeId
          ? { accessCodeId: canCreate.codeId, freeReason: 'ACCESS_CODE' }
          : canCreate.freeReason === 'FREE_TIER'
            ? { freeReason: 'FREE_TIER' }
            : {}),
      };

      const ground = await tx.ground.create({ data: groundData as any });

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

      // Session 1 is created up front and is free. If a start date is set, the
      // first check-in opens then (availableFrom); otherwise immediately.
      await tx.checkIn.create({
        data: { groundId: ground.id, participantId: participant.id, sessionNumber: 1, status: CheckInStatus.NOT_STARTED, availableFrom: dto.startsAt ? new Date(dto.startsAt) : null },
      });

      return ground;
    });

    // GW-19: no-verdict expectation contract - set at creation so the initiator
    // sees this before they invite anyone or pay. "Evidence both of you can stand
    // on" is the feature; the product is symmetry, not a verdict for one side.
    const contract = {
      noVerdict: true,
      message: 'Groundwork does not produce a verdict. Both parties read the same report at the same moment. The product is evidence both of you can stand on - not a ruling for one side.',
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

    // Best-effort - event log failure must never block ground creation.
    this.usage.emit(UsageEventType.GROUND_CREATED, { organizationId, groundId: ground.id, userId: initiatorId }).catch(() => undefined);

    return { ...ground, contract, ...(contraindicationWarning ? { contraindicationWarning } : {}) };
  }

  /**
   * Admin-initiated ground: the admin sets it up and names a Lead to run it.
   * The Lead becomes ground.initiatorId immediately (the FK requires an
   * existing user), but the ground stays AWAITING_LEAD - none of the normal
   * initiator actions (own check-in, adding more participants, releasing the
   * report) are meaningful until confirmLead() flips it to a real status.
   * Any pre-added participants are created now, alongside the lead, since the
   * admin is not ground.initiatorId and the normal addParticipant() path would
   * reject them.
   */
  async createForLead(organizationId: string, adminUserId: string, dto: CreateGroundForLeadDto) {
    const canCreate = await this.billing.canCreateGround(organizationId);
    if (!canCreate.allowed) {
      throw new BadRequestException(canCreate.reason ?? 'Ground creation not allowed');
    }

    const leadEmail = dto.leadEmail.toLowerCase();

    const pendingInvites: { email: string; token: string; participantId: string }[] = [];
    /**
     * THE LEAD'S USER ROW IS CREATED INSIDE THE TRANSACTION, WITH EVERYTHING ELSE.
     *
     * It used to be created just above this line, outside it. When anything
     * further down failed, the ground rolled back and the person did not: a real
     * account, in the organisation, verified, with no password and no ground - a
     * half-person left behind by an operation that reported failure.
     *
     * That is bad on its own and it also poisons the retry, because the next
     * attempt finds an existing row and treats them as an established user.
     * Either the whole ground exists or none of it does.
     */
    let leadUser!: { id: string; isNewUser: boolean; canSignIn: boolean };
    const ground = await this.prisma.$transaction(async (tx) => {
      leadUser = await this.findOrCreateUserForEmail(organizationId, leadEmail, dto.leadName, tx);
      const isFreeGround = canCreate.freeReason !== undefined;
      const ground = await tx.ground.create({
        data: {
          organizationId,
          initiatorId: leadUser.id,
          createdByUserId: adminUserId,
          label: dto.label,
          scenario: dto.scenario,
        // Immutable after this point. Omitting it takes the family default so a
        // sensing-family ground is never accidentally created shared.
        mode: dto.mode ?? defaultModeFor(dto.scenario),
          moment: dto.moment,
          timelineDays: dto.timelineDays ?? DEFAULT_TIMELINE_DAYS[dto.scenario],
          cadence: dto.cadence ?? Cadence.FORTNIGHTLY,
          cadenceAnchorDay: dto.cadenceAnchorDay ?? null,
          startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
          endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
          status: GroundStatus.AWAITING_LEAD,
          brief: dto.brief ?? null,
          joinToken: crypto.randomBytes(24).toString('hex'),
          freeParticipantCap: 4,
          isFreeGround,
          sessionsBalance: 1,
          ...(canCreate.freeReason === 'FREE_TIER' ? { freeReason: 'FREE_TIER' } : {}),
        } as any,
      });

      // The lead's own participant row - userId already set, no invite token
      // needed. Session 1's CheckIn is NOT created yet; confirmLead() creates
      // it once the lead actually confirms, mirroring create()'s timing.
      await tx.groundParticipant.create({
        data: {
          groundId: ground.id, userId: leadUser.id, email: leadEmail, partyType: PartyType.INITIATOR,
          // Without a remit the lead cannot be read at all - no contribution
          // read, no role-tuned probing. They can still set it themselves at
          // confirm-lead if the admin left it blank.
          roleAsDescribed: dto.leadRemit?.trim() || null,
        },
      });

      // Pre-added participants (e.g. the whole cohort), created alongside the
      // lead since the admin isn't ground.initiatorId and addParticipant()
      // would otherwise reject this call.
      for (const p of dto.participants ?? []) {
        const inviteToken = crypto.randomBytes(32).toString('hex');
        const participant = await tx.groundParticipant.create({
          data: {
            groundId: ground.id,
            email: p.email.toLowerCase(),
            partyType: PartyType.PARTICIPANT,
            roleAsDescribed: p.roleAsDescribed,
            invitedAt: new Date(),
            inviteToken,
            inviteTokenExpiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          },
        });
        pendingInvites.push({ email: p.email.toLowerCase(), token: inviteToken, participantId: participant.id });
        // SEQUENTIAL: lock session 1 until the lead completes their own -
        // the lead has no completed session yet at ground-creation time, so
        // this is unconditional here (unlike addParticipant(), which checks).
        await tx.checkIn.create({
          data: {
            groundId: ground.id, participantId: participant.id, sessionNumber: 1, status: CheckInStatus.NOT_STARTED,
            availableFrom: (dto.cadence ?? Cadence.FORTNIGHTLY) === Cadence.SEQUENTIAL
              ? new Date('9999-12-31T00:00:00.000Z') // locked until the lead completes theirs - stricter than any startsAt
              : (dto.startsAt ? new Date(dto.startsAt) : null),
          },
        });
      }

      return ground;
    });

    // Send participant invite emails - never silently, matching addParticipant().
    // Best-effort: the ground/participant rows are already committed; a failed
    // email is logged, not rolled back, since some invites may have succeeded.
    for (const invite of pendingInvites) {
      await this.email.sendParticipantInvite(invite.email, dto.leadName ?? 'Your lead', dto.label, invite.token, undefined, { kind: 'PARTICIPANT_INVITE', participantId: invite.participantId, groundId: ground.id }).catch((err: any) =>
        this.logger.error(`Participant invite email failed for ${invite.email} on ground ${ground.id}: ${err.message}`),
      );
    }

    /**
     * Notify the lead, with a link they can actually use.
     *
     * THE TEST IS "CAN THIS PERSON SIGN IN", NOT "WAS THIS ROW CREATED JUST NOW",
     * and getting that wrong strands the lead completely.
     *
     * It sent a bare /grounds/:id link to anybody whose user row already existed.
     * That page is behind auth, so a lead with no password lands on the sign-in
     * form and is asked for a password they have never had. The invitation is the
     * only thing that was supposed to get them in, and it hands them a locked
     * door. Nothing on that screen leads anywhere useful: "Forgot your password?"
     * is wrong because they never had one, and the only escape - "New here? Get a
     * sign-in link instead" - is the one line they have no reason to read, being
     * neither new nor stuck in their own mind.
     *
     * A user row can exist without any way in for several ordinary reasons: they
     * were added to a ground and never accepted, they were invited to the org, or
     * a previous attempt at this very call left them behind. So the question to
     * ask is whether they have a password or a Google identity, and the answer
     * decides the link.
     *
     * Found on ground 2 of the eighteen: Kennedy was named lead, the first
     * attempt failed on an unrelated error, the second treated him as an existing
     * user, and he could not accept a ground that had been created for him.
     */
    const url = leadUser.canSignIn
      ? `${this.config.get<string>('resend.frontendUrl') ?? ''}/grounds/${ground.id}`
      : await this.buildPasswordSetupUrl(leadUser.id, `/grounds/${ground.id}`);
    const admin = await this.prisma.user.findUnique({ where: { id: adminUserId }, select: { firstName: true } });
    await this.email.sendLeadInvite(leadEmail, admin?.firstName ?? 'An admin', dto.label, url).catch((err: any) =>
      this.logger.error(`Lead invite email failed for ground ${ground.id}: ${err.message}`),
    );

    this.usage.emit(UsageEventType.GROUND_CREATED, { organizationId, groundId: ground.id, userId: leadUser.id }).catch(() => undefined);

    return ground;
  }

  /** The lead reviews the admin's setup, optionally edits it, and confirms -
   * only then does their own session 1 open and the ground become real. */
  /**
   * The named lead confirms and begins. They choose whether they are ALSO
   * checking in (the common case - they get a session-1 check-in like any
   * other party) or MANAGING ONLY (they oversee the ground - see submission
   * status and the released report - but never give their own account).
   *
   * managingOnly: false (default) -> unchanged behaviour, a session-1 check-in
   * is created and checkInId is returned so the client lands the lead in the
   * real engine, same as before this flag existed.
   *
   * managingOnly: true -> the lead's participant row is marked managingOnly
   * and NO check-in is created for them. checkInId is null in the response;
   * the client must not try to open a check-in for a managing-only lead.
   * Critically, isSessionReadyForReport excludes managingOnly participants
   * from its readiness count, so the ground does not wait forever on an
   * account that will never come - see that method's comment for why.
   */
  async confirmLead(groundId: string, requestingUserId: string, edits?: { brief?: string; managingOnly?: boolean; remit?: string }) {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId } });
    if (!ground) throw new NotFoundException('Ground not found');
    if (ground.initiatorId !== requestingUserId) throw new ForbiddenException('Only the named lead can confirm this ground');
    if (ground.status !== GroundStatus.AWAITING_LEAD) throw new BadRequestException('This ground has already been confirmed');

    const participant = await this.prisma.groundParticipant.findFirst({
      where: { groundId, userId: requestingUserId, partyType: PartyType.INITIATOR },
    });
    if (!participant) throw new NotFoundException('Lead participant record not found');

    const managingOnly = edits?.managingOnly === true;

    // The lead's last chance to say what they own. A managing-only lead gives no
    // account so needs none; anyone else without a remit is unreadable by the
    // board - which in a live run meant the person who set the ground up was the
    // only one showing "role not clearly defined".
    if (!managingOnly && edits?.remit?.trim() && !participant.roleAsDescribed?.trim()) {
      await this.prisma.groundParticipant.update({
        where: { id: participant.id },
        data: { roleAsDescribed: edits.remit.trim() },
      });
    }
    const hasOtherParticipants = (await this.prisma.groundParticipant.count({ where: { groundId, partyType: PartyType.PARTICIPANT } })) > 0;

    const groundUpdate = this.prisma.ground.update({
      where: { id: groundId },
      data: {
        status: hasOtherParticipants ? GroundStatus.AWAITING_PARTIES : GroundStatus.OPEN,
        ...(edits?.brief !== undefined ? { brief: edits.brief } : {}),
      },
    });

    if (managingOnly) {
      await this.prisma.$transaction([
        groundUpdate,
        this.prisma.groundParticipant.update({ where: { id: participant.id }, data: { managingOnly: true } }),
      ]);
      return { groundId, checkInId: null };
    }

    const [, checkIn] = await this.prisma.$transaction([
      groundUpdate,
      this.prisma.checkIn.create({
        // The admin's chosen start date (Ground.startsAt, set at
        // createForLead time) gates the lead's own first check-in exactly
        // like the self-serve create() path gates the initiator's - it was
        // previously collected on the client and silently dropped for this
        // path (CreateGroundForLeadDto had no startsAt/endsAt fields at all).
        data: { groundId, participantId: participant.id, sessionNumber: 1, status: CheckInStatus.NOT_STARTED, availableFrom: ground.startsAt ?? null },
      }),
    ]);

    return { groundId, checkInId: checkIn.id };
  }

  /** Find an existing User for this email, or lazily create one - mirrors the
   * same pattern used when a participant accepts their invite (accept() in
   * ParticipantsService). Needed here because Ground.initiatorId is a required
   * FK to an existing User; it cannot point at an unaccepted invite. */
  /**
   * OFF WHEN WE CANNOT TELL, which is part of what "off by default" has to mean.
   *
   * Reading the flag directly threw where config was unavailable, and a feature
   * flag that can throw is worse than one that is wrong: the ground page would
   * return a 500 rather than quietly showing the old product, which is the exact
   * opposite of what a kill switch is for.
   *
   * Surfaced by unit tests whose config mock has no get(), and it would have been
   * a real outage the first time ConfigService was unavailable for any reason.
   */
  private contextEnabled(): boolean {
    try {
      return this.config?.get<boolean>('app.contextEnabled') === true;
    } catch {
      return false;
    }
  }

  private async findOrCreateUserForEmail(
    organizationId: string,
    email: string,
    name?: string,
    /** The enclosing transaction, when there is one, so a rollback takes the
        user with it rather than leaving a stranger in the organisation. */
    client?: Prisma.TransactionClient,
  ): Promise<{ id: string; isNewUser: boolean; canSignIn: boolean }> {
    const db = client ?? this.prisma;
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return {
        id: existing.id,
        isNewUser: false,
        canSignIn: canSignIn(existing),
      };
    }

    const local = email.split('@')[0] ?? 'there';
    const firstName = name ?? local.charAt(0).toUpperCase() + local.slice(1);
    const created = await db.user.create({
      data: { organizationId, email, firstName, lastName: '', role: 'MEMBER', isEmailVerified: true, passwordHash: null },
    });
    return { id: created.id, isNewUser: true, canSignIn: false };
  }

  /**
   * WHERE THE PASSWORD PAGE SENDS THEM AFTERWARDS.
   *
   * The email says "review the ground I set up for you". Setting the password
   * then dropped them on `/grounds?welcome=1`, the whole list, because that is
   * `SetPasswordPage`'s default and nobody had ever passed it anything else. The
   * lead arrives having been told about one ground and has to go and find it.
   * `next` was already read by that page; it just had no sender.
   */
  private async buildPasswordSetupUrl(userId: string, next?: string): Promise<string> {
    const setupToken = crypto.randomBytes(32).toString('hex');
    await this.prisma.emailVerificationToken.create({
      data: { userId, token: setupToken, type: TokenType.PASSWORD_SETUP, expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000) },
    });
    const base = `${this.config.get<string>('resend.frontendUrl') ?? ''}/set-password?token=${setupToken}`;
    return next ? `${base}&next=${encodeURIComponent(next)}` : base;
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

  /** Org-wide roster: every ground (team) in the org, its lead, members and
   * their roles, and enough of the report to derive an alignment label
   * client-side (reusing ReportPage's deriveStatus rather than duplicating
   * that logic in two languages). Admin/HR/Founder/Manager oversight view -
   * not scoped to "my grounds," unlike list(). */
  async getOrgRoster(organizationId: string) {
    const grounds = await this.prisma.ground.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, label: true, scenario: true, status: true, cadence: true,
        createdByUserId: true, createdAt: true,
        initiator: { select: { id: true, firstName: true, lastName: true, email: true } },
        participants: {
          select: {
            id: true, email: true, partyType: true, roleAsDescribed: true, userId: true,
            inviteDeliveryStatus: true,
            // No take limit here: completing a session always spawns the next
            // session's row, so "most recent row" is never the same as "most
            // recently completed" - we need the whole history to tell them apart.
            checkIns: { select: { sessionNumber: true, status: true, completedAt: true, specificityLevel: true }, orderBy: { sessionNumber: 'asc' } },
          },
        },
        report: { select: { agreements: true, divergences: true, releasedAt: true } },
      },
    });

    return grounds.map((g) => {
      const contributedParties = g.participants.filter((p) => p.checkIns.some((c) => c.status === CheckInStatus.COMPLETED)).length;
      const lastActivity = g.participants
        .flatMap((p) => p.checkIns.map((c) => c.completedAt))
        .filter((d): d is Date => !!d)
        .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
      return {
        id: g.id,
        label: g.label,
        scenario: g.scenario,
        status: g.status,
        cadence: g.cadence,
        createdByAdmin: g.createdByUserId != null,
        lead: { id: g.initiator.id, firstName: g.initiator.firstName, lastName: g.initiator.lastName, email: g.initiator.email },
        /**
         * THE COUNT AND THE LIST HAVE TO BE THE SAME LIST. W8-24.
         *
         * This counted only PARTICIPANT rows while `members` below maps every
         * participant including the initiator, so the roster said "0 members"
         * directly above a row naming the person leading it. Two counts of one
         * list, in one object, disagreeing on screen.
         */
        memberCount: g.participants.length,
        members: g.participants.map((p) => {
          // Specificity from the most recently COMPLETED session, not the most
          // recent row (which is often the freshly-spawned NOT_STARTED next one).
          const completed = p.checkIns.filter((c) => c.status === CheckInStatus.COMPLETED).sort((a, b) => b.sessionNumber - a.sessionNumber);
          return {
            email: p.email,
            // Display name only, so the client never has to make one out of the address.
            firstName: (p as any).user?.firstName ?? null,
            partyType: p.partyType,
            roleAsDescribed: p.roleAsDescribed,
            accepted: p.userId != null,
            latestSpecificity: completed[0]?.specificityLevel ?? null,
          };
        }),
        contributedParties,
        report: g.report
          ? { agreements: g.report.agreements, divergences: g.report.divergences, releasedAt: g.report.releasedAt }
          : null,
        lastActivity,
      };
    });
  }

  async list(organizationId: string, userId?: string, userEmail?: string, userRole?: string) {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Non-admins only see grounds they created or were invited to.
    // Admins see all org grounds (needed for org-level management).
    const isAdmin = userRole === 'ADMIN';
    const orgGroundWhere = isAdmin || !userId
      ? { organizationId }
      : {
          organizationId,
          OR: [
            { initiatorId: userId },
            { participants: { some: { userId } } },
          ],
        };

    const orgGrounds = await this.prisma.ground.findMany({
      where: orgGroundWhere,
      include: {
        /**
         * THE NAME, SO NOTHING HAS TO INVENT ONE FROM THE ADDRESS. W8-66.
         *
         * Three separate places were rendering a person by splitting their email at the
         * @ - "Led by hafsah" on the list, "hafsah runs this ground" in the admin banner,
         * and the check-in rows. That is the W10-2 mistake: an address is not what
         * somebody is called, and for a viewer who is not the lead the email is nulled
         * anyway, so the guess produced a blank.
         *
         * Same nested select as `SAFE_PARTICIPANT_SELECT`: display name only, no other
         * user field comes through.
         */
        participants: { select: { id: true, email: true, partyType: true, userId: true, user: { select: { firstName: true, lastName: true } } } },
        checkIns: {
          select: { id: true, participantId: true, sessionNumber: true, status: true, completedAt: true, createdAt: true },
        },
        // A released report that nobody is told about is a report nobody reads.
        // Ten grounds released theirs and not one person ever activated.
        report: { select: { releasedAt: true, agreements: true, divergences: true } },
        reportActivations: { select: { participantId: true, status: true } },
      },
    });

    // Also include grounds from other orgs where this user is a participant.
    let participantGrounds: typeof orgGrounds = [];
    if (userId) {
      // Heal any unlinked participant records whose email matches this user.
      // This covers users who accepted an invite via setPassword before the
      // participant-link fix was deployed (groundParticipant.userId was null).
      if (userEmail) {
        await this.prisma.groundParticipant.updateMany({
          where: { email: userEmail.toLowerCase(), userId: null },
          data: { userId },
        });
      }

      const links = await this.prisma.groundParticipant.findMany({
        where: { userId, ground: { organizationId: { not: organizationId } } },
        select: { groundId: true },
      });
      if (links.length) {
        participantGrounds = await this.prisma.ground.findMany({
          where: { id: { in: links.map(l => l.groundId) } },
          include: {
            /**
             * WHOSE ORGANISATION THIS GROUND IS, because it is not the one you are in.
             *
             * These are grounds in OTHER organisations where the caller is a
             * participant - deliberate, and how somebody invited across a boundary
             * finds their check-in at all. It predates the organisation switcher and
             * was unambiguous when there was only ever one organisation to be in.
             *
             * With a switcher it is not: somebody who switches to a client's
             * organisation still sees their own company's ground in the list, and
             * nothing says why. So the name comes along and the card can say it.
             */
            organization: { select: { name: true } },
            /**
         * THE NAME, SO NOTHING HAS TO INVENT ONE FROM THE ADDRESS. W8-66.
         *
         * Three separate places were rendering a person by splitting their email at the
         * @ - "Led by hafsah" on the list, "hafsah runs this ground" in the admin banner,
         * and the check-in rows. That is the W10-2 mistake: an address is not what
         * somebody is called, and for a viewer who is not the lead the email is nulled
         * anyway, so the guess produced a blank.
         *
         * Same nested select as `SAFE_PARTICIPANT_SELECT`: display name only, no other
         * user field comes through.
         */
        participants: { select: { id: true, email: true, partyType: true, userId: true, user: { select: { firstName: true, lastName: true } } } },
            checkIns: {
              select: { id: true, participantId: true, sessionNumber: true, status: true, completedAt: true, createdAt: true },
            },
            report: { select: { releasedAt: true, agreements: true, divergences: true } },
            reportActivations: { select: { participantId: true, status: true } },
          },
        });
      }
    }

    return [...orgGrounds, ...participantGrounds]
      .map(g => {
        // Only set when the ground belongs to a different organisation than the one
        // the caller is currently in - the card uses its presence as the signal.
        const otherOrgName = g.organizationId !== organizationId
          ? ((g as any).organization?.name ?? null)
          : null;
        const checkIns = g.checkIns;
        const completedCount = checkIns.filter(ci => ci.status === CheckInStatus.COMPLETED).length;
        const alignment = alignmentRead((g as any).report);
        const overdue = checkIns.filter(ci => ci.status === CheckInStatus.NOT_STARTED && ci.createdAt < threeDaysAgo).length;
        const checkInsToday = checkIns.filter(ci => ci.status === CheckInStatus.COMPLETED && ci.completedAt != null && ci.completedAt >= todayStart).length;
        const lastCompletion = checkIns
          .map(ci => ci.completedAt)
          .filter((d): d is Date => d !== null)
          .sort((a, b) => b.getTime() - a.getTime())[0];
        const lastActivity = lastCompletion ?? g.updatedAt;

        // Is a report sitting here that THIS viewer has not opened yet? Only
        // meaningful for a party - an admin who is not in the ground has no
        // report of her own to activate.
        const mine = userId ? (g.participants ?? []).find((p: any) => p.userId === userId) : null;
        // Same rule the report endpoint applies, or the badge contradicts the
        // page: the INITIATOR is exempt - they released it and can always read
        // it - and everyone else needs an ACTIVATED row, not merely a row.
        const isInitiator = !!userId && g.initiatorId === userId;
        const activated =
          isInitiator ||
          (!!mine &&
            ((g as any).reportActivations ?? []).some(
              (a: any) => a.participantId === mine.id && a.status === 'ACTIVATED',
            ));
        const reportWaitingForMe = !!mine && !!(g as any).report?.releasedAt && !activated;

        const { reportActivations: _drop, ...rest } = g as any;
        /**
         * ROUNDS EVERYBODY HAS FINISHED, for the card a person chooses from. W13-6.
         *
         * "12 of 12 sessions done" is the clearest line on the ground page, and the list had
         * no version of it - so somebody deciding which ground to open saw a status pill and
         * nothing about progress.
         *
         * A round is done when EVERY party's check-in for it is COMPLETED, which is the rule
         * the ground page uses. Counting check-in rows instead reads as double on a two-party
         * ground, which is the bug this file already carries a note about ("24 of 12").
         */
        const roundsDone = (() => {
          const numbers = [...new Set(checkIns.map(ci => ci.sessionNumber))];
          return numbers.filter(n =>
            checkIns.filter(ci => ci.sessionNumber === n).every(ci => ci.status === CheckInStatus.COMPLETED),
          ).length;
        })();
        return { ...rest, alignment, overdue, checkInsToday, roundsDone, lastActivity, reportWaitingForMe, otherOrgName };
      })
      .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
  }

  async get(id: string, organizationId: string, requestingUserId?: string) {
    // Primary lookup by org - works for org members and the initiator.
    const CHECKIN_SELECT = { id: true, participantId: true, sessionNumber: true, status: true, completedAt: true, availableFrom: true, isFinal: true, specificityLevel: true, recallConfidence: true, specificityDimensions: true } as const;

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

    // Computed display fields - derived here so the client never needs to repeat the logic.
    const alignment = alignmentRead((ground as any).report);

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
    // Solo artifact content is never part of SAFE_PARTICIPANT_SELECT - fetch it
    // in a separate, explicit query, and only for participants who opted to
    // share it. This keeps the "safe" select actually safe on its own, rather
    // than relying on every caller remembering to strip it after the fact.
    const sharedIds = (ground.participants ?? []).filter((p: any) => p.soloArtifactShared).map((p: any) => p.id);
    const sharedArtifacts = sharedIds.length
      ? await this.prisma.groundParticipant.findMany({
          where: { id: { in: sharedIds } },
          select: { id: true, soloArtifact: true },
        })
      : [];
    const sharedArtifactById = new Map(sharedArtifacts.map((a) => [a.id, a.soloArtifact]));

    // Contact-hiding (participant-to-participant). When the initiator turns this on, a
    // participant sees no OTHER participant's email address - only their own. Names,
    // roles, roster and presence stay fully visible: presence is a deliberate nudge, and
    // only the reach-them-outside contact detail is hidden. Applies to ALL other
    // participants, same-org or cross-org alike. Enforced in the read path so no caller
    // can forget to strip it.
    //
    // The INITIATOR is exempt: they are the admin/inviter (they typed these emails in),
    // and their admin roster must keep working. The toggle hides peers from each other,
    // not the ground's owner from the people they invited.
    const hideContact = !!(ground as any).restrictExternalVisibility;
    const viewerIsInitiator = !!requestingUserId && ground.initiatorId === requestingUserId;

    // CAN THE PARTIES SEE EACH OTHER AT ALL?
    //
    // Separate from hiding email addresses. This is whether one party sees that
    // the others exist, what each is answerable for, and how far along each is.
    // On a team delivering together that roster is how people coordinate. On an
    // onboarding period that doubles as a probation it tells four people exactly
    // who they are being measured against, and turns a record meant to help them
    // into a leaderboard.
    //
    // The lead or an admin decides. Until they do, the default is by kind of
    // ground: hidden where the period decides something about a person, shown
    // where it does not. The lead always sees everyone - running the ground is
    // the job.
    const evaluative = [BoardFamily.EVALUATION, BoardFamily.COHORT].includes(familyFor(ground.scenario));
    const peersVisible = (ground as any).peersVisibleToEachOther ?? !evaluative;
    const hidePeers = !peersVisible && !viewerIsInitiator;

    const participantsWithCheckIns = (ground.participants ?? [])
      .filter((p: any) => !hidePeers || (!!requestingUserId && p.userId === requestingUserId))
      .map((p: any) => {
      const raw = sharedArtifactById.get(p.id);
      const isSelf = !!requestingUserId && p.userId === requestingUserId;
      return {
        ...p,
        email: hideContact && !isSelf && !viewerIsInitiator ? null : p.email,
        soloArtifactShared: p.soloArtifactShared ?? false,
        // Only expose the content when the participant explicitly shared it
        sharedSoloReport: raw
          ? (() => { try { return JSON.parse(raw); } catch { return null; } })()
          : null,
        checkIns: checkInsByParticipant.get(p.id) ?? [],
      };
    });

    const org = await this.prisma.organization.findUnique({
      where: { id: ground.organizationId },
      select: { subscriptionPlan: true, subscriptionStatus: true, freeExtensionUsed: true },
    });

    // Only worth computing before the report exists (or before the current
    // round's report has released) - once released there's nothing pending.
    let sessionProgress: Awaited<ReturnType<typeof this.getSessionProgress>> = null;
    if (!ground.report?.releasedAt) {
      sessionProgress = await this.getSessionProgress(id);
    }
    const requestingParticipant = requestingUserId
      ? (ground.participants ?? []).find((p: any) => p.userId === requestingUserId)
      : null;
    const requestingUserIsMissing = !!(
      sessionProgress && requestingParticipant && sessionProgress.missingParticipantIds.includes(requestingParticipant.id)
    );

    // Read-back of private lead-context notes: ONLY the initiator who wrote them
    // sees them. They are never returned to any other party (that is the private
    // boundary - a participant must never see a note the lead wrote about them).
    const isInitiatorViewer = !!requestingUserId && ground.initiatorId === requestingUserId;
    const leadContextNotes = isInitiatorViewer
      ? await this.prisma.leadContextNote.findMany({
          where: { groundId: id },
          select: { id: true, participantId: true, text: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        })
      : [];

    const { patternDetections: _pd, ...rest } = ground as any;
    // THE BROADCAST JOIN TOKEN IS THE INITIATOR'S TO GIVE OUT, NOBODY ELSE'S.
    //
    // It was returned to every party on the ground, and the ground page renders
    // it with a Copy button, so any participant could hand out a link that lets
    // an unauthenticated stranger check in as a party. On a probation or
    // evaluation ground that is somebody's employment record, and the person who
    // shared it need not even have realised what the link did.
    //
    // Org admins keep it because they created the ground and may be the ones
    // distributing it; everyone else gets null.
    const viewer = requestingUserId
      ? await this.prisma.user.findUnique({ where: { id: requestingUserId }, select: { role: true, organizationId: true } })
      : null;
    const mayShareJoinLink =
      isInitiatorViewer ||
      // An admin of THIS organisation. Same role in a different org is a
      // stranger here, and this is precisely the token not to hand a stranger.
      (viewer?.role === 'ADMIN' && viewer.organizationId === (ground as any).organizationId);
    return {
      ...rest,
      joinToken: mayShareJoinLink ? (rest as any).joinToken ?? null : null,
      participants: participantsWithCheckIns,
      /**
       * WHAT THE PEER RULE IS ACTUALLY DOING, not what is stored. W14-4.
       *
       * `peersVisibleToEachOther` is null until somebody sets it, and the effective answer comes
       * from the scenario's family - hidden on evaluation and cohort grounds, shown elsewhere.
       * The client needs the effective value to show the lead the rule and its default, and my
       * first attempt at that copied the family list into the client, which is a second copy of
       * a rule that will drift from this one.
       *
       * So the server says what it applied. `peersVisibleToEachOther` still travels as-is, so the
       * control can tell "not set, using the default" from "set to this deliberately".
       */
      peersVisibleEffective: peersVisible,
      peersDefaultVisible: !evaluative,
      alignment,
      daysLeft,
      brief,
      signals,
      contextNotes,
      leadContextNotes,
      org: org ?? null,
      sessionProgress: sessionProgress ? { ...sessionProgress, requestingUserIsMissing } : null,
      /**
       * The context flag, sent with the ground because that is where the tab
       * lives. The client cannot read an environment variable, and a screen that
       * guesses whether a feature is on is how you get half of it rendering.
       *
       * Sent as a plain boolean, not as a list of capabilities: with the flag off
       * the client renders exactly the Documents tab it rendered before, and
       * there is nothing else to negotiate.
       */
      contextEnabled: this.contextEnabled(),
      // Whether this ground has a delivery board, so the client can show or hide
      // the link without duplicating the scenario-family table. The server owns
      // that routing; the client just reads the answer.
      boardRenders: boardRendersFor(ground.scenario, ground.mode),
    };
  }

  /**
   * Add a private lead-context note - the initiator feeds the AI real-world
   * context it would otherwise never have, about a specific participant
   * (participantId set) or about the ground (participantId null). Initiator-only.
   * It DIRECTS and WEIGHTS synthesis; it is never shown to the person it is about
   * and never becomes a stated claim in the report (see reports.service synthesis).
   */
  /**
   * THE CONTEXT CHAT. G37, G23 - the last of Wave 2's seven and the largest.
   *
   * It probes for what setup did not capture and recommends the material rather than
   * waiting for uploads. A real run produced a ninety-day ground from one sentence,
   * with no duration, no rhythm and no sense of who was involved; this is the thing
   * that stops that.
   *
   * The lead's only, because it is about the ground rather than about anybody's
   * account - and because the failure mode is a lead using it to say things about a
   * person. See the-context-chat.ts for the refusals that guard against that.
   */
  async contextChat(
    groundId: string,
    requestingUserId: string,
    history: { role: 'user' | 'assistant'; content: string }[],
  ) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: {
        id: true, label: true, scenario: true, initiatorId: true, timelineDays: true,
        cadence: true, brief: true,
        participants: { select: { id: true, managingOnly: true } },
        objectives: { select: { id: true } },
      },
    });
    if (!ground) throw new NotFoundException('Ground not found');
    if (ground.initiatorId !== requestingUserId) {
      throw new ForbiddenException('Setting this ground up is the lead\'s. Your own check-ins are on your page.');
    }

    const openDocumentCount = await this.prisma.groundDocument.count({
      where: { groundId, visibility: 'OPEN' },
    });

    const gaps = contextGaps({
      timelineDays: ground.timelineDays,
      cadence: ground.cadence,
      brief: ground.brief,
      partyCount: ground.participants.filter((p) => !p.managingOnly).length,
      perPersonObjectiveCount: ground.objectives.length,
      openDocumentCount,
    });

    // Nothing to ask about. Saying so and stopping is the right answer - a setup
    // conversation that will not end teaches people to skip setup.
    if (gaps.length === 0 && history.length === 0) {
      return {
        reply:
          'This ground has what it needs: how long it runs, how often people check in, what doing well looks like, who is in it, and something in writing for everybody to work from. Nothing here needs fixing before the first session.',
        gaps: [],
        done: true,
      };
    }

    const systemPrompt = contextChatPrompt(ground.label, ground.scenario, gaps);
    const reply = await this.anthropic.respond(
      systemPrompt,
      history.length
        ? history.map((h) => ({ role: h.role === 'user' ? ('user' as const) : ('assistant' as const), content: h.content }))
        : [{ role: 'user' as const, content: 'Start.' }],
    );

    return { reply, gaps: gaps.map((g: { key: string }) => g.key), done: gaps.length === 0 };
  }

  async addLeadContext(groundId: string, requestingUserId: string, dto: { participantId?: string | null; text: string }) {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId }, select: { initiatorId: true } });
    if (!ground) throw new NotFoundException('Ground not found');
    if (ground.initiatorId !== requestingUserId) {
      throw new ForbiddenException('Only the initiator can add context notes to this ground');
    }
    const text = (dto.text ?? '').trim();
    if (!text) throw new BadRequestException('Context note text is required');
    if (dto.participantId) {
      const target = await this.prisma.groundParticipant.findFirst({ where: { id: dto.participantId, groundId } });
      if (!target) throw new BadRequestException('That participant is not on this ground');
    }
    return this.prisma.leadContextNote.create({
      data: { groundId, participantId: dto.participantId ?? null, authorUserId: requestingUserId, text },
      select: { id: true, participantId: true, text: true, createdAt: true },
    });
  }

  /**
   * Initiator-only: choose whether participants can see each other's contact details
   * (email). When restricted, a participant sees every other participant's name, role
   * and presence but not their email - only their own. Presence stays as a nudge; only
   * the harvestable contact detail is hidden. See the read-path enforcement in get().
   */
  async setExternalVisibility(groundId: string, requestingUserId: string, restrict: boolean) {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId }, select: { initiatorId: true } });
    if (!ground) throw new NotFoundException('Ground not found');
    if (ground.initiatorId !== requestingUserId) {
      throw new ForbiddenException('Only the initiator can change this setting');
    }
    return this.prisma.ground.update({
      where: { id: groundId },
      data: { restrictExternalVisibility: restrict },
      select: { id: true, restrictExternalVisibility: true },
    });
  }

  /**
   * Can the parties see who else is on this ground and how each is doing?
   *
   * The same roster means opposite things depending on the situation. On a team
   * delivering together it is how people coordinate and how someone notices a
   * colleague is stuck. On an onboarding period that doubles as a probation it
   * tells four people exactly who they are being measured against, and turns a
   * record meant to help them into a leaderboard.
   *
   * The product cannot tell those apart from the scenario alone, and it should
   * not decide it silently either way, so the lead or an admin says. Until they
   * do, the default is by kind of ground: hidden where the period decides
   * something about a person, shown where it does not.
   */
  async setPeerVisibility(groundId: string, requestingUserId: string, visible: boolean) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { initiatorId: true, organizationId: true },
    });
    if (!ground) throw new NotFoundException('Ground not found');

    const viewer = await this.prisma.user.findUnique({
      where: { id: requestingUserId },
      select: { role: true, organizationId: true },
    });
    const isOrgAdmin = viewer?.role === 'ADMIN' && viewer.organizationId === ground.organizationId;
    if (ground.initiatorId !== requestingUserId && !isOrgAdmin) {
      throw new ForbiddenException(
        'Only the person leading this ground, or an admin in this organisation, can change this.',
      );
    }

    return this.prisma.ground.update({
      where: { id: groundId },
      data: { peersVisibleToEachOther: visible },
      select: { id: true, peersVisibleToEachOther: true },
    });
  }

  /**
   * Do the people on this ground actually see each other's work?
   *
   * The scenario can only guess. A cohort usually means people who never meet,
   * and a delivery team usually means people who do - but a cohort of trainers
   * sharing one site see each other every day, and a delivery team split across
   * four regions never does. Only the person who set the ground up knows.
   *
   * It matters more than it sounds. Every fairness read on the board is built on
   * colleagues describing each other, and the protection for a quiet, competent
   * person works by noticing that others still credit them while their own
   * account stays modest. Where nobody can corroborate anybody, that protection
   * has nothing to stand on and silence gets misread as work going missing. On a
   * probation, that is somebody's job.
   *
   * Either party to the ground may answer, not only the initiator: an admin sets
   * these grounds up for other people and often knows the answer when the lead is
   * still being onboarded.
   */
  async setPeopleWorkTogether(groundId: string, requestingUserId: string, together: boolean) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { initiatorId: true, organizationId: true },
    });
    if (!ground) throw new NotFoundException('Ground not found');

    const viewer = await this.prisma.user.findUnique({
      where: { id: requestingUserId },
      select: { role: true, organizationId: true },
    });
    const isOrgAdmin = viewer?.role === 'ADMIN' && viewer.organizationId === ground.organizationId;
    if (ground.initiatorId !== requestingUserId && !isOrgAdmin) {
      throw new ForbiddenException(
        'Only the person leading this ground, or an admin in this organisation, can change this.',
      );
    }

    return this.prisma.ground.update({
      where: { id: groundId },
      data: { peopleWorkTogether: together },
      select: { id: true, peopleWorkTogether: true },
    });
  }

  /**
   * Add the second party. They are NEVER added silently - we send an invite
   * (magic link) and stamp notifiedAt. (OPTION FOUR RULE, Part 1.)
   */
  async addParticipant(groundId: string, organizationId: string, initiatorId: string, dto: AddParticipantDto) {
    /**
     * NOBODY IS INVITED TO A GROUND THAT HAS NOT BEEN ACCEPTED.
     *
     * This is where the approval either means something or does not. Blocking the
     * status change alone would leave the invite path open, and an invite that has
     * already gone out cannot be recalled by declining afterwards - the person has
     * read it.
     */
    const pending = await this.prisma.ground.findFirst({
      where: { id: groundId, organizationId, status: GroundStatus.AWAITING_APPROVAL },
      select: { id: true },
    });
    if (pending) {
      throw new BadRequestException(
        'This ground is waiting for an admin in your organisation to accept it. Nobody can be invited until then.',
      );
    }

    const ground = await this.prisma.ground.findFirst({ where: { id: groundId, organizationId } });
    if (!ground) throw new NotFoundException('Ground not found');

    /**
     * THE SETTING-UP ADMIN CAN ADD PEOPLE TOO, NOT ONLY THE INITIATOR.
     *
     * This check used to be `ground.initiatorId !== initiatorId` alone, and it
     * made the ordinary first-run journey impossible.
     *
     * An admin who chooses "I'm setting this up for my team - someone else will
     * run it" hands the ground to a lead: the LEAD becomes `initiatorId`, and the
     * admin is recorded as `createdByUserId`. She is then the only person signed
     * in, the lead has not accepted yet, and she is the one holding the list of
     * people to invite - and the old check refused her, on a ground she created,
     * in an organisation she owns. An eighteen-ground run stopped dead here: the
     * participant could not be added by anyone, so no check-in, report or board
     * downstream was reachable.
     *
     * It was worse than a plain refusal, because the page simultaneously showed
     * her the add-participant control. She filled in a colleague's name and email
     * and was told "Access denied" afterwards.
     *
     * `board.service.ts` already made exactly this allowance for READING
     * (`isSetupAdmin`). This is the same allowance for the matching write. The
     * ground is still scoped to the caller's organisation by the query above, so
     * this cannot reach another org's ground.
     */
    const isInitiator = ground.initiatorId === initiatorId;
    const isSetupAdmin = !!ground.createdByUserId && ground.createdByUserId === initiatorId;
    if (!isInitiator && !isSetupAdmin) {
      throw new ForbiddenException('Only the lead or the admin who set this ground up can add a participant');
    }

    const initiator = await this.prisma.user.findUnique({ where: { id: initiatorId } });

    // Magic-link invite token, persisted on the participant. They accept it to
    // create/link a user, set userId, and enter their private check-in.
    // If the entry flow pre-generated a token (so the share link could be shown
    // immediately before auth), honour it here - no separate lookup needed.
    const token = dto.inviteToken ?? crypto.randomBytes(32).toString('hex');
    const inviteTokenExpiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days

    // Prevent duplicate participant - surface a clean 400 instead of a Prisma constraint error.
    // Exception: if the existing record was never accepted (userId=null), refresh the token and
    // re-send the invite rather than permanently blocking the address.
    const existing = await this.prisma.groundParticipant.findFirst({
      where: { groundId, email: dto.email.toLowerCase() },
    });
    if (existing) {
      if (existing.userId !== null) throw new BadRequestException('This email is already a participant on this ground');
      // Unaccepted invite - refresh token and re-send.
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
        { kind: 'PARTICIPANT_INVITE', participantId: existing.id, groundId: ground.id },
      );
      await this.prisma.groundParticipant.update({ where: { id: existing.id }, data: { notifiedAt: new Date() } });
      return { ...existing, inviteToken: undefined, devUrl: emailResult?.devUrl };
    }

    // freeParticipantCap was written on ground creation (4 normal, 100 for
    // broadcast grounds - see create()/createForLead()/entry.service.ts) but
    // never actually checked anywhere - a write-only field. Only free grounds
    // are capped at all; a subscribed org's grounds are unlimited here (its
    // own plan-level member cap is a separate, already-enforced dimension via
    // canInviteMember). Counts existing participant rows only - the
    // initiator's own row is created at ground creation, not through this path.
    if (ground.isFreeGround) {
      const participantCount = await this.prisma.groundParticipant.count({ where: { groundId } });
      if (participantCount >= ground.freeParticipantCap) {
        throw new BadRequestException(
          `This ground is on the free tier and is limited to ${ground.freeParticipantCap} participants. Upgrade to add more.`,
        );
      }
    }

    // SEQUENTIAL cadence: the lead's own session 1 must complete before a newly
    // added participant's session 1 opens - otherwise the team could check in
    // ahead of the lead, defeating the "lead goes first" point of this cadence.
    // Locked far in the future rather than null so it reads as "not yet open,"
    // not "no schedule" - the SEQUENTIAL branch of ensureNextSession() opens it
    // for real (sets it to now) once the lead completes session 1.
    let session1AvailableFrom: Date | null = null;
    if (ground.cadence === Cadence.SEQUENTIAL) {
      const leadCompletedSession1 = await this.prisma.checkIn.findFirst({
        where: {
          groundId,
          participant: { partyType: PartyType.INITIATOR },
          sessionNumber: 1,
          status: CheckInStatus.COMPLETED,
        },
      });
      if (!leadCompletedSession1) {
        session1AvailableFrom = new Date('9999-12-31T00:00:00.000Z'); // max JS date - "locked" sentinel
      }
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
        data: { groundId, participantId: participant.id, sessionNumber: 1, status: CheckInStatus.NOT_STARTED, availableFrom: session1AvailableFrom },
      });

      /**
       * ADDING A PARTICIPANT MUST NOT SKIP THE LEAD'S CONFIRMATION.
       *
       * This used to set AWAITING_PARTIES unconditionally, which quietly broke
       * the hand-off whenever the admin added someone before the lead had opened
       * their invitation - now the common order, since the admin is the one
       * holding the list of people to invite.
       *
       * The damage was silent and total. `confirmLead` requires status
       * AWAITING_LEAD, so once this moved the ground past it the lead could never
       * confirm; and `confirmLead` is the ONLY place a non-managing lead's own
       * check-in is created. The lead ended up recorded as a party
       * (`managingOnly = false`) with no session to give an account in, and was
       * never asked the one question that is hers to answer: "I'm also checking
       * in" or "Managing only".
       *
       * On a two-party ground that means the report is built from one side. Seen
       * live on a "New hire starting" ground - whose whole promise is getting a
       * manager and a hire to mean the same thing by "doing well" - where the
       * manager had no way to say what she meant. GW-016.
       *
       * A ground still waiting on its lead stays waiting. The participant is
       * added and invited either way.
       */
      if (ground.status !== GroundStatus.AWAITING_LEAD) {
        await tx.ground.update({ where: { id: groundId }, data: { status: GroundStatus.AWAITING_PARTIES } });
      }

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
        { kind: 'PARTICIPANT_INVITE', participantId: participant.id, groundId: ground.id },
      );
    } catch (err: any) {
      // Roll back the participant row so the caller can retry cleanly.
      await this.prisma.groundParticipant.delete({ where: { id: participant.id } }).catch(() => undefined);
      throw err;
    }

    // Stamp notifiedAt only after the email succeeds (Rule 3 - nobody added silently).
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
      undefined,
      { kind: 'REMINDER', participantId: participant.id, groundId: ground.id },
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
   * Only accessible to the initiator - they may need to share the link manually
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
  /** Begin the closing round: flag every participant's NEXT session as final
   * (creating it if none is open). Initiator only. Same conversation format -
   * the flag changes the opener, the thoroughness framing, and makes the
   * final report read the whole arc. */
  async beginClosingRound(groundId: string, organizationId: string, userId: string) {
    const ground = await this.prisma.ground.findFirst({
      where: { id: groundId, organizationId },
      include: { participants: true },
    });
    if (!ground) throw new NotFoundException('Ground not found');
    if (ground.initiatorId !== userId) throw new ForbiddenException('Only the initiator can begin the closing round');
    const terminal = ['RESOLVED', 'CLOSED', 'STALLED'];
    if (terminal.includes(ground.status as string)) throw new BadRequestException('This ground has already ended');

    let flagged = 0;
    for (const p of ground.participants) {
      const open = await this.prisma.checkIn.findFirst({
        where: { groundId, participantId: p.id, status: { in: ['NOT_STARTED', 'IN_PROGRESS'] as any } },
        orderBy: { sessionNumber: 'asc' },
      });
      if (open) {
        await this.prisma.checkIn.update({ where: { id: open.id }, data: { isFinal: true } });
      } else {
        const last = await this.prisma.checkIn.findFirst({
          where: { groundId, participantId: p.id },
          orderBy: { sessionNumber: 'desc' },
          select: { sessionNumber: true },
        });
        await this.prisma.checkIn.create({
          data: { groundId, participantId: p.id, sessionNumber: (last?.sessionNumber ?? 0) + 1, status: 'NOT_STARTED' as any, isFinal: true },
        });
      }
      flagged += 1;
    }
    return { groundId, closingRound: true, participantsFlagged: flagged };
  }

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
   * Accessible only to the initiator or a party (participant) on this
   * ground - checked below by requestingUserId, not by organization role.
   * There is no separate org-admin/platform-admin route for this brief; an
   * org admin who is not themselves the initiator or a participant cannot
   * currently read it at all.
   */
  async getMediatorBrief(groundId: string, requestingUserId: string) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      include: { report: { select: { centralQuestion: true } } },
    });
    if (!ground) throw new NotFoundException('Ground not found');

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
   * PATCH /grounds/:id - update timeline and/or cadence.
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

    const link = await this.prisma.groundParticipant.findFirst({
      where: { groundId, userId: requestingUserId },
    });
    if (!link && ground.initiatorId !== requestingUserId) throw new ForbiddenException('You are not a party to this ground');

    // HOW LONG THE GROUND RUNS IS THE LEAD'S CALL, NOT EVERY PARTY'S.
    //
    // Any party could change the timeline and cadence. On an onboarding that
    // doubles as a probation, that means the person being assessed could shorten
    // or extend their own assessment period, and nobody would necessarily
    // notice. Adding context is still open to everyone - that is an account of
    // the work, which is what the product is for.
    const changesTheSchedule = dto.timelineWeeks !== undefined || dto.cadence !== undefined;
    if (changesTheSchedule && ground.initiatorId !== requestingUserId) {
      throw new ForbiddenException(
        'Only the person leading this ground can change how long it runs or how often people check in. Ask them if it needs to change.',
      );
    }

    // MODE IS IMMUTABLE. If a ground could flip from private to shared, someone
    // who checked in believing their account was private would have it exposed -
    // the worst possible failure for a trust product. Rejected loudly here rather
    // than silently ignored, so a caller attempting it finds out.
    if ((dto as any).mode !== undefined && (dto as any).mode !== ground.mode) {
      throw new BadRequestException(
        'A ground\'s mode cannot be changed. It is fixed when the ground is created, because people check in on the understanding of what will and will not be shared.',
      );
    }

    // Normalize and validate cadence if provided.
    if (dto.cadence) {
      (dto as any).cadence = (dto.cadence as string).toUpperCase();
      if (!Object.values(Cadence).includes(dto.cadence as Cadence)) {
        throw new BadRequestException(`Invalid cadence. Must be one of: ${Object.values(Cadence).join(', ')}`);
      }

      // ONE_TIME's whole guarantee is "a single check-in, full stop" - decided
      // by the actual session-1 completion, not by whatever the cadence field
      // happens to say at that instant. Converting cadence to/from ONE_TIME
      // after session 1 has already completed for anyone on this ground would
      // be silently inconsistent either direction: switching IN wouldn't undo
      // a session 2 that already exists or was already scheduled; switching
      // OUT wouldn't retroactively create the session 2 that ONE_TIME's own
      // ensureNextSession() early-return already skipped for good. Block the
      // conversion outright once any session 1 has completed, rather than
      // leave that inconsistency live.
      const changingOneTime = dto.cadence === Cadence.ONE_TIME || ground.cadence === Cadence.ONE_TIME;
      if (changingOneTime && dto.cadence !== ground.cadence) {
        const anySessionOneComplete = await this.prisma.checkIn.findFirst({
          where: { groundId, sessionNumber: 1, status: CheckInStatus.COMPLETED },
        });
        if (anySessionOneComplete) {
          throw new BadRequestException(
            'Cadence cannot be changed to or from "One time" after the first check-in has completed.',
          );
        }
      }
    }

    // Parse existing audit log - migrate legacy array format to structured object.
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

  /**
   * A NOTE BETWEEN SESSIONS. Private to the person, always.
   *
   * The ground reads like a channel now, and a channel invites you to type. Between
   * sessions there is no check-in to type into, and the honest answer is not a dead
   * input: it is "yes, into something that is not your account".
   *
   * See the ParticipantNote model for why this is not a RecordEntry. Short version:
   * RecordEntry is the record, the shared report reads it, and the other party's
   * context reads theirs - so an unexamined sentence would be compared against
   * somebody else's account. This is carried into the next session as something to
   * ASK about instead.
   */
  /**
   * AN ADMIN ACCEPTS A GROUND, AND ONLY THEN CAN ANYBODY BE ASKED TO TAKE PART.
   *
   * Idempotent on purpose: two admins opening the same list and both clicking accept
   * is a normal race, and the second one should not see an error for agreeing.
   */
  async approve(groundId: string, organizationId: string, adminUserId: string) {
    const ground = await this.prisma.ground.findFirst({
      where: { id: groundId, organizationId },
      select: { id: true, status: true, label: true, initiatorId: true },
    });
    if (!ground) throw new NotFoundException('Ground not found');
    if (ground.status !== GroundStatus.AWAITING_APPROVAL) {
      // Already accepted, or never needed accepting. Either way there is nothing to do.
      return { id: ground.id, status: ground.status, alreadyDecided: true };
    }

    const updated = await this.prisma.ground.update({
      where: { id: groundId },
      data: { status: GroundStatus.OPEN, approvedById: adminUserId, approvedAt: new Date() },
      select: { id: true, status: true },
    });

    // The person who set it up is waiting on this, and nothing else would tell them.
    const creator = await this.prisma.user.findUnique({
      where: { id: ground.initiatorId },
      select: { email: true, firstName: true },
    });
    const url = `${this.config.get<string>('resend.frontendUrl') ?? ''}/grounds/${ground.id}`;
    if (creator?.email) {
      await this.email
        .sendGroundApproved(creator.email, creator.firstName ?? 'there', ground.label, url)
        .catch((err: any) => this.logger.error(`Approval email failed for ground ${ground.id}: ${err.message}`));
    }
    return { ...updated, alreadyDecided: false };
  }

  /**
   * Declined. The ground is CLOSED rather than deleted: somebody wrote it, and a row
   * that vanishes is indistinguishable from a bug to the person who created it.
   */
  async declineGround(groundId: string, organizationId: string, adminUserId: string, reason?: string) {
    const ground = await this.prisma.ground.findFirst({
      where: { id: groundId, organizationId },
      select: { id: true, status: true, label: true, initiatorId: true },
    });
    if (!ground) throw new NotFoundException('Ground not found');
    if (ground.status !== GroundStatus.AWAITING_APPROVAL) {
      return { id: ground.id, status: ground.status, alreadyDecided: true };
    }
    const updated = await this.prisma.ground.update({
      where: { id: groundId },
      data: {
        status: GroundStatus.CLOSED,
        closedAt: new Date(),
        approvedById: adminUserId,
        approvedAt: new Date(),
        declineReason: reason?.trim() || null,
      },
      select: { id: true, status: true },
    });
    const creator = await this.prisma.user.findUnique({
      where: { id: ground.initiatorId },
      select: { email: true, firstName: true },
    });
    if (creator?.email) {
      await this.email
        .sendGroundDeclined(creator.email, creator.firstName ?? 'there', ground.label, reason?.trim() || null)
        .catch((err: any) => this.logger.error(`Decline email failed for ground ${ground.id}: ${err.message}`));
    }
    return { ...updated, alreadyDecided: false };
  }

  /** What is waiting on an admin. Oldest first: the longest wait is the worst one. */
  async listAwaitingApproval(organizationId: string) {
    const rows = await this.prisma.ground.findMany({
      where: { organizationId, status: GroundStatus.AWAITING_APPROVAL },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, label: true, scenario: true, createdAt: true, timelineDays: true, cadence: true,
        initiator: { select: { firstName: true, lastName: true, email: true } },
      },
    });
    return rows.map((g) => ({
      id: g.id,
      label: g.label,
      scenario: g.scenario,
      createdAt: g.createdAt,
      timelineDays: g.timelineDays,
      cadence: g.cadence,
      createdBy: [g.initiator.firstName, g.initiator.lastName].filter(Boolean).join(' ') || g.initiator.email,
    }));
  }

  async addMyNote(groundId: string, userId: string, text: string) {
    const trimmed = (text ?? '').trim();
    if (!trimmed) throw new BadRequestException('A note needs some words in it.');
    const participant = await this.prisma.groundParticipant.findFirst({
      where: { groundId, userId },
      select: { id: true },
    });
    if (!participant) throw new ForbiddenException('You are not a party to this ground');
    const note = await this.prisma.participantNote.create({
      data: { groundId, participantId: participant.id, text: trimmed },
      select: { id: true, text: true, createdAt: true, carriedIntoCheckInId: true },
    });
    return note;
  }

  /** This person's own notes on this ground, oldest first. Nobody else can read them. */
  async getMyNotes(groundId: string, userId: string) {
    const participant = await this.prisma.groundParticipant.findFirst({
      where: { groundId, userId },
      select: { id: true },
    });
    if (!participant) throw new ForbiddenException('You are not a party to this ground');
    return this.prisma.participantNote.findMany({
      where: { participantId: participant.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true, text: true, createdAt: true, carriedIntoCheckInId: true },
    });
  }

  /** Delete one of your own notes. A note is a scratch thought; you can take it back. */
  async deleteMyNote(groundId: string, userId: string, noteId: string) {
    const participant = await this.prisma.groundParticipant.findFirst({
      where: { groundId, userId },
      select: { id: true },
    });
    if (!participant) throw new ForbiddenException('You are not a party to this ground');
    // Scoped by participantId as well as id, so one person cannot delete another's
    // by guessing an id.
    const { count } = await this.prisma.participantNote.deleteMany({
      where: { id: noteId, participantId: participant.id },
    });
    if (count === 0) throw new NotFoundException('Note not found');
    return { deleted: true };
  }

  /**
   * A PERSON'S OWN READ ON THEIR OWN RECORD. Private, owner only, and it stays that way:
   * `what-a-leader-can-weigh.ts` refuses to hand specificity to a lead, because it measures how
   * somebody WRITES and reading that as how they WORK is the quiet unfairness this product exists
   * to prevent.
   *
   * It used to return one word - high, moderate, low - and the page printed it as "Overall quality
   * label: low". That is the same verdict, just pointed at the person it belongs to, and it gave
   * them nothing to do about it. A grade you cannot act on is a grade for somebody else's benefit.
   *
   * So it now returns the two things that are actually usable: which way it is going, and the one
   * concrete thing missing from their own recent answers. `whatWouldHelp` is derived from their own
   * entries by the same `runIntake` the engine uses, so it names what the engine itself was looking
   * for and did not find - a date, a number, a name - rather than scoring the prose.
   *
   * `label` stays on the response: `getMyRecord` returns it too and both renders read it.
   */
  async getMySpecificity(groundId: string, userId: string): Promise<{
    scores: number[];
    label: string;
    trend: 'rising' | 'steady' | 'falling' | 'new';
    whatWouldHelp: string | null;
    strongest: string | null;
  }> {
    const participant = await this.prisma.groundParticipant.findFirst({
      where: { groundId, userId },
      select: { id: true, specificityHistory: true },
    });
    if (!participant) throw new ForbiddenException('You are not a party to this ground');
    const raw: number[] = (participant.specificityHistory as number[]) ?? [];
    const scores = raw.filter(n => typeof n === 'number' && isFinite(n));
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const label = avg >= 0.65 ? 'high' : avg >= 0.35 ? 'moderate' : 'low';

    /**
     * Under three sessions there is no trend, only noise, and telling somebody their record is
     * "falling" off two numbers is a verdict dressed as an observation.
     */
    let trend: 'rising' | 'steady' | 'falling' | 'new' = 'new';
    if (scores.length >= 3) {
      const half = Math.floor(scores.length / 2);
      const early = scores.slice(0, half).reduce((a, b) => a + b, 0) / half;
      const late = scores.slice(-half).reduce((a, b) => a + b, 0) / half;
      trend = late - early > 0.08 ? 'rising' : early - late > 0.08 ? 'falling' : 'steady';
    }

    /**
     * The teaching half. Their own last few answers, read for the things the engine could not
     * find in them, and their own best answer quoted back as what the checkable version looked
     * like. Showing beats grading: it is the move the engine already makes in conversation.
     */
    const entries = await this.prisma.recordEntry.findMany({
      where: { participantId: participant.id },
      orderBy: { createdAt: 'desc' },
      take: 12,
      select: { text: true },
    });
    let whatWouldHelp: string | null = null;
    let strongest: string | null = null;
    if (entries.length) {
      const read = entries.map(e => ({ text: e.text, ...runIntake(e.text) }));
      const undated = read.filter(r => !/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|monday|tuesday|wednesday|thursday|friday|last week|this week|yesterday|\d{1,2}\/\d{1,2}|\d{4}-\d{2}-\d{2})\b/i.test(r.text)).length;
      const unnumbered = read.filter(r => !/\d/.test(r.text)).length;
      const vague = read.filter(r => r.vagueLanguage.length > 0).length;
      if (unnumbered > entries.length / 2) {
        whatWouldHelp = 'Most of your answers so far have no number in them. How many, how long, how often - one figure makes an account checkable that otherwise rests on memory.';
      } else if (undated > entries.length / 2) {
        whatWouldHelp = 'Most of your answers so far do not say when. A week, a date, "before the handover" - anything that places it in time lets the other accounts line up against it.';
      } else if (vague > entries.length / 3) {
        whatWouldHelp = `Some answers lean on words like "${read.find(r => r.vagueLanguage.length)?.vagueLanguage[0]}". Naming what actually happened instead carries further than describing it.`;
      }
      const best = read.filter(r => r.specificity >= 0.5).sort((a, b) => b.specificity - a.specificity)[0];
      if (best) strongest = best.text.slice(0, 220);
    }

    return { scores, label, trend, whatWouldHelp, strongest };
  }

  /**
   * Pause a ground - marks status = PAUSED, stamps pausedAt. Typically called
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
   * GET /grounds/:id/conversation - returns all participant conversation transcripts
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
   *
   * "Active" = anybody who accepted their invite, anybody who has already
   * completed this session, and anybody whose invitation is still live. Only a
   * lapsed invitation drops somebody out of the count, so a no-show cannot hold
   * the round open forever and a person still on their way cannot be skipped.
   *
   * Works for two-party and multi-party grounds, and the difference between the
   * two is where this went wrong before - see the comment on the query.
   */
  async isSessionReadyForReport(groundId: string, sessionNumber: number): Promise<boolean> {
    // A participant is "active" if they accepted the invite (userId set) OR if
    // they already completed a check-in for this session (participant-chat flow
    // can complete a session before the user registers a full account).
    //
    // managingOnly is excluded here on purpose: a lead who chose "managing
    // only" at confirm-lead has userId set (they ARE the initiator's own
    // user) but was deliberately never given a session-1 check-in - see
    // confirmLead. Without this exclusion they would match the `userId not
    // null` clause, count toward the >=2 requirement, then fail the
    // completed-check-in loop below forever (they have no check-in to
    // complete), so the ground would wait for a report that can never
    // release. A managing-only lead is not a party to the comparison.
    /**
     * SOMEBODY WHOSE INVITATION IS STILL OPEN HAS NOT DECLINED. THEY ARE ON
     * THEIR WAY, AND THE ROUND IS NOT OVER.
     *
     * The clause that used to be here counted only people who had ACCEPTED, so
     * anybody still holding an unopened invitation was invisible to the count.
     * On a two-party ground that never shows: there is no third person hovering
     * between invited and accepted for long enough to matter.
     *
     * On ground 2 of the eighteen it showed immediately, and badly. Six people
     * were invited. Three accepted and checked in within the hour. The other
     * three had not opened their email yet, so the round was declared complete at
     * three of six: the shared record released, the ground went ACTIVE, and Eric
     * - who had not written a word - received
     *
     *     "Your shared record is ready: Atlas build, scope and ownership"
     *
     * about work he is part of, built entirely from other people's accounts of
     * it. Session 1 had passed him by. That is the exact failure this product
     * exists to prevent, arriving by email with the product's name on it.
     *
     * So the round now waits on anybody with a LIVE invitation as well. It still
     * does not wait forever, and that was the real point of the original clause:
     * once an invitation has expired, that person drops out of the count and the
     * others are not held hostage. The ground waits exactly as long as the
     * invitation is good for and not a day longer.
     */
    const active = await this.prisma.groundParticipant.findMany({
      where: {
        groundId,
        managingOnly: false,
        OR: [
          { userId: { not: null } },
          { checkIns: { some: { sessionNumber, status: CheckInStatus.COMPLETED } } },
          // Invited, not yet accepted, and the invitation has not run out.
          {
            userId: null,
            invitedAt: { not: null },
            inviteTokenExpiresAt: { gt: new Date() },
          },
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

  /** Backward-compat alias - checks session 1 readiness. */
  async isReportReady(groundId: string): Promise<boolean> {
    return this.isSessionReadyForReport(groundId, 1);
  }

  /**
   * Progress for the round currently in play, using the same "active" party
   * definition as isSessionReadyForReport (accepted invite OR already
   * completed this session). Lets the client show "N of M checked in" before
   * the report exists, instead of showing nothing until the round is full.
   */
  async getSessionProgress(groundId: string): Promise<{
    sessionNumber: number;
    total: number;
    completed: number;
    missingParticipantIds: string[];
  } | null> {
    // Current round = the highest sessionNumber any check-in row exists for.
    const maxSession = await this.prisma.checkIn.aggregate({
      where: { participant: { groundId } },
      _max: { sessionNumber: true },
    });
    const sessionNumber = maxSession._max.sessionNumber ?? 1;

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
    if (active.length === 0) return null;

    const completedCheckIns = await this.prisma.checkIn.findMany({
      where: { participantId: { in: active.map((p) => p.id) }, sessionNumber, status: CheckInStatus.COMPLETED },
      select: { participantId: true },
    });
    const completedIds = new Set(completedCheckIns.map((c) => c.participantId));

    return {
      sessionNumber,
      total: active.length,
      completed: completedIds.size,
      missingParticipantIds: active.filter((p) => !completedIds.has(p.id)).map((p) => p.id),
    };
  }

  /**
   * Return the authenticated contributor's private longitudinal record for a ground.
   * Specificity trend and pattern observations are gated behind billing - they
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

    // Confidence score - how many completed sessions cross-referenced against specificity
    const completedCount = sessions.filter(s => s.status === 'COMPLETED').length;
    const confScore = Math.min(5, completedCount + (avg >= 0.5 ? 1 : 0));
    const confLabel = confScore >= 4 ? 'High' : confScore >= 2 ? 'Building' : 'Early';
    const confDesc = confScore >= 4
      ? 'Multiple sessions cross-referenced. Your record carries strong evidential weight.'
      : confScore >= 2
        ? 'Your record is taking shape. Each session adds depth and specificity to the picture.'
        : 'Your record is just beginning. One more session will start to show the full picture.';

    // Diplomatic pattern observations - never name the code, never frame as a verdict
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

  /**
   * Explicit "my account is accurate, I'm done" confirmation - the deadline
   * for corrections, in place of an arbitrary timer. Signing off does NOT
   * block startSelfCorrectionSession() afterward; a signed-off participant
   * may still genuinely need to fix something. What changes is that any
   * self-correction session started after this point gets CheckIn.isPostSignOff
   * stamped, so the shared report surfaces it as a flagged update rather than
   * silently blending it in as if it had always been there. No undo in v1.
   */
  async signOff(groundId: string, userId: string): Promise<{ signedOffAt: Date }> {
    const participant = await this.prisma.groundParticipant.findFirst({
      where: { groundId, userId },
      select: { id: true, signedOffAt: true },
    });
    if (!participant) throw new ForbiddenException('You are not a party to this ground');
    if (participant.signedOffAt) return { signedOffAt: participant.signedOffAt };
    const updated = await this.prisma.groundParticipant.update({
      where: { id: participant.id },
      data: { signedOffAt: new Date() },
      select: { signedOffAt: true },
    });
    return { signedOffAt: updated.signedOffAt! };
  }
}

/**
 * Rewrites a raw pattern observation into a diplomatic first-person reflection.
 * The original observation describes a behaviour; this wraps it so the contributor
 * reads it as something worth noticing in their own record - not a verdict.
 */
function diplomaticObservation(raw: string): string {
  if (!raw.trim()) return '';
  // Strip any period tags from the three-period rule bookkeeping
  const cleaned = raw.replace(/^\[period=\d+\]\s*/i, '').trim();
  return `Your record across sessions shows something worth noticing: ${cleaned.charAt(0).toLowerCase()}${cleaned.slice(1)} It is worth being aware of as your record builds.`;
}
