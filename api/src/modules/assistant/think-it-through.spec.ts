import { AssistantService } from './assistant.service';
import { route } from './the-router-is-deterministic';
import { CAPABILITY_BY_KEY } from './what-the-assistant-can-do';
import { SEED_PROMPTS } from '../conversation/prompt-library';
import {
  THINK_IT_THROUGH_PROMPT, THINK_IT_THROUGH_PROMPT_KEY, THE_OFFER, NOT_ENOUGH_TO_GO_ON, COULD_NOT_LAY_OUT, WHAT_TO_THINK_ABOUT,
  anOptionIsSafe, theOptionIs, sayItRecommends, theOptionsThatStay, theOptionsSaid,
} from './think-it-through';

/**
 * WEEK 19: "HELP ME THINK IT THROUGH". Options are laid out, nothing is chosen, nothing is written.
 *
 * A real AssistantService over an in-memory database and a stub model. Rukia leads "Sales team, Q3".
 * Baraka takes part in it. Grace is an admin who is not in "Performance plan for Baraka" (a PIP
 * check-in) and was not given access to it. Private things exist in the pretend database (a question
 * somebody put to Ask Groundwork, a lead's private note, a person's own report) and the tests check
 * that none of them ever reaches the model or the page.
 */

const PRIVATE = ['PRIVATE-QUESTION-TEXT', 'LEAD-PRIVATE-NOTE', 'BARAKAS-OWN-REPORT', 'LOAD-ACROSS-CHECK-INS'];
const PLAN_ONLY = 'PLAN-ONLY-LINE';

function world(asker: 'rukia' | 'baraka' | 'grace', model: (system: string, prompt: string) => any) {
  const people: any[] = [
    { id: 'p-rukia', externalId: 'u-rukia', displayName: 'Rukia Otieno', linkedUserId: 'user-rukia', active: true, department: 'Sales' },
    { id: 'p-baraka', externalId: 'u-baraka', displayName: 'Baraka Mwangi', linkedUserId: 'user-baraka', active: true, department: 'Sales' },
    { id: 'p-grace', externalId: 'u-grace', displayName: 'Grace Wanjiru', linkedUserId: 'user-grace', active: true, department: 'Finance' },
  ];
  const me = people.find((p) => p.id === `p-${asker}`)!;
  const roles: Record<string, string> = { 'user-rukia': 'LEAD', 'user-baraka': 'MEMBER', 'user-grace': 'ADMIN' };
  const grounds: any[] = [
    { id: 'g-sales', label: 'Sales team, Q3', organizationId: 'org-a', scenario: 'TEAM_CHECK', initiatorId: 'user-rukia', createdByUserId: 'user-rukia', participants: [{ userId: 'user-rukia' }, { userId: 'user-baraka' }] },
    { id: 'g-plan', label: 'Performance plan for Baraka', organizationId: 'org-a', scenario: 'PIP', initiatorId: 'user-rukia', createdByUserId: 'user-rukia', participants: [{ userId: 'user-rukia' }, { userId: 'user-baraka' }] },
  ];
  const served: string[] = [];
  const reports = {
    sessionReport: jest.fn(async (groundId: string, _n: number, userId: string) => {
      served.push(`${groundId}:${userId}`);
      if (groundId === 'g-plan') return { whatEachPersonSaid: [{ who: 'Baraka Mwangi', isYou: false, lines: [PLAN_ONLY] }] };
      /* What this reader is served: the lead reads Baraka's exact lines; nobody else's are here. */
      return { whatEachPersonSaid: [{ who: 'Baraka Mwangi', isYou: asker === 'baraka', lines: ['We lost the Kisumu depot in August.'] }] };
    }),
  };
  const calls: { system: string; prompt: string }[] = [];
  const extract = jest.fn(async (system: string, history: any[]) => {
    const prompt = history[0].content as string;
    calls.push({ system, prompt });
    return model(system, prompt);
  });
  const writes: string[] = [];
  const writer = (name: string) => jest.fn(async () => { writes.push(name); return {}; });
  const prisma: any = {
    person: {
      findFirst: jest.fn(async ({ where }: any) => people.find((p) => (where.id ? p.id === where.id : p.externalId === where.externalId)) ?? null),
      findMany: jest.fn(async () => people),
    },
    organizationMembership: { findUnique: jest.fn(async ({ where }: any) => ({ role: roles[where.userId_organizationId.userId] })) },
    ground: { findMany: jest.fn(async () => grounds) },
    checkIn: { findMany: jest.fn(async () => [{ sessionNumber: 1, completedAt: new Date('2026-09-24T10:00:00Z') }]) },
    assistantProposal: { findFirst: jest.fn(async () => null), create: writer('proposal'), update: writer('proposal') },
    assistantTurn: { count: jest.fn(async () => 5), createMany: jest.fn(async () => ({ count: 2 })), findMany: jest.fn(async () => [{ content: PRIVATE[0] }]) },
    commitment: { create: writer('commitment'), update: writer('commitment') },
    subject: { create: writer('subject'), update: writer('subject') },
    objectiveDraft: { create: writer('draft') },
    todo: { create: writer('todo') },
  };
  const truth = {
    forPerson: async () => ({
      objectives: { value: asker === 'grace' ? [] : [{ title: 'Signed-off client deliverables', measure: null, target: '3', dueDate: new Date('2026-12-15T00:00:00Z'), justification: 'the client signs off in December', approach: null, theirs: true }] },
      commitments: { value: asker === 'grace' ? [] : [{ text: 'Send the Westgate price list', dueSaid: 'Friday', state: 'OPEN' }] },
    }),
  };
  const prompts = { getActive: jest.fn(async () => ({ id: 'pv-stored-7', content: 'STORED: ' + THINK_IT_THROUGH_PROMPT })) };
  const service = new AssistantService(
    prisma, { respond: jest.fn(async () => { throw new Error('model off'); }), extract } as any, { retrieve: jest.fn(async () => ({ cards: [], truncated: false })) } as any,
    { waitingAcrossTheOrg: async () => ({ waiting: [], waitedOn: [] }) } as any,
    { statusFor: async () => ({ roleName: null, gates: [], left: [] }) } as any,
    { pendingFor: async () => [], decide: async () => { throw new Error('none'); } } as any,
    { start: async () => { throw new Error('none'); } } as any,
    truth as any,
    { read: async () => ({ read: false, because: 'none' }) } as any,
    { sendRoundDigest: async () => { throw new Error('none'); } } as any,
    {} as any,
    reports as any,
    prompts as any,
  );
  const say = (message: string) => service.respond('org-a', me.id, message);
  return { say, calls, writes, served, reports, prompts };
}

