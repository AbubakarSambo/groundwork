import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpsIntentService } from './ops-intent.service';
import { GroundworkApiClient } from './the-groundwork-api-as-a-customer';
import { fingerprint } from './what-we-send-to-groundwork';
import {
  whatThisCompanyDecided,
  whatServingMeans,
  type WhatWeHold,
} from './what-this-company-decided';
import { mintEmbedToken, whyThePanelCannotOpen } from './a-token-a-customer-would-mint';
import {
  subjectsFrom,
  objectivesFrom,
  evidenceFrom,
  interactionsFrom,
  peopleFrom,
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
        enabled: true,
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
      checkInId: row.checkInId,
      organizationId: row.organizationId,
      /** Present or absent, never the value. Same rule as the client secret. */
      embedSecretSet: Boolean(row.embedSecret),
      lastSyncSummary: row.lastSyncSummary,
      lastSyncDetail: row.lastSyncDetail,
      says: !row.checkInId && row.enabled
        ? 'Connected, but there is no check-in for the numbers to land on.'
        : row.enabled
        ? row.lastSyncAt
          ? `Last sent ${row.lastSyncOk ? 'successfully' : 'with a problem'}: ${row.lastSyncSummary}`
          : 'Connected, nothing sent yet'
        : 'Switched off. Nothing here depends on it.',
    };
  }

  async configure(
    input: { baseUrl?: string; clientId?: string; clientSecret?: string; enabled?: boolean; checkInId?: string; organizationId?: string; embedSecret?: string },
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

    /**
     * Whose objectives these are, on the check-in.
     *
     * The CEO, because the objectives are the company's and she owns the
     * period. Read from the grants rather than named, so it follows the person
     * rather than the file.
     */
    const ceoGrant = await this.prisma.opsGrant.findFirst({
      where: { capability: 'ceo:board' },
      include: { person: true },
    });
    const ourLead = ceoGrant?.person.key ?? 'unknown';

    const client = new GroundworkApiClient({
      baseUrl: row.baseUrl,
      clientId: row.clientId,
      clientSecret: row.clientSecret,
    });

    const objectives = await this.intent.objectives(periodKey);
    const team = await this.prisma.opsPerson.findMany();
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
      /*
       * People first, and in this order for a reason: everything after this
       * refers to them. Sending an objective for somebody Groundwork has never
       * heard of fails, and the message it fails with talks about the objective.
       */
      for (const person of peopleFrom(team)) {
        results.push({ what: `person ${person.externalId}`, ...(await client.pushPerson(person)) });
      }

      /* Our id for a person, to the key we push them under. Built from the team
         we already loaded, so an objective arrives owned by somebody rather than
         by nobody — see `subjectsFrom`. */
      const keyFor = new Map(team.map((p) => [p.id, p.key]));
      for (const subject of subjectsFrom(objectives, (ownerId) => (ownerId ? keyFor.get(ownerId) ?? null : null))) {
        /*
         * THE KEY IDENTIFIES THIS CONTENT, NOT THIS SUBJECT FOREVER.
         *
         * It was the subject's id alone. So the first push of an objective set
         * the key, and every later push of the SAME objective with anything
         * changed was refused 409 — "already used with a different request
         * body". Found the day owners started being sent: five objectives
         * unchanged, one now owned, and that one refused.
         *
         * Which is the API being right. An idempotency key promises "this exact
         * write, once"; reusing it for a different write is the caller's error.
         * So the key carries a fingerprint of what is being sent: the same
         * content twice is still one write, and changed content is a new one.
         */
        const result = await client.pushSubject(
          subject,
          `${OUR_SOURCE_SYSTEM}:${subject.externalId}:${fingerprint(subject)}`,
        );
        results.push({ what: `subject ${subject.externalId}`, ...result });
      }

      /*
       * Then the objectives ON THE CHECK-IN. This is the step the first version
       * of this adapter did not have, and its absence is why every push it made
       * returned 200 and wrote nothing.
       */
      const objectivePayload = objectivesFrom(objectives);
      if (row.checkInId && objectivePayload.length) {
        results.push({
          what: `objectives x${objectivePayload.length}`,
          ...(await client.seedObjectives(row.checkInId, ourLead, objectivePayload)),
        });
      }

      /*
       * WHAT THIS COMPANY DECIDED, WHICH HAD NEVER BEEN SENT.
       *
       * Before the objectives on purpose: an assistant asked "why are we doing
       * this" needs what we agreed, and an objective arriving before the reason
       * for it is the same ordering mistake the check-in prompt had.
       */
      for (const decided of whatThisCompanyDecided(await this.whatWeHold())) {
        results.push({ what: `decided: ${decided.key}`, ...(await client.pushCard(decided)) });
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
      /*
       * Two different problems with two different answers, and the earlier
       * version gave the same sentence for both.
       */
      advice: !row.checkInId
        ? 'There is no check-in for these numbers to land on. Open one in Groundwork, then put its id in the connection here - this adapter will not open one for you, because opening a check-in invites people and starts a conversation.'
        : unmatched
          ? 'The evidence reached Groundwork and matched nothing, even with a check-in set. The objectives may not have seeded - look at what the objectives call said above.'
          : undefined,
      /** Verbatim, including the refusals. */
      results,
    };
  }

  /**
   * The decisions this company has made, read from our own tables.
   *
   * Assembled here rather than in `what-this-company-decided.ts` so that file
   * stays a pure shaping of records into cards — testable without a database,
   * like everything else that decides what leaves this system.
   */
  private async whatWeHold(): Promise<WhatWeHold> {
    const [statement, moat, phases, freeze, resources] = await Promise.all([
      this.prisma.opsProductStatement.findFirst({ orderBy: { version: 'desc' } }),
      this.prisma.opsMoatComponent.findMany({ orderBy: { ordinal: 'asc' } }),
      this.prisma.opsPhase.findMany({ orderBy: { ordinal: 'asc' } }),
      /* The LATEST record, which is what the freeze is — the table is append-only
         and the newest row is the current state. Whether it is on is read below;
         a lapsed freeze sent as current is worse than sending nothing. */
      this.prisma.opsFreeze.findFirst({ orderBy: { decidedAt: 'desc' } }),
      this.prisma.opsResource.findMany({ orderBy: { addedAt: 'desc' }, take: 20 }),
    ]);

    return {
      statement: statement
        ? {
            version: statement.version,
            headline: statement.headline,
            saidOutLoud: statement.saidOutLoud,
            isIt: statement.isIt,
            isNotIt: statement.isNotIt,
          }
        : null,
      moat: moat.map((m) => ({ name: m.name, statement: m.statement })),
      phases: phases.map((p) => ({
        name: p.name,
        intent: p.intent,
        startsOn: p.startsOn,
        endsOn: p.endsOn,
        exitCondition: p.exitCondition,
        exitMetric: p.exitMetric,
      })),
      freeze:
        freeze && freeze.isOn && (freeze.until === null || freeze.until >= new Date())
          ? { because: freeze.because, until: freeze.until }
          : null,
      resources: resources.map((r) => ({ title: r.title, category: r.category, risks: r.risks })),
      serves: whatServingMeans(),
    };
  }

  private recordSync(ok: boolean, summary: string, detail: string | null) {
    return this.prisma.opsIntegration.update({
      where: { id: THE_ONE_ROW },
      data: { lastSyncAt: new Date(), lastSyncOk: ok, lastSyncSummary: summary, lastSyncDetail: detail },
    });
  }

  /**
   * WHAT THE PANEL NEEDS, AND NOTHING MORE.
   *
   * A short-lived assertion about the person looking at the page, and the
   * address to take it to. Never the shared secret: a browser that holds the key
   * can mint a token for anybody, which is the whole reason the customer's
   * server signs and the browser does not.
   *
   * Refuses in words rather than returning an empty panel, because the states
   * this can be in — not connected, no organisation, no key — are all things
   * somebody can fix, and a launcher that appears and does nothing teaches
   * people to stop pressing it.
   */
  async panelFor(personKey: string) {
    const row = await this.prisma.opsIntegration.findUnique({ where: { id: THE_ONE_ROW } });
    const why = whyThePanelCannotOpen(row ?? {});
    if (why || !row) return { ready: false as const, why: why ?? 'Groundwork is not connected.' };

    return {
      ready: true as const,
      /*
       * The PUBLIC base url, handed to the browser so it calls Groundwork
       * directly. Proxying it through here would work and would prove nothing:
       * the request a customer's browser makes is the thing under test.
       */
      baseUrl: row.baseUrl as string,
      token: mintEmbedToken(
        { sub: personKey, org: row.organizationId as string },
        row.embedSecret as string,
      ),
    };
  }
}
