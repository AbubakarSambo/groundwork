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

  /**
   * EVERY USER IS A MEMBER OF THE ORGANISATION THEY ARE IN.
   *
   * `OrganizationMembership` was added with a migration that backfilled every existing user, and no
   * code was ever written to create one. So it was true for everybody who existed on the day of the
   * migration and false for everybody since: `/auth/my-organizations` returned an empty list and
   * `/auth/switch-organization` could not find a row to switch to. The whole multi-organisation
   * feature - routes, reads, migration - worked only for users who predated it.
   *
   * Proved by signing a user up through the real flow and counting their membership rows: zero.
   *
   * WHY THIS IS A MIDDLEWARE AND NOT NINE EDITS. There are nine `user.create` calls across four
   * services, and the reason this broke is that a row had to be remembered in a place far from where
   * the rule lives. Patching nine sites leaves the tenth, written next month, silently broken again.
   * Here it cannot be forgotten: any user created with an organisation gets the membership, including
   * from a path nobody has written yet.
   *
   * `skipDuplicates` in spirit: the create is guarded so a caller that already makes one, or a retry,
   * cannot fail the whole sign-up on a unique violation. A missing membership is a broken switcher; a
   * failed sign-up is a person who cannot get in at all.
   */
  private membershipFollowsTheUser() {
    this.$use(async (params, next) => {
      if (params.model !== 'User' || params.action !== 'create') return next(params);

      /**
       * THE MEMBERSHIP IS ADDED TO THE CREATE, NOT WRITTEN AFTER IT.
       *
       * The first attempt did the obvious thing - let the user be created, then upsert the
       * membership - and it failed on every sign-up, silently, into the log line below. Every one of
       * the nine `user.create` calls runs inside a `$transaction`, so the user row does not exist yet
       * on any other connection: the dependent write has nothing to point at.
       *
       * Nesting it into the same create means Prisma issues both inside whatever transaction the
       * caller is already running. Found by making the fix, testing it against a real sign-up, and
       * getting zero memberships again.
       */
      const data = params.args?.data;
      const orgId = data?.organizationId ?? data?.organization?.connect?.id ?? null;
      /** A caller that builds its own memberships is left alone rather than given two. */
      if (data && orgId && !data.memberships) {
        params.args.data = {
          ...data,
          memberships: { create: { organizationId: orgId, role: data.role ?? 'MEMBER' } },
        };
      }
      return next(params);
    });
  }

  async onModuleInit() {
    try {
      this.membershipFollowsTheUser();
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
      this.logger.debug(`Advisory lock ${key} held elsewhere - skipping this run`);
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
