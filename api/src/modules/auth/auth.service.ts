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
  ) {}

  async register(dto: RegisterDto): Promise<{ message: string; email: string }> {
    if ((dto as any)._hp) {
      return { message: 'Registration successful. Please check your email to verify your account.', email: dto.email.toLowerCase() };
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existingUser) throw new ConflictException('Email already registered');

    const slug = await this.generateUniqueSlug(dto.organizationName);
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const result = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: { name: dto.organizationName, slug },
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
    const organizationName = dto.organizationName?.trim() || emailDomain.charAt(0).toUpperCase() + emailDomain.slice(1);

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
    const tokenRecord = await this.consumeToken(dto.token, TokenType.EMAIL_VERIFICATION, { allowExpiredMessage: 'This verification link has expired. Please request a new one.' });

    const { user } = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: tokenRecord.userId }, data: { isEmailVerified: true } });
      await tx.emailVerificationToken.update({ where: { id: tokenRecord.id }, data: { usedAt: new Date() } });
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
      return tokenRecord.user;
    });

    return this.buildAuthResponse(user as unknown as UserWithOrg);
  }

  async resendVerification(dto: ResendVerificationDto): Promise<{ message: string }> {
    const message = 'If an account with that email exists, a verification email has been sent.';
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user || user.isEmailVerified) return { message };

    const recentToken = await this.prisma.emailVerificationToken.findFirst({
      where: { userId: user.id, type: TokenType.EMAIL_VERIFICATION, usedAt: null, createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } },
    });
    if (recentToken) return { message };

    await this.prisma.emailVerificationToken.updateMany({
      where: { userId: user.id, type: TokenType.EMAIL_VERIFICATION, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = crypto.randomBytes(32).toString('hex');
    await this.prisma.emailVerificationToken.create({
      data: { userId: user.id, token, type: TokenType.EMAIL_VERIFICATION, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    });

    this.emailService.sendVerificationEmail(user.email, user.firstName, token);
    return { message };
  }

  async entrySave(email: string): Promise<{ message: string; email: string }> {
    const lower = email.toLowerCase();
    const message = 'Check your email for your sign-in link.';

    let user = await this.prisma.user.findUnique({ where: { email: lower } });

    if (!user) {
      const localPart = lower.split('@')[0].replace(/[._\-+]/g, ' ').trim();
      const firstName = (localPart.charAt(0).toUpperCase() + localPart.slice(1).split(' ')[0]).slice(0, 40) || 'User';
      const domainBase = lower.split('@')[1]?.split('.')[0] ?? 'workspace';
      const slug = await this.generateUniqueSlug(domainBase);

      const result = await this.prisma.$transaction(async (tx) => {
        const org = await tx.organization.create({ data: { name: `${firstName}'s workspace`, slug } });
        const u = await tx.user.create({
          data: { organizationId: org.id, email: lower, firstName, lastName: '', role: 'ADMIN', isEmailVerified: false },
        });
        const token = crypto.randomBytes(32).toString('hex');
        await tx.emailVerificationToken.create({
          data: { userId: u.id, token, type: TokenType.EMAIL_VERIFICATION, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
        });
        return { user: u, token };
      });

      await this.emailService.sendMagicLinkEmail(lower, firstName, result.token);
    } else {
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

    return { message, email: lower };
  }

  async teamInvite(inviterOrgName: string, inviteeEmail: string): Promise<{ message: string }> {
    const lower = inviteeEmail.toLowerCase();

    let user = await this.prisma.user.findUnique({ where: { email: lower } });

    if (!user) {
      const localPart = lower.split('@')[0].replace(/[._\-+]/g, ' ').trim();
      const firstName = (localPart.charAt(0).toUpperCase() + localPart.slice(1).split(' ')[0]).slice(0, 40) || 'there';
      const domainBase = lower.split('@')[1]?.split('.')[0] ?? 'workspace';
      const slug = await this.generateUniqueSlug(domainBase);

      const result = await this.prisma.$transaction(async (tx) => {
        const org = await tx.organization.create({ data: { name: `${firstName}'s workspace`, slug } });
        const u = await tx.user.create({
          data: { organizationId: org.id, email: lower, firstName, lastName: '', role: 'ADMIN', isEmailVerified: false },
        });
        const token = crypto.randomBytes(32).toString('hex');
        await tx.emailVerificationToken.create({
          data: { userId: u.id, token, type: TokenType.PASSWORD_SETUP, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        });
        return { firstName, token };
      });

      await this.emailService.sendUserInvite(lower, result.firstName, result.token, inviterOrgName);
    } else {
      // User exists — send them a magic sign-in link (EMAIL_VERIFICATION consumed by verifyEmail)
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

  async memberSignin(dto: MemberSigninDto): Promise<{ message: string; email: string }> {
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

    this.emailService.sendMagicLinkEmail(email, user.firstName, token).catch((err) =>
      this.logger.error(`Failed to send member sign-in email to ${email}: ${err.message}`),
    );
    return { message, email };
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

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
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

    this.emailService.sendPasswordResetEmail(user.email, user.firstName, token).catch((err) =>
      this.logger.error(`Failed to send password reset email to ${user.email}: ${err.message}`),
    );
    return { message };
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

  async findOrCreateGoogleUser(googleUser: { googleId: string; email: string; firstName: string; lastName: string }): Promise<{ token: string; isNewUser: boolean }> {
    const email = googleUser.email.toLowerCase();
    let isNewUser = false;

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
    return { token: this.generateToken(user), isNewUser };
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
