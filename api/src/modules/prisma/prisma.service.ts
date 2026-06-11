import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connection established');
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database connection closed');
  }

  /**
   * Run `fn` only if this process can acquire a Postgres advisory lock for
   * `key`. Across multiple API replicas, exactly one wins the lock and runs the
   * body; the others skip. This prevents crons from double-charging, double-
   * sending email, or double-sweeping when the app is scaled horizontally.
   * (GW-60.) The lock is session-scoped and released in `finally`.
   */
  async withAdvisoryLock(key: number, fn: () => Promise<void>): Promise<boolean> {
    const rows = await this.$queryRaw<{ locked: boolean }[]>`SELECT pg_try_advisory_lock(${key}) AS locked`;
    if (!rows[0]?.locked) {
      this.logger.debug(`Advisory lock ${key} held elsewhere — skipping this run`);
      return false;
    }
    try {
      await fn();
      return true;
    } finally {
      await this.$queryRaw`SELECT pg_advisory_unlock(${key})`;
    }
  }
}

/** Stable advisory-lock keys, one per scheduled job. Arbitrary but distinct. */
export const CronLock = {
  SCENARIO_FEES: 920_001,
  STALL_GROUNDS: 920_002,
  SEND_REMINDERS: 920_003,
  PATTERN_BACKSTOP: 920_004,
  SYNTHESIS_BACKSTOP: 920_005,
  AUTO_CLOSE_CHECK_INS: 920_006,
  SESSION_CLOSING_WARNINGS: 920_007,
} as const;
