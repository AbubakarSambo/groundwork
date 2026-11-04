import {
  FIRST_CHECK_IN_ROLE_PROMPT, ROLE_TOPICS, asksAboutTheirJob, THE_REPLY_DID_NOT_ASK_ABOUT_THEIR_JOB, SAYS_WHICH_CHECK_IN_THIS_IS, coverageOf, isTheirFirstCheckIn, keepWhatTheySaidAboutTheirJob, onlyWhatTheySaid,
  theRoleBlock, theirJobAsTheyToldUs, theRoleMapQuestion, theProofComesFirst,
} from './their-role-in-the-first-check-in';
import { aClaimNothingShowsYet, askForProofKindly, ASKS_FOR_PROOF } from './asking-for-proof-kindly';
import { THE_ASSESSMENT_PROMPT } from './the-assessment';
import { anAssessmentHolding } from './an-assessment-for-a-spec';

/* What their conversation's assessment heard about their job, as its role signals (2 November 2026: the separate reading went). */
const PART = { roleName: 'the name of their job', owns: 'what they are responsible for', doingWell: 'what doing well looks like', dependsOn: 'who they depend on', inTheWay: 'what gets in their way' } as Record<string, string>;
const theAssessmentHearing = (read: any) => {
  const a = anAssessmentHolding({ promptVersionId: 'pv-assessment' } as any);
  a.roleSignals = Object.entries(read ?? {}).map(([k, words], i) => ({ id: `r1.roleSignals.${i}`, words: String(words), from: [1], whoMaySee: 'the lead only' as any, saidWordForWord: true, part: PART[k] }));
  a.promptVersionId = 'pv-assessment';
  return a;
};

/**
 * Decision 129: the role interview, in a person's first check-in. These read what the model is given, what is kept, and what a
 * person is asked, in the words they are.
 */
const CHECK_IN = { id: 'ci-1', participantId: 'pt-1' };

function world(opts: { setup?: boolean; clarification?: boolean; correction?: boolean; earlier?: number; kept?: number; scenario?: string; userId?: string | null; jobTitle?: string | null; rosterTitle?: string | null; stored?: Record<string, { id: string; content: string }>; read?: any; turns?: string[]; row?: any } = {}) {
  const created: any[] = []; const users: any[] = []; const persons: any[] = [];
  const proposalsList: any[] = [];
  const prisma: any = {
    groundParticipant: { findUnique: jest.fn(async () => ({ userId: opts.userId === undefined ? 'u-1' : opts.userId, ground: { organizationId: 'org-1', scenario: opts.scenario ?? 'PULSE_CHECK' } })) },
    checkIn: { count: jest.fn(async () => opts.earlier ?? 0), findUnique: jest.fn(async () => ({ isSetup: !!opts.setup, isClarification: !!opts.clarification, isSelfCorrection: !!opts.correction })) },
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
    /* Only this check-in has turns: a read of their other check-ins (E6, the job question once per person) finds none. */
    conversationTurn: { findMany: jest.fn(async (q: any) => (q?.where?.checkInId?.not ? [] : (opts.turns ?? []).flatMap((content) => [{ role: 'AI', content: 'A question.' }, { role: 'PERSON', content }]))) },
    assistantProposal: { create: jest.fn(async ({ data }: any) => { proposalsList.push(data); return data; }) },
  };
  const anthropic = { extract: jest.fn(async () => opts.read ?? {}) };
  const prompts = { getActive: jest.fn(async (key: string) => opts.stored?.[key] ?? null) };
  return { deps: { prisma, anthropic: anthropic as any, prompts: prompts as any }, prisma, anthropic, created, proposals: proposalsList, users, persons, assessment: theAssessmentHearing(opts.read) };
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
    ['a set-up conversation', { setup: true }],
    ['a clarification', { clarification: true }],
    ['a correction of an earlier check-in', { correction: true }],
  ])('%s is not', async (_name, opts) => {
    expect(await isTheirFirstCheckIn(world(opts as any).deps, CHECK_IN)).toBeNull();
  });
});

