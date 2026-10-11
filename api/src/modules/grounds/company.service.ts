import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GroundsService } from './grounds.service';
import { companyPage, type CompanyPage, type OwnerDetail } from './the-company-page';
import type { StoredPicture } from './the-company-picture';
import { theStrategyAsRead } from '../subjects/the-strategy-over-time';
import { keptForTheOrganisation, mayReadWhatIsKept } from '../knowledge/organisation-memory';
import { refuseSomeoneAwaitingTheOrganisation } from '../participants/held-for-a-seat';

/** Said on the page, so the people who read it can see who does. */
export const WHO_READS_WHAT_IS_KEPT = 'Admins, leads and anyone who runs a check-in can read this. Everyone else cannot.';

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
    return readTheCompanyPage(this.prisma, this.grounds, reader);
  }
}

/**
 * The company page as one reader may read it, from the database and nothing else. The page serves it, and Ask answers about the company from the
 * same read, so Ask never says more than the page shows that reader.
 */
export async function readTheCompanyPage(prisma: PrismaService, grounds: GroundsService, reader: { userId: string; email: string; organizationId: string; role: string }): Promise<CompanyPage> {
  if (reader.role === 'GUEST') throw new ForbiddenException(NOT_YOUR_COMPANY);
  /* Nor somebody still waiting for an admin to let them into the organisation: they are not in it yet (row 5, release check of 7 October). */
  await refuseSomeoneAwaitingTheOrganisation(prisma as any, reader.userId, NOT_YOUR_COMPANY);
  const org = reader.organizationId;
  const readsEverything = reader.role === 'ADMIN';
  const now = new Date();
  /* The company-wide picture, and what the organisation keeps, go to an admin, a lead and anybody who
     runs a check-in (decision 79, item 1). Somebody who only takes part reads the priorities alone. */
  const readsThePicture = await mayReadWhatIsKept(prisma, { userId: reader.userId, organizationId: org, role: reader.role }).catch(() => false);

  const [organisation, list, subjects, linked, memberships, stored] = await Promise.all([
    prisma.organization.findUnique({ where: { id: org }, select: { name: true } }),
    grounds.list(org, reader.userId, reader.email, reader.role),
    prisma.subject.findMany({
      where: { organizationId: org },
      select: {
        id: true, externalId: true, type: true, title: true, measure: true, target: true,
        ownerExternalId: true, parentExternalId: true, syncedAt: true, sourceDeletedAt: true, createdAt: true,
      },
    }),
    prisma.ground.findMany({
      where: { organizationId: org, subjectExternalId: { not: null } },
      select: { id: true, subjectExternalId: true },
    }),
    prisma.organizationMembership.findMany({
      where: { organizationId: org, role: { not: 'GUEST' } },
      select: { team: true },
    }),
    /* Only READ. The picture is written when the record changes (the-company-picture.service.ts), never here. */
    prisma.companyPicture.findUnique({ where: { organizationId: org } }),
  ]);

  /* Only this organisation's check-ins: the list also carries other organisations' where the reader is a guest. */
  const mayOpen = ((list ?? []) as any[]).filter((g) => g.organizationId === org);

  const picture: StoredPicture | null = stored
    ? {
        readings: (stored as any).readings ?? [], notReaching: (stored as any).notReaching ?? [],
        namedByTeams: (stored as any).namedByTeams ?? [], saidAndShown: (stored as any).saidAndShown ?? [],
      }
    : null;
  const askedOf = (picture?.notReaching ?? []).map((n) => (n.forWhom as any)?.externalId).filter(Boolean);
  const ownerIds = [...new Set([...(subjects as any[]).map((s) => s.ownerExternalId), ...askedOf].filter(Boolean))] as string[];
  const people = ownerIds.length
    ? await prisma.person.findMany({
        where: { organizationId: org, externalId: { in: ownerIds } },
        select: { externalId: true, displayName: true, givenName: true, familyName: true, title: true, linkedUserId: true },
      })
    : [];
  const owners = new Map<string, string>();
  const ownerDetails = new Map<string, OwnerDetail>();
  for (const p of people as any[]) {
    const name = (p.displayName || [p.givenName, p.familyName].filter(Boolean).join(' ')).trim();
    if (name) {
      owners.set(p.externalId, name);
      ownerDetails.set(p.externalId, { name, title: p.title?.trim() || null, linkedUserId: p.linkedUserId ?? null });
    }
  }

  const teams = new Set((memberships as any[]).map((m) => (m.team ?? '').trim().toLowerCase()).filter(Boolean)).size;
  const checkInsThisWeek = readsEverything
    ? mayOpen.reduce((n, g) => n + (g.checkIns ?? []).filter((c: any) =>
        c.status === 'COMPLETED' && !c.isSetup && c.completedAt && now.getTime() - new Date(c.completedAt).getTime() <= WEEK_MS).length, 0)
    : null;

  const page = companyPage({
    name: organisation?.name ?? '',
    readsEverything,
    subjects: subjects as any,
    owners,
    linkedGrounds: (linked as any[]).map((g) => ({ id: g.id, subjectExternalId: g.subjectExternalId })),
    mayOpen,
    counts: { teams, people: memberships.length, checkInsThisWeek },
    now,
    picture,
    ownerDetails,
    readerUserId: reader.userId,
    readsThePicture,
  });

  /* The strategy's versions, read as they were kept. Never built here. Left null when none has been kept, and when the read fails. */
  try { page.strategy = await theStrategyAsRead(prisma, org, now); } catch { page.strategy = null; }

  /* What was kept for the organisation, for the readers who may read it. Read, never built, on opening. */
  try {
    if (readsThePicture) {
      const kept = await keptForTheOrganisation(prisma, org);
      page.whatWeKeep = {
        readBy: WHO_READS_WHAT_IS_KEPT,
        items: kept.map((k) => ({ id: k.id, kind: k.kind, says: k.text, source: k.sourceLine })),
      };
    }
  } catch {
    /* The page is served without this part rather than not at all, and never with a part the reader may not read. */
  }
  return page;
}
