import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GroundsService } from './grounds.service';
import { companyPage, type CompanyPage } from './the-company-page';

/** Said to somebody from another company, added to one of this organisation's check-ins. */
export const NOT_YOUR_COMPANY = 'Only people in this organisation can read its company page.';

const WEEK_MS = 7 * 86_400_000;

/**
 * THE ONE READ OF THE COMPANY PAGE (D2, U.15). See the-company-page.ts for what it holds and never
 * holds.
 *
 * NOBODY IS SPECIAL BECAUSE OF THEIR TITLE (decision 3). What a reader is given comes from their
 * role in the organisation and the check-ins they may open, through the one rule for that
 * (`GroundsService.list`, who-may-read-this-check-in.ts). A chief executive who is an admin reads
 * what an admin reads; one who is a member reads what a member reads.
 */
@Injectable()
export class CompanyService {
  constructor(
    private prisma: PrismaService,
    private grounds: GroundsService,
  ) {}

  async forReader(reader: { userId: string; email: string; organizationId: string; role: string }): Promise<CompanyPage> {
    if (reader.role === 'GUEST') throw new ForbiddenException(NOT_YOUR_COMPANY);
    const org = reader.organizationId;
    const readsEverything = reader.role === 'ADMIN';
    const now = new Date();

    const [organisation, list, subjects, linked, memberships] = await Promise.all([
      this.prisma.organization.findUnique({ where: { id: org }, select: { name: true } }),
      this.grounds.list(org, reader.userId, reader.email, reader.role),
      this.prisma.subject.findMany({
        where: { organizationId: org },
        select: {
          id: true, externalId: true, type: true, title: true, measure: true, target: true,
          ownerExternalId: true, parentExternalId: true, syncedAt: true, sourceDeletedAt: true, createdAt: true,
        },
      }),
      this.prisma.ground.findMany({
        where: { organizationId: org, subjectExternalId: { not: null } },
        select: { id: true, subjectExternalId: true },
      }),
      this.prisma.organizationMembership.findMany({
        where: { organizationId: org, role: { not: 'GUEST' } },
        select: { team: true },
      }),
    ]);

    /* Only this organisation's check-ins: the list also carries other organisations' where the reader is a guest. */
    const mayOpen = ((list ?? []) as any[]).filter((g) => g.organizationId === org);

    const ownerIds = [...new Set((subjects as any[]).map((s) => s.ownerExternalId).filter(Boolean))] as string[];
    const people = ownerIds.length
      ? await this.prisma.person.findMany({
          where: { organizationId: org, externalId: { in: ownerIds } },
          select: { externalId: true, displayName: true, givenName: true, familyName: true },
        })
      : [];
    const owners = new Map<string, string>();
    for (const p of people as any[]) {
      const name = (p.displayName || [p.givenName, p.familyName].filter(Boolean).join(' ')).trim();
      if (name) owners.set(p.externalId, name);
    }

    const teams = new Set((memberships as any[]).map((m) => (m.team ?? '').trim().toLowerCase()).filter(Boolean)).size;
    const checkInsThisWeek = readsEverything
      ? mayOpen.reduce((n, g) => n + (g.checkIns ?? []).filter((c: any) =>
          c.status === 'COMPLETED' && !c.isSetup && c.completedAt && now.getTime() - new Date(c.completedAt).getTime() <= WEEK_MS).length, 0)
      : null;

    return companyPage({
      name: organisation?.name ?? '',
      readsEverything,
      subjects: subjects as any,
      owners,
      linkedGrounds: (linked as any[]).map((g) => ({ id: g.id, subjectExternalId: g.subjectExternalId })),
      mayOpen,
      counts: { teams, people: memberships.length, checkInsThisWeek },
      now,
    });
  }
}
