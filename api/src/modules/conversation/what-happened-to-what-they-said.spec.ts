import { readFileSync } from 'fs';
import { join } from 'path';
import { theSettlements, READ_WHAT_HAPPENED, itHappenedInTheirWords } from './what-happened-to-what-they-said';
import { theMaterialAsText, THE_ASSESSMENT_PROMPT } from './the-assessment';
import { anAssessmentHolding } from './an-assessment-for-a-spec';
import { ConversationService } from './conversation.service';

/** WHAT HAPPENED TO WHAT THEY SAID THEY WOULD DO (week 9). See what-happened-to-what-they-said.ts. */

const SAID = ['I sent the quote on Tuesday.', 'I did not get to Westgate.'];
const SENT = { item: 1, happened: 'DONE', words: 'I sent the quote on Tuesday' };

const OPEN = [
  { id: 'c1', text: 'Send Green Mart the quote', whenSaid: 'by Friday', status: 'UNKNOWN' },
  { id: 'c2', text: 'Call the buyer at Lakeside', whenSaid: null, status: 'UNKNOWN' },
  { id: 'c3', text: 'Visit Westgate Deli', whenSaid: 'on Friday', status: 'UNKNOWN' },
];

describe('what is settled', () => {
  it('done and not done, by the number given', () => {
    expect(theSettlements(OPEN, [SENT, { item: 3, happened: 'NOT_DONE' }], SAID)).toEqual([
      { id: 'c1', status: 'DONE' }, { id: 'c3', status: 'NOT_DONE' },
    ]);
  });
  it('open, anything unknown, a number not given, and a second answer for one item are all left alone', () => {
    expect(theSettlements(OPEN, [{ item: 2, happened: 'OPEN' }, { ...SENT, item: 9 }, { ...SENT, item: 0 }, { ...SENT, item: 1.5 }, { item: 2, happened: 'MAYBE' }], SAID)).toEqual([]);
    expect(theSettlements(OPEN, [SENT, { item: 1, happened: 'NOT_DONE' }], SAID)).toEqual([{ id: 'c1', status: 'DONE' }]);
    expect(theSettlements(OPEN, null, SAID)).toEqual([]);
  });
  it('never a row that is already settled', () => {
    expect(theSettlements([{ ...OPEN[0], status: 'DONE' }], [{ item: 1, happened: 'NOT_DONE' }], SAID)).toEqual([]);
  });
});

describe('a promise is done only when they say it happened (change 3)', () => {
  const DONHOLM = [{ id: 'd1', text: 'Get Donholm Distributors to place a 100-bag order', whenSaid: 'this week', status: 'UNKNOWN' }];
  it('Victor\'s plan, "Donholm placing a 100-bag order this week counts as a new account", stays open', () => {
    const said = ['Donholm Distributors placing a 100-bag order this week counts as a new account and meets the minimum order size.'];
    expect(theSettlements(DONHOLM, [{ item: 1, happened: 'DONE', words: 'Donholm Distributors placing a 100-bag order this week counts as a new account' }], said)).toEqual([]);
    expect(theSettlements(DONHOLM, [{ item: 1, happened: 'DONE' }], said)).toEqual([]);
  });
  it('a real confirmation in his own words, "Donholm placed their 100-bag order on Tuesday", is done', () => {
    const said = ['Yes. Donholm placed their 100-bag order on Tuesday, order number 4471.'];
    expect(theSettlements(DONHOLM, [{ item: 1, happened: 'DONE', words: 'Donholm placed their 100-bag order on Tuesday' }], said)).toEqual([{ id: 'd1', status: 'DONE' }]);
  });
  it('words that are not theirs, only in the question, or that say "not yet" or "will" are never done', () => {
    expect(itHappenedInTheirWords('Donholm placed the order', [{ asked: 'Has Donholm placed the order?', said: 'I am chasing them.' }])).toBe(false);
    expect(itHappenedInTheirWords('I have not sent the quote yet', ['I have not sent the quote yet.'])).toBe(false);
    expect(itHappenedInTheirWords("I'll chase Fatuma again", ["I'll chase Fatuma again for the final prices."])).toBe(false);
    expect(itHappenedInTheirWords('I chased Fatuma on Monday', ['I chased Fatuma on Monday and she sent the prices.'])).toBe(true);
    expect(itHappenedInTheirWords('that is done', ['That is done.'])).toBe(true);
  });
  it('the model is told a plan is open, with the Donholm example', () => {
    expect(READ_WHAT_HAPPENED).toContain('A plan, a promise, an expectation, or something they say will count when it happens is OPEN, never DONE');
    expect(READ_WHAT_HAPPENED).toContain('For DONE, also give "words"');
  });
});

