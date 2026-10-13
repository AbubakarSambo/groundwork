import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookDeliveryStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { newSecret, signWithBoth, nextAttemptAfter, SIGNATURE_HEADER, TIMESTAMP_HEADER, EVENT_ID_HEADER } from './how-a-receiver-knows-it-was-us';
import { validateEvents, SENDABLE_EVENTS } from './events-we-can-actually-send';
import { WorkspaceNotifierService } from '../workspace/workspace-notifier.service';
import { EmailService } from '../email/email.service';

/** Somebody else's error page can be a megabyte of HTML. */
const MAX_RESPONSE_CHARS = 2_000;
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * How long a claimed delivery is held before another sweep may take it.
 *
 * Longer than any single attempt can take - REQUEST_TIMEOUT_MS is the ceiling on one send - so a
 * lease never expires under a sweep that is still working. Short enough that a pod killed mid-send
 * does not leave its deliveries sitting for an hour.
 */
export const LEASE_MS = 5 * 60_000;

/**
 * A LEASE HAS TO OUTLAST THE BATCH IT COVERS.
 *
 * `deliverDue` claims up to `limit` deliveries and sends them ONE AT A TIME, each with a ten-second
 * ceiling. Fifty of those is eight minutes in the worst case — against a five-minute lease. So a
 * sweep against fifty slow or dead endpoints kept working while its own lease expired underneath
 * it, and a second instance claimed the tail and sent those deliveries again. Signed and carrying
 * an event id, so a good receiver deduplicates; a receiver that does not gets the same event twice
 * and the comment above promising the lease "never expires under a sweep that is still working"
 * was simply false at any limit above thirty.
 *
 * Derived from the batch rather than fixed, so it cannot come apart again when somebody raises the
 * limit. The cost is what the original constant was protecting against: a pod killed mid-sweep
 * holds its claim for longer. That is the right trade — a delivery arriving late is a delay, a
 * delivery arriving twice is somebody's duplicate row.
 */
