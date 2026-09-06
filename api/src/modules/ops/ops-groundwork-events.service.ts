import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { isReallyFromGroundwork, whatItMeansForUs } from './what-groundwork-tells-us';

/**
 * RECEIVING WHAT GROUNDWORK TELLS US.
 *
 * The other half of being a customer. We have pushed for months and subscribed
 * to nothing, so a released report had to be gone and found and a commitment
 * made in a check-in never reached the board somebody is measured on.
 */
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
    const row = await this.prisma.opsIntegration.findFirst({ select: { webhookSecret: true } });
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
    const id = eventId ?? (payload.id as string) ?? `unsigned-${Date.now()}`;

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
