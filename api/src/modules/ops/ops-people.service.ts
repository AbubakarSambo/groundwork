import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpsCapability, DEFAULT_GRANTS, can } from './what-somebody-may-do';
import { OpsFunctionalRole } from '@prisma/client';

export interface OpsIdentity {
  personId: string;
  key: string;
  displayName: string;
  functionalRole: OpsFunctionalRole;
  capabilities: string[];
}

/**
 * Who is asking, and what they may do.
 *
 * Everything else in the ops system starts here. A signed-in Groundwork account
 * is how somebody proves they are themselves; it says nothing about what they
 * may do in the back office, which is what `ops_grants` is for. Somebody with an
 * account and no ops person record is simply not on this team.
 */
@Injectable()
export class OpsPeopleService {
  constructor(private readonly prisma: PrismaService) {}

  /** The ops identity behind a signed-in account, or null if there isn't one. */
  async identify(userId: string | undefined): Promise<OpsIdentity | null> {
    if (!userId) return null;

    const person = await this.prisma.opsPerson.findUnique({
      where: { userId },
      include: { grants: true },
    });
    if (!person || !person.active) return null;

    return {
      personId: person.id,
      key: person.key,
      displayName: person.displayName,
      functionalRole: person.functionalRole,
      capabilities: person.grants.map((g) => g.capability),
    };
  }

  /** Throws unless they hold the capability. The only way a route gets past a check. */
  assert(identity: OpsIdentity | null, capability: OpsCapability): OpsIdentity {
    if (!identity) {
      throw new ForbiddenException('You are not set up in the operating system');
    }
    if (!can(identity.capabilities, capability)) {
      throw new ForbiddenException(`This needs ${capability}`);
    }
    return identity;
  }

}
