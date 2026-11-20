import { Injectable, Logger, Optional } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { onceAcrossCopies, theDay } from '../prisma/once-across-copies';
import { MemoryWriter } from './the-memory-writer';

/**
 * THE WEEKLY REBUILD (memory system, "rebuild, don't drift"). Every organisation's files are built again from the assessments, not from
 * their own earlier versions, and a version is written only where the rebuilt file differs. A difference between the file kept up to date
 * after each assessment and the rebuilt one is a bug to fix, and shows as a new version with the reason "The organisation was read again."
 */
@Injectable()
export class MemoryCron {
  private readonly logger = new Logger(MemoryCron.name);
  constructor(private writer: MemoryWriter, @Optional() private readonly prisma?: PrismaService) {}

  @Cron(CronExpression.EVERY_WEEK, { timeZone: 'UTC' })
  async rebuild() {
    await onceAcrossCopies(this.prisma, 'memory-rebuild', theDay(), async () => {
      const orgs: { id: string }[] = await (this.prisma as any).organization.findMany({ select: { id: true } });
      for (const o of orgs) await this.writer.rebuildOrganisation(o.id).catch((err: Error) => this.logger.error(`Memory rebuild failed for an organisation: ${err.message}`));
    });
  }
}
