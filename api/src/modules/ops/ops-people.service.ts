import {
  Injectable,
  Logger,
  OnModuleInit,
  ForbiddenException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpsCapability, DEFAULT_GRANTS, can, isAKnownCapability, OPS_CAPABILITIES } from './what-somebody-may-do';
import { OpsFunctionalRole } from '@prisma/client';
import { rollOutNewCapabilities } from './a-new-capability-reaches-the-people-who-should-have-it';

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
export class OpsPeopleService implements OnModuleInit {
  private readonly logger = new Logger(OpsPeopleService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * A capability added to the code reaches the people whose role names it.
   *
   * Exactly once, and never again — see the file it calls for why a blanket
   * re-apply of the defaults would quietly hand back everything anybody had
   * revoked. Failure is logged rather than thrown: a grant that did not roll
   * out is a feature nobody can reach, and an API that will not boot is every
   * feature nobody can reach.
   */
  async onModuleInit() {
    try {
      const { granted, capabilities } = await rollOutNewCapabilities(this.prisma);
      if (capabilities.length === 0) return;
      /*
       * Logged even at zero. A roll-out that records a capability as handed out
       * and hands it to nobody is the exact failure this whole file exists to
       * end, and it must not be the quiet case.
       */
      this.logger.log(
        `Rolled out ${capabilities.length} capability/capabilities (${capabilities.join(', ')}): ${granted} grant rows written.`,
      );
    } catch (error) {
      this.logger.error(`Could not roll out new capabilities: ${(error as Error).message}`);
    }
  }

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

  /**
   * Everybody on the team, with what each holds.
   *
   * Grants are listed in full rather than summarised as a role, because a role
   * is what somebody was hired as and a grant is what they can actually do —
   * and the whole point of keeping them apart is being able to see when they
   * have come apart.
   */
  async everybody() {
    const people = await this.prisma.opsPerson.findMany({
      include: { grants: true },
      orderBy: [{ active: 'desc' }, { displayName: 'asc' }],
    });

    return people.map((p) => ({
      id: p.id,
      key: p.key,
      displayName: p.displayName,
      email: p.email,
      functionalRole: p.functionalRole,
      active: p.active,
      /** Whether they can actually sign in. Nothing else reads through this. */
      hasAnAccount: p.userId !== null,
      capabilities: p.grants.map((g) => g.capability).sort(),
      /*
       * A person with no grants is on the team and can do nothing — which is
       * either somebody mid-onboarding or somebody who was quietly stripped,
       * and both are worth seeing rather than having to notice.
       */
      holdsNothing: p.grants.length === 0,
    }));
  }

  async addPerson(input: {
    key: string;
    displayName: string;
    email?: string;
    functionalRole: OpsFunctionalRole;
  }) {
    const existing = await this.prisma.opsPerson.findUnique({ where: { key: input.key } });
    if (existing) {
      throw new ConflictException(
        `${existing.displayName} already has the handle ${input.key}. Reactivate them rather than adding a second record.`,
      );
    }

    const person = await this.prisma.opsPerson.create({ data: input });
    await this.grantRoleDefaults(person.id, input.functionalRole);
    return person;
  }

  /**
   * Grants a capability, one at a time and on the record.
   *
   * Not a "set these grants" call. Replacing the whole set means an accidental
   * omission silently revokes something, and revoking is the operation that
   * should be hardest to do by accident.
   */
  async grant(personKey: string, capability: string, grantedBy: string) {
    if (!isAKnownCapability(capability)) {
      throw new BadRequestException(`${capability} is not a capability this system has`);
    }
    const person = await this.byKey(personKey);

    return this.prisma.opsGrant.upsert({
      where: { personId_capability: { personId: person.id, capability } },
      update: {},
      create: { personId: person.id, capability, grantedBy },
    });
  }

  async revoke(personKey: string, capability: string) {
    const person = await this.byKey(personKey);

    /*
     * Refuses to remove the last holder of an approval capability. Somebody has
     * to be able to decide, and a system where nobody can approve spend is one
     * where every claim strands silently — which we have already watched happen
     * once, from the other direction.
     */
    if (capability.endsWith(':approve')) {
      const holders = await this.prisma.opsGrant.count({ where: { capability } });
      if (holders <= 1) {
        throw new ConflictException(
          `${person.displayName} is the only person who holds ${capability}. Give it to somebody else first, or nothing of that kind can ever be decided again.`,
        );
      }
    }

    await this.prisma.opsGrant.deleteMany({
      where: { personId: person.id, capability },
    });
    return { revoked: capability, from: person.key };
  }

  /**
   * A person who has left keeps their record and loses their grants.
   *
   * Deleting them would take their attributions, their commitments and their
   * name off every timeline they appear in — which is exactly the history
   * somebody asks about after they go.
   */
  async setActive(personKey: string, active: boolean) {
    const person = await this.byKey(personKey);

    if (!active) {
      await this.prisma.opsGrant.deleteMany({ where: { personId: person.id } });
    }

    return this.prisma.opsPerson.update({
      where: { id: person.id },
      data: { active, ...(active ? {} : { userId: null }) },
    });
  }

  private async byKey(key: string) {
    const person = await this.prisma.opsPerson.findUnique({ where: { key } });
    if (!person) throw new NotFoundException(`No one here called ${key}`);
    return person;
  }

  /**
   * Writes a role's default grants for somebody, without disturbing any they
   * already hold. Used when adding a person; never on a request path that
   * changes an existing one.
   */
  async grantRoleDefaults(personId: string, role: OpsFunctionalRole, grantedBy?: string) {
    await this.prisma.opsGrant.createMany({
      data: DEFAULT_GRANTS[role].map((capability) => ({ personId, capability, grantedBy })),
      skipDuplicates: true,
    });
  }

  /**
   * What somebody's agreement entitles them to. Nothing about equity.
   *
   * Separate from anything that reports contribution, because the two must not
   * be readable as one number: attribution establishes what happened, and this
   * establishes what was agreed.
   */
  agreementFor(personKey: string) {
    return this.prisma.opsContributorAgreement.findFirst({ where: { person: { key: personKey } } });
  }

  async setAgreement(
    personKey: string,
    input: { originatorSharePercent?: number | null; originatorShareMonths?: number | null; agreementNote?: string },
    updatedBy: string,
  ) {
    const person = await this.byKey(personKey);
    return this.prisma.opsContributorAgreement.upsert({
      where: { personId: person.id },
      update: { ...input, updatedBy },
      create: { personId: person.id, ...input, updatedBy },
    });
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
