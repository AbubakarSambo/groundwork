import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { SubscriptionPlan } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { aFreeRunEndsOn } from '../../common/subscription';

/**
 * A FREE RUN ON THE HOUSE, NOW ONE MONTH.
 *
 * Hafsah, 19 September 2026: "us to give free 3 month usage for orgs tied to some accounts. So we
 * put in someone's email and their org gets free use for three months, when they sign-up, they see
 * it." Her answer of 5 October 2026 (decision 78, and decisions-merged 192): every free run is one
 * month, not three. So a promise made here is one month unless staff type another length. The file
 * and the class keep the name "three months", because other code and the admin route use it, and a
 * rename would break them for no gain to anybody reading the screen.
 *
 * Three things follow from that sentence and each one shaped this file.
 *
 * IT IS PROMISED TO AN ADDRESS, NOT TO AN ORGANISATION. At the moment we make the promise there is
 * no organisation and no account; the person has not arrived. So the grant is keyed by email and
 * waits, and the organisation it ends up on is whatever they create when they sign up.
 *
 * THE CLOCK STARTS WHEN THEY TAKE IT UP. A promise made in September and taken up in November is
 * still its whole month. Starting the clock at the grant would mean the ones we forget to chase
 * are the ones that expire unused, which is exactly backwards.
 *
 * THEY SEE IT WHEN THEY SIGN UP. Which means something must be able to answer "is there one for
 * this address" before there is an account to ask about - see `whatIsWaitingFor`.
 */
@Injectable()
export class ThreeMonthsOnTheHouseService {
  private readonly logger = new Logger(ThreeMonthsOnTheHouseService.name);

  constructor(private prisma: PrismaService) {}

  private normalise(email: string): string {
    const e = (email ?? '').trim().toLowerCase();
    /* A grant that misses its address is worse than no grant: the person signs up, sees nothing,
       and either pays or leaves, and nobody finds out we promised them anything. */
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new BadRequestException('That is not an email address.');
    return e;
  }

  /** Make the promise. Re-granting the same address refreshes it rather than failing. */
  async grant(input: { email: string; months?: number; plan?: SubscriptionPlan; note?: string; byUserId?: string }) {
    const email = this.normalise(input.email);
    /* One month unless staff say another length (Hafsah, 5 October 2026: every free run is one month). */
    const months = Math.min(24, Math.max(1, Math.round(input.months ?? 1)));
    const existing = await this.prisma.freeRun.findUnique({ where: { email } });
    if (existing?.claimedAt) {
      throw new BadRequestException(`${email} has already taken up a free run, so there is nothing waiting to change.`);
    }
    const row = await this.prisma.freeRun.upsert({
      where: { email },
      create: { email, months, plan: input.plan ?? SubscriptionPlan.GROWTH, note: input.note?.trim() || null, grantedByUserId: input.byUserId ?? null },
      update: { months, plan: input.plan ?? SubscriptionPlan.GROWTH, note: input.note?.trim() || null, grantedByUserId: input.byUserId ?? null, revokedAt: null },
    });
    this.logger.log(`Free run promised: ${months} months on ${row.plan} for ${email}`);
    /*
     * SOMEBODY WHO HAS ALREADY SIGNED UP IS NOT WAITING TO. Hafsah, 22 Sep 2026, on a live demo:
     * "when I added the team to the free tier, it didn't actually give them free, it is saying waiting
     * for them to sign up." The promise only ever landed at sign-up (a-promise-kept-at-sign-up), so an
     * address that already had an account sat as "waiting" for a moment that had already happened.
     * Where the address is a user with an organisation, the months start now, on that organisation.
     */
    /* Optional-chained the way the rest of this codebase reaches a model a test double may not carry. */
    const already = await (this.prisma.user?.findUnique?.({ where: { email }, select: { organizationId: true } }) ?? Promise.resolve(null)).catch(() => null);
    if (already?.organizationId) {
      const taken = await this.claimFor(email, already.organizationId);
      if (taken) {
        this.logger.log(`Free run for ${email} taken up at once: they had already signed up, so it lands on ${already.organizationId}.`);
        return (await this.prisma.freeRun.findUnique({ where: { email } })) ?? row;
      }
    }
    return row;
  }

