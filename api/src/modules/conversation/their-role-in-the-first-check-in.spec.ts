import {
  FIRST_CHECK_IN_ROLE_PROMPT, ROLE_READING_PROMPT, ROLE_TOPICS, asksAboutTheirJob, THE_REPLY_DID_NOT_ASK_ABOUT_THEIR_JOB, isTheirFirstCheckIn, keepWhatTheySaidAboutTheirJob, onlyWhatTheySaid,
  theRoleBlock, theirJobAsTheyToldUs, theRoleMapQuestion,
} from './their-role-in-the-first-check-in';

/**
 * Decision 129: the role interview, in a person's first check-in. These read what the model is given, what is kept, and what a
 * person is asked, in the words they are.
 */
const CHECK_IN = { id: 'ci-1', participantId: 'pt-1' };

function world(opts: { earlier?: number; kept?: number; scenario?: string; userId?: string | null; jobTitle?: string | null; rosterTitle?: string | null; stored?: Record<string, { id: string; content: string }>; read?: any; turns?: string[]; row?: any } = {}) {
  const created: any[] = []; const users: any[] = []; const persons: any[] = [];
  const proposalsList: any[] = [];
  const prisma: any = {
    groundParticipant: { findUnique: jest.fn(async () => ({ userId: opts.userId === undefined ? 'u-1' : opts.userId, ground: { organizationId: 'org-1', scenario: opts.scenario ?? 'PULSE_CHECK' } })) },
    checkIn: { count: jest.fn(async () => opts.earlier ?? 0) },
    person: {
      findFirst: jest.fn(async () => ({ id: 'per-1', externalId: 'p-1', title: opts.rosterTitle ?? null })),
      update: jest.fn(async (a: any) => { persons.push(a); return {}; }),
    },
    user: { findUnique: jest.fn(async () => ({ jobTitle: opts.jobTitle ?? null })), update: jest.fn(async (a: any) => { users.push(a); return {}; }) },
    roleInterviewAnswer: {
      count: jest.fn(async () => opts.kept ?? 0),
      create: jest.fn(async ({ data }: any) => { created.push(data); return { id: 'row-1', ...data }; }),
      findFirst: jest.fn(async () => opts.row ?? null),
    },
    conversationTurn: { findMany: jest.fn(async () => (opts.turns ?? []).flatMap((content) => [{ role: 'AI', content: 'A question.' }, { role: 'PERSON', content }])) },
    assistantProposal: { create: jest.fn(async ({ data }: any) => { proposalsList.push(data); return data; }) },
  };
  const anthropic = { extract: jest.fn(async () => opts.read ?? {}) };
  const prompts = { getActive: jest.fn(async (key: string) => opts.stored?.[key] ?? null) };
  return { deps: { prisma, anthropic: anthropic as any, prompts: prompts as any }, prisma, anthropic, created, proposals: proposalsList, users, persons };
}
const SAID = [
  'I am a sales representative and I look after the Nairobi accounts, and I answer for the monthly sales number for the region.',
  'Doing well for me is hitting the number and having no customer waiting more than two days for a quote.',
  'I depend on finance to approve discounts. The delivery team depends on me to give them accurate orders.',
  'What usually gets in my way is waiting for stock to be confirmed by the depot.',
];

describe('who this is for', () => {
  it('a person with no earlier finished check-in, and nothing kept about their job, is in their first', async () => {
    expect(await isTheirFirstCheckIn(world().deps, CHECK_IN)).toEqual({ userId: 'u-1', organizationId: 'org-1' });
  });
  it.each([
    ['somebody who has finished a check-in before', { earlier: 2 }],
    ['somebody whose job is already kept', { kept: 1 }],
    ['a team update, which has one line', { scenario: 'TEAM_UPDATES' }],
    ['somebody with no sign-in, who there is nobody to keep it for', { userId: null }],
  ])('%s is not', async (_name, opts) => {
    expect(await isTheirFirstCheckIn(world(opts as any).deps, CHECK_IN)).toBeNull();
  });
});

