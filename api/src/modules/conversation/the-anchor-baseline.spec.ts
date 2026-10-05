import { GroundScenario, PartyType, CheckInStatus } from '@prisma/client';
import { ConversationService } from './conversation.service';
import { ConversationContextService } from './context.service';
import { ANCHOR_BASELINE_PROMPT, ANCHOR_BASELINE_PROMPT_KEY, THE_BASELINE_GUIDANCE, THE_BASELINE_REMINDER, theAnchorBaselineGuidance } from './the-anchor-baseline';
import { READ_THIS_LAST } from './the-anchor-lead-conversation';
import { whatToDoAboutTheirDeadline } from './a-period-is-not-a-day';
import { THE_NINE, withoutAnExampleAnswer, THE_BASELINE_CLOSING_REMINDER, everythingIsLearned, whatIsLearnedFrom } from './the-baseline-so-far';

/**
 * ANCHOR PIECE 14: THE TEAM BASELINE IS THE FIRST SESSION FOR SOMEBODY ON THE LEAD'S TEAM (section 15; decision 105
 * item 6). Composed through the real conversation service for a real first session, and what is read is what reaches
 * the model. The questions come up one at a time, never as a list; every other check-in reads what it read before.
 */
const LEAD = { id: 'p0', groundId: 'g1', partyType: PartyType.INITIATOR, managingOnly: false, roleAsDescribed: 'Programme director', createdAt: new Date('2026-01-01'), nameGiven: null, email: 'amina@example.test', user: { firstName: 'Amina', lastName: 'Yusuf' } };
const PERSON = { id: 'p1', groundId: 'g1', partyType: PartyType.PARTICIPANT, managingOnly: false, roleAsDescribed: null, createdAt: new Date('2026-01-02'), nameGiven: null, email: 'tunde@example.test', user: { firstName: 'Tunde', lastName: 'Okafor' } };
const COLLEAGUE = { id: 'p2', groundId: 'g1', partyType: PartyType.PARTICIPANT, managingOnly: false, roleAsDescribed: null, createdAt: new Date('2026-01-03'), nameGiven: null, email: 'ngozi@example.test', user: { firstName: 'Ngozi', lastName: 'Balogun' } };

const THEIR_WORDS = 'I sent the district data to the programme office on Tuesday.';
const THEIR_PROMISE = 'I will ask Ngozi for the Kano attendance sheets';

type World = { turns?: { role: string; content: string }[]; answer?: string; startedFrom?: string | null; switchOn?: boolean; sessionNumber?: number; asTheLead?: boolean; scenario?: GroundScenario; stored?: { id: string; content: string } | null };

