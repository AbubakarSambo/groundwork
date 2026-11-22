import { NOTHING_KEPT_YET_COME_BACK } from './a-finish-too-soon-is-said-plainly';
import { GroundScenario, PartyType, CheckInStatus } from '@prisma/client';
import { ConversationService } from './conversation.service';
import { ConversationContextService } from './context.service';
import { ANCHOR_BASELINE_PROMPT_KEY } from './the-anchor-baseline';
import { ANCHOR_PARTICIPANT_PROMPT_KEY } from './the-anchor-weekly-check-in';
import { THE_NINE, THE_BASELINE_FOLLOW_UP_REMINDER, THE_BASELINE_FINISH_REMINDER, THE_BASELINE_CLOSING_REMINDER, theFollowUpFrom } from './the-baseline-so-far';
import { THE_WEEKLY_FINISH_REMINDER, THE_WEEKLY_FOLLOW_UP_REMINDER, THE_ANCHOR_GIVES_IT_PASSING_WEIGHT } from './the-anchor-follows-up-what-was-said';

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
    platformSetting: { findUnique: jest.fn(async () => (w.switchOn ? { value: { on: true } } : { value: { on: false } })) },
    checkIn: {
      /* Their own earlier sessions (theirOwnSessionNumber, 22 November): a person in session 2 has their session-1 row, as in the database. */
      findUnique: jest.fn(async () => checkIn),
      findMany: jest.fn(async (a: any) => (a?.distinct?.includes?.('sessionNumber') && a?.where?.sessionNumber?.lt ? Array.from({ length: a.where.sessionNumber.lt - 1 }, (_, i) => ({ sessionNumber: i + 1 })) : [])),
      findFirst: jest.fn(async () => ({ id: 'ci1', completedAt: new Date(Date.now() - 7 * 86_400_000) })),
      count: jest.fn(async () => 0),
      update: jest.fn(async () => ({})),
    },
    recordEntry: { findMany: jest.fn(async () => [{ text: THEIR_WORDS }]), count: jest.fn(async () => 0) },
    groundCommitment: { findMany: jest.fn(async () => [{ text: THEIR_PROMISE, whenSaid: 'this week' }]) },
    groundParticipant: { count: jest.fn(async () => 3), findUnique: jest.fn(async () => ({ specificityHistory: [] })), findFirst: jest.fn(async () => me), findMany: jest.fn(async () => [LEAD, PERSON, COLLEAGUE].map((p) => ({ ...p, checkIns: [] }))) },
    conversationTurn: { count: jest.fn(async () => 1), findMany: jest.fn(async (a: any) => { const t = (w.turns ?? []).map((x, n) => ({ id: `t${n}`, createdAt: new Date(2026, 9, 1, 9, n), ...x })); return a?.orderBy?.createdAt === 'desc' ? [...t].reverse().slice(0, a.take ?? 99) : t; }), create: jest.fn(async (a: any) => ({ id: 't1', content: a.data.content })), update: jest.fn(async (a: any) => ({ id: 't1', content: a.data.content })) },
  };
  const prisma: any = new Proxy(seed, {
    get: (target: any, model: string) => new Proxy(target[model] ?? {}, {
      get: (m: any, method: string) => m[method] ?? (async () => (String(method).endsWith('Many') || method === 'groupBy' ? [] : null)),
    }),
  });
  const getActive = jest.fn(async (k: string) => { if ((k === ANCHOR_BASELINE_PROMPT_KEY || k === ANCHOR_PARTICIPANT_PROMPT_KEY) && w.stored) return w.stored; throw new Error('none'); });
  const promptStore: any = { getActiveContent: jest.fn(async (k: string) => (k === 'system' ? 'SYS' : null)), getActive };
  const nothing: any = { get: () => undefined };
  const seen: string[] = [];
  const respond = jest.fn(async (system: string) => { seen.push(system); return 'Thank you. What is taking most of your attention now?'; });
  const service = new ConversationService(prisma, promptStore, { respond } as any, new ConversationContextService(prisma), nothing, nothing, nothing, nothing, nothing, nothing);
  /* A real turn of the person's check-in, through sendMessage; what is read is the prompt the model was handed. */
  const compose = async () => { await service.sendMessage('ci2', 'user-1', w.answer ?? 'It is moving slowly.'); return seen[0] ?? ''; };
  return { service, checkIn, compose, seen, seed, version: () => (service as any).anchorVersionForThisTurn.get('ci2') };
}



