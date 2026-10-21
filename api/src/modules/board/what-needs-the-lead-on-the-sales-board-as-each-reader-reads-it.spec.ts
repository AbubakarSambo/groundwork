import { BoardService } from './board.service';
import { boardAs, handoff, SALES_RUN, BISI, KWAME, JUMA, type Setup } from './the-switchboards-sections-harness';
import { aWaitTheLeadCanAnswer, theDealsAtTheStallRule } from './what-needs-you-and-what-to-do';

/**
 * "WHAT NEEDS YOU IN THIS CHECK-IN" ON THE LEAD'S SALES BOARD, AND "ONE QUESTION TO ANSWER" ON THE TEAM REPORT (Hafsah,
 * 17 October; board-as-lead.txt and team-report.txt).
 *
 * In Drop Access (test), Joseph Kariuki said "Grace hasn't answered me about the KES 4,500 price for Juja Hardware yet.",
 * kept as a wait on Grace for "an answer about the KES 4,500 price for Juja Hardware", and Mama Pima Stores, his deal,
 * had not answered since 12 October. Here the same record is Kwame's, and Bisi runs it. Bisi reads the wait as the
 * prototype's decision, with Yes and No, and the stalled deal with "Ask Kwame". Kwame, who checks in, and Juma, an
 * admin who only reads, are sent neither: the payload holds nothing of it for them.
 */
const item = (id: string, name: string, more: Record<string, any> = {}) => ({
  id, groundId: 'g-1', kind: 'deal', name, stage: null, ownerParticipantId: null, dueAt: null, fields: null, sourceEntryId: null,
  addedByUserId: null, createdAt: new Date('2026-10-12T15:00:00Z'), updatedAt: new Date('2026-10-12T15:00:00Z'), ...more,
});
const RUN: Setup = {
  ...SALES_RUN,
  kindOfWork: 'sales org',
  /* Release 1's sales board, which these specs read, is switched on per organisation (release-one-sales-board). */
  releaseOneSalesBoard: true,
  /* Changed 18 October (Hafsah's standing decision 4): the stall rule is the lead's own, so this run has the one she set, in how we work. */
  contextItems: [{ kind: 'WAY_OF_WORKING', text: 'A deal is dropped after 3 working days with no answer from the customer.' }],
  clock: { now: new Date('2026-10-19T12:00:00Z'), endsAt: new Date('2026-10-30T17:00:00Z') },
  lines: [
    { id: 'l-juja', participantId: 'p-kwame', text: 'I pitched Juja Hardware at KES 4,500 a unit.', createdAt: new Date('2026-10-13T15:00:00Z'), disputedAt: null },
    { id: 'l-pima', participantId: 'p-kwame', text: 'Mama Pima Stores has not answered my calls since Monday.', createdAt: new Date('2026-10-13T15:05:00Z'), disputedAt: null },
  ],
  recordLines: [
    { id: 'l-juja', participantId: 'p-kwame', text: 'I pitched Juja Hardware at KES 4,500 a unit.', createdAt: new Date('2026-10-13T15:00:00Z') },
    { id: 'l-pima', participantId: 'p-kwame', text: 'Mama Pima Stores has not answered my calls since Monday.', createdAt: new Date('2026-10-13T15:05:00Z') },
  ],
  items: [
    item('w-juja', 'Juja Hardware', { stage: 'Pitched', ownerParticipantId: 'p-kwame', sourceEntryId: 'l-juja', fields: { Value: 'KES 4,500' } }),
    item('w-pima', 'Mama Pima Stores', { stage: 'Contacted', ownerParticipantId: 'p-kwame', sourceEntryId: 'l-pima' }),
  ],
  dependencies: [
    ...(SALES_RUN.dependencies ?? []),
    handoff('d-price', 'p-kwame', 'an answer about the KES 4,500 price for Juja Hardware', { onParticipantId: 'p-bisi', status: 'WAITING', createdAt: new Date('2026-10-15T12:07:00Z') }),
  ],
};
const theWait = (b: any) => (b.leadActions ?? []).find((a: any) => a.id === 'waiting-on-the-lead-d-price');

