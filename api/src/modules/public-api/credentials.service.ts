import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { isScope } from './scopes';

/**
 * ISSUING AND REVOKING THE PAIRS A CUSTOMER'S SYSTEMS AUTHENTICATE WITH.
 *
 * The secret is generated here, hashed here, and returned exactly once. There is no path that reads
 * it back, and that is the feature: a credential a support engineer can recover is a credential an
 * attacker can ask a support engineer to recover.
 */
@Injectable()
export class CredentialsService {
  private readonly logger = new Logger(CredentialsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async issue(organizationId: string, name: string, scopes: string[], createdByUserId?: string, boundToPersonExternalIds: string[] = []) {
    if (!name?.trim()) throw new BadRequestException('A credential needs a name, so it can be revoked on purpose later.');
    const bad = (scopes ?? []).filter((s) => !isScope(s));
    if (bad.length) throw new BadRequestException(`Unknown scope(s): ${bad.join(', ')}`);
    if (!scopes?.length) throw new BadRequestException('A credential with no scopes can do nothing. Choose at least one.');

    /*
     * The client id is not secret and is safe to log, show and search on - it is how a customer and
     * we refer to the same integration when something is wrong. The prefixes exist so that a string
     * found in a log or a config file announces what it is.
     */
    const clientId = `gwc_${randomBytes(12).toString('hex')}`;
    const clientSecret = `gws_${randomBytes(32).toString('base64url')}`;

    const row = await this.prisma.apiCredential.create({
      data: {
        boundToPersonExternalIds,
        organizationId,
        name: name.trim(),
        clientId,
        clientSecretHash: await bcrypt.hash(clientSecret, 12),
        scopes,
        createdByUserId: createdByUserId ?? null,
      },
      select: { id: true, name: true, clientId: true, scopes: true, boundToPersonExternalIds: true, createdAt: true },
    });

    this.logger.log(`Issued credential ${clientId} ("${row.name}") for org ${organizationId}`);
    /* The only moment this value exists outside the customer's hands. */
    return { ...row, clientSecret };
  }

  async list(organizationId: string) {
    return this.prisma.apiCredential.findMany({
      where: { organizationId },
      select: { id: true, name: true, clientId: true, scopes: true, boundToPersonExternalIds: true, lastUsedAt: true, revokedAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * REVOKING IS A STAMP, NOT A DELETE. The row is how a customer's own log of "who called us" stays
   * readable after the credential is gone - deleting it would leave every past use pointing at
   * nothing, which is exactly the history somebody wants during an incident.
   */
  async revoke(organizationId: string, clientId: string) {
    const { count } = await this.prisma.apiCredential.updateMany({
      where: { organizationId, clientId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (!count) throw new NotFoundException('Credential not found');
    this.logger.log(`Revoked credential ${clientId} for org ${organizationId}`);
    return { revoked: true };
  }

  /**
   * THE CHECK ITSELF, and it is deliberately uniform in its failure.
   *
   * An unknown client id, a wrong secret and a revoked pair all return null. Telling them apart
   * would let anybody enumerate which client ids exist, and "revoked" in particular is a useful
   * thing for an attacker to learn: it says a real integration used to live here.
   *
   * The hash is compared even when no credential was found, so the answer takes about as long
   * either way. Without it the endpoint reports the existence of a client id by how fast it says no.
   */
  async verify(clientId: string, clientSecret: string) {
    const row = await this.prisma.apiCredential.findUnique({ where: { clientId } });
    const hash = row?.clientSecretHash ?? DUMMY_HASH;
    const ok = await bcrypt.compare(clientSecret ?? '', hash);
    if (!row || !ok || row.revokedAt) return null;
    return row;
  }

  /** Written on token issue rather than per request - see the schema note. */
  async stampUse(id: string) {
    await this.prisma.apiCredential.update({ where: { id }, data: { lastUsedAt: new Date() } });
  }
}

/**
 * A real bcrypt hash of a value nothing will ever send, so the comparison for a missing credential
 * costs what a real one costs. Generated once, at module load, rather than hardcoded, so it carries
 * no fixed string anybody could recognise.
 */
const DUMMY_HASH = bcrypt.hashSync(randomBytes(32).toString('hex'), 12);