const ALL_FALSE = Object.fromEntries(THE_NINE.map((n) => [n.key, false]));
const KOFI = 'The fridge in van 2 has been broken for two weeks so I lose about 3 crates of mangoes a trip. I told the yard manager on 1 October but nothing happened.';

/** The model's two reads are told apart by the tool they are given; the reply is whatever the test says. */
function worldReading(w: World, reads: { learned?: Record<string, any> | null; follow?: any }) {
  const world = aWorld({ switchOn: true, startedFrom: 'anchor', ...w });
  const seen: string[] = [];
  const calls: string[] = [];
  const extract = jest.fn(async (_s: string, _h: any, tool: any) => {
    calls.push(tool?.name);
    if (tool?.name === 'what_the_person_has_told_us') { if (reads.learned === null) throw new Error('down'); return { ...ALL_FALSE, ...(reads.learned ?? {}), ...(reads.follow ?? {}) }; }
    if (tool?.name === 'what_to_follow_up') return reads.follow ?? {};
    throw new Error(`not this one: ${tool?.name}`);
  });
  (world.service as any).anthropic = { respond: jest.fn(async (system: string) => { seen.push(system); return 'Thank you. What happened after you told him?'; }), extract };
  const said = (w.turns ?? []).filter((t) => t.role === 'PERSON').length;
  world.seed.conversationTurn.count = jest.fn(async () => said);
  return { ...world, seen, calls, extract };
}

