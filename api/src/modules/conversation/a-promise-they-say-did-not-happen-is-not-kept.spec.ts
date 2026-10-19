import { theySaidItDidNotHappen } from './what-happened-to-what-they-said';
import { ConversationService } from './conversation.service';

/**
 * Muchemi & Co. (test), messages test, fourth run. Aisha promised on Tuesday 13 October "I'll be calling the HR manager at Jamii Clinics
 * again to directly follow up on the witness statements." It was read as done that day. On Wednesday she was asked "In the last check-in,
 * on Tuesday 13 October, you said you would be calling the HR manager at Jamii Clinics again that day to follow up on the witness
 * statements. What did you find out?" and said "I'm afraid I didn't manage to call the HR manager yesterday. I'll be sure to do that
 * tomorrow, though." Her week on Thursday said she had kept it.
 */
const PROMISE = "I'll be calling the HR manager at Jamii Clinics again to directly follow up on the witness statements.";
const ASKED = 'In the last check-in, on Tuesday 13 October, you said you would be calling the HR manager at Jamii Clinics again that day to follow up on the witness statements. What did you find out?';
const SAID = "I'm afraid I didn't manage to call the HR manager yesterday. I'll be sure to do that tomorrow, though.";

describe("Aisha's call to the HR manager", () => {
  it('her "I didn\'t manage to call the HR manager" says it did not happen', () => {
    expect(theySaidItDidNotHappen(PROMISE, [{ asked: ASKED, said: SAID }])).toBe(true);
    expect(theySaidItDidNotHappen(PROMISE, [{ asked: ASKED, said: 'I called the HR manager this morning.' }])).toBe(false);
    expect(theySaidItDidNotHappen(PROMISE, [{ asked: ASKED, said: "I didn't get the proof of payment from Mr. Baraka." }])).toBe(false);
  });

  it('read as done on Tuesday, it is not done once she said so on Wednesday', async () => {
    const service: any = Object.create(ConversationService.prototype);
    service.logger = { warn: jest.fn(), log: jest.fn(), error: jest.fn() };
    const rows: any[] = [{ id: 'c-call', text: PROMISE, status: 'DONE', settledBy: 'SAID', settledInCheckInId: 'aisha-lit-2' }];
    service.prisma = {
      checkIn: { findUnique: jest.fn(async () => ({ groundId: 'g-lit', participantId: 'gp-aisha', startedAt: new Date('2026-10-14T11:01:00Z'), turns: [{ role: 'AI', content: ASKED }, { role: 'PERSON', content: SAID }] })) },
      groundCommitment: {
        findMany: jest.fn(async ({ where }: any) => rows.filter((r) => r.status === where.status)),
        updateMany: jest.fn(async ({ where, data }: any) => { const r = rows.find((x) => x.id === where.id && x.status === where.status); if (r) Object.assign(r, data); return { count: r ? 1 : 0 }; }),
      },
    };
    service.anthropic = { extract: jest.fn(async () => ({ outcomes: [] })) };
    await service.settleWhatTheySaidTheyWouldDo('aisha-lit-3');
    expect(rows[0].status).toBe('NOT_DONE');
    expect(rows[0].settledInCheckInId).toBe('aisha-lit-3');
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
