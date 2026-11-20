import { ADMIN, GROUND, LUCY, MARY, ORG, OTHER_ORG, OUTSIDER, SAM, aShelfFakePrisma, aWriterFor } from './a-shelf-for-specs';
import { theReaderOf, theSectionsFor } from './who-reads-memory';
import { checkTheFile, renderFor, type AFileToWrite } from './the-memory-format';
import { Librarian } from './the-librarian';

const NOW = new Date('2026-11-19T10:00:00Z');

async function shelf() {
  const prisma = aShelfFakePrisma();
  const writer = aWriterFor(prisma);
  await writer.rebuildOrganisation(ORG, NOW);
  return { prisma, writer, librarian: new Librarian(prisma) };
}

/** What a person reads of one book, as the librarian serves it. */
async function reads(prisma: any, librarian: Librarian, userId: string, path: string, organizationId = ORG) {
  const reader = await theReaderOf(prisma, userId, organizationId);
  const [book] = await librarian.open(reader, [path]);
  return book?.markdown ?? null;
}

describe('memory files, as each person who may open them reads them', () => {
  it('writes one file for the organisation, each team, each person and each project, and cites every statement', async () => {
    const { prisma } = await shelf();
    const paths = prisma._files.map((f: any) => f.path).sort();
    expect(paths).toEqual(['org.md', `person/${LUCY.participantId}.md`, `person/${MARY.participantId}.md`, `person/${SAM.participantId}.md`, 'project/s-1.md', `team/${GROUND}.md`]);
    for (const f of prisma._files) {
      for (const s of f.sections) for (const st of s.statements) {
        expect(st.cites.length).toBeGreaterThan(0);
        expect(st.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
      expect(f.header.reviewBy).toBe('2026-11-26');
      expect(f.version).toBe(1);
    }
  });

  it("Mary reads her own work, what Lucy said about it, and the coaching she was given, and nothing of the lead's judgement", async () => {
    const { prisma, librarian } = await shelf();
    const md = await reads(prisma, librarian, MARY.userId, `person/${MARY.participantId}.md`);
    expect(md).toContain('Work on the Naivas renewal is at quote sent, and the next step is a call on Friday.');
    expect(md).toContain('Mary is waiting for the signed order from Naivas from the buyer.');
    expect(md).toContain('Mary promised to send the Kilele proof, on Monday.');
    expect(md).toContain('Mary said the Kilele order was delivered, and it is not yet proved.');
    expect(md).toContain('The lead said about Mary\'s work, "Mary closes fewer than she says"');
    expect(md).toContain('The step Mary was last given is send the proof the same day.');
    expect(md).not.toContain('moved the date of the same promise');
    expect(md).not.toContain('account manager');
    expect(md).not.toContain('weak on paperwork');
  });

  it('Lucy, who runs the check-in, reads the patterns with their instances, the role as played, and her own private note', async () => {
    const { prisma, librarian } = await shelf();
    const md = (await reads(prisma, librarian, LUCY.userId, `person/${MARY.participantId}.md`))!;
    expect(md).toContain('Mary has moved the date of the same promise twice. This rests on 2 separate things from 2 check-ins.');
    expect(md).toContain('Mary is a sales rep by title and spends her time as an account manager.');
    expect(md).toContain('Strong with big accounts, weak on paperwork.');
    /* Forming is never stated: a pattern needs its instances. */
    expect(md).not.toContain('Forming only');
  });

  it('what a person said about their health, and what was said against the lead, is in no file for any reader', async () => {
    const { prisma, librarian } = await shelf();
    for (const user of [MARY.userId, LUCY.userId, SAM.userId, ADMIN.userId]) {
      for (const path of prisma._files.map((f: any) => f.path)) {
        const md = (await reads(prisma, librarian, user, path)) ?? '';
        expect(md).not.toMatch(/hospital|not coping|shouts at us/);
      }
    }
    expect(JSON.stringify(prisma._files)).not.toMatch(/hospital|not coping|shouts at us/);
  });

  it("Sam, a colleague, reads none of Mary's book, and the admin who did not set the check-in up reads none of it either", async () => {
    const { prisma, librarian } = await shelf();
    expect(await reads(prisma, librarian, SAM.userId, `person/${MARY.participantId}.md`)).toBeNull();
    expect(await reads(prisma, librarian, ADMIN.userId, `person/${MARY.participantId}.md`)).toBeNull();
    expect(await reads(prisma, librarian, ADMIN.userId, `person/${LUCY.participantId}.md`)).toBeNull();
  });

  it("the team's book gives the team its purpose and targets, and gives only the lead the brief, the risks and who is waiting", async () => {
    const { prisma, librarian } = await shelf();
    const sam = (await reads(prisma, librarian, SAM.userId, `team/${GROUND}.md`))!;
    expect(sam).toContain('This check-in keeps track of sales and what is in the way.');
    expect(sam).toContain('A target of the team is Paying companies, at 12.');
    expect(sam).toContain('Work here moves through these stages, in order: quote, order, delivery.');
    expect(sam).not.toMatch(/Two reps may leave|40 million|waiting for/);
    const lucy = (await reads(prisma, librarian, LUCY.userId, `team/${GROUND}.md`))!;
    expect(lucy).toContain("The lead's brief for this check-in is close the quarter at 40 million.");
    expect(lucy).toContain('A risk the lead named is two reps may leave this quarter.');
    expect(lucy).toContain('Mary is waiting for the signed order from Naivas from the buyer.');
    expect(await reads(prisma, librarian, OUTSIDER.userId, `team/${GROUND}.md`)).toBeNull();
  });

  it('the organisation book gives everyone the direction and gives only admins and leads what a lead confirmed', async () => {
    const { prisma, librarian } = await shelf();
    const sam = (await reads(prisma, librarian, SAM.userId, 'org.md'))!;
    expect(sam).toContain('Acme Foods uses Groundwork for one team check-in.');
    expect(sam).toContain("What we're trying to achieve is reach 40 million this quarter.");
    expect(sam).toContain('What we decided was stop chasing small shops.');
    expect(sam).not.toMatch(/No discount above 5 percent|Leave policy|Sales rep/);
    const admin = (await reads(prisma, librarian, ADMIN.userId, 'org.md'))!;
    expect(admin).toContain('A rule here is no discount above 5 percent.');
    expect(admin).toContain('The policy "Leave policy" is on the Desk.');
    expect((await reads(prisma, librarian, LUCY.userId, 'org.md'))!).toContain('A rule here is no discount above 5 percent.');
  });

  it("a project's book is read by the people named on it and by an admin, and by nobody else", async () => {
    const { prisma, librarian } = await shelf();
    expect(await reads(prisma, librarian, MARY.userId, 'project/s-1.md')).toContain('Mary Bello owns it.');
    expect(await reads(prisma, librarian, ADMIN.userId, 'project/s-1.md')).toContain('It matters because it is the biggest account.');
    expect(await reads(prisma, librarian, LUCY.userId, 'project/s-1.md')).toBeNull();
  });

  it('nobody in another organisation reads any book, and has none in their catalogue', async () => {
    const { prisma, librarian } = await shelf();
    const reader = await theReaderOf(prisma, MARY.userId, OTHER_ORG);
    expect(await librarian.catalogueFor(reader)).toEqual([]);
    expect(await librarian.open(reader, ['org.md', `person/${MARY.participantId}.md`])).toEqual([]);
  });

  it('with the organisation keeping judgements of people off, no pattern, role or coaching is in the book at all', async () => {
    const prisma = aShelfFakePrisma({ judgementsOn: false });
    await aWriterFor(prisma).rebuildOrganisation(ORG, NOW);
    const librarian = new Librarian(prisma);
    const md = (await reads(prisma, librarian, LUCY.userId, `person/${MARY.participantId}.md`))!;
    expect(md).not.toMatch(/moved the date|account manager|The step Mary was last given/);
    expect(md).toContain('Work on the Naivas renewal');
  });

  it('a person who has left keeps a header and nothing else, and reads nothing', async () => {
    const prisma = aShelfFakePrisma();
    const gone = (prisma as any);
    const original = gone.groundParticipant.findMany;
    gone.groundParticipant.findMany = async (a: any) => (await original(a)).map((p: any) => (p.id === SAM.participantId ? { ...p, leftAt: new Date('2026-11-15') } : p));
    await aWriterFor(prisma).rebuildOrganisation(ORG, NOW);
    const f = prisma._files.find((x: any) => x.path === `person/${SAM.participantId}.md`);
    expect(f.header.retired).toBe(true);
    expect(f.sections).toEqual([]);
    expect(await reads(prisma, new Librarian(prisma), LUCY.userId, `person/${SAM.participantId}.md`)).toBeNull();
  });

  it('a file that cites nothing is refused, and a header that does not fit is refused', () => {
    const bad: AFileToWrite = { path: 'org.md', kind: 'org', header: { subject: { kind: 'org', id: null, label: 'Acme' }, scope: {}, writer: 'the memory writer', builtFrom: [] }, sections: [{ key: 'k', title: 'T', readers: ['everyone'], statements: [{ text: 'Something is true.', cites: [], asOf: '2026-11-19' }] }] };
    expect(checkTheFile(bad).join(' ')).toContain('cites nothing');
    expect(checkTheFile({ ...bad, path: 'team/x.md' }).join(' ')).toContain('is not the path');
    expect(checkTheFile({ ...bad, sections: [{ key: 'k', title: 'T', readers: [], statements: [] }] }).join(' ')).toContain('nobody reads it');
  });

  it('the Markdown a reader gets says its subject, version, date and how many sources, and each statement says where it is from', async () => {
    const { prisma, librarian } = await shelf();
    const md = (await reads(prisma, librarian, MARY.userId, `person/${MARY.participantId}.md`))!;
    expect(md).toContain('version: 1');
    expect(md).toContain('check by: 2026-11-26');
    expect(md).toMatch(/\(as of 2026-11-10; from a:ci-mary\)/);
    expect(renderFor({ path: 'x', header: prisma._files[0].header }, theSectionsFor({ userId: 'u', organizationId: ORG, isAdmin: false, runs: new Set(), takesPartIn: new Map() }, prisma._files[0]))).toContain('---');
  });
});

describe('what an organisation has learned, in its own book and nowhere else', () => {
  it("an admin reads what has worked in this organisation, from this organisation's counts only", async () => {
    const { prisma, librarian } = await shelf();
    const md = (await reads(prisma, librarian, ADMIN.userId, 'org.md'))!;
    expect(md).toContain('send the proof the same day. It was offered 9 times, and 9 of those have been asked about in a later check-in.');
    expect(md).toContain('it was done, or done and more, 7 times, it was not done 1 time');
    /* Not another organisation's step, not the total, and not a step tried only twice. */
    expect(md).not.toMatch(/call the buyer first|a step tried twice|29/);
  });

  it('nobody else reads it: not a lead, not a person on a team', async () => {
    const { prisma, librarian } = await shelf();
    for (const user of [LUCY.userId, MARY.userId, SAM.userId]) expect(await reads(prisma, librarian, user, 'org.md')).not.toContain('has worked here');
  });
});
