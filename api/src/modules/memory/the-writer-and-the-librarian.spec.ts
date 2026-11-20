import { GROUND, LUCY, MARY, ORG, SAM, aShelfFakePrisma, aWriterFor, anAssessment, item, MARYS } from './a-shelf-for-specs';
import { theReaderOf } from './who-reads-memory';
import { Librarian, MOST_BOOKS_OPENED } from './the-librarian';
import { PICK_THE_BOOKS_PROMPT_KEY } from './pick-the-books';
import type { AFileToWrite } from './the-memory-format';

const NOW = new Date('2026-11-19T10:00:00Z');
const maryPath = `person/${MARY.participantId}.md`;

describe('the one writer', () => {
  it('writes nothing the second time when the record has not changed, and a new version when it has, keeping the old one', async () => {
    const prisma = aShelfFakePrisma();
    const writer = aWriterFor(prisma);
    const first = await writer.rebuildOrganisation(ORG, NOW);
    expect(first.written).toBe(6);
    const again = await writer.rebuildOrganisation(ORG, new Date('2026-11-20T10:00:00Z'));
    expect(again).toEqual({ written: 0, unchanged: 6, refused: 0 });
    expect(prisma._files).toHaveLength(6);

    /* A week on, each file is due for its check: a version says so, with the same words in it. */
    const checked = await writer.rebuildOrganisation(ORG, new Date('2026-11-27T10:00:00Z'));
    expect(checked).toEqual({ written: 6, unchanged: 0, refused: 0 });
    expect(prisma._files.filter((f: any) => f.path === 'org.md').map((f: any) => f.why)).toEqual(['The organisation was read again.', 'It was checked again and nothing had changed.']);
    expect(prisma._files.filter((f: any) => f.path === 'org.md').map((f: any) => f.header.reviewBy)).toEqual(['2026-11-26', '2026-12-04']);

    /* Mary says something new in a later check-in. */
    const changed = anAssessment({ checkInId: 'ci-mary-2', participantId: MARY.participantId, who: 'Mary', workUpdates: [item({ work: 'the Kilele depot', stage: 'order signed' })] } as any);
    const original = prisma.checkIn.findMany;
    prisma.checkIn.findMany = async () => [{ id: 'ci-mary-2', groundId: GROUND, participantId: MARY.participantId, sessionNumber: 2, startedAt: null, completedAt: null, sessionReport: changed }, ...(await original())];
    const later = await writer.rebuildOrganisation(ORG, new Date('2026-11-28T10:00:00Z'));
    expect(later.written).toBe(2);
    const versions = prisma._files.filter((f: any) => f.path === maryPath).sort((a: any, b: any) => a.version - b.version);
    expect(versions.map((v: any) => v.version)).toEqual([1, 2, 3]);
    expect(versions[2].basedOnVersion).toBe(2);
    expect(JSON.stringify(versions[1].sections)).not.toContain('Kilele depot');
    expect(JSON.stringify(versions[2].sections)).toContain('Work on the Kilele depot is at order signed.');
  });

  it('refuses a version another write took first, and writes on top of the latest instead', async () => {
    const prisma = aShelfFakePrisma();
    const writer = aWriterFor(prisma);
    await writer.rebuildOrganisation(ORG, NOW);
    const file: AFileToWrite = { path: 'org.md', kind: 'org', header: { subject: { kind: 'org', id: null, label: 'Acme Foods' }, scope: {}, writer: 'the memory writer', builtFrom: ['r:organization:org-1'] }, sections: [{ key: 'the-organisation', title: 'The organisation', readers: ['everyone'], statements: [{ text: 'Acme Foods now has a new fact.', cites: ['r:organization:org-1'], asOf: '2026-11-19' }] }] };
    const create = prisma.memoryFile.create;
    let raced = false;
    prisma.memoryFile.create = async (a: any) => {
      if (!raced) { raced = true; await create({ data: { ...a.data, builtFrom: 'another-writer', sections: [] } }); }
      return create(a);
    };
    expect(await writer.write(ORG, file, NOW, 'test')).toBe('written');
    const versions = prisma._files.filter((f: any) => f.path === 'org.md').map((f: any) => f.version).sort();
    expect(versions).toEqual([1, 2, 3]);
  });

  it('writes two changes to one file one after the other, never both on the same version', async () => {
    const prisma = aShelfFakePrisma();
    const writer = aWriterFor(prisma);
    const base = (text: string): AFileToWrite => ({ path: 'org.md', kind: 'org', header: { subject: { kind: 'org', id: null, label: 'Acme Foods' }, scope: {}, writer: 'the memory writer', builtFrom: ['r:organization:org-1'] }, sections: [{ key: 'k', title: 'T', readers: ['everyone'], statements: [{ text, cites: ['r:organization:org-1'], asOf: '2026-11-19' }] }] });
    const out = await Promise.all([writer.write(ORG, base('One thing is true.'), NOW, 'a'), writer.write(ORG, base('Another thing is true.'), NOW, 'b'), writer.write(ORG, base('One thing is true.'), NOW, 'c')]);
    expect(out).toEqual(['written', 'written', 'written']);
    expect(prisma._files.map((f: any) => f.version).sort()).toEqual([1, 2, 3]);
  });

  it('stores nothing for a file that cites nothing', async () => {
    const prisma = aShelfFakePrisma();
    const out = await aWriterFor(prisma).write(ORG, { path: 'org.md', kind: 'org', header: { subject: { kind: 'org', id: null, label: 'Acme' }, scope: {}, writer: 'the memory writer', builtFrom: [] }, sections: [{ key: 'k', title: 'T', readers: ['everyone'], statements: [{ text: 'Nobody said this.', cites: [], asOf: '2026-11-19' }] }] }, NOW, 'bad');
    expect(out).toBe('refused');
    expect(prisma._files).toHaveLength(0);
  });

  it('is rebuilt from the assessments, so a line a person corrected is no longer in the file', async () => {
    const prisma = aShelfFakePrisma();
    const writer = aWriterFor(prisma);
    await writer.rebuildOrganisation(ORG, NOW);
    const corrected = JSON.parse(JSON.stringify(MARYS));
    corrected.claims = [];
    prisma.checkIn.findMany = async () => [{ id: 'ci-mary', groundId: GROUND, participantId: MARY.participantId, sessionNumber: 1, startedAt: null, completedAt: null, sessionReport: corrected }];
    await writer.rebuildGround(ORG, GROUND, new Date('2026-11-26T10:00:00Z'));
    const newest = prisma._files.filter((f: any) => f.path === maryPath).sort((a: any, b: any) => b.version - a.version)[0];
    expect(JSON.stringify(newest.sections)).not.toContain('The Kilele order was delivered');
  });
});