describe('a promise is kept only from what is confirmed (Hafsah, 12 October, night quality run 2)', () => {
  it('Collins\'s "I will do ten kits" is not kept by "Last week I did nine, maybe ten, so I know it works."', () => {
    const open = [{ id: 'k10', text: 'I will do ten kits', whenSaid: 'this week', status: 'UNKNOWN' }];
    const said = ['Last week I did nine, maybe ten, so I know it works.'];
    expect(theSettlements(open, [{ item: 1, happened: 'DONE', words: 'Last week I did nine' }], said)).toEqual([]);
    expect(theSettlements(open, [{ item: 1, happened: 'DONE', words: 'Last week I did nine, maybe ten' }], said)).toEqual([]);
  });
  it('his "twelve kits" is not kept by "I did eleven", which he took back two answers later', () => {
    const open = [{ id: 'k12', text: "This week I will do twelve kits, six for the women's group on Wednesday and the Oyugis stockist", whenSaid: 'This week', status: 'UNKNOWN' }];
    const said = [
      'I did eleven, all the deliveries are done. It was only the rain that stopped the twelfth, and the women\'s group.',
      'I do not defer it, Mama Akinyi\'s group has not met and the rain closed the road. That is all.',
      'The M-Pesa messages show it, but I do not have them with me. Honestly eleven was rounding up, it is lower, maybe four or five. I will send the codes.',
    ];
    expect(theSettlements(open, [{ item: 1, happened: 'DONE', words: 'all the deliveries are done' }], said)).toEqual([]);
    expect(theSettlements(open, [{ item: 1, happened: 'DONE', words: 'I did eleven' }], said)).toEqual([]);
    /* Not taken back and at least the number promised: kept. */
    expect(theSettlements(open, [{ item: 1, happened: 'DONE', words: 'I did twelve' }], ['I did twelve, the codes are in the book.'])).toEqual([{ id: 'k12', status: 'DONE' }]);
  });
});

describe('what the model is told', () => {
  it('a new date or work in progress is open, never a miss, and doubt is open', () => {
    expect(READ_WHAT_HAPPENED).toContain('A new date or a new plan for the same thing is OPEN, never NOT_DONE.');
    expect(READ_WHAT_HAPPENED).toContain('When in doubt, OPEN.');
    expect(READ_WHAT_HAPPENED).toContain("Use only this person's own words.");
  });
  /* Changed 1 November 2026: the read is part of the conversation's assessment now, so its open promises are given by id in the assessment's material, and these rules are quoted whole in its instructions. */
  it('their commitments, by id, beside their own words, and the rules quoted whole', () => {
    const text = theMaterialAsText({ who: 'Amani', isTheLead: false, checkIn: null, givenRole: null, priorities: [], turns: [{ role: 'person', content: 'I sent the quote on Tuesday.', n: 1 }], setup: null, draft: { claims: [], lines: [] }, previous: null, openPromises: OPEN.slice(0, 2) });
    expect(text).toContain('  [c:c1] Send Green Mart the quote (by Friday)\n  [c:c2] Call the buyer at Lakeside');
    expect(text).toContain('[1] THE PERSON: I sent the quote on Tuesday.');
    expect(THE_ASSESSMENT_PROMPT).toContain(READ_WHAT_HAPPENED);
  });
});