function aWorld(w: World = {}) {
  const sessionNumber = w.sessionNumber ?? 1;
  const me = w.asTheLead ? LEAD : PERSON;
  const ground = {
    id: 'g1', organizationId: 'org1', scenario: w.scenario ?? GroundScenario.NEW_PROJECT, moment: null, label: 'The literacy programme',
    mode: 'SHARED', timelineDays: 30, brief: 'The lead private line: Amina will review everyone in March', toldToParticipants: 'This check-in is about why the quarterly donor reports matter for the programme team.', startsAt: null, endsAt: null, status: 'ACTIVE', leadRemit: null, cadence: null, resolutionState: null,
    initiatorId: 'p0', peersVisibleToEachOther: null, expectThemToUnblock: true, startedFrom: w.startedFrom ?? null,
    objectives: [
      { name: 'District reports reach the donor on time', target: null, ownerParticipantId: null, isADecisionAboutAPerson: false, setByParticipantId: 'p0', direction: null },
      { name: 'Ngozi owns the Kano target', target: 40, ownerParticipantId: 'p2', isADecisionAboutAPerson: false, setByParticipantId: 'p0', direction: null },
    ],
    report: null, leadContextNotes: [], participants: [LEAD, PERSON, COLLEAGUE],
  };
  const checkIn = {
    id: 'ci2', groundId: 'g1', participantId: me.id, sessionNumber, status: CheckInStatus.IN_PROGRESS, isClarification: false, clarificationTarget: null,
    isSelfCorrection: false, selfCorrectionTargetSession: null, isFinal: false,
    participant: { id: me.id, userId: 'user-1', groundId: 'g1', partyType: me.partyType, roleAsDescribed: null, user: me.user },
  };
  const seed: Record<string, any> = {
    ground: { findUnique: jest.fn(async () => ground), findFirst: jest.fn(async () => ground) },
    platformSetting: { findUnique: jest.fn(async () => (w.switchOn ? { value: { on: true } } : null)) },
    checkIn: {
      findUnique: jest.fn(async () => checkIn),
      findMany: jest.fn(async () => []),
      findFirst: jest.fn(async () => ({ id: 'ci1', completedAt: new Date(Date.now() - 7 * 86_400_000) })),
      count: jest.fn(async () => 0),
      update: jest.fn(async () => ({})),
    },
    recordEntry: { findMany: jest.fn(async () => [{ text: THEIR_WORDS }]), count: jest.fn(async () => 0) },
    groundCommitment: { findMany: jest.fn(async () => [{ text: THEIR_PROMISE, whenSaid: 'this week' }]) },
    groundParticipant: { count: jest.fn(async () => 3), findUnique: jest.fn(async () => ({ specificityHistory: [] })), findFirst: jest.fn(async () => me), findMany: jest.fn(async () => [LEAD, PERSON, COLLEAGUE].map((p) => ({ ...p, checkIns: [] }))) },
    conversationTurn: { count: jest.fn(async () => 1), findMany: jest.fn(async (a: any) => { const t = (w.turns ?? []).map((x, n) => ({ id: `t${n}`, createdAt: new Date(2026, 9, 1, 9, n), ...x })); return a?.orderBy?.createdAt === 'desc' ? [...t].reverse().slice(0, a.take ?? 99) : t; }), create: jest.fn(async (a: any) => ({ id: 't1', content: a.data.content })) },
  };
  const prisma: any = new Proxy(seed, {
    get: (target: any, model: string) => new Proxy(target[model] ?? {}, {
      get: (m: any, method: string) => m[method] ?? (async () => (String(method).endsWith('Many') || method === 'groupBy' ? [] : null)),
    }),
  });
  const getActive = jest.fn(async (k: string) => { if (k === ANCHOR_BASELINE_PROMPT_KEY && w.stored) return w.stored; throw new Error('none'); });
  const promptStore: any = { getActiveContent: jest.fn(async (k: string) => (k === 'system' ? 'SYS' : null)), getActive };
  const nothing: any = { get: () => undefined };
  const seen: string[] = [];
  const respond = jest.fn(async (system: string) => { seen.push(system); return 'Thank you. What is taking most of your attention now?'; });
  const service = new ConversationService(prisma, promptStore, { respond } as any, new ConversationContextService(prisma), nothing, nothing, nothing, nothing, nothing, nothing);
  /* A real turn of the person's check-in, through sendMessage; what is read is the prompt the model was handed. */
  const compose = async () => { await service.sendMessage('ci2', 'user-1', w.answer ?? 'It is moving slowly.'); return seen[0] ?? ''; };
  return { service, checkIn, compose, seen, seed, version: () => (service as any).anchorVersionForThisTurn.get('ci2') };
}


const NINE = ['What they are working on.', 'What matters most right now from where they sit.', 'What they are responsible for.', 'What success looks like to them.', 'What they think their lead is most concerned about.', 'What makes their work difficult.', 'Who they depend on.', 'Who depends on them.', 'What they think the team could be doing better.'];

