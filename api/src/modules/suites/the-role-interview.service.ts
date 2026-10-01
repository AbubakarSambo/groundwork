import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ROLES_REFUSED } from './the-role-map.service';
import { INTERVIEW_INVITATION, ROLE_INTERVIEW_KIND } from '../assistant/the-role-interview';

export const INTERVIEW_REFUSED = {
  nobodyNamed: 'Say which person, or which role, the role interview is for.',
  noSuchPerson: 'I cannot find that person in your organisation.',
  noSuchRole: 'I cannot find that role in your organisation.',
  noRoleYet: 'That person does not hold a role yet, so there is nothing to ask them about. Say which role the interview is about.',
};

export interface Reader { userId: string; organizationId: string }
export interface SentTo { personId: string; name: string; roleName: string }
export interface NotSent { name: string; why: string }
export interface AnInterviewSent { sent: SentTo[]; notSent: NotSent[] }

const keyOf = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * SENDING THE ROLE INTERVIEW (request 25). An admin sends it to a person, or to everybody who holds a
 * role. It waits for each of them in Ask Groundwork as one request, and nothing is asked of anybody
 * by email. Only an admin may send it, decided here on the server. What people answer is written by
 * the assistant lane (assistant/the-role-interview.ts) and only after they have said yes.
 *
 * WHO READS THE ANSWERS: the admin, on the role map (the-role-map.service.ts), and the person
 * themselves, here. A colleague and a lead who is not an admin read neither.
 */
@Injectable()
export class RoleInterviewService {
  constructor(private readonly prisma: PrismaService) {}

  async send(reader: Reader, input: { personId?: string; roleName?: string }): Promise<AnInterviewSent> {
    await this.admitAdmin(reader);
    const org = reader.organizationId;
    const personId = input.personId?.trim();
    const roleName = input.roleName?.trim();
    if (!personId && !roleName) throw new BadRequestException(INTERVIEW_REFUSED.nobodyNamed);

    const [roles, assignments, people] = await Promise.all([
      this.prisma.role.findMany({ where: { organizationId: org }, select: { key: true, name: true } }),
      this.prisma.roleAssignment.findMany({ where: { organizationId: org, endedAt: null }, select: { personExternalId: true, roleName: true } }),
      this.prisma.person.findMany({
        where: { organizationId: org, active: true },
        select: { externalId: true, displayName: true, givenName: true, familyName: true, title: true, linkedUserId: true },
      }),
    ]);
    const nameOf = (p: any) => (p.displayName?.trim() || [p.givenName, p.familyName].filter(Boolean).join(' ').trim() || 'A person');
    /* A role is known by its name, however the organisation's system also keys it. */
    const canonical = (n: string) => {
      const hit = (roles as any[]).find((r) => keyOf(r.name) === keyOf(n) || keyOf(r.key) === keyOf(n));
      return (hit?.name ?? n).trim();
    };
    const held = (p: any): string[] => [...new Set([
      ...(assignments as any[]).filter((a) => a.personExternalId === p.externalId).map((a) => canonical(a.roleName)),
      ...(p.title?.trim() ? [canonical(p.title)] : []),
    ])];

    const pairs: { person: any; role: string }[] = [];
    if (personId) {
      const person = (people as any[]).find((p) => p.externalId === personId);
      if (!person) throw new NotFoundException(INTERVIEW_REFUSED.noSuchPerson);
      const theirs = roleName ? [canonical(roleName)] : held(person);
      if (theirs.length === 0) throw new BadRequestException(INTERVIEW_REFUSED.noRoleYet);
      for (const r of theirs) pairs.push({ person, role: r });
    } else {
      const wanted = canonical(roleName!);
      if (!(roles as any[]).some((r) => keyOf(r.name) === keyOf(wanted)) && !(people as any[]).some((p) => held(p).some((h) => keyOf(h) === keyOf(wanted)))) {
        throw new NotFoundException(INTERVIEW_REFUSED.noSuchRole);
      }
      for (const p of people as any[]) if (held(p).some((h) => keyOf(h) === keyOf(wanted))) pairs.push({ person: p, role: wanted });
    }

    const out: AnInterviewSent = { sent: [], notSent: [] };
    for (const { person, role } of pairs) {
      const name = nameOf(person);
      if (!person.linkedUserId) { out.notSent.push({ name, why: `${name} has not signed in yet, so there is nowhere to ask them.` }); continue; }
      const waiting = await this.prisma.assistantProposal.findMany({
        where: { organizationId: org, personExternalId: person.externalId, kind: ROLE_INTERVIEW_KIND, state: 'PARKED' },
        select: { payload: true },
      });
      if ((waiting as any[]).some((w) => keyOf(w.payload?.roleName ?? '') === keyOf(role))) {
        out.notSent.push({ name, why: `${name} already has the role interview waiting for ${role}.` });
        continue;
      }
      await this.prisma.assistantProposal.create({
        data: {
          organizationId: org, personExternalId: person.externalId, kind: ROLE_INTERVIEW_KIND, summary: INTERVIEW_INVITATION(role),
          payload: { roleName: role, answered: 0, answers: {}, sentByUserId: reader.userId } as never,
        },
      });
      out.sent.push({ personId: person.externalId, name, roleName: role });
    }
    return out;
  }

  /** The answers this person gave, read by them and by nobody else through this route. */
  async mine(reader: Reader) {
    const me = await this.prisma.person.findFirst({
      where: { organizationId: reader.organizationId, linkedUserId: reader.userId },
      select: { externalId: true },
    });
    if (!me) return { answers: [] };
    const rows = await this.prisma.roleInterviewAnswer.findMany({
      where: { organizationId: reader.organizationId, personExternalId: me.externalId },
      select: { roleName: true, owns: true, decides: true, dependsOn: true, dependedOnBy: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return { answers: rows };
  }

  private async admitAdmin(reader: Reader) {
    const m = await this.prisma.organizationMembership.findUnique({
      where: { userId_organizationId: { userId: reader.userId, organizationId: reader.organizationId } },
      select: { role: true },
    });
    if (m?.role !== 'ADMIN') throw new ForbiddenException(ROLES_REFUSED.onlyAnAdmin);
  }
}