const words = (r: any) => r.blocks.filter((b: any) => b.type === 'text').map((b: any) => b.body).join('\n');

/** A stub model that writes good options out of exactly what it was given. */
const goodOptions = () => ({
  options: [
    {
      name: 'keep the target at 3',
      means: 'It would mean that the team keeps working to 3 deliverables signed off by 15 December.',
      assumes: 'It assumes that the client can still sign off in December.',
      working: 'You would know it is working if each deliverable has a sign-off date before 15 December.',
    },
    {
      name: 'raise the target',
      means: 'It would mean that the team takes on more deliverables in the same time.',
      assumes: 'It assumes that the Kisumu depot work does not take the team away from the client work.',
      working: 'You would know it is working if the first extra deliverables are started by the end of the month.',
    },
    {
      name: 'keep 3 and add a review point',
      means: 'It would mean that the target stays the same and the team looks at it again part of the way through.',
      assumes: 'It assumes that a review point is enough to catch a slip early.',
      working: 'You would know it is working if the review finds nothing that surprises you.',
    },
  ],
});

beforeAll(() => { jest.useFakeTimers({ now: new Date('2026-10-01T09:00:00Z') }); });
afterAll(() => { jest.useRealTimers(); });

/** What a model with nothing written down to draw on can say without inventing anything. */
const generalOptions = () => ({
  options: [
    { name: 'move the deadline', means: 'It would mean that the team gets more time and the work after it starts later.', assumes: 'It assumes that nobody is waiting on the original date.', working: 'You would know it is working if the new date is kept.' },
    { name: 'cut the scope', means: 'It would mean that the team keeps the date and does less by then.', assumes: 'It assumes that the smaller piece is still worth delivering.', working: 'You would know it is working if the people waiting on it are content with the smaller piece.' },
  ],
});

describe('the router and the register', () => {
  it.each([
    'help me think through the Q4 target',
    'What are my options for the Atlas deadline?',
    'let us think it through',
    'brainstorm how to hit the quarter',
  ])('takes %s', (m) => expect(route(m).lane).toBe('think_it_through'));

  it('leaves the lanes that change something, and setting a target, where they were', () => {
    expect(route('set a target for Q4').lane).toBe('set_an_objective');
    expect(route('add a commitment: call the depot').lane).toBe('add_a_commitment');
  });

  it('is declared as a capability that writes nothing, and its prompt is seeded to be stored', () => {
    expect(CAPABILITY_BY_KEY.get('think_it_through')?.writes).toBe('nothing');
    expect(SEED_PROMPTS.find((s) => s.key === THINK_IT_THROUGH_PROMPT_KEY)?.content).toBe(THINK_IT_THROUGH_PROMPT);
  });
});

