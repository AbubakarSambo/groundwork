import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GroundsService } from './grounds.service';
import { companyPage, type CompanyPage, type OwnerDetail, type NotYourDesk, type TheDesk } from './the-company-page';
import { readTheDesk, readOneDocument, mayAddToTheDesk, aDeskKeyFor } from '../knowledge/the-desk';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { DocumentsService } from '../documents/documents.service';
import { withoutBankDetails } from '../documents/bank-details-are-never-kept';
import { aTitleFor, NO_WORDS_IN_IT, NOT_YOURS_TO_ADD } from '../assistant/a-document-for-the-whole-organisation';
import { theDirectory } from '../../common/the-directory';
import { theCheckInsThatFeedAPriority } from './what-a-check-in-feeds';
import type { StoredPicture } from './the-company-picture';
import { theStrategyAsRead } from '../subjects/the-strategy-over-time';
import { keptForTheOrganisation, mayReadWhatIsKept } from '../knowledge/organisation-memory';
import { refuseSomeoneAwaitingTheOrganisation } from '../participants/held-for-a-seat';

/** Said to somebody from another company, added to one of this organisation's check-ins, when they ask Ask about it. */
export const NOT_YOUR_COMPANY = 'Only people who work in this organisation can read its Desk.';

/** The whole Desk for somebody who does not work here: a plain page, not an error (S7). */
export const NOT_YOUR_DESK = (name?: string | null): string =>
  `The Desk is for the people who work at ${name?.trim() || 'this organisation'}, so there is nothing here for you to read. You can still open any check-in you were added to.`;

/** "19 November 2026", as the Desk says when a document was added. */
const aDay = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Lagos' });

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
    @Optional() private knowledge?: KnowledgeService,
    @Optional() private documents?: DocumentsService,
  ) {}

  /**
   * ADDING A DOCUMENT ON THE DESK (S7): an admin or a lead uploads a file (PDF, Word, text) or pastes text. Read the one
   * way every document is read: the file's words through DocumentsService.textOutOf (as Ask reads one; it and
   * readForMaterial, which reads a senior person's forwarded material, share one reader, extractContent), bank details
   * taken out of pasted text too, then KnowledgeService.ingestDocument, which splits it into parts and keeps a summary written by the model.
   * Checked here, on the server, whoever the screen showed the button to.
   */
  async addADocument(reader: { userId: string; organizationId: string; role: string }, input: { file?: Express.Multer.File; title?: string; text?: string }) {
    const name = (await this.prisma.organization.findUnique({ where: { id: reader.organizationId }, select: { name: true } }).catch(() => null))?.name ?? null;
    await refuseAnOutsider(this.prisma, reader);
    if (!mayAddToTheDesk(reader.role)) throw new ForbiddenException(NOT_YOURS_TO_ADD(name));
    if (!this.knowledge) throw new BadRequestException('Documents cannot be added at the moment, so try again in a little while.');
    const fileName = input.file?.originalname?.trim() || null;
    if (input.file && !this.documents) throw new BadRequestException('Files cannot be read at the moment, so paste the text instead.');
    const words = input.file ? await this.documents!.textOutOf(input.file) : String(input.text ?? '');
    const title = (input.title ?? '').replace(/\s+/g, ' ').trim().slice(0, 160) || (fileName ? aTitleFor(fileName) : '');
    if (!title) throw new BadRequestException('Give the document a title, then add it again.');
    const text = (withoutBankDetails(words) as string).trim();
    if (!text) throw new BadRequestException(NO_WORDS_IN_IT(title));
    const key = aDeskKeyFor(title);
    const kept = await this.knowledge.ingestDocument(reader.organizationId, { key, title, text, kind: 'handbook', sourceRef: fileName, sourceSystem: 'desk', addedByUserId: reader.userId });
    return { key, title, summary: kept.summary ?? null };
  }

  /** One document on the Desk, in full, for anybody who works here. Only this organisation's. */
  async aDocument(reader: { userId: string; organizationId: string; role: string }, key: string) {
    await refuseAnOutsider(this.prisma, reader);
    const doc = await readOneDocument(this.prisma, reader.organizationId, key);
    if (!doc) throw new NotFoundException('That document is not on the Desk.');
    return doc;
  }

  /** THE DESK (S7): the company page, renamed, with the organisation's shared context. A guest, or somebody still waiting to be let in, is refused here. */
  async forReader(reader: { userId: string; email: string; organizationId: string; role: string }): Promise<CompanyPage> {
    const page = await readTheCompanyPage(this.prisma, this.grounds, reader);
    page.desk = await this.theDesk(reader);
    return page;
  }

  /**
   * What the Desk's route serves somebody who does not work here: one plain sentence and nothing of the organisation's,
   * rather than an error (S7). The refusal itself stays where it was, in readTheCompanyPage.
   */
  async forSomebodyRefused(organizationId: string): Promise<NotYourDesk> {
    const name = (await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } }).catch(() => null))?.name ?? null;
    return { name: name ?? '', outsider: NOT_YOUR_DESK(name) };
  }

  /** The documents with their kept summaries, the directory, and whether this reader may add a document. Read, never built. */
  private async theDesk(reader: { userId: string; organizationId: string; role: string }): Promise<TheDesk> {
    const db = this.prisma as any;
    const [documents, directory] = await Promise.all([
      readTheDesk(db, reader.organizationId).catch(() => [] as Awaited<ReturnType<typeof readTheDesk>>),
      theDirectory(db, reader.organizationId, reader).catch(() => [] as Awaited<ReturnType<typeof theDirectory>>),
    ]);
    const adders = [...new Set(documents.map((d) => d.addedByUserId).filter(Boolean))] as string[];
    const who = new Map(directory.filter((p) => adders.includes(p.id)).map((p) => [p.id, p.name]));
    return {
      documents: documents.map((d) => {
        const by = d.addedByUserId ? who.get(d.addedByUserId) : null;
        const on = d.addedOn ? aDay(d.addedOn) : null;
        const added = by && on ? `${by} added this on ${on}.` : on ? `This was added on ${on}.` : null;
        return { key: d.key, title: d.title, summary: d.summary, added };
      }),
      directory,
      mayAdd: mayAddToTheDesk(reader.role),
    };
  }
}

