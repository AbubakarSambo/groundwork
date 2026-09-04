import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpsIntentService } from './ops-intent.service';
import { GroundworkApiClient } from './the-groundwork-api-as-a-customer';
import {
  subjectsFrom,
  evidenceFrom,
  interactionsFrom,
  OUR_SOURCE_SYSTEM,
} from './what-we-send-to-groundwork';

const THE_ONE_ROW = 'the-one-row';

/**
 * Whether a 200 from the evidence endpoint actually did anything.
 *
 * It reports unmatched items rather than throwing, deliberately and for a good
 * reason: a nightly push across a whole organisation will name objectives that
 * are not on anybody's check-in, and failing the batch for that would be
 * useless. The consequence is that a caller reading only the status code sees
 * success while every single item was a no-op.
 *
 * We read it as a client, so we found this the way a customer would: the first
 * real push reported "5 sent, 0 refused" and had written nothing.
 */
function nothingMatched(body: unknown): boolean {
  const received = (body as { received?: Array<{ matched?: boolean }> } | null)?.received;
  if (!Array.isArray(received) || received.length === 0) return false;
  return received.every((r) => r.matched === false);
}

/**
 * Sending our own work to Groundwork, as a customer would.
 *
 * Nothing in this file is read by any board. That is deliberate and it is the
 * acceptance test: turn the adapter off, or point it at a dead URL, and every
 * ops board reads exactly the same. If a number here ever became something a
 * board needed, the two systems would have quietly become one.
 */
@Injectable()
export class OpsIntegrationService {
  private readonly logger = new Logger(OpsIntegrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly intent: OpsIntentService,
  ) {}

  /** The connection, with the secret withheld. Nothing returns it, ever. */
  async status() {
    const row = await this.prisma.opsIntegration.findUnique({ where: { id: THE_ONE_ROW } });
    if (!row) {
      return {
        configured: false,
        enabled: false,
        says: 'Groundwork is not connected. Nothing here depends on it.',
      };
    }

    return {
      configured: Boolean(row.baseUrl && row.clientId && row.clientSecret),
      enabled: row.enabled,
      baseUrl: row.baseUrl,
      clientId: row.clientId,
      /** Present or absent, never the value. */
      secretSet: Boolean(row.clientSecret),
      lastSyncAt: row.lastSyncAt,
      lastSyncOk: row.lastSyncOk,
      lastSyncSummary: row.lastSyncSummary,
      lastSyncDetail: row.lastSyncDetail,
      says: row.enabled
        ? row.lastSyncAt
          ? `Last sent ${row.lastSyncOk ? 'successfully' : 'with a problem'}: ${row.lastSyncSummary}`
          : 'Connected, nothing sent yet'
        : 'Switched off. Nothing here depends on it.',
    };
  }

  async configure(
    input: { baseUrl?: string; clientId?: string; clientSecret?: string; enabled?: boolean },
    updatedBy: string,
  ) {
    await this.prisma.opsIntegration.upsert({
      where: { id: THE_ONE_ROW },
      update: { ...input, updatedBy },
      create: { id: THE_ONE_ROW, ...input, updatedBy },
    });
    return this.status();
  }

  /**
   * Sends this period's objectives, their current numbers, and what people did.
   *
   * Returns what the API said rather than a summary of it. Its refusals are the
   * product's own error messages, and reading them is most of the value of
   * doing this at all.
   */
  async push(periodKey: string) {
    const row = await this.prisma.opsIntegration.findUnique({ where: { id: THE_ONE_ROW } });
    if (!row) throw new NotFoundException('Groundwork is not connected');
    if (!row.enabled) throw new BadRequestException('The connection is switched off');
    if (!row.baseUrl || !row.clientId || !row.clientSecret) {
      throw new BadRequestException('The connection is missing a URL, a client id or a secret');
    }

    const client = new GroundworkApiClient({
      baseUrl: row.baseUrl,
      clientId: row.clientId,
      clientSecret: row.clientSecret,
    });

    const objectives = await this.intent.objectives(periodKey);
    const period = await this.prisma.opsPeriod.findUnique({ where: { key: periodKey } });
    const activities = await this.prisma.opsActivity.findMany({
      where: period
        ? { happenedAt: { gte: period.startsOn, lte: new Date(period.endsOn.getTime() + 86399999) } }
        : undefined,
      orderBy: { happenedAt: 'desc' },
      take: 200,
    });

    const results: Array<{
      what: string;
      status: number;
      ok: boolean;
      body: unknown;
      unmatched?: boolean;
    }> = [];

    try {
      for (const subject of subjectsFrom(objectives)) {
        const result = await client.pushSubject(subject, `${OUR_SOURCE_SYSTEM}:${subject.externalId}`);
        results.push({ what: `subject ${subject.externalId}`, ...result });
      }

      const evidence = evidenceFrom(objectives);
      if (evidence.length) {
        const sent = await client.pushEvidence(evidence);
        results.push({
          what: `evidence x${evidence.length}`,
          ...sent,
          // 200 is not the outcome here. See `nothingMatched` below.
          ok: sent.ok && !nothingMatched(sent.body),
          unmatched: nothingMatched(sent.body),
        });
      }

      const interactions = interactionsFrom(activities);
      if (interactions.length) {
        results.push({
          what: `interactions x${interactions.length}`,
          ...(await client.pushInteractions(OUR_SOURCE_SYSTEM, interactions)),
        });
      }
    } catch (error) {
      /**
       * A failure to reach Groundwork is recorded and swallowed. It is not
       * allowed to become an ops failure — the company does not stop because an
       * integration is down, which is exactly what we would tell a customer.
       */
      const message = error instanceof Error ? error.message : String(error);
      await this.recordSync(false, 'Could not reach Groundwork', message);
      this.logger.warn(`Push to Groundwork failed: ${message}`);
      return { ok: false, reason: message, results };
    }

    const failed = results.filter((r) => !r.ok);
    const unmatched = results.some((r) => r.unmatched);

    await this.recordSync(
      failed.length === 0,
      unmatched
        ? `${results.length} sent, but the evidence matched no objective on any check-in`
        : `${results.length} sent, ${failed.length} refused`,
      failed.length ? JSON.stringify(failed.slice(0, 5)) : null,
    );

    return {
      ok: failed.length === 0,
      sent: results.length,
      refused: failed.length,
      /**
       * Said out loud, because this is the trap. Evidence attaches to an
       * objective that exists ON A CHECK-IN. Pushing subjects and then evidence
       * against their ids is the obvious thing to try, it returns 200, and it
       * does nothing at all.
       */
      advice: unmatched
        ? 'The evidence reached Groundwork and matched nothing. Evidence attaches to an objective on a check-in, not to a subject - so somebody has to open a check-in and put these objectives on it before the numbers have anywhere to land.'
        : undefined,
      /** Verbatim, including the refusals. */
      results,
    };
  }

  private recordSync(ok: boolean, summary: string, detail: string | null) {
    return this.prisma.opsIntegration.update({
      where: { id: THE_ONE_ROW },
      data: { lastSyncAt: new Date(), lastSyncOk: ok, lastSyncSummary: summary, lastSyncDetail: detail },
    });
  }
}
