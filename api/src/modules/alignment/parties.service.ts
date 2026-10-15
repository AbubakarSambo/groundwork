import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GroundsService } from '../grounds';
import {
  Party,
  Side,
  mayActFor,
  whatThisPartyMayDo,
  howTheSidesRead,
  aReleasedReportOutlivesTheSubscription,
} from './a-party-is-an-organisation';

/**
 * THE TWO SIDES OF A CHECK-IN, AND WHO SAYS WHO TAKES PART.
 *
 * The rules are in `a-party-is-an-organisation.ts`. Two things about this file
 * matter more than what it does:
 *
 *   IT ADDS NO NEW WAY TO REACH DATA. Designating somebody goes through the
 *   existing invitation, unchanged — same email, same token, same guest membership,
 *   same tenant checks underneath. What is new is WHO may ask for it, and that is
 *   decided by `mayActFor` before anything is called.
 *
 *   IT SCOPES BY THE CHECK-IN, NEVER BY THE PARTY. A party row says somebody has
 *   standing on one check-in. Every read here starts from a groundId and confirms
 *   the caller's relationship to THAT ground. There is no query in this file that
 *   returns anything because of who a party is, which is the property that keeps a
 *   party from becoming a key to somebody else's tenancy.
 */
@Injectable()
export class PartiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly grounds: GroundsService,
  ) {}

  /** Name a side. The one that opened the check-in is named from its own organisation. */
  async name(
    callerOrganizationId: string,
    userId: string,
    groundId: string,
    dto: { side: Side; name: string; organizationId?: string },
  ) {
    const ground = await this.prisma.ground.findFirst({
      where: { id: groundId, organizationId: callerOrganizationId },
      select: { id: true, organizationId: true },
    });
    /* Named from inside the check-in's own organisation. The other side naming
       itself into somebody's check-in is not a thing that should be possible. */
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');

    if (dto.side === 'the side that set it up' && dto.organizationId && dto.organizationId !== ground.organizationId) {
      throw new BadRequestException('The side that set this up is the organisation it lives in.');
    }

    return this.prisma.groundParty.upsert({
      where: { groundId_side: { groundId, side: dto.side } },
      create: {
        groundId,
        side: dto.side,
        name: dto.name,
        organizationId:
          dto.side === 'the side that set it up' ? ground.organizationId : dto.organizationId ?? null,
        namedByUserId: userId,
      },
      update: { name: dto.name, organizationId: dto.organizationId ?? undefined },
      select: { id: true, side: true, name: true, organizationId: true },
    });
  }

  /**
   * A party says which of its own people take part.
   *
   * The authorisation is `mayActFor` and it is the whole of the new surface. What
   * happens after it is the invitation that has always existed.
   */
  async designate(
    caller: { organizationId: string; userId: string },
    groundId: string,
    partyId: string,
    people: { email: string; roleAsDescribed?: string }[],
  ) {
    const party = await this.prisma.groundParty.findFirst({
      where: { id: partyId, groundId },
      include: { ground: { select: { organizationId: true, initiatorId: true } } },
    });
    if (!party) throw new NotFoundException('No such party on this check-in.');

    const allowed = mayActFor(this.asParty(party), caller, party.ground.organizationId);
    if (!allowed.may) throw new ForbiddenException(allowed.because);

    if (!people?.length) throw new BadRequestException('Say who takes part.');

    const added = [];
    for (const person of people) {
      /* Through the invitation that already exists: same email, same token, same
         guest membership, same checks. Acting AS the check-in, because that is
         whose invitation it is — the standing to ask was settled above. */
      const result = await this.grounds.addParticipant(
        groundId,
        party.ground.organizationId,
        party.ground.initiatorId,
        { email: person.email, roleAsDescribed: person.roleAsDescribed } as any,
      );
      added.push({ email: person.email, invited: !!result });
    }

    return { party: party.name, added };
  }

  /** The sides, said plainly, with neither described as owning it. */
  async sides(callerOrganizationId: string, groundId: string) {
    const ground = await this.prisma.ground.findFirst({
      where: { id: groundId },
      select: { organizationId: true, parties: true },
    });
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');

    /* Readable by either side — which is the point of parties — and by nobody
       else. A caller from a third organisation gets the same answer as a stranger. */
    const isASide =
      ground.organizationId === callerOrganizationId
      || ground.parties.some((p) => p.organizationId === callerOrganizationId);
    if (!isASide) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');

    const parties = ground.parties.map(this.asParty);
    return {
      says: howTheSidesRead(parties),
      parties: parties.map((p) => ({ id: p.id, side: p.side, name: p.name, hasAnAccountHere: p.organizationId !== null })),
      eachMay: whatThisPartyMayDo(),
      andAfterwards: aReleasedReportOutlivesTheSubscription(),
    };
  }

  private asParty = (p: {
    id: string; groundId: string; side: string; name: string; organizationId: string | null;
  }): Party => ({
    id: p.id,
    groundId: p.groundId,
    side: p.side as Side,
    name: p.name,
    organizationId: p.organizationId,
  });
}