describe('what needs Bisi, who runs it, on the sales board', () => {
  it('Joseph’s question about the price reads as a decision, with who asked and when, and Yes and No that keep the answer', async () => {
    const b = await boardAs(RUN, ...BISI);
    const a = theWait(b);
    expect(a.decision).toEqual({
      question: 'Decide whether to agree to the KES 4,500 price for Juja Hardware',
      asked: 'Do you agree to the KES 4,500 price for Juja Hardware?',
      why: 'Kwame Mensah asked you on 15 October and is still waiting for your answer. It decides the price on Kwame’s Juja Hardware deal.',
      afterwards: 'Your answer updates the board, and Kwame is no longer waiting on you.',
    });
    expect(a.action.choices).toEqual([
      { label: 'Yes, agree to it', route: { method: 'POST', path: '/grounds/g-1/board/waits/d-price/answer', body: { yes: true } } },
      { label: 'No', route: { method: 'POST', path: '/grounds/g-1/board/waits/d-price/answer', body: { yes: false } } },
    ]);
  });

  it('a wait on her that a yes cannot answer stays "Reply in your check-in"', async () => {
    const b = await boardAs(RUN, ...BISI);
    const other = (b.leadActions ?? []).find((x: any) => x.id === 'waiting-on-the-lead-d-kwame');
    expect(other.decision).toBeUndefined();
    expect(other.action.label).toBe('Reply in your check-in');
  });

  it('the stalled deal is named with whose it is, in full sentences, and "Ask Kwame"', async () => {
    const b = await boardAs(RUN, ...BISI);
    expect(b.atTheStallRule).toEqual([{
      participantId: 'p-kwame', name: 'Kwame Mensah', deals: ['Mama Pima Stores'],
      title: 'Mama Pima Stores has not answered Kwame since 12 October',
      /* Changed 18 October (Hafsah's quality pass, B-9, and standing decision 4): the rule is the one the lead set, with what is not on record. */
      detail: 'Nothing on record says yet what Mama Pima Stores needs. Your stall rule is to drop a deal after 3 working days with no answer.',
      ask: 'Ask Kwame',
    }]);
  });

  it.each([
    ['Kwame, who checks in', KWAME],
    ['Juma, an admin who only reads', JUMA],
  ] as const)('%s is sent none of it', async (_who, reader) => {
    const b = await boardAs(RUN, reader[0], reader[1]);
    const sent = JSON.stringify(b);
    expect(b.atTheStallRule).toBeUndefined();
    expect(sent).not.toContain('Decide whether to agree');
    expect(sent).not.toContain('Do you agree to');
    expect(sent).not.toContain('/board/waits/');
    expect(sent).not.toContain('The stall rule says drop');
  });
});

describe('which waits and deals are read this way', () => {
  it('only an answer about a price, a discount, a quote, an offer or terms', () => {
    expect(aWaitTheLeadCanAnswer({ what: 'an answer about the KES 12,000 discount for Mama Pima' }, 'Joseph Kariuki')?.question).toBe('Decide whether to agree to the KES 12,000 discount for Mama Pima');
    expect(aWaitTheLeadCanAnswer({ what: 'the sample units' }, 'Mercy Wairimu')).toBeNull();
    expect(aWaitTheLeadCanAnswer({ what: 'an answer about the delivery van' }, 'Mercy Wairimu')).toBeNull();
  });

  it('says which deal only when the waiting person’s own deal is named', () => {
    expect(aWaitTheLeadCanAnswer({ what: 'an answer about the KES 4,500 price for Juja Hardware' }, 'Joseph Kariuki', [])?.why).toBe('Joseph Kariuki is still waiting for your answer.');
  });

  it('somebody who spoke about the same quiet customers on two days or more is said to be following them up', () => {
    const rows = [
      { kind: 'deal', name: 'Soko', group: 'cold', owner: 'Samuel Otieno', ownerParticipantId: 'p-s', notAnsweringSince: '2026-08-24', contactHistory: [{ on: '2026-09-21' }, { on: '2026-09-22' }, { on: '2026-09-23' }] },
      { kind: 'deal', name: 'Kito', group: 'cold', owner: 'Samuel Otieno', ownerParticipantId: 'p-s', notAnsweringSince: '2026-08-24', contactHistory: [{ on: '2026-09-23' }] },
      { kind: 'deal', name: 'Green Mart', group: 'possible', owner: 'Miriam', ownerParticipantId: 'p-m' },
    ];
    expect(theDealsAtTheStallRule(rows)).toEqual([expect.objectContaining({
      title: 'Samuel has followed up the same 2 leads with no reply for 3 check-ins',
      detail: 'The stall rule says drop them. Nothing on record says why Samuel is holding on to them.',
      ask: 'Ask Samuel',
    })]);
  });
});

