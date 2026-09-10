import { Injectable, Logger, Inject, forwardRef, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { alreadyOpen, Subject } from './what-a-call-is-about';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateUserDto, UpdateUserDto } from './dto';
import { PaginationDto } from '../../common';
import { TokenType } from '@prisma/client';
import { setRole, RoleWrite } from './a-role-is-stored-twice';
import { BillingService } from '../billing/billing.service';
import { AuthService } from '../auth/auth.service';
import { addressesIn, planFor, summarise, MOST_IN_ONE_PASTE, Row } from './putting-a-whole-company-on';
import { RolloutFacts } from './where-a-rollout-has-got-to';
import { isSubscribed } from '../../common/subscription';
import { HOW_A_NEW_ORG_WORKS } from '../grounds/who-may-open-a-check-in';
import { mayChange, mayHandOver } from './the-person-who-set-this-up';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    /* For seats. The paste screen has to know the cap before it sends, not one refusal at a time. */
    private billing: BillingService,
    /* The one implementation of "invite somebody", reused rather than reproduced. */
    @Inject(forwardRef(() => AuthService)) private auth: AuthService,
  ) {}

  /**
   * A WHOLE COMPANY AT ONCE, previewed or sent through the same code.
   *
   * `preview` changes nothing about how the list is read - it stops before the sending. That is
   * deliberate: a preview computed separately from the send is a second implementation that will
   * one day disagree, on the screen where somebody decides whether to email 160 colleagues.
   */
  /**
   * WHERE THIS ROLLOUT HAS GOT TO, in one request.
   *
   * One call rather than five, because the screen it feeds is the first thing an admin sees and a
   * waterfall of five requests is how a landing page arrives in pieces.
   *
   * Counts only. No names, no emails, no plan - the console needs to know whether a step happened,
   * and anything more than that is a second copy of data the pages themselves already serve.
   */
  async rolloutFacts(organizationId: string): Promise<RolloutFacts> {
    const [people, admins, checkIns, org, keys] = await Promise.all([
      this.prisma.user.count({ where: { organizationId, deletedAt: null } }),
      this.prisma.user.count({ where: { organizationId, deletedAt: null, role: 'ADMIN', isActive: true } }),
      this.prisma.ground.count({ where: { organizationId } }),
      this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: { subscriptionPlan: true, subscriptionStatus: true },
      }),
      this.prisma.apiCredential.count({ where: { organizationId, revokedAt: null } }),
    ]);
    return {
      people,
      admins,
      checkIns,
      /* The one definition of paying, rather than a sixth comparison against a bare string. */
      paying: isSubscribed(org ?? { subscriptionPlan: null, subscriptionStatus: null }),
      connected: keys > 0,
    };
  }

  /**
   * ASKING TO TALK TO US, WHICH ENDS IN A ROW SOMEBODY CAN ACT ON.
   *
   * A mailto is a request that exists only if a message arrives, gets read, and is not filtered -
   * three things nobody can check. This is a row with a company, a person and a date on it.
   *
   * IDEMPOTENT WHILE ONE IS OPEN. A second click is somebody checking the first one worked.
   */
  async requestACall(
    organizationId: string,
    requestedById: string,
    note?: string,
    subject: Subject = 'CALL',
  ) {
    /*
     * PER SUBJECT, NOT PER ORGANISATION. The old rule meant asking for a coach silently swallowed a
     * later request for integration help - the second click said it worked and nothing was written
     * down. Clicking the SAME one twice is still one request.
     */
    const open = await this.prisma.callRequest.findMany({
      where: { organizationId, status: 'new' },
      select: { id: true, kind: true, createdAt: true },
    });
    const already = alreadyOpen(subject, open as { kind: string; createdAt: Date }[]);
    if (already) return { asked: true, at: already.createdAt, alreadyOpen: true, subject };

    const row = await this.prisma.callRequest.create({
      data: {
        organizationId,
        requestedById,
        kind: subject as any,
        /* Their words, trimmed and bounded. Nothing is inferred from it. */
        note: note?.trim()?.slice(0, 2000) || null,
      },
      select: { createdAt: true },
    });
    this.logger.log(`Call requested by org ${organizationId} about ${subject}.`);
    return { asked: true, at: row.createdAt, alreadyOpen: false, subject };
  }

  /**
   * WHICH ONES ARE ALREADY OPEN, so each button says so rather than offering to ask again.
   *
   * Returns a map rather than a boolean: with four subjects, "have they asked" is four questions,
   * and answering it with one boolean is how a page tells somebody their coaching request is
   * pending when what is pending is an integration one.
   */
  async callAlreadyRequested(organizationId: string) {
    const open = await this.prisma.callRequest.findMany({
      where: { organizationId, status: 'new' },
      select: { kind: true, createdAt: true },
    });
    const asked: Record<string, string> = {};
    for (const row of open) asked[row.kind] = row.createdAt.toISOString();
    return {
      /* Kept so anything reading the old shape still sees the original question answered. */
      asked: open.some((o) => o.kind === 'CALL'),
      at: open.find((o) => o.kind === 'CALL')?.createdAt ?? null,
      open: asked,
    };
  }

  /** How check-ins work here, in the shape the rule reads. */
  async howCheckInsWork(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { whoMayOpenCheckIns: true, checkInsNeedApproval: true },
    });
    return {
      whoMayOpen: org?.whoMayOpenCheckIns ?? HOW_A_NEW_ORG_WORKS.whoMayOpen,
      needsApproval: org?.checkInsNeedApproval ?? HOW_A_NEW_ORG_WORKS.needsApproval,
    };
  }

  /**
   * CHANGE ONE OR BOTH.
   *
   * An unrecognised value is refused rather than written. A typo in `whoMayOpen` would otherwise
   * land in the column, fail no check, and be read by `mayOpen` as "not NAMED_LEADS" - which is
   * the permissive branch. A wrong value must never silently open a door.
   */
  async setHowCheckInsWork(organizationId: string, body: { whoMayOpen?: string; needsApproval?: boolean }) {
    if (body.whoMayOpen !== undefined && !['NAMED_LEADS', 'EVERYONE'].includes(body.whoMayOpen)) {
      throw new BadRequestException('whoMayOpen must be NAMED_LEADS or EVERYONE.');
    }
    if (body.needsApproval !== undefined && typeof body.needsApproval !== 'boolean') {
      throw new BadRequestException('needsApproval must be true or false.');
    }
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...(body.whoMayOpen !== undefined && { whoMayOpenCheckIns: body.whoMayOpen }),
        ...(body.needsApproval !== undefined && { checkInsNeedApproval: body.needsApproval }),
      },
    });
    return this.howCheckInsWork(organizationId);
  }

  /**
   * HAND THE POSITION ON, which is what stops the protection becoming a hostage.
   *
   * Without this, the day the founder leaves the company the account has an owner who no longer
   * works there and nobody able to change it.
   *
   * It GIVES the position away rather than sharing it. Two protected people would be two people who
   * cannot remove each other, which is a deadlock rather than a safeguard.
   */
  async handOverTheOrganisation(organizationId: string, actingUserId: string, toUserId: string) {
    const [org, acting, target] = await Promise.all([
      this.prisma.organization.findUnique({ where: { id: organizationId }, select: { ownerUserId: true } }),
      this.prisma.user.findUnique({ where: { id: actingUserId }, select: { id: true, role: true } }),
      this.prisma.user.findFirst({
        where: { id: toUserId, organizationId, deletedAt: null },
        select: { id: true, role: true, firstName: true },
      }),
    ]);
    if (!target) throw new NotFoundException('That person is not on this account.');

    const allowed = mayHandOver(
      { id: acting?.id ?? actingUserId, role: acting?.role ?? 'MEMBER' },
      { id: target.id, role: target.role },
      org?.ownerUserId ?? null,
    );
    if (!allowed.may) throw new ForbiddenException(allowed.because);

    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { ownerUserId: target.id },
    });
    this.logger.log(`Organisation ${organizationId} handed over to ${target.id}.`);
    return { ownerUserId: target.id };
  }

  /** Who set this organisation up, so the People page can say so and hide what it must. */
  async whoSetThisUp(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { ownerUserId: true },
    });
    return { ownerUserId: org?.ownerUserId ?? null };
  }

  /** The organisation's own name, which is what an invitation says it is from. */
  async organisationName(organizationId: string): Promise<string> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId }, select: { name: true },
    });
    return org?.name ?? 'your team';
  }

  async inviteMany(organizationId: string, orgName: string, pasted: string, preview: boolean) {
    const addresses = addressesIn(pasted);
    if (addresses.length > MOST_IN_ONE_PASTE) {
      throw new BadRequestException(
        `That is ${addresses.length} addresses. ${MOST_IN_ONE_PASTE} at a time is the most this takes - `
        + 'past that, connect your directory instead of pasting.',
      );
    }

    /* One query for the whole paste rather than one per address. */
    const existing = await this.prisma.user.findMany({
      where: { email: { in: addresses }, deletedAt: null },
      select: { email: true },
    });
    const here = new Set(existing.map((e) => e.email.toLowerCase()));

    const seats = await this.billing.seatsLeft(organizationId);
    const rows = planFor(pasted, (e) => here.has(e), seats);
    if (preview) return { preview: true, seatsLeft: seats, rows, summary: summarise(rows) };

    /*
     * SENT ONE AT A TIME AND ON PURPOSE. `teamInvite` creates the person, mints a token and sends
     * the email; running 160 of those concurrently is a burst the mail provider answers with a
     * rate limit, and half a company invited is worse than none.
     *
     * A row that throws is reported as itself rather than ending the run. The whole point is that
     * an admin gets one answer per person.
     */
    const sent: Row[] = [];
    for (const row of rows) {
      if (row.result !== 'invited') { sent.push(row); continue; }
      try {
        await this.auth.teamInvite(orgName, row.email, organizationId);
        sent.push(row);
      } catch {
        /* Almost always the seat gate closing mid-run. Named as what the admin has to act on. */
        sent.push({ email: row.email, result: 'no seat' });
      }
    }
    return { preview: false, seatsLeft: await this.billing.seatsLeft(organizationId), rows: sent, summary: summarise(sent) };
  }

  /** See UsersController.colleagues. Active, verified members other than the caller, by name. */
  async colleaguesOf(organizationId: string, exceptUserId: string) {
    const rows = await this.prisma.user.findMany({
      where: { organizationId, deletedAt: null, isActive: true, isEmailVerified: true, id: { not: exceptUserId } },
      select: { email: true, firstName: true, lastName: true },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }, { email: 'asc' }],
      take: 500,
    });
    return rows.map((r) => ({
      email: r.email,
      name: [r.firstName, r.lastName].filter(Boolean).join(' ').trim() || null,
    }));
  }

  async findAll(organizationId: string, pagination: PaginationDto) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { organizationId, deletedAt: null },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, isEmailVerified: true, createdAt: true },
      }),
      this.prisma.user.count({ where: { organizationId, deletedAt: null } }),
    ]);

    /*
     * WHERE EACH PERSON ACTUALLY GOT TO, which is the only question an admin has at any scale
     * above about ten people.
     *
     * "Invited" and "signed in" were already knowable from the row. The one that matters is the
     * third - somebody with an account who has never finished a check-in - because at 160 people
     * that is the whole rollout question and counting it by hand is not possible.
     *
     * ONE QUERY FOR THE PAGE, not one per person. A per-row lookup here is 160 round trips on a
     * screen somebody opens every morning.
     */
    const ids = users.map((u) => u.id);
    /*
     * "CHECKED IN" WAS TRUE OF SOMEBODY WHO HAD ANSWERED ONE SESSION OUT OF TWELVE.
     *
     * The badge asked "has this person ever completed a check-in anywhere", which on a rollout
     * where people sit on four or five check-ins reads as up to date when it means they have
     * answered once. Reported as "checked in next to people's name being a bit off if they are on
     * multiple check-ins", and it is worse than off: it is the number an admin chases by.
     *
     * So both halves are counted - how many check-ins they are on, and how many of those they
     * have given an account on - and the page says which. Still one query for the page.
     */
    const memberships = ids.length
      ? await this.prisma.groundParticipant.findMany({
        where: { userId: { in: ids } },
        select: { userId: true, createdAt: true, checkIns: { where: { status: 'COMPLETED' }, select: { id: true }, take: 1 } },
      })
      : [];
    const onCount = new Map<string, number>();
    const answeredCount = new Map<string, number>();
    for (const m of memberships) {
      if (!m.userId) continue;
      onCount.set(m.userId, (onCount.get(m.userId) ?? 0) + 1);
      if (m.checkIns.length) answeredCount.set(m.userId, (answeredCount.get(m.userId) ?? 0) + 1);
    }
    const hasFinished = new Set([...answeredCount.keys()]);
    /*
     * WHO CAME IN THROUGH A CHECK-IN, RATHER THAN BEING PUT ON THE ORGANISATION.
     *
     * Walked with an address from another company invited to one check-in: they appeared on this
     * page as an ordinary member with a dropdown offering to make them an admin, indistinguishable
     * from somebody hired. The approval gate is real and correctly skipped when an admin adds them,
     * and the account has to exist for them to write their own record - so the fix is not a role
     * change, it is saying how they got here.
     *
     * No column records it, and none is needed. An invitation creates the participant row first, and
     * the person's account only when they accept; somebody put on the organisation, or who signed up
     * themselves, exists before any check-in row names them. So: the earliest participant row for
     * this person was created BEFORE their account was. Checked against the live rows - the two
     * invited people had a row 40 and 70 seconds before their account, the lead the other way round.
     * (`joinedAt` was the first idea and is never stamped by accept(), so it could never fire.)
     */
    const firstRow = new Map<string, number>();
    for (const m of memberships) {
      if (!m.userId) continue;
      const t = new Date(m.createdAt).getTime();
      firstRow.set(m.userId, Math.min(firstRow.get(m.userId) ?? Infinity, t));
    }
    const arrivedThroughACheckIn = (u: { id: string; createdAt: Date }) => {
      const first = firstRow.get(u.id);
      return first != null && first < new Date(u.createdAt).getTime();
    };

    return {
      data: users.map((u) => ({
        ...u,
        /*
         * Named for what is true, not for what is missing. "Never checked in" on somebody who
         * joined yesterday is a fact about the calendar; the page decides how to say it.
         */
        state: !u.isEmailVerified ? 'invited'
          : hasFinished.has(u.id) ? 'checked in'
            : 'signed in',
        /** How many check-ins they are on, and how many of those they have answered on. */
        checkInsOn: onCount.get(u.id) ?? 0,
        checkInsAnswered: answeredCount.get(u.id) ?? 0,
        arrivedThroughACheckIn: arrivedThroughACheckIn(u),
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, organizationId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId, deletedAt: null },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, isEmailVerified: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(organizationId: string, dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new ConflictException('A user with that email already exists');

    const organization = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } });
    if (!organization) throw new NotFoundException('Organization not found');

    const { user, token } = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          organizationId,
          email: dto.email.toLowerCase(),
          firstName: dto.firstName,
          lastName: dto.lastName ?? '',
          role: (dto.role as any) ?? 'MEMBER',
          isEmailVerified: false,
          passwordHash: null,
        },
      });

      const token = crypto.randomBytes(32).toString('hex');
      await tx.emailVerificationToken.create({
        data: { userId: user.id, token, type: TokenType.PASSWORD_SETUP, expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000) },
      });

      return { user, token };
    });

    await this.emailService.sendUserInvite(user.email, user.firstName, token, organization.name);
    return { id: user.id, email: user.email, message: 'Invite sent' };
  }

  async update(id: string, organizationId: string, dto: UpdateUserDto, _actingUserId: string) {
    const user = await this.prisma.user.findFirst({ where: { id, organizationId } });
    if (!user) throw new NotFoundException('User not found');

    if (dto.email && dto.email.toLowerCase() !== user.email) {
      const taken = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
      if (taken) throw new ConflictException('Email already in use');
    }

    /*
     * THE PERSON WHO SET THIS UP CANNOT BE DEMOTED OR DEACTIVATED BY ANOTHER ADMIN.
     *
     * Before the last-admin check, because it is the stronger rule: even with six other admins on
     * the account, this one is not theirs to change. See `the-person-who-set-this-up.ts`.
     */
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { ownerUserId: true },
    });
    const acting = await this.prisma.user.findUnique({
      where: { id: _actingUserId },
      select: { id: true, role: true },
    });
    if (dto.role !== undefined || dto.isActive !== undefined) {
      const allowed = mayChange(
        { id: acting?.id ?? _actingUserId, role: acting?.role ?? 'MEMBER' },
        { id: user.id, role: user.role },
        org?.ownerUserId ?? null,
      );
      if (!allowed.may) throw new ForbiddenException(allowed.because);
    }

    // Last-admin safeguard: this user's own role/active state can't be removed
    // if they're the org's only remaining active admin - otherwise the org is
    // left with nobody able to manage it at all.
    const losingAdminStatus =
      user.role === 'ADMIN' &&
      user.isActive &&
      ((dto.role && dto.role !== 'ADMIN') || dto.isActive === false);
    if (losingAdminStatus) {
      const otherActiveAdmins = await this.prisma.user.count({
        where: { organizationId, role: 'ADMIN', isActive: true, id: { not: id }, deletedAt: null },
      });
      if (otherActiveAdmins === 0) {
        throw new BadRequestException('This is the only active admin on the account - promote someone else to admin first.');
      }
    }

    /*
     * THE ROLE GOES THROUGH `setRole`, and everything else is an ordinary update.
     *
     * This wrote `User.role` alone, which is admin in the session and member in the organisation
     * switcher - see `a-role-is-stored-twice.ts`. Both writes in one transaction with the rest, so
     * a promotion cannot half-land.
     */
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: {
          ...(dto.email && { email: dto.email.toLowerCase() }),
          ...(dto.firstName && { firstName: dto.firstName }),
          ...(dto.lastName && { lastName: dto.lastName }),
          ...(typeof dto.isActive === 'boolean' && { isActive: dto.isActive }),
        },
        select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true },
      });
      if (!dto.role) return updated;
      await setRole(tx, id, organizationId, dto.role as RoleWrite);
      return { ...updated, role: dto.role as string };
    });
  }

  async resendInvite(id: string, organizationId: string) {
    const user = await this.prisma.user.findFirst({ where: { id, organizationId }, include: { organization: { select: { name: true } } } });
    if (!user) throw new NotFoundException('User not found');
    if (user.isEmailVerified && user.passwordHash) throw new BadRequestException('User has already activated their account');

    await this.prisma.emailVerificationToken.updateMany({
      where: { userId: user.id, type: TokenType.PASSWORD_SETUP, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = crypto.randomBytes(32).toString('hex');
    await this.prisma.emailVerificationToken.create({
      data: { userId: user.id, token, type: TokenType.PASSWORD_SETUP, expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000) },
    });

    await this.emailService.sendUserInvite(user.email, user.firstName, token, user.organization.name);
    return { message: 'Invite resent' };
  }

  async leaveOrg(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
    return { left: true as const };
  }

  async remove(id: string, organizationId: string, actingUserId: string) {
    if (id === actingUserId) throw new BadRequestException('You cannot deactivate yourself');
    const user = await this.prisma.user.findFirst({ where: { id, organizationId, deletedAt: null } });
    if (!user) throw new NotFoundException('User not found');

    /* The same protection as `update`, on the path that deactivates and anonymises somebody. */
    const orgForRemoval = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { ownerUserId: true },
    });
    const remover = await this.prisma.user.findUnique({
      where: { id: actingUserId },
      select: { id: true, role: true },
    });
    const allowedToRemove = mayChange(
      { id: remover?.id ?? actingUserId, role: remover?.role ?? 'MEMBER' },
      { id: user.id, role: user.role },
      orgForRemoval?.ownerUserId ?? null,
    );
    if (!allowedToRemove.may) throw new ForbiddenException(allowedToRemove.because);

    // Last-admin safeguard - see update() above for the same rule.
    if (user.role === 'ADMIN') {
      const otherActiveAdmins = await this.prisma.user.count({
        where: { organizationId, role: 'ADMIN', isActive: true, id: { not: id }, deletedAt: null },
      });
      if (otherActiveAdmins === 0) {
        throw new BadRequestException('This is the only active admin on the account - promote someone else to admin first.');
      }
    }

    // Soft-delete: stamp deletedAt, anonymise email, deactivate.
    await this.prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        email: `deleted-${id}@groundwork.deleted`,
      },
    });
    return { message: 'User deactivated' };
  }

  /**
   * GW-03 - GDPR Article 15 data export. Returns all personal data held for
   * the requesting user: profile, record entries, check-in summaries, and
   * grounds they are a party to. Never includes other parties' data.
   */
  async exportData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    if (!user) throw new NotFoundException('User not found');

    // Collect all participant links for this user.
    const participantLinks = await this.prisma.groundParticipant.findMany({
      where: { userId },
      select: { id: true, groundId: true },
    });
    const participantIds = participantLinks.map((p) => p.id);

    // All RecordEntry rows for this user's participants.
    const recordEntries = await this.prisma.recordEntry.findMany({
      where: { participantId: { in: participantIds } },
      select: { id: true, type: true, text: true, createdAt: true, checkInId: true, participantId: true },
      orderBy: { createdAt: 'asc' },
    });

    // All check-in summaries - include ground label via the ground relation.
    const checkIns = await this.prisma.checkIn.findMany({
      where: { participantId: { in: participantIds } },
      select: {
        id: true,
        status: true,
        sessionNumber: true,
        completedAt: true,
        ground: { select: { label: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // All grounds the user is a party to.
    const groundIds = [...new Set(participantLinks.map((p) => p.groundId))];
    const grounds = await this.prisma.ground.findMany({
      where: { id: { in: groundIds } },
      select: { id: true, label: true, scenario: true, status: true },
    });

    return {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      recordEntries,
      checkIns: checkIns.map((c) => ({
        id: c.id,
        status: c.status,
        sessionNumber: c.sessionNumber,
        completedAt: c.completedAt,
        groundLabel: c.ground.label,
      })),
      grounds,
    };
  }

  /**
   * GW-03 - GDPR Article 17 erasure. Anonymises all identifying fields on the
   * user account and participant links. Conversation content contributed to
   * grounds is retained under the other party's legitimate interest in the
   * shared record (Art. 17(3)(c)) - it does not contain the user's email or
   * name post-erasure.
   */
  async eraseAccount(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const anonymisedEmail = `deleted-${userId}@deleted`;

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          email: anonymisedEmail,
          firstName: 'Deleted',
          lastName: 'User',
          passwordHash: null,
          googleId: null,
          isActive: false,
          deletedAt: new Date(),
        },
      }),
      this.prisma.emailVerificationToken.deleteMany({ where: { userId } }),
    ]);

    // Anonymise each participant link individually to avoid unique-email conflicts
    // across multiple grounds.
    const links = await this.prisma.groundParticipant.findMany({ where: { userId }, select: { id: true } });
    for (const link of links) {
      await this.prisma.groundParticipant.update({
        where: { id: link.id },
        data: { email: `deleted-${link.id}@deleted`, roleAsDescribed: null },
      });
    }

    return { deleted: true as const };
  }

  /**
   * Privacy diagnostic endpoint - ADMIN only.
   * Returns a summary of what data is held for a user and confirms the
   * product promise: records are always exportable and users are soft-deletable.
   */
  /**
   * Rename the organisation.
   *
   * An org is created the moment someone asks for a sign-in link, and if they
   * did not come through the entry flow nobody ever asks what it is called - it
   * is derived from the email ("brand.new.person@..." became "Brand's
   * workspace"). That default is fine; having no way to correct it is not,
   * because the name is on every page the whole team sees.
   */
  async renameOrganization(organizationId: string, name: string) {
    const trimmed = name.trim();
    if (trimmed.length < 2) throw new BadRequestException('An organization name needs at least two characters');
    const org = await this.prisma.organization.update({
      where: { id: organizationId },
      data: { name: trimmed },
      select: { id: true, name: true },
    });
    return org;
  }

}
