import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { SEAT_RELATION_COUNT } from '../../common/seats';
import { isSubscribed } from '../../common/subscription';

@Injectable()
export class AdminService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly email: EmailService,
  ) {}

  /**
   * One-time platform-admin bootstrap. Runs on every startup, but is a no-op
   * unless BOTH: (a) PLATFORM_ADMIN_BOOTSTRAP_EMAIL is set, and (b) no
   * platform admin exists anywhere yet. Once any platform admin exists, this
   * never fires again - it cannot be used to add a second admin, or to
   * re-promote someone after they're demoted. Promoting anyone beyond the
   * first admin goes through POST /admin/add-admin (platform-admin + OTP),
   * same as always.
   */
  async onApplicationBootstrap() {
    const bootstrapEmail = this.config.get<string>('app.platformAdminBootstrapEmail');
    if (!bootstrapEmail) return;

    const anyPlatformAdminExists = await this.prisma.user.findFirst({ where: { isPlatformAdmin: true } });
    if (anyPlatformAdminExists) return;

    const user = await this.prisma.user.findUnique({ where: { email: bootstrapEmail.toLowerCase() } });
    if (!user) {
      /**
       * LOUD, not a shrug.
       *
       * This used to log "no user found - skipping" at WARN and carry on, so an
       * operator who set the variable on a fresh install got no platform admin,
       * no account, and no error - just one line in a busy boot log. The
       * back-office review surfaces were unreachable for an entire eighteen-ground
       * test run for exactly this reason, and the conclusion drawn at the time was
       * that the feature did not exist. GW-002.
       *
       * It still does not CREATE the account: this promotes a real person who has
       * signed up, and inventing a user with no password or verified address would
       * be a worse answer than saying so. But it now says so unmistakably, and
       * tells the operator the one thing they need to do next.
       */
      this.logger.error(
        `Platform admin bootstrap FAILED: PLATFORM_ADMIN_BOOTSTRAP_EMAIL is set to "${bootstrapEmail}" ` +
          'but no user has that address, so NO platform admin exists and the back-office is unreachable. ' +
          'Sign that address up through the normal flow, then restart the API - this runs once, ' +
          'and only while no platform admin exists.',
      );
      return;
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { isPlatformAdmin: true } });
    this.logger.warn(`Platform admin bootstrap: promoted ${bootstrapEmail} to platform admin (first admin, one-time only)`);
  }

  // ---------------------------------------------------------------------------
  // Platform stats
  // ---------------------------------------------------------------------------

  async getPlatformStats() {
    const [orgsCount, groundsCount, codesCount, redemptionsCount, freeReasonBreakdown] =
      await Promise.all([
        this.prisma.organization.count(),
        this.prisma.ground.count(),
        this.prisma.contributorCode.count(),
        this.prisma.contributorCodeRedemption.count(),
        this.prisma.ground.groupBy({
          by: ['freeReason'],
          _count: { id: true },
        }),
      ]);

    return {
      orgsCount,
      groundsCount,
      codesCount,
      redemptionsCount,
      freeReasonBreakdown: freeReasonBreakdown.map((r) => ({
        freeReason: r.freeReason,
        count: r._count.id,
      })),
    };
  }

  /**
   * THE PAGE THAT ASKED FOR A ROUTE THAT WAS NEVER BUILT.
   *
   * `/admin/dashboard` renders codes, billing, users and feedback, and it asked
   * for all of it from `GET /admin/dashboard` - which did not exist. It also
   * asked through a hand-rolled `fetch('/api' + path)`, one segment short of the
   * `/api/v1` every other call in the client uses, so on staging the request
   * reached the site rather than the API and came back as the page's own HTML:
   * "Unexpected token '<', "<!doctype "... is not valid JSON". Two faults, and
   * the second hid the first.
   *
   * This is the aggregate the page has always declared, composed from the reads
   * that already existed - one round trip for a page that needs four answers at
   * once.
   */
  async getDashboard() {
    const [stats, codes, feedback, usage, subscribedOrgs, sessionsBalance] = await Promise.all([
      this.getPlatformStats(),
      this.getAllCodes(),
      this.getFeedback(),
      this.getUsagePatterns(),
      this.prisma.organization.count({ where: { subscriptionPlan: { not: null } } }),
      this.prisma.ground.aggregate({ _sum: { sessionsBalance: true } }),
    ]);

    /* The four buckets the page draws as a bar. `freeReason` is null on a ground
       somebody paid for, which is the "paid" column - a name rather than a gap. */
    const breakdown = { FIRST_GROUND: 0, FREE_TIER: 0, ACCESS_CODE: 0, paid: 0 };
    for (const row of stats.freeReasonBreakdown) {
      if (row.freeReason === null) breakdown.paid += row.count;
      else if (row.freeReason in breakdown) breakdown[row.freeReason as 'FIRST_GROUND'] += row.count;
    }

    return {
      overview: {
        totalOrgs: stats.orgsCount,
        totalGrounds: stats.groundsCount,
        totalCodes: stats.codesCount,
        totalRedemptions: stats.redemptionsCount,
        totalSubscribedOrgs: subscribedOrgs,
        totalSessionsBalance: sessionsBalance._sum.sessionsBalance ?? 0,
      },
      codes: codes.map((c) => ({
        id: c.id,
        code: c.code,
        creatorEmail: c.createdBy?.email ?? 'no longer here',
        createdAt: c.createdAt,
        expiresAt: c.expiresAt,
        active: c.isActive,
        allowCodeCreation: c.allowCodeCreation,
        redemptionCount: c._count.redemptions,
      })),
      freeReasonBreakdown: breakdown,
      feedback: feedback.map((f) => ({
        id: f.id,
        note: f.note,
        feltFair: f.feltFair,
        createdAt: f.createdAt,
        groundLabel: f.ground?.label ?? 'a deleted check-in',
        orgSlug: f.ground?.organization?.slug ?? '-',
      })),
      userUsage: usage.perUser.map((u) => ({
        userId: u.id,
        email: u.email,
        groundCount: u._count.groundsInitiated,
        codeCount: u._count.contributorCodes,
        redemptionCount: u._count.codeRedemptions,
        /* Null, honestly. Nothing records a last-seen time, and picking the
           nearest thing we do store - the row's updatedAt - would put a
           confident date under a heading it does not answer. */
        lastActive: null,
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // Per-user + per-org usage patterns
  // ---------------------------------------------------------------------------

  async getUsagePatterns() {
    const [perOrg, perUser] = await Promise.all([
      this.prisma.organization.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          freeSessionsUsed: true,
          firstGroundUsed: true,
          careFeeStatus: true,
          _count: { select: { grounds: true, ...SEAT_RELATION_COUNT } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isPlatformAdmin: true,
          role: true,
          organization: { select: { id: true, name: true, slug: true } },
          /* `contributorCodes` is the codes they made; `codeRedemptions` is the
             codes they used. Two different facts about one person, and the
             dashboard shows both. */
          _count: { select: { groundsInitiated: true, codeRedemptions: true, contributorCodes: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    ]);

    return { perOrg, perUser };
  }

  // ---------------------------------------------------------------------------
  // Codes
  // ---------------------------------------------------------------------------

  async getAllCodes() {
    return this.prisma.contributorCode.findMany({
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        createdBy: { select: { id: true, email: true, firstName: true, lastName: true } },
        redeemedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
        redemptions: {
          include: {
            ground: { select: { id: true, label: true, status: true, freeReason: true } },
            redeemedBy: { select: { id: true, email: true } },
          },
        },
        _count: { select: { redemptions: true, groundsCreated: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCodeUsage(codeId: string) {
    const code = await this.prisma.contributorCode.findUnique({
      where: { id: codeId },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        createdBy: { select: { id: true, email: true, firstName: true, lastName: true } },
        redeemedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
        redemptions: {
          include: {
            ground: {
              select: {
                id: true,
                label: true,
                status: true,
                freeReason: true,
                createdAt: true,
                organization: { select: { id: true, name: true } },
              },
            },
            redeemedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
          orderBy: { redeemedAt: 'desc' },
        },
        childCodes: {
          select: { id: true, code: true, isActive: true, sessionsGranted: true, sessionsUsed: true },
        },
      },
    });

    if (!code) throw new NotFoundException(`ContributorCode ${codeId} not found`);
    return code;
  }

  // ---------------------------------------------------------------------------
  // Feedback
  // ---------------------------------------------------------------------------

  /**
   * #6: internal support view for a single ground. Platform admins had
   * aggregate stats/codes/feedback but NO way to look at an individual
   * ground when a customer reports a problem. State/billing/roster/
   * check-in-status/report-state only - NEVER conversation content.
   *
   * Hard privacy boundary (deliberately excluded, do not add back):
   * - ConversationTurn content (raw check-in text)
   * - RecordEntry content (only counts are safe, never the extracted text)
   * - Any Report content field (sharedPicture, agreements, divergences,
   *   centralQuestion, soloArtifact, hiddenContributors, arcSignals,
   *   finalSynthesis) - existence/releasedAt only, never content, not even
   *   the "anonymized" synthesized version
   * - LeadContextNote text
   * - GroundDocument content/annotations
   * - getMediatorBrief's gapSummary (derived from Report.centralQuestion)
   * - ParticipantRequest.reason text (user-authored free text that can
   *   contain exactly the kind of content this boundary excludes) - count
   *   of pending requests only
   */
  async getGroundSupportView(groundId: string) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: {
        id: true,
        label: true,
        scenario: true,
        moment: true,
        status: true,
        cadence: true,
        timelineDays: true,
        startsAt: true,
        endsAt: true,
        createdAt: true,
        isFreeGround: true,
        freeReason: true,
        sessionsBalance: true,
        billingActivatedAt: true,
        billingEnabled: true,
        paymentConfirmed: true,
        organization: {
          select: {
            id: true,
            name: true,
            subscriptionPlan: true,
            subscriptionStatus: true,
            careFeeStatus: true,
          },
        },
        participants: {
          select: {
            id: true,
            email: true,
            partyType: true,
            userId: true,
            managingOnly: true,
            invitedAt: true,
            notifiedAt: true,
            inviteDeliveryStatus: true,
            _count: { select: { recordEntries: true } },
            checkIns: {
              select: {
                id: true,
                sessionNumber: true,
                status: true,
                availableFrom: true,
                completedAt: true,
              },
              orderBy: { sessionNumber: 'asc' },
            },
            reportActivations: { select: { status: true } },
          },
        },
        report: { select: { id: true, releasedAt: true, createdAt: true } },
      },
    });
    if (!ground) throw new NotFoundException('Check-in not found');

    const pendingParticipantRequests = await this.prisma.participantRequest.count({
      where: { groundId, status: 'PENDING' },
    });

    return {
      id: ground.id,
      label: ground.label,
      scenario: ground.scenario,
      moment: ground.moment,
      status: ground.status,
      cadence: ground.cadence,
      timelineDays: ground.timelineDays,
      startsAt: ground.startsAt,
      endsAt: ground.endsAt,
      createdAt: ground.createdAt,
      isFreeGround: ground.isFreeGround,
      freeReason: ground.freeReason,
      sessionsBalance: ground.sessionsBalance,
      billing: {
        billingActivatedAt: ground.billingActivatedAt,
        billingEnabled: ground.billingEnabled,
        paymentConfirmed: ground.paymentConfirmed,
        organizationId: ground.organization.id,
        organizationName: ground.organization.name,
        subscriptionPlan: ground.organization.subscriptionPlan,
        subscriptionStatus: ground.organization.subscriptionStatus,
        careFeeStatus: ground.organization.careFeeStatus,
      },
      roster: ground.participants.map((p) => ({
        id: p.id,
        email: p.email,
        partyType: p.partyType,
        accepted: p.userId !== null,
        managingOnly: p.managingOnly,
        invitedAt: p.invitedAt,
        notifiedAt: p.notifiedAt,
        inviteDeliveryStatus: p.inviteDeliveryStatus,
        recordEntryCount: p._count.recordEntries,
        checkIns: p.checkIns.map((c) => ({
          sessionNumber: c.sessionNumber,
          status: c.status,
          availableFrom: c.availableFrom,
          completedAt: c.completedAt,
        })),
        activationStatus: p.reportActivations[0]?.status ?? null,
      })),
      report: ground.report
        ? { exists: true, releasedAt: ground.report.releasedAt, createdAt: ground.report.createdAt }
        : { exists: false, releasedAt: null, createdAt: null },
      pendingParticipantRequests,
    };
  }

  /**
   * EVERY CALL SOMEBODY HAS ASKED FOR, IN ONE LIST.
   *
   * Coaching, setup help and integration support are all the same request with a different subject:
   * somebody asks, our team rings back, and what they agree is invoiced by hand. There is no second
   * queue for them and there must not be - a request sitting in a list nobody opens is the same as
   * a request nobody made, which is what happened to the mail at hello@ for months.
   *
   * WITH WHO TO RING AND WHETHER THEY PAY US. Not to gate anything - the request is never gated -
   * but because a call to somebody on the free plan is a different conversation from a call to a
   * customer, and whoever picks it up should not have to go and look it up.
   */
  async getCallRequests() {
    const rows = await this.prisma.callRequest.findMany({
      where: { status: 'new' },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true, kind: true, note: true, createdAt: true, status: true,
        requestedById: true,
        organization: { select: { name: true, subscriptionPlan: true, subscriptionStatus: true } },
      },
    }).catch(() => [] as any[]);

    /*
     * WHO ASKED, LOOKED UP SEPARATELY. `CallRequest` keeps the id and has no relation to `User` -
     * adding one would be a migration for a queue read, and a queue read is the last thing that
     * should be shaping the schema. Two hundred rows, one extra query.
     */
    const people = rows.length
      ? await this.prisma.user.findMany({
        where: { id: { in: [...new Set(rows.map((r: any) => r.requestedById))] } },
        select: { id: true, email: true, firstName: true, lastName: true },
      }).catch(() => [] as any[])
      : [];
    const byId = new Map(people.map((p: any) => [p.id, p]));

    return {
      requests: rows.map((r: any) => ({
        id: r.id,
        about: r.kind,
        note: r.note,
        askedAt: r.createdAt,
        orgName: r.organization?.name ?? 'an organisation',
        paying: isSubscribed(r.organization ?? { subscriptionPlan: null, subscriptionStatus: null }),
        who: [byId.get(r.requestedById)?.firstName, byId.get(r.requestedById)?.lastName]
          .filter(Boolean).join(' ').trim()
          || byId.get(r.requestedById)?.email || 'somebody',
        email: byId.get(r.requestedById)?.email ?? null,
      })),
    };
  }

  /** Answered is the only thing anybody does to one here. The call happens on a phone. */
  async markCallAnswered(id: string) {
    await this.prisma.callRequest.update({ where: { id }, data: { status: 'answered' } });
    return this.getCallRequests();
  }

  /**
   * MAIL SENT TO US, NEWEST FIRST.
   *
   * The address is on the marketing site and went to one person's inbox, where nobody else could
   * see it and nothing could be picked up if she were away. Unread first is deliberately NOT the
   * order: a message somebody has read is still the one that might need answering, and hiding it
   * below fifty older ones is how an inbox becomes a place things go missing.
   */
  async getInbox() {
    const messages = await this.prisma.inboundMessage.findMany({
      orderBy: { receivedAt: 'desc' },
      take: 200,
      select: {
        id: true, fromAddress: true, fromName: true, toAddress: true,
        subject: true, body: true, receivedAt: true, readAt: true,
      },
    });
    return { messages, unread: messages.filter((m) => !m.readAt).length };
  }

  /** Marking one read is the only thing anybody can do to it here. Replying happens in real mail. */
  async markInboundRead(id: string, userId: string) {
    await this.prisma.inboundMessage.update({
      where: { id },
      data: { readAt: new Date(), readById: userId },
    });
    return this.getInbox();
  }

  async getFeedback() {
    return this.prisma.outcomeFeedback.findMany({
      include: {
        ground: {
          select: {
            id: true,
            label: true,
            status: true,
            scenario: true,
            organization: { select: { id: true, name: true, slug: true } },
          },
        },
        participant: {
          select: {
            id: true,
            email: true,
            partyType: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ---------------------------------------------------------------------------
  // Disable code (destructive - OTP required)
  // ---------------------------------------------------------------------------

  async disableCode(codeId: string) {
    const code = await this.prisma.contributorCode.findUnique({ where: { id: codeId } });
    if (!code) throw new NotFoundException(`ContributorCode ${codeId} not found`);

    return this.prisma.contributorCode.update({
      where: { id: codeId },
      data: { isActive: false },
    });
  }

  // ---------------------------------------------------------------------------
  // Add platform admin (destructive - OTP required)
  // ---------------------------------------------------------------------------

  async addPlatformAdmin(targetEmail: string) {
    /*
     * LOWERCASED, BECAUSE THAT IS HOW ADDRESSES ARE STORED.
     *
     * Every signup path writes `email.toLowerCase()`. This looked the address up
     * exactly as typed, so adding "Hafsah.Jumare@coamana.com" answered "No user
     * found with that email" about an account that plainly exists - and the
     * person reading it has no way to tell a capital letter from a missing account.
     */
    const address = targetEmail?.trim().toLowerCase();
    if (!address) throw new BadRequestException('email is required');

    const user = await this.prisma.user.findUnique({ where: { email: address } });
    if (!user) {
      throw new NotFoundException(
        `No Groundwork account uses ${address}. They have to sign up and verify the address first - this promotes an account, it does not create one.`,
      );
    }

    this.logger.warn(`Platform admin added: ${address}`);
    return this.prisma.user.update({
      where: { id: user.id },
      data: { isPlatformAdmin: true },
      select: { id: true, email: true, firstName: true, lastName: true, isPlatformAdmin: true },
    });
  }

  /**
   * WHO CAN REACH THE PLATFORM CONSOLE.
   *
   * There was a way to add one and no way to see the list, so "platform ops is
   * only the people I added" was a belief rather than something anybody could
   * check. Two ways in exist and no more: the one-time bootstrap, which only
   * fires while no admin exists at all, and `addPlatformAdmin` above - platform
   * admin plus an emailed code. Nothing else writes the flag.
   */
  listPlatformAdmins() {
    return this.prisma.user.findMany({
      where: { isPlatformAdmin: true, deletedAt: null },
      select: { id: true, email: true, firstName: true, lastName: true, createdAt: true },
      orderBy: { email: 'asc' },
    });
  }

  /**
   * Take somebody off the list.
   *
   * Refuses the last one, for the same reason the ops system refuses to revoke
   * the last approver: an empty list cannot be added to, because adding needs a
   * platform admin. It would lock the console permanently and the only way back
   * would be the database.
   */
  async removePlatformAdmin(userId: string, callerUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, isPlatformAdmin: true },
    });
    if (!user || !user.isPlatformAdmin) throw new NotFoundException('That account is not a platform admin.');

    const others = await this.prisma.user.count({
      where: { isPlatformAdmin: true, deletedAt: null, id: { not: userId } },
    });
    if (others === 0) {
      throw new ConflictException(
        `${user.email} is the only platform admin. Add somebody else first - with none, nobody can ever add one, because adding requires being one.`,
      );
    }

    /* Removing yourself is allowed and worth saying out loud: it is a normal
       thing to do when handing over, and refusing it would be the software
       deciding who runs the company. */
    if (userId === callerUserId) {
      this.logger.warn(`Platform admin removed THEMSELVES: ${user.email}`);
    } else {
      this.logger.warn(`Platform admin removed: ${user.email}`);
    }

    await this.prisma.user.update({ where: { id: userId }, data: { isPlatformAdmin: false } });
    return { removed: user.email };
  }

  // ---------------------------------------------------------------------------
  // OTP - stored as JSON in AdminProfile.signals to avoid schema migrations.
  // The field is typed as Json (any[]) in the model; we repurpose it here to
  // hold a single-element object: { adminOtp: { hash, expiresAt, used } }.
  // ---------------------------------------------------------------------------

  async generateOtpForAdmin(userId: string): Promise<{ otp?: string; sent: boolean }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    const plainOtp = String(Math.floor(100000 + Math.random() * 900000));
    const hash = await bcrypt.hash(plainOtp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

    const otpPayload = { hash, expiresAt, used: false };

    // Upsert AdminProfile - store OTP in a dedicated key alongside existing signals.
    await this.prisma.adminProfile.upsert({
      where: { userId },
      create: { userId, signals: [], adminOtp: otpPayload },
      update: { adminOtp: otpPayload },
    });

    /*
     * THE CODE GOES BY EMAIL, OR THE CALLER IS TOLD IT DID NOT.
     *
     * Three things were wrong here and they compounded:
     *
     *   1. `NODE_ENV !== 'production'` returned the plain code IN THE RESPONSE BODY. That is right
     *      for a laptop and wrong for staging, which is not production either - so on staging the
     *      second factor guarding operations that cannot be undone was handed to whoever asked for
     *      it. The gate is now whether the mail actually went, not what the environment is called.
     *
     *   2. It reached past this class's type with `(this.email as any).sendEmail(...)`, skipping
     *      the opt-out check and the sender classification. Suppressing the opt-out for an OTP is
     *      correct; doing it by cast means the next person to copy the line suppresses something
     *      that should not be. `sendAdminOtp` is a real sender, classified as the way back in.
     *
     *   3. A send failure was caught, logged and answered `{ sent: true }` - so an admin waited for
     *      a code that was never coming, and the operation they were part-way through simply could
     *      not be completed.
     *
     * The code is returned only where there was no way to send it at all, which is a laptop with no
     * mail key configured. Then it is the difference between a working local setup and none.
     */
    const posted = await this.email.sendAdminOtp(user.email, plainOtp);
    if (posted.sent) {
      this.logger.log(`Admin code emailed to ${user.email} for an operation that cannot be undone.`);
      return { sent: true };
    }

    this.logger.warn(
      `Admin code for ${user.email} could not be emailed (${posted.because}). ` +
        `Returning it to the caller, which is only acceptable because nothing can deliver it.`,
    );
    return { otp: plainOtp, sent: false };
  }

  async verifyOtpForAdmin(userId: string, plainOtp: string): Promise<boolean> {
    const profile = await this.prisma.adminProfile.findUnique({ where: { userId } });
    if (!profile) throw new BadRequestException('No OTP has been generated for this user');

    const stored = profile.adminOtp as unknown as {
      hash: string;
      expiresAt: string;
      used: boolean;
    } | null;

    if (!stored) throw new BadRequestException('No OTP has been generated for this user');
    if (stored.used) throw new BadRequestException('OTP has already been used');
    if (new Date(stored.expiresAt) < new Date()) throw new BadRequestException('OTP has expired');

    const valid = await bcrypt.compare(plainOtp, stored.hash);
    if (!valid) throw new BadRequestException('Invalid OTP');

    // Mark as used
    await this.prisma.adminProfile.update({
      where: { userId },
      data: { adminOtp: { ...stored, used: true } },
    });

    return true;
  }
}
