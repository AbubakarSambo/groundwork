import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from '../billing/billing.service';
import { AuthService } from '../auth/auth.service';

/**
 * THE ORGANISATION'S OWN INVITE LINK (A3 #/j/baridi and A4 "Baridi's invite link"; U.3).
 *
 * Hafsah, 26 September: one link per organisation, as in the prototype; joining through it gives
 * "Takes part"; an admin can turn it off, which makes a new link. So the link is the prototype's
 * /j/<organisation> shape with a random part, "baridi-7k2p": readable, but not guessable from the
 * name alone, and a new random part every time it is turned on, so turning it off kills the old one.
 *
 * What a stranger holding the link may read: the organisation's name and the name of the admin who
 * shared it. Never a head count, never who else is there.
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
    if (!org) throw new NotFoundException('Organisation not found');
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
      ? await this.prisma.organization.findUnique({ where: { inviteLinkCode: code }, select: { id: true, name: true } })
      : null;
    if (!org) throw new ForbiddenException('That invite link is not open any more. Ask whoever sent it for the new one.');
    const already = await this.prisma.organizationMembership.findUnique({
      where: { userId_organizationId: { userId, organizationId: org.id } }, select: { id: true },
    });
    if (!already) {
      const room = await this.billing.canInviteMember(org.id);
      if (!room.allowed) {
        throw new BadRequestException(`${org.name} has no room for another person on its plan right now. Ask an admin there to make room, or to invite you when there is.`);
      }
      await this.prisma.organizationMembership.create({ data: { userId, organizationId: org.id, role: 'MEMBER' as any, joinedHow: 'link' } });
    }
    return this.auth.switchOrganization(userId, org.id, via);
  }
}