describe('anchor piece 14: the baseline, as the model reads it in the first session', () => {
  it('carries the spec\'s nine things to learn, one at a time, never as a list', async () => {
    const prompt = await aWorld({ startedFrom: 'anchor', switchOn: true }).compose();
    for (const n of NINE) expect(prompt).toContain(n);
    expect(prompt).toContain('Never list them, never number them, and never say how many there are or how many are left.');
    expect(prompt).toContain('Ask exactly one question in this turn');
    expect(prompt.indexOf(THE_BASELINE_REMINDER)).toBeGreaterThan(prompt.indexOf('Never list them'));
  });
  it('learns all nine before it closes, names the four that were missed, and asks for no proof (review of piece 14)', async () => {
    const prompt = await aWorld({ startedFrom: 'anchor', switchOn: true }).compose();
    expect(prompt).toContain('Learn all nine before you close. Do not sum up, thank them for their time, or end the conversation while any of the nine is still unasked, unless they say they want to stop.');
    expect(prompt).toContain('who they depend on to get their work done, who depends on them, what they are responsible for, and what they think their lead is most concerned about.');
    expect(prompt).toContain('Do not ask for proof, numbers, dates, documents or examples to back up what they said, and do not ask how they know something.');
    /* And the line read last says it again, after everything else. */
    const last = prompt.slice(prompt.indexOf('# For this person, in this first conversation'));
    expect(last).toContain('Do not ask for proof, numbers or examples, and never give an example of an answer: no "for instance", no "such as", no "something like". Do not close while one of the nine is still unasked.');
  });
  it('gives only what this person has been told the check-in is for, never the lead\'s own brief', async () => {
    const prompt = await aWorld({ startedFrom: 'anchor', switchOn: true }).compose();
    const block = prompt.slice(prompt.indexOf('# What this person has been told this check-in is for'));
    expect(block).toContain('This check-in is about why the quarterly donor reports matter for the programme team.');
    /* The lead's brief reaches the model only as context it may never quote, as it always has; never in this block. */
    expect(block.split('\n\n').slice(0, 2).join(' ')).not.toContain('Amina will review everyone in March');
  });
  it('runs the stored version and says which ran', async () => {
    const w = aWorld({ startedFrom: 'anchor', switchOn: true, stored: { id: 'pv-baseline-1', content: ANCHOR_BASELINE_PROMPT } });
    await w.compose();
    expect(w.version()).toBe('pv-baseline-1');
  });
  it('is seeded with its reminder after the marker', () => {
    expect(ANCHOR_BASELINE_PROMPT.indexOf(READ_THIS_LAST)).toBeGreaterThan(ANCHOR_BASELINE_PROMPT.indexOf(THE_BASELINE_GUIDANCE.slice(0, 40)));
  });
});

describe('anchor piece 14: who it is for, and who it is not for', () => {
  it.each([
    ['the switch is off', { startedFrom: 'anchor', switchOn: false }],
    ['the check-in did not begin at the anchor link', { startedFrom: null, switchOn: true }],
    ['it is the lead', { startedFrom: 'anchor', switchOn: true, asTheLead: true }],
    ['it is their second session, which is the weekly check-in', { startedFrom: 'anchor', switchOn: true, sessionNumber: 2 }],
  ] as [string, World][])('is not sent when %s', async (_n, w) => {
    const prompt = await aWorld(w).compose();
    expect(prompt).not.toContain('Their lead invited them');
    expect(prompt).not.toContain(NINE[4]);
  });
  it('a first session that is not an anchor one reads exactly what it read with the switch off', async () => {
    for (const scenario of [GroundScenario.NEW_PROJECT, GroundScenario.OKR_ALIGNMENT, GroundScenario.NEW_HIRE]) {
      expect(await aWorld({ scenario, switchOn: true }).compose()).toBe(await aWorld({ scenario, switchOn: false }).compose());
    }
  });
  it('the gate is one function', async () => {
    expect(await theAnchorBaselineGuidance(async () => true, undefined, { ground: { startedFrom: 'anchor' }, isTheLead: false, sessionNumber: 1 })).toMatchObject({ promptVersionId: null });
    expect(await theAnchorBaselineGuidance(async () => true, undefined, { ground: { startedFrom: 'anchor' }, isTheLead: false, sessionNumber: 2 })).toBeNull();
  });
});

