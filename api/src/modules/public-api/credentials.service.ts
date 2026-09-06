import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { fromTheCredentialName, whyThisIsNotASourceSystem } from '../people/whose-roster-is-this';
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

  async issue(
    organizationId: string,
    name: string,
    scopes: string[],
    createdByUserId?: string,
    boundToPersonExternalIds: string[] = [],
    sourceSystem?: string,
    /**
     * WHETHER THAT SOURCE SYSTEM CAME FROM A PERSON OR FROM A ROW WE ALREADY WROTE.
     *
     * The rule about lower-case letters and hyphens is about something somebody types twice. It
     * must not be applied to a value carried from an existing credential: every credential issued
     * before the source system was split from the client id was backfilled with its own client id,
     * which contains an underscore — so validating an inherited one made every legacy credential
     * impossible to replace. Found by a test that finally used a realistic fixture.
     */
    inherited = false,
  ) {
    if (!name?.trim()) throw new BadRequestException('A credential needs a name, so it can be revoked on purpose later.');
    const bad = (scopes ?? []).filter((s) => !isScope(s));
    if (bad.length) throw new BadRequestException(`Unknown scope(s): ${bad.join(', ')}`);
    if (!scopes?.length) throw new BadRequestException('A credential with no scopes can do nothing. Choose at least one.');

    /*
     * The client id is not secret and is safe to log, show and search on - it is how a customer and
     * we refer to the same integration when something is wrong. The prefixes exist so that a string
     * found in a log or a config file announces what it is.
     */
    /*
     * THE SOURCE SYSTEM IS NOT THE CLIENT ID, and the difference is a rotated credential not
     * duplicating the entire roster. Derived from the name when nobody says, because a customer
     * calling one "Workday sync" plainly means Workday — and asking them to say it twice is how
     * the two drift. See `people/whose-roster-is-this.ts`.
     */
    const source = sourceSystem?.trim() || fromTheCredentialName(name);
    if (!inherited) {
      const notASystem = whyThisIsNotASourceSystem(source);
      if (notASystem) throw new BadRequestException(notASystem);
    }

    const clientId = `gwc_${randomBytes(12).toString('hex')}`;
    const clientSecret = `gws_${randomBytes(32).toString('base64url')}`;

    const row = await this.prisma.apiCredential.create({
      data: {
        boundToPersonExternalIds,
        organizationId,
        name: name.trim(),
        clientId,
        sourceSystem: source,
        clientSecretHash: await bcrypt.hash(clientSecret, 12),
        scopes,
        createdByUserId: createdByUserId ?? null,
      },
      select: { id: true, name: true, clientId: true, sourceSystem: true, scopes: true, boundToPersonExternalIds: true, createdAt: true },
    });

    this.logger.log(`Issued credential ${clientId} ("${row.name}") for org ${organizationId}`);
    /* The only moment this value exists outside the customer's hands. */
    return { ...row, clientSecret };
  }

  async list(organizationId: string) {
    return this.prisma.apiCredential.findMany({
      where: { organizationId },
      select: { id: true, name: true, clientId: true, sourceSystem: true, scopes: true, boundToPersonExternalIds: true, lastUsedAt: true, revokedAt: true, replacedByClientId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * REPLACING ONE, WHICH IS WHAT ROTATING ACTUALLY IS.
   *
   * There is no "rotate" here and there should not be: a credential's secret is hashed the moment
   * it is made, so nothing can hand back a new secret for an existing pair. Rotating is issue,
   * deploy, revoke — three steps, and the middle one is a person going away to change a config
   * file somewhere.
   *
   * DOING IT BY HAND HAD A TRAP IN IT. The roster is keyed on the credential's source system, which
   * is derived from its NAME when nobody says otherwise — so a replacement called "Workday sync
   * (new)" is a different system, and the next sync creates a second copy of every person. The
   * whole reason this method exists is that the successor inherits what the original said it spoke
   * for, rather than depending on somebody typing the same name twice.
   *
   * IT DOES NOT REVOKE THE OLD ONE. Between issuing and deploying, the integration is still using
   * it; cutting it off here would mean every rotation is an outage. It is marked as replaced
   * instead, so the page can ask for the second step rather than trusting anybody to remember it.
   */
  async replace(organizationId: string, clientId: string, createdByUserId?: string) {
    const old = await this.prisma.apiCredential.findFirst({
      where: { organizationId, clientId },
      select: {
        id: true, name: true, scopes: true, sourceSystem: true,
        boundToPersonExternalIds: true, revokedAt: true, replacedByClientId: true,
      },
    });
    if (!old) throw new NotFoundException('Credential not found');
    if (old.revokedAt) {
      throw new BadRequestException('That credential is already revoked. Issue a new one instead of replacing it.');
    }
    if (old.replacedByClientId) {
      throw new BadRequestException(
        `That credential has already been replaced by ${old.replacedByClientId}. Revoke this one once the new one is live.`,
      );
    }

    /* Everything the original spoke for, including the fence and the source system. */
    const issued = await this.issue(
      organizationId,
      old.name,
      old.scopes,
      createdByUserId,
      old.boundToPersonExternalIds,
      old.sourceSystem,
      /* Inherited, not typed. See `issue`. */
      true,
    );

    await this.prisma.apiCredential.update({
      where: { id: old.id },
      data: { replacedByClientId: issued.clientId },
    });

    return {
      ...issued,
      replaces: clientId,
      says:
        'This is the same integration under a new secret — it speaks for the same system, so your '
        + 'roster stays one roster. Put it live, then revoke the old one. The old one keeps working '
        + 'until you do.',
    };
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
