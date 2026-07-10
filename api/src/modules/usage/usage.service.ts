import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsageEventType } from '@prisma/client';

/**
 * Append-only usage event log. Every call creates a new row - nothing is ever
 * updated or deleted. This is the authoritative ops feed and billing audit trail.
 *
 * Emit as a best-effort side-effect from service methods; a logging failure
 * must never block the primary operation.
 */
@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(private prisma: PrismaService) {}

  async emit(
    type: UsageEventType,
    ids: {
      organizationId?: string;
      groundId?: string;
      participantId?: string;
      userId?: string;
    },
    meta?: Record<string, unknown> | null,
  ): Promise<void> {
    try {
      await this.prisma.usageEvent.create({
        data: {
          type,
          organizationId: ids.organizationId ?? null,
          groundId: ids.groundId ?? null,
          participantId: ids.participantId ?? null,
          userId: ids.userId ?? null,
          meta: (meta as any) ?? undefined,
        },
      });
    } catch (err: any) {
      this.logger.error(`UsageEvent emit failed (${type}): ${err.message}`);
    }
  }
}
