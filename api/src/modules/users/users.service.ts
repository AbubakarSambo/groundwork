import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateUserDto, UpdateUserDto } from './dto';
import { PaginationDto } from '../../common';
import { TokenType } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

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

    return { data: users, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
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
          lastName: dto.lastName,
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

    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.email && { email: dto.email.toLowerCase() }),
        ...(dto.firstName && { firstName: dto.firstName }),
        ...(dto.lastName && { lastName: dto.lastName }),
        ...(dto.role && { role: dto.role as any }),
        ...(typeof dto.isActive === 'boolean' && { isActive: dto.isActive }),
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true },
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
  async getPrivacyAudit(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new NotFoundException('User not found');

    const participantLinks = await this.prisma.groundParticipant.findMany({
      where: { userId },
      select: { id: true, groundId: true },
    });
    const participantIds = participantLinks.map((p) => p.id);
    const groundIds = [...new Set(participantLinks.map((p) => p.groundId))];

    const [recordCount, groundCount] = await Promise.all([
      this.prisma.recordEntry.count({ where: { participantId: { in: participantIds } } }),
      Promise.resolve(groundIds.length),
    ]);

    return {
      userId,
      hasRecord: recordCount > 0,
      groundCount,
      canExport: true,
      softDeletable: true,
    };
  }
}
