import { Controller, Get, Patch, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { RETENTION_CEILING_DAYS, RETENTION_DEFAULT_DAYS, RETENTION_FLOOR_DAYS } from './when-somebody-leaves';

/**
 * HOW LONG A DEPARTED PERSON'S WORDS ARE KEPT, SET BY THE ORGANISATION THAT KEEPS THEM.
 *
 * `RetentionPolicy` was read on every departure and written by nothing but SQL, so every organisation
 * ran on the default forever and nobody could have answered the question a security review asks
 * first (fix plan B12). The floor and ceiling are the rule in when-somebody-leaves.ts; this only
 * refuses what the clamp would silently move, so what an admin sets is what the record does.
 */
@ApiTags('Retention')
@Controller('org/retention')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class RetentionController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: "Days a departed person's raw turns are kept before they are deleted" })
  async get(@CurrentUser('organizationId') organizationId: string) {
    const p = await this.prisma.retentionPolicy.findUnique({ where: { organizationId } });
    return {
      turnRetentionDays: p?.turnRetentionDays ?? RETENTION_DEFAULT_DAYS,
      set: !!p,
      floor: RETENTION_FLOOR_DAYS,
      ceiling: RETENTION_CEILING_DAYS,
      default: RETENTION_DEFAULT_DAYS,
    };
  }

  @Patch()
  @ApiOperation({ summary: `Set it. Whole days, ${RETENTION_FLOOR_DAYS} to ${RETENTION_CEILING_DAYS}.` })
  async set(@CurrentUser('organizationId') organizationId: string, @Body() body: { turnRetentionDays: number }) {
    const days = Number(body?.turnRetentionDays);
    if (!Number.isInteger(days) || days < RETENTION_FLOOR_DAYS || days > RETENTION_CEILING_DAYS) {
      throw new BadRequestException(`Retention is a whole number of days from ${RETENTION_FLOOR_DAYS} to ${RETENTION_CEILING_DAYS}.`);
    }
    await this.prisma.retentionPolicy.upsert({
      where: { organizationId },
      create: { organizationId, turnRetentionDays: days },
      update: { turnRetentionDays: days },
    });
    return this.get(organizationId);
  }
}
