import { ForbiddenException } from '@nestjs/common';
import { AskService } from './ask.service';
import { AssistantService } from '../assistant/assistant.service';

/**
 * HAFSAH'S FIX LIST, ITEM 3 (14 October 2026): "Ask, for an admin, has no way to add documents. Give admins the same
 * 'add a document' in Ask that leads have, said back before anything is kept."
 *
 * Read live before the change, as Grace, the admin of Msingi Foods, who runs no check-in: Ask offered her nothing about
 * documents, and "I want to add a document" was answered "You have none open, so there is nowhere to put one yet. If it
 * is something the whole organisation should know, that is a different thing and whoever set Groundwork up can add
 * it." She is the person who set it up. Now her document goes in the organisation's handbook, read and said back first,
 * and added only on her yes. Everything below is what each reader is served, word for word.
 */

const ORG = 'org-msingi';
const roles: Record<string, string> = { 'u-grace': 'ADMIN', 'u-wairimu': 'LEAD', 'u-amani': 'MEMBER' };
const runs: Record<string, boolean> = { 'u-wairimu': true };

function askWorld() {
  const prisma: any = {
    organizationMembership: { findUnique: jest.fn(async ({ where }: any) => ({ role: roles[where.userId_organizationId.userId] })) },
    person: { findFirst: jest.fn(async () => ({ id: 'pp', externalId: 'x' })) },
    user: { findUnique: jest.fn(async ({ where }: any) => ({ isEmailVerified: true, role: roles[where.id], organizationId: ORG })) },
    organization: { findUnique: jest.fn(async () => ({ name: 'Msingi Foods' })) },
    organizationSuite: { findMany: jest.fn(async () => []) },
    assistantTurn: { findMany: jest.fn(async () => []) },
    platformSetting: { findUnique: jest.fn(async () => null) },
    ground: {
      findMany: jest.fn(async ({ where }: any) => {
        if (where.initiator) return [];
        const uid = where.OR?.[0]?.initiatorId;
        return runs[uid] ? [{ id: 'g-q4', label: 'Sales team, Q4', initiatorId: uid, createdByUserId: null }] : [];
      }),
      findFirst: jest.fn(async ({ where }: any) => (runs[where.initiatorId] ? { id: 'g-q4' } : null)),
    },
    groundParticipant: { findMany: jest.fn(async () => []) },
  };
  const grounds: any = { mayOpenSetupChatFor: jest.fn(async () => false) };
  const assistant: any = { sayBackADocumentForTheOrganisation: jest.fn(async () => ({ lane: 'add_a_document', composedBy: 'rules', blocks: [] })) };
  const documents: any = { textOutOf: jest.fn(async () => 'Leave\n\n21 days a year.') };
  const svc = new AskService(prisma, assistant, {} as any, grounds, documents);
  const asker = (userId: string) => ({ userId, email: `${userId}@msingi.test`, organizationId: ORG } as any);
  return { svc, asker, assistant, documents };
}

describe('what Ask offers each reader about adding a document', () => {
  it('Grace, an admin who runs no check-in, reads that she can add a document for the whole organisation', async () => {
    const { svc, asker } = askWorld();
    const r: any = await svc.forReader(asker('u-grace'), null);
    expect(r.addLine).toBe('You can also add a document for the whole organisation here.');
    expect(r.starters).toContain('Add a document for the whole organisation.');
  });
  it('Wairimu, a lead, still reads the line about her own check-ins', async () => {
    const { svc, asker } = askWorld();
    const r: any = await svc.forReader(asker('u-wairimu'), null);
    expect(r.addLine).toBe('You can also add context or documents to your check-ins here.');
    expect(r.starters).toContain('Add a document or some context to my check-in.');
    expect(r.starters).not.toContain('Add a document for the whole organisation.');
  });
  it('Amani, who only takes part, is offered neither', async () => {
    const { svc, asker } = askWorld();
    const r: any = await svc.forReader(asker('u-amani'), null);
    expect(r.addLine).toBeNull();
    expect(JSON.stringify(r.starters)).not.toMatch(/document/i);
  });
});