describe('what the conversation is given', () => {
  const turns = (...t: [string, string][]) => t.map(([role, content]) => ({ role: role as 'AI' | 'PERSON', content }));

  it('is one question about the job, with who they depend on and what gets in their way read from the work\'s own answers, and not for the opener', async () => {
    const w = world();
    expect((await theRoleBlock(w.deps, CHECK_IN, [], { forTheOpener: true })).block).toBe('');
    const { block } = await theRoleBlock(w.deps, CHECK_IN, turns(['AI', 'What are you working on this week?'], ['PERSON', 'The Mombasa pitch.']));
    expect(block).toMatch(/ONE question, once/);
    expect(block).toMatch(/never as your first question/);
    expect(block).toMatch(/Never ask a separate question about who they depend on or what gets in their way/);
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
    expect(block).toMatch(/Everything above is covered for this session/);
  });

  it('asked once is asked: a short answer is not asked for again', async () => {
    const t = turns(['AI', 'What are you responsible for in your job?'], ['PERSON', 'Sales.']);
    const r = await theRoleBlock(world().deps, CHECK_IN, [...t, ...turns(['AI', 'By when?'], ['PERSON', 'Friday.'])]);
    expect(r.thisTurn).toBe('');
  });

  it('a person whose job we know is not asked what it is called', async () => {
    const { block } = await theRoleBlock(world({ jobTitle: 'Sales representative' }).deps, CHECK_IN, turns(['AI', 'Hello.']));
    expect(block).toContain('WE ALREADY KNOW THEIR JOB AS: "Sales representative". Do not ask what it is called.');
    expect(block).toContain('NOT ASKED YET:\n- what they are responsible for in their job, and what doing well looks like in it');
  });

  it('from their second answer, on every other turn, one thing is named for this turn, and never twice in a row', async () => {
    const one = turns(['AI', 'What are you aiming for in Q4?'], ['PERSON', 'More big accounts, 18 million.']);
    expect((await theRoleBlock(world().deps, CHECK_IN, one)).thisTurn).toBe('');
    const two = [...one, ...turns(['AI', 'By when?'], ['PERSON', 'The 30th of November.'])];
    const r = await theRoleBlock(world().deps, CHECK_IN, two);
    expect(r.thisTurn).toBe('FOR THIS TURN, ABOUT THEIR JOB. This turn, do not ask your next question about the work. Open with one short sentence that responds to what they just said (if they voiced a worry, acknowledge it) and leads into your question. Then ask ONE friendly question, in your own words, about what their job is, what they are responsible for in it, and what doing well looks like in it. Do not explain why you are asking, do not add a sentence after the question, and do not say what check-in this is. It is the only question in this turn. Next turn, go back to the work.');
    const asked = [...two, ...turns(['AI', 'What are you responsible for in your job?'], ['PERSON', 'I look after the Nairobi accounts and the monthly number.'])];
    expect((await theRoleBlock(world().deps, CHECK_IN, asked)).thisTurn).toBe('');
  });

  it('nothing at all for somebody who has done a check-in before', async () => {
    expect((await theRoleBlock(world({ earlier: 1 }).deps, CHECK_IN, turns(['AI', 'Hello.']))).block).toBe('');
  });

  it('the one thing asked is what decision 129 puts first: responsible for, and what doing well looks like', () => {
    expect(ROLE_TOPICS.map((t) => t.what)).toEqual(['what they are responsible for in their job, and what doing well looks like in it']);
  });
});

