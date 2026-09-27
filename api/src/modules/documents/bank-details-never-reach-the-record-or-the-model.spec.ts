import { readFileSync } from 'fs';
import { join } from 'path';
import { DocumentsService } from './documents.service';
import { HIDDEN } from './bank-details-are-never-kept';

/**
 * AN ACCOUNT NUMBER AND A CARD NUMBER, UPLOADED, AND NEITHER STORED NOR SENT TO A MODEL.
 *
 * The capability check, 27 September 2026: atlas-budget.docx held a made-up bank account number,
 * and it sat whole in `ground_documents.content` and reached the model in every session. This runs
 * the real `DocumentsService.upload`, with the database and the model mocked, for a text file and
 * for a photo the vision model reads, and collects every argument the database was asked to write
 * and every input any model call was given - the origin read, the assessment, what it holds, the
 * description check, the terms, the anchoring - and looks for either number in any of them.
 */

const ACCOUNT = '0123456789';
const CARD = '4111 1111 1111 1111';
const CARD_DIGITS = CARD.replace(/\s/g, '');

const THE_TEXT = [
  'Atlas budget, Q4.',
  'The approved budget for Atlas is 38,000 dollars, not to be passed.',
  'The second invoice is 12,000, by 10 November.',
  `Pay Harbor Foods at Zenith Bank, account number ${ACCOUNT}.`,
  `Or by card ${CARD}.`,
  'Questions to Ngozi on 0803 123 4567.',
].join('\n');

function serviceWith(opts: { vision?: string } = {}) {
  const writes: unknown[] = [];
  const modelInputs: unknown[] = [];
  const reads = {
    findMany: jest.fn(async () => []),
    findFirst: jest.fn(async () => null),
    count: jest.fn(async () => 0),
  };
  const model = (own: Record<string, any> = {}) => ({
    ...reads,
    create: jest.fn(async (args: any) => { writes.push(args); return { id: 'doc-1', fileName: args?.data?.fileName, mimeType: args?.data?.mimeType, createdAt: new Date(), assessment: null, uploaderNote: args?.data?.uploaderNote ?? null, visibility: 'OWN', participantId: 'p-lead', holds: null }; }),
    createMany: jest.fn(async (args: any) => { writes.push(args); return { count: 0 }; }),
    update: jest.fn(async (args: any) => { writes.push(args); return { id: 'doc-1' }; }),
    updateMany: jest.fn(async (args: any) => { writes.push(args); return { count: 0 }; }),
    upsert: jest.fn(async (args: any) => { writes.push(args); return {}; }),
    ...own,
  });
  const prisma: any = new Proxy({
    ground: model({
      findUnique: jest.fn(async () => ({
        id: 'g-atlas', scenario: 'OKR_ALIGNMENT', initiatorId: 'u-tunde', organizationId: 'org-1',
        participants: [{ id: 'p-lead', email: 't@meridian.test', nameGiven: null, roleAsDescribed: null, managingOnly: true, userId: 'u-tunde', user: { firstName: 'Tunde', lastName: 'Bakare' } }],
        objectives: [],
      })),
    }),
    groundParticipant: model({ findFirst: jest.fn(async () => ({ id: 'p-lead', groundId: 'g-atlas', userId: 'u-tunde' })) }),
    groundDocument: model({ findUnique: jest.fn(async () => ({ id: 'doc-1', content: null, uploaderNote: 'the budget' })) }),
  }, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) target[prop] = model();
      return target[prop];
    },
  });
  const anthropic: any = {
    extract: jest.fn(async (...args: unknown[]) => { modelInputs.push(args); return null; }),
    respond: jest.fn(async (...args: unknown[]) => { modelInputs.push(args); return null; }),
    respondWithMedia: jest.fn(async (...args: unknown[]) => { modelInputs.push(['the image itself, which cannot be read before it is transcribed']); return opts.vision ?? ''; }),
  };
  const config: any = { get: jest.fn((k: string) => (k === 'app.contextEnabled' ? true : undefined)) };
  const conversation: any = {
    anchorRecordToDocuments: jest.fn(async (...args: unknown[]) => { modelInputs.push(args); return { backed: 0, of: 0 }; }),
  };
  const agreements: any = { fromADocument: jest.fn(async (...args: unknown[]) => { modelInputs.push(args); return { wrote: 0 }; }) };
  const service = new DocumentsService(prisma, anthropic, config, conversation, agreements);
  return { service, writes, modelInputs, anthropic };
}

