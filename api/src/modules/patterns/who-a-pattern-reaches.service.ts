import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { readPatternReach } from './who-reads-a-pattern';

/** How often the setting is read again, so a change made on another copy of the API reaches this one. */
export const PATTERN_REACH_READ_EVERY_MS = 30_000;

/**
 * KEEPS THE PATTERN REACH IN FORCE IN STEP WITH ITS SETTING ROW (decision 74, item 2).
 *
 * The rule itself, and why the value is held in memory, is in who-reads-a-pattern.ts, beside
 * `DEFAULT_PATTERN_REACH`. This only reads the `patterns.reach` row when the API starts and every
 * 30 seconds after. Until the first read finishes, the person-only reach is in force.
 */
@Injectable()
export class WhoAPatternReachesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhoAPatternReachesService.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    const reach = await readPatternReach(this.prisma as any);
    this.logger.log(`Patterns reach ${reach === 'PERSON_ONLY' ? 'only the person they are about' : 'the person first, then whoever runs the check-in'}.`);
    this.timer = setInterval(() => { void readPatternReach(this.prisma as any); }, PATTERN_REACH_READ_EVERY_MS);
    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