describe('Bisi’s answer to the price question', () => {
  function service(wait: any) {
    const made: any[] = [];
    const cleared: any[] = [];
    const prisma: any = {
      ground: { findUnique: jest.fn(async () => ({ id: 'g-1', initiatorId: 'u-bisi' })) },
      groundParticipant: {
        findFirst: jest.fn(async (a: any) => (a.where.userId === 'u-bisi' ? { id: 'p-bisi' } : a.where.id === 'p-kwame' ? { nameGiven: null, user: { firstName: 'Kwame', lastName: 'Mensah' } } : null)),
      },
      groundDependency: {
        findFirst: jest.fn(async (a: any) => (wait && a.where.id === wait.id && !wait.clearedAt ? wait : null)),
        update: jest.fn(async (a: any) => { cleared.push(a); return a; }),
      },
      groundContextItem: { create: jest.fn(async (a: any) => { made.push(a.data); return a.data; }) },
    };
    return { svc: new BoardService(prisma, {} as any, {} as any, {} as any), made, cleared };
  }
  const WAIT = { id: 'd-price', what: 'an answer about the KES 4,500 price for Juja Hardware', createdAt: new Date('2026-10-15T12:07:00Z'), fromParticipantId: 'p-kwame', onParticipantId: 'p-bisi', clearedAt: null };

  it('a yes goes in how we work, in her words, and Kwame is no longer waiting', async () => {
    const { svc, made, cleared } = service(WAIT);
    const out = await svc.answerAWaitOnTheLead('g-1', 'd-price', 'u-bisi', true);
    expect(made).toEqual([expect.objectContaining({ groundId: 'g-1', kind: 'WAY_OF_WORKING', audience: 'EVERYONE', text: 'On whether to agree to the KES 4,500 price for Juja Hardware, the answer is yes.' })]);
    expect(cleared).toEqual([{ where: { id: 'd-price' }, data: { status: 'CLEARED', clearedAt: expect.any(Date) } }]);
    expect(out.saidBack).toBe('This is now in how we work. It reads, "On whether to agree to the KES 4,500 price for Juja Hardware, the answer is yes."');
  });

  it('nobody but the lead can answer', async () => {
    const { svc, made } = service(WAIT);
    await expect(svc.answerAWaitOnTheLead('g-1', 'd-price', 'u-kwame', true)).rejects.toThrow('Only the lead of this check-in can answer this.');
    expect(made).toEqual([]);
  });

  it('a wait on somebody else, or one already answered, is not answered here', async () => {
    await expect(service({ ...WAIT, onParticipantId: 'p-femi' }).svc.answerAWaitOnTheLead('g-1', 'd-price', 'u-bisi', true)).rejects.toThrow('This is not waiting for an answer any more.');
    await expect(service({ ...WAIT, clearedAt: new Date() }).svc.answerAWaitOnTheLead('g-1', 'd-price', 'u-bisi', false)).rejects.toThrow('This is not waiting for an answer any more.');
  });

  it('a wait a yes cannot answer is refused in a sentence', async () => {
    const { svc } = service({ ...WAIT, what: 'the sample units' });
    await expect(svc.answerAWaitOnTheLead('g-1', 'd-price', 'u-bisi', true)).rejects.toThrow('This is not a question with a yes or a no. Tell Groundwork in your check-in what you will do about it.');
  });
});
