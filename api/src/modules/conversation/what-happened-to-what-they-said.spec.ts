import { readFileSync } from 'fs';
import { join } from 'path';
import { theSettlements, thePrompt, READ_WHAT_HAPPENED } from './what-happened-to-what-they-said';
import { ConversationService } from './conversation.service';

/** WHAT HAPPENED TO WHAT THEY SAID THEY WOULD DO (week 9). See what-happened-to-what-they-said.ts. */

const OPEN = [
  { id: 'c1', text: 'Send Green Mart the quote', whenSaid: 'by Friday', status: 'UNKNOWN' },
  { id: 'c2', text: 'Call the buyer at Lakeside', whenSaid: null, status: 'UNKNOWN' },
  { id: 'c3', text: 'Visit Westgate Deli', whenSaid: 'on Friday', status: 'UNKNOWN' },
];

describe('what is settled', () => {
  it('done and not done, by the number given', () => {
    expect(theSettlements(OPEN, [{ item: 1, happened: 'DONE' }, { item: 3, happened: 'NOT_DONE' }])).toEqual([
      { id: 'c1', status: 'DONE' }, { id: 'c3', status: 'NOT_DONE' },
    ]);
  });
  it('open, anything unknown, a number not given, and a second answer for one item are all left alone', () => {
    expect(theSettlements(OPEN, [{ item: 2, happened: 'OPEN' }, { item: 9, happened: 'DONE' }, { item: 0, happened: 'DONE' }, { item: 1.5, happened: 'DONE' }, { item: 2, happened: 'MAYBE' }])).toEqual([]);
    expect(theSettlements(OPEN, [{ item: 1, happened: 'DONE' }, { item: 1, happened: 'NOT_DONE' }])).toEqual([{ id: 'c1', status: 'DONE' }]);
    expect(theSettlements(OPEN, null)).toEqual([]);
  });
  it('never a row that is already settled', () => {
    expect(theSettlements([{ ...OPEN[0], status: 'DONE' }], [{ item: 1, happened: 'NOT_DONE' }])).toEqual([]);
  });
});

describe('what the model is told', () => {
  it('a new date or work in progress is open, never a miss, and doubt is open', () => {
    expect(READ_WHAT_HAPPENED).toContain('A new date or a new plan for the same thing is OPEN, never NOT_DONE.');
    expect(READ_WHAT_HAPPENED).toContain('When in doubt, OPEN.');
    expect(READ_WHAT_HAPPENED).toContain("Use only this person's own words.");
  });
  it('their commitments, numbered, and their own words only', () => {
    expect(thePrompt(OPEN.slice(0, 2), ['I sent the quote on Tuesday.'])).toBe(
      'WHAT THEY SAID THEY WOULD DO:\n1. Send Green Mart the quote (by Friday)\n2. Call the buyer at Lakeside\n\nWHAT THEY SAID IN THIS CHECK-IN, in order:\n1. I sent the quote on Tuesday.',
    );
  });
});

describe('after a check-in', () => {
  function aService(outcomes: any[]) {
    const prisma: any = {
      checkIn: { findUnique: jest.fn(async () => ({ groundId: 'g1', participantId: 'p1', startedAt: new Date('2026-09-29T09:00:00Z'), turns: [{ content: 'I sent the quote on Tuesday.' }, { content: 'I did not get to Westgate.' }] })) },
      groundCommitment: { findMany: jest.fn(async () => OPEN), updateMany: jest.fn(async () => ({ count: 1 })) },
    };
    const anthropic: any = { extract: jest.fn(async () => ({ outcomes })) };
    const nothing: any = { get: () => undefined, emit: jest.fn(() => Promise.resolve()) };
    return { svc: new ConversationService(prisma, {} as any, anthropic, {} as any, nothing, nothing, nothing, nothing, nothing, nothing) as any, prisma, anthropic };
  }
  it('settles what they said, with when and which check-in, and only if still open', async () => {
    const { svc, prisma } = aService([{ item: 1, happened: 'DONE' }, { item: 3, happened: 'NOT_DONE' }]);
    expect(await svc.settleWhatTheySaidTheyWouldDo('ci2')).toBe(2);
    const where = prisma.groundCommitment.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ groundId: 'g1', participantId: 'p1', status: 'UNKNOWN', createdAt: { lt: new Date('2026-09-29T09:00:00Z') } });
    expect(prisma.groundCommitment.updateMany.mock.calls.map((c: any) => c[0])).toEqual([
      { where: { id: 'c1', status: 'UNKNOWN' }, data: { status: 'DONE', settledAt: expect.any(Date), settledInCheckInId: 'ci2', settledBy: 'SAID' } },
      { where: { id: 'c3', status: 'UNKNOWN' }, data: { status: 'NOT_DONE', settledAt: expect.any(Date), settledInCheckInId: 'ci2', settledBy: 'SAID' } },
    ]);
  });
  it('asks nothing when nothing of theirs was open', async () => {
    const { svc, prisma, anthropic } = aService([]);
    prisma.groundCommitment.findMany = jest.fn(async () => []);
    expect(await svc.settleWhatTheySaidTheyWouldDo('ci2')).toBe(0);
    expect(anthropic.extract).not.toHaveBeenCalled();
  });
  it('runs after each check-in, before what they promised this time is written', () => {
    const src = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const at = src.indexOf('this.settleWhatTheySaidTheyWouldDo(checkIn.id)');
    expect(at).toBeGreaterThan(-1);
    expect(src.indexOf('this.writeWhatTheyPromised(checkIn.id)', at)).toBeGreaterThan(at);
  });
  it('a commitment settled by hand gets its date too, is marked as their word, and loses both when moved back to open', () => {
    const grounds = readFileSync(join(__dirname, '..', 'grounds', 'grounds.service.ts'), 'utf8');
    expect(grounds).toContain("data: { status: clean, settledAt: clean === 'DONE' || clean === 'NOT_DONE' ? new Date() : null, settledInCheckInId: null, settledBy: clean === 'DONE' || clean === 'NOT_DONE' ? 'SAID' : null },");
  });
});
