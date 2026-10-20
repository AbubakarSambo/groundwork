import { organisationsThatTurnedWhatsAppOn } from '../whatsapp/only-where-whatsapp-is-turned-on';
import { theOpeningsGoToANumberJustSaved } from '../grounds/the-lead-adds-a-whatsapp-number';
import { whereTheyAreOnWhatsApp, WHERE_ON_WHATSAPP_SAYS, type WhereOnWhatsApp } from '../whatsapp/where-they-are-on-whatsapp';
import { aNameTypedInLowerCase } from '../../common/a-name-typed-in-lower-case';
import { theOrganisationsZone, isAZone, forgetTheOrganisationsZone } from '../../common/the-organisations-own-day';
import { hashed } from '../auth/a-token-is-stored-as-its-hash';
import { Injectable, Logger, Inject, forwardRef, NotFoundException, ConflictException, BadRequestException, ForbiddenException, Optional } from '@nestjs/common';
import { alreadyOpen, Subject } from './what-a-call-is-about';
import * as crypto from 'crypto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GroundworkEvents, CallAskedEvent, OrgSizeSaidEvent, AdminMadeEvent } from '../../common/events';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateUserDto, UpdateUserDto } from './dto';
import { PaginationDto } from '../../common';
import { TokenType, CompanyStage, MembershipRequestStatus } from '@prisma/client';
import { setRole, RoleWrite } from './a-role-is-stored-twice';
import { BillingService } from '../billing/billing.service';
import { AuthService } from '../auth/auth.service';
import { addressesIn, namesIn, planFor, summarise, MOST_IN_ONE_PASTE, Row } from './putting-a-whole-company-on';
import { RolloutFacts } from './where-a-rollout-has-got-to';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { tidyANumberFor } from '../whatsapp/the-organisations-country';
import { aSignInsNumberChanged, aRosterNumberChanged, refuseANumberOnSomebodyElse, aSignInWithNoNumberTakesTheRosters, theSignInOf } from '../whatsapp/one-number-for-a-person';
import { theDomainOf, mayBeJoinedBy, effectiveJoinDomain } from '../../common/an-email-domain';
import { isCovered } from '../../common/subscription';
import { HOW_A_NEW_ORG_WORKS } from '../grounds/who-may-open-a-check-in';
import { mayChange, mayHandOver } from './the-person-who-set-this-up';
import { colleaguesOf, A_COLLEAGUE_WITH_NO_NAME } from '../../common/colleagues';
import { theInvitationsWaiting, keepThemWaiting, stopWaiting, type AnInvitationWaiting } from './invitations-waiting-for-a-seat';
import { aLineOrNothing, wouldMakeALoop, CANNOT_REPORT_TO_THEMSELVES, THAT_WOULD_MAKE_A_LOOP, NOT_IN_THIS_ORGANISATION } from './where-they-sit';
import { groundsAViewerMayList } from '../grounds/who-may-read-this-check-in';
import { fullNameToCall } from '../engagement/a-name-to-call-them';
import { itSendsFromTheirNumber, WHAT_SAYS_IT_WORKS } from '../whatsapp/a-connection-that-works';

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
    /* The back office is told when somebody asks for a call. See back-office/the-team-is-told.service.ts. */
    private events: EventEmitter2,
    /* Whether WhatsApp is switched on here, for the new admin's checklist (U.3). Optional, so the
       services built by hand in tests keep their shape; Nest always supplies it. */
    @Optional() private whatsapp?: WhatsAppService,
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
  async rolloutFacts(organizationId: string, readerId?: string): Promise<RolloutFacts> {
    const [people, admins, checkIns, org, keys, wa, reader, whatsappOn] = await Promise.all([
      this.prisma.user.count({ where: { organizationId, deletedAt: null } }),
      this.prisma.user.count({ where: { organizationId, deletedAt: null, role: 'ADMIN', isActive: true } }),
      this.prisma.ground.count({ where: { organizationId } }),
      this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: { subscriptionPlan: true, subscriptionStatus: true, freeUntil: true, freePlan: true },
      }),
      this.prisma.apiCredential.count({ where: { organizationId, revokedAt: null } }),
      this.prisma.whatsAppConnection.findUnique({ where: { organizationId }, select: WHAT_SAYS_IT_WORKS }).catch(() => null),
      readerId ? this.prisma.user.findUnique({ where: { id: readerId }, select: { welcomeCardSeenAt: true } }) : null,
      /* Off when there is no WhatsApp service here at all, which is the safe direction. */
      this.whatsapp ? this.whatsapp.isEnabled().catch(() => false) : Promise.resolve(false),
    ]);
    return {
      people,
      admins,
      checkIns,
      /* Covered, not paying: a month given away is cover, and reading it as unpaid told a customer
         to subscribe to something we had already given them. See grounds.service.addParticipant. */
      paying: isCovered(org ?? { subscriptionPlan: null, subscriptionStatus: null }),
      connected: keys > 0,
      whatsappOn,
      whatsappConnected: itSendsFromTheirNumber(wa),
      welcomeCardSeen: !!reader?.welcomeCardSeenAt,
    };
  }

  /** The zone an admin named, and the zone in use now (named, else from where people's numbers are, else the product's own). */
  async theTimeZone(organizationId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { timeZone: true } });
    return { timeZone: org?.timeZone ?? null, inUse: await theOrganisationsZone(this.prisma as any, organizationId) };
  }

  async setTheTimeZone(organizationId: string, timeZone: string | null) {
    const zone = typeof timeZone === 'string' ? timeZone.trim() : '';
    if (zone && !isAZone(zone)) throw new BadRequestException('That is not a time zone I know. A time zone is written like Africa/Nairobi.');
    await this.prisma.organization.update({ where: { id: organizationId }, data: { timeZone: zone || null } });
    forgetTheOrganisationsZone(organizationId);
    return this.theTimeZone(organizationId);
  }

  /**
   * "WHO CAN JOIN": "Anyone with an @baridi.co.ke email" (A4 people.txt; U.3, Hafsah, 26 September;
   * changed 30 September, item 3, to read from `effectiveJoinDomain` rather than the current
   * admin's own address).
   *
   * The domain SHOWN here, and the one the invite link itself checks a joiner's address against
   * (`TheOrganisationInviteLinkService`), starts as the domain of the organisation's own founding
   * email address - never whichever admin happens to be looking at this page - and stays that way
   * until an admin changes it (`changeJoinDomain`). Turning it on and off (this method's `on`) is
   * a separate decision from what the domain IS: an admin can see and change the domain before
   * ever switching joining-by-domain on.
   */
  async joiningByDomain(organizationId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { email: true, joinDomain: true } });
    const domain = effectiveJoinDomain(org ?? { email: null, joinDomain: null });
    return {
      on: !!org?.joinDomain,
      domain,
      /* Why nobody can join by domain yet, in a sentence, or null when they can (or could, once
         switched on). */
      whyNot: domain ? null : 'No domain is set yet. Your organisation’s email address is on a public mail service. An admin can name the company domain here.',
    };
  }

  async setJoiningByDomain(organizationId: string, on: boolean) {
    if (!on) {
      /* Off clears the domain itself too - this used to keep the domain and only null out
         whether it was active, but that meant a domain nobody chose (defaulted from the founding
         address) reappeared, active again, the moment somebody switched it back on with no say in
         what it would be. Clearing it means switching back on asks again. */
      await this.prisma.organization.update({ where: { id: organizationId }, data: { joinDomain: null } });
      return this.joiningByDomain(organizationId);
    }
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { email: true, joinDomain: true } });
    const domain = effectiveJoinDomain(org ?? { email: null, joinDomain: null });
    if (!domain) {
      throw new BadRequestException('No domain is set yet. Your organisation’s email address is on a public mail service. An admin can name the company domain here.');
    }
    /* One organisation per domain (`Organization.joinDomain` is unique) - checked here, in a
       sentence, rather than left to the database's own constraint error. Two organisations can
       share a founding email's domain without either ever having named it explicitly; only the
       first to switch on, or to name a domain (`changeJoinDomain`), gets it. */
    const taken = await this.prisma.organization.findFirst({ where: { joinDomain: domain, id: { not: organizationId } }, select: { id: true } });
    if (taken) {
      throw new ConflictException(`Another organisation on Groundwork already lets people with an @${domain} email join it, so this one cannot. Talk to us if it is your company's domain.`);
    }
    await this.prisma.organization.update({ where: { id: organizationId }, data: { joinDomain: domain } });
    return this.joiningByDomain(organizationId);
  }

  /**
   * AN ADMIN NAMES OR CHANGES THE DOMAIN (Hafsah, 30 September, item 3: "where an admin can change
   * it"). The new domain has to be the requesting admin's own confirmed address's domain, so nobody
   * can name a company they are not at, and never a public mail provider - the same guarantee the
   * old toggle gave, now available whether or not joining-by-domain is switched on, and whatever
   * the organisation's founding address was.
   */
  async changeJoinDomain(organizationId: string, adminId: string) {
    /*
     * CHANGING THE DOMAIN NEVER SWITCHES JOINING ON (request 179). "Joining by email is on" is stored as the domain itself, so writing a domain while
     * it was off turned it on, with no say and no confirmation. While it is off, nothing is written: the admin is told to switch it on, which is
     * a choice of its own, and then to change the domain.
     */
    const now = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { joinDomain: true } });
    if (!now?.joinDomain) {
      throw new BadRequestException('Joining by email is switched off, so there is no domain to change. Switch it on first, and then you can change the domain.');
    }
    const admin = await this.prisma.user.findUnique({ where: { id: adminId }, select: { email: true, isEmailVerified: true } });
    const domain = theDomainOf(admin?.email);
    if (!domain || !admin?.isEmailVerified) {
      throw new BadRequestException('Your own email address has to be confirmed before you can name the domain people join by.');
    }
    if (!mayBeJoinedBy(domain)) {
      throw new BadRequestException('Your email address is at a public mail service, so it cannot be the domain people join by.');
    }
    const taken = await this.prisma.organization.findFirst({ where: { joinDomain: domain, id: { not: organizationId } }, select: { id: true } });
    if (taken) {
      throw new ConflictException(`Another organisation on Groundwork already lets people with an @${domain} email join it, so this one cannot. Talk to us if it is your company's domain.`);
    }
    await this.prisma.organization.update({ where: { id: organizationId }, data: { joinDomain: domain } });
    return this.joiningByDomain(organizationId);
  }

  /** "Got it" on the new admin's welcome card (U.3). Their own row only. */
  async welcomeCardSeen(userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { welcomeCardSeenAt: new Date() } });
    return { seen: true };
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
    this.events.emit(GroundworkEvents.CALL_ASKED, { organizationId, askedByUserId: requestedById, subject, note: note?.trim() || null } satisfies CallAskedEvent);
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
      throw new BadRequestException('Choose who may start check-ins, either the people you name or everyone.');
    }
    if (body.needsApproval !== undefined && typeof body.needsApproval !== 'boolean') {
      throw new BadRequestException('Choose whether each new check-in waits for an admin, yes or no.');
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

  /**
   * One admin's name, and only the name (request 225c): the owner where the owner is an admin, otherwise
   * the admin who has been one longest. Null where there is no admin with a name.
   */
  async anAdminByName(organizationId: string): Promise<{ name: string | null }> {
    if (!organizationId) return { name: null };
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { ownerUserId: true } });
    const admins = await this.prisma.user.findMany({
      where: { organizationId, role: 'ADMIN', deletedAt: null, isActive: true },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { createdAt: 'asc' },
    });
    const named = admins.filter((a) => (a.firstName ?? '').trim());
    const chosen = named.find((a) => a.id === org?.ownerUserId) ?? named[0];
    if (!chosen) return { name: null };
    return { name: [chosen.firstName, chosen.lastName].map((x) => (x ?? '').trim()).filter(Boolean).join(' ') };
  }

  /** The organisation's own name, which is what an invitation says it is from. */
  async organisationName(organizationId: string): Promise<string> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId }, select: { name: true },
    });
    return org?.name ?? 'your team';
  }

  async inviteMany(organizationId: string, orgName: string, pasted: string, preview: boolean, role: 'ADMIN' | 'LEAD' | 'MEMBER' = 'MEMBER') {
    const addresses = addressesIn(pasted);
    if (addresses.length > MOST_IN_ONE_PASTE) {
      throw new BadRequestException(
        `That is ${addresses.length} addresses, and ${MOST_IN_ONE_PASTE} at a time is the most this takes, `
        + 'so for more than that, connect your directory instead of pasting.',
      );
    }

    /*
     * "ALREADY HERE" MEANS IN THIS ORGANISATION (U.4 fourth review). It asked whether an account
     * existed anywhere, so somebody with an account at another company read "Already here" and was
     * never invited. Now it is somebody with a membership here that is not held for a seat. (Somebody
     * who left keeps their membership and still reads "Already here": inviting them would not bring
     * them back, because teamInvite does not reactivate an account. Listed for Hafsah.)
     * Somebody with an account elsewhere reads "Will be invited", which says nothing about that
     * account; inviting them adds a membership here and sends a sign-in link (auth teamInvite).
     * One query for the whole paste rather than one per address.
     */
    const existing = await this.prisma.organizationMembership.findMany({
      where: { organizationId, heldForASeat: false, user: { email: { in: addresses }, deletedAt: null } },
      select: { user: { select: { email: true } } },
    });
    const here = new Set(existing.map((e) => e.user.email.toLowerCase()));

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
    const names = namesIn(pasted);
    const sent: Row[] = [];
    for (const row of rows) {
      if (row.result !== 'invited') { sent.push(row); continue; }
      try {
        /* The role chosen on the page, and the name typed beside the address (U.4). */
        await this.auth.teamInvite(orgName, row.email, organizationId, { role, name: names.get(row.email) ?? null });
        sent.push(row);
      } catch {
        /* Almost always the seat gate closing mid-run. Named as what the admin has to act on. */
        sent.push({ email: row.email, result: 'no seat' });
      }
    }
    /* The people with no seat are kept, so the admin can see who they were and let them in when there is room (B-129). */
    const noSeat = sent.filter((r) => r.result === 'no seat').map((r) => ({ email: r.email, name: names.get(r.email) ?? null, role }));
    if (noSeat.length) await keepThemWaiting(this.prisma, organizationId, noSeat).catch(() => undefined);
    return { preview: false, seatsLeft: await this.billing.seatsLeft(organizationId), rows: sent, summary: summarise(sent, true) };
  }

  /** The invitations kept for want of a seat, as rows for the queue of people waiting for one. */
  async theInvitationsWaitingForASeat(organizationId: string) {
    return (await theInvitationsWaiting(this.prisma, organizationId)).map((w) => ({
      id: `invite:${w.email}`,
      email: w.email,
      name: w.name,
      waitingSince: new Date(w.at),
      addedBy: null,
      forCheckIn: null,
      kind: 'INVITATION' as const,
      /* The one line an admin needs to know what pressing the button does. */
      saying: 'Invited, and not yet written to. Their invitation goes out when there is a seat.',
    }));
  }

  /** Send the kept invitations, oldest first, as far as there is room; the rest stay kept. Returns how many went and how many still wait. */
  async releaseTheInvitationsWaiting(organizationId: string, orgName: string): Promise<{ sent: number; stillWaiting: number }> {
    const waiting = await theInvitationsWaiting(this.prisma, organizationId);
    if (!waiting.length) return { sent: 0, stillWaiting: 0 };
    const room = await this.billing.seatsLeft(organizationId);
    const may = room === null ? waiting.length : Math.max(0, room);
    const went: string[] = [];
    for (const w of waiting.slice(0, may)) {
      try {
        await this.auth.teamInvite(orgName, w.email, organizationId, { role: w.role, name: w.name });
        went.push(w.email);
      } catch {
        /* The seat gate closed in the meantime: this one and the rest stay kept. */
        break;
      }
    }
    await stopWaiting(this.prisma, organizationId, went);
    return { sent: went.length, stillWaiting: waiting.length - went.length };
  }

  /** See UsersController.colleagues and common/colleagues.ts: name, role and team, and a guest sees only their own check-ins' people. */
  async colleaguesOf(organizationId: string, callerId: string) {
    return colleaguesOf(this.prisma as any, organizationId, callerId);
  }

  async findAll(organizationId: string, pagination: PaginationDto, readerId?: string) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const skip = (page - 1) * limit;

    /*
     * EVERYONE WHO BELONGS HERE, FROM THE MEMBERSHIPS (U.4). This read `User.organizationId`, which
     * is only the organisation a person last switched to: somebody who belongs here but was looking
     * at another company fell off this list, and a guest who had switched in to look was on it as
     * though they worked here. The memberships say who belongs, and with what role here; a guest's
     * membership says "Guest", so they are listed as one, never as one of this organisation's people.
     * The role is the membership's too, because `User.role` is the role in whichever organisation
     * they are looking at.
     */
    /* Somebody who left, or was deactivated, is not one of this organisation's people any more
       (U.4 fourth review): their row stayed while the heading's count dropped them. */
    const inThisOrganisation = { organizationId, user: { deletedAt: null, isActive: true } };
    const [rows, total] = await Promise.all([
      this.prisma.organizationMembership.findMany({
        where: inThisOrganisation,
        skip,
        take: limit,
        orderBy: { user: { createdAt: 'desc' } },
        /* phoneNumber so the members list can show who can be reached on WhatsApp and who cannot.
           It is the org's own roster, read by an admin of it. awaitingOrgApproval so the list can
           say "Waiting to be let in" beside them. */
        select: {
          role: true,
          /* A guest added with no seat for them reads "No seat on your plan" (U.4 re-review). */
          heldForASeat: true,
          user: { select: { id: true, email: true, firstName: true, lastName: true, isActive: true, isEmailVerified: true, createdAt: true, phoneNumber: true, awaitingOrgApproval: true } },
        },
      }),
      this.prisma.organizationMembership.count({ where: inThisOrganisation }),
    ]);
    /* Over the plan: the most recently added, never an admin or anyone who runs a check-in (request 197, common/over-the-plan.ts). */
    const overThePlan = typeof (this.billing as any)?.whoIsOverThePlan === 'function'
      ? await this.billing.whoIsOverThePlan(organizationId).catch(() => ({ over: 0, held: new Set<string>(), saying: null as string | null }))
      : { over: 0, held: new Set<string>(), saying: null as string | null };
    const users = rows.map((r) => ({ ...r.user, role: r.role as string, heldForASeat: !!r.heldForASeat || overThePlan.held.has(r.user.id) }));

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
    /*
     * THIS ORGANISATION'S CHECK-INS ONLY (U.4). This counted every check-in the person was on in any
     * organisation, so an admin here read how much somebody carried at another company. Each person's
     * load across check-ins is private (decisions.md, rule 4); what this organisation's admin may know
     * is which of THIS organisation's check-ins they are on, which the admin can already open.
     */
    /*
     * AND THE CHECK-INS THEY HAVE BEEN ADDED TO BUT NOT YET OPENED (U.4 review). A participant row
     * carries the account only once the invitation is accepted, so somebody picked by name read as
     * "Signed in, not on a check-in" with the check-in missing. Rows not yet accepted are matched by
     * the address they were sent to - the same heal the check-ins list does when that person opens
     * it - without writing anything: accepting stays the step that links the row, so clicking the
     * invitation still signs them straight in.
     */
    const idByEmail = new Map(users.map((u) => [u.email.toLowerCase(), u.id]));
    const memberships = ids.length
      ? await this.prisma.groundParticipant.findMany({
        where: {
          ground: { organizationId },
          OR: [
            { userId: { in: ids } },
            { userId: null, email: { in: [...idByEmail.keys()] } },
          ],
        },
        select: {
          userId: true, email: true, createdAt: true, partyType: true,
          ground: { select: { id: true, label: true } },
          checkIns: { where: { status: 'COMPLETED' }, select: { id: true }, take: 1 },
        },
      })
      : [];
    const onCount = new Map<string, number>();
    const answeredCount = new Map<string, number>();
    const notOpenedCount = new Map<string, number>();
    const theirCheckIns = new Map<string, { id: string; label: string | null; runsIt: boolean }[]>();
    for (const m of memberships) {
      const who = m.userId ?? idByEmail.get((m.email ?? '').toLowerCase());
      if (!who) continue;
      onCount.set(who, (onCount.get(who) ?? 0) + 1);
      if (!m.userId) notOpenedCount.set(who, (notOpenedCount.get(who) ?? 0) + 1);
      if (m.checkIns.length) answeredCount.set(who, (answeredCount.get(who) ?? 0) + 1);
      const list = theirCheckIns.get(who) ?? [];
      if (!list.some((c) => c.id === m.ground.id)) list.push({ id: m.ground.id, label: m.ground.label, runsIt: m.partyType === 'INITIATOR' });
      theirCheckIns.set(who, list);
    }
    /*
     * "WAITING TO BE LET IN" READS UNTRUE ONCE AN ADMIN HAS SAID NO.
     *
     * decline() (who-is-waiting-at-the-door.service.ts) deliberately leaves `awaitingOrgApproval`
     * set - the account keeps working for a company that did let them in, so the flag cannot simply
     * be cleared. What changed is this organisation's own answer, so it is read here, from this
     * organisation's own requests, not from the flag alone. Their latest request to THIS
     * organisation decides it: declined reads "Not let in"; anything else still reads "waiting".
     */
    const awaitingIds = users.filter((u) => u.awaitingOrgApproval).map((u) => u.id);
    const notLetInIds = new Set<string>();
    /** Who declined them, and when - so "Not let in" can say who decided (U.4, request 84). */
    const notLetInDecidedBy = new Map<string, { userId: string; decidedAt: Date | null }>();
    if (awaitingIds.length) {
      const requests = await this.prisma.membershipRequest.findMany({
        where: { organizationId, userId: { in: awaitingIds } },
        orderBy: { createdAt: 'desc' },
        select: { userId: true, status: true, decidedByUserId: true, decidedAt: true },
      });
      const decided = new Set<string>();
      for (const r of requests) {
        if (decided.has(r.userId)) continue;
        decided.add(r.userId);
        if (r.status === MembershipRequestStatus.DECLINED) {
          notLetInIds.add(r.userId);
          if (r.decidedByUserId) notLetInDecidedBy.set(r.userId, { userId: r.decidedByUserId, decidedAt: r.decidedAt });
        }
      }
    }
    const decidersById = new Map<string, { firstName: string | null; lastName: string | null }>();
    if (notLetInDecidedBy.size) {
      const deciders = await this.prisma.user.findMany({
        where: { id: { in: [...new Set([...notLetInDecidedBy.values()].map((d) => d.userId))] } },
        select: { id: true, firstName: true, lastName: true },
      });
      for (const d of deciders) decidersById.set(d.id, d);
    }
    const nameOfDecider = (userId: string): string | null => {
      const d = decidersById.get(userId);
      if (!d) return null;
      const full = [d.firstName, d.lastName].filter(Boolean).join(' ').trim();
      return full || null;
    };

    const sits = await this.whereTheySit(organizationId, ids);
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

    /*
     * SOMEBODY ON A CHECK-IN WITH NO SEAT FOR THEM WAS NOT A ROW HERE AT ALL (U.4 people-group
     * review, item 2). They have no account and no membership - "added, and not yet written to" -
     * so the query above, which reads memberships, never sees them. The prototype (people.txt) lists
     * them anyway, as "No seat on your plan"; "Somebody is on a check-in with no seat for them"
     * already names their email and who added them, so a row here says nothing new. Only page 1,
     * so an admin paging through a large roster is never shown the same held email twice.
     */
    const held = page === 1
      ? await this.prisma.groundParticipant.findMany({
        where: { awaitingSeat: true, ground: { organizationId } },
        orderBy: { createdAt: 'asc' },
        /* The name the lead typed beside the address (journey test, 12 October): the row read "Somebody invited by email" when a name was given. */
        select: { id: true, email: true, createdAt: true, nameGiven: true, ground: { select: { id: true, label: true } } },
      })
      : [];
    const heldByEmail = new Map<string, { id: string; email: string; createdAt: Date; name?: string | null; checkIns: { id: string; label: string | null; runsIt: boolean }[] }>();
    for (const h of held) {
      const key = (h.email ?? '').toLowerCase();
      if (!key || idByEmail.has(key)) continue; // already a real row (an account exists after all)
      const row = heldByEmail.get(key) ?? { id: h.id, email: h.email!, createdAt: h.createdAt, name: h.nameGiven ?? null, checkIns: [] };
      if (!row.name?.trim() && h.nameGiven?.trim()) row.name = h.nameGiven;
      if (!row.checkIns.some((c) => c.id === h.ground.id)) row.checkIns.push({ id: h.ground.id, label: h.ground.label, runsIt: false });
      heldByEmail.set(key, row);
    }
    /* And the people a paste invited who had no seat, kept until there is room (B-129). Only page 1, like the others. */
    const keptInvitations: AnInvitationWaiting[] = page === 1 ? await theInvitationsWaiting(this.prisma, organizationId) : [];
    for (const w of keptInvitations) {
      const key = w.email.toLowerCase();
      if (idByEmail.has(key) || heldByEmail.has(key)) continue;
      heldByEmail.set(key, { id: `invite-${key}`, email: w.email, createdAt: new Date(w.at), name: w.name, checkIns: [] });
    }
    const heldRows = [...heldByEmail.values()].map((h) => ({
      id: `held:${h.id}`,
      email: h.email,
      displayName: h.name?.trim() || 'Somebody invited by email',
      firstName: null,
      lastName: null,
      role: null as string | null,
      isActive: true,
      isEmailVerified: false,
      createdAt: h.createdAt,
      phoneNumber: null,
      state: 'invited' as const,
      checkInsOn: h.checkIns.length,
      checkInsAnswered: 0,
      checkInsNotOpened: h.checkIns.length,
      arrivedThroughACheckIn: true,
      notLetIn: false,
      notLetInBy: null,
      notLetInAt: null,
      heldForASeat: true,
      /* No account exists yet, so there is nowhere for "Open" to go. */
      noAccountYet: true,
      level: null,
      team: null,
      reportsTo: null,
      checkIns: h.checkIns,
    }));

    /*
     * ONLY THE CHECK-INS THE READER MAY OPEN ARE NAMED (request 179). This named every check-in a person is on, including a performance plan or a
     * contract the admin was never given access to ("Arjun Shah, first ninety days"). Those are served as a count, so the screen can say "1
     * check-in you have no access to". The rule is the one the check-in list uses (who-may-read-this-check-in.ts). With no reader named, or a
     * lookup that fails, nothing may be opened: the more private answer.
     */
    const mayOpen = new Set<string>();
    if (readerId) {
      const rows: any[] = await Promise.resolve().then(() => this.prisma.ground.findMany({
        where: groundsAViewerMayList(readerId, { userId: readerId, role: 'ADMIN', organizationId }, organizationId) as any,
        select: { id: true },
      })).catch(() => []);
      for (const r of rows ?? []) mayOpen.add(r.id);
    }
    const namedFor = <T extends { id: string }>(all: T[]) => ({ checkIns: all.filter((c) => mayOpen.has(c.id)) });

    /*
     * THE OTHER ORGANISATIONS THEY BELONG TO, BY NAME ONLY, so Remove can say they keep their place
     * there (Hafsah, 11 October 2026: removing somebody takes them out of this organisation only).
     * Names only: nothing about what they do there. One held for a seat is not one they have been
     * told about, so it is left out. Read by an admin of this organisation only (the route is ADMIN).
     */
    const alsoIn = new Map<string, string[]>();
    if (ids.length) {
      const elsewhere: any[] = await Promise.resolve().then(() => this.prisma.organizationMembership.findMany({
        where: { userId: { in: ids }, organizationId: { not: organizationId }, heldForASeat: false },
        orderBy: { createdAt: 'asc' },
        select: { userId: true, organization: { select: { name: true } } },
      })).catch(() => []);
      for (const m of elsewhere ?? []) {
        const name = m?.organization?.name;
        if (!m?.userId || typeof name !== 'string' || !name.trim()) continue;
        alsoIn.set(m.userId, [...(alsoIn.get(m.userId) ?? []), name.trim()]);
      }
    }

    /* Where each person is on WhatsApp, from the record (pilots on WhatsApp, 14 October): their number, and whether it is
       connected, waiting for their first message, or not connected yet. Read by an admin of this organisation only. */
    /*
     * THE NUMBER EVERY SENDER USES, NOT ONLY THE ONE ON THE SIGN-IN (Drop Access, 21 October). A number a lead added on a check-in's
     * people list, or the HR system sent, is kept on the organisation's roster, and the openings go to it; this list read the sign-in
     * alone, so a number saved there could not be found here. The roster's number first, then the sign-in's, as the senders read it.
     */
    const onTheRoster = new Map<string, string>();
    if (users.length) {
      const entries: any[] = await Promise.resolve((this.prisma as any).person?.findMany?.({
        where: { organizationId, phone: { not: null }, OR: [{ linkedUserId: { in: ids } }, { email: { in: users.map((u) => u.email), mode: 'insensitive' } }] },
        orderBy: { updatedAt: 'desc' },
        select: { phone: true, linkedUserId: true, email: true },
      })).catch(() => []);
      const idOf = new Map(users.map((u) => [u.email.toLowerCase(), u.id]));
      for (const e of entries ?? []) {
        const who = (e.linkedUserId && ids.includes(e.linkedUserId) ? e.linkedUserId : null) ?? idOf.get(String(e.email ?? '').toLowerCase());
        if (who && e.phone && !onTheRoster.has(who)) onTheRoster.set(who, e.phone);
      }
    }
    for (const u of users as any[]) u.phoneNumber = onTheRoster.get(u.id) ?? u.phoneNumber ?? null;
    const onWhatsApp = new Map<string, WhereOnWhatsApp>();
    await Promise.all(users.map(async (u) => onWhatsApp.set(u.id, await whereTheyAreOnWhatsApp(this.prisma, u.phoneNumber).catch(() => (u.phoneNumber ? 'not-connected' : 'no-number') as WhereOnWhatsApp))));

    return {
      data: [...users.map((u) => ({
        ...u,
        whatsapp: onWhatsApp.get(u.id) ?? 'no-number',
        whatsappSays: WHERE_ON_WHATSAPP_SAYS[onWhatsApp.get(u.id) ?? 'no-number'],
        /* The name to put in the list (B-030): theirs, else a plain stand-in, so no screen has to put the address where a name goes (decision 115). */
        displayName: [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || A_COLLEAGUE_WITH_NO_NAME,
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
        /** How many of those they were added to and have not opened the invitation for yet. */
        checkInsNotOpened: notOpenedCount.get(u.id) ?? 0,
        arrivedThroughACheckIn: arrivedThroughACheckIn(u),
        /** This organisation said no; the account still exists but stays out of this one. */
        notLetIn: notLetInIds.has(u.id),
        /** Who decided that, and when - null when the decider's name is not known. */
        notLetInBy: notLetInIds.has(u.id) ? nameOfDecider(notLetInDecidedBy.get(u.id)?.userId ?? '') : null,
        notLetInAt: notLetInIds.has(u.id) ? (notLetInDecidedBy.get(u.id)?.decidedAt ?? null) : null,
        /* Where they sit here (U.4). Describes the organisation; grants nothing. */
        ...(sits.get(u.id) ?? { level: null, team: null, reportsTo: null }),
        /* Which of this organisation's check-ins they are on, and whether they run it. */
        ...namedFor(theirCheckIns.get(u.id) ?? []),
        /** The other organisations they belong to, by name. Removing them here leaves those untouched. */
        alsoIn: alsoIn.get(u.id) ?? [],
      })), ...heldRows.map(({ checkIns, ...h }) => ({ ...h, ...namedFor(checkIns) }))],
      meta: { page, limit, total: total + heldRows.length, totalPages: Math.ceil((total + heldRows.length) / limit) },
      /* One sentence, the same one Plan and billing says; null when nobody is over the plan. */
      overThePlanSays: overThePlan.saying,
    };
  }

  async findOne(id: string, organizationId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId, deletedAt: null },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, isEmailVerified: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('We could not find that sign-in, so sign in again and try once more.');
    return user;
  }

  /**
   * WHERE EACH OF THESE PEOPLE SITS HERE (U.4): level, team, and who they report to, by name. One
   * query for the memberships and one for the managers' names, however many people are asked about.
   */
  async whereTheySit(organizationId: string, userIds: string[]) {
    const out = new Map<string, { level: string | null; team: string | null; reportsTo: { id: string; name: string } | null }>();
    if (!userIds.length) return out;
    const rows = await this.prisma.organizationMembership.findMany({
      where: { organizationId, userId: { in: userIds } },
      select: { userId: true, level: true, team: true, reportsToUserId: true },
    });
    const managerIds = [...new Set(rows.map((r) => r.reportsToUserId).filter((x): x is string => !!x))];
    const managers = managerIds.length
      ? await this.prisma.user.findMany({
        where: { id: { in: managerIds }, deletedAt: null, memberships: { some: { organizationId } } },
        select: { id: true, firstName: true, lastName: true, email: true },
      })
      : [];
    const nameOf = new Map(managers.map((m) => [m.id, fullNameToCall({ user: m })]));
    for (const r of rows) {
      const name = r.reportsToUserId ? nameOf.get(r.reportsToUserId) : undefined;
      out.set(r.userId, {
        level: r.level,
        team: r.team,
        /* A manager who has left reads as nobody, never as a dangling id. */
        reportsTo: r.reportsToUserId && name ? { id: r.reportsToUserId, name } : null,
      });
    }
    return out;
  }

  /**
   * AN ADMIN SETS WHERE SOMEBODY SITS (U.4). Only the fields sent change; a blank box clears one.
   * Refused, in a sentence the page shows, when the manager is not here, is the person themselves,
   * or already reports to them somewhere up the line.
   */
  async setWhereTheySit(
    organizationId: string,
    userId: string,
    dto: { level?: string | null; team?: string | null; reportsToUserId?: string | null },
  ) {
    const membership = await this.prisma.organizationMembership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
      select: { id: true },
    });
    if (!membership) throw new NotFoundException(NOT_IN_THIS_ORGANISATION);

    const data: { level?: string | null; team?: string | null; reportsToUserId?: string | null } = {};
    if (dto.level !== undefined) data.level = aLineOrNothing(dto.level);
    if (dto.team !== undefined) data.team = aLineOrNothing(dto.team);
    if (dto.reportsToUserId !== undefined) {
      const managerId = aLineOrNothing(dto.reportsToUserId);
      if (managerId) {
        if (managerId === userId) throw new BadRequestException(CANNOT_REPORT_TO_THEMSELVES);
        const everyone = await this.prisma.organizationMembership.findMany({
          where: { organizationId },
          select: { userId: true, reportsToUserId: true },
        });
        if (!everyone.some((m) => m.userId === managerId)) throw new BadRequestException(NOT_IN_THIS_ORGANISATION);
        const line = new Map(everyone.map((m) => [m.userId, m.reportsToUserId]));
        if (wouldMakeALoop(userId, managerId, line)) throw new BadRequestException(THAT_WOULD_MAKE_A_LOOP);
      }
      data.reportsToUserId = managerId;
    }
    await this.prisma.organizationMembership.update({ where: { id: membership.id }, data });
    return (await this.whereTheySit(organizationId, [userId])).get(userId) ?? { level: null, team: null, reportsTo: null };
  }

  async create(organizationId: string, dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    const organization = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } });
    if (!organization) throw new NotFoundException('We could not find that organisation, so sign in again and try once more.');
    if (existing) {
      /* Somebody already in another organisation is added here and told by email (Hafsah, 12 October), through
         the one invite there is (auth.teamInvite). Somebody already here is still refused. */
      const here = existing.organizationId === organizationId || !!(await this.prisma.organizationMembership.findUnique({
        where: { userId_organizationId: { userId: existing.id, organizationId } }, select: { id: true },
      }));
      if (here || existing.deletedAt) throw new ConflictException('Someone with that email address is already here, so use a different address.');
      await this.auth.teamInvite(organization.name, existing.email, organizationId, { role: (dto.role as any) ?? 'MEMBER' } as any);
      return { id: existing.id, email: existing.email, message: 'Invite sent' };
    }

    const { user, token } = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          organizationId,
          email: dto.email.toLowerCase(),
          /* Typed by an admin for somebody else: capitalised where it was typed in lower case (Hafsah, 12 October). */
          firstName: aNameTypedInLowerCase(dto.firstName),
          lastName: aNameTypedInLowerCase(dto.lastName ?? ''),
          role: (dto.role as any) ?? 'MEMBER',
          isEmailVerified: false,
          passwordHash: null,
        },
      });

      const token = crypto.randomBytes(32).toString('hex');
      await tx.emailVerificationToken.create({
        data: { userId: user.id, token: hashed(token), type: TokenType.PASSWORD_SETUP, expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000) },
      });

      return { user, token };
    });

    await this.emailService.sendUserInvite(user.email, user.firstName, token, organization.name);
    return { id: user.id, email: user.email, message: 'Invite sent' };
  }

  async update(id: string, organizationId: string, dto: UpdateUserDto, _actingUserId: string) {
    /*
     * SOMEBODY WHO BELONGS HERE, WHICHEVER ORGANISATION THEY LAST LOOKED AT (Drop Access, 21 October). This read `User.organizationId`,
     * the organisation a person last switched to, so an admin saving the number of somebody listed on People, who was looking at another
     * organisation of theirs, was told "We could not find that sign-in" and nothing was saved. Their membership here says they belong,
     * and with which role here.
     */
    const found = await this.prisma.user.findFirst({ where: { id, OR: [{ organizationId }, { memberships: { some: { organizationId } } }] } });
    if (!found) throw new NotFoundException('We could not find that sign-in, so sign in again and try once more.');
    const here = found.organizationId === organizationId
      ? null
      : await Promise.resolve((this.prisma as any).organizationMembership?.findFirst?.({ where: { userId: id, organizationId }, select: { role: true } })).catch(() => null);
    const user = here?.role ? { ...found, role: here.role as any } : found;

    if (dto.email && dto.email.toLowerCase() !== user.email) {
      const taken = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
      if (taken) throw new ConflictException('Someone with that email address is already here, so use a different address.');
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
        throw new BadRequestException('This is the only active admin here, so make somebody else an admin first.');
      }
    }

    /*
     * THE ROLE GOES THROUGH `setRole`, and everything else is an ordinary update.
     *
     * This wrote `User.role` alone, which is admin in the session and member in the organisation
     * switcher - see `a-role-is-stored-twice.ts`. Both writes in one transaction with the rest, so
     * a promotion cannot half-land.
     */
    /* One stored form for every number, the way WhatsApp sends it (survey item 6). Tidied before the
       transaction, so a number that needs its country refuses with a sentence and nothing is half written. */
    const phoneNumber = dto.phoneNumber === undefined ? undefined : dto.phoneNumber?.trim() ? await tidyANumberFor(this.prisma as any, organizationId, dto.phoneNumber) : null;
    /* A number on somebody else's sign-in is refused with a sentence, before anything is written (decision 106 item 3). */
    if (phoneNumber !== undefined) await refuseANumberOnSomebodyElse(this.prisma, phoneNumber, id, organizationId);
    const done = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: {
          ...(dto.email && { email: dto.email.toLowerCase() }),
          ...(dto.firstName && { firstName: dto.firstName }),
          ...(dto.lastName && { lastName: dto.lastName }),
          ...(typeof dto.isActive === 'boolean' && { isActive: dto.isActive }),
          /* A blank box means remove the number, so an empty string is stored as nothing rather
             than as an empty string nobody can send a message to. */
          ...(phoneNumber !== undefined && { phoneNumber }),
        },
        select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true },
      });
      if (!dto.role) return updated;
      await setRole(tx, id, organizationId, dto.role as RoleWrite);
      return { ...updated, role: dto.role as string };
    });
    /* The roster entry follows the sign-in (decision 106 item 3). */
    if (phoneNumber !== undefined) await aSignInsNumberChanged(this.prisma, id, phoneNumber, organizationId);
    /* A number an admin adds on People is their first contact on WhatsApp: each open session's opening goes there now (D2; pilots on WhatsApp, 14 October). */
    if (phoneNumber && this.whatsapp) {
      await theOpeningsGoToANumberJustSaved(this.prisma, this.whatsapp as any, { userId: id, organizationId, phone: phoneNumber }).catch(() => undefined);
    }
    /* A new admin may be the one an appeal of a review waits for (decision 113); the reviews suite tells them. */
    if (dto.role === 'ADMIN') this.events?.emit?.(GroundworkEvents.ADMIN_MADE, { organizationId, userId: id } satisfies AdminMadeEvent);
    return done;
  }

  async resendInvite(id: string, organizationId: string) {
    const user = await this.prisma.user.findFirst({ where: { id, organizationId }, include: { organization: { select: { name: true } } } });
    if (!user) throw new NotFoundException('We could not find that sign-in, so sign in again and try once more.');
    if (user.isEmailVerified && user.passwordHash) throw new BadRequestException('That person has already joined, so there is nothing to activate.');

    await this.prisma.emailVerificationToken.updateMany({
      where: { userId: user.id, type: TokenType.PASSWORD_SETUP, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = crypto.randomBytes(32).toString('hex');
    await this.prisma.emailVerificationToken.create({
      data: { userId: user.id, token: hashed(token), type: TokenType.PASSWORD_SETUP, expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000) },
    });

    await this.emailService.sendUserInvite(user.email, user.firstName, token, user.organization.name);
    return { message: 'Invite resent' };
  }

  async leaveOrg(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('We could not find that sign-in, so sign in again and try once more.');

    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
    return { left: true as const };
  }

  /**
   * REMOVE SOMEBODY FROM THIS ORGANISATION (Hafsah, 11 October 2026: "removing them takes them out
   * of this organisation only; their place, check-ins and data in the other organisation stay
   * untouched").
   *
   * Found by their membership here, not by `User.organizationId`: that column is whichever
   * organisation they last switched to, so somebody invited in from another company read "We could
   * not find that sign-in". Then:
   *
   *   - somebody who belongs to no other organisation is removed as before: the sign-in is
   *     deactivated and its address anonymised;
   *   - somebody who also belongs elsewhere loses only their membership here. They leave this
   *     People page, cannot switch in, and cannot open this organisation's check-ins (the
   *     conversation's loader asks for the membership). Their sign-in, their other memberships and
   *     everything there is untouched, and if this was the organisation their sign-in pointed at, it
   *     now points at their next one, so signing in still works.
   *
   * Either way nothing they said is deleted: the participant rows, check-ins and reports here stay,
   * as they always have. Delete the way in, not the record.
   */
  async remove(id: string, organizationId: string, actingUserId: string) {
    if (id === actingUserId) throw new BadRequestException('You cannot turn off your own place here, so ask another admin to do it.');
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    const here = user
      ? await this.prisma.organizationMembership.findUnique({
        where: { userId_organizationId: { userId: id, organizationId } },
        select: { id: true, role: true },
      })
      : null;
    /* No membership here and not pointed here either: not somebody this organisation can remove. */
    if (!user || (!here && user.organizationId !== organizationId)) {
      throw new NotFoundException('We could not find that sign-in, so sign in again and try once more.');
    }
    /* Their role HERE: `User.role` is their role in whichever organisation they are looking at. */
    const roleHere = (here?.role ?? user.role) as string;

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
      { id: user.id, role: roleHere as any },
      orgForRemoval?.ownerUserId ?? null,
    );
    if (!allowedToRemove.may) throw new ForbiddenException(allowedToRemove.because);

    // Last-admin safeguard - see update() above for the same rule. Counted by membership here.
    if (roleHere === 'ADMIN') {
      const otherActiveAdmins = await this.prisma.organizationMembership.count({
        where: { organizationId, role: 'ADMIN', userId: { not: id }, user: { isActive: true, deletedAt: null } },
      });
      if (otherActiveAdmins === 0) {
        throw new BadRequestException('This is the only active admin here, so make somebody else an admin first.');
      }
    }

    const elsewhere = await this.prisma.organizationMembership.findMany({
      where: { userId: id, organizationId: { not: organizationId } },
      orderBy: { createdAt: 'asc' },
      select: { organizationId: true, role: true, heldForASeat: true },
    });

    if (elsewhere.length === 0) {
      // Their only organisation. Soft-delete: stamp deletedAt, anonymise email, deactivate.
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

    /* Their next organisation: one they have been told about before one held for a seat. */
    const next = elsewhere.find((m) => !m.heldForASeat) ?? elsewhere[0];
    await this.prisma.$transaction(async (tx) => {
      await tx.organizationMembership.deleteMany({ where: { userId: id, organizationId } });
      if (user.organizationId === organizationId) {
        await tx.user.update({ where: { id }, data: { organizationId: next.organizationId, role: next.role } });
      }
    });
    return { message: 'Removed from this organisation', keptElsewhere: true };
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
    if (!user) throw new NotFoundException('We could not find that sign-in, so sign in again and try once more.');

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

    /**
     * WHAT YOU WROTE BACK TO A SUGGESTION ABOUT YOU (C3, U.13): your side and your appeal, in your
     * own words. Only what you wrote: never the suggestion's verdict, and nothing the lead wrote.
     */
    const suggestionsAboutYou = participantIds.length
      ? await this.prisma.suggestion.findMany({
          where: { aboutParticipantId: { in: participantIds }, OR: [{ theirSide: { not: null } }, { appeal: { not: null } }] },
          select: { theirSide: true, theirSideAt: true, appeal: true, appealedAt: true, ground: { select: { label: true } } },
          orderBy: { createdAt: 'asc' },
        })
      : [];

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
      yourSidesAndAppeals: suggestionsAboutYou.map((x) => ({
        groundLabel: x.ground.label,
        yourSide: x.theirSide,
        yourSideAt: x.theirSideAt,
        yourAppeal: x.appeal,
        appealedAt: x.appealedAt,
      })),
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
    if (!user) throw new NotFoundException('We could not find that sign-in, so sign in again and try once more.');

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
    const links = await this.prisma.groundParticipant.findMany({ where: { userId }, select: { id: true, email: true } });
    for (const link of links) {
      await this.prisma.groundParticipant.update({
        where: { id: link.id },
        /* The address goes; its hash stays, so the retention sweep can still find these turns (A16). */
        data: { email: `deleted-${link.id}@deleted`, erasedFrom: link.email ? hashed(link.email.toLowerCase()) : null, roleAsDescribed: null },
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
  async renameOrganization(
    organizationId: string,
    name: string,
    more: { billingEmail?: string; teamSize?: { said: 'fewer' | 'more'; line: number }; companyStage?: CompanyStage } = {},
  ) {
    const trimmed = name.trim();
    if (trimmed.length < 2) throw new BadRequestException('Give the organisation a name of at least two letters.');
    const billingEmail = (more.billingEmail ?? '').trim().toLowerCase();
    const org = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        name: trimmed,
        /* An empty billing email leaves the one it has: it is optional, and "You can add it later". */
        ...(billingEmail ? { email: billingEmail } : {}),
        ...(more.teamSize ? { teamSizeSaid: more.teamSize.said, teamSizeLine: more.teamSize.line } : {}),
        ...(more.companyStage ? { companyStage: more.companyStage } : {}),
      },
      select: { id: true, name: true },
    });
    /* Billing hears the answer, for the free trial (U.19). Best-effort: a rename never fails on it. */
    if (more.teamSize) {
      try {
        this.events.emit(GroundworkEvents.ORG_SIZE_SAID, { organizationId: org.id, said: more.teamSize.said, line: more.teamSize.line } satisfies OrgSizeSaidEvent);
      } catch { /* the trial is granted by a listener that logs its own failures */ }
    }
    return org;
  }

}