describe('as a lead', () => {
  it('lays out options, says what each means, assumes and shows, and offers the next step as a question', async () => {
    const w = world('rukia', goodOptions);
    const r = await w.say('help me think through the Q4 target');
    const said = words(r);
    expect(r.lane).toBe('think_it_through');
    expect(said).toContain('Here are three options for the Q4 target. I am not choosing for you, and nothing has been written.');
    expect(said).toContain('The first option is to keep the target at 3.');
    expect(said).toContain('It would mean that the team keeps working to 3 deliverables signed off by 15 December.');
    expect(said).toContain('It assumes that the client can still sign off in December.');
    expect(said).toContain('You would know it is working if each deliverable has a sign-off date before 15 December.');
    expect(said.endsWith(THE_OFFER)).toBe(true);
    expect(said).not.toMatch(/recommend|you should|the best option/i);
  });

  it('writes nothing at all', async () => {
    const w = world('rukia', goodOptions);
    await w.say('help me think through the Q4 target');
    expect(w.writes).toEqual([]);
  });

  it('draws on what she may read, as she is served it, and on her own target and commitment', async () => {
    const w = world('rukia', goodOptions);
    await w.say('help me think through the Q4 target');
    const given = w.calls[0].prompt;
    expect(given).toContain('Your target "Signed-off client deliverables" is 3 and is due 15 December.');
    expect(given).toContain('You have committed to "Send the Westgate price list", which you said is due Friday.');
    expect(given).toContain('In the check-in Sales team, Q3, Baraka Mwangi said "We lost the Kisumu depot in August."');
    expect(w.reports.sessionReport).toHaveBeenCalledWith('g-sales', 1, 'user-rukia', 'org-a');
  });

  it('never gives the model anything private, and never shows it', async () => {
    const w = world('rukia', goodOptions);
    const r = await w.say('what are my options for the Q4 target');
    for (const secret of PRIVATE) {
      expect(w.calls[0].prompt).not.toContain(secret);
      expect(words(r)).not.toContain(secret);
    }
  });

  it('runs the stored prompt and records which version ran', async () => {
    const w = world('rukia', goodOptions);
    const r: any = await w.say('help me think through the Q4 target');
    expect(w.calls[0].system.startsWith('STORED: ')).toBe(true);
    expect(r.promptVersionId).toBe('pv-stored-7');
    expect(r.composedBy).toBe('model');
  });

  it('asks what to think through when nothing was named', async () => {
    const w = world('rukia', goodOptions);
    const r = await w.say('help me think it through');
    expect(words(r)).toBe(WHAT_TO_THINK_ABOUT);
    expect(w.calls).toHaveLength(0);
  });

  it('says so, plainly, when the model cannot be reached', async () => {
    const w = world('rukia', () => { throw new Error('down'); });
    expect(words(await w.say('help me think through the Q4 target'))).toBe(COULD_NOT_LAY_OUT);
  });
});

describe('a number, a name or a date that was not given is dropped', () => {
  const given = 'help me think through the Q4 target\nYour target "Signed-off client deliverables" is 3 and is due 15 December.\nBaraka Mwangi said "We lost the Kisumu depot in August."';
  const ok = {
    name: 'keep the target at 3',
    means: 'It would mean that the team keeps to 3 deliverables by 15 December.',
    assumes: 'It assumes that Baraka Mwangi stays on the work.',
    working: 'You would know it is working if the depot stays open.',
  };

  it('keeps an option built from what it was given', () => {
    expect(anOptionIsSafe(ok, given)).toBe(true);
  });
  it.each([
    ['a number', { ...ok, means: 'It would mean that the team keeps to 7 deliverables by 15 December.' }],
    ['a number said in words', { ...ok, means: 'It would mean that the team keeps to seven deliverables by 15 December.' }],
    ['a date', { ...ok, means: 'It would mean that the team keeps to 3 deliverables by 20 December.' }],
    ['a month', { ...ok, working: 'You would know it is working if the depot stays open until March.' }],
    ['a person', { ...ok, assumes: 'It assumes that Tunde Okafor stays on the work.' }],
    ['an option without the three sentences', { ...ok, working: 'The depot stays open.' }],
  ])('drops %s', (_l, o) => {
    expect(anOptionIsSafe(o as any, given)).toBe(false);
  });

  it('shows the lead only what stays, and says so when fewer than two do', async () => {
    const w = world('rukia', () => ({ options: [goodOptions().options[0], { ...goodOptions().options[1], means: 'It would mean that the team takes on 9 more deliverables.' }] }));
    expect(words(await w.say('help me think through the Q4 target'))).toBe(NOT_ENOUGH_TO_GO_ON);
  });

  it('never pads with something invented to reach two', () => {
    expect(theOptionsThatStay({ options: [goodOptions().options[0]] }, 'the target is 3 and 15 December and Kisumu depot')).toBeNull();
  });
});

