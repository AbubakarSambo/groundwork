import { ConversationService } from './conversation.service';

/**
 * WHAT HAPPENED TO A PROMISE IS READ FROM THE ASSESSMENT ONLY (assessment test, 2 November 2026).
 *
 * A word rule (theySaidItDidNotHappen) used to turn a promise already read as kept into not done whenever a later sentence said
 * "have not" next to two of the promise's words. In the assessment test Aisha's assessment read her promise as kept, "I sent the aged
 * debt list to Wanjiru on Wednesday 4 November, a day early". In her next check-in she said "I have not had a discussion with Wanjiru
 * about the aged debt list." The rule matched "have not" and "aged debt list", changed the promise to not done, and the board told
 * Wanjiru "Aisha Mohamed said later that it was not done." The rule is gone: the conversation's assessment reads what happened.
 */
const PROMISE = 'I will send the aged debt list to Wanjiru by Thursday.';
const ASKED = 'Last time you sent Wanjiru the aged debt list. What came of it?';
const SAID = 'I have not had a discussion with Wanjiru about the aged debt list.';

describe("Aisha's aged debt list", () => {
  it('stays kept when a later sentence says "have not" about something else', async () => {
    const service: any = Object.create(ConversationService.prototype);
    service.logger = { warn: jest.fn(), log: jest.fn(), error: jest.fn() };
    const rows: any[] = [{ id: 'c-list', text: PROMISE, status: 'DONE', settledBy: 'SAID', settledInCheckInId: 'aisha-2' }];
    service.prisma = {
      checkIn: { findUnique: jest.fn(async () => ({ groundId: 'g-law', participantId: 'gp-aisha', startedAt: new Date('2026-11-16T08:00:00Z'), sessionReport: null, turns: [{ role: 'AI', content: ASKED }, { role: 'PERSON', content: SAID }] })) },
      groundCommitment: {
        findMany: jest.fn(async ({ where }: any) => rows.filter((r) => r.status === where.status)),
        updateMany: jest.fn(async ({ where, data }: any) => { const r = rows.find((x) => x.id === where.id && x.status === where.status); if (r) Object.assign(r, data); return { count: r ? 1 : 0 }; }),
      },
    };
    await service.settleWhatTheySaidTheyWouldDo('aisha-3');
    expect(rows[0].status).toBe('DONE');
    expect(rows[0].settledInCheckInId).toBe('aisha-2');
  });
});

describe("Aisha's week on Thursday 15 October", () => {
  it('no longer says she kept the call', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { theOwnKept, theOwnKeptWords } = require('../grounds/your-board');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { theirWeekInWords } = require('../engagement/the-participants-week');
    const NOW = new Date('2026-10-15T11:15:00Z');
    const rows = [
      { status: 'DONE', text: "I'll follow up again today to see if we can get those moving.", createdAt: new Date('2026-10-13T06:32:39Z'), settledAt: new Date('2026-10-13T18:30:00Z') },
      { status: 'NOT_DONE', text: PROMISE, createdAt: new Date('2026-10-13T06:32:39Z'), settledAt: new Date('2026-10-14T11:03:00Z') },
      { status: 'NOT_DONE', text: "I'll also check if there's anything I can do from our end to assist them in getting those finalized.", createdAt: new Date('2026-10-13T06:32:39Z'), settledAt: new Date('2026-10-13T18:30:00Z') },
    ];
    const w = theirWeekInWords('Aisha', { kept: theOwnKept(rows, NOW), keptWhat: theOwnKeptWords(rows, NOW), keptSince: 'Tuesday 13 October', open: [], waitingOn: [], waitingOnYou: [] });
    expect(w.lines[1]).toBe('You kept one of the three things you said you would do since Tuesday 13 October, "Follow up again today to see if we can get those moving".');
    expect(w.lines.join(' ')).not.toContain('Be calling the HR manager');
  });
});
