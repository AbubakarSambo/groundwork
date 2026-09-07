import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { isReallyFromGroundwork, whatItMeansForUs } from './what-groundwork-tells-us';

/**
 * RECEIVING WHAT GROUNDWORK TELLS US.
 *
 * The other half of being a customer. We have pushed for months and subscribed
 * to nothing, so a released report had to be gone and found and a commitment
 * made in a check-in never reached the board somebody is measured on.
 */
/** The id the schema gives the single ops-integration row. */
export const THE_ONE_ROW = 'the-one-row';

/** A stable id for a delivery that arrived without one. Same body, same id, across retries. */
function idFromBody(rawBody: string): string {
  return createHash('sha256').update(rawBody).digest('hex').slice(0, 32);
}

@Injectable()
export class OpsGroundworkEventsService {
  private readonly logger = new Logger(OpsGroundworkEventsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * One delivery.
   *
   * ALWAYS 200, EVEN WHEN THE SIGNATURE FAILS. A sender that receives an error
   * retries, and retrying a badly signed event produces the same failure every
   * few minutes forever. The failure is recorded here, where somebody can look,
   * rather than argued about across a network boundary.
   */
  async received(rawBody: string, signature: string | undefined, eventId: string | undefined) {
    /*
     * THE ROW FOR THIS SIDE, not whichever row the database returns first.
     *
     * `findFirst` with no `where` asks for an arbitrary integration row, so the secret an event is
     * checked against was whichever one the database happened to return. The model declares its
     * own id — `@id @default("the-one-row")` — so there is a named row to ask for, and a second
     * row (a staging credential pasted in, a half-finished rotation) can no longer silently change
     * what verifies.
     */
    const row = await this.prisma.opsIntegration.findUnique({
      where: { id: THE_ONE_ROW },
      select: { webhookSecret: true },
    });
    const secret = row?.webhookSecret;

    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      /* Recorded rather than refused, for the same reason as a bad signature:
         something is sending us things we cannot read and that is worth seeing. */
      payload = { unreadable: rawBody.slice(0, 500) };
    }

    const kind = typeof payload.event === 'string' ? payload.event : (payload.kind as string) ?? 'unknown';
    /*
     * AN ID DERIVED FROM THE DELIVERY, NOT FROM THE CLOCK.
     *
     * The fallback was `unsigned-${Date.now()}`, which is a different value every millisecond — so
     * the upsert below, whose whole job is "the same delivery twice is one row", could never match
     * anything for an event that arrived without an id. Retries are normal, and each one became a
     * second fact in a table the ops board reads as a count of what happened.
     *
     * A hash of the body is stable across retries of the same delivery and different for a
     * different one, which is exactly what deduplication needs. Prefixed so it is obvious in the
     * table which ids we derived rather than were given.
     */
    const id = eventId ?? (payload.id as string) ?? `derived-${idFromBody(rawBody)}`;

    const checked = secret
      ? isReallyFromGroundwork(rawBody, signature, secret)
      : { ok: false as const, because: 'no webhook secret is configured on this side yet' };

    if (!checked.ok) this.logger.warn(`Event ${id} did not verify: ${checked.because}`);

    const meaning = checked.ok ? whatItMeansForUs(kind, payload) : null;

    /* The same delivery twice is one row. Retries are normal and a duplicate must
       not become a second fact. */
    await this.prisma.opsGroundworkEvent.upsert({
      where: { eventId: id },
      create: { eventId: id, kind, payload: payload as never, verified: checked.ok, actedOn: meaning },
      update: {},
    });

    return { received: true, verified: checked.ok, says: meaning };
  }

  /** What has arrived, newest first. Unverified ones included, and marked. */
  async whatHasArrived(take = 50) {
    const rows = await this.prisma.opsGroundworkEvent.findMany({
      orderBy: { receivedAt: 'desc' },
      take,
    });

    return {
      events: rows.map((e) => ({
        kind: e.kind,
        verified: e.verified,
        receivedAt: e.receivedAt,
        says: e.actedOn,
      })),
      says:
        rows.length === 0
          ? 'Nothing has arrived. Either nothing has happened, or nobody has registered where to send it — and those are different problems.'
          : `${rows.length} received${rows.some((e) => !e.verified) ? ', some of which did not verify' : ''}.`,
    };
  }
}
