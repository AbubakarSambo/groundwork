import { theOrganisationsZone, THE_PRODUCTS_OWN_ZONE } from '../../common/the-organisations-own-day';
import { TheWaysToStopMail } from '../engagement/the-ways-to-stop-mail';
import { theDomainOf, mayBeJoinedBy } from '../../common/an-email-domain';
import { aPathInThisApp, theInviteLinkCodeIn } from '../../common/a-path-in-this-app';
import { whatTheirWorkspaceIsCalled } from './a-roster-row-is-not-a-life-sentence';
import { needsApproval, isAnAdminOf, whoToAsk, howTheyStandIn } from '../participants/nobody-joins-your-company-by-being-invited-to-a-check-in';
import { tellTheAdminsSomebodyIsWaiting } from '../participants/somebody-is-waiting-at-the-door';
import { hashed } from './a-token-is-stored-as-its-hash';
import { sessionClaims, ASessionHolder, SignedInVia } from './a-session-token';
import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GroundworkEvents, OrgSignedUpEvent, OrgSizeSaidEvent } from '../../common/events';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { tidyANumberFor } from '../whatsapp/the-organisations-country';
import { BillingService } from '../billing/billing.service';
import {
  RegisterDto,
  LoginDto,
  AuthResponseDto,
  VerifyEmailDto,
  SetPasswordDto,
  ResendVerificationDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  MagicLinkRegisterDto,
  MemberSigninDto,
} from './dto';
import { TokenType } from '@prisma/client';
import { mayOpen, HOW_A_NEW_ORG_WORKS } from '../grounds/who-may-open-a-check-in';
import { theFirstAdminHoldsIt } from '../users/the-person-who-set-this-up';
import { whatToSayAboutADeadLink, expiresAtFor, howLongInWords } from './how-long-a-link-lasts';
import { isTheirEmail, IS_THEIR_EMAIL } from './the-password-rules';
import { THE_SAME_ANSWER_EITHER_WAY, type WhyTheyCouldNotSignIn } from './one-answer-at-the-door';

type UserWithOrg = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId: string;
  isPlatformAdmin: boolean;
  /** Whether this person may open a check-in. Computed by the rule, never a permission itself. */
  mayOpenCheckIns?: boolean;
  /*
   * The whole organisation, not just its name. The client reads `organization.email` to decide
   * whether an admin still has to set up their org, so a builder that could only see the name
   * could only ever answer "not set up".
   */
  organization: {
    id: string;
    name: string;
    slug: string;
    careFeeStatus: unknown;
    email: string | null;
    companyStage: unknown;
    subscriptionPlan: unknown;
    /* The two settings the open-a-check-in rule reads. See `who-may-open-a-check-in.ts`. */
    whoMayOpenCheckIns?: string;
    checkInsNeedApproval?: boolean;
  };
};

import { whereTheyBelong, ROLE_FOR_SOMEBODY_EXPECTED } from './they-are-already-on-somebodys-roster';
import { connectWhatsAppFor } from '../whatsapp/connect-whatsapp';
import { aSignInsNumberChanged, aRosterNumberChanged, refuseANumberOnSomebodyElse, aSignInWithNoNumberTakesTheRosters, theSignInOf } from '../whatsapp/one-number-for-a-person';
import { itSendsFromTheirNumber, WHAT_SAYS_IT_WORKS } from '../whatsapp/a-connection-that-works';
import { theOpeningsGoToANumberJustSaved } from '../grounds/the-lead-adds-a-whatsapp-number';

/**
 * For an address that already has an account: the draft token a new address would have been given
 * for the same request, in the same shape, stored nowhere. See the end of entrySave.
 */
/**
 * A PASSWORD CHOSEN AT SIGN-UP IS KEPT ONLY FOR THE BROWSER THAT CHOSE IT (U.3 review, a security fix).
 *
 * Hafsah decided a password may be chosen at sign-up. But the waiting sign-up is keyed only by the
 * address, so anybody could sign up with somebody else's address and a password of their own; when the
 * owner opened the confirmation, the account was made with the stranger's password. Now a password
 * comes with a random key, handed only to the browser that sent it and stored here as a hash. The
 * confirmation puts the password on the account only when that key comes back with it. Opened
 * anywhere else, the password is thrown away, and the person chooses one afterwards, exactly as after
 * a sign-up by link. Nothing on screen or in any answer says a password had been chosen.
 */
