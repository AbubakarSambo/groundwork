import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from '../billing/billing.service';
import { AuthService } from '../auth/auth.service';
import { theDomainOf, effectiveJoinDomain } from '../../common/an-email-domain';

/**
 * THE ORGANISATION'S OWN INVITE LINK (A3 #/j/baridi and A4 "Baridi's invite link"; U.3).
 *
 * Hafsah, 26 September: one link per organisation, as in the prototype; joining through it gives
 * "Takes part"; an admin can turn it off, which makes a new link. So the link is the prototype's
 * /j/<organisation> shape with a random part, "baridi-7k2p": readable, but not guessable from the
 * name alone, and a new random part every time it is turned on, so turning it off kills the old one.
 * `aNewCode` already draws its random part from `crypto.randomBytes`, which is not guessable from
 * the organisation's name; nothing here needed to change to make the link random (item 11).
 *
 * What a stranger holding the link may read: the organisation's name and the name of the admin who
 * shared it. Never a head count, never who else is there.
 *
 * A STRANGER'S DOMAIN WAITS FOR AN ADMIN (Hafsah, 29 September, item 11; no DNS proof for now, as
 * decided). The link is meant for this organisation's own people, but it can be forwarded or found.
 * Someone joining through it whose email domain does not match the organisation's own is not made a
 * member on the spot: a `MembershipRequest` is raised, the same queue the check-in invitation flow
 * already uses (`nobody-joins-your-company-by-being-invited-to-a-check-in.ts`), and an admin has to
 * let them in (`WhoIsWaitingAtTheDoorService.approve`).
 *
 * "THE ORGANISATION'S OWN" DOMAIN (30 September, item 3): `effectiveJoinDomain`
 * (`common/an-email-domain.ts`), the same one shown on the People page's "Who can join" - the
 * domain of `Organization.email` (the founding address) until an admin names a different one
 * (`UsersService.changeJoinDomain`). This check is independent of the domain-JOIN switch
 * (`UsersService.joiningByDomain`'s `on`): the switch decides whether anyone with that domain may
 * join WITHOUT an invitation; this decides whether somebody arriving WITH the invite link, but
 * from a different domain, still waits for an admin. Skipped only when there is no such domain at
 * all - the founding address is on a public mail service and nobody has named one - because then
 * there is no real domain to compare against, so nobody waits for want of one. This is
 * client-visible as `queuedForApproval` on the join response, the same shape the invite page
 * already reads for the check-in flow.
 */
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

export function aNewCode(name: string): string {
  const base = (name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 24) || 'join';
  const part = [...crypto.randomBytes(4)].map((b) => ALPHABET[b % ALPHABET.length]).join('');
  return `${base}-${part}`;
}

@Injectable()
export class TheOrganisationInviteLinkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: BillingService,
    @Inject(forwardRef(() => AuthService)) private readonly auth: AuthService,
  ) {}

  /** For the admin: whether it is on, and its code. */
  async state(organizationId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { inviteLinkCode: true } });
    return { on: !!org?.inviteLinkCode, code: org?.inviteLinkCode ?? null };
  }

  /** On makes a NEW code; off clears it, so the old link stops working at once. */
  async set(organizationId: string, adminId: string, on: boolean) {
    if (!on) {
      await this.prisma.organization.update({ where: { id: organizationId }, data: { inviteLinkCode: null, inviteLinkByUserId: null } });
      return this.state(organizationId);
    }
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } });
    if (!org) throw new NotFoundException('We could not find that organisation, so sign in again and try once more.');
    for (let i = 0; i < 5; i += 1) {
      const code = aNewCode(org.name);
      const taken = await this.prisma.organization.findFirst({ where: { inviteLinkCode: code }, select: { id: true } });
      if (taken) continue;
      await this.prisma.organization.update({ where: { id: organizationId }, data: { inviteLinkCode: code, inviteLinkByUserId: adminId } });
      return this.state(organizationId);
    }
    throw new BadRequestException('A new link could not be made just now. Try again.');
  }

  /** For anybody holding the link: the organisation's name and who shared it. Null when it is off. */
  async preview(code: string) {
    const org = code
      ? await this.prisma.organization.findUnique({ where: { inviteLinkCode: code }, select: { name: true, inviteLinkByUserId: true } })
      : null;
    if (!org) return { open: false as const };
    const by = org.inviteLinkByUserId
      ? await this.prisma.user.findUnique({ where: { id: org.inviteLinkByUserId }, select: { firstName: true, lastName: true, isActive: true } })
      : null;
    const inviter = by && by.isActive ? [by.firstName, by.lastName].filter(Boolean).join(' ').trim() || null : null;
    return { open: true as const, organisationName: org.name, inviterName: inviter };
  }

  /** "Join <organisation>": as "Takes part", through the plan's seat check, then into it. */
  async join(code: string, userId: string, via: any = 'password') {
    const org = code
      ? await this.prisma.organization.findUnique({ where: { inviteLinkCode: code }, select: { id: true, name: true, email: true, joinDomain: true } })
      : null;
    if (!org) throw new ForbiddenException('That invite link is not open any more. Ask whoever sent it for the new one.');
    const already = await this.prisma.organizationMembership.findUnique({
      where: { userId_organizationId: { userId, organizationId: org.id } }, select: { id: true },
    });
    if (already) return this.auth.switchOrganization(userId, org.id, via);

    const alreadyWaiting = await this.prisma.membershipRequest.findUnique({
      where: { organizationId_userId: { organizationId: org.id, userId } }, select: { status: true },
    });
    if (alreadyWaiting?.status === 'PENDING') {
      return { queuedForApproval: true as const, organisationName: org.name };
    }

    /*
     * SOMEONE FROM OUTSIDE THE DOMAIN WAITS FOR AN ADMIN (item 11): see the class comment.
     *
     * THE SAME DOMAIN "WHO CAN JOIN" MEANS (30 September, item 3): `effectiveJoinDomain`, not a
     * fresh read of `org.email`'s own domain - so an admin who has named or changed the domain on
     * the People page changes what the invite link checks too, not only the domain-join switch.
     */
    const joiner = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    const orgDomain = effectiveJoinDomain(org);
    const orgHasARealDomain = !!orgDomain;
    const matchesTheDomain = !orgHasARealDomain || orgDomain === theDomainOf(joiner?.email);
    if (!matchesTheDomain) {
      await this.prisma.membershipRequest.upsert({
        where: { organizationId_userId: { organizationId: org.id, userId } },
        create: { organizationId: org.id, userId, email: (joiner?.email ?? '').toLowerCase(), viaInvitation: false },
        update: {},
      });
      return { queuedForApproval: true as const, organisationName: org.name };
    }

    const room = await this.billing.canInviteMember(org.id);
    if (!room.allowed) {
      throw new BadRequestException(`${org.name} has no room for another person on its plan right now. Ask an admin there to make room, or to invite you when there is.`);
    }
    await this.prisma.organizationMembership.create({ data: { userId, organizationId: org.id, role: 'MEMBER' as any, joinedHow: 'link' } });
    return this.auth.switchOrganization(userId, org.id, via);
  }
}
