import { ADMIN, GROUND, LUCY, MARY, ORG, SAM, aShelfFakePrisma, aWriterFor } from './a-shelf-for-specs';
import { Librarian } from './the-librarian';
import { answerFromTheDocuments, NO_DOCUMENTS_TO_READ } from '../assistant/a-question-is-answered-from-the-documents';

const NOW = new Date('2026-11-19T10:00:00Z');

async function ask(userId: string, question: string, opts: { groundId?: string; withMemory?: boolean } = {}) {
  const prisma = aShelfFakePrisma();
  await aWriterFor(prisma).rebuildOrganisation(ORG, NOW);
  const given: string[] = [];
  const engine = { extract: jest.fn(async (_p: string, history: any[]) => { given.push(history[0].content); return { found: true, answer: 'The team is aiming at 12 paying companies.' }; }) };
  const memory = opts.withMemory === false ? null : new Librarian(prisma);
  const said = await answerFromTheDocuments({ prisma, engine, memory }, { organizationId: ORG, userId, groundId: opts.groundId ?? null, question });
  /* Only what came from memory: the record and the documents the assistant already read are not what is tested here. */
  const memoryOnly = given.join('\n').split('DOCUMENT "').filter((d) => d.startsWith('What Groundwork has kept')).map((d) => `DOCUMENT "${d}`).join('\n');
  return { said, given: memoryOnly, asked: engine.extract.mock.calls.length };
}

describe('the assistant is given what the organisation remembers, as far as its reader may read it', () => {
  it('a team member is given what the team is for and aims at, as plain statements with the day they were true, and no header or citation', async () => {
    const r = await ask(SAM.userId, 'What is this team aiming at?', { groundId: GROUND });
    expect(r.said).toBe('The team is aiming at 12 paying companies.');
    expect(r.given).toContain('A target of the team is Paying companies, at 12. (as of 2026-11-19)');
    expect(r.given).toContain('What Groundwork has kept about Sales');
    expect(r.given).not.toMatch(/version:|written by:|from a:|r:ground/);
  });

  it("is never given a person's book, even for the lead who may read it herself, and never the lead's brief, risks or who is waiting on whom", async () => {
    const r = await ask(LUCY.userId, "What is Mary waiting for, and how is she doing?", { groundId: GROUND });
    expect(r.given).toContain('A target of the team is Paying companies, at 12.');
    expect(r.given).not.toMatch(/Mary is waiting|moved the date|account manager|weak on paperwork|Two reps may leave|close the quarter|The step Mary was last given|closes fewer/);
    expect(r.given).not.toContain('What Groundwork has kept about Mary');
  });

  it("is given the organisation's direction for anybody, and what a lead confirmed and what has worked here for an admin only", async () => {
    const sam = await ask(SAM.userId, 'Where is the company heading?');
    expect(sam.given).toContain("What we're trying to achieve is reach 40 million this quarter.");
    expect(sam.given).not.toMatch(/No discount above 5 percent|has worked here|send the proof the same day/);
    const admin = await ask(ADMIN.userId, 'What are our rules?');
    expect(admin.given).toContain('A rule here is no discount above 5 percent.');
    expect(admin.given).toContain('send the proof the same day. It was offered 9 times');
  });

  it('a person who is on none of it is given nothing from the teams or the projects, and a project only to the people named on it', async () => {
    const mary = await ask(MARY.userId, 'What is the Kilele depot project?');
    expect(mary.given).toContain('Mary Bello owns it.');
    const lucy = await ask(LUCY.userId, 'What is the Kilele depot project?');
    expect(lucy.given).not.toContain('owns it');
    expect(lucy.given).not.toContain('What Groundwork has kept about Kilele depot');
  });

  it('without the librarian it answers exactly as it did, from the documents alone', async () => {
    const r = await ask(SAM.userId, 'What is this team aiming at?', { groundId: GROUND, withMemory: false });
    expect(r.said).toBe(NO_DOCUMENTS_TO_READ);
    expect(r.asked).toBe(0);
  });

  it('a librarian that fails leaves the answer as it was', async () => {
    const prisma = aShelfFakePrisma();
    const broken = { pullForTheAssistant: () => Promise.reject(new Error('down')) };
    const said = await answerFromTheDocuments({ prisma, engine: { extract: async () => ({ found: true, answer: 'x' }) }, memory: broken }, { organizationId: ORG, userId: SAM.userId, question: 'What is this team aiming at?' });
    expect(said).toBe(NO_DOCUMENTS_TO_READ);
  });
});