describe('the librarian', () => {
  async function aShelf() {
    const prisma = aShelfFakePrisma();
    await aWriterFor(prisma).rebuildOrganisation(ORG, NOW);
    return prisma;
  }

  it('gives each person a catalogue of only the books with something they may read, one line each, and none of the contents', async () => {
    const prisma = await aShelf();
    const librarian = new Librarian(prisma);
    const lucy = await librarian.catalogueFor(await theReaderOf(prisma, LUCY.userId, ORG));
    expect(lucy.map((c) => c.path)).toEqual([`person/${LUCY.participantId}.md`, 'org.md', `team/${GROUND}.md`, `person/${MARY.participantId}.md`, `person/${SAM.participantId}.md`]);
    expect(lucy[2].line).toBe(`team/${GROUND}.md: A team, Sales. Version 1, updated 2026-11-19, check by 2026-11-26. 4 sections you may read.`);
    expect(JSON.stringify(lucy)).not.toContain('Naivas');

    const sam = await librarian.catalogueFor(await theReaderOf(prisma, SAM.userId, ORG));
    expect(sam.map((c) => c.path)).toEqual([`person/${SAM.participantId}.md`, 'org.md', `team/${GROUND}.md`, 'project/s-1.md']);
    expect(sam.find((c) => c.path === 'org.md')!.sections).toBe(3);
    /* Mary's and Lucy's books are not even named in Sam's catalogue. */
    expect(JSON.stringify(sam)).not.toMatch(/Mary|Lucy/);
  });

  it('puts what the reader owns first, then the organisation, and narrows to one check-in when asked from it', async () => {
    const prisma = await aShelf();
    const librarian = new Librarian(prisma);
    const mary = await librarian.catalogueFor(await theReaderOf(prisma, MARY.userId, ORG), { groundId: GROUND });
    expect(mary[0].path).toBe(maryPath);
    expect(mary.map((c) => c.path)).toEqual([maryPath, 'org.md', `team/${GROUND}.md`, 'project/s-1.md']);
    const none = await librarian.catalogueFor(await theReaderOf(prisma, MARY.userId, ORG), { groundId: 'another-ground' });
    expect(none.map((c) => c.path)).toEqual(['org.md', 'project/s-1.md']);
  });

  it('lets the model choose the few books a question needs, opens only those, says what it left out, and costs less than the whole shelf', async () => {
    const prisma = await aShelf();
    const asked: string[] = [];
    const engine = { extract: jest.fn(async (prompt: string, history: any[]) => { asked.push(history[0].content); return { paths: [`person/${MARY.participantId}.md`] }; }) };
    const prompts = { getActive: jest.fn(async (key: string) => (key === PICK_THE_BOOKS_PROMPT_KEY ? null : null)) };
    const librarian = new Librarian(prisma, engine as any, prompts as any);
    const pulled = await librarian.pull(LUCY.userId, ORG, 'What is Mary waiting for?');
    expect(pulled.books.map((b) => b.path)).toEqual([maryPath]);
    expect(pulled.books[0].markdown).toContain('Mary is waiting for the signed order from Naivas');
    expect(pulled.leftOut).toHaveLength(4);
    expect(pulled.measure.modelCalls).toBe(1);
    expect(pulled.measure.openedTokens).toBeLessThan(pulled.measure.wholeShelfTokens);
    expect(pulled.measure.catalogueTokens).toBeLessThan(pulled.measure.wholeShelfTokens);
    /* The model was given catalogue lines and the question, never a section. */
    expect(asked[0]).toContain('THE QUESTION\nWhat is Mary waiting for?');
    expect(asked[0]).not.toContain('Naivas');
  });

  it("opens a path the model names only if it is in the reader's own catalogue, whatever the model says", async () => {
    const prisma = await aShelf();
    const engine = { extract: async () => ({ paths: ['person/not-a-book.md', 'team/another-ground.md', maryPath] }) };
    const forced = await new Librarian(prisma, engine as any, null).pull(LUCY.userId, ORG, 'Tell me about Mary');
    expect(forced.books.map((b) => b.path)).toEqual([maryPath]);
  });

  it("never opens another person's book to a colleague, with or without a model", async () => {
    const prisma = await aShelf();
    const engine = { extract: async () => ({ paths: [maryPath, `person/${LUCY.participantId}.md`, 'org.md'] }) };
    for (const librarian of [new Librarian(prisma), new Librarian(prisma, engine as any, null)]) {
      const pulled = await librarian.pull(SAM.userId, ORG, 'Tell me about Mary');
      expect(pulled.books.map((b) => b.path)).not.toContain(maryPath);
      expect(JSON.stringify(pulled.books)).not.toMatch(/moved the date|Naivas|weak on paperwork|Two reps may leave/);
    }
  });

  it('with no model, opens the books in scope up to a small limit, in order, and says how many it left out', async () => {
    const prisma = await aShelf();
    const pulled = await new Librarian(prisma).pull(LUCY.userId, ORG, 'anything');
    expect(pulled.books).toHaveLength(MOST_BOOKS_OPENED);
    expect(pulled.leftOut).toHaveLength(1);
    expect(pulled.measure.modelCalls).toBe(0);
  });

  it('serves an outsider nothing', async () => {
    const prisma = await aShelf();
    const pulled = await new Librarian(prisma).pull('user-outsider', ORG, 'What is Mary waiting for?');
    expect(pulled.books.map((b) => b.path)).toEqual(['org.md']);
    expect(pulled.books[0].markdown).not.toMatch(/Naivas|Mary|No discount/);
  });
});