describe('what the conversation is given', () => {
  const turns = (...t: [string, string][]) => t.map(([role, content]) => ({ role: role as 'AI' | 'PERSON', content }));

  it('is the four things and how to ask them, in plain words, and not for the opener', async () => {
    const w = world();
    expect((await theRoleBlock(w.deps, CHECK_IN, [], { forTheOpener: true })).block).toBe('');
    const { block } = await theRoleBlock(w.deps, CHECK_IN, turns(['AI', 'What are you working on this week?'], ['PERSON', 'The Mombasa pitch.']));
    for (const part of ['what they are responsible for', 'what doing well looks like in their job', 'who they depend on to do it, and who depends on them', 'what usually gets in their way']) expect(block).toContain(part);
    expect(block).toMatch(/one question at a time/);
    expect(block).toMatch(/Ask four short questions at most/);
    expect(block).toMatch(/Never ask one as your first question/);
    expect(block).not.toMatch(/\brecord\b|\bround\b|\bslot\b|\bpackage\b/i);
  });

  it('is the stored version that runs, and says which', async () => {
    const stored = { first_check_in_role: { id: 'pv-77', content: 'STORED WORDS FOR THE FIRST CHECK-IN' } };
    const { block, promptVersionId } = await theRoleBlock(world({ stored }).deps, CHECK_IN, turns(['AI', 'Hello.']));
    expect(block).toContain('STORED WORDS FOR THE FIRST CHECK-IN');
    expect(block).not.toContain(FIRST_CHECK_IN_ROLE_PROMPT.slice(0, 40));
    expect(promptVersionId).toBe('pv-77');
  });

  it('with nothing stored, runs the code\'s own text', async () => {
    const { block, promptVersionId } = await theRoleBlock(world().deps, CHECK_IN, turns(['AI', 'Hello.']));
    expect(block).toContain(FIRST_CHECK_IN_ROLE_PROMPT);
    expect(promptVersionId).toBeNull();
  });

  it('what they have already said this session is quoted so it is not asked again', async () => {
    const t = turns(['AI', 'What are you responsible for in your job?'], ['PERSON', 'I look after the Nairobi accounts, and I answer for the monthly sales number for the region.']);
    const { block } = await theRoleBlock(world().deps, CHECK_IN, t);
    expect(block).toMatch(/ALREADY ANSWERED THIS SESSION/);
    expect(block).toContain('Nairobi accounts');
    expect(block).toMatch(/NOT ASKED YET:[\s\S]*doing well looks like/);
    expect(block.split('NOT ASKED YET:')[1].split('ALREADY')[0]).not.toContain('responsible for');
  });

  it('where the job\'s name is not known, it is asked in the same breath as what they are responsible for', async () => {
    const { block } = await theRoleBlock(world().deps, CHECK_IN, turns(['AI', 'Hello.']));
    expect(block).toMatch(/NOT ASKED YET:\n- what their job is, and what they are responsible for in it/);
  });

  it('a person whose job we know is not asked what it is called', async () => {
    const { block } = await theRoleBlock(world({ jobTitle: 'Sales representative' }).deps, CHECK_IN, turns(['AI', 'Hello.']));
    expect(block).toContain('WE ALREADY KNOW THEIR JOB AS: "Sales representative". Do not ask what it is called.');
    expect(block).toMatch(/NOT ASKED YET:\n- what they are responsible for in their job/);
  });

  it('from their second answer, on every other turn, one thing is named for this turn, and never twice in a row', async () => {
    const one = turns(['AI', 'What are you aiming for in Q4?'], ['PERSON', 'More big accounts, 18 million.']);
    expect((await theRoleBlock(world().deps, CHECK_IN, one)).thisTurn).toBe('');
    const two = [...one, ...turns(['AI', 'By when?'], ['PERSON', 'The 30th of November.'])];
    const r = await theRoleBlock(world().deps, CHECK_IN, two);
    expect(r.thisTurn).toBe('FOR THIS TURN, ABOUT THEIR JOB. This turn, do not ask your next question about the work. Start with one short sentence that responds to what they just said (if they voiced a worry, acknowledge it), then ask ONE friendly question, in your own words, about what their job is, and what they are responsible for in it. Make it clear that you are asking so that you understand their work, for example "So that I understand your work better, ...". It is the only question in this turn. Next turn, go back to the work.');
    const asked = [...two, ...turns(['AI', 'What are you responsible for in your job?'], ['PERSON', 'I look after the Nairobi accounts and the monthly number.'])];
    expect((await theRoleBlock(world().deps, CHECK_IN, asked)).thisTurn).toBe('');
    const later = [...asked, ...turns(['AI', 'What is the biggest risk?'], ['PERSON', 'The Serena committee, they sit once a month.'])];
    expect((await theRoleBlock(world().deps, CHECK_IN, later)).thisTurn).toMatch(/about what doing well looks like in their job\./);
  });

  it('nothing at all for somebody who has done a check-in before', async () => {
    expect((await theRoleBlock(world({ earlier: 1 }).deps, CHECK_IN, turns(['AI', 'Hello.']))).block).toBe('');
  });

  it('the topics are what decision 129 lists', () => {
    expect(ROLE_TOPICS.map((t) => t.what)).toEqual([
      'what they are responsible for in their job', 'what doing well looks like in their job',
      'who they depend on in their job, and who depends on them', 'what usually gets in their way in their job',
    ]);
  });
});