describe('the team baseline says nothing of the lead\'s own conversation, and does not open on who the check-in is about (6 October)', () => {
  const opened = async (w: World) => {
    const world = aWorld({ ...w, sessionNumber: 1 });
    world.seed.checkIn.findUnique = jest.fn(async () => ({ ...world.checkIn, status: CheckInStatus.NOT_STARTED }));
    (world.service as any).billing = { canStartSession: jest.fn(async () => ({ allowed: true, sessionsBalance: -1 })) };
    (world.service as any).prompts.getActive = jest.fn(async () => ({ id: 'pv', content: 'STORED' }));
    return world.service.open('ci2', 'user-1') as Promise<any>;
  };

  it('opens a person on the lead\'s team on a question about their work, never "are you the person this check-in is about"', async () => {
    const out = await opened({ startedFrom: 'anchor', switchOn: true });
    expect(out.reply).toBe('Thank you. What is taking most of your attention now?');
    expect(out.reply).not.toMatch(/person this check-in is about/);
  });

  it('still asks that of a first session that is not the anchor\'s, exactly as before', async () => {
    const out = await opened({ startedFrom: null, switchOn: true });
    expect(out.reply).toMatch(/are you the person this check-in is about/);
  });

  it('tells a person on the team only what the product was told to say, and none of the aims the lead\'s words made', async () => {
    const out = await opened({ startedFrom: 'anchor', switchOn: true });
    expect(out.brief.says).toBe('This check-in is about why the quarterly donor reports matter for the programme team.');
    expect(out.brief.objectives).toEqual([]);
    expect(JSON.stringify(out.brief)).not.toMatch(/Amina will review|District reports reach the donor|Kano target/);
  });

  it('tells a person on the team nothing at all when the product was told nothing, and never the lead\'s brief in its place', async () => {
    const world = aWorld({ startedFrom: 'anchor', switchOn: true });
    (world.seed.ground.findUnique as jest.Mock).mockImplementation(async () => ({
      id: 'g1', organizationId: 'org1', scenario: GroundScenario.HELP_TEAM_UNDERSTAND, label: 'Help my team understand', status: 'ACTIVE',
      brief: 'You are carrying the delivery team and you see them stop at the handover.', toldToParticipants: null, initiatorId: 'p0', startedFrom: 'anchor',
      objectives: [{ name: 'They would ask whether the client is happy', target: null, ownerParticipantId: null, isADecisionAboutAPerson: false, setByParticipantId: 'p0', direction: null }],
      participants: [LEAD, PERSON], peersVisibleToEachOther: null, whoSeesTargets: null,
    }));
    world.seed.checkIn.findUnique = jest.fn(async () => ({ ...world.checkIn, status: CheckInStatus.NOT_STARTED }));
    (world.service as any).billing = { canStartSession: jest.fn(async () => ({ allowed: true, sessionsBalance: -1 })) };
    (world.service as any).prompts.getActive = jest.fn(async () => ({ id: 'pv', content: 'STORED' }));
    const out: any = await world.service.open('ci2', 'user-1');
    expect(out.brief.says).toBeNull();
    expect(out.brief.objectives).toEqual([]);
    expect(JSON.stringify(out.brief)).not.toMatch(/carrying the delivery team|stop at the handover|ask whether the client is happy/);
  });

  it('serves the lead her own words and her own aims, as it always did', async () => {
    const world = aWorld({ startedFrom: 'anchor', switchOn: true, asTheLead: true });
    const was = world.seed.ground.findUnique as jest.Mock;
    const original = was.getMockImplementation()!;
    was.mockImplementation(async (a: any) => ({ ...(await original(a)), initiatorId: 'user-1' }));
    world.seed.checkIn.findUnique = jest.fn(async () => ({ ...world.checkIn, status: CheckInStatus.NOT_STARTED }));
    (world.service as any).billing = { canStartSession: jest.fn(async () => ({ allowed: true, sessionsBalance: -1 })) };
    (world.service as any).prompts.getActive = jest.fn(async () => ({ id: 'pv', content: 'STORED' }));
    const out: any = await world.service.open('ci2', 'user-1');
    expect(out.brief.says).toContain('Amina will review everyone in March');
    expect(out.brief.objectives.length).toBeGreaterThan(0);
  });
});