describe('the file itself, on the server', () => {
  it('is refused to anybody who is not an admin, before it is read', async () => {
    const { svc, asker, documents, assistant } = askWorld();
    const file: any = { originalname: 'Staff handbook.pdf', size: 10, mimetype: 'application/pdf', buffer: Buffer.from('x') };
    await expect(svc.addADocumentForTheOrganisation(asker('u-amani'), file)).rejects.toThrow(
      new ForbiddenException('Only an admin of Msingi Foods can add a document for the whole organisation.'),
    );
    await expect(svc.addADocumentForTheOrganisation(asker('u-wairimu'), file)).rejects.toBeInstanceOf(ForbiddenException);
    expect(documents.textOutOf).not.toHaveBeenCalled();
    expect(assistant.sayBackADocumentForTheOrganisation).not.toHaveBeenCalled();
  });
  it('from an admin, is read and handed on to be said back, with its title', async () => {
    const { svc, asker, assistant } = askWorld();
    const file: any = { originalname: 'Staff handbook.pdf', size: 10, mimetype: 'application/pdf', buffer: Buffer.from('x') };
    await svc.addADocumentForTheOrganisation(asker('u-grace'), file);
    expect(assistant.sayBackADocumentForTheOrganisation).toHaveBeenCalledWith(ORG, 'pp', 'Staff handbook.pdf', 'Staff handbook', 'Leave\n\n21 days a year.');
  });
});

const HANDBOOK = [
  '# Leave', '', 'Everybody has 21 days a year. Ask your manager at least two weeks before.', '',
  '# Expenses', '', 'Your manager approves up to 20,000 shillings. Anything more also needs Grace.', '',
  '# Travel', '', 'Use the travel form five working days before you travel.',
].join('\n');

function assistantWorld(opts: { admin?: boolean } = {}) {
  const rows: any[] = [];
  const ingested: any[] = [];
  const remembered: any[] = [];
  const s = Object.create(AssistantService.prototype) as any;
  s.prisma = {
    person: { findFirst: jest.fn(async () => ({ externalId: 'grace-ext', linkedUserId: 'u-grace', email: 'grace@msingi.test' })) },
    organization: { findUnique: jest.fn(async () => ({ name: 'Msingi Foods' })) },
    organizationMembership: { findUnique: jest.fn(async () => ({ role: opts.admin === false ? 'MEMBER' : 'ADMIN' })) },
    user: { findUnique: jest.fn(async () => ({ role: 'ADMIN', organizationId: ORG })) },
    ground: { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null) },
    assistantProposal: {
      updateMany: jest.fn(async () => ({ count: 0 })),
      create: jest.fn(async ({ data }: any) => { const row = { id: `p${rows.length + 1}`, ...data }; rows.push(row); return row; }),
      update: jest.fn(async ({ where, data }: any) => { const row = rows.find((r) => r.id === where.id); Object.assign(row, data); return row; }),
    },
  };
  /* The model that says what is in the file (32ae7d269); it answers nothing here, so the say-back is the product's own words. */
  s.engine = { respond: jest.fn(async () => '') };
  s.knowledge = { ingestDocument: jest.fn(async (_org: string, input: any) => { ingested.push(input); return { chunks: 3 }; }) };
  s.remember = jest.fn(async (_o: string, _w: string, said: string, reply: any) => { remembered.push({ said, reply }); });
  s.truth = { forPerson: jest.fn(async () => ({ sessions: { value: [] } })) };
  return { s, rows, ingested, remembered };
}

const textOf = (reply: any) => reply.blocks.filter((b: any) => b.type === 'text').map((b: any) => b.body).join('\n');