  /**
   * THE PROMISES ALREADY WAITING ON PEOPLE WHO HAD ALREADY SIGNED UP. The check above in grant() is
   * new; two rows on the live console were made before it existed and would have waited for ever.
   * Read on the way into the list, so the page that showed them "waiting" is the page that settles
   * them. A write on a read, deliberately and only here: the alternative was a migration for two rows.
   */
  private async settleWhatIsWaiting(): Promise<void> {
    const waiting = await (this.prisma.freeRun.findMany?.({ where: { claimedAt: null, revokedAt: null }, select: { email: true } }) ?? Promise.resolve([])).catch(() => [] as { email: string }[]);
    for (const w of waiting ?? []) {
      const user = await (this.prisma.user?.findUnique?.({ where: { email: w.email }, select: { organizationId: true } }) ?? Promise.resolve(null)).catch(() => null);
      if (user?.organizationId) await this.claimFor(w.email, user.organizationId);
    }
  }

  /** Withdraw a promise that has not been taken up. Kept as a row: who was promised what is a record. */
  async revoke(id: string) {
    const row = await this.prisma.freeRun.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('No such free run.');
    if (row.claimedAt) throw new BadRequestException('That one has been taken up already. Ending it early is a change to their organisation, not to this promise.');
    return this.prisma.freeRun.update({ where: { id }, data: { revokedAt: new Date() } });
  }

  async list() {
    await this.settleWhatIsWaiting();
    const rows = await this.prisma.freeRun.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
    const now = new Date();
    return rows.map((r) => ({
      id: r.id,
      email: r.email,
      months: r.months,
      plan: r.plan,
      note: r.note,
      createdAt: r.createdAt,
      state: r.revokedAt ? 'withdrawn'
        : !r.claimedAt ? 'waiting'
          : r.endsAt && r.endsAt.getTime() > now.getTime() ? 'running'
            : 'finished',
      claimedAt: r.claimedAt,
      endsAt: r.endsAt,
    }));
  }

  /**
   * What is waiting for this address, if anything. Asked at the sign-up screen, before there is an
   * account - so it says how long and on what, and nothing else about the person or who granted it.
   */
  async whatIsWaitingFor(email: string): Promise<{ months: number; plan: SubscriptionPlan } | null> {
    const row = await this.prisma.freeRun.findUnique({ where: { email: (email ?? '').trim().toLowerCase() } });
    if (!row || row.revokedAt || row.claimedAt) return null;
    return { months: row.months, plan: row.plan };
  }

  /**
   * Take it up. Called once, at the moment the organisation is created for that address.
   *
   * NOTHING HERE THROWS ON THE SIGN-UP PATH. A free run that fails to attach must not be able to
   * stop somebody creating their organisation: the worst case has to be that we owe them a fix,
   * never that they cannot sign up at all.
   */
  async claimFor(email: string, organizationId: string): Promise<{ months: number; endsAt: Date; plan: SubscriptionPlan } | null> {
    try {
      const at = (email ?? '').trim().toLowerCase();
      const row = await this.prisma.freeRun.findUnique({ where: { email: at } });
      if (!row || row.revokedAt || row.claimedAt) return null;
      const claimedAt = new Date();
      const endsAt = aFreeRunEndsOn(claimedAt, row.months);
      await this.prisma.$transaction([
        this.prisma.freeRun.update({ where: { id: row.id }, data: { claimedAt, endsAt, claimedByOrganizationId: organizationId } }),
        this.prisma.organization.update({ where: { id: organizationId }, data: { freeUntil: endsAt, freePlan: row.plan } }),
      ]);
      this.logger.log(`Free run taken up by ${at}: ${row.months} months on ${row.plan}, ending ${endsAt.toISOString().slice(0, 10)}`);
      return { months: row.months, endsAt, plan: row.plan };
    } catch (err: any) {
      this.logger.error(`A free run for ${email} could not be attached to ${organizationId}: ${err?.message}`);
      return null;
    }
  }
}