describe('the team baseline puts no ready-made answer into anybody\'s mouth (6 October)', () => {
  function withSuggestions(w: World) {
    const world = aWorld(w);
    const extract = jest.fn(async () => ({ answers: ['I believe we are shipping the product.', 'We are stuck on the data.', 'I am not sure.'] }));
    (world.service as any).anthropic = { respond: jest.fn(async () => 'What is taking most of your attention now?'), extract };
    return { world, extract };
  }
  const reply = async (w: World) => {
    const { world } = withSuggestions(w);
    return (await world.service.sendMessage('ci2', 'user-1', 'It is moving slowly.')) as any;
  };

  it('offers none under a baseline question', async () => {
    const out = await reply({ startedFrom: 'anchor', switchOn: true });
    expect(out.suggestedAnswers).toBeUndefined();
  });

  it('offers them in the weekly check-in and in every other check-in, as before', async () => {
    const weekly = await reply({ startedFrom: 'anchor', switchOn: true, sessionNumber: 2 });
    expect(weekly.suggestedAnswers).toEqual(['I believe we are shipping the product.', 'We are stuck on the data.', 'I am not sure.']);
    const other = await reply({ startedFrom: null, switchOn: true });
    expect(other.suggestedAnswers?.length).toBeGreaterThan(0);
  });
});

describe('the team baseline never offers an answer and never promises what it is not about (6 October)', () => {
  it('says so in its words', () => {
    expect(THE_BASELINE_GUIDANCE).toContain('Never give an example of what they might say, and never use "for instance" or "such as".');
    expect(THE_BASELINE_GUIDANCE).toContain('never say it is not about their numbers, their performance or any review');
    expect(THE_BASELINE_GUIDANCE).toContain('it helps the team understand one another and get the work moving, and there are no right answers');
  });
});

describe('the team baseline is read on its own words, not under the situation\'s pack (6 October)', () => {
  it('carries no plan written from the lead\'s brief, no project questions, and tells it how to open', async () => {
    const prompt = await aWorld({ startedFrom: 'anchor', switchOn: true, scenario: GroundScenario.HELP_TEAM_UNDERSTAND }).compose();
    expect(prompt).not.toContain('Must establish');
    expect(prompt).not.toContain('What did you understand the brief to be');
    expect(prompt).not.toContain('Amina will review everyone in March');
    /* No nudge to attach a document, which is the engine's way of asking for proof. */
    expect(prompt).not.toContain('DOC_PROMPT_HINT');
    expect(prompt).toContain('How to open: greet them by their first name');
    expect(prompt).toContain('The person you are talking with is Tunde.');
    /* And the nine are still there, with the reminder read last. */
    for (const n of NINE) expect(prompt).toContain(n);
    expect(prompt.endsWith(THE_BASELINE_REMINDER)).toBe(true);
  });

  it('leaves the weekly check-in (the second session) under the situation\'s pack, as it was', async () => {
    const prompt = await aWorld({ startedFrom: 'anchor', switchOn: true, sessionNumber: 2, scenario: GroundScenario.HELP_TEAM_UNDERSTAND }).compose();
    expect(prompt).not.toContain('How to open: greet them by their first name');
  });
});

describe('the team baseline counts what it has learned from the person\'s own words, and closes only when all nine are learned (6 October)', () => {
  const ALL = Object.fromEntries(THE_NINE.map((n) => [n.key, true]));
  async function promptWhenLearned(learned: Record<string, boolean> | null) {
    const world = aWorld({ startedFrom: 'anchor', switchOn: true, turns: [{ role: 'AI', content: 'What are you working on right now?' }], answer: 'Getting the trucks out on time.' });
    const seen: string[] = [];
    const extract = jest.fn(async (_s: string, _h: any, tool: any) => { if (tool?.name === 'what_the_person_has_told_us') return learned; throw new Error('not this one'); });
    (world.service as any).anthropic = { respond: jest.fn(async (system: string) => { seen.push(system); return 'Thank you.'; }), extract };
    await world.service.sendMessage('ci2', 'user-1', 'Getting the trucks out on time.');
    return { prompt: seen[0] ?? '', extract };
  }

  it('hands the model what is learned and what is not, as labels only, and tells it not to close', async () => {
    const { prompt } = await promptWhenLearned({ ...Object.fromEntries(THE_NINE.map((n) => [n.key, false])), workingOn: true, responsibleFor: true });
    expect(prompt).toContain('Learned already. Do not ask about these again:\n- what they are working on\n- what they are responsible for');
    expect(prompt).toContain('Not learned yet. Ask about only these, one at a time');
    expect(prompt).toContain('- who they depend on\n- who depends on them');
    expect(prompt).toContain('You must not close yet.');
    expect(prompt).not.toContain('all nine things are learned');
    expect(prompt).not.toContain('Getting the trucks out on time.');
  });

  it('tells it to close, in two sentences with no question, once all nine are learned, and says so last', async () => {
    const { prompt } = await promptWhenLearned(ALL);
    expect(prompt).toContain(THE_BASELINE_CLOSING_REMINDER);
    expect(prompt.endsWith(THE_BASELINE_CLOSING_REMINDER)).toBe(true);
    expect(prompt).not.toContain('Not learned yet.');
  });

  it('runs on its own words when the count fails, as it did before', async () => {
    const { prompt } = await promptWhenLearned(null);
    expect(prompt).toContain('Ask exactly one question in this turn');
    expect(prompt).not.toContain('Learned already.');
  });

  it('keeps what was learned: a thing learned once stays learned', () => {
    expect(whatIsLearnedFrom({ workingOn: false }, { workingOn: true }).workingOn).toBe(true);
    expect(everythingIsLearned(whatIsLearnedFrom(ALL))).toBe(true);
    expect(everythingIsLearned(whatIsLearnedFrom({ ...ALL, dependOn: false }))).toBe(false);
  });
});