function aPasswordKey(): { key: string; keyHash: string } {
  const key = crypto.randomBytes(32).toString('hex');
  return { key, keyHash: hashed(key) };
}
function theKeyMatches(presented: unknown, keyHash: string | null | undefined): boolean {
  if (typeof presented !== 'string' || !presented || !keyHash) return false;
  const a = Buffer.from(hashed(presented));
  const b = Buffer.from(keyHash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function theSameShapeAsANewAddress(draft: unknown): { draftToken?: string } {
  return draft ? { draftToken: crypto.randomBytes(32).toString('hex') } : {};
}

/** What "Create an organisation" sends. Every part is optional: the organisation menu's one-press door sends none. */
export interface WhatANewOrganisationIsGiven {
  name?: string;
  billingEmail?: string;
  /** "fewer" or "more" than `line` people, where `line` is the trial's team size they were shown. */
  teamSize?: { said: 'fewer' | 'more'; line: number };
}

/**
 * WHERE THE CONFIRMATION CARRIES THEM ON TO (U.3 review). The place kept with the waiting sign-up or
 * the sign-in link, checked again on the way out, so a value written before the check existed can
 * never send anybody outside the app.
 */
function goOnTo<T extends object>(res: T, kept: string | null | undefined): T & { next?: string } {
  const next = aPathInThisApp(kept);
  return next ? { ...res, next } : res;
}

/*
 * NEVER "ACCOUNT" IN WHAT A PERSON READS (Hafsah's standing rule; request 141, review of 5 October 2026).
 * The sign-up answer names the address only because it is the person's own: they typed it a moment ago.
 */
/** Said to somebody who set a password and never opened the link. */
export const YOUR_SIGN_UP_IS_NOT_FINISHED = 'You have not finished creating your account yet. We have emailed you the link again. Open it, say where you work, and then sign in with your password.';

export const theConfirmationLinkWasSent = (email: string): string =>
  `Check your email. We sent a link to ${email} to confirm it is yours. Open it on any device.`;
export const YOU_CAN_NO_LONGER_SIGN_IN_HERE =
  'You can no longer sign in here. Ask the person who added you if you need to get back in.';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
    private whatsapp: WhatsAppService,
    private billing: BillingService,
    private events: EventEmitter2,
  ) {}

  /** Billing hears what somebody said about their team's size, for the free trial (U.19). Best-effort. */
  private sizeSaid(organizationId: string, teamSize: { said: 'fewer' | 'more'; line: number }) {
    try {
      this.events.emit(GroundworkEvents.ORG_SIZE_SAID, { organizationId, said: teamSize.said, line: teamSize.line } satisfies OrgSizeSaidEvent);
    } catch (err: any) {
      this.logger.warn(`org.sizeSaid did not emit for ${organizationId}: ${err?.message}`);
    }
  }

  /**
   * A TEAM NAMED ON THE SIGN-UP FORM HAS ITS TRIAL BEFORE THE LINK ANSWERS (release check, 8 October 2026). The month was
   * given by a listener of the sign-up event, which is sent from inside the transaction that makes the organisation, so
   * it landed a moment after this answer. The page then saved the check-in it was holding at once, and that save was
   * refused with "Your organisation has no plan yet" (seen on the test bed: the refusal at 15:48:29.136, the month
   * written at 15:48:29.21). This waits for the same rule, after the organisation exists: the form promises the month to
   * teams of fewer than 20, and billing still checks that against who is really there. Never throws.
   */
  private async theTrialIsGivenBeforeTheyGoOn(organizationId: string): Promise<void> {
    try {
      const events: any = this.events;
      if (typeof events?.emitAsync !== 'function') return;
      await events.emitAsync(GroundworkEvents.ORG_SIZE_SAID, { organizationId, said: 'fewer', line: 20 } satisfies OrgSizeSaidEvent);
    } catch (err: any) {
      this.logger.warn(`The trial for ${organizationId} was not in place before the link answered: ${err?.message}`);
    }
  }

  /** The back office hears about every new organisation. Best-effort; a sign-up never fails on it. */
  private signedUp(org: { id: string; name: string }, adminEmail: string, namedOnTheForm = false) {
    try {
      this.events.emit(GroundworkEvents.ORG_SIGNED_UP, { organizationId: org.id, organizationName: org.name, adminEmail, ...(namedOnTheForm ? { namedOnTheForm: true } : {}) } satisfies OrgSignedUpEvent);
    } catch (err: any) {
      this.logger.warn(`org.signedUp did not emit for ${org.id}: ${err?.message}`);
    }
  }

  async register(dto: RegisterDto): Promise<{ message: string; email: string; passwordKey?: string }> {
    /**
     * THIS HONEYPOT GUARDS A DOOR NOBODY USES. W-UX-C. Not fixed - recorded, because the fix is a
     * decision rather than a line.
     *
     * A honeypot catches a bot that fills a field a human cannot see. No client form has ever
     * rendered `_hp`, so nothing has ever been caught. The obvious fix is to render it - except this
     * endpoint (`/auth/register`) and `/auth/magic-link-register` are BOTH unreached by the client:
     * sign-up goes through `/auth/entry-save`, which has no honeypot, no DTO and no field validation
     * at all, only a throttle of 10/minute.
     *
     * So the protection sits on the paths nobody walks, and the live path has a rate limit and
     * nothing else. Rendering `_hp` on a form that posts elsewhere would look like a fix and be one
     * less than before.
     *
     * The silent-success return below is deliberate and correct either way: telling a bot it was
     * detected teaches it to try again without the trap.
     */
    if ((dto as any)._hp) {
      return { message: theConfirmationLinkWasSent(dto.email.toLowerCase()), email: dto.email.toLowerCase() };
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existingUser) throw new ConflictException('That email address already has a sign-in, so sign in with it instead.');

    /**
     * NOTHING IS CREATED UNTIL THE ADDRESS IS PROVED. GW-001, closed here too.
     *
     * This path used to do all of it on the spot: an Organization named and slugged from the EMAIL
     * DOMAIN, and a User with role ADMIN, both with `isEmailVerified: false`. So signing up as
     * `sahar@meridianhealth.test` took the `meridianhealth` slug platform-wide before anybody opened
     * the mail, and the real company arrived later to find itself at `meridianhealth-2`.
     *
     * `entrySave` was fixed first because it is the path the client actually walks. This endpoint
     * and `registerMagicLink` are not reached by any client form, but they are registered routes,
     * so the door was still open — and a fix that only covers the path people happen to use is a
     * fix that waits for somebody to find the other one.
     *
     * All three now park the whole signup in `pendingSignup` against the verification token, and
     * `verifyEmail` builds the organisation and the admin in one transaction when the link opens.
     * The password hash rides along on that record rather than on a User, because the User is
     * precisely the thing that must not exist yet.
     */
    if (isTheirEmail(dto.password, dto.email)) throw new BadRequestException(IS_THEIR_EMAIL);
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const token = crypto.randomBytes(32).toString('hex');
    /* Kept only for the browser that chose it (see aPasswordKey). */
    const { key: passwordKey, keyHash: passwordKeyHash } = aPasswordKey();

    await this.prisma.pendingSignup.upsert({
      where: { email: dto.email.toLowerCase() },
      create: {
        email: dto.email.toLowerCase(),
        token,
        firstName: dto.firstName,
        lastName: dto.lastName,
        /* The person's own name, never their employer's domain, when none was typed. */
        orgName: dto.organizationName?.trim() || null,
        passwordHash,
        passwordKeyHash,
        expiresAt: expiresAtFor('verify an address'),
      },
      update: {
        token,
        firstName: dto.firstName,
        lastName: dto.lastName,
        orgName: dto.organizationName?.trim() || null,
        passwordHash,
        passwordKeyHash,
        expiresAt: expiresAtFor('verify an address'),
      },
    });

    await this.emailService.sendVerificationEmail(dto.email.toLowerCase(), dto.firstName, token);
    return { message: theConfirmationLinkWasSent(dto.email.toLowerCase()), email: dto.email.toLowerCase(), passwordKey };
  }

  async registerMagicLink(dto: MagicLinkRegisterDto): Promise<{ message: string; email: string }> {
    if ((dto as any)._hp) {
      return { message: theConfirmationLinkWasSent(dto.email.toLowerCase()), email: dto.email.toLowerCase() };
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existingUser) throw new ConflictException('That email address already has a sign-in, so sign in with it instead.');

    const emailLocal = dto.email.toLowerCase().split('@')[0];
    const firstName = dto.firstName?.trim() || emailLocal.charAt(0).toUpperCase() + emailLocal.slice(1);
    const lastName = dto.lastName?.trim() || '';

    /**
     * Same as `register`: nothing exists until the link is opened. GW-001.
     *
     * The land-grab half was fixed here first — the organisation stopped being named after the email
     * domain and fell back to the person's own name. What stayed was an Organization and an ADMIN
     * User created against an unverified address. Both now wait on the pending record, and the
     * name fallback moves to `verifyEmail`, which already does exactly this for the entry flow.
     */
    const token = crypto.randomBytes(32).toString('hex');
    const pendingData = {
      token,
      firstName,
      lastName,
      orgName: dto.organizationName?.trim() || null,
      expiresAt: expiresAtFor('verify an address'),
    };
    await this.prisma.pendingSignup.upsert({
      where: { email: dto.email.toLowerCase() },
      create: { email: dto.email.toLowerCase(), ...pendingData },
      update: pendingData,
    });

    await this.emailService.sendMagicLinkEmail(dto.email.toLowerCase(), firstName, token);
    return { message: theConfirmationLinkWasSent(dto.email.toLowerCase()), email: dto.email.toLowerCase() };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { organization: true },
    });

    /*
     * ONE ANSWER AT THE DOOR. See one-answer-at-the-door.ts: these branches told a stranger which
     * addresses are registered, which use Google, and which have never set a password. The reason
     * is logged for us and never sent, and the useful detail goes by email — where only the owner
     * of the address can read it.
     */
    /* Annotated on the DECLARATION, not only on the arrow: TypeScript narrows after a
       never-returning call only when the variable itself carries the type. */
    const refuse: (why: WhyTheyCouldNotSignIn) => never = (why) => {
      this.logger.log(`Sign-in refused for ${dto.email.toLowerCase()}: ${why}.`);
      throw new UnauthorizedException(THE_SAME_ANSWER_EITHER_WAY);
    };

    if (!user || user.deletedAt) {
      /*
       * SOMEBODY WHO SET A PASSWORD AND NEVER FINISHED (B-192, server half). Their account does not exist until the link is opened and an organisation chosen, so the password
       * "did not work" and the one answer at the door told them to check it. If the password is the one they set, that proves the address is theirs, so they are told plainly
       * what is left and the link is sent again (new, in case the old one ran out). Anybody else reads the same answer as before, so nothing is learnt about a stranger's address.
       */
      const pending = !user ? await this.prisma.pendingSignup.findUnique({ where: { email: dto.email.toLowerCase() } }).catch(() => null) : null;
      if (pending?.passwordHash && (await bcrypt.compare(dto.password, pending.passwordHash).catch(() => false))) {
        const token = crypto.randomBytes(32).toString('hex');
        await this.prisma.pendingSignup.update({ where: { id: pending.id }, data: { token, expiresAt: expiresAtFor('verify an address') } });
        await this.emailService.sendVerificationEmail(pending.email, pending.firstName, token).catch((err) => this.logger.error(`Failed to send the sign-up link again to ${pending.email}: ${err?.message}`));
        this.logger.log(`Sign-in refused for ${dto.email.toLowerCase()}: the sign-up was never finished; the link was sent again.`);
        throw new UnauthorizedException(YOUR_SIGN_UP_IS_NOT_FINISHED);
      }
      refuse('no such account');
    }
    if (!user.isActive) refuse('the account is deactivated');
    if (!user.isEmailVerified) refuse('the address is not verified');

    if (!user.passwordHash) {
      if (user.googleId) {
        await this.aNewLinkEndsTheOlderOnes(user.id, TokenType.PASSWORD_SETUP);
        const token = crypto.randomBytes(32).toString('hex');
        await this.prisma.emailVerificationToken.create({
          data: { userId: user.id, token: hashed(token), type: TokenType.PASSWORD_SETUP, expiresAt: expiresAtFor('set a password from an email') },
        });
        this.emailService.sendAddPasswordEmail(user.email, user.firstName, token, true).catch((err) =>
          this.logger.error(`Failed to send add-password email to ${user.email}: ${err.message}`),
        );
        refuse('they sign in with Google and have no password');
      }
      // Participant accounts are created without a password. Auto-send a setup
      // link so they can get back in without needing to contact anyone.
      await this.aNewLinkEndsTheOlderOnes(user.id, TokenType.PASSWORD_SETUP);
      const token = crypto.randomBytes(32).toString('hex');
      await this.prisma.emailVerificationToken.create({
        data: { userId: user.id, token: hashed(token), type: TokenType.PASSWORD_SETUP, expiresAt: expiresAtFor('set a password from an email') },
      });
      this.emailService.sendAddPasswordEmail(user.email, user.firstName, token).catch((err) =>
        this.logger.error(`Failed to send password setup email to ${user.email}: ${err.message}`),
      );
      refuse('they have no password yet');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) refuse('the password was wrong');

    return await this.buildAuthResponse(user as unknown as UserWithOrg);
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<AuthResponseDto> {
    /**
     * A pending signup becomes real here, and nowhere earlier.
     *
     * `entrySave` no longer creates anything for a new address - it parks the
     * whole signup in `pendingSignup` against this token. Opening the link is
     * the proof that the person owns the mailbox, so this is the first moment
     * an Organization and a User may exist. See GW-001.
     *
     * Checked before `consumeToken`, because there is no EmailVerificationToken
     * row for a pending signup yet - the token lives on the pending record.
     */
    const pending = await this.prisma.pendingSignup.findUnique({ where: { token: dto.token } });
    if (pending) {
      if (pending.expiresAt < new Date()) {
        /**
         * AN EXPIRED LINK USED TO DESTROY THE WHOLE CONVERSATION.
         *
         * The record deleted here is not a token. It is everything somebody did before they gave
         * us an address: the situation they described, the transcript, the draft ground. Clicking
         * a day-old link deleted it and said "request a new one" — and the new one rebuilt from an
         * empty record, so the answer to "did I lose my work" was yes, silently, at the moment
         * they were trying to come back.
         *
         * The link expiring is a fact about the LINK. So the link is replaced and the work is
         * kept: a new token, a new day, and a new email to the same address — which is not a way in
         * for anybody else, because it goes where the first one went.
         */
        const freshToken = crypto.randomBytes(32).toString('hex');
        await this.prisma.pendingSignup.update({
          where: { id: pending.id },
          data: { token: freshToken, expiresAt: expiresAtFor('verify an address') },
        });
        await this.emailService
          .sendMagicLinkEmail(pending.email, pending.firstName, freshToken)
          .catch((err) => this.logger.error(`Could not re-send an expired link to ${pending.email}: ${err?.message}`));

        throw new BadRequestException(
          'That link had expired, so we have sent a new one to the same address. Nothing you wrote has been lost.',
        );
      }

      /*
       * THE PASSWORD CHOSEN AT SIGN-UP, ONLY IN THE BROWSER THAT CHOSE IT (aPasswordKey). Opened
       * anywhere else, it is thrown away now, so no later answer on this link can bring it back, and
       * the person chooses one after confirming, as after a sign-up by link. Nothing says so.
       */
      const passwordHash = pending.passwordHash && theKeyMatches(dto.passwordKey, pending.passwordKeyHash) ? pending.passwordHash : null;
      if (pending.passwordHash && !passwordHash) {
        await this.prisma.pendingSignup.update({ where: { id: pending.id }, data: { passwordHash: null, passwordKeyHash: null } });
      }

      // Someone may have signed up by another route in the meantime.
      const already = await this.prisma.user.findUnique({ where: { email: pending.email }, include: { organization: true } });
      if (already) {
        await this.prisma.pendingSignup.delete({ where: { id: pending.id } }).catch(() => undefined);
        return goOnTo(await this.withPasswordSetup(await this.buildAuthResponse(already as unknown as UserWithOrg, 'link'), already.id), pending.next);
      }

      /*
       * INVITED TO A CHECK-IN, AND SIGNING UP INSTEAD OF OPENING THE INVITATION (journey test, 12 October).
       *
       * Pia was on Lena's check-in at Brightloom and asked for a sign-in link from the sign-in page. Her
       * address had no account, so this made "Pia's workspace" with her as its admin, and her check-in was
       * somewhere she could no longer reach. A person who has a place on a check-in never gets a new
       * organisation made here. They are made exactly as opening the invitation makes them
       * (participants.service.ts accept): a person of the inviting organisation, waiting for an admin there
       * when somebody who is not an admin invited them, with their place on the check-in joined to them.
       */
      const invitedTo = await this.prisma.groundParticipant.findFirst({
        where: { email: pending.email, userId: null },
        orderBy: { createdAt: 'asc' },
        select: { groundId: true, addedByUserId: true, ground: { select: { organizationId: true, initiatorId: true } } },
      });
      if (invitedTo?.ground) {
        const orgId = invitedTo.ground.organizationId;
        /* As they stand in the check-in's organisation, not in whichever one they have open now (15 October). */
        const inviter = await howTheyStandIn(this.prisma, whoToAsk(invitedTo.addedByUserId, invitedTo.ground.initiatorId), orgId);
        const wait = needsApproval({
          groundOrganizationId: orgId,
          theirHomeOrganizationId: null,
          alreadyAMemberHere: false,
          addedByAnAdminOfThisOrg: isAnAdminOf(orgId, inviter as any),
        });
        const invited = await this.prisma.$transaction(async (tx) => {
          const u = await tx.user.create({
            data: {
              organizationId: orgId,
              email: pending.email,
              firstName: pending.firstName,
              lastName: pending.lastName ?? '',
              passwordHash,
              googleId: pending.googleId ?? undefined,
              role: 'MEMBER',
              isEmailVerified: true,
              /* Holds no seat and cannot check in until somebody says yes, as on accepting. */
              awaitingOrgApproval: wait,
            },
            include: { organization: true },
          });
          if (wait) {
            await tx.membershipRequest.upsert({
              where: { organizationId_userId: { organizationId: orgId, userId: u.id } },
              create: { organizationId: orgId, userId: u.id, email: pending.email, requestedByUserId: invitedTo.ground!.initiatorId, groundId: invitedTo.groundId, viaInvitation: true },
              update: {},
            });
          }
          if (pending.draftToken) {
            await tx.entryDraft.create({
              data: { userId: u.id, draftToken: pending.draftToken, payload: (pending.payload ?? {}) as any, history: (pending.history ?? []) as any },
            });
          }
          await tx.groundParticipant.updateMany({
            where: { email: pending.email, userId: null, awaitingSeat: false, ground: { status: { not: 'AWAITING_APPROVAL' } } },
            data: { userId: u.id },
          });
          await tx.pendingSignup.delete({ where: { id: pending.id } });
          return u;
        });
        if (wait) {
          tellTheAdminsSomebodyIsWaiting({ prisma: this.prisma, email: this.emailService, logger: this.logger }, orgId, invitedTo.groundId, invitedTo.ground.initiatorId, pending.email)
            .catch((err: any) => this.logger.warn(`Could not tell the admins about ${pending.email}: ${err?.message}`));
        }
        this.logger.log(`${pending.email} confirmed an address that was invited to a check-in, and joined the organisation that invited them`);
        /*
         * Waiting: the app takes them to "Almost in". Not waiting: STRAIGHT INTO THEIR CHECK-IN, as opening
         * the invitation does (InvitePage after accept). '/today' was a "home", and the link's page
         * answers a home by posting /entry/commit for somebody who had nothing to save; a real
         * destination goes there without a commit, so no 400 and nothing made. A draft they wrote in
         * the entry chat still goes home, so the page saves it.
         */
        let onward = wait ? '/join/waiting' : '/today';
        if (!wait && !pending.draftToken) {
          const open = await Promise.resolve(this.prisma.checkIn?.findFirst?.({
            where: { participant: { userId: invited.id, groundId: invitedTo.groundId }, status: { not: 'COMPLETED' as any } },
            orderBy: { sessionNumber: 'asc' },
            select: { id: true },
          })).catch(() => null);
          if (open?.id) onward = `/checkin/${open.id}`;
        }
        return goOnTo({ ...(await this.readyAfter(pending, await this.buildAuthResponse(invited as unknown as UserWithOrg, 'link'), invited.id)), justCreated: true }, onward);
      }

      /*
       * ARE THEY ALREADY EXPECTED SOMEWHERE?
       *
       * HR pushes a roster and one of those people signs up — and used to land in
       * a brand new empty organisation of their own, admin of nothing, one row
       * away from their objectives and their colleagues. See
       * `they-are-already-on-somebodys-roster.ts` for the four rules that decide
       * this, and for why an exact address is the only thing ever matched.
       *
       * Narrowed to the address HERE, so that file cannot widen it to a domain.
       */
      const listedAs = await this.prisma.person.findMany({
        where: { email: { equals: pending.email, mode: 'insensitive' } },
        select: { id: true, organizationId: true, email: true, active: true, linkedUserId: true },
      });
      const belongs = whereTheyBelong(
        listedAs.map((r) => ({
          personId: r.id,
          organizationId: r.organizationId,
          email: r.email,
          active: r.active,
          linkedUserId: r.linkedUserId,
        })),
      );

      if (belongs.join) {
        const joined = await this.prisma.$transaction(async (tx) => {
          const u = await tx.user.create({
            data: {
              organizationId: belongs.organizationId,
              email: pending.email,
              firstName: pending.firstName,
              lastName: pending.lastName ?? '',
              passwordHash,
              googleId: pending.googleId ?? undefined,
              /* Never an admin. Being listed is not authority over the company. */
              role: ROLE_FOR_SOMEBODY_EXPECTED as any,
              isEmailVerified: true,
            },
            include: { organization: true },
          });
          /* The roster row and the account meet, so the panel and every check-in
             read as this person from the first minute rather than the second
             time they sign in. */
          const listed = await tx.person.update({ where: { id: belongs.personId }, data: { linkedUserId: u.id }, select: { phone: true } });
          /* A sign-in made with no number takes the roster's (decision 106 item 3). */
          await aSignInWithNoNumberTakesTheRosters(tx, u.id, listed?.phone);
          await tx.groundParticipant.updateMany({
            where: { email: pending.email, userId: null, awaitingSeat: false, ground: { status: { not: 'AWAITING_APPROVAL' } } },
            data: { userId: u.id },
          });
          await tx.pendingSignup.delete({ where: { id: pending.id } });
          return u;
        });

        this.logger.log(`${pending.email} joined the organisation that already listed them`);
        /* This link has just made the account (U.2): the client says "Your email is confirmed". */
        return goOnTo({ ...(await this.readyAfter(pending, await this.buildAuthResponse(joined as unknown as UserWithOrg, 'link'), joined.id)), justCreated: true }, pending.next);
      }

      /*
       * AN INVITE LINK, OR AN ORGANISATION THAT LETS THEIR DOMAIN JOIN, MAKES NO ORGANISATION (U.3 review).
       *
       * Everybody who reached this line used to become the admin of a new organisation, named from
       * what they typed or from their own name. So somebody who pressed "Join Coamana" on Coamana's
       * invite link, or whose @coamana.com address Coamana lets join, got an empty organisation of
       * their own as well, and landed in it. Now:
       *   - From an invite link that is still open, with a seat: they join that organisation, as
       *     "Takes part", on confirming. They pressed "Join" before signing up; that is the choice.
       *   - Otherwise, if an organisation lets their confirmed domain join, or the link they came
       *     from could not take them: nothing is made yet, and the answer asks "Where do you work?".
       *     The next answer joins one that was offered, or creates their own (`createMyOwn`).
       *   - Otherwise, as before: their own organisation, and they are its admin.
       */
      if (!dto.createMyOwn) {
        const where = await this.whereAWaitingSignUpMayGo(pending.email, pending.next);
        const chosen = dto.joinOrganizationId
          ? where.offered.find((o) => o.id === dto.joinOrganizationId) ?? null
          : where.byLink;
        if (dto.joinOrganizationId && !chosen) {
          throw new ForbiddenException('You cannot join that organisation with your email address. Ask somebody there to invite you.');
        }
        let problem: string | null = where.linkProblem;
        if (chosen) {
          const room = await this.billing.canInviteMember(chosen.id);
          if (room.allowed) {
            const joined = await this.prisma.$transaction(async (tx) => {
              const u = await tx.user.create({
                data: {
                  organizationId: chosen.id,
                  email: pending.email,
                  firstName: pending.firstName,
                  lastName: pending.lastName ?? '',
                  passwordHash,
              googleId: pending.googleId ?? undefined,
                  /* "Takes part". Never an admin: joining is not authority over the company. */
                  role: ROLE_FOR_SOMEBODY_EXPECTED as any,
                  isEmailVerified: true,
                  /*
                   * THE ONE MEMBERSHIP, NESTED HERE (U.3 re-review). The database client's hook
                   * (prisma.service.ts, theMembershipFollowsTheUser) adds a membership to every user
                   * created with an organisation, unless the create brings its own. A second, separate
                   * create collided with it on every join against the real database. So the membership
                   * comes with the user, carrying how they joined, and the hook leaves it alone.
                   */
                  memberships: { create: { organizationId: chosen.id, role: ROLE_FOR_SOMEBODY_EXPECTED as any, joinedHow: chosen.how } },
                },
                include: { organization: true },
              });
              if (pending.draftToken) {
                await tx.entryDraft.create({
                  data: { userId: u.id, draftToken: pending.draftToken, payload: (pending.payload ?? {}) as any, history: (pending.history ?? []) as any },
                });
              }
              await tx.groundParticipant.updateMany({ where: { email: pending.email, userId: null, awaitingSeat: false, ground: { status: { not: 'AWAITING_APPROVAL' } } }, data: { userId: u.id } });
              await tx.pendingSignup.delete({ where: { id: pending.id } });
              return u;
            });
            this.logger.log(`${pending.email} joined ${chosen.name} ${chosen.how === 'link' ? 'by its invite link' : 'by email domain'} on confirming`);
            /* Joined, so not back to the invite link's "Join" button: on to Today. */
            return { ...(await this.readyAfter(pending, await this.buildAuthResponse(joined as unknown as UserWithOrg, 'link'), joined.id)), justCreated: true, next: '/today' };
          }
          problem = `${chosen.name} has no room for another person on its plan right now. Ask an admin there to make room, or to invite you when there is.`;
        }
        if (where.offered.length > 0 || where.cameByLink) {
          /* Nothing is made, and this link stays good until they choose (or it runs out). */
          return {
            /* Their own address, which this link has just proved, for "Your email is confirmed". */
            email: pending.email,
            whereDoYouWork: {
              byDomain: where.byDomain.map((o) => ({ id: o.id, name: o.name, domain: where.domain! })),
              ...(problem ? { problem } : {}),
            },
          } as any;
        }
      }

      // The slug comes from the organisation NAME, never the email domain, so a
      // company's namespace cannot be claimed from an address. See GW-001.
      /*
       * "CREATE A NEW ORGANISATION" ON "WHERE DO YOU WORK?" (U.3 re-review). Named from what they typed
       * at sign-up if they typed a name. The box is filled in from the address ("Coamana" from
       * @coamana.com), and that suggestion is the name of the organisation they have just chosen not
       * to join, so a name they only left as suggested is not used: they get "<first name>'s
       * workspace", which they can rename. A plain sign-up keeps the suggestion, as Hafsah decided.
       */
      const onlySuggested = !!dto.createMyOwn && (pending.payload as any)?.orgNameSuggested === true;
      const orgName = (onlySuggested ? '' : pending.orgName?.trim()) || `${pending.firstName}'s workspace`;
      const slug = await this.generateUniqueSlug(orgName);

      const created = await this.prisma.$transaction(async (tx) => {
        /* The contact email is the admin's until they say otherwise - see the note on register. */
        const org = await tx.organization.create({ data: { name: orgName, slug, email: pending.email } });
        /* A sign-up link that makes an organisation never asks the team's size, named or not (decision 121, item 3), so billing applies the trial rule itself. */
        this.signedUp(org, pending.email, true);
        const u = await tx.user.create({
          data: {
            organizationId: org.id,
            email: pending.email,
            firstName: pending.firstName,
            lastName: pending.lastName ?? '',
            /* Only the password signup path carries one. The others set a password later. */
            passwordHash,
              googleId: pending.googleId ?? undefined,
            role: 'ADMIN',
            // Verified by construction: this only runs because the link opened.
            isEmailVerified: true,
          },
          include: { organization: true },
        });
        /* The first admin of a new organisation holds it. One function, five doors. */
        await theFirstAdminHoldsIt(tx, org.id, u.id);
        if (pending.draftToken) {
          await tx.entryDraft.create({
            data: {
              userId: u.id,
              draftToken: pending.draftToken,
              payload: (pending.payload ?? {}) as any,
              history: (pending.history ?? []) as any,
            },
          });
        }
        // Connect any check-ins made under this address before the account existed.
        await tx.groundParticipant.updateMany({
          where: { email: pending.email, userId: null, awaitingSeat: false, ground: { status: { not: 'AWAITING_APPROVAL' } } },
          data: { userId: u.id },
        });
        await tx.pendingSignup.delete({ where: { id: pending.id } });
        return u;
      });

      /* Named or left blank: the trial is in place before the page saves the check-in it was holding. */
      await this.theTrialIsGivenBeforeTheyGoOn(created.organizationId);

      /* This link has just made the account and its organisation (U.2). */
      /* Chosen on "Where do you work?": on to the new organisation's Today, not back to where they came from. */
      return goOnTo({ ...(await this.readyAfter(pending, await this.buildAuthResponse(created as unknown as UserWithOrg, 'link'), created.id)), justCreated: true }, dto.createMyOwn ? '/today' : pending.next);
    }

    const tokenRecord = await this.consumeToken(dto.token, TokenType.EMAIL_VERIFICATION, { allowExpiredMessage: 'This verification link has expired. Please request a new one.' });

    const { user } = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: tokenRecord.userId }, data: { isEmailVerified: true } });
      await tx.emailVerificationToken.update({ where: { id: tokenRecord.id }, data: { usedAt: new Date() } });
      // Link any groundParticipant records whose email matches but have no userId yet.
      // This connects participants who checked in before creating their account.
      await tx.groundParticipant.updateMany({
        where: { email: tokenRecord.user.email.toLowerCase(), userId: null, awaitingSeat: false, ground: { status: { not: 'AWAITING_APPROVAL' } } },
        data: { userId: tokenRecord.userId },
      });
      return { user: tokenRecord.user };
    });

    return goOnTo(await this.withPasswordSetup(await this.buildAuthResponse(user as unknown as UserWithOrg, 'link'), user.id), tokenRecord.next);
  }

  async setPassword(dto: SetPasswordDto): Promise<AuthResponseDto> {
    const tokenRecord = await this.consumeToken(dto.token, TokenType.PASSWORD_SETUP, { allowExpiredMessage: 'This invitation link has expired. Please ask your admin to resend the invite.' });
    if (isTheirEmail(dto.password, tokenRecord.user.email)) throw new BadRequestException(IS_THEIR_EMAIL);
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: tokenRecord.userId }, data: { passwordHash, isEmailVerified: true } });
      await tx.emailVerificationToken.update({ where: { id: tokenRecord.id }, data: { usedAt: new Date() } });
      // Link any groundParticipant records whose email matches - same as verifyEmail.
      // Covers participants who were invited before creating their account.
      await tx.groundParticipant.updateMany({
        where: { email: tokenRecord.user.email.toLowerCase(), userId: null, awaitingSeat: false, ground: { status: { not: 'AWAITING_APPROVAL' } } },
        data: { userId: tokenRecord.userId },
      });
      return tokenRecord.user;
    });

    return await this.buildAuthResponse(user as unknown as UserWithOrg);
  }

  /**
   * resendVerification LIVED HERE AND NOTHING CALLED IT.
   *
   * The controller's own comment records why: the resend route was consolidated into
   * register-magic-link, which mints the same verification token from one place. This
   * was the method the removed route used to call, left behind by that
   * consolidation - a fix applied to it would have reached nobody.
   *
   * Found by the dead-method rule.
   */


  async entrySave(
    email: string,
    // Server-side draft of the anonymous session, written HERE because this is
    // the ISSUE-17 consent moment (the person just gave their email). It makes
    // the post-verification commit independent of which browser opens the
    // magic link - before this, the transcript lived only in the originating
    // browser's localStorage and a link opened anywhere else lost the ground.
    draft?: { payload?: Record<string, any>; history?: unknown[] },
    /* A password chosen at sign-up (U.2). Used only for an address with no account. */
    password?: string,
    /* Where in the app they were going (U.3 review). Only a path inside this app is kept. */
    next?: string,
  ): Promise<{ message: string; email: string; draftToken?: string; passwordKey?: string }> {
    const lower = email.toLowerCase();
    const goingTo = aPathInThisApp(next);
    const message = 'Check your email for your sign-in link.';

    /*
     * CHECKED BEFORE THE ADDRESS IS LOOKED UP, so the answer cannot differ between an address that
     * has an account and one that does not. The other two rules are on the request (EntrySaveDto).
     */
    if (password !== undefined && isTheirEmail(password, lower)) throw new BadRequestException(IS_THEIR_EMAIL);

    if (draft && JSON.stringify(draft).length > 500_000) {
      throw new BadRequestException('That draft is too long to keep, so shorten it and try again.');
    }

    let user = await this.prisma.user.findUnique({ where: { email: lower } });
    let draftToken: string | undefined;
    /*
     * THE KEY FOR THE PASSWORD, THE SAME SHAPE FOR EVERY ADDRESS. A new address with a password gets
     * the real key; an address with an account gets one of the same shape that is stored nowhere and
     * opens nothing, so the answer never says which addresses have accounts.
     */
    let passwordKey: string | undefined = password ? crypto.randomBytes(32).toString('hex') : undefined;

    if (!user) {
      /**
       * THE NAME THEY GAVE, IF THEY GAVE ONE. W10-2.
       *
       * Derived from the address otherwise, which is what this always did -
       * `sam.taylor@` becomes "Sam". That is a decent guess and it was the only
       * option, because nothing ever asked. The create-account view asks now, and it
       * arrives the same way the org name always has: on the draft payload.
       *
       * It matters more than a greeting. `verifyEmail` names the organisation
       * `${firstName}'s workspace` when none was typed, so a guessed name became the
       * company's name.
       */
      const localPart = lower.split('@')[0].replace(/[._\-+]/g, ' ').trim();
      /*
       * THE NAME SHE GAVE, SPLIT AS SHE WROTE IT (local test of staging, 15 October). The check-in's own save step asks
       * "Your name" now: Hafsah, who saved from /start where nothing asked, sent invitations as "Hjumare would like your
       * take on Sales check-in" and was greeted "Hi Hjumare", a piece of her address. "Hafsah Jumare" is Hafsah, and
       * Jumare is her last name, never all of it in the first name. The address is only the last resort, for a door that
       * sends no name at all.
       */
      const typedName = typeof draft?.payload?.firstName === 'string'
        ? [draft.payload.firstName, typeof draft?.payload?.lastName === 'string' ? draft.payload.lastName : ''].join(' ').replace(/\s+/g, ' ').trim()
        : '';
      const typedFirstName = typedName ? typedName.split(' ')[0].slice(0, 40) : '';
      const typedLastName = typedName ? typedName.split(' ').slice(1).join(' ').slice(0, 100) : '';
      const firstName = typedFirstName || (localPart.charAt(0).toUpperCase() + localPart.slice(1).split(' ')[0]).slice(0, 40) || 'User';
      /* The name is kept on the waiting sign-up, not in the check-in's own draft, which the commit reads field by field. */
      const { firstName: _givenFirst, lastName: _givenLast, ...theDraftsOwnPayload } = (draft?.payload ?? {}) as Record<string, any>;
      void _givenFirst; void _givenLast;

      /**
       * NOTHING IS CREATED UNTIL THE ADDRESS IS PROVED.
       *
       * This branch used to create an Organization and a User with role ADMIN
       * on the spot, both with `isEmailVerified: false`, plus the verification
       * token and the EntryDraft. So typing a stranger's work address
       * provisioned an organisation and an admin account in their name, and the
       * person whose address it was found out only if they read the mail. The
       * organisation was also named and slugged from their address without
       * anybody being asked. GW-001.
       *
       * The whole signup now waits in `pendingSignup` - the address, the name,
       * the org name if one was typed, and the entire anonymous transcript -
       * keyed to the verification token. `verifyEmail` creates the org, the user
       * and the draft in one transaction when the link is opened, so an
       * unopened link leaves no trace anywhere a real person can see.
       *
       * Upsert on email: pressing save twice, or coming back a day later,
       * refreshes the pending record and reissues the link rather than stacking
       * duplicates or failing on the unique index.
       */
      const token = crypto.randomBytes(32).toString('hex');
      const dt = draft ? crypto.randomBytes(32).toString('hex') : undefined;
      const typedOrgName = typeof draft?.payload?.orgName === 'string' ? draft.payload.orgName.trim().slice(0, 120) : '';

      /* Hashed here and held on the waiting sign-up, never on a User, which must not exist yet (GW-001). */
      const passwordHash = password ? await bcrypt.hash(password, 12) : undefined;
      /* With a key only this browser is given, so the password is kept only for it (aPasswordKey). */
      const keyed = password ? aPasswordKey() : undefined;
      passwordKey = keyed?.key;

      await this.prisma.pendingSignup.upsert({
        where: { email: lower },
        create: {
          email: lower,
          token,
          firstName,
          ...(typedLastName ? { lastName: typedLastName } : {}),
          orgName: typedOrgName || null,
          ...(passwordHash ? { passwordHash, passwordKeyHash: keyed!.keyHash } : {}),
          next: goingTo,
          payload: theDraftsOwnPayload as any,
          history: (draft?.history ?? []) as any,
          draftToken: dt ?? null,
          expiresAt: expiresAtFor('verify an address'),
        },
        /**
         * A SECOND SAVE WITHOUT A DRAFT MUST NOT ERASE THE FIRST ONE'S WORK.
         *
         * This wrote `payload: draft?.payload ?? {}` and `history: draft?.history ?? []`
         * unconditionally, so calling entrySave again with no draft replaced the whole
         * stored session with an empty object and an empty array. And there is a
         * button that does exactly that: /auth's "Send link" calls
         * `authApi.entrySave(email)` with no draft at all.
         *
         * THE SEQUENCE THAT LOSES A GROUND, which is what Hafsah hit:
         *   1. Finish the entry chat, type your email. The transcript is held here,
         *      correctly, until the address is proved (GW-001).
         *   2. Miss the confirmation - it renders 1678px down a 720px-tall panel and
         *      nothing scrolls to it, so the screen looks unchanged after you press
         *      save. Easy to forget you ever gave an address.
         *   3. Come back later, go to sign in, ask for a link with the same address.
         *      entrySave runs with no draft and blanks payload and history.
         *   4. Open that link: the account is created from an empty pending record.
         *      No ground, no transcript. "I signed in and my ground was not there."
         *
         * So the session fields are only written when a session was actually supplied.
         * A bare re-request now does what it says - reissues the link - and touches
         * nothing else. The name and org are preserved for the same reason: with no
         * draft, `firstName` is re-derived from the email and typedOrgName is empty, so
         * an unconditional write would also throw away the org name she typed.
         */
        update: {
          token,
          expiresAt: expiresAtFor('verify an address'),
          /* A password sent again replaces the one before; a request without one leaves it alone. */
          ...(passwordHash ? { passwordHash, passwordKeyHash: keyed!.keyHash } : {}),
          /* The same for where they were going: a bare "send the link again" keeps the place. */
          ...(goingTo ? { next: goingTo } : {}),
          ...(draft
            ? {
                firstName,
                lastName: typedLastName || null,
                orgName: typedOrgName || null,
                payload: theDraftsOwnPayload as any,
                history: (draft.history ?? []) as any,
                draftToken: dt ?? null,
              }
            : {}),
        },
      });
      draftToken = dt;

      await this.emailService.sendMagicLinkEmail(lower, firstName, token);
    } else {
      /**
       * AN ADDRESS THAT ALREADY HAS AN ACCOUNT GETS EXACTLY ONE EFFECT: THE LINK IS EMAILED.
       *
       * This branch used to do "last save wins": it upserted the account's EntryDraft with whatever
       * payload and history the caller sent, cleared consumedAt and groundId so a consumed draft
       * became commit-able again, and handed the freshly minted draftToken back to the caller. The
       * caller is unauthenticated - this route is @Public() - so anyone who knew a customer's email
       * address could overwrite that customer's unsubmitted session and keep editing it through
       * PATCH /entry/draft. The same call mailed the customer a magic link; opening it committed the
       * attacker's payload, which renames the organisation from `orgName` and invites whoever the
       * payload named, from the customer's organisation. One known address, and a company was
       * renamed and sending invitations on a stranger's say-so.
       *
       * Nothing about an account changes on the word of somebody who has not signed in to it. The
       * session this browser is holding is attached after the link is opened, from the browser that
       * holds it (MagicVerifyPage commits what localStorage has), not from this request. A person
       * returning on a new device with a session in hand signs in first. That is a smaller
       * convenience lost than a customer's organisation. `draft` is deliberately unread here.
       */
      // If a fresh unused token was created in the last 60 seconds, reuse it to prevent
      // double-tap from invalidating a link the user has not yet clicked.
      const recentToken = await this.prisma.emailVerificationToken.findFirst({
        where: {
          userId: user.id,
          type: TokenType.EMAIL_VERIFICATION,
          usedAt: null,
          createdAt: { gte: new Date(Date.now() - 60 * 1000) },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (recentToken) {
        return { message, email: lower, ...theSameShapeAsANewAddress(draft), ...(passwordKey ? { passwordKey } : {}) };
      }
      await this.prisma.emailVerificationToken.updateMany({
        where: { userId: user.id, type: TokenType.EMAIL_VERIFICATION, usedAt: null },
        data: { usedAt: new Date() },
      });
      const token = crypto.randomBytes(32).toString('hex');
      await this.prisma.emailVerificationToken.create({
        data: { userId: user.id, token: hashed(token), type: TokenType.EMAIL_VERIFICATION, expiresAt: expiresAtFor('verify an address'), ...(goingTo ? { next: goingTo } : {}) },
      });
      await this.emailService.sendMagicLinkEmail(lower, user.firstName, token);
    }

    /*
     * THE SAME FIELDS FOR EVERY ADDRESS. U.2 review, Hafsah's rule of 26 September.
     *
     * A new address that sent a draft gets the token for its waiting sign-up, so the entry chat can
     * keep editing it. An address with an account used to get no token at all, so the reply alone said
     * which addresses have accounts. It now gets a token of the same shape that is stored nowhere and
     * opens nothing: editing with it changes nothing (PATCH /entry/draft answers the same for a token
     * it does not hold), and the account's draft is still never written from here. Without a draft,
     * neither gets a token.
     */
    return { message, email: lower, ...(draftToken ? { draftToken } : user ? theSameShapeAsANewAddress(draft) : {}), ...(passwordKey ? { passwordKey } : {}) };
  }

  async teamInvite(
    inviterOrgName: string,
    inviteeEmail: string,
    inviterOrganizationId?: string,
    /**
     * U.4: the role the admin chose on the People page ("Admin", "Can open check-ins", "Takes part"),
     * and the name typed beside the address. Both optional: every other caller invites a member, and
     * a missing name is still made from the address.
     */
    how: { role?: 'ADMIN' | 'LEAD' | 'MEMBER'; name?: string | null } = {},
  ): Promise<{ message: string }> {
    const lower = inviteeEmail.toLowerCase();
    const role = how.role ?? 'MEMBER';
    /*
     * THE ORGANISATION'S OWN NAME, FROM THE RECORD. The caller passed `user.organizationName`, which the signed-in
     * user object does not carry, so every invitation said "You've been added to Groundwork on Groundwork" and told
     * the invited person nothing about who had asked them. The inviting organisation is known here; read its name.
     */
    if (inviterOrganizationId) {
      const inviting = await this.prisma.organization.findUnique({ where: { id: inviterOrganizationId }, select: { name: true } });
      if (inviting?.name) inviterOrgName = inviting.name;
    }

    let user = await this.prisma.user.findUnique({ where: { email: lower } });

    if (!user) {
      // canInviteMember had zero callers anywhere - this is the one place
      // that actually consumes a new member seat in the inviter's org (the
      // existing-user branch below just sends a sign-in link; it never
      // moves that user into inviterOrganizationId). Only check when we
      // actually have an inviter org - the standalone-workspace fallback
      // below has no org, and no plan cap can apply to an org that doesn't exist yet.
      if (inviterOrganizationId) {
        const canInvite = await this.billing.canInviteMember(inviterOrganizationId);
        if (!canInvite.allowed) throw new BadRequestException(canInvite.reason);
      }

      const localPart = lower.split('@')[0].replace(/[._\-+]/g, ' ').trim();
      const typed = (how.name ?? '').replace(/\s+/g, ' ').trim();
      const firstName = (typed ? typed.split(' ')[0] : (localPart.charAt(0).toUpperCase() + localPart.slice(1).split(' ')[0])).slice(0, 40) || 'there';
      const lastName = typed ? typed.split(' ').slice(1).join(' ').slice(0, 100) : '';

      const result = await this.prisma.$transaction(async (tx) => {
        let organizationId = inviterOrganizationId;
        if (!organizationId) {
          // Fallback: create a standalone workspace only when no inviter org is known.
          const domainBase = lower.split('@')[1]?.split('.')[0] ?? 'workspace';
          const slug = await this.generateUniqueSlug(domainBase);
          /* Their own workspace, so their own address. See the note on register. */
          const org = await tx.organization.create({ data: { name: `${firstName}'s workspace`, slug, email: lower } });
          this.signedUp(org, lower);
          organizationId = org.id;
        }
        const u = await tx.user.create({
          /* The role the admin chose here (U.4); the membership row the middleware makes copies it. */
          data: { organizationId, email: lower, firstName, lastName, role: inviterOrganizationId ? role : 'MEMBER', isEmailVerified: false },
        });
        /*
         * ONLY WHERE WE JUST MADE THE WORKSPACE FOR THEM. This branch also runs for somebody being
         * invited INTO an existing organisation, and claiming that one for the invitee would hand a
         * customer's account to the newest person in it. `theFirstAdminHoldsIt` refuses to take one
         * that is already held, but an organisation that has none yet would be taken - so it is
         * asked only when this call created the organisation a line earlier.
         */
        if (!inviterOrganizationId) await theFirstAdminHoldsIt(tx, organizationId, u.id);
        const token = crypto.randomBytes(32).toString('hex');
        await tx.emailVerificationToken.create({
          data: { userId: u.id, token: hashed(token), type: TokenType.PASSWORD_SETUP, expiresAt: expiresAtFor('set a password from a team invitation') },
        });
        return { firstName, token };
      });

      await this.emailService.sendUserInvite(lower, result.firstName, result.token, inviterOrgName);
    } else {
      /*
       * THEY ALREADY HAVE AN ACCOUNT, AND THE INVITE USED TO DO NOTHING.
       *
       * This sent a magic sign-in link and stopped. The link works, it signs them into THEIR OWN
       * organisation, and they are never added to the one that invited them - so an admin invites a
       * colleague who happens to have signed up elsewhere, is told "Invite sent", and the person
       * never appears in People. Nothing failed loudly; the invite simply had no effect.
       *
       * A membership for the inviting organisation is what an invite actually is. Their home
       * organisation is untouched - they keep their own grounds and their own role there - and this
       * is what puts the inviting company in their switcher.
       *
       * ALWAYS MEMBER, never their role at home: being an admin of their own company says nothing
       * about what they should hold in somebody else's.
       */
      let addedNow = false;
      if (inviterOrganizationId && user.organizationId !== inviterOrganizationId) {
        const already = await this.prisma.organizationMembership.findUnique({
          where: { userId_organizationId: { userId: user.id, organizationId: inviterOrganizationId } },
          select: { id: true },
        });
        if (!already) {
          /* A person joining costs a seat here exactly as a new account does. */
          const canInvite = await this.billing.canInviteMember(inviterOrganizationId);
          if (!canInvite.allowed) throw new BadRequestException(canInvite.reason);
          /* The role this organisation's admin chose for them here (U.4), never their role at home. */
          await this.prisma.organizationMembership.create({
            data: { userId: user.id, organizationId: inviterOrganizationId, role },
          });
          this.logger?.log?.(`Existing account ${lower} added to org ${inviterOrganizationId} as a member.`);
          addedNow = true;
        }
      }

      // Send them a magic sign-in link.
      await this.prisma.emailVerificationToken.updateMany({
        where: { userId: user.id, type: TokenType.EMAIL_VERIFICATION, usedAt: null },
        data: { usedAt: new Date() },
      });
      const token = crypto.randomBytes(32).toString('hex');
      await this.prisma.emailVerificationToken.create({
        data: { userId: user.id, token: hashed(token), type: TokenType.EMAIL_VERIFICATION, expiresAt: expiresAtFor('sign in from a team invitation') },
      });
      /* Added to a new organisation just now: told so, by name, in a plain email (Hafsah, 12 October). */
      if (addedNow) await this.emailService.sendAddedToAnotherOrganisation(lower, user.firstName, token, inviterOrgName);
      else await this.emailService.sendMagicLinkEmail(lower, user.firstName, token);
    }

    return { message: 'Invite sent.' };
  }

  async memberSignin(dto: MemberSigninDto): Promise<{ message: string; email: string }> {
    const message = 'We have sent a sign-in link to that address, if we know it. Check your email.';
    const email = dto.email.toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.deletedAt || !user.isActive) return { message, email };

    const recentToken = await this.prisma.emailVerificationToken.findFirst({
      where: { userId: user.id, type: TokenType.EMAIL_VERIFICATION, usedAt: null, createdAt: { gte: new Date(Date.now() - 2 * 60 * 1000) } },
    });
    if (recentToken) return { message, email };

    await this.prisma.emailVerificationToken.updateMany({
      where: { userId: user.id, type: TokenType.EMAIL_VERIFICATION, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = crypto.randomBytes(32).toString('hex');
    await this.prisma.emailVerificationToken.create({
      data: { userId: user.id, token: hashed(token), type: TokenType.EMAIL_VERIFICATION, expiresAt: expiresAtFor('verify an address') },
    });

    await this.emailService.sendSignInLinkEmail(email, user.firstName, token).catch((err) => {
      this.logger.error(`Failed to send member sign-in email to ${email}: ${err.message}`);
    });
    /* The same answer for every address. The development link is in the server log, where the
       email service writes every link it would have sent; it is never in the answer, because a
       devUrl only for addresses that have an account says which addresses do (U.2 review). */
    return { message, email };
  }

  async requestPasswordSetupForUser(userId: string): Promise<{ token: string }> {
    await this.aNewLinkEndsTheOlderOnes(userId, TokenType.PASSWORD_SETUP);
    const token = crypto.randomBytes(32).toString('hex');
    await this.prisma.emailVerificationToken.create({
      /* A fifth window (24h) sat here, distinct from the other three PASSWORD_SETUP ones for no
         stated reason. It is an emailed setup link like the others, so it uses their window. */
      data: { userId, token: hashed(token), type: TokenType.PASSWORD_SETUP, expiresAt: expiresAtFor('set a password from an email') },
    });
    return { token };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const message = 'We have sent a link to choose a new password to that address, if we know it. Check your email.';
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user) return { message };

    await this.aNewLinkEndsTheOlderOnes(user.id, TokenType.PASSWORD_RESET);

    const token = crypto.randomBytes(32).toString('hex');
    await this.prisma.emailVerificationToken.create({
      data: { userId: user.id, token: hashed(token), type: TokenType.PASSWORD_RESET, expiresAt: expiresAtFor('reset a password') },
    });

    await this.emailService.sendPasswordResetEmail(user.email, user.firstName, token).catch((err) => {
      this.logger.error(`Failed to send password reset email to ${user.email}: ${err.message}`);
    });
    /* The same answer for every address; the development link is in the server log only. See memberSignin. */
    return { message };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<AuthResponseDto> {
    const tokenRecord = await this.consumeToken(dto.token, TokenType.PASSWORD_RESET, { allowExpiredMessage: 'This reset link has expired. Please request a new one.' });
    if (isTheirEmail(dto.password, tokenRecord.user.email)) throw new BadRequestException(IS_THEIR_EMAIL);
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.$transaction(async (tx) => {
      /*
       * THE OTHER SESSIONS END HERE. Whoever prompted this reset is holding a token that stays valid
       * for its full seven days unless something invalidates it; the epoch does (A10 / B16). The
       * session minted below is from the UPDATED row, so it carries the new epoch and is the one
       * that survives.
       */
      const updated = await tx.user.update({ where: { id: tokenRecord.userId }, data: { passwordHash, tokenEpoch: { increment: 1 } } });
      await tx.emailVerificationToken.update({ where: { id: tokenRecord.id }, data: { usedAt: new Date() } });
      return { ...tokenRecord.user, ...updated };
    });

    return await this.buildAuthResponse(user as unknown as UserWithOrg);
  }

  /**
   * Sign in with Google, and only invent an organisation when there is genuinely
   * nobody expecting this person.
   *
   * There are three ways someone can arrive here and they deserve different
   * answers:
   *
   *   they already have an account   -> sign in; link the googleId if it is new
   *   they were invited to a ground  -> they belong to the org that invited them.
   *                                     Creating a private workspace for them
   *                                     would strand them next to the ground
   *                                     they were actually asked to join.
   *   nobody is expecting them       -> a new organisation, and we should ASK
   *                                     what it is called rather than deciding
   *
   * The last case used to be the only one for anybody without an account: a
   * fresh org named "<FirstName>'s Workspace", with no chance to say otherwise.
   * That name then appears on every page their whole team sees. `needsOrgName`
   * is returned so the caller can ask - optionally, because plenty of people
   * genuinely are a workspace of one, and because someone joining an existing
   * org should never be asked at all.
   */
  async findOrCreateGoogleUser(
    googleUser: { googleId: string; email: string; firstName: string; lastName: string },
    /* Where in the app they were going, carried through Google as `state` (U.3 review). */
    next?: string | null,
  ): Promise<
    | { token: string; isNewUser: boolean; needsOrgName: boolean; pendingToken?: never }
    /* Nothing made yet: the browser goes to /verify-email with this token (U.3 review). */
    | { pendingToken: string; token?: never; isNewUser?: never; needsOrgName?: never }
  > {
    const email = googleUser.email.toLowerCase();
    let isNewUser = false;
    let needsOrgName = false;

    let user = await this.prisma.user.findFirst({ where: { googleId: googleUser.googleId }, include: { organization: true } });

    if (!user) {
      const existingByEmail = await this.prisma.user.findUnique({ where: { email }, include: { organization: true } });
      if (existingByEmail) {
        user = await this.prisma.user.update({
          where: { id: existingByEmail.id },
          data: { googleId: googleUser.googleId, isEmailVerified: true },
          include: { organization: true },
        });
      } else {
        isNewUser = true;

        /**
         * Someone already asked for this person by name.
         *
         * An invited participant has a GroundParticipant row carrying their email
         * and no user yet. If they turn up via Google before clicking the invite,
         * they belong in the organisation that invited them - the same place
         * accepting the invite would have put them - not in a workspace of their
         * own with the ground they were invited to sitting somewhere else.
         */
        const invited = await this.prisma.groundParticipant.findFirst({
          where: { email, userId: null },
          select: { ground: { select: { organizationId: true } } },
          orderBy: { createdAt: 'asc' },
        });
        if (invited?.ground?.organizationId) {
          user = await this.prisma.user.create({
            data: {
              organizationId: invited.ground.organizationId,
              email,
              googleId: googleUser.googleId,
              firstName: googleUser.firstName,
              lastName: googleUser.lastName,
              role: 'MEMBER',
              isEmailVerified: true,
            },
            include: { organization: true },
          });
          if (!user.isActive) throw new UnauthorizedException(YOU_CAN_NO_LONGER_SIGN_IN_HERE);
          return { token: this.generateToken(user, 'google'), isNewUser, needsOrgName: false };
        }

        /*
         * FROM AN INVITE LINK, OR WITH A DOMAIN AN ORGANISATION LETS JOIN (U.3 review): the same as
         * signing up by email. Nothing is made here. A waiting sign-up is kept, marked as proved by
         * Google, and the browser goes to the same confirmation page with its token, where
         * `verifyEmail` does what it does for everybody: joins an open link with a seat, or asks
         * "Where do you work?" on a domain match or a closed or full link. One path, not a copy.
         *
         * The waiting sign-up is written fresh: anything an earlier, unproved sign-up for this address
         * left on it (a password, a draft, an organisation name) was typed by somebody Google has not
         * vouched for, so none of it is kept.
         */
        const where = await this.whereAWaitingSignUpMayGo(email, next);
        if (where.cameByLink || where.offered.length > 0) {
          const pendingToken = crypto.randomBytes(32).toString('hex');
          const fresh = {
            token: pendingToken,
            firstName: googleUser.firstName || email.split('@')[0],
            lastName: googleUser.lastName || null,
            orgName: null,
            passwordHash: null,
            passwordKeyHash: null,
            payload: {} as any,
            history: [] as any,
            draftToken: null,
            next: aPathInThisApp(next),
            googleId: googleUser.googleId,
            expiresAt: expiresAtFor('choose where you work after Google'),
          };
          await this.prisma.pendingSignup.upsert({ where: { email }, create: { email, ...fresh }, update: fresh });
          return { pendingToken };
        }

        // Nobody is expecting them. Make an organisation so they have somewhere
        // to be, and ask what it should be called.
        needsOrgName = true;
        const orgName = `${googleUser.firstName}'s Workspace`;
        const slug = await this.generateUniqueSlug(orgName);

        user = await this.prisma.$transaction(async (tx) => {
          /* The contact email is the admin's until they say otherwise - see the note on register. */
          const organization = await tx.organization.create({ data: { name: orgName, slug, email } });
          this.signedUp(organization, email, true);
          const created = await tx.user.create({
            data: {
              organizationId: organization.id,
              email,
              googleId: googleUser.googleId,
              firstName: googleUser.firstName,
              lastName: googleUser.lastName,
              role: 'ADMIN',
              isEmailVerified: true,
            },
            include: { organization: true },
          });
          /* The first admin of a new organisation holds it. One function, five doors. */
          await theFirstAdminHoldsIt(tx, organization.id, created.id);
          return created;
        });
      }
    }

    if (!user.isActive) throw new UnauthorizedException(YOU_CAN_NO_LONGER_SIGN_IN_HERE);
    return { token: this.generateToken(user, 'google'), isNewUser, needsOrgName };
  }

  /**
   * VALID, AND NOTHING ELSE. This returned the address and first name behind an unused set-password
   * link, so a forwarded or logged link disclosed whose it was before anybody set anything (A10).
   */
  async validateToken(token: string, type: string): Promise<{ valid: boolean; expired?: true }> {
    /* A request with no token, or a token that is not a string (?token=a&token=b arrives as an
       array), is not a link: say so, instead of a 500 from hashing nothing. U.2 review. */
    if (typeof token !== 'string' || !token) return { valid: false };
    const tokenType =
      type === 'PASSWORD_SETUP' ? TokenType.PASSWORD_SETUP : type === 'PASSWORD_RESET' ? TokenType.PASSWORD_RESET : TokenType.EMAIL_VERIFICATION;

    const tokenRecord = await this.prisma.emailVerificationToken.findUnique({ where: { token: hashed(token) }, select: { usedAt: true, expiresAt: true, type: true } });
    if (!tokenRecord || tokenRecord.usedAt || tokenRecord.type !== tokenType) {
      return { valid: false };
    }
    /*
     * AN UNUSED LINK OF THE RIGHT KIND THAT HAS RUN OUT SAYS SO. U.2.
     *
     * So the reset and set-password pages can open on "That link has expired" and offer a fresh one,
     * instead of letting somebody type a password twice and only then be told. It says nothing the
     * holder does not already know: they hold the link, and only a real, unused link of this kind
     * gets this answer. An unknown, used or wrong-kind link still gets only { valid: false }, and
     * nothing here ever names the account (see a-secret-is-not-readable-from-the-table).
     */
    if (tokenRecord.expiresAt < new Date()) {
      return { valid: false, expired: true };
    }
    return { valid: true };
  }

  /**
   * THE SAME SHAPE AS SIGNING IN, BECAUSE IT IS THE SAME QUESTION.
   *
   * This built its own object beside `buildAuthResponse` and the two drifted, in the way two copies
   * of one shape always eventually do. What it lost was `mayOpenCheckIns`, and the loss was silent
   * and total: the client asks `user?.mayOpenCheckIns !== false`, `undefined !== false` is true, and
   * every page load calls this - so signing in hid the button correctly and the first refresh handed
   * it back to everybody in the organisation.
   *
   * The server refused what they then clicked, which is the guard working. It is not a defence:
   * being shown a door, walking through it and being turned away is a worse experience than never
   * seeing the door, and it teaches people the product is broken rather than that the setting is
   * deliberate.
   *
   * So there is one builder now, and a field added to it cannot fail to reach this route.
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { organization: true } });
    if (!user) throw new BadRequestException('We could not find that sign-in, so sign in again and try once more.');
    /* One builder. A field added to it cannot fail to reach this route now. */
    const belongsElsewhere = await this.belongsElsewhere(user.id, user.organizationId);
    return {
      ...this.theUserShape(user as unknown as UserWithOrg, belongsElsewhere), orgCode: user.organization.slug, emailNotifications: user.emailNotifications,
      /* THE ORGANISATION'S OWN DAY, FOR THE SCREENS (B-094; browser test, 20 October 2026): the zone every sentence the engine writes
         counts its days in, so a date the screen formats itself says the same day ("Session 3 opens on Monday 26 October", not Sunday
         25 in a reader's browser an hour or two behind). */
      organizationTimeZone: (await theOrganisationsZone(this.prisma as any, user.organizationId).catch(() => null)) ?? THE_PRODUCTS_OWN_ZONE,
      /* Their own WhatsApp number, on their own read only (reviewer, 14 October): Settings read "WhatsApp Not set" with
         Kevin's number saved, because this route never sent it. The sign-in's number, else the one on their roster entry. */
      phoneNumber: (user as any).phoneNumber ?? await this.theirRosterNumber(user.organizationId, user.id, user.email),
      /* True when they used the link in one of our emails. Settings says so, in the words of THE_SETTINGS_LABEL, and the switch turns it back on (decision 109). */
      emailsStoppedFromAMail: await new TheWaysToStopMail(this.prisma).stoppedFromAMail(user.email).catch(() => false),
      /* "Connect WhatsApp" for the person's own Settings, or null (decision 106 item 4). Only on their own read. */
      connectWhatsApp: await connectWhatsAppFor(this.prisma, this.configService, { organizationId: user.organizationId, userId: user.id, email: user.email }),
    };
  }

  /**
   * THE SAME SHAPE `/auth/me` SENDS, CALLABLE FROM OUTSIDE THIS SERVICE (U.8 re-review).
   *
   * Every door that signs somebody in inside this service already goes through `buildAuthResponse`
   * / `theUserShape`, so all of them carry `organizationName` and the rest. A door outside this
   * service - `participants.service.ts`'s `accept()`, when somebody follows an emailed invite - built
   * its own, smaller `user` object by hand: id, email, name, role, organizationId, and no
   * `organizationName`. The app-wide safety net (`useWhoTheServerSaysYouAre`) papers over that with a
   * follow-up `/auth/me`, but only once that request lands - so between accepting and that request
   * landing, the switcher had nothing to say and showed nothing, or the wrong thing, until then.
   *
   * Rather than teach every other door to remember the same fetch-and-cast dance `getProfile` does,
   * this is that dance, exposed once.
   */
  private async theirRosterNumber(organizationId: string, userId: string, email: string): Promise<string | null> {
    const row = await (this.prisma as any).person?.findFirst?.({
      where: { organizationId, phone: { not: null }, OR: [{ linkedUserId: userId }, { email: { equals: email, mode: 'insensitive' } }] },
      select: { phone: true },
    })?.catch?.(() => null);
    return row?.phone ?? null;
  }

  async userShapeFor(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { organization: true } });
    if (!user) throw new BadRequestException('We could not find that sign-in, so sign in again and try once more.');
    const belongsElsewhere = await this.belongsElsewhere(user.id, user.organizationId);
    return this.theUserShape(user as unknown as UserWithOrg, belongsElsewhere);
  }

  // --- helpers ---

  /**
   * Attach a PASSWORD_SETUP token when, and only when, the account has no password.
   *
   * Kept separate from `buildAuthResponse` so that helper stays synchronous for its six call sites.
   * Only the verification path needs it: that is where the promise "you will be asked to set a
   * password" is made, and where it was being broken.
   */
  /**
   * A NEW PASSWORD LINK ENDS THE OLDER ONES. U.2 review, Hafsah's rule of 26 September.
   *
   * An older reset or set-up link must stop working as soon as a newer one is sent, so a link left
   * in an old email, a forwarded message or a shared inbox cannot be used after the person has asked
   * for another. Every place in this service that makes a reset or set-up link calls this first.
   * Marked used rather than deleted, so an old link opened later says it did not work.
   */
  private async aNewLinkEndsTheOlderOnes(userId: string, type: 'PASSWORD_RESET' | 'PASSWORD_SETUP'): Promise<void> {
    await this.prisma.emailVerificationToken.updateMany({
      where: { userId, type: type === 'PASSWORD_RESET' ? TokenType.PASSWORD_RESET : TokenType.PASSWORD_SETUP, usedAt: null },
      data: { usedAt: new Date() },
    });
  }

  /**
   * The last step of a waiting sign-up becoming an account. One that Google proved (U.3 review) signs
   * in with Google and is never sent to choose a password; every other one is, as before.
   */
  private async readyAfter(pending: { googleId?: string | null }, res: AuthResponseDto, userId: string): Promise<AuthResponseDto> {
    return pending.googleId ? { ...res, needsPassword: false } : this.withPasswordSetup(res, userId);
  }

  private async withPasswordSetup(res: AuthResponseDto, userId: string): Promise<AuthResponseDto> {
    if (!res.needsPassword) return res;
    await this.aNewLinkEndsTheOlderOnes(userId, TokenType.PASSWORD_SETUP);
    const token = crypto.randomBytes(32).toString('hex');
    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        token: hashed(token),
        type: TokenType.PASSWORD_SETUP,
        /** Short: this is handed straight to the screen in front of them, not emailed. Named in
            how-long-a-link-lasts.ts so the difference from the emailed one is a decision on
            record rather than two literals that look like a mistake. */
        expiresAt: expiresAtFor('set a password on the screen you are already on'),
      },
    });
    return { ...res, passwordSetupToken: token };
  }

  /**
   * DOES THIS PERSON BELONG TO AN ORGANISATION OTHER THAN THE ONE THEY ARE ACTIVE IN.
   *
   * Signing up provisions an organisation and makes you its ADMIN, so almost everybody administers
   * something - usually their own workspace, which they may never use again. Being added to
   * somebody else's check-in creates a membership row but does NOT change your active organisation,
   * so you stay ADMIN of an unfinished workspace while your real work is elsewhere.
   *
   * `RequireOrgSetup` asked "an admin whose organisation has no contact email?" and sent them to
   * "Set up your organization" - a participant, invited to another company's check-in, told to
   * finish setting up a company they never meant to create, with no way past it. The redirect was
   * doing what it was written to do; the question was missing a clause.
   *
   * So the question is now "an admin with nowhere else to be". Somebody who genuinely has only the
   * one unfinished organisation still gets sent to finish it, which is the case the gate is for.
   */
  private async belongsElsewhere(userId: string, activeOrganizationId: string): Promise<boolean> {
    const other = await this.prisma.organizationMembership.count({
      where: { userId, organizationId: { not: activeOrganizationId } },
    });
    return other > 0;
  }

  private async buildAuthResponse(user: UserWithOrg, via: SignedInVia = 'password'): Promise<AuthResponseDto> {
    return {
      /**
       * Computed here rather than at each call site, because there are five doors into the app
       * (password, magic link, verify-email, Google, entry handover) and a signal only some of them
       * set is worse than no signal at all.
       */
      needsPassword: !(user as unknown as { passwordHash?: string | null }).passwordHash,
      /* `via` reaches the back-office door: a session that began with an emailed link says 'link' (B16). */
      accessToken: this.generateToken(user, via),
      user: this.theUserShape(user, await this.belongsElsewhere(user.id, user.organizationId)),
    };
  }

  /**
   * ONE SHAPE FOR WHO SOMEBODY IS, BUILT IN ONE PLACE.
   *
   * Signing in and `GET /auth/me` answer the same question and had two builders, which drifted the
   * way two copies of one shape always do. `mayOpenCheckIns` reached the first and not the second,
   * silently, so signing in hid the button correctly and the first page refresh handed it back to
   * everybody in the organisation.
   *
   * SEPARATE FROM `buildAuthResponse` RATHER THAN CALLING IT, because that one also mints an access
   * token, and fetching a profile is not a reason to issue a credential.
   */
  private theUserShape(user: UserWithOrg, belongsElsewhere: boolean) {
    return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId,
        organizationName: user.organization.name,
        isPlatformAdmin: user.isPlatformAdmin,
        /**
         * WHETHER THIS PERSON MAY OPEN A CHECK-IN, DECIDED BY THE ONE RULE THAT DECIDES IT.
         *
         * Without this the client cannot know, and what it did instead was show everybody the
         * button: a member saw "Start a check-in" in the rail, filled in eight steps, and was
         * refused on submit. The refusal was right and the journey was a waste of their afternoon.
         *
         * COMPUTED, NOT COPIED. Sending the role and the organisation's two settings and letting
         * the client work it out would put a second copy of the rule in a second language, and the
         * copy that drifts is the one deciding whether somebody sees a button.
         *
         * It is a convenience for the screen and never a permission: `create` asks the same
         * function again on every request, so a stale session cannot open anything.
         */
        mayOpenCheckIns: mayOpen(
          { role: user.role },
          {
            whoMayOpen: (user.organization.whoMayOpenCheckIns as 'NAMED_LEADS' | 'EVERYONE')
              ?? HOW_A_NEW_ORG_WORKS.whoMayOpen,
            needsApproval: user.organization.checkInsNeedApproval ?? HOW_A_NEW_ORG_WORKS.needsApproval,
          },
        ).may,
        /**
         * WHETHER THIS PERSON STILL HAS TO SET THEIR ORGANISATION UP, DECIDED HERE.
         *
         * The client had this rule as `user.role === 'ADMIN' && !user.organization?.email`, in two
         * places, and it was wrong in both for the same reason - see `belongsElsewhere`. Computed
         * server-side for the reason `mayOpenCheckIns` is: the copy that drifts is the one deciding
         * whether somebody can reach the product at all.
         */
        /*
         * NOT THE CONTACT EMAIL ANY MORE (U.3). The prototype's "Create an organisation" asks for a
         * billing email as optional ("Not shown to your team. You can add it later."), so an empty
         * one is a finished organisation, not an unfinished one. The one thing an organisation
         * cannot be without is its name, and every door names it at creation - so this is true
         * only for a nameless organisation, which should not exist, and it still never sends
         * somebody who belongs elsewhere to set up a workspace they did not ask for.
         */
        mustSetUpOrganisation:
          user.role === 'ADMIN' && !(user.organization.name ?? '').trim() && !belongsElsewhere,
        /**
         * THE ORGANISATION ITSELF, WHICH SIGNING IN DID NOT RETURN.
         *
         * `GET /auth/me` and `PATCH /auth/me` both return this object; every sign-in returned only
         * `organizationId` and `organizationName`. The client decides whether an admin still has to
         * set their organisation up by reading `user.organization?.email` - which is undefined on a
         * freshly signed-in user no matter what the organisation actually holds.
         *
         * So every ADMIN was sent to `/org/setup` on every sign-in, forever, including ones who had
         * filled it in months earlier. That page is deliberately bare, which is the first half of
         * why the menu was reported missing: you never reached a page that has one.
         *
         * The same five doors share this builder, so all five were wrong in the same way and one
         * fix covers them. The shape matches `/auth/me` deliberately - two endpoints returning a
         * different idea of the same user is what let this hide.
         */
        organization: {
          id: user.organization.id,
          name: user.organization.name,
          slug: user.organization.slug,
          careFeeStatus: user.organization.careFeeStatus,
          email: user.organization.email,
          companyStage: user.organization.companyStage,
        subscriptionPlan: user.organization.subscriptionPlan,
      },
    };
  }

  private async consumeToken(token: string, expectedType: TokenType, opts: { allowExpiredMessage: string }) {
    const tokenRecord = await this.prisma.emailVerificationToken.findUnique({
      where: { token: hashed(token) },
      include: { user: { include: { organization: true } } },
    });
    /**
     * THESE STRINGS ARE READ BY A PERSON, NOT A LOG. W8-62.
     *
     * They were 'Invalid token', 'This token has already been used' and 'Invalid
     * token type', and the client renders them verbatim under a password field.
     * Somebody who clicked a link in an email was told about the state of a database
     * row and given nothing to do about it. `participants.service.ts` had already
     * learnt this; this had not.
     *
     * "Used" stays a separate answer because it is the one case where the useful
     * instruction is different: they already set a password, so they should sign in
     * rather than ask for another link.
     */
    const NOT_A_LINK_WE_KNOW =
      'This link did not work. Each link works only once, and only for a short while. Open the newest one in your inbox, or ask for a new one from the sign-in page.';
    if (!tokenRecord) throw new BadRequestException(NOT_A_LINK_WE_KNOW);

    /*
     * THE WRONG KIND OF LINK IS NOT A CLAIM ABOUT WHAT IT DID.
     *
     * The type was checked LAST, after the used and expired branches had already told the person
     * what the link had accomplished. So a verification link opened at the password screen was
     * answered "your password is set", which is a fact about a different kind of link and sends
     * somebody looking for a password they never chose. Type first: if this is not the kind of
     * link this route consumes, say only that.
     */
    if (tokenRecord.type !== expectedType) throw new BadRequestException(NOT_A_LINK_WE_KNOW);

    /*
     * AND THE SENTENCE IS DERIVED FROM THE TYPE. See how-long-a-link-lasts.ts. `usedAt` is still
     * read before expiry — for a password link, "your password is set" remains the more useful
     * answer even when the row has since gone stale — but the wording now depends on what the
     * link was for rather than assuming every link sets a password.
     */
    if (tokenRecord.usedAt) {
      throw new BadRequestException(
        whatToSayAboutADeadLink({ type: tokenRecord.type, used: true, expired: tokenRecord.expiresAt < new Date() }),
      );
    }
    if (tokenRecord.expiresAt < new Date()) throw new BadRequestException(opts.allowExpiredMessage);
    return tokenRecord;
  }

  async updateProfile(userId: string, dto: import('./dto').UpdateProfileDto) {
    const userUpdate: Record<string, unknown> = {};
    if (dto.firstName !== undefined) userUpdate.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) userUpdate.lastName = dto.lastName.trim();
    if (dto.jobTitle !== undefined) userUpdate.jobTitle = dto.jobTitle.trim();
    if (dto.emailNotifications !== undefined) userUpdate.emailNotifications = dto.emailNotifications;

    const me = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    /* A first name of only spaces would wipe the name everybody reads (B-130). Somebody who has no name yet may still save the rest of the form. */
    if (dto.firstName !== undefined && !dto.firstName.trim() && me.firstName?.trim()) throw new BadRequestException('Please write your first name. It cannot be left empty.');
    /* Turning the switch on is the undo for a stop made from a link in a mail: the one choice, in both places (decision 109). */
    if (dto.emailNotifications === true) await new TheWaysToStopMail(this.prisma).turnBackOnFor(me.email).catch(() => undefined);
    /* One stored form for every number, the way WhatsApp sends it; a local number takes the
       organisation's country, or is refused with a sentence asking for the whole number (survey item 6). */
    if (dto.phoneNumber !== undefined) userUpdate.phoneNumber = dto.phoneNumber?.trim() ? await tidyANumberFor(this.prisma as any, me.organizationId, dto.phoneNumber) : null;
    /* A number on somebody else's sign-in is refused with a sentence, before anything is written (decision 106 item 3). */
    if (dto.phoneNumber !== undefined) await refuseANumberOnSomebodyElse(this.prisma, userUpdate.phoneNumber as string | null, userId, me.organizationId);

    /* Only the person's own row. The organisation is changed through PATCH /users/organization, by an admin. */
    if (Object.keys(userUpdate).length) {
      await this.prisma.user.update({ where: { id: userId }, data: userUpdate });
    }
    /* And their roster entry follows, so the number they typed is the one they are written to and recognised by. */
    if (dto.phoneNumber !== undefined) await aSignInsNumberChanged(this.prisma, userId, (userUpdate.phoneNumber as string | null) ?? null, me.organizationId);
    /* A number they add or change themselves gets the opening of each check-in open for them, as one a lead or an admin adds does (Drop Access, 21 October). */
    if (userUpdate.phoneNumber && (userUpdate.phoneNumber as string) !== (me.phoneNumber ?? null) && me.organizationId && this.whatsapp) {
      await theOpeningsGoToANumberJustSaved(this.prisma, this.whatsapp as any, { userId, organizationId: me.organizationId, phone: userUpdate.phoneNumber as string }).catch(() => undefined);
    }

    return this.getProfile(userId);
  }

  /**
   * THE EXCHANGE CODE IS A ROW, NOT A MAP ENTRY. It was the only mutable in-memory Map in the API,
   * and it made Google sign-in a single-process feature: a deploy between the callback and the
   * redirect, or a second instance taking the redeem, and the person saw "Invalid or expired
   * exchange code" (fix plan B15). Sixty seconds, single use, deleted on redemption; the ones nobody
   * redeemed are pruned by AuthCron.
   */
  static readonly AN_EXCHANGE_CODE_LASTS_MS = 60_000;

  async createOAuthExchangeCode(token: string): Promise<string> {
    const code = crypto.randomBytes(24).toString('hex');
    await this.prisma.oAuthExchangeCode.create({
      data: { code, token, expiresAt: new Date(Date.now() + AuthService.AN_EXCHANGE_CODE_LASTS_MS) },
    });
    return code;
  }

  /** Unknown and expired are told apart: one is a wrong link, the other is a slow one. */
  async redeemOAuthExchangeCode(code: string): Promise<{ accessToken: string }> {
    if (!code?.trim()) throw new BadRequestException('That is not a sign-in code we issued.');
    const row = await this.prisma.oAuthExchangeCode.findUnique({ where: { code } });
    if (!row) throw new BadRequestException('That is not a sign-in code we issued.');
    /* Delete first: a second redeem racing this one finds nothing and is told the code is gone. */
    const gone = await this.prisma.oAuthExchangeCode.deleteMany({ where: { id: row.id } });
    if (gone.count === 0) throw new BadRequestException('That sign-in code has already been used. Sign in again.');
    if (row.expiresAt.getTime() < Date.now()) throw new BadRequestException('That sign-in code has expired. Sign in again.');
    return { accessToken: row.token };
  }

  /**
   * THE ORGANISATIONS THIS PERSON BELONGS TO.
   *
   * Their own is always among them: the migration backfilled a membership for every
   * existing user from the org they were already in, so this is never empty for
   * somebody who can sign in. If it ever is, that is a broken account rather than a
   * person with no organisation, and returning an empty list quietly would hide it -
   * so the active org is added back in if it is missing.
   */
  async myOrganizations(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true, role: true },
    });
    if (!user) throw new NotFoundException('We could not find that sign-in, so sign in again and try once more.');

    /* Never one they are held out of for want of a seat (U.4 third review): they have not been told
       about it, so it is not theirs to see or switch to until the hold is cleared. */
    const memberships = await this.prisma.organizationMembership.findMany({
      where: { userId, heldForASeat: false },
      select: { organizationId: true, role: true, joinedHow: true, organization: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: 'asc' },
    });

    /*
     * WHY THEY ARE IN EACH ONE, WHERE THE SERVER KNOWS (U.3 review). The sidebar said "because your
     * email address was on its list of people" to everybody in one organisation they had not made,
     * including people who joined by domain or by link. Now: "list" when their own staff record there
     * is linked to them, "domain" or "link" as recorded when they joined, and null otherwise, when no
     * reason is given. Their own facts only.
     */
    const listedIn = new Set(
      (await this.prisma.person.findMany({ where: { linkedUserId: userId }, select: { organizationId: true } }).catch(() => []))
        .map((p) => p.organizationId),
    );
    const why = (organizationId: string, recorded?: string | null): 'list' | 'domain' | 'link' | null =>
      recorded === 'domain' || recorded === 'link' ? recorded : listedIn.has(organizationId) ? 'list' : null;

    const rows = memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      role: m.role,
      active: m.organizationId === user.organizationId,
      joinedHow: why(m.organizationId, m.joinedHow),
    }));

    // Self-healing rather than silently wrong: a user whose active org has no
    // membership row would otherwise see a switcher that does not list where they
    // currently are, which reads as data loss.
    if (!rows.some((r) => r.active)) {
      const own = await this.prisma.organization.findUnique({
        where: { id: user.organizationId },
        select: { id: true, name: true, slug: true },
      });
      if (own) rows.unshift({ ...own, role: user.role, active: true, joinedHow: why(own.id) });
    }
    return rows;
  }

  /**
   * SWITCH THE ACTIVE ORGANISATION.
   *
   * Every org-scoped query in the product reads `organizationId` off the token, so
   * this is a new token rather than a rewrite of those queries. Two things it must
   * not do: trust the id it was given, and carry the old role.
   *
   * The role comes from the MEMBERSHIP, not from the user row. Somebody can administer
   * their own company and be an ordinary member of a client's - keeping the old role
   * across the switch would hand them admin of an organisation that never gave it.
   */
  async switchOrganization(userId: string, organizationId: string, via: SignedInVia = 'password') {
    const membership = await this.prisma.organizationMembership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
      select: { role: true, heldForASeat: true, organization: { select: { id: true, name: true, slug: true } } },
    });
    /* Held for a seat (U.4 third review): refused exactly as if they were not a member, because they
       have not been told they are one. */
    if (!membership || membership.heldForASeat) {
      // Not "not found": from the caller's side this is being refused, and saying so
      // plainly is better than implying the organisation does not exist.
      throw new ForbiddenException('You are not a member of that organisation, so switch to one you belong to.');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { organizationId, role: membership.role },
      select: { id: true, email: true, organizationId: true, role: true, tokenEpoch: true },
    });

    /*
     * THE FULL SHAPE, NOT A HAND-BUILT SUBSET (U.8 re-review). This used to select only id, email,
     * name, role, organizationId, isPlatformAdmin - missing `organizationName`, which is the one
     * field the switcher itself reads. `organization` below carried the name, but the client's
     * setAuth call only ever reads `res.user`, so it went nowhere. One shape, from one builder,
     * used by every door - see `userShapeFor`.
     */
    return {
      /* Carried through: a Google-signed-in staff member switching organisation kept back-office access (B16, P2-024). */
      accessToken: this.generateToken(updated, via),
      user: await this.userShapeFor(userId),
      organization: membership.organization,
    };
  }

  /**
   * `via` says how the session was made. The back office reads it: a Google sign-in has already had
   * its second check and walks through the door; a password or link session is asked for a code.
   * See ops/the-back-office-has-a-door.ts.
   */
  private generateToken(user: ASessionHolder, via: SignedInVia = 'password') {
    return this.jwtService.sign(sessionClaims(user, via));
  }

  /** On in Groundwork, or through the organisation's own connected number. Off when unsure. */
  async whatsappIsOn(organizationId: string): Promise<boolean> {
    const [platform, own] = await Promise.all([
      this.whatsapp?.isEnabled?.().catch(() => false) ?? Promise.resolve(false),
      this.prisma.whatsAppConnection.findUnique({ where: { organizationId }, select: WHAT_SAYS_IT_WORKS }).catch(() => null),
    ]);
    return !!platform || itSendsFromTheirNumber(own);
  }

  /**
   * "WHERE DO YOU WORK?" (A3, #/welcome, U.3). What a signed-in person may join, and nothing else:
   *
   *   - Organisations that let anyone with this person's email domain join, when their address is
   *     confirmed and the domain is not a public mail provider. No head count is given.
   *   - Invitations still open for their exact address, in organisations they are not in yet, which
   *     they join as a guest in that one check-in.
   *
   * Never an organisation they are already in, and never anything about anybody else.
   */
  async whereCanIJoin(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, isEmailVerified: true } });
    if (!user) throw new NotFoundException('We could not find that sign-in, so sign in again and try once more.');
    const mine = await this.prisma.organizationMembership.findMany({ where: { userId }, select: { organizationId: true } });
    const inIt = new Set(mine.map((m) => m.organizationId));
    const domain = theDomainOf(user.email);
    const byDomain = user.isEmailVerified && domain && mayBeJoinedBy(domain)
      ? await this.prisma.organization.findMany({ where: { joinDomain: domain }, select: { id: true, name: true } })
      : [];
    const invitations = await this.prisma.groundParticipant.findMany({
      where: {
        email: { equals: user.email, mode: 'insensitive' }, userId: null, inviteToken: { not: null },
        OR: [{ inviteTokenExpiresAt: null }, { inviteTokenExpiresAt: { gt: new Date() } }],
      },
      select: { inviteToken: true, ground: { select: { label: true, organizationId: true, organization: { select: { name: true } } } } },
      take: 20,
    });
    /*
     * WHETHER THEY BELONG ANYWHERE YET (U.4 review). "Where do you work?" is for somebody with no
     * organisation of their own yet: the only ones they are in are ones just made for them, which they
     * own, with nobody else in them and no check-in. Somebody invited to an organisation already
     * belongs to it, and was being sent here after setting their password, offered a different
     * organisation by domain, instead of going where the invitation led. The page says whether to go.
     */
    const theirs = inIt.size
      ? await this.prisma.organization.findMany({
        where: { id: { in: [...inIt] } },
        select: { id: true, ownerUserId: true, _count: { select: { memberships: true, grounds: true } } },
      })
      : [];
    const nowhereYet = theirs.length === inIt.size
      && theirs.every((o: any) => o.ownerUserId === userId && (o._count?.memberships ?? 0) <= 1 && (o._count?.grounds ?? 0) === 0);
    return {
      nowhereYet,
      byDomain: byDomain.filter((o) => !inIt.has(o.id)).map((o) => ({ id: o.id, name: o.name, domain: domain! })),
      asAGuest: invitations
        .filter((i) => i.ground && !inIt.has(i.ground.organizationId))
        .map((i) => ({ organisationName: i.ground.organization?.name ?? '', checkInName: i.ground.label, invitePath: `/invite?token=${i.inviteToken}` })),
    };
  }

  /**
   * Where somebody whose sign-up is waiting may go, before any account exists (U.3 review): the
   * organisation whose invite link they came from, if it is still open, and any organisation that
   * lets their domain join (never a public mail domain). Only called once the link has proved the
   * address, so it says no more than "Where do you work?" says to a signed-in person.
   */
  private async whereAWaitingSignUpMayGo(email: string, next: string | null | undefined) {
    const code = theInviteLinkCodeIn(aPathInThisApp(next));
    const linked = code
      ? await this.prisma.organization.findUnique({ where: { inviteLinkCode: code }, select: { id: true, name: true } })
      : null;
    const domain = theDomainOf(email);
    const byDomain = domain && mayBeJoinedBy(domain)
      ? await this.prisma.organization.findMany({ where: { joinDomain: domain }, select: { id: true, name: true } })
      : [];
    const byLink = linked ? { ...linked, how: 'link' as const } : null;
    const offered = [
      ...(byLink ? [byLink] : []),
      ...byDomain.filter((o) => o.id !== byLink?.id).map((o) => ({ ...o, how: 'domain' as const })),
    ];
    return {
      domain,
      byLink,
      byDomain,
      offered,
      cameByLink: !!code,
      linkProblem: code && !linked ? 'That invite link is not open any more. Ask whoever sent it for the new one.' : null,
    };
  }

  /** "Join": by email domain, as "Takes part", through the seat check, then into it. */
  async joinByDomain(userId: string, organizationId: string, via: SignedInVia = 'password') {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, isEmailVerified: true } });
    if (!user) throw new NotFoundException('We could not find that sign-in, so sign in again and try once more.');
    const domain = theDomainOf(user.email);
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true, name: true, joinDomain: true } });
    const allowed = !!org && !!domain && user.isEmailVerified && mayBeJoinedBy(domain) && org.joinDomain === domain;
    /* Not "not found": from the person's side this is a refusal, said the same way whatever the reason. */
    if (!allowed) throw new ForbiddenException('You cannot join that organisation with your email address. Ask somebody there to invite you.');
    const already = await this.prisma.organizationMembership.findUnique({
      where: { userId_organizationId: { userId, organizationId } }, select: { id: true },
    });
    if (!already) {
      const room = await this.billing.canInviteMember(organizationId);
      if (!room.allowed) {
        throw new BadRequestException(`${org!.name} has no room for another person on its plan right now. Ask an admin there to make room, or to invite you when there is.`);
      }
      await this.prisma.organizationMembership.create({ data: { userId, organizationId, role: ROLE_FOR_SOMEBODY_EXPECTED as any, joinedHow: 'domain' } });
    }
    return this.switchOrganization(userId, organizationId, via);
  }

  /**
   * START MY OWN WORKSPACE.
   *
   * The door out of somebody else's organisation, for anybody who was joined to one because their
   * address was on its roster. See a-roster-row-is-not-a-life-sentence for why the joining rule
   * itself is not the thing being changed.
   *
   * Nobody is removed from anything and no stranger is put anywhere: this creates an organisation,
   * makes them its admin, gives them a membership of it, and switches them into it. The membership
   * they already had stays exactly as it was, so a real employee who presses this by accident is
   * one switch away from where they were.
   */
  async startMyOwnWorkspace(userId: string, what: WhatANewOrganisationIsGiven = {}) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true, organizationId: true },
    });
    if (!user) throw new NotFoundException('We could not find that sign-in, so sign in again and try once more.');

    /*
     * MORE THAN ONE OF YOUR OWN, AS THE PROTOTYPE HAS IT (Hafsah, 26 September). This used to refuse
     * a second organisation you administer ("a person with nine empty workspaces has a switcher worse
     * than the trap was"). She decided a person can create more than one, each with its own plan, so
     * there is no refusal here any more. Each new one starts on the free tier of its own.
     */

    /*
     * THE NAME THEY TYPED ON "Create an organisation", or their own name's workspace when this is
     * the one-press door from the organisation menu. Never the email domain.
     */
    const name = (what.name ?? '').trim() || whatTheirWorkspaceIsCalled(user.firstName, user.lastName);
    /* From the NAME, never the email domain - the same rule as `register`. */
    const slug = await this.generateUniqueSlug(name);
    /* The billing email is optional. Without one, bills go to the person who made it, as at every other door. */
    const billingEmail = (what.billingEmail ?? '').trim().toLowerCase() || user.email;

    /* What they said about their team's size, beside the line they were shown. Nothing grants a
       trial from it yet (U.19); it is kept so that billing can, rather than asked again. */
    const sizeSaid = what.teamSize ? { teamSizeSaid: what.teamSize.said, teamSizeLine: what.teamSize.line } : {};

    const org = await this.prisma.$transaction(async (tx) => {
      const created = await tx.organization.create({ data: { name: name, slug: slug, email: billingEmail, ...sizeSaid } });
      /*
       * AND SOMEBODY HOLDS IT.
       *
       * Missed on the first pass and caught by every-new-organisation-has-a-holder, which counts
       * the doors into `organization.create` and refuses a new one without this line. An
       * organisation with no `ownerUserId` is one nobody can be asked about - exactly the state
       * that guard exists to prevent, and the person who founded it is obviously the holder.
       */
      await theFirstAdminHoldsIt(tx, created.id, userId);
      await tx.organizationMembership.create({
        data: { userId, organizationId: created.id, role: 'ADMIN' as any },
      });
      /*
       * AND THE MEMBERSHIP OF WHERE THEY ARE NOW, which may never have been written.
       *
       * A user joined to a roster organisation has `user.organizationId` set and often no
       * membership row at all - `myOrganizations` papers over exactly that with its self-healing
       * branch. Without this, switching into the new workspace would leave them unable to switch
       * back, which is the same trap facing the other way.
       */
      await tx.organizationMembership.upsert({
        where: { userId_organizationId: { userId, organizationId: user.organizationId } },
        create: { userId, organizationId: user.organizationId, role: 'MEMBER' as any },
        update: {},
      });
      return created;
    });

    this.logger?.log?.(`${user.email} started their own workspace, and keeps the one they were listed in.`);
    if (what.teamSize) this.sizeSaid(org.id, what.teamSize);
    return this.switchOrganization(userId, org.id);
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'workspace';
    let slug = baseSlug;
    let counter = 2;
    while (await this.prisma.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter++}`;
    }
    return slug;
  }
}
