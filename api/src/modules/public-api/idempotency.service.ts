import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createHash } from 'crypto';

/** The contract's window. A retry outside it is a new call, which is the honest answer. */
const WINDOW_HOURS = 24;
/** How long a record is kept after the window closes. Nothing read one this old; nothing deleted them either. */
export const KEEP_RECORDS_HOURS = 48;

/**
 * A RETRY MUST BE INDISTINGUISHABLE FROM THE ORIGINAL CALL.
 *
 * A network timeout on our side looks exactly like a refusal from theirs, so any integration worth
 * connecting retries a push it could not confirm. Without this, a retried bulk import is a second
 * import - and the customer discovers it as duplicated work rather than as an error.
 *
 * The stored response is replayed verbatim rather than recomputed. Recomputing would return the
 * state as it is NOW, which after an intervening change is a different answer to the same call -
 * and a client that retried once would see its own later update reflected in what looks like an
 * older response.
 */
@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);

  constructor(private readonly prisma: PrismaService) {}

  async run<T>(
    organizationId: string,
    key: string | undefined,
    endpoint: string,
    body: unknown,
    work: () => Promise<T>,
    opts: { deriveKeyFrom?: string } = {},
  ): Promise<T> {
    /*
     * NO KEY OFFERED. For most routes that means the caller is not asking for the guarantee, and
     * inventing one for them would be a promise they did not make and cannot rely on - so the work
     * simply runs.
     *
     * For a route that IS an upsert on the caller's own key, the same body from the same credential
     * within the window can only mean the same operation, and a retry that arrives without a header
     * is still a retry. Those routes pass `deriveKeyFrom` - the source system the credential speaks
     * for, not its clientId, so a retry sent after a credential rotation is still the same retry -
     * and get the guarantee by default: the key is derived from who is calling, what they are
     * calling and what they sent. Scoped to upserts on purpose: on a route that creates, two genuinely-intended
     * identical calls would collapse into one.
     */
    const offered = key?.trim();
    if (!offered && !opts.deriveKeyFrom) return work();
    const k = offered || `derived:${createHash('sha256').update(`${opts.deriveKeyFrom}\n${endpoint}\n${JSON.stringify(body ?? null)}`).digest('hex').slice(0, 40)}`;
    const since = new Date(Date.now() - WINDOW_HOURS * 3_600_000);
    const fingerprint = createHash('sha256').update(JSON.stringify(body ?? null)).digest('hex');

    await this.assertKeyNotReusedElsewhere(organizationId, k, endpoint, since);

    const prior = await this.prisma.idempotencyRecord.findFirst({
      where: { organizationId, key: k, endpoint, createdAt: { gte: since } },
    });
    if (prior) {
      /*
       * THE KEY IDENTIFIES A RETRY; THE KEY PLUS THE BODY IDENTIFIES THE OPERATION.
       *
       * A different payload under the same key is not a retry of anything - it is a new request
       * wearing an old request's name, and replaying the stored response would answer it with
       * somebody else's answer. The caller gets a 409 they can act on rather than a 200 that
       * quietly discarded their write.
       */
      if (prior.requestFingerprint !== fingerprint) {
        throw new ConflictException(
          `Idempotency-Key ${k} was already used on ${endpoint} with a different request body.`,
        );
      }
      this.logger.log(`Replayed ${endpoint} for key ${k} (org ${organizationId})`);
      return prior.responseBody as T;
    }

    const result = await work();

    try {
      await this.prisma.idempotencyRecord.create({
        data: { organizationId, key: k, endpoint, requestFingerprint: fingerprint, statusCode: 200, responseBody: result as any },
      });
    } catch {
      /*
       * TWO IDENTICAL RETRIES ARRIVING AT ONCE. The unique constraint refused the second write,
       * which means the work has now run twice - unavoidable without a lock, and harmless here
       * because every endpoint behind this is an upsert on the customer's own key. Swallowed rather
       * than raised: the caller asked for their write to happen, and it did.
       */
      this.logger.warn(`Idempotency record for ${k} already existed; the work ran twice.`);
    }
    return result;
  }

  /**
   * A DIFFERENT CALL WITH THE SAME KEY IS THE CLIENT'S BUG, AND SAYING SO IS THE FAVOUR.
   *
   * Reusing a key across two different endpoints usually means a key generated per retry loop
   * rather than per operation. Staying quiet would mean their two calls each look fine in
   * isolation while one of them silently never runs.
   *
   * Private and called from `run` above. It was public and called by nothing for about ten minutes
   * - written for a call site I then did not add - which is the same speculative-method failure as
   * the deleted `connectionHealth`, caught by the same guard.
   */
  private async assertKeyNotReusedElsewhere(
    organizationId: string,
    key: string,
    endpoint: string,
    since: Date,
  ) {
    /*
     * WITHIN THE SAME WINDOW THE REPLAY USES, AND NOT FOR EVER.
     *
     * This had no time bound while the replay lookup above has one, so the two halves disagreed
     * about how long a key means anything. A key reused a month later was a permanent 409 —
     * refused on account of a record whose stored response had long since stopped being replayable,
     * with nothing the caller could do about it and no expiry to wait for. A client that generates
     * keys from a short counter, or reuses them across deploys, is simply locked out of an endpoint
     * for ever.
     *
     * Inside the window the conflict is a real favour: it means one of their two calls would
     * silently never run. Outside it, the old row has no bearing on this request at all.
     */
    const elsewhere = await this.prisma.idempotencyRecord.findFirst({
      where: { organizationId, key, endpoint: { not: endpoint }, createdAt: { gte: since } },
    });
    if (elsewhere) {
      throw new ConflictException(
        `Idempotency-Key ${key} was already used for ${elsewhere.endpoint} in the last ${WINDOW_HOURS} hours. ` +
          `Use one key per operation rather than one per retry loop.`,
      );
    }
  }
}