describe('the job question never takes the place of asking for proof (decision 132)', () => {
  const turns = (...t: [string, string][]) => t.map(([role, content]) => ({ role: role as 'AI' | 'PERSON', content }));
  const opening = turns(['AI', 'What are you working on this week?'], ['PERSON', 'The Mombasa distributor deal and the Q4 plan.']);
  /* What the model is handed for this turn, in the order the conversation joins it: the interview block, this turn's line, then the proof note. */
  const handed = async (t: ReturnType<typeof turns>) => {
    const r = await theRoleBlock(world().deps, CHECK_IN, t);
    return { r, text: [r.block, r.thisTurn, askForProofKindly(aClaimNothingShowsYet(t as any))].filter(Boolean).join('\n\n') };
  };

  it('a person who has just said something is done is asked for proof first, and the job question waits, while the interview stays in what the model is given', async () => {
    const t = [...opening, ...turns(['AI', 'Where is the Mombasa deal now?'], ['PERSON', 'We signed the Mombasa distributor contract on Tuesday.'])];
    const { r, text } = await handed(t);
    expect(r.thisTurn).toBe('FOR THIS TURN, PROOF COMES BEFORE THE QUESTION ABOUT THEIR JOB. They just said: "We signed the Mombasa distributor contract on Tuesday." This is a claim that matters. In this turn, ask kindly for the smallest thing that would show it, such as a document, a receipt, a screenshot or an email, and say what it is for. Do not ask about their job in this turn. Ask about their job on a later turn, after this.');
    /* Nothing is asked again to force the job question in. */
    expect(r.thing).toBeNull();
    /* The interview is still there, whole. */
    expect(r.block).toContain(FIRST_CHECK_IN_ROLE_PROMPT);
    expect(r.block).toMatch(/NOT ASKED YET:/);
    /* The proof note is there too, and nothing in this turn tells the model to ask about the job before it. */
    expect(text).toMatch(/Ask kindly for the smallest thing that would show it/);
    expect(text).not.toContain('FOR THIS TURN, ABOUT THEIR JOB.');
    expect(text.indexOf('PROOF COMES BEFORE')).toBeLessThan(text.indexOf('AND ONE THING THEY SAID IS DONE'));
  });

  it('a number said as where things stand counts as a claim that matters', async () => {
    const t = [...opening, ...turns(['AI', 'How is the region doing?'], ['PERSON', 'We have 42 active stockists this month.'])];
    const { r } = await handed(t);
    expect(r.thisTurn).toBe(theProofComesFirst('We have 42 active stockists this month.'));
    expect(r.thing).toBeNull();
  });

  it('without a claim, the job question is named for this turn as before', async () => {
    const t = [...opening, ...turns(['AI', 'What is in the way?'], ['PERSON', 'The depot is slow to confirm stock.'])];
    const { r } = await handed(t);
    expect(r.thisTurn.startsWith('FOR THIS TURN, ABOUT THEIR JOB.')).toBe(true);
    expect(r.thing).not.toBeNull();
  });

  it('once proof has been asked for, the job question comes back on the next turn', async () => {
    const t = [...opening,
      ...turns(['AI', 'Where is the Mombasa deal now?'], ['PERSON', 'We signed the Mombasa distributor contract on Tuesday.']),
      ...turns(['AI', 'A photo of the signed contract is enough. Then it counts as proven.'], ['PERSON', 'Sure, I will send it after this.'])];
    const { r } = await handed(t);
    expect(r.thisTurn.startsWith('FOR THIS TURN, ABOUT THEIR JOB.')).toBe(true);
  });

  it('a reply that asks for proof is read as asking for proof, so it is never asked again for the job question', () => {
    expect(ASKS_FOR_PROOF.test('Could you send me a screenshot of the order?')).toBe(true);
    expect(asksAboutTheirJob(ROLE_TOPICS[0], 'Could you send me a screenshot of the order?')).toBe(false);
  });
});

describe('what the check-in already asked counts for the job', () => {
  const turns = (...t: [string, string][]) => t.map(([role, content]) => ({ role: role as 'AI' | 'PERSON', content }));
  it('"what did you understand your role to be" and a real answer cover it', () => {
    const c = coverageOf(ROLE_TOPICS, turns(['AI', 'What did you understand your role in this to be, in your own words?'], ['PERSON', 'I would lead the engineering team and own the product roadmap decisions.']));
    expect(c.answered.map((a) => a.what)).toEqual(['what they are responsible for in their job, and what doing well looks like in it']);
  });
  it('a question about the work, such as what is blocked, is not the job question', () => {
    const c = coverageOf(ROLE_TOPICS, turns(['AI', 'Is there anything blocked on someone else right now?'], ['PERSON', 'Yes, the depot is slow to confirm stock and finance sits on approvals.']));
    expect(c.notAsked).toHaveLength(1);
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
    expect(THE_REPLY_DID_NOT_ASK_ABOUT_THEIR_JOB(owns.what)).toBe('YOUR REPLY DID NOT ASK ABOUT THEIR JOB, AND THIS TURN IS THE ONE FOR IT. Write the reply again: one short sentence that responds to what they just said (if they voiced a worry, acknowledge it), then ONE friendly question, in your own words, about what they are responsible for in their job, and what doing well looks like in it. Do not explain why you are asking, do not add a sentence after the question, and do not say what check-in this is. It is the only question in the reply.');
  });
});

