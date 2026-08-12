import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
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

type UserWithOrg = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId: string;
  isPlatformAdmin: boolean;
  organization: { name: string };
};

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
  ) {}

  async register(dto: RegisterDto): Promise<{ message: string; email: string }> {
    if ((dto as any)._hp) {
      return { message: 'Registration successful. Please check your email to verify your account.', email: dto.email.toLowerCase() };
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existingUser) throw new ConflictException('Email already registered');

    const emailDomain = dto.email.split('@')[1]?.split('.')[0] ?? 'workspace';
    const orgName = dto.organizationName?.trim() || emailDomain.charAt(0).toUpperCase() + emailDomain.slice(1);
    const slug = await this.generateUniqueSlug(orgName);
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const result = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: { name: orgName, slug },
      });

      const user = await tx.user.create({
        data: {
          organizationId: organization.id,
          email: dto.email.toLowerCase(),
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: 'ADMIN', // the person who opens the workspace is its admin
          isEmailVerified: false,
        },
      });

      const token = crypto.randomBytes(32).toString('hex');
      await tx.emailVerificationToken.create({
        data: {
          userId: user.id,
          token,
          type: TokenType.EMAIL_VERIFICATION,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      return { user, token };
    });

    await this.emailService.sendVerificationEmail(dto.email.toLowerCase(), dto.firstName, result.token);
    return { message: 'Registration successful. Please check your email to verify your account.', email: dto.email.toLowerCase() };
  }

  async registerMagicLink(dto: MagicLinkRegisterDto): Promise<{ message: string; email: string }> {
    if ((dto as any)._hp) {
      return { message: 'Account created. Please check your email to activate your account.', email: dto.email.toLowerCase() };
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existingUser) throw new ConflictException('Email already registered');

    const emailLocal = dto.email.toLowerCase().split('@')[0];
    const emailDomain = dto.email.toLowerCase().split('@')[1]?.split('.')[0] ?? 'org';
    const firstName = dto.firstName?.trim() || emailLocal.charAt(0).toUpperCase() + emailLocal.slice(1);
    const lastName = dto.lastName?.trim() || '';
    /**
     * Same land-grab as in entrySave, in the other signup path: when no org name
     * was given, this named the organisation after the EMAIL DOMAIN, so
     * `sahar@meridianhealth.test` created an org literally called "Meridianhealth"
     * and took that slug - before the address was verified. Falling back to the
     * person's own name keeps an unverified stranger from claiming a company's
     * identity. See GW-001.
     */
    const organizationName = dto.organizationName?.trim() || `${firstName}'s workspace`;
    void emailDomain;

    const slug = await this.generateUniqueSlug(organizationName);

    const result = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({ data: { name: organizationName, slug } });
      const user = await tx.user.create({
        data: {
          organizationId: organization.id,
          email: dto.email.toLowerCase(),
          passwordHash: null,
          firstName,
          lastName,
          role: 'ADMIN',
          isEmailVerified: false,
        },
      });

      const token = crypto.randomBytes(32).toString('hex');
      await tx.emailVerificationToken.create({
        data: { userId: user.id, token, type: TokenType.EMAIL_VERIFICATION, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      });

      return { user, token };
    });

    await this.emailService.sendMagicLinkEmail(dto.email.toLowerCase(), firstName, result.token);
    return { message: 'Account created. Please check your email to activate your account.', email: dto.email.toLowerCase() };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { organization: true },
    });

    if (!user || user.deletedAt) throw new UnauthorizedException('Invalid email or password');
    if (!user.isActive) throw new UnauthorizedException('Account is deactivated');
    if (!user.isEmailVerified) throw new UnauthorizedException('Please verify your email before logging in');

    if (!user.passwordHash) {
      if (user.googleId) {
        const token = crypto.randomBytes(32).toString('hex');
        await this.prisma.emailVerificationToken.create({
          data: { userId: user.id, token, type: TokenType.PASSWORD_SETUP, expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000) },
        });
        this.emailService.sendAddPasswordEmail(user.email, user.firstName, token).catch((err) =>
          this.logger.error(`Failed to send add-password email to ${user.email}: ${err.message}`),
        );
        throw new UnauthorizedException("Your account uses Google Sign-In. We've emailed you a link to set a password.");
      }
      // Participant accounts are created without a password. Auto-send a setup
      // link so they can get back in without needing to contact anyone.
      const token = crypto.randomBytes(32).toString('hex');
      await this.prisma.emailVerificationToken.create({
        data: { userId: user.id, token, type: TokenType.PASSWORD_SETUP, expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000) },
      });
      this.emailService.sendAddPasswordEmail(user.email, user.firstName, token).catch((err) =>
        this.logger.error(`Failed to send password setup email to ${user.email}: ${err.message}`),
      );
      throw new UnauthorizedException("We've emailed you a link to set your password. Check your inbox.");
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid email or password');

    return this.buildAuthResponse(user as unknown as UserWithOrg);
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
        await this.prisma.pendingSignup.delete({ where: { id: pending.id } }).catch(() => undefined);
        throw new BadRequestException('This verification link has expired. Please request a new one.');
      }

      // Someone may have signed up by another route in the meantime.
      const already = await this.prisma.user.findUnique({ where: { email: pending.email }, include: { organization: true } });
      if (already) {
        await this.prisma.pendingSignup.delete({ where: { id: pending.id } }).catch(() => undefined);
        return this.buildAuthResponse(already as unknown as UserWithOrg);
      }

      // The slug comes from the organisation NAME, never the email domain, so a
      // company's namespace cannot be claimed from an address. See GW-001.
      const orgName = pending.orgName?.trim() || `${pending.firstName}'s workspace`;
      const slug = await this.generateUniqueSlug(orgName);

      const created = await this.prisma.$transaction(async (tx) => {
        const org = await tx.organization.create({ data: { name: orgName, slug } });
        const u = await tx.user.create({
          data: {
            organizationId: org.id,
            email: pending.email,
            firstName: pending.firstName,
            lastName: '',
            role: 'ADMIN',
            // Verified by construction: this only runs because the link opened.
            isEmailVerified: true,
          },
          include: { organization: true },
        });
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

      return this.buildAuthResponse(created as unknown as UserWithOrg);
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

    return this.buildAuthResponse(user as unknown as UserWithOrg);
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

    return this.buildAuthResponse(user as unknown as UserWithOrg);
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
      const localPart = lower.split('@')[0].replace(/[._\-+]/g, ' ').trim();
      const firstName = (localPart.charAt(0).toUpperCase() + localPart.slice(1).split(' ')[0]).slice(0, 40) || 'User';

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
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
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
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
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
      // Existing user saving a (new) anonymous session: last save wins. The
      // token rotates so only the most recent entry page can update the draft,
      // and a previously consumed draft becomes commit-able again.
      if (draft) {
        draftToken = crypto.randomBytes(32).toString('hex');
        await this.prisma.entryDraft.upsert({
          where: { userId: user.id },
          create: { userId: user.id, draftToken, payload: (draft.payload ?? {}) as any, history: (draft.history ?? []) as any },
          update: { draftToken, payload: (draft.payload ?? {}) as any, history: (draft.history ?? []) as any, consumedAt: null, groundId: null },
        });
      }
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
        return { message, email: lower, draftToken };
      }
      await this.prisma.emailVerificationToken.updateMany({
        where: { userId: user.id, type: TokenType.EMAIL_VERIFICATION, usedAt: null },
        data: { usedAt: new Date() },
      });
      const token = crypto.randomBytes(32).toString('hex');
      await this.prisma.emailVerificationToken.create({
        data: { userId: user.id, token, type: TokenType.EMAIL_VERIFICATION, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      });
      await this.emailService.sendMagicLinkEmail(lower, user.firstName, token);
    }

    return { message, email: lower, draftToken };
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
          const org = await tx.organization.create({ data: { name: `${firstName}'s workspace`, slug } });
          organizationId = org.id;
        }
        const u = await tx.user.create({
          data: { organizationId, email: lower, firstName, lastName: '', role: 'MEMBER', isEmailVerified: false },
        });
        const token = crypto.randomBytes(32).toString('hex');
        await tx.emailVerificationToken.create({
          data: { userId: u.id, token, type: TokenType.PASSWORD_SETUP, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        });
        return { firstName, token };
      });

      await this.emailService.sendUserInvite(lower, result.firstName, result.token, inviterOrgName);
    } else {
      // User exists - send them a magic sign-in link.
      await this.prisma.emailVerificationToken.updateMany({
        where: { userId: user.id, type: TokenType.EMAIL_VERIFICATION, usedAt: null },
        data: { usedAt: new Date() },
      });
      const token = crypto.randomBytes(32).toString('hex');
      await this.prisma.emailVerificationToken.create({
        data: { userId: user.id, token, type: TokenType.EMAIL_VERIFICATION, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
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
      data: { userId: user.id, token, type: TokenType.EMAIL_VERIFICATION, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
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
      data: { userId, token, type: TokenType.PASSWORD_SETUP, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
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
      data: { userId: user.id, token, type: TokenType.PASSWORD_RESET, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
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
      await tx.user.update({ where: { id: tokenRecord.userId }, data: { passwordHash } });
      await tx.emailVerificationToken.update({ where: { id: tokenRecord.id }, data: { usedAt: new Date() } });
      return tokenRecord.user;
    });

    return this.buildAuthResponse(user as unknown as UserWithOrg);
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
          return { token: this.generateToken(user), isNewUser, needsOrgName: false };
        }

        // Nobody is expecting them. Make an organisation so they have somewhere
        // to be, and ask what it should be called.
        needsOrgName = true;
        const orgName = `${googleUser.firstName}'s Workspace`;
        const slug = await this.generateUniqueSlug(orgName);

        user = await this.prisma.$transaction(async (tx) => {
          const organization = await tx.organization.create({ data: { name: orgName, slug } });
          return tx.user.create({
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
        });
      }
    }

    if (!user.isActive) throw new UnauthorizedException('Account is deactivated');
    return { token: this.generateToken(user), isNewUser, needsOrgName };
  }

  async validateToken(token: string, type: string): Promise<{ valid: boolean; email?: string; firstName?: string }> {
    const tokenType =
      type === 'PASSWORD_SETUP' ? TokenType.PASSWORD_SETUP : type === 'PASSWORD_RESET' ? TokenType.PASSWORD_RESET : TokenType.EMAIL_VERIFICATION;

    const tokenRecord = await this.prisma.emailVerificationToken.findUnique({ where: { token }, include: { user: true } });
    if (!tokenRecord || tokenRecord.usedAt || tokenRecord.expiresAt < new Date() || tokenRecord.type !== tokenType) {
      return { valid: false };
    }
    return { valid: true, email: tokenRecord.user.email, firstName: tokenRecord.user.firstName };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { organization: true } });
    if (!user) throw new BadRequestException('User not found');

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      organizationId: user.organizationId,
      organizationName: user.organization.name,
      orgCode: user.organization.slug,
      isPlatformAdmin: user.isPlatformAdmin,
      emailNotifications: user.emailNotifications,
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        slug: user.organization.slug,
        careFeeStatus: user.organization.careFeeStatus,
      },
    };
  }

  // --- helpers ---

  private buildAuthResponse(user: UserWithOrg): AuthResponseDto {
    return {
      accessToken: this.generateToken(user),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId,
        organizationName: user.organization.name,
        isPlatformAdmin: user.isPlatformAdmin,
      },
    };
  }

  private async consumeToken(token: string, expectedType: TokenType, opts: { allowExpiredMessage: string }) {
    const tokenRecord = await this.prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: { include: { organization: true } } },
    });
    if (!tokenRecord) throw new BadRequestException('Invalid token');
    if (tokenRecord.usedAt) throw new BadRequestException('This token has already been used');
    if (tokenRecord.expiresAt < new Date()) throw new BadRequestException(opts.allowExpiredMessage);
    if (tokenRecord.type !== expectedType) throw new BadRequestException('Invalid token type');
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

  // In-memory store for short-lived OAuth exchange codes (TTL 60s, single-use).
  // Acceptable for a single-process deployment; replace with Redis for multi-instance.
  private readonly oauthCodes = new Map<string, { token: string; expiresAt: number }>();

  async createOAuthExchangeCode(token: string): Promise<string> {
    const code = crypto.randomBytes(24).toString('hex');
    this.oauthCodes.set(code, { token, expiresAt: Date.now() + 60_000 });
    // Prune expired codes opportunistically.
    for (const [k, v] of this.oauthCodes) {
      if (v.expiresAt < Date.now()) this.oauthCodes.delete(k);
    }
    return code;
  }

  async redeemOAuthExchangeCode(code: string): Promise<{ accessToken: string }> {
    const entry = this.oauthCodes.get(code);
    if (!entry || entry.expiresAt < Date.now()) throw new BadRequestException('Invalid or expired exchange code');
    this.oauthCodes.delete(code);
    return { accessToken: entry.token };
  }

  private generateToken(user: { id: string; email: string; organizationId: string; role: string }) {
    return this.jwtService.sign({ sub: user.id, email: user.email, organizationId: user.organizationId, role: user.role });
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