describe('the anchor reads what the person just said, and follows it up before it asks for the next thing on its list (final check, 8 October)', () => {
  it('first session: a blocker they just named is the turn\'s question, and the nine wait behind it', async () => {
    const w = worldReading({ turns: [{ role: 'AI', content: 'What are you working on right now?' }], answer: KOFI }, { learned: { workingOn: true, whatMakesItHard: true }, follow: { followUp: { kind: 'blocker', about: 'the broken fridge in van 2' } } });
    await w.service.sendMessage('ci2', 'user-1', KOFI);
    const prompt = w.seen[0];
    expect(prompt).toContain('# What they have just said comes first');
    expect(prompt).toContain('Their last answer named something in the way of their work: the broken fridge in van 2.');
    expect(prompt).toContain('Your question this turn is one plain question about that');
    expect(prompt).toContain('to come back to on a later turn');
    expect(prompt).not.toContain('Ask about only these, one at a time');
    /* The reminder read last stands in for "ask about one of the nine" on this turn, and says so. */
    expect(prompt.endsWith(THE_BASELINE_FOLLOW_UP_REMINDER)).toBe(true);
    expect(prompt).not.toContain('Ask exactly one question in this turn, about one of the nine things');
    /* None of their own words are put in front of the model to echo. */
    expect(prompt).not.toContain('mangoes');
  });

  it('first session: when they named nothing to follow up, the nine are asked as before, to the word', async () => {
    const w = worldReading({ turns: [{ role: 'AI', content: 'What are you working on right now?' }], answer: 'Getting the trucks out on time.' }, { learned: { workingOn: true } });
    await w.service.sendMessage('ci2', 'user-1', 'Getting the trucks out on time.');
    const prompt = w.seen[0];
    expect(prompt).not.toContain('comes first');
    expect(prompt).toContain('Not learned yet. Ask about only these, one at a time, in the order that follows what they have just said:');
    expect(prompt).toContain('Do not ask why, what makes it so, or how they know.');
    expect(prompt).toContain('Ask exactly one question in this turn, about one of the nine things you have not yet learned from them.');
  });

  it('first session: the read that counts the nine is told that something named in passing counts, and is asked for what to follow up', () => {
    const { THE_BASELINE_READ_SYSTEM, THE_BASELINE_READ_TOOL } = jest.requireActual('./the-baseline-so-far');
    expect(THE_BASELINE_READ_SYSTEM).toContain('Something they name in passing does count when it plainly answers the thing.');
    expect(THE_BASELINE_READ_SYSTEM).toContain('a shop that has not paid');
    expect(Object.keys(THE_BASELINE_READ_TOOL.input_schema.properties)).toContain('followUp');
    expect(THE_BASELINE_READ_TOOL.input_schema.required).not.toContain('followUp');
  });

  it('does not hand the same subject over twice: the read is told what it has already handed over', async () => {
    const w = worldReading({ turns: [{ role: 'AI', content: 'What are you working on right now?' }], answer: KOFI }, { learned: { workingOn: true }, follow: { followUp: { kind: 'duty', about: 'asking shops for payment' } } });
    await w.service.sendMessage('ci2', 'user-1', KOFI);
    await w.service.sendMessage('ci2', 'user-1', 'I only deliver the crates.');
    const systems = w.extract.mock.calls.filter((c: any[]) => c[2]?.name === 'what_the_person_has_told_us').map((c: any[]) => c[0] as string);
    expect(systems[0]).not.toContain('already asked about these');
    expect(systems[1]).toContain('Groundwork has already asked about these');
    expect(systems[1]).toContain('asking shops for payment');
  });

  it('keeps only a known kind and a short plain subject from the read', () => {
    expect(theFollowUpFrom({ followUp: { kind: 'blocker', about: ' two shops  owe us ' } })).toEqual({ kind: 'blocker', about: 'two shops owe us' });
    expect(theFollowUpFrom({ followUp: { kind: 'opinion', about: 'x' } })).toBeNull();
    expect(theFollowUpFrom({ followUp: { kind: 'duty', about: '' } })).toBeNull();
    expect(theFollowUpFrom({ followUp: { kind: 'duty', about: 'x'.repeat(200) } })).toBeNull();
    expect(theFollowUpFrom(null)).toBeNull();
  });

  it('second session: a blocker or a duty they named replaces the lead\'s field as the turn\'s question, and is read last', async () => {
    const w = worldReading({ sessionNumber: 2, answer: 'Two shops on my round owe us for three weeks but I never ask, I thought the office does that.' }, { follow: { followUp: { kind: 'duty', about: 'asking shops for what they owe' } } });
    await w.service.sendMessage('ci2', 'user-1', 'Two shops on my round owe us for three weeks but I never ask, I thought the office does that.');
    const prompt = w.seen[0];
    expect(w.calls).toContain('what_to_follow_up');
    expect(prompt).toContain('# What they have just said comes first');
    expect(prompt).toContain('a duty, or something they thought somebody else did: asking shops for what they owe.');
    expect(prompt).not.toContain('THE THING THIS TURN IS FOR');
    expect(prompt.endsWith(THE_WEEKLY_FOLLOW_UP_REMINDER)).toBe(true);
  });

  it('second session: with nothing to follow up, the prompt is what it was', async () => {
    const withRead = worldReading({ sessionNumber: 2, answer: 'It is moving slowly.' }, { follow: {} });
    await withRead.service.sendMessage('ci2', 'user-1', 'It is moving slowly.');
    const without = aWorld({ switchOn: true, startedFrom: 'anchor', sessionNumber: 2 });
    await without.service.sendMessage('ci2', 'user-1', 'It is moving slowly.');
    expect(withRead.seen[0]).toBe(without.seen[0]);
  });

  it('an ordinary check-in makes neither read and reads exactly what it read', async () => {
    const w = worldReading({ sessionNumber: 2, startedFrom: null, answer: KOFI }, { follow: { followUp: { kind: 'blocker', about: 'the fridge' } } });
    (w.service as any).anthropic.extract = jest.fn(async () => { throw new Error('no'); });
    await w.service.sendMessage('ci2', 'user-1', KOFI);
    expect(w.seen[0]).not.toContain('comes first');
    expect((w.service as any).anthropic.extract).not.toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.objectContaining({ name: 'what_to_follow_up' }), expect.anything());
  });

  it('the lead is not read this way', async () => {
    const w = worldReading({ sessionNumber: 2, asTheLead: true, answer: KOFI }, { follow: { followUp: { kind: 'blocker', about: 'the fridge' } } });
    await w.service.sendMessage('ci2', 'user-1', KOFI);
    expect(w.calls).not.toContain('what_to_follow_up');
    expect(w.seen[0]).not.toContain('comes first');
  });

  it('says what counts as given only to the read of a person on the lead\'s team', () => {
    expect(THE_ANCHOR_GIVES_IT_PASSING_WEIGHT).toContain('SOMETHING NAMED IN PASSING COUNTS AS GIVEN');
  });
});

