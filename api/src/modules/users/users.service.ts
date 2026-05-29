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
        where: { organizationId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, isEmailVerified: true, createdAt: true },
      }),
      this.prisma.user.count({ where: { organizationId } }),
    ]);

    return { data: users, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string, organizationId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId },
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

  async remove(id: string, organizationId: string, actingUserId: string) {
    if (id === actingUserId) throw new BadRequestException('You cannot deactivate yourself');
    const user = await this.prisma.user.findFirst({ where: { id, organizationId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({ where: { id }, data: { isActive: false } });
    return { message: 'User deactivated' };
  }
}
