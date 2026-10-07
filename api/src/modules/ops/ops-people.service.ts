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
import {
  OpsCapability,
  DEFAULT_GRANTS,
  can,
  isAKnownCapability,
  OPS_CAPABILITIES,
  everyRole,
} from './what-somebody-may-do';
import { OpsFunctionalRole } from '@prisma/client';
import { rollOutNewCapabilities } from './a-new-capability-reaches-the-people-who-should-have-it';
import {
  GRANTS_FOR_A_PLATFORM_ADMIN,
  ROLE_FOR_A_PLATFORM_ADMIN,
  keyForAccount,
  nameForAccount,
} from './a-platform-admin-is-on-the-team';

/** What the product's auth layer knows about the caller. Nothing more is read. */
export interface SignedInAccount {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  isPlatformAdmin?: boolean | null;
}

/** The person id of an identity held in memory for a read. Nothing is written under it. */
export const NOT_YET_ON_THE_ROSTER = 'not-yet-on-the-roster';

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

  /**
   * The ops identity behind a signed-in account, or null if there isn't one.
   *
   * The account is passed whole rather than as an id, so the ops system never
   * has to read the product's user table to answer a question about its own
   * membership. `OpsPerson.userId` remains the single link, and it is still a
   * plain column with no foreign key.
   */
  async identify(account: SignedInAccount | undefined, opts: { admit?: boolean } = {}): Promise<OpsIdentity | null> {
    if (!account?.id) return null;
    const admit = opts.admit !== false;

    const person =
      (await this.prisma.opsPerson.findUnique({
        where: { userId: account.id },
        include: { grants: true },
      })) ??
      /* A second address of the same human. See OpsPersonAccount. */
      (await this.prisma.opsPersonAccount.findUnique({
        where: { userId: account.id },
        include: { person: { include: { grants: true } } },
      }))?.person ?? null;

    if (!person) {
      /* A platform admin is on this team by definition. See the note in
         `a-platform-admin-is-on-the-team.ts` for why that is not an escalation. */
      if (!account.isPlatformAdmin) return null;
      /*
       * A READ DOES NOT WRITE THE ROSTER (fix plan A15, as corrected by the audit). The 2026-09-05
       * decision stands: a platform admin is on the team, and is admitted with the CEO grants. What
       * changes is WHEN the row is written. A GET answers with the same identity held in memory; the
       * first request that changes anything, and the door's own setup, write the row. So opening
       * the back office to look does not put somebody on the roster who never did anything in it.
       */
      if (!admit) return this.whoTheyWouldBe(account);
      return this.admitThePlatformAdmin(account);
    }

    if (!person.active) return null;

    return {
      personId: person.id,
      key: person.key,
      displayName: person.displayName,
      functionalRole: person.functionalRole,
      capabilities: person.grants.map((g) => g.capability),
    };
  }

  /**
   * Makes the record, once, on first arrival.
   *
   * A real OpsPerson rather than a borrowed identity: half this system points at
   * a person — attributions, commitments, targets, who approved what — and an
   * identity with no row behind it would break every one of those the moment it
   * did anything.
   *
   * Deactivated later, this does not resurrect them: `active: false` clears
   * `userId`, so the next arrival has no link and lands here again — which is
   * why the key is checked as well. Somebody taken off the team on purpose stays
   * off, and gets the ordinary refusal.
   */
  /** The identity a platform admin with no row would be given, without giving it. */
  private async whoTheyWouldBe(account: SignedInAccount): Promise<OpsIdentity | null> {
    const key = keyForAccount(account.email ?? '');
    const already =
      (account.email
        ? await this.prisma.opsPerson.findUnique({ where: { email: account.email.toLowerCase() }, include: { grants: true } })
        : null) ?? (await this.prisma.opsPerson.findUnique({ where: { key }, include: { grants: true } }));
    if (already) {
      if (!already.active) return null;
      return { personId: already.id, key: already.key, displayName: already.displayName, functionalRole: already.functionalRole, capabilities: already.grants.map((g) => g.capability) };
    }
    return {
      personId: NOT_YET_ON_THE_ROSTER,
      key,
      displayName: nameForAccount({ email: account.email ?? '', firstName: account.firstName, lastName: account.lastName }),
      functionalRole: ROLE_FOR_A_PLATFORM_ADMIN,
      capabilities: [...GRANTS_FOR_A_PLATFORM_ADMIN],
    };
  }

  private async admitThePlatformAdmin(account: SignedInAccount): Promise<OpsIdentity | null> {
    const key = keyForAccount(account.email ?? '');

    /*
     * MATCHED ON THE ADDRESS FIRST, THEN ON THE KEY.
     *
     * The key is made from the local part of the address, so one human with two
     * addresses gets two keys and — before this — two people. Found by the one
     * board, which listed Hafsah and Hafsah Jumare as separate rows of the same
     * team: the seeded person carried one address and she signed in with
     * another, so nothing matched and a twin was created.
     *
     * The email is a real identity and a unique column, so matching on it is a
     * fact rather than a guess. What is NOT attempted is matching on the name:
     * two people called Hafsah would be merged by it, and merging the wrong two
     * people silently reassigns somebody's contribution — the one mistake this
     * system exists to make impossible. A human the address cannot connect stays
     * a second row, visibly, on a board that shows the whole team at once.
     */
    const already =
      (account.email
        ? await this.prisma.opsPerson.findUnique({
            where: { email: account.email.toLowerCase() },
            include: { grants: true },
          })
        : null) ??
      (await this.prisma.opsPerson.findUnique({
        where: { key },
        include: { grants: true },
      }));
    if (already) {
      if (!already.active) return null;
      /* The record exists and was not linked to this account — link it rather
         than making a second person for the same human. */
      await this.prisma.opsPerson.update({
        where: { id: already.id },
        data: { userId: account.id },
      });
      this.logger.warn(
        `${already.displayName} signed in as ${account.email} and was linked to the existing record rather than given a second one.`,
      );
      return {
        personId: already.id,
        key: already.key,
        displayName: already.displayName,
        functionalRole: already.functionalRole,
        capabilities: already.grants.map((g) => g.capability),
      };
    }

    const person = await this.prisma.opsPerson.create({
      data: {
        key,
        displayName: nameForAccount({
          email: account.email ?? key,
          firstName: account.firstName,
          lastName: account.lastName,
        }),
        /*
         * THE ADDRESS, BECAUSE WITHOUT IT THEY DO NOT EXIST TO GROUNDWORK.
         *
         * This was left null, and the consequence was invisible until somebody
         * opened the assistant: `peopleFrom` skips anybody with no email, so an
         * auto-admitted person is never pushed, no Person is created in the
         * organisation, and the panel answers `visible: false` about somebody
         * who is plainly on the team. Found by driving the panel, not by
         * reading this.
         */
        email: account.email ?? null,
        userId: account.id,
        functionalRole: ROLE_FOR_A_PLATFORM_ADMIN,
        grants: { create: GRANTS_FOR_A_PLATFORM_ADMIN.map((capability) => ({ capability })) },
      },
      include: { grants: true },
    });

    this.logger.warn(
      `${account.email} is a platform admin and was not on the team. Admitted as ${person.displayName} (${person.key}).`,
    );

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
      await this.handWhatTheyOwnedToWhoeverHoldsTheRole(person.id, person.functionalRole);
    }

    return this.prisma.opsPerson.update({
      where: { id: person.id },
      data: { active, ...(active ? {} : { userId: null }) },
    });
  }

  /** The roles somebody can be given, and what each comes with. */
  /**
   * NOTHING STAYS OWNED BY SOMEBODY WHO HAS LEFT. Roadmap items, workstreams, objectives, key results
   * and open requests pass to whoever holds the same role, else to the CEO, else to anybody active.
   * A board pointing at a person no longer on the team is a board nobody acts on.
   */
  private async handWhatTheyOwnedToWhoeverHoldsTheRole(personId: string, role: OpsFunctionalRole) {
    const active = await this.prisma.opsPerson.findMany({ where: { active: true, id: { not: personId } }, orderBy: { createdAt: 'asc' } });
    const heir = active.find((p) => p.functionalRole === role) ?? active.find((p) => p.functionalRole === 'CEO') ?? active[0];
    if (!heir) return;
    await this.prisma.$transaction([
      this.prisma.opsRoadmapItem.updateMany({ where: { ownerId: personId }, data: { ownerId: heir.id } }),
      this.prisma.opsRoadmapItem.updateMany({ where: { proposedById: personId }, data: { proposedById: heir.id } }),
      this.prisma.opsWorkstream.updateMany({ where: { ownerPersonId: personId }, data: { ownerPersonId: heir.id } }),
      this.prisma.opsWorkstream.updateMany({ where: { oversightPersonId: personId }, data: { oversightPersonId: heir.id } }),
      this.prisma.opsWorkstream.updateMany({ where: { technicalPartnerPersonId: personId }, data: { technicalPartnerPersonId: heir.id } }),
      this.prisma.opsObjective.updateMany({ where: { ownerId: personId }, data: { ownerId: heir.id } }),
      this.prisma.opsKeyResult.updateMany({ where: { ownerId: personId }, data: { ownerId: heir.id } }),
      this.prisma.opsResourceRequest.updateMany({ where: { requesterId: personId, status: 'open' as any }, data: { requesterId: heir.id } }),
    ]);
    this.logger.warn(`What ${personId} owned now belongs to ${heir.displayName} (${heir.key}).`);
  }

  roles() {
    return everyRole();
  }

  /**
   * Change what somebody does.
   *
   * THE ROLE IS NOT THE ANSWER TO WHAT THEY MAY DO — the grants are, and they
   * stay rows. So this ADDS the new role's defaults and removes nothing: if
   * Sahar takes over product, she needs product:write, and whether she keeps
   * sales:write is a decision somebody should make on purpose rather than one
   * this call makes for them by silently stripping it.
   *
   * The capabilities she no longer needs are revoked one at a time on the same
   * page, which is the only way that can be a decision rather than a side
   * effect.
   */
  async changeRole(personKey: string, functionalRole: OpsFunctionalRole) {
    const person = await this.byKey(personKey);
    if (!DEFAULT_GRANTS[functionalRole]) {
      throw new BadRequestException(`${functionalRole} is not a role this system knows about`);
    }

    const updated = await this.prisma.opsPerson.update({
      where: { id: person.id },
      data: { functionalRole },
    });

    const added = await this.prisma.opsGrant.createMany({
      data: DEFAULT_GRANTS[functionalRole].map((capability) => ({
        personId: person.id,
        capability,
      })),
      skipDuplicates: true,
    });

    this.logger.warn(
      `${person.displayName} is now ${functionalRole} (was ${person.functionalRole}). ${added.count} capabilities added, none removed.`,
    );

    return {
      key: updated.key,
      functionalRole: updated.functionalRole,
      was: person.functionalRole,
      capabilitiesAdded: added.count,
      says:
        added.count === 0
          ? 'They already held everything that role comes with. Nothing was taken away.'
          : `${added.count} added. Nothing was taken away - revoke what they no longer need, one at a time, so it is a decision.`,
    };
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