export function leaseForABatchOf(limit: number): number {
  const worstCase = Math.max(1, limit) * REQUEST_TIMEOUT_MS;
  /* Plus a margin for the reads, the writes and a slow database. */
  return Math.max(LEASE_MS, worstCase + 30_000);
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workspace: WorkspaceNotifierService,
    private readonly email: EmailService,
  ) {}

  // ---------------------------------------------------------------- endpoints

  async register(organizationId: string, url: string, events: string[]) {
    if (!url?.trim()) throw new BadRequestException('Add the web address to send to, then save.');
    let parsed: URL;
    try {
      parsed = new URL(url.trim());
    } catch {
      throw new BadRequestException('That is not a valid url.');
    }
    /*
     * HTTPS ONLY, and refused rather than warned about. The payload says which organisation a round
     * closed in and how many people were in it - over plaintext that is readable by anything on the
     * path, and a warning in a console is not a thing anybody reads before shipping.
     */
    /*
     * Loopback over http is allowed and nothing else is. A developer testing a receiver on their
     * own machine is not sending anything across a network, so the rule protects nobody there - and
     * the alternative is that everybody's first attempt fails, which is how a carve-out gets made
     * later and made too wide. Named hosts get no exception, including ones that resolve to
     * loopback, because we cannot tell from a hostname where it will resolve on the day.
     */
    const loopback = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '[::1]';
    if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && loopback)) {
      throw new BadRequestException('A webhook address must start with https, because what is sent names your organisation and its people.');
    }
    const check = validateEvents(events);
    if (!check.ok) throw new BadRequestException(check.message);

    const secret = newSecret();
    const row = await this.prisma.webhookEndpoint.create({
      data: { organizationId, url: parsed.toString(), events, secret },
      select: { id: true, url: true, events: true, active: true, createdAt: true },
    });
    /* Shown once at registration, like a credential - but recoverable by rotation rather than lost. */
    return { ...row, secret };
  }

  async list(organizationId: string) {
    return this.prisma.webhookEndpoint.findMany({
      /* Removed ones are kept for their delivery history and are not endpoints any more. Without
         this they would come back looking merely switched off, which somebody would then switch on. */
      where: { organizationId, removedAt: null },
      select: { id: true, url: true, events: true, active: true, createdAt: true, rotatedAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * REMOVING AN ENDPOINT IS A DECISION ABOUT THE FUTURE.
   *
   * This was a hard delete, and `WebhookDelivery` cascades off the endpoint — so removing one took
   * the entire delivery log with it. That log is the only record of what we sent this customer and
   * whether it arrived, and it is exactly what somebody asks for after an incident: did you send us
   * the event or not. There is no way to answer that afterwards, and nothing warned that pressing
   * remove would destroy it.
   *
   * So it stops deliveries and keeps the history. `active: false` is what the sender already reads;
   * `removedAt` is what keeps it out of the list, so a removed endpoint does not reappear looking
   * merely switched off.
   */
  async remove(organizationId: string, id: string) {
    const { count } = await this.prisma.webhookEndpoint.updateMany({
      where: { organizationId, id, removedAt: null },
      data: { active: false, removedAt: new Date() },
    });
    if (!count) throw new NotFoundException('No such endpoint.');
    return { removed: true, historyKept: true };
  }

  /**
   * ROTATION WITHOUT DOWNTIME. The old secret keeps working until the next rotation, so a customer
   * can deploy the new one at their own pace instead of during a maintenance window. Without the
   * grace period, rotation means a gap where every delivery fails verification - which is why
   * nobody rotates, which is why a leaked secret stays live.
   */
  /** Back on, after the customer has fixed the receiver. The dead notice is cleared so the next failure is told again. */
  async reactivate(organizationId: string, id: string) {
    const existing = await this.prisma.webhookEndpoint.findFirst({ where: { organizationId, id } });
    if (!existing) throw new NotFoundException('No such endpoint.');
    await this.prisma.webhookEndpoint.update({ where: { id }, data: { active: true, deadNoticeAt: null } });
    return { id, active: true };
  }

  async rotateSecret(organizationId: string, id: string) {
    const existing = await this.prisma.webhookEndpoint.findFirst({ where: { organizationId, id } });
    if (!existing) throw new NotFoundException('No such endpoint.');
    const secret = newSecret();
    await this.prisma.webhookEndpoint.update({
      where: { id },
      data: { secret, previousSecret: existing.secret, rotatedAt: new Date() },
    });
    return { id, secret, previousSecretAcceptedUntilNextRotation: true };
  }

  // ---------------------------------------------------------------- dispatch

  /**
   * Queue one event for every endpoint that asked for it.
   *
   * Queued rather than sent inline: a customer's slow endpoint must never hold up the thing that
   * emitted the event. A round closing is not allowed to take ten seconds because somebody's
   * server is thinking about it.
   */
  async emit(organizationId: string, eventType: string, payload: Record<string, unknown>) {
    if (!(SENDABLE_EVENTS as readonly string[]).includes(eventType)) {
      /* A programming error on our side, not a customer's. Loud, and it does not send. */
      this.logger.error(`Refusing to emit unknown event type "${eventType}".`);
      return { queued: 0 };
    }
    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: { organizationId, active: true, events: { has: eventType } },
      select: { id: true },
    });
    if (!endpoints.length) return { queued: 0 };

    /*
     * ONE EVENT ID SHARED BY EVERY ENDPOINT'S COPY. Two endpoints receiving the same event should
     * see the same id, because a customer whose staging and production both listen is looking at
     * one occurrence, not two.
     */
    const eventId = `evt_${randomUUID()}`;
    await this.prisma.webhookDelivery.createMany({
      data: endpoints.map((e) => ({
        organizationId,
        endpointId: e.id,
        eventId,
        eventType,
        payload: payload as any,
        status: WebhookDeliveryStatus.PENDING,
        nextAttemptAt: new Date(),
      })),
    });
    this.logger.log(`Queued ${eventType} (${eventId}) to ${endpoints.length} endpoint(s).`);
    return { queued: endpoints.length, eventId };
  }

  /** Everything currently due. Called by the cron, and by replay for one row. */
  /**
   * SELECTING A ROW IS NOT CLAIMING IT, AND THE DIFFERENCE IS A DUPLICATE AT THE CUSTOMER.
   *
   * This read the due rows and only wrote to them after the HTTP call returned. The cron's own
   * comment says why that matters - "a duplicate for a receiver that does not dedupe" - and the
   * guard it relies on is a boolean field on one process. Two API instances, or one instance
   * restarted mid-sweep, both select the same rows and both send. The webhook is signed and carries
   * the same event id each time, so a careful receiver survives it; a receiver that books a meeting
   * on the event does it twice.
   *
   * THE CLAIM IS THE LEASE. `nextAttemptAt` is pushed forward before anything is sent, in one
   * statement, so a concurrent sweep sees a row that is not due and skips it. `FOR UPDATE SKIP
   * LOCKED` is what makes two sweeps starting at the same instant take different rows rather than
   * one of them waiting for the other's lock and then finding nothing to do.
   *
   * A PROCESS THAT DIES MID-FLIGHT LOSES NOTHING. The lease expires and the row is due again - no
   * in-flight status to get stuck in, and no migration to add one.
   *
   * THE LEASE DOES NOT BURN AN ATTEMPT, deliberately. `attempts` counts what the receiver did with
   * a delivery, and a deploy restarting a pod is not the receiver failing. The cost is that a
   * message which somehow kills the process is retried until its attempts run out through some
   * other path - accepted, because the send is already inside a try/catch and the realistic cause
   * of a mid-sweep death is a restart rather than the message.
   */
  async deliverDue(now = new Date(), limit = 50) {
    /*
     * THE DATABASE'S CLOCK, NOT THIS PROCESS'S, AND NOT A JAVASCRIPT DATE AS A PARAMETER.
     *
     * `next_attempt_at` is `timestamp without time zone`, and the two writers disagree about what
     * that means: Prisma writes UTC, while a JS Date passed as a raw parameter is converted using
     * the session timezone. On a machine three hours off UTC the first version of this claimed
     * every delivery scheduled up to three hours into the future and sent it early - measured, not
     * reasoned about:
     *
     *   js Date (UTC)      : 2026-08-29T18:09:23.686Z
     *   same Date as param : 2026-08-29T21:09:23.686
     *   now() AT TIME ZONE 'UTC' : 2026-08-29T18:09:23.706
     *
     * It would have passed everywhere the servers run in UTC and failed on any deployment that does
     * not. Using the database's clock also fixes a second thing that was wrong for a queue several
     * instances share: a lease should not depend on whose pod's clock is fast.
     */
    const claimed = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      UPDATE webhook_deliveries
         SET next_attempt_at = (now() AT TIME ZONE 'UTC') + ${`${leaseForABatchOf(limit)} milliseconds`}::interval
       WHERE id IN (
         SELECT id FROM webhook_deliveries
          WHERE status IN ('PENDING', 'FAILED')
            AND next_attempt_at IS NOT NULL
            AND next_attempt_at <= (now() AT TIME ZONE 'UTC')
          ORDER BY next_attempt_at ASC
          LIMIT ${limit}
          FOR UPDATE SKIP LOCKED
       )
      RETURNING id
    `);
    if (!claimed.length) return { attempted: 0, delivered: 0 };

    /*
     * Read back through Prisma rather than returning every column from the raw statement: the
     * endpoint and its secret are needed to sign, and a hand-written join here would be a second
     * place that decides what a delivery is made of.
     */
    const due = await this.prisma.webhookDelivery.findMany({
      where: { id: { in: claimed.map((c) => c.id) } },
      include: { endpoint: true },
      orderBy: { createdAt: 'asc' },
    });

    let delivered = 0;
    for (const d of due) {
      if (await this.attempt(d)) delivered++;
    }
    return { attempted: due.length, delivered };
  }

  private async attempt(d: any): Promise<boolean> {
    const body = JSON.stringify({
      id: d.eventId,
      type: d.eventType,
      createdAt: d.createdAt,
      data: d.payload,
    });
    const timestamp = Math.floor(Date.now() / 1000);
    const attempts = d.attempts + 1;

    let code: number | null = null;
    let text = '';
    try {
      const res = await fetch(d.endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          /* Both secrets while a rotation is in flight — see `signWithBoth`. Signing with the
             current one alone is what made the advertised grace period a fiction. */
          [SIGNATURE_HEADER]: signWithBoth(
            body,
            { current: d.endpoint.secret, previous: d.endpoint.previousSecret },
            timestamp,
          ),
          [TIMESTAMP_HEADER]: String(timestamp),
          [EVENT_ID_HEADER]: d.eventId,
        },
        body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      code = res.status;
      text = (await res.text().catch(() => '')).slice(0, MAX_RESPONSE_CHARS);
    } catch (err: any) {
      /* A refused connection, a DNS failure, a timeout. No status code, and that is the record. */
      text = String(err?.message ?? err).slice(0, MAX_RESPONSE_CHARS);
    }

    /* Any 2xx is success. A receiver returning 204 is not an error, and neither is 201. */
    const ok = code !== null && code >= 200 && code < 300;
    if (ok) {
      await this.prisma.webhookDelivery.update({
        where: { id: d.id },
        data: {
          status: WebhookDeliveryStatus.DELIVERED,
          attempts, lastAttemptAt: new Date(), nextAttemptAt: null,
          responseCode: code, responseBody: text,
        },
      });
      return true;
    }

    const next = nextAttemptAfter(attempts, new Date());
    await this.prisma.webhookDelivery.update({
      where: { id: d.id },
      data: {
        status: next ? WebhookDeliveryStatus.FAILED : WebhookDeliveryStatus.DEAD,
        attempts, lastAttemptAt: new Date(), nextAttemptAt: next,
        responseCode: code, responseBody: text,
      },
    });
    if (!next) {
      this.logger.warn(`Delivery ${d.id} (${d.eventType}) is dead after ${attempts} attempts.`);
      /*
       * AND SOMEBODY IS TOLD. Seven attempts over about twenty-one hours and then DEAD, with a
       * warning in OUR logs and nothing that reaches the customer — so their integration silently
       * stops receiving and the first they know of it is a gap in their own data. Never allowed to
       * throw: a delivery that already failed must not also fail the sweep.
       */
      await this.tellThemItIsDying(d).catch((err) =>
        this.logger.error(`Could not tell ${d.organizationId} that endpoint ${d.endpointId} is dying: ${err?.message}`),
      );
    }
    return false;
  }

  /**
   * TELL THE CUSTOMER THEIR ENDPOINT IS DYING. Once a day per endpoint.
   *
   * A broken endpoint produces a dead delivery for every event, so this cannot fire per delivery —
   * it would be its own outage. `deadNoticeAt` is what makes it one notice, and it is stamped
   * before the sending so a failure to send does not turn into a loop either.
   */
  private async tellThemItIsDying(d: any): Promise<void> {
    const A_DAY_AGO = new Date(Date.now() - 24 * 60 * 60_000);
    /* Conditional update as the lock: whichever attempt gets the row first sends, the rest do
       nothing. Two dead deliveries in the same second are the normal case, not the rare one. */
    const { count } = await this.prisma.webhookEndpoint.updateMany({
      where: {
        id: d.endpointId,
        OR: [{ deadNoticeAt: null }, { deadNoticeAt: { lt: A_DAY_AGO } }],
      },
      /* AND SWITCHED OFF (NL-036). The endpoint was marked dead and left active, so every later event
         queued, retried seven times and died against a receiver known to be unreachable. Off, told,
         and switchable back on from the integrations page once it is reachable. */
      data: { deadNoticeAt: new Date(), active: false },
    });
    if (!count) return;

    const endpoint = d.endpoint ?? (await this.prisma.webhookEndpoint.findUnique({ where: { id: d.endpointId } }));
    const url = endpoint?.url ?? 'your endpoint';

    await this.workspace
      /* Its own kind. The first version of this borrowed 'a report is ready' and wrote the whole
         sentence into `about`, which produced "A report is ready on “Groundwork cannot deliver…”" —
         a notice whose shape said one thing and whose text said another. */
      .tell(d.organizationId, {
        what: 'an integration cannot be reached',
        about: url,
        link: `${this.email.frontendUrlForLinks()}/org/integrations`,
      })
      .catch(() => undefined);

    const admins = await this.prisma.user.findMany({
      where: { organizationId: d.organizationId, role: 'ADMIN' },
      select: { email: true, firstName: true },
    });
    for (const admin of admins) {
      await this.email
        .sendWebhookEndpointDying(admin.email, admin.firstName, url, d.eventType, d.attempts ?? 7)
        .catch(() => undefined);
    }
  }

  // ---------------------------------------------------------------- log

  async deliveries(organizationId: string, status?: string) {
    return this.prisma.webhookDelivery.findMany({
      where: {
        organizationId,
        ...(status ? { status: status.toUpperCase() as WebhookDeliveryStatus } : {}),
      },
      select: {
        id: true, eventId: true, eventType: true, status: true, attempts: true,
        lastAttemptAt: true, nextAttemptAt: true, responseCode: true, responseBody: true, createdAt: true,
        endpoint: { select: { id: true, url: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  /**
   * REPLAY KEEPS THE ORIGINAL EVENT ID, deliberately.
   *
   * A receiver that deduped the first delivery will dedupe the replay, which is correct: the
   * customer is asking us to try again with the same message, not to invent a second occurrence of
   * something that happened once. A fresh id would make one round closing look like two.
   */
  async replay(organizationId: string, deliveryId: string) {
    const d = await this.prisma.webhookDelivery.findFirst({
      where: { id: deliveryId, organizationId },
      include: { endpoint: true },
    });
    if (!d) throw new NotFoundException('No such delivery.');

    /*
     * A REPLAY TAKES THE ROW OUT OF THE SWEEP'S REACH FIRST.
     *
     * This set `nextAttemptAt` to NOW and then sent — which is precisely the state the sweep claims
     * rows in. So a replay pressed while the minute sweep was running could have both of them
     * sending the same delivery at the same time, and the person who pressed it would see one
     * result while the receiver got two. The lease is the same mechanism the sweep uses, and it is
     * taken with the database's clock for the same reason.
     */
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE webhook_deliveries
         SET status = 'PENDING',
             next_attempt_at = (now() AT TIME ZONE 'UTC') + ${`${leaseForABatchOf(1)} milliseconds`}::interval
       WHERE id = ${d.id}
    `);
    const ok = await this.attempt({ ...d, attempts: d.attempts });
    return { replayed: true, delivered: ok };
  }
}