describe('what Grace reads, from asking to the yes', () => {
  it('asking to add a document is offered the file picker for the whole organisation', async () => {
    const { s } = assistantWorld();
    const reply = await s.addADocument(ORG, 'pp', 'grace-ext', 'I want to add a document', undefined, 'u-grace');
    expect(textOf(reply)).toBe('It will be for the whole of Msingi Foods. When you choose the file, I will read it and tell you what is in it. Nothing is added until you say yes.');
    expect(reply.blocks.find((b: any) => b.type === 'next_step')).toMatchObject({ label: 'Choose a file', kind: 'upload_a_document', id: 'organisation' });
  });

  it('a person who is not an admin and has no check-in is still told there is nowhere to put it', async () => {
    const { s } = assistantWorld({ admin: false });
    const reply = await s.addADocument(ORG, 'pp', 'amani-ext', 'I want to add a document', undefined, 'u-amani');
    expect(textOf(reply)).toMatch(/nowhere to put one yet/);
    expect(reply.blocks.some((b: any) => b.type === 'next_step')).toBe(false);
  });

  it('the file is said back, and nothing is added until the yes', async () => {
    const { s, rows, ingested, remembered } = assistantWorld();
    const reply = await s.sayBackADocumentForTheOrganisation(ORG, 'pp', 'Staff handbook.pdf', 'Staff handbook', HANDBOOK);
    expect(textOf(reply)).toBe(
      'I have read Staff handbook. It has 3 parts. They cover Leave, Expenses and Travel.\n\n'
      + "Nothing is added yet. If you say yes, it becomes part of Msingi Foods' handbook. Ask Msingi Foods answers from it, and check-ins are read with it in mind. If you say no, nothing from it is kept.",
    );
    expect(reply.blocks.find((b: any) => b.type === 'proposal')).toMatchObject({ summary: "Add Staff handbook to Msingi Foods' handbook?" });
    expect(rows[0]).toMatchObject({ kind: 'organisation_document', state: 'PARKED' });
    expect(ingested).toEqual([]);
    expect(remembered[0].said).toBe('Here is Staff handbook.pdf.');
  });

  it('her yes adds it to the handbook', async () => {
    const { s, rows, ingested } = assistantWorld();
    await s.sayBackADocumentForTheOrganisation(ORG, 'pp', 'Staff handbook.pdf', 'Staff handbook', HANDBOOK);
    const reply = await s.resolveParkedOrganisationDocument(ORG, 'pp', 'grace-ext', rows[0], 'yes');
    expect(textOf(reply)).toBe("I have added Staff handbook to Msingi Foods' handbook, in 3 parts. Ask Msingi Foods answers from it from now on.");
    expect(ingested).toHaveLength(1);
    expect(ingested[0]).toMatchObject({ title: 'Staff handbook', text: HANDBOOK, kind: 'handbook' });
    expect(rows[0].state).toBe('ACCEPTED');
    expect(rows[0].payload.words).toBeUndefined();
  });

  it('her no keeps nothing, not even the words that waited', async () => {
    const { s, rows, ingested } = assistantWorld();
    await s.sayBackADocumentForTheOrganisation(ORG, 'pp', 'Staff handbook.pdf', 'Staff handbook', HANDBOOK);
    const reply = await s.resolveParkedOrganisationDocument(ORG, 'pp', 'grace-ext', rows[0], 'no');
    expect(textOf(reply)).toBe('I have not added Staff handbook. Nothing from it was kept.');
    expect(ingested).toEqual([]);
    expect(rows[0].state).toBe('DECLINED');
    expect(rows[0].payload.words).toBeUndefined();
  });

  it('a yes from somebody who is no longer an admin adds nothing', async () => {
    const { s, rows, ingested } = assistantWorld({ admin: false });
    await s.sayBackADocumentForTheOrganisation(ORG, 'pp', 'Staff handbook.pdf', 'Staff handbook', HANDBOOK);
    const reply = await s.resolveParkedOrganisationDocument(ORG, 'pp', 'grace-ext', rows[0], 'yes');
    expect(textOf(reply)).toBe('Only an admin of Msingi Foods can add a document for the whole organisation. I have not added Staff handbook. Nothing from it was kept.');
    expect(ingested).toEqual([]);
  });
});

describe('after the yes, a question the handbook answers', () => {
  it('is answered from the handbook, not told there are no documents to open', async () => {
    const docs = require('../assistant/a-question-is-answered-from-the-documents');
    const spy = jest.spyOn(docs, 'answerFromTheDocuments').mockResolvedValue(docs.NO_DOCUMENTS_TO_READ);
    const { s } = assistantWorld();
    s.knowledge.retrieve = jest.fn(async () => ({ cards: [{ title: 'Staff handbook - Travel', body: 'Use the travel form five working days before you travel.' }], truncated: false }));
    s.keptThatMatches = jest.fn(async () => []);
    const reply = await s.aQuestionAnsweredFromTheDocuments(ORG, 'grace-ext', 'u-grace', null, 'What is our travel policy?');
    expect(textOf(reply)).toBe('Staff handbook - Travel\nUse the travel form five working days before you travel.');
    s.knowledge.retrieve = jest.fn(async () => ({ cards: [], truncated: false }));
    const none = await s.aQuestionAnsweredFromTheDocuments(ORG, 'grace-ext', 'u-grace', null, 'What is our travel policy?');
    expect(textOf(none)).toBe(docs.NO_DOCUMENTS_TO_READ);
    spy.mockRestore();
  });
});
