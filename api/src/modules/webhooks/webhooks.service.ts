import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookDeliveryStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { newSecret, sign, nextAttemptAfter, SIGNATURE_HEADER, TIMESTAMP_HEADER, EVENT_ID_HEADER } from './how-a-receiver-knows-it-was-us';
import { validateEvents, SENDABLE_EVENTS } from './events-we-can-actually-send';

/** Somebody else's error page can be a megabyte of HTML. */
const MAX_RESPONSE_CHARS = 2_000;
const REQUEST_TIMEOUT_MS = 10_000;

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------- endpoints

  async register(organizationId: string, url: string, events: string[]) {
    if (!url?.trim()) throw new BadRequestException('A url is required.');
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
      throw new BadRequestException('Webhook urls must be https - the payload names your organisation and its people.');
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
      where: { organizationId },
      select: { id: true, url: true, events: true, active: true, createdAt: true, rotatedAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(organizationId: string, id: string) {
    const { count } = await this.prisma.webhookEndpoint.deleteMany({ where: { organizationId, id } });
    if (!count) throw new NotFoundException('No such endpoint.');
    return { removed: true };
  }

  /**
   * ROTATION WITHOUT DOWNTIME. The old secret keeps working until the next rotation, so a customer
   * can deploy the new one at their own pace instead of during a maintenance window. Without the
   * grace period, rotation means a gap where every delivery fails verification - which is why
   * nobody rotates, which is why a leaked secret stays live.
   */
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
  async deliverDue(now = new Date(), limit = 50) {
    const due = await this.prisma.webhookDelivery.findMany({
      where: {
        status: { in: [WebhookDeliveryStatus.PENDING, WebhookDeliveryStatus.FAILED] },
        nextAttemptAt: { lte: now },
      },
      include: { endpoint: true },
      orderBy: { nextAttemptAt: 'asc' },
      take: limit,
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
          [SIGNATURE_HEADER]: sign(body, d.endpoint.secret, timestamp),
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
    if (!next) this.logger.warn(`Delivery ${d.id} (${d.eventType}) is dead after ${attempts} attempts.`);
    return false;
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

    await this.prisma.webhookDelivery.update({
      where: { id: d.id },
      data: { status: WebhookDeliveryStatus.PENDING, nextAttemptAt: new Date() },
    });
    const ok = await this.attempt({ ...d, attempts: d.attempts });
    return { replayed: true, delivered: ok };
  }
}
