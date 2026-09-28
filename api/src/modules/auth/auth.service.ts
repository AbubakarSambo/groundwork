import { whatTheirWorkspaceIsCalled, whyNotAnotherWorkspace } from './a-roster-row-is-not-a-life-sentence';
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
import { GroundworkEvents, OrgSignedUpEvent } from '../../common/events';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
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

  /** The back office hears about every new organisation. Best-effort; a sign-up never fails on it. */
  private signedUp(org: { id: string; name: string }, adminEmail: string) {
    try {
      this.events.emit(GroundworkEvents.ORG_SIGNED_UP, { organizationId: org.id, organizationName: org.name, adminEmail } satisfies OrgSignedUpEvent);
    } catch (err: any) {
      this.logger.warn(`org.signedUp did not emit for ${org.id}: ${err?.message}`);
    }
  }

  async register(dto: RegisterDto): Promise<{ message: string; email: string }> {
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
      return { message: 'Registration successful. Please check your email to verify your account.', email: dto.email.toLowerCase() };
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existingUser) throw new ConflictException('Email already registered');

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
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const token = crypto.randomBytes(32).toString('hex');

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
        expiresAt: expiresAtFor('verify an address'),
      },
      update: {
        token,
        firstName: dto.firstName,
        lastName: dto.lastName,
        orgName: dto.organizationName?.trim() || null,
        passwordHash,
        expiresAt: expiresAtFor('verify an address'),
      },
    });

    await this.emailService.sendVerificationEmail(dto.email.toLowerCase(), dto.firstName, token);
    return { message: 'Registration successful. Please check your email to verify your account.', email: dto.email.toLowerCase() };
  }

  async registerMagicLink(dto: MagicLinkRegisterDto): Promise<{ message: string; email: string }> {
    if ((dto as any)._hp) {
      return { message: 'Account created. Please check your email to activate your account.', email: dto.email.toLowerCase() };
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existingUser) throw new ConflictException('Email already registered');

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
    return { message: 'Account created. Please check your email to activate your account.', email: dto.email.toLowerCase() };
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

    if (!user || user.deletedAt) refuse('no such account');
    if (!user.isActive) refuse('the account is deactivated');
    if (!user.isEmailVerified) refuse('the address is not verified');

    if (!user.passwordHash) {
      if (user.googleId) {
        const token = crypto.randomBytes(32).toString('hex');
        await this.prisma.emailVerificationToken.create({
          data: { userId: user.id, token: hashed(token), type: TokenType.PASSWORD_SETUP, expiresAt: expiresAtFor('set a password from an email') },
        });
        this.emailService.sendAddPasswordEmail(user.email, user.firstName, token).catch((err) =>
          this.logger.error(`Failed to send add-password email to ${user.email}: ${err.message}`),
        );
        refuse('they sign in with Google and have no password');
      }
      // Participant accounts are created without a password. Auto-send a setup
      // link so they can get back in without needing to contact anyone.
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

      // Someone may have signed up by another route in the meantime.
      const already = await this.prisma.user.findUnique({ where: { email: pending.email }, include: { organization: true } });
      if (already) {
        await this.prisma.pendingSignup.delete({ where: { id: pending.id } }).catch(() => undefined);
        return this.withPasswordSetup(await this.buildAuthResponse(already as unknown as UserWithOrg, 'link'), already.id);
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
              passwordHash: pending.passwordHash,
              /* Never an admin. Being listed is not authority over the company. */
              role: ROLE_FOR_SOMEBODY_EXPECTED as any,
              isEmailVerified: true,
            },
            include: { organization: true },
          });
          /* The roster row and the account meet, so the panel and every check-in
             read as this person from the first minute rather than the second
             time they sign in. */
          await tx.person.update({ where: { id: belongs.personId }, data: { linkedUserId: u.id } });
          await tx.groundParticipant.updateMany({
            where: { email: pending.email, userId: null },
            data: { userId: u.id },
          });
          await tx.pendingSignup.delete({ where: { id: pending.id } });
          return u;
        });

        this.logger.log(`${pending.email} joined the organisation that already listed them`);
        return this.withPasswordSetup(await this.buildAuthResponse(joined as unknown as UserWithOrg, 'link'), joined.id);
      }

      // The slug comes from the organisation NAME, never the email domain, so a
      // company's namespace cannot be claimed from an address. See GW-001.
      const orgName = pending.orgName?.trim() || `${pending.firstName}'s workspace`;
      const slug = await this.generateUniqueSlug(orgName);

      const created = await this.prisma.$transaction(async (tx) => {
        /* The contact email is the admin's until they say otherwise - see the note on register. */
        const org = await tx.organization.create({ data: { name: orgName, slug, email: pending.email } });
        this.signedUp(org, pending.email);
        const u = await tx.user.create({
          data: {
            organizationId: org.id,
            email: pending.email,
            firstName: pending.firstName,
            lastName: pending.lastName ?? '',
            /* Only the password signup path carries one. The others set a password later. */
            passwordHash: pending.passwordHash,
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
          where: { email: pending.email, userId: null },
          data: { userId: u.id },
        });
        await tx.pendingSignup.delete({ where: { id: pending.id } });
        return u;
      });

      return this.withPasswordSetup(await this.buildAuthResponse(created as unknown as UserWithOrg, 'link'), created.id);
    }

    const tokenRecord = await this.consumeToken(dto.token, TokenType.EMAIL_VERIFICATION, { allowExpiredMessage: 'This verification link has expired. Please request a new one.' });

    const { user } = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: tokenRecord.userId }, data: { isEmailVerified: true } });
      await tx.emailVerificationToken.update({ where: { id: tokenRecord.id }, data: { usedAt: new Date() } });
      // Link any groundParticipant records whose email matches but have no userId yet.
      // This connects participants who checked in before creating their account.
      await tx.groundParticipant.updateMany({
        where: { email: tokenRecord.user.email.toLowerCase(), userId: null },
        data: { userId: tokenRecord.userId },
      });
      return { user: tokenRecord.user };
    });

    return this.withPasswordSetup(await this.buildAuthResponse(user as unknown as UserWithOrg, 'link'), user.id);
  }

  async setPassword(dto: SetPasswordDto): Promise<AuthResponseDto> {
    const tokenRecord = await this.consumeToken(dto.token, TokenType.PASSWORD_SETUP, { allowExpiredMessage: 'This invitation link has expired. Please ask your admin to resend the invite.' });
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: tokenRecord.userId }, data: { passwordHash, isEmailVerified: true } });
      await tx.emailVerificationToken.update({ where: { id: tokenRecord.id }, data: { usedAt: new Date() } });
      // Link any groundParticipant records whose email matches - same as verifyEmail.
      // Covers participants who were invited before creating their account.
      await tx.groundParticipant.updateMany({
        where: { email: tokenRecord.user.email.toLowerCase(), userId: null },
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
  ): Promise<{ message: string; email: string; draftToken?: string }> {
    const lower = email.toLowerCase();
    const message = 'Check your email for your sign-in link.';

    if (draft && JSON.stringify(draft).length > 500_000) {
      throw new BadRequestException('Draft too large');
    }

    let user = await this.prisma.user.findUnique({ where: { email: lower } });
    let draftToken: string | undefined;

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
      const typedFirstName = typeof draft?.payload?.firstName === 'string' ? draft.payload.firstName.trim().slice(0, 40) : '';
      const firstName = typedFirstName || (localPart.charAt(0).toUpperCase() + localPart.slice(1).split(' ')[0]).slice(0, 40) || 'User';

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

      await this.prisma.pendingSignup.upsert({
        where: { email: lower },
        create: {
          email: lower,
          token,
          firstName,
          orgName: typedOrgName || null,
          payload: (draft?.payload ?? {}) as any,
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
          ...(draft
            ? {
                firstName,
                orgName: typedOrgName || null,
                payload: (draft.payload ?? {}) as any,
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
        return { message, email: lower };
      }
      await this.prisma.emailVerificationToken.updateMany({
        where: { userId: user.id, type: TokenType.EMAIL_VERIFICATION, usedAt: null },
        data: { usedAt: new Date() },
      });
      const token = crypto.randomBytes(32).toString('hex');
      await this.prisma.emailVerificationToken.create({
        data: { userId: user.id, token: hashed(token), type: TokenType.EMAIL_VERIFICATION, expiresAt: expiresAtFor('verify an address') },
      });
      await this.emailService.sendMagicLinkEmail(lower, user.firstName, token);
    }

    /* The key is absent, not undefined, when there is no token: a body that names it says the address had no account. */
    return { message, email: lower, ...(draftToken ? { draftToken } : {}) };
  }

  async teamInvite(inviterOrgName: string, inviteeEmail: string, inviterOrganizationId?: string): Promise<{ message: string }> {
    const lower = inviteeEmail.toLowerCase();

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
      const firstName = (localPart.charAt(0).toUpperCase() + localPart.slice(1).split(' ')[0]).slice(0, 40) || 'there';

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
          data: { organizationId, email: lower, firstName, lastName: '', role: 'MEMBER', isEmailVerified: false },
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
      if (inviterOrganizationId && user.organizationId !== inviterOrganizationId) {
        const already = await this.prisma.organizationMembership.findUnique({
          where: { userId_organizationId: { userId: user.id, organizationId: inviterOrganizationId } },
          select: { id: true },
        });
        if (!already) {
          /* A person joining costs a seat here exactly as a new account does. */
          const canInvite = await this.billing.canInviteMember(inviterOrganizationId);
          if (!canInvite.allowed) throw new BadRequestException(canInvite.reason);
          await this.prisma.organizationMembership.create({
            data: { userId: user.id, organizationId: inviterOrganizationId, role: 'MEMBER' },
          });
          this.logger?.log?.(`Existing account ${lower} added to org ${inviterOrganizationId} as a member.`);
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
      await this.emailService.sendMagicLinkEmail(lower, user.firstName, token);
    }

    return { message: 'Invite sent.' };
  }

  async memberSignin(dto: MemberSigninDto): Promise<{ message: string; email: string; devUrl?: string }> {
    const message = 'If an account with that email exists, a sign-in link has been sent.';
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

    const result = await this.emailService.sendSignInLinkEmail(email, user.firstName, token).catch((err) => {
      this.logger.error(`Failed to send member sign-in email to ${email}: ${err.message}`);
      return { devUrl: undefined };
    });
    return { message, email, ...(result.devUrl ? { devUrl: result.devUrl } : {}) };
  }

  async requestPasswordSetupForUser(userId: string): Promise<{ token: string }> {
    await this.prisma.emailVerificationToken.updateMany({
      where: { userId, type: TokenType.PASSWORD_SETUP, usedAt: null },
      data: { usedAt: new Date() },
    });
    const token = crypto.randomBytes(32).toString('hex');
    await this.prisma.emailVerificationToken.create({
      /* A fifth window (24h) sat here, distinct from the other three PASSWORD_SETUP ones for no
         stated reason. It is an emailed setup link like the others, so it uses their window. */
      data: { userId, token: hashed(token), type: TokenType.PASSWORD_SETUP, expiresAt: expiresAtFor('set a password from an email') },
    });
    return { token };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string; devUrl?: string }> {
    const message = 'If an account with that email exists, a password reset link has been sent.';
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user) return { message };

    await this.prisma.emailVerificationToken.updateMany({
      where: { userId: user.id, type: TokenType.PASSWORD_RESET, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = crypto.randomBytes(32).toString('hex');
    await this.prisma.emailVerificationToken.create({
      data: { userId: user.id, token: hashed(token), type: TokenType.PASSWORD_RESET, expiresAt: expiresAtFor('reset a password') },
    });

    const result = await this.emailService.sendPasswordResetEmail(user.email, user.firstName, token).catch((err) => {
      this.logger.error(`Failed to send password reset email to ${user.email}: ${err.message}`);
      return { devUrl: undefined };
    });
    return { message, ...(result.devUrl ? { devUrl: result.devUrl } : {}) };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<AuthResponseDto> {
    const tokenRecord = await this.consumeToken(dto.token, TokenType.PASSWORD_RESET, { allowExpiredMessage: 'This reset link has expired. Please request a new one.' });
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
  ): Promise<{ token: string; isNewUser: boolean; needsOrgName: boolean }> {
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
          if (!user.isActive) throw new UnauthorizedException('Account is deactivated');
          return { token: this.generateToken(user, 'google'), isNewUser, needsOrgName: false };
        }

        // Nobody is expecting them. Make an organisation so they have somewhere
        // to be, and ask what it should be called.
        needsOrgName = true;
        const orgName = `${googleUser.firstName}'s Workspace`;
        const slug = await this.generateUniqueSlug(orgName);

        user = await this.prisma.$transaction(async (tx) => {
          /* The contact email is the admin's until they say otherwise - see the note on register. */
          const organization = await tx.organization.create({ data: { name: orgName, slug, email } });
          this.signedUp(organization, email);
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

    if (!user.isActive) throw new UnauthorizedException('Account is deactivated');
    return { token: this.generateToken(user, 'google'), isNewUser, needsOrgName };
  }

  /**
   * VALID, AND NOTHING ELSE. This returned the address and first name behind an unused set-password
   * link, so a forwarded or logged link disclosed whose it was before anybody set anything (A10).
   */
  async validateToken(token: string, type: string): Promise<{ valid: boolean }> {
    const tokenType =
      type === 'PASSWORD_SETUP' ? TokenType.PASSWORD_SETUP : type === 'PASSWORD_RESET' ? TokenType.PASSWORD_RESET : TokenType.EMAIL_VERIFICATION;

    const tokenRecord = await this.prisma.emailVerificationToken.findUnique({ where: { token: hashed(token) }, select: { usedAt: true, expiresAt: true, type: true } });
    if (!tokenRecord || tokenRecord.usedAt || tokenRecord.expiresAt < new Date() || tokenRecord.type !== tokenType) {
      return { valid: false };
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
    if (!user) throw new BadRequestException('User not found');
    /* One builder. A field added to it cannot fail to reach this route now. */
    const belongsElsewhere = await this.belongsElsewhere(user.id, user.organizationId);
    return { ...this.theUserShape(user as unknown as UserWithOrg, belongsElsewhere), orgCode: user.organization.slug, emailNotifications: user.emailNotifications };
  }

  // --- helpers ---

  /**
   * Attach a PASSWORD_SETUP token when, and only when, the account has no password.
   *
   * Kept separate from `buildAuthResponse` so that helper stays synchronous for its six call sites.
   * Only the verification path needs it: that is where the promise "you will be asked to set a
   * password" is made, and where it was being broken.
   */
  private async withPasswordSetup(res: AuthResponseDto, userId: string): Promise<AuthResponseDto> {
    if (!res.needsPassword) return res;
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
        mustSetUpOrganisation:
          user.role === 'ADMIN' && !user.organization.email && !belongsElsewhere,
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
      'This link did not work. Password links are single use and they expire - open the most recent one from your inbox, or ask for a new one from the sign-in page.';
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
    if (dto.phoneNumber !== undefined) userUpdate.phoneNumber = dto.phoneNumber ? WhatsAppService.normalize(dto.phoneNumber) : null;

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const orgUpdate: Record<string, unknown> = {};
    if (dto.orgName !== undefined) orgUpdate.name = dto.orgName.trim();
    if (dto.orgEmail !== undefined) orgUpdate.email = dto.orgEmail.trim();
    if (dto.orgSlug !== undefined) {
      const slug = dto.orgSlug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const existing = await this.prisma.organization.findUnique({ where: { slug } });
      if (existing && existing.id !== user.organizationId) throw new ConflictException('Org code already taken');
      orgUpdate.slug = slug;
    }
    if (dto.companyStage !== undefined) orgUpdate.companyStage = dto.companyStage;

    await this.prisma.$transaction([
      ...(Object.keys(userUpdate).length ? [this.prisma.user.update({ where: { id: userId }, data: userUpdate })] : []),
      ...(Object.keys(orgUpdate).length ? [this.prisma.organization.update({ where: { id: user.organizationId }, data: orgUpdate })] : []),
    ]);

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
    if (!user) throw new NotFoundException('User not found');

    const memberships = await this.prisma.organizationMembership.findMany({
      where: { userId },
      select: { organizationId: true, role: true, organization: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const rows = memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      role: m.role,
      active: m.organizationId === user.organizationId,
    }));

    // Self-healing rather than silently wrong: a user whose active org has no
    // membership row would otherwise see a switcher that does not list where they
    // currently are, which reads as data loss.
    if (!rows.some((r) => r.active)) {
      const own = await this.prisma.organization.findUnique({
        where: { id: user.organizationId },
        select: { id: true, name: true, slug: true },
      });
      if (own) rows.unshift({ ...own, role: user.role, active: true });
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
      select: { role: true, organization: { select: { id: true, name: true, slug: true } } },
    });
    if (!membership) {
      // Not "not found": from the caller's side this is being refused, and saying so
      // plainly is better than implying the organisation does not exist.
      throw new ForbiddenException('You are not a member of that organisation');
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { organizationId, role: membership.role },
      select: { id: true, email: true, firstName: true, lastName: true, organizationId: true, role: true, isPlatformAdmin: true },
    });

    return {
      /* Carried through: a Google-signed-in staff member switching organisation kept back-office access (B16, P2-024). */
      accessToken: this.generateToken(user, via),
      user,
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
  async startMyOwnWorkspace(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true, organizationId: true },
    });
    if (!user) throw new NotFoundException('User not found');

    /* Theirs is one they are the ADMIN of. A membership somebody else gave them is not theirs. */
    const owned = await this.prisma.organizationMembership.findFirst({
      where: { userId, role: 'ADMIN' as any },
      select: { organizationId: true },
    });
    const refusal = whyNotAnotherWorkspace({ alreadyOwnsOne: !!owned });
    if (refusal) throw new BadRequestException(refusal);

    const name = whatTheirWorkspaceIsCalled(user.firstName, user.lastName);
    /* From the NAME, never the email domain - the same rule as `register`. */
    const slug = await this.generateUniqueSlug(name);

    const org = await this.prisma.$transaction(async (tx) => {
      const created = await tx.organization.create({ data: { name: name, slug: slug, email: user.email } });
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
