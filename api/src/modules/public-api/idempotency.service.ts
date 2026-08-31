import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createHash } from 'crypto';

/** The contract's window. A retry outside it is a new call, which is the honest answer. */
const WINDOW_HOURS = 24;

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
  ): Promise<T> {
    /* No key offered means the caller is not asking for the guarantee, and inventing one for them
       would be a promise they did not make and cannot rely on. */
    if (!key?.trim()) return work();

    const k = key.trim();
    const since = new Date(Date.now() - WINDOW_HOURS * 3_600_000);
    const fingerprint = createHash('sha256').update(JSON.stringify(body ?? null)).digest('hex');

    await this.assertKeyNotReusedElsewhere(organizationId, k, endpoint);

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
  private async assertKeyNotReusedElsewhere(organizationId: string, key: string, endpoint: string) {
    const elsewhere = await this.prisma.idempotencyRecord.findFirst({
      where: { organizationId, key, endpoint: { not: endpoint } },
    });
    if (elsewhere) {
      throw new ConflictException(`Idempotency-Key ${key} was already used for ${elsewhere.endpoint}.`);
    }
  }
}