describe('after a check-in', () => {
  /* Changed 1 November 2026: what happened to each promise comes from the conversation's assessment (its promisesDue, by the record's id), not a call of its own. Same outcomes, given through it. */
  function aService(outcomes: any[]) {
    const assessment: any = anAssessmentHolding();
    assessment.comparedWithLastTime.promisesDue = outcomes.map((o, i) => ({ id: `d${i}`, words: o.words ?? '', from: [1], whoMaySee: 'the people in this check-in', saidWordForWord: false, previousItem: `c:${OPEN[o.item - 1]?.id}`, happened: o.happened }));
    const prisma: any = {
      checkIn: { findUnique: jest.fn(async () => ({ groundId: 'g1', participantId: 'p1', startedAt: new Date('2026-09-29T09:00:00Z'), sessionReport: assessment, turns: [{ content: 'I sent the quote on Tuesday.' }, { content: 'I did not get to Westgate.' }] })) },
      groundCommitment: { findMany: jest.fn(async () => OPEN), updateMany: jest.fn(async () => ({ count: 1 })) },
    };
    const anthropic: any = { extract: jest.fn(async () => { throw new Error('what happened is read from the assessment, never a call of its own'); }) };
    const nothing: any = { get: () => undefined, emit: jest.fn(() => Promise.resolve()) };
    return { svc: new ConversationService(prisma, {} as any, anthropic, {} as any, nothing, nothing, nothing, nothing, nothing, nothing) as any, prisma, anthropic };
  }
  it('settles what they said, with when and which check-in, and only if still open', async () => {
    const { svc, prisma } = aService([SENT, { item: 3, happened: 'NOT_DONE' }]);
    expect(await svc.settleWhatTheySaidTheyWouldDo('ci2')).toBe(2);
    const where = prisma.groundCommitment.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ groundId: 'g1', participantId: 'p1', status: 'UNKNOWN', createdAt: { lt: new Date('2026-09-29T09:00:00Z') } });
    expect(prisma.groundCommitment.updateMany.mock.calls.map((c: any) => c[0])).toEqual([
      { where: { id: 'c1', status: 'UNKNOWN' }, data: { status: 'DONE', settledAt: expect.any(Date), settledInCheckInId: 'ci2', settledBy: 'SAID' } },
      { where: { id: 'c3', status: 'UNKNOWN' }, data: { status: 'NOT_DONE', settledAt: expect.any(Date), settledInCheckInId: 'ci2', settledBy: 'SAID' } },
    ]);
  });
  it('a DONE the model gives without their words is not written: the promise stays open', async () => {
    const { svc, prisma } = aService([{ item: 1, happened: 'DONE', words: 'I will send the quote' }]);
    expect(await svc.settleWhatTheySaidTheyWouldDo('ci2')).toBe(0);
    expect(prisma.groundCommitment.updateMany).not.toHaveBeenCalled();
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

describe('what one of their own lines is called, from the record (night quality run 2, Collins)', () => {
  const { whatALineOfTheirsIsCalled, A_LINE_DONE_SAYS, A_LINE_SAID_TO_HAVE_HAPPENED_SAYS } = jest.requireActual('./what-happened-to-what-they-said');
  it('a hedged number or somebody else\'s word passed on is not "something you got done"', () => {
    expect(whatALineOfTheirsIsCalled({ type: 'PROGRESS', text: 'Last week I did nine, maybe ten, so I know it works.', mark: 'memory' })).toBe(A_LINE_SAID_TO_HAVE_HAPPENED_SAYS);
    expect(whatALineOfTheirsIsCalled({ type: 'PROGRESS', text: "Mama Akinyi says they are happy, they just want to see the kit working at a neighbour's house first.", mark: 'said' })).toBe(A_LINE_SAID_TO_HAVE_HAPPENED_SAYS);
    expect(A_LINE_SAID_TO_HAVE_HAPPENED_SAYS).toBe('This is what you said happened. It is not counted as done until something shows it.');
  });
  it('their own past-tense words, or proof, are; and other kinds of line are left to their own name', () => {
    expect(whatALineOfTheirsIsCalled({ type: 'PROGRESS', text: "the women's group met on Thursday.", mark: 'memory' })).toBe(A_LINE_DONE_SAYS);
    expect(whatALineOfTheirsIsCalled({ type: 'PROGRESS', text: 'Last week I did nine, maybe ten.', mark: 'proven' })).toBe(A_LINE_DONE_SAYS);
    expect(whatALineOfTheirsIsCalled({ type: 'COMMITMENT', text: 'I will visit them Thursday and Friday.', mark: 'said' })).toBeNull();
  });
});
