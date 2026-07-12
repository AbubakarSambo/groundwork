import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

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
      this.logger.warn(`Platform admin bootstrap: no user found for ${bootstrapEmail} - skipping`);
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
          _count: { select: { grounds: true, users: true } },
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
          _count: { select: { groundsInitiated: true, codeRedemptions: true } },
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
    const user = await this.prisma.user.findUnique({ where: { email: targetEmail } });
    if (!user) throw new NotFoundException(`No user found with email ${targetEmail}`);

    return this.prisma.user.update({
      where: { id: user.id },
      data: { isPlatformAdmin: true },
      select: { id: true, email: true, firstName: true, lastName: true, isPlatformAdmin: true },
    });
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
      create: {
        userId,
        signals: [],
        // @ts-ignore - we extend the JSON shape here
        adminOtp: otpPayload,
      } as any,
      update: {
        // @ts-ignore
        adminOtp: otpPayload,
      } as any,
    });

    const isDev = this.config.get<string>('NODE_ENV') !== 'production';

    if (isDev) {
      this.logger.debug(`[DEV] Admin OTP for ${user.email}: ${plainOtp}`);
      return { otp: plainOtp, sent: false };
    }

    try {
      await (this.email as any).sendEmail({
        to: user.email,
        subject: 'Your Groundwork admin OTP',
        html: `<p>Your one-time admin code is: <strong>${plainOtp}</strong>. It expires in 10 minutes.</p>`,
      });
    } catch (err) {
      this.logger.error(`Failed to send OTP email to ${user.email}`, err);
    }

    return { sent: true };
  }

  async verifyOtpForAdmin(userId: string, plainOtp: string): Promise<boolean> {
    const profile = await this.prisma.adminProfile.findUnique({ where: { userId } });
    if (!profile) throw new BadRequestException('No OTP has been generated for this user');

    const stored = (profile as any).adminOtp as {
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
      data: {
        // @ts-ignore
        adminOtp: { ...stored, used: true },
      } as any,
    });

    return true;
  }
}
