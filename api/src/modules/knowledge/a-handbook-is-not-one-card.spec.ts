import { chunk, isHeading, chunkKey, chunkTitle, documentKeyOf, CHUNK_CHARS, KEEP_WHOLE_UP_TO } from './a-document-is-not-a-card';
import { KnowledgeService } from './knowledge.service';

const HANDBOOK = `Staff handbook

Expenses

Anything under 100 pounds you can just claim, no approval needed. Over that, ask your manager
before you spend it, not after.

Receipts go in within thirty days. After that finance will not process them.

Leave

Twenty five days plus bank holidays. Book it in the tool, and give two weeks notice for anything
longer than three days.

LOCKED OUT

Call the service desk on 4400. Do not ask a colleague to log in for you.`;

describe('a handbook is not one card', () => {
  it('splits on headings, so one chunk never answers for two policies', () => {
    const chunks = chunk('Staff handbook', HANDBOOK);
    const expenses = chunks.filter(c => c.heading === 'Expenses');
    const leave = chunks.filter(c => c.heading === 'Leave');

    expect(expenses.length).toBeGreaterThan(0);
    expect(leave.length).toBeGreaterThan(0);

    /*
     * THE FAILURE THIS IS FOR. A chunk holding the end of expenses and the start of leave is
     * retrieved for a question about either and quoted as though both were the answer.
     */
    for (const c of expenses) expect(c.body).not.toContain('Twenty five days');
    for (const c of leave) expect(c.body).not.toContain('Receipts go in');
  });

  it('keeps the policy verbatim, because how_we_work quotes rather than paraphrases', () => {
    const all = chunk('Staff handbook', HANDBOOK).map(c => c.body).join('\n');
    expect(all).toContain('Anything under 100 pounds you can just claim, no approval needed.');
    expect(all).toContain('Call the service desk on 4400.');
  });

  it('titles every chunk with its document as well as its section', () => {
    const c = chunk('Staff handbook', HANDBOOK).find(x => x.heading === 'Expenses')!;
    /* "Expenses" alone does not say which handbook - a staff one and a contractor one disagree. */
    expect(chunkTitle('Staff handbook', c)).toBe('Staff handbook - Expenses');
    expect(chunkTitle('Staff handbook', { index: 1, heading: 'Staff handbook', body: 'x' })).toBe('Staff handbook');
  });

  it('recognises the heading shapes people write, and refuses a wrapped sentence', () => {
    expect(isHeading('## Expenses', '')).toBe(true);
    expect(isHeading('EXPENSES', 'text')).toBe(true);
    expect(isHeading('3.1 Expenses', '')).toBe(true);
    expect(isHeading('Expenses', '')).toBe(true);

    /* The loose rule is the dangerous one: promoting a fragment makes it a card's title. */
    expect(isHeading('Anything under 100 pounds you can just claim, no approval needed.', '')).toBe(false);
    expect(isHeading('and this line simply carries on from the one above it without ending', 'more')).toBe(false);
    expect(isHeading('', '')).toBe(false);
  });

  it('never returns a chunk so large that one of them is the whole answer', () => {
    const long = Array.from({ length: 40 }, (_, i) => `Sentence number ${i} about a policy that goes on at some length.`).join(' ');
    for (const c of chunk('Doc', long)) expect(c.body.length).toBeLessThanOrEqual(KEEP_WHOLE_UP_TO + CHUNK_CHARS);
  });

  it('cuts a wall of text with no sentence ends at all, rather than emitting it whole', () => {
    const wall = 'name'.repeat(2_000);
    const chunks = chunk('Doc', wall);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.body.length).toBeLessThanOrEqual(CHUNK_CHARS + 10);
  });

  it('derives keys that read back to their document', () => {
    expect(chunkKey('handbook-2026', 3)).toBe('handbook-2026#3');
    expect(documentKeyOf('handbook-2026#3')).toBe('handbook-2026');
    expect(documentKeyOf('a-plain-card')).toBeNull();
  });
});

