import { GroundScenario } from '@prisma/client';
import { BoardService } from './board.service';
import { boardAs, handoff, SALES_RUN, BISI, FEMI, NGOZI, KWAME, JUMA, type Setup } from './the-switchboards-sections-harness';

/**
 * SCREENS REQUEST 112 (b): AN ACTION FOR EACH ITEM UNDER "WHAT NEEDS YOU".
 *
 * The prototype (board-as-lead.txt) gives each item its own action: a decision's choices ("Yes, it counts" and
 * "No"), and "Ask him". The board sent no choices and no place, so the screen drew one "Open" for everything.
 * Each item in `leadActions` and `decisions` now has `action`, to the lead alone: choices where the record holds
 * the question and a route keeps the answer, otherwise where to go and what to do there, in one sentence.
 *
 * The sales run (api/journey/all-24/re-f/sales.json): Bisi's own promise "I'll follow up directly with the
 * committee members.", Femi waiting for the bank statements, Kwame waiting on Bisi for the approval of five
 * applications, and what Bisi wrote down as still to decide.
 */
const RUN: Setup = {
  ...SALES_RUN,
  contextItems: [
    { id: 'ci-yes-no', kind: 'DECISION', text: 'Whether to take the credit committee delays to the Head of Credit.' },
    { id: 'ci-either', kind: 'DECISION', text: 'Whether the 120m counts what was approved or what was disbursed.' },
  ],
  dependencies: [
    ...(SALES_RUN.dependencies ?? []),
    handoff('d-ngozi-kwame', 'p-ngozi', 'the signed forms for Ikeja Bakery', { onParticipantId: 'p-kwame', status: 'BLOCKING', createdAt: new Date('2026-09-16T17:30:00Z') }),
  ],
};
const SETUP = ['u-setup', 'ADMIN'] as const;
const leadAction = (b: any, id: string) => (b.leadActions ?? []).find((a: any) => a.id === id)?.action;
const decision = (b: any, start: string) => (b.decisions ?? []).find((d: any) => d.question.startsWith(start))?.action;

describe('request 112 (b): what Bisi, who runs it, can do about each item', () => {
  it('her own promise: "Yes, it’s done" keeps it as done, and "Not yet" changes nothing', async () => {
    const b = await boardAs(RUN, ...BISI);
    expect(leadAction(b, 'own-k-bisi')).toEqual({
      label: 'Has it happened?',
      says: 'Say whether it has happened. Until you do, it stays open on your work plan.',
      goesTo: null,
      choices: [
        { label: 'Yes, it’s done', route: { method: 'PATCH', path: '/grounds/g-1/commitments/k-bisi', body: { status: 'DONE' } } },
        { label: 'Not yet', route: null },
      ],
    });
  });

  it('somebody waiting on her: reply in her check-in, with the name', async () => {
    const b = await boardAs(RUN, ...BISI);
    expect(leadAction(b, 'waiting-on-the-lead-d-kwame')).toEqual({
      label: 'Reply in your check-in', says: 'Tell Groundwork in your check-in what you will do for Kwame Mensah, and by when.', goesTo: 'check-in',
    });
  });

  it('a wait nobody has been named for: name who provides it', async () => {
    const b = await boardAs(RUN, ...BISI);
    expect(leadAction(b, 'nobody-named-d-femi')).toEqual({ label: 'Name who provides it', says: 'Say in your check-in who can provide it, so they can be asked.', goesTo: 'check-in' });
    /* The question says who it waits on now, and only a decision "needs deciding" (item 21). */
    expect(decision(b, 'Femi Okonkwo is waiting for the bank statements')).toEqual({
      label: 'Name who provides it', says: 'Nobody has been named to provide it. Say in your check-in who can, so they can be asked.', goesTo: 'check-in',
    });
  });

  it('a wait on a colleague: "Ask Kwame", under References and resources, where a question for his next check-in is kept', async () => {
    const b = await boardAs(RUN, ...BISI);
    expect(decision(b, 'Ngozi Eze says the work is waiting on Kwame Mensah for the signed forms')).toEqual({
      label: 'Ask Kwame',
      says: "Tell Groundwork under References and resources what to ask Kwame Mensah, and it will ask in Kwame Mensah's next check-in.",
      goesTo: 'context',
    });
  });

  it('a wait only Ngozi claims is said as her account on the lead\'s line, and is never put to Kwame as his fault', async () => {
    const b = await boardAs(RUN, ...BISI);
    const line = (b.decisions ?? []).find((d: any) => d.question.startsWith('Ngozi Eze says the work is waiting on Kwame Mensah'));
    expect(line.question).toBe('Ngozi Eze says the work is waiting on Kwame Mensah for the signed forms for Ikeja Bakery.');
    expect(line.why).toBe('That is what Ngozi Eze said, and Kwame Mensah has not said it is theirs to give.');
    expect(JSON.stringify(line)).not.toMatch(/cannot move until it comes/);
  });

  it('a yes-or-no question she wrote down: "Yes" and "No", each with the route that keeps it', async () => {
    const b = await boardAs(RUN, ...BISI);
    const route = (yes: boolean) => ({ method: 'POST', path: '/grounds/g-1/board/decisions/ci-yes-no/answer', body: { yes } });
    expect(decision(b, 'Whether to take')).toEqual({
      label: 'Decide it',
      says: 'Your answer goes in how we work, and this comes off the list of things still to decide.',
      goesTo: null,
      choices: [{ label: 'Yes', route: route(true) }, { label: 'No', route: route(false) }],
    });
  });

  it('a question with two answers of her own is not turned into choices nobody wrote', async () => {
    const b = await boardAs(RUN, ...BISI);
    expect(decision(b, 'Whether the 120m')).toEqual({
      label: 'Open References and resources', says: 'Write down what you decided under References and resources, and close this line there.', goesTo: 'context',
    });
  });

  it('a goal she has not told somebody about: talk it through, then say so in her check-in', async () => {
    const b = await boardAs({ ...RUN, personObjectives: [{ id: 'po-1', groundId: 'g-1', participantId: 'p-ngozi', text: 'Ngozi should close 20 facilities.', authoredBy: 'lead', awareness: 'NOT_TOLD' }] }, ...BISI);
    expect(leadAction(b, 'tell-p-ngozi')).toEqual({ label: 'Open your check-in', says: 'Talk it through with them first. Then tell Groundwork in your check-in that you have.', goesTo: 'check-in' });
  });

  it('every sentence is a full sentence, with no colon, dash or arrow joining pieces', async () => {
    const b = await boardAs(RUN, ...BISI);
    const actions = [...(b.leadActions ?? []), ...(b.decisions ?? [])].map((x: any) => x.action);
    expect(actions.every(Boolean)).toBe(true);
    for (const a of actions) {
      expect(a.says).toMatch(/^[A-Z].*\.$/);
      expect(a.says).not.toMatch(/:\s|\s[-–—]\s|→|->/);
    }
  });
});