/* Everything that ran after the answer, let finish. */
const settle = async () => { for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r)); };

const holdsEither = (anything: unknown) => {
  const s = JSON.stringify(anything);
  return s.includes(ACCOUNT) || s.includes(CARD) || s.includes(CARD_DIGITS);
};

describe('bank details never reach the record or the model', () => {
  it('a text file: neither number is written, and no model is given either', async () => {
    const { service, writes, modelInputs, anthropic } = serviceWith();
    const file: any = { originalname: 'atlas-budget.txt', mimetype: 'text/plain', buffer: Buffer.from(THE_TEXT, 'utf8'), size: THE_TEXT.length };
    const answer = await service.upload('g-atlas', 'u-tunde', file, false, 'the budget');
    await settle();

    expect(writes.length).toBeGreaterThan(0);
    expect(anthropic.extract).toHaveBeenCalled();
    expect(writes.filter(holdsEither)).toEqual([]);
    expect(modelInputs.filter(holdsEither)).toEqual([]);
    expect(holdsEither(answer)).toBe(false);

    /* What is kept is the document, with only the numbers taken out. */
    const kept = (writes[0] as any).data.content as string;
    expect(kept).toContain(`account number ${HIDDEN.account}`);
    expect(kept).toContain(`Or by card ${HIDDEN.card}.`);
    expect(kept).toContain('38,000 dollars');
    expect(kept).toContain('12,000, by 10 November');
    expect(kept).toContain('0803 123 4567');
  });

  it('a photo: what the vision model read is hidden before it is kept or read again', async () => {
    const { service, writes, modelInputs, anthropic } = serviceWith({ vision: THE_TEXT });
    const file: any = { originalname: 'harbor-invoice.jpg', mimetype: 'image/jpeg', buffer: Buffer.from('not really a jpeg'), size: 17 };
    await service.upload('g-atlas', 'u-tunde', file, false);
    await settle();

    expect(anthropic.respondWithMedia).toHaveBeenCalled();
    expect(writes.filter(holdsEither)).toEqual([]);
    expect(modelInputs.filter(holdsEither)).toEqual([]);
    expect((writes[0] as any).data.content).toContain(HIDDEN.account);
  });
});

/*
 * The other ways text reaches a document or a model without a file, pinned on the source with the
 * comments taken out, because a comment saying it is hidden is not the same as hiding it.
 */
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const DOCS = strip(readFileSync(join(__dirname, 'documents.service.ts'), 'utf8'));
const LINK = strip(readFileSync(join(__dirname, 'read-it-if-we-can.service.ts'), 'utf8'));
const GROUNDS = strip(readFileSync(join(__dirname, '..', 'grounds', 'grounds.service.ts'), 'utf8'));

describe('and every other way in goes through the same function', () => {
  it('a file is only ever read through the one that hides them', () => {
    expect(DOCS).toMatch(/private async extractContent\(file: Express\.Multer\.File\): Promise<string> \{\s*return withoutBankDetails\(await this\.readTheText\(file\)\);/);
    /* readTheText is called from extractContent and nowhere else. */
    expect(DOCS.match(/this\.readTheText\(/g)).toHaveLength(1);
    /* Both uploads, the invite link's included, read the file only that way. */
    expect(DOCS.match(/await this\.extractContent\(file\)/g)).toHaveLength(2);
    expect(DOCS).not.toMatch(/content:\s*file\.buffer/);
  });

  it('a page read from a link', () => {
    expect(LINK).toContain('return { read: true, text: withoutBankDetails(text), from: plan.asked };');
  });

  it('a paste into the context chat, its confirmation, and a line of context typed or changed', () => {
    expect(GROUNDS).toMatch(/async contextChat\([\s\S]{0,200}\) \{\s*history = withoutBankDetailsInEachTurn\(history\);/);
    expect(GROUNDS).toMatch(/async applyContextProposal\([\s\S]{0,200}?\) \{\s*dto = \{ \.\.\.dto, said: withoutBankDetails\(dto\?\.said\)/);
    expect(GROUNDS).toMatch(/async addContextLine\([\s\S]{0,200}?\) \{\s*line = \{ \.\.\.line, text: withoutBankDetails\(line\?\.text\)/);
    expect(GROUNDS).toMatch(/async changeContextLine\([\s\S]{0,250}?\) \{\s*if \(typeof change\?\.text === 'string'\) change = \{ \.\.\.change, text: withoutBankDetails\(change\.text\) \};/);
  });
});