/** A guest from another company, or somebody still waiting to be let in, is not in the organisation: refused here, on the server. */
async function refuseAnOutsider(prisma: PrismaService, reader: { userId: string; role: string }): Promise<void> {
  if (reader.role === 'GUEST') throw new ForbiddenException(NOT_YOUR_COMPANY);
  /* Nor somebody still waiting for an admin to let them into the organisation: they are not in it yet (row 5, release check of 7 October). */
  await refuseSomeoneAwaitingTheOrganisation(prisma as any, reader.userId, NOT_YOUR_COMPANY);
}

/**
 * The company page as one reader may read it, from the database and nothing else. The page serves it, and Ask answers about the company from the
 * same read, so Ask never says more than the page shows that reader.
 */
export async function readTheCompanyPage(prisma: PrismaService, grounds: GroundsService, reader: { userId: string; email: string; organizationId: string; role: string }): Promise<CompanyPage> {
  await refuseAnOutsider(prisma, reader);
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
    /* Filled in below, once the priorities are read: which check-in feeds which priority (what-a-check-in-feeds.ts). */
    Promise.resolve([] as { id: string; subjectExternalId: string }[]),
    /* Only people still here: somebody removed keeps a membership row, and "2 teams and 7 people work here" counted one (pilots, problem 10). */
    prisma.organizationMembership.findMany({
      where: { organizationId: org, role: { not: 'GUEST' }, user: { deletedAt: null, isActive: true } },
      select: { team: true },
    }),
    /* Only READ. The picture is written when the record changes (the-company-picture.service.ts), never here. */
    prisma.companyPicture.findUnique({ where: { organizationId: org } }),
  ]);

  /* Which check-in feeds which priority, by the one rule the company picture reads too. */
  const feeding = await theCheckInsThatFeedAPriority(prisma, org, subjects as any).catch(() => [] as { id: string; subjectExternalId: string }[]);
  (linked as any[]).push(...feeding);

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
        items: kept.map((k) => ({ id: k.id, kind: k.kind, says: k.text, source: k.sourceLine })),
      };
    }
  } catch {
    /* The page is served without this part rather than not at all, and never with a part the reader may not read. */
  }
  return page;
}