describe('it never recommends', () => {
  it.each([
    'I recommend raising the target.',
    'You should keep it at 3.',
    'This is the best option for the team.',
    'The better choice is to wait.',
    'My advice is to keep it.',
    'Go with this one.',
    'I would suggest the first.',
  ])('sees %s', (s) => expect(sayItRecommends(s)).toBe(true));

  it('drops an option that recommends, wherever in it the words are', () => {
    const base = goodOptions().options[0];
    for (const f of ['name', 'means', 'assumes', 'working'] as const) {
      const bad: any = { ...base };
      bad[f] = f === 'name' ? 'The best option' : `${base[f]} I recommend this one.`;
      expect(anOptionIsSafe(bad, 'the target is 3 and 15 December')).toBe(false);
    }
  });

  it('shows the lead a reply that has none of it, after a model that tried', async () => {
    const tried = goodOptions();
    tried.options[0].assumes = 'It assumes that the client can still sign off in December, and you should choose this one.';
    tried.options.push({ name: 'Wait and see', means: 'It would mean that nothing changes for now.', assumes: 'It assumes that the client stays quiet.', working: 'You would know it is working if nobody asks about it.' });
    const w = world('rukia', () => tried);
    const said = words(await w.say('help me think through the Q4 target'));
    expect(said).toContain('Here are three options');
    expect(said).not.toMatch(/I recommend|you should|the best option|better choice|my advice/i);
  });
});

describe('the option is a full sentence', () => {
  it('joins a verb phrase, and lowers a title that is not one', () => {
    expect(theOptionIs(0, 'keep the target at 3')).toBe('The first option is to keep the target at 3.');
    expect(theOptionIs(1, 'raise the target')).toBe('The second option is to raise the target.');
    expect(theOptionIs(2, 'keep 3 and add a review point')).toBe('The third option is to keep 3 and add a review point.');
    expect(theOptionIs(3, 'Wait and see')).toBe('The fourth option is wait and see.');
    expect(theOptionIs(0, 'to keep it')).toBe('The first option is to keep it.');
  });
  it('reads in the reply', async () => {
    const said = words(await world('rukia', goodOptions).say('help me think through the Q4 target'));
    expect(said).toContain('The second option is to raise the target.');
    expect(said).toContain('The third option is to keep 3 and add a review point.');
    expect(said).not.toMatch(/Option \d is/);
  });
});

describe('as a participant', () => {
  it('thinks through their own work, from their own records only', async () => {
    const w = world('baraka', goodOptions);
    const r = await w.say('help me think through the Q4 target');
    expect(words(r)).toContain('The first option is to keep the target at 3.');
    const given = w.calls[0].prompt;
    expect(given).toContain('Your target "Signed-off client deliverables"');
    /* Nobody's words from a check-in are read for a participant: no served report is opened at all. */
    expect(w.reports.sessionReport).not.toHaveBeenCalled();
    expect(given).not.toContain('Kisumu');
    expect(given).not.toContain('said "');
    for (const secret of [...PRIVATE, PLAN_ONLY]) expect(given).not.toContain(secret);
    expect(w.writes).toEqual([]);
  });
});

describe('as an admin without access to an evaluation check-in', () => {
  it('reads nothing from it, and the model is never handed it', async () => {
    const w = world('grace', generalOptions);
    const r = await w.say('what are my options for the Atlas deadline');
    expect(w.served.filter((s) => s.startsWith('g-plan'))).toEqual([]);
    expect(w.calls[0].prompt).not.toContain(PLAN_ONLY);
    expect(words(r)).not.toContain(PLAN_ONLY);
    for (const secret of PRIVATE) expect(w.calls[0].prompt).not.toContain(secret);
  });

  it('says so, in the frame, when there is nothing written down to draw on', () => {
    expect(theOptionsSaid(null, generalOptions().options, true)).toContain('I found nothing written down about this that you can read, so these options come only from what you told me.');
  });
});
