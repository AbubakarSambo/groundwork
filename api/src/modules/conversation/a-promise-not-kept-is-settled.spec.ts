import { ConversationService } from './conversation.service';
import { aCommitmentKey, oneOfEach, thePrompt } from './what-happened-to-what-they-said';
import { yourBoard } from '../grounds/your-board';

/**
 * WEEK 9, READ LIVE (29 September 2026). Ngozi said in session 1 "I will follow up with Mr. Adebayo
 * again" (by tomorrow). In session 3, asked "What have you done to get an answer from Mr. Adebayo
 * after escalating?", she said "I haven't done anything further. He didn't reply." It stayed open,
 * because the reading was given her answers without the questions they answered. And the one promise
 * was two rows, so her You board listed it twice.
 */
const TWO_COPIES = [
  { id: 'c1', text: 'I will follow up with Mr. Adebayo again', whenSaid: 'by tomorrow', status: 'UNKNOWN' },
  { id: 'c2', text: 'I will follow up with Mr. Adebayo again by tomorrow.', whenSaid: 'by tomorrow', status: 'UNKNOWN' },
];

describe('the same promise, written twice', () => {
  it('is one promise', () => {
    expect(aCommitmentKey(TWO_COPIES[0].text, 'by tomorrow')).toBe(aCommitmentKey(TWO_COPIES[1].text, 'by tomorrow'));
    expect(oneOfEach(TWO_COPIES).map((c) => c.id)).toEqual(['c1']);
    expect(aCommitmentKey('Call the buyer at Lakeside')).not.toBe(aCommitmentKey('Call the buyer at Westgate'));
  });

  it('is listed once on her You board', () => {
    const board: any = yourBoard(
      [{ id: 'g1', label: 'Credit sales against this quarter target', organizationId: 'o1', initiatorId: 'u-lead', participants: [{ id: 'p-ngozi', userId: 'u-ngozi' }] } as any],
      { userId: 'u-ngozi', organizationId: 'o1' },
      { objectives: [], ownedTargets: [], coaching: [], todos: [],
        commitments: TWO_COPIES.map((c, i) => ({ ...c, groundId: 'g1', participantId: 'p-ngozi', settledBy: null, createdAt: new Date(`2026-09-2${i}T10:00:00Z`) })) as any },
      new Date('2026-09-29T12:00:00Z'),
    );
    const texts = JSON.stringify(board);
    /* Request 98: the You board now writes a promise as an action with a capital letter, so count the promise whatever its first letter. */
    expect(texts.toLowerCase().split('follow up with mr. adebayo again').length - 1).toBe(1);
  });
});

describe('reading what happened to it', () => {
  function aService(outcomes: any[]) {
    const prisma: any = {
      checkIn: { findUnique: jest.fn(async () => ({
        groundId: 'g1', participantId: 'p-ngozi', startedAt: new Date('2026-09-29T13:40:00Z'),
        turns: [
          { role: 'AI', content: 'What have you done to get an answer from Mr. Adebayo after escalating?' },
          { role: 'PERSON', content: "I haven't done anything further. He didn't reply." },
        ],
      })) },
      groundCommitment: { findMany: jest.fn(async () => TWO_COPIES), updateMany: jest.fn(async () => ({ count: 1 })) },
    };
    const anthropic: any = { extract: jest.fn(async () => ({ outcomes })) };
    const nothing: any = { get: () => undefined, emit: jest.fn(() => Promise.resolve()) };
    return { svc: new ConversationService(prisma, {} as any, anthropic, {} as any, nothing, nothing, nothing, nothing, nothing, nothing) as any, prisma, anthropic };
  }

  it('each answer goes with the question it answered, and the promise is put once', async () => {
    const { svc, anthropic } = aService([{ item: 1, happened: 'NOT_DONE' }]);
    await svc.settleWhatTheySaidTheyWouldDo('ci3');
    const content = anthropic.extract.mock.calls[0][1][0].content;
    expect(content).toBe(thePrompt([TWO_COPIES[0]], [{ asked: 'What have you done to get an answer from Mr. Adebayo after escalating?', said: "I haven't done anything further. He didn't reply." }]));
    expect(content).toContain('1. (Asked: "What have you done to get an answer from Mr. Adebayo after escalating?") I haven\'t done anything further. He didn\'t reply.');
    expect(content).not.toContain('2. I will follow up');
  });

  it('not done settles both copies, on her word', async () => {
    const { svc, prisma } = aService([{ item: 1, happened: 'NOT_DONE' }]);
    expect(await svc.settleWhatTheySaidTheyWouldDo('ci3')).toBe(2);
    expect(prisma.groundCommitment.updateMany.mock.calls.map((c: any) => [c[0].where.id, c[0].data.status, c[0].data.settledBy])).toEqual([
      ['c1', 'NOT_DONE', 'SAID'], ['c2', 'NOT_DONE', 'SAID'],
    ]);
  });
});