describe('ingesting a document', () => {
  function svc(currentKeys: string[] = []) {
    const put = jest.fn(async () => ({}));
    const retire = jest.fn(async () => ({}));
    const prisma: any = {
      knowledgeCard: { findMany: jest.fn(async () => currentKeys.map(key => ({ key }))) },
    };
    const service = new KnowledgeService(prisma as any);
    (service as any).put = put;
    (service as any).retire = retire;
    return { service, put, retire, prisma };
  }

  it('writes every chunk through put, so supersession is not reimplemented', async () => {
    const { service, put } = svc();
    const res = await service.ingestDocument('org-a', { key: 'hb', title: 'Staff handbook', text: HANDBOOK });

    expect(put).toHaveBeenCalled();
    expect(res.chunks).toBe(put.mock.calls.length);
    const keys = put.mock.calls.map((c: any) => c[1].key);
    expect(keys[0]).toBe('hb#1');
    expect(new Set(keys).size).toBe(keys.length);
    for (const c of put.mock.calls) expect((c as any)[1].kind).toBe('handbook');
  });

  it('retires the chunks a shorter version no longer covers', async () => {
    /*
     * THE BUG THIS EXISTS FOR. A handbook re-uploaded with a section deleted produces fewer chunks;
     * the ones beyond the new count are never written again, so they stay current and keep
     * answering questions from a section the customer removed. `put` cannot see this - it is handed
     * one card and knows nothing about how many there should be.
     */
    const { service, retire, prisma } = svc(['hb#1', 'hb#2', 'hb#9', 'hb#10']);
    const res = await service.ingestDocument('org-a', { key: 'hb', title: 'Staff handbook', text: 'Short\n\nOne paragraph only.' });

    const retired = retire.mock.calls.map((c: any) => c[1]);
    expect(retired).toContain('hb#9');
    expect(retired).toContain('hb#10');
    expect(res.retired).toBe(retired.length);

    /* Scoped to this document, and only what is still current. */
    const where = prisma.knowledgeCard.findMany.mock.calls[0][0].where;
    expect(where.key.startsWith).toBe('hb#');
    expect(where.effectiveTo).toBeNull();
    expect(where.organizationId).toBe('org-a');
  });

  it('never retires another document whose key starts the same way', async () => {
    const { service, prisma } = svc([]);
    await service.ingestDocument('org-a', { key: 'hb', title: 'T', text: 'A\n\nb.' });
    /* "hb#" and not "hb", or "hb-contractors#1" would be swept up with it. */
    expect(prisma.knowledgeCard.findMany.mock.calls[0][0].where.key.startsWith).toBe('hb#');
  });

  it('will not answer an as-of question for today when the date was not readable', () => {
    /*
     * It defaulted to `new Date()`, so `?when=` - the wrong parameter name - returned today's card
     * with no sign the date had been ignored. I hit this while driving the endpoint and believed
     * the answer. A caller asking what the handbook said in March would get today's and have every
     * reason to trust it.
     */
    const { KnowledgeController } = require('./knowledge.controller');
    const asOf = jest.fn(async () => ({}));
    const c = new KnowledgeController({ asOf } as any);
    const req = { machine: { organizationId: 'org-a' } } as any;

    expect(() => c.asOf(req, 'k', undefined as any)).toThrow(/needs a date/);
    expect(() => c.asOf(req, 'k', '')).toThrow(/needs a date/);
    expect(() => c.asOf(req, 'k', 'nonsense')).toThrow(/needs a date/);
    expect(asOf).not.toHaveBeenCalled();

    c.asOf(req, 'k', '2026-03-01T00:00:00Z');
    expect(asOf).toHaveBeenCalledTimes(1);
    expect((asOf.mock.calls[0] as any)[2].toISOString()).toBe('2026-03-01T00:00:00.000Z');
  });

  it('refuses what it cannot store, and says which part is missing', async () => {
    const { service } = svc();
    await expect(service.ingestDocument('org-a', { key: '', title: 'T', text: 'x' })).rejects.toThrow(/key is required/);
    await expect(service.ingestDocument('org-a', { key: 'k', title: '', text: 'x' })).rejects.toThrow(/Add a title/);
    await expect(service.ingestDocument('org-a', { key: 'k', title: 'T', text: '  ' })).rejects.toThrow(/text is required/);
  });
});