describe('a reply that says what kind of check-in this is', () => {
  it.each([
    'This is your first check-in for this check-in, and it helps to understand how your work fits in.',
    'This is your first check-in, so I would like to learn about your job.',
    'As part of your first check-in, what are you responsible for?',
  ])('"%s" is caught', (reply) => {
    expect(SAYS_WHICH_CHECK_IN_THIS_IS.test(reply)).toBe(true);
  });
  it.each([
    'What are you responsible for in your job?',
    'Your first priority is the Serena contract, so what happens first?',
    'The first check-in you had with Mercy was about the budget, what changed?',
  ])('"%s" is not', (reply) => {
    expect(SAYS_WHICH_CHECK_IN_THIS_IS.test(reply)).toBe(false);
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

  it('makes no model call: the parts come from their conversation\'s assessment', async () => {
    const w = world({ turns: SAID, read: { owns: 'the Nairobi accounts, and I answer for the monthly sales number' } });
    await keepWhatTheySaidAboutTheirJob(w.deps, CHECK_IN, w.assessment);
    expect(w.anthropic.extract).not.toHaveBeenCalled();
    expect(w.created[0].owns).toBe('the Nairobi accounts, and I answer for the monthly sales number');
  });

  it('a short job name they said is kept, a long one is not', () => {
    expect(onlyWhatTheySaid({ roleName: 'sales representative' }, ['I am a sales representative for the coast.']).roleName).toBe('sales representative');
    expect(onlyWhatTheySaid({ roleName: 'I am the person who looks after all of the Nairobi accounts' }, ['I am the person who looks after all of the Nairobi accounts']).roleName).toBeUndefined();
  });

  it('writes one private row, sets the title because there is none, and leaves a request in Ask for the role map', async () => {
    const w = world({ turns: SAID, read: { roleName: 'sales representative', owns: 'the Nairobi accounts, and I answer for the monthly sales number', doingWell: 'hitting the number', dependsOn: 'finance to approve discounts', inTheWay: 'waiting for stock to be confirmed by the depot' }, stored: { first_check_in_role: { id: 'pv-ask', content: 'y' } } });
    const done = await keepWhatTheySaidAboutTheirJob(w.deps, CHECK_IN, w.assessment);
    expect(done).toMatchObject({ kept: true });
    expect(w.created).toHaveLength(1);
    expect(w.created[0]).toMatchObject({ source: 'first_check_in', sharedAt: null, promptVersionId: 'pv-assessment', askedWithPromptVersionId: 'pv-ask', checkInId: 'ci-1', personExternalId: 'p-1' });
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
    await keepWhatTheySaidAboutTheirJob(w.deps, CHECK_IN, w.assessment);
    expect(w.users).toHaveLength(0);
    expect(w.persons).toHaveLength(0);
    expect(w.created[0].roleName).toBe('Account manager');
  });

  it('keeps nothing for somebody who has done a check-in before, and nothing when there is no assessment', async () => {
    const before = world({ earlier: 1, turns: SAID, read: { owns: 'x' } });
    expect(await keepWhatTheySaidAboutTheirJob(before.deps, CHECK_IN, before.assessment)).toBeNull();
    expect(before.created).toHaveLength(0);
    const broken = world({ turns: SAID });
    expect(await keepWhatTheySaidAboutTheirJob(broken.deps, CHECK_IN, null)).toBeNull();
    expect(broken.created).toHaveLength(0);
  });

  it('a very short check-in is not read', async () => {
    const w = world({ turns: ['Fine.', 'Ok.'], read: { owns: 'Fine' } });
    expect((await keepWhatTheySaidAboutTheirJob(w.deps, CHECK_IN, w.assessment))?.kept).toBe(false);
    expect(w.created).toHaveLength(0);
  });

  it('what is asked reads as plain sentences', () => {
    expect(theRoleMapQuestion('Sales rep', 'the Nairobi accounts')).toMatch(/^In your first check-in you told me about your job as Sales rep\. You said you are responsible for "the Nairobi accounts"\. Shall I let the role map show this under Sales rep\?/);
  });

  it('the assessment is told to copy each part of the job from one of their answers, exactly', () => {
    expect(THE_ASSESSMENT_PROMPT).toContain('`words` are copied from ONE of their answers, exactly, never joined from two.');
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