describe('a turn that was meant to ask about the job', () => {
  const owns = ROLE_TOPICS[0];
  it.each([
    'So that I understand your work better, what are you responsible for in your job?',
    'What is your role here, and what does it cover?',
    'Tell me what you are in charge of day to day.',
  ])('"%s" asks it', (reply) => {
    expect(asksAboutTheirJob(owns, reply)).toBe(true);
  });
  it('a question about the work does not', () => {
    expect(asksAboutTheirJob(owns, 'What is the next thing you will do about the Serena account, and by when?')).toBe(false);
  });
  it('is asked again with one plain line', () => {
    expect(THE_REPLY_DID_NOT_ASK_ABOUT_THEIR_JOB(owns.what)).toBe('YOUR REPLY DID NOT ASK ABOUT THEIR JOB, AND THIS TURN IS THE ONE FOR IT. Write the reply again: one short sentence that responds to what they just said (if they voiced a worry, acknowledge it), then ONE friendly question, in your own words, about what they are responsible for in their job, so that you understand their work. It is the only question in the reply. Do not ask your next question about the work in this reply.');
  });
});

describe('what is kept after the check-in', () => {
  it('only words the person said: a part the model wrote that they did not say is dropped', () => {
    const kept = onlyWhatTheySaid({
      roleName: 'Marketing manager', owns: 'the Nairobi accounts, and I answer for the monthly sales number',
      doingWell: 'closing every deal on the first call', dependsOn: 'finance to approve discounts', inTheWay: 'waiting for stock to be confirmed',
    }, SAID);
    expect(kept.owns).toBe('the Nairobi accounts, and I answer for the monthly sales number');
    expect(kept.dependsOn).toBe('finance to approve discounts');
    expect(kept.inTheWay).toBe('waiting for stock to be confirmed');
    expect(kept.doingWell).toBeUndefined();
    expect(kept.roleName).toBeUndefined();
  });

  it('words stitched together from two different answers are dropped, never kept', () => {
    const kept = onlyWhatTheySaid({ owns: 'the Nairobi accounts, and I answer for the monthly sales number. Waiting for stock to be confirmed by the depot', inTheWay: 'the monthly sales number and waiting for stock' }, SAID);
    expect(kept.owns).toBeUndefined();
    expect(kept.inTheWay).toBeUndefined();
  });

  it('the reading is shown each answer under the question it answered', async () => {
    const w = world({ turns: SAID, read: { owns: 'the Nairobi accounts, and I answer for the monthly sales number' } });
    await keepWhatTheySaidAboutTheirJob(w.deps, CHECK_IN);
    const sent = (w.anthropic.extract as jest.Mock).mock.calls[0][1][0].content as string;
    expect(sent).toMatch(/^They were asked: A question\.\nThey said: I am a sales representative/);
  });

  it('a short job name they said is kept, a long one is not', () => {
    expect(onlyWhatTheySaid({ roleName: 'sales representative' }, ['I am a sales representative for the coast.']).roleName).toBe('sales representative');
    expect(onlyWhatTheySaid({ roleName: 'I am the person who looks after all of the Nairobi accounts' }, ['I am the person who looks after all of the Nairobi accounts']).roleName).toBeUndefined();
  });

  it('writes one private row, sets the title because there is none, and leaves a request in Ask for the role map', async () => {
    const w = world({ turns: SAID, read: { roleName: 'sales representative', owns: 'the Nairobi accounts, and I answer for the monthly sales number', doingWell: 'hitting the number', dependsOn: 'finance to approve discounts', inTheWay: 'waiting for stock to be confirmed by the depot' }, stored: { role_reading: { id: 'pv-read', content: 'x' }, first_check_in_role: { id: 'pv-ask', content: 'y' } } });
    const done = await keepWhatTheySaidAboutTheirJob(w.deps, CHECK_IN);
    expect(done).toMatchObject({ kept: true });
    expect(w.created).toHaveLength(1);
    expect(w.created[0]).toMatchObject({ source: 'first_check_in', sharedAt: null, promptVersionId: 'pv-read', askedWithPromptVersionId: 'pv-ask', checkInId: 'ci-1', personExternalId: 'p-1' });
    expect(w.created[0].roleName).toBe('sales representative');
    expect(w.users[0]).toMatchObject({ where: { id: 'u-1' }, data: { jobTitle: 'sales representative' } });
    expect(w.persons[0]).toMatchObject({ data: { title: 'sales representative' } });
    expect(w.proposals).toHaveLength(1);
    expect(w.proposals[0].summary).toBe(
      'In your first check-in you told me about your job as sales representative. You said you are responsible for "the Nairobi accounts, and I answer for the monthly sales number". Shall I let the role map show this under sales representative? It is about the job and not about you. Everything else you said about your job stays private to you.',
    );
  });

  it('a title that is already there is never changed, and the row is kept under it', async () => {
    const w = world({ turns: SAID, jobTitle: 'Account manager', read: { roleName: 'sales representative', owns: 'the Nairobi accounts, and I answer for the monthly sales number' } });
    await keepWhatTheySaidAboutTheirJob(w.deps, CHECK_IN);
    expect(w.users).toHaveLength(0);
    expect(w.persons).toHaveLength(0);
    expect(w.created[0].roleName).toBe('Account manager');
  });

  it('keeps nothing for somebody who has done a check-in before, and nothing when the model fails', async () => {
    const before = world({ earlier: 1, turns: SAID, read: { owns: 'x' } });
    expect(await keepWhatTheySaidAboutTheirJob(before.deps, CHECK_IN)).toBeNull();
    expect(before.created).toHaveLength(0);
    const broken = world({ turns: SAID });
    broken.anthropic.extract.mockRejectedValue(new Error('model off'));
    expect(await keepWhatTheySaidAboutTheirJob(broken.deps, CHECK_IN)).toBeNull();
    expect(broken.created).toHaveLength(0);
  });

  it('a very short check-in is not read', async () => {
    const w = world({ turns: ['Fine.', 'Ok.'], read: { owns: 'Fine' } });
    expect((await keepWhatTheySaidAboutTheirJob(w.deps, CHECK_IN))?.kept).toBe(false);
    expect(w.created).toHaveLength(0);
  });

  it('what is asked reads as plain sentences', () => {
    expect(theRoleMapQuestion('Sales rep', 'the Nairobi accounts')).toMatch(/^In your first check-in you told me about your job as Sales rep\. You said you are responsible for "the Nairobi accounts"\. Shall I let the role map show this under Sales rep\?/);
  });

  it('the reading is told to use only their words', () => {
    expect(ROLE_READING_PROMPT).toMatch(/Use only their own words/);
  });
});

describe('in their later check-ins, for them alone', () => {
  it('their own words are given to their own conversation, with where they came from left out', async () => {
    const row = { roleName: 'Sales representative', owns: 'the Nairobi accounts', doingWell: 'hitting the number', dependsOn: 'finance', dependedOnBy: null, inTheWay: 'waiting for stock', decides: null };
    const text = await theirJobAsTheyToldUs(world({ earlier: 1, row }).deps, CHECK_IN);
    expect(text).toContain('IN THEIR OWN WORDS. This is private to them.');
    expect(text).toContain('- what they are responsible for: "the Nairobi accounts"');
    expect(text).toContain('- what usually gets in their way: "waiting for stock"');
    expect(text).toMatch(/never refer to where it came from/);
  });
  it('nothing when nothing is kept', async () => {
    expect(await theirJobAsTheyToldUs(world({ earlier: 1 }).deps, CHECK_IN)).toBe('');
  });
});