describe('the team baseline is never held at its close (6 October)', () => {
  const SAID = ['Getting the trucks out.', 'Stock reaching the shops.', 'The floor.', 'A full van.', 'Ken worries about the shops.', 'The stock list.', 'The office.', 'The drivers.', 'Send the list early.'];
  async function theClose(startedFrom: string | null) {
    const world = aWorld({ startedFrom, switchOn: true, turns: SAID.flatMap((t, i) => [{ role: 'AI', content: `Question ${i}` }, { role: 'PERSON', content: t }]) });
    world.seed.checkIn.findUnique = jest.fn(async () => ({ closeHeldAt: null, participantId: 'p1', startedAt: new Date(), isClarification: false, sessionNumber: 1, participant: { partyType: PartyType.PARTICIPANT }, ground: { cadence: 'WEEKLY', scenario: GroundScenario.HELP_TEAM_UNDERSTAND, startedFrom } }));
    return (world.service as any).mayClose('ci2') as Promise<{ ready: boolean; ask?: string }>;
  }

  it('lets it close, without asking what they will do and by when, or for a date or a number', async () => {
    expect(await theClose('anchor')).toEqual({ ready: true });
  });

  it('still holds an ordinary first session once, as before', async () => {
    const held = await theClose(null);
    expect(held.ready).toBe(false);
    expect(held.ask).toMatch(/one more question|What will you do|by when/i);
  });
});

describe('a sentence that offers an example answer comes off a baseline reply (6 October)', () => {
  it('takes off "For instance, something like invoices paid within five days" and keeps the question', () => {
    const said = withoutAnExampleAnswer('What would success look like to you for these accounts? For instance, something like invoices paid within five days, or weekly check-ins with the clinic managers.');
    expect(said.text).toBe('What would success look like to you for these accounts?');
    expect(said.cut).toHaveLength(1);
  });
  it('leaves a reply with no example exactly as it is, and never leaves a reply that asks nothing', () => {
    expect(withoutAnExampleAnswer('What matters most right now from where you sit?')).toEqual({ text: 'What matters most right now from where you sit?', cut: [] });
    const only = 'For instance, something like paid invoices?';
    expect(withoutAnExampleAnswer(only)).toEqual({ text: only, cut: [] });
  });
});

describe('the team baseline does not turn what they said into a date or a number to confirm (6 October)', () => {
  const SAID = 'Twelve signed contracts by the end of December.';
  const theInstruction = whatToDoAboutTheirDeadline(SAID, new Date(), []);

  it('is told nothing about the period they named', async () => {
    expect(theInstruction).toBeTruthy();
    const baseline = await aWorld({ startedFrom: 'anchor', switchOn: true, answer: SAID }).compose();
    expect(baseline).not.toContain(theInstruction as string);
  });

  it('is still told it in every other session, as before', async () => {
    const weekly = await aWorld({ startedFrom: 'anchor', switchOn: true, sessionNumber: 2, answer: SAID }).compose();
    expect(weekly).toContain(theInstruction as string);
  });
});