describe('request 112 (b): nobody else is sent an action', () => {
  it.each([
    ['Juma, an admin who only reads', JUMA, RUN],
    ['the admin who set it up', SETUP, { ...RUN, createdByUserId: 'u-setup' }],
  ] as const)('%s reads the items without an action, and without the ids they were built from', async (_who, reader, setup) => {
    const b = await boardAs(setup as Setup, reader[0], reader[1]);
    const all = [...(b.leadActions ?? []), ...(b.decisions ?? [])];
    expect(all.length).toBeGreaterThan(0);
    expect(all.some((x: any) => 'action' in x)).toBe(false);
    expect(JSON.stringify(all)).not.toMatch(/contextItemId|waitsOn|ci-yes-no/);
  });

  it.each([
    ['Femi', FEMI, RUN],
    ['Ngozi, where people see only themselves', NGOZI, { ...RUN, peersVisibleToEachOther: false }],
    ['Kwame, a colleague giving a view on a performance plan', KWAME, { ...RUN, scenario: GroundScenario.PIP }],
  ] as const)('%s, who checks in, is sent neither list', async (_who, reader, setup) => {
    const b = await boardAs(setup as Setup, reader[0], reader[1]);
    expect(b.leadActions ?? null).toBeNull();
    expect(JSON.stringify(b.decisions ?? null)).not.toMatch(/"action"|answer/);
  });
});

describe('request 112 (b): the lead\'s answer to a question she wrote down', () => {
  function service(line: any) {
    const made: any[] = [];
    const closed: any[] = [];
    const prisma: any = {
      ground: { findUnique: jest.fn(async () => ({ id: 'g-1', initiatorId: 'u-bisi' })) },
      groundContextItem: {
        findFirst: jest.fn(async (a: any) => (line && a.where.id === line.id && !line.closedAt ? line : null)),
        create: jest.fn(async (a: any) => { made.push(a.data); return a.data; }),
        update: jest.fn(async (a: any) => { closed.push(a); return a; }),
      },
    };
    return { svc: new BoardService(prisma, {} as any, {} as any, {} as any), made, closed };
  }
  const LINE = { id: 'ci-yes-no', groundId: 'g-1', kind: 'DECISION', audience: 'EVERYONE', text: 'Whether to take the credit committee delays to the Head of Credit.', closedAt: null };

  it('a yes goes in how we work, in her words, and the question comes off the list', async () => {
    const { svc, made, closed } = service(LINE);
    const out = await svc.answerADecision('g-1', 'ci-yes-no', 'u-bisi', true);
    expect(made).toEqual([expect.objectContaining({ groundId: 'g-1', kind: 'WAY_OF_WORKING', audience: 'EVERYONE', text: 'On whether to take the credit committee delays to the Head of Credit, the answer is yes.' })]);
    expect(closed).toEqual([expect.objectContaining({ where: { id: 'ci-yes-no' } })]);
    expect(out.saidBack).toBe('This is now in how we work. It reads, "On whether to take the credit committee delays to the Head of Credit, the answer is yes."');
  });

  it('nobody but the lead can answer', async () => {
    const { svc, made } = service(LINE);
    await expect(svc.answerADecision('g-1', 'ci-yes-no', 'u-femi', true)).rejects.toThrow('Only the lead of this check-in can answer this.');
    expect(made).toEqual([]);
  });

  it('a question with two answers of her own is refused in a sentence', async () => {
    const { svc } = service({ ...LINE, id: 'ci-either', text: 'Whether the 120m counts what was approved or what was disbursed.' });
    await expect(svc.answerADecision('g-1', 'ci-either', 'u-bisi', true)).rejects.toThrow('This is not a question with a yes or a no. Write down what you decided under References and resources.');
  });

  it('a question already answered is not answered twice', async () => {
    const { svc } = service({ ...LINE, closedAt: new Date() });
    await expect(svc.answerADecision('g-1', 'ci-yes-no', 'u-bisi', false)).rejects.toThrow('This is not waiting for an answer any more.');
  });
});