describe('"finish" closes an anchor check-in as it closes any other (final check, 8 October)', () => {
  const FIVE = [1, 2, 3, 4, 5].flatMap((n) => [{ role: 'AI', content: `Question ${n}?` }, { role: 'PERSON', content: `Answer number ${n} about the work, in a few words.` }]).concat([{ role: 'AI', content: 'Question 6?' }]);
  it('first session, enough said: the turn closes with no question, and says so last', async () => {
    const w = worldReading({ turns: FIVE, answer: 'finish' }, { learned: { workingOn: true } });
    await w.service.sendMessage('ci2', 'user-1', 'finish');
    expect(w.seen[0].endsWith(THE_BASELINE_FINISH_REMINDER)).toBe(true);
    expect(w.seen[0]).not.toContain('Ask exactly one question in this turn');
    expect(THE_BASELINE_FINISH_REMINDER).toContain('Do not ask a question in this turn.');
  });
  it('second session, enough said: the same', async () => {
    const w = worldReading({ sessionNumber: 2, turns: FIVE, answer: 'finish' }, {});
    await w.service.sendMessage('ci2', 'user-1', 'finish');
    expect(w.seen[0].endsWith(THE_WEEKLY_FINISH_REMINDER)).toBe(true);
    expect(w.calls).not.toContain('what_to_follow_up');
  });
  it('the closing statement is the close: it is not given a question of the product\'s own, and the check-in is complete', async () => {
    /* The person's own word is stored before the reply is made, as it is in the product. */
    const w = worldReading({ turns: [...FIVE, { role: 'PERSON', content: 'finish' }], answer: 'finish' }, { learned: { workingOn: true } });
    w.seed.conversationTurn.count = jest.fn(async () => 5);
    (w.service as any).anthropic.respond = jest.fn(async () => 'Thank you for telling me how your work looks from where you sit. The others on the team are being asked as well.');
    const out: any = await w.service.sendMessage('ci2', 'user-1', 'finish');
    expect(out.reply).not.toContain('What else should I know');
    expect(out.reply).toContain('Thank you for telling me how your work looks from where you sit.');
    expect(out.sessionComplete).toBe(true);
  });
  it('an anchor reply that asks nothing, when it was not told to close, is still given its question as before', async () => {
    /* Changed 26 October 2026 (polish round 2): from the fifth answer a normal day is told to close, so this reads the third. */
    const w = worldReading({ turns: FIVE.slice(0, 5), answer: 'Getting the trucks out on time.' }, { learned: { workingOn: true } });
    (w.service as any).anthropic.respond = jest.fn(async () => 'Thank you for telling me that.');
    const out: any = await w.service.sendMessage('ci2', 'user-1', 'Getting the trucks out on time.');
    expect(out.reply).toContain('?');
    expect(out.sessionComplete).toBe(false);
  });
  /* Changed 3 November 2026 (Hafsah: no question limits and no forced close): there is no floor, so "finish" is never answered with
     "Please answer one or two more questions". With nothing said yet there is nothing to keep: it says so in one plain sentence and the
     check-in stays open. */
  it('as the very first answer, nothing is kept and it stays open, with no count asked for', async () => {
    const w = worldReading({ turns: [{ role: 'AI', content: 'What are you working on right now?' }], answer: 'finish' }, {});
    /* The turns as the database holds them once "finish" is saved, read by role as Postgres would. */
    const rows = [{ id: 't0', role: 'AI', content: 'What are you working on right now?', createdAt: new Date(2026, 9, 1, 9, 0) }, { id: 't1', role: 'PERSON', content: 'finish', createdAt: new Date(2026, 9, 1, 9, 1) }];
    w.seed.conversationTurn.findMany = jest.fn(async (a: any) => {
      const t = a?.where?.role ? rows.filter((r) => r.role === a.where.role) : rows;
      return a?.orderBy?.createdAt === 'desc' ? [...t].reverse().slice(0, a.take ?? 99) : t;
    });
    const out: any = await w.service.sendMessage('ci2', 'user-1', 'finish');
    expect(out.reply).not.toMatch(/one or two more questions|I need a little more from you/);
    expect(out.reply).toBe(NOTHING_KEPT_YET_COME_BACK);
    expect(out.sessionComplete).toBe(false);
  });
  it('the closing reminder for nine learned is untouched', () => {
    expect(THE_BASELINE_CLOSING_REMINDER).toContain('all nine things are learned');
  });
});
