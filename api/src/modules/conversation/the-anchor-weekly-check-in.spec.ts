import { GroundScenario, PartyType, CheckInStatus } from '@prisma/client';
import { ConversationService } from './conversation.service';
import { ConversationContextService } from './context.service';
import { SEED_PROMPTS } from './prompt-library';
import {
  ANCHOR_PARTICIPANT_PROMPT,
  ANCHOR_PARTICIPANT_PROMPT_KEY,
  THE_WEEKLY_CHECK_IN_GUIDANCE,
  THE_WEEKLY_REMINDER,
  theAnchorParticipantGuidance,
  whatTheyToldYouBefore,
} from './the-anchor-weekly-check-in';
import { READ_THIS_LAST } from './the-anchor-lead-conversation';

/**
 * THE WEEKLY CHECK-IN FOR SOMEBODY ON THE ANCHOR LEAD'S TEAM (docs/anchor-scenario.md, section 20;
 * docs/anchor-scenario-plan.md, piece 15), as the model is given it. The prompt is composed through the
 * real conversation service for a real second session, and what is read is what reaches the model.
 */
const LEAD = { id: 'p0', groundId: 'g1', partyType: PartyType.INITIATOR, managingOnly: false, roleAsDescribed: 'Programme director', createdAt: new Date('2026-01-01'), nameGiven: null, email: 'amina@example.test', user: { firstName: 'Amina', lastName: 'Yusuf' } };
const PERSON = { id: 'p1', groundId: 'g1', partyType: PartyType.PARTICIPANT, managingOnly: false, roleAsDescribed: null, createdAt: new Date('2026-01-02'), nameGiven: null, email: 'tunde@example.test', user: { firstName: 'Tunde', lastName: 'Okafor' } };
const COLLEAGUE = { id: 'p2', groundId: 'g1', partyType: PartyType.PARTICIPANT, managingOnly: false, roleAsDescribed: null, createdAt: new Date('2026-01-03'), nameGiven: null, email: 'ngozi@example.test', user: { firstName: 'Ngozi', lastName: 'Balogun' } };

const THEIR_WORDS = 'I sent the district data to the programme office on Tuesday.';
const THEIR_PROMISE = 'I will ask Ngozi for the Kano attendance sheets';

type World = { startedFrom?: string | null; switchOn?: boolean; sessionNumber?: number; asTheLead?: boolean; scenario?: GroundScenario; stored?: { id: string; content: string } | null };

function aWorld(w: World = {}) {
  const sessionNumber = w.sessionNumber ?? 2;
  const me = w.asTheLead ? LEAD : PERSON;
  const ground = {
    id: 'g1', organizationId: 'org1', scenario: w.scenario ?? GroundScenario.NEW_PROJECT, moment: null, label: 'The literacy programme',
    mode: 'SHARED', timelineDays: 30, brief: null, startsAt: null, endsAt: null, status: 'ACTIVE', leadRemit: null, cadence: null, resolutionState: null,
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
    conversationTurn: { count: jest.fn(async () => 1), findMany: jest.fn(async () => []), create: jest.fn(async (a: any) => ({ id: 't1', content: a.data.content })) },
  };
  const prisma: any = new Proxy(seed, {
    get: (target: any, model: string) => new Proxy(target[model] ?? {}, {
      get: (m: any, method: string) => m[method] ?? (async () => (String(method).endsWith('Many') || method === 'groupBy' ? [] : null)),
    }),
  });
  const getActive = jest.fn(async (k: string) => { if (k === ANCHOR_PARTICIPANT_PROMPT_KEY && w.stored) return w.stored; throw new Error('none'); });
  const promptStore: any = { getActiveContent: jest.fn(async (k: string) => (k === 'system' ? 'SYS' : null)), getActive };
  const nothing: any = { get: () => undefined };
  const seen: string[] = [];
  const respond = jest.fn(async (system: string) => { seen.push(system); return 'Thank you. What is taking most of your attention now?'; });
  const service = new ConversationService(prisma, promptStore, { respond } as any, new ConversationContextService(prisma), nothing, nothing, nothing, nothing, nothing, nothing);
  /* A real turn of the person's check-in, through sendMessage; what is read is the prompt the model was handed. */
  const compose = async () => { await service.sendMessage('ci2', 'user-1', 'It is moving slowly.'); return seen[0] ?? ''; };
  return { service, checkIn, compose, seen, version: () => (service as any).anchorVersionForThisTurn.get('ci2') };
}

describe('anchor piece 15: the weekly check-in, as the model reads it', () => {
  it('with the switch on, for somebody on an anchor lead\'s team in their second session, carries the scenario\'s words', async () => {
    const prompt = await aWorld({ startedFrom: 'anchor', switchOn: true }).compose();
    for (const said of ['What moved since we last spoke?', 'You were going to speak to James. What happened?', "You mentioned the client wasn't clear about the next phase. Has that changed?", "What's taking most of your attention now?", "That connects the delay in delivery to the customer's renewal."]) {
      expect(prompt).toContain(said);
    }
    expect(prompt).toContain('This person was invited by their lead');
    expect(prompt).toContain('Never say what their work was good, great, smart or useful');
  });

  it('brings back what they said last time and what they said they would do, in their own words, and how long ago', async () => {
    const prompt = await aWorld({ startedFrom: 'anchor', switchOn: true }).compose();
    expect(prompt).toContain('# What this person has told you before');
    expect(prompt).toContain('Last time they finished a check-in was last week.');
    expect(prompt).toContain(`- ${THEIR_WORDS}`);
    expect(prompt).toContain(`- ${THEIR_PROMISE} (this week)`);
  });

  it('names only the aims this person has been told, never a colleague\'s number', async () => {
    const prompt = await aWorld({ startedFrom: 'anchor', switchOn: true }).compose();
    expect(prompt).toContain('- District reports reach the donor on time');
    expect(prompt).not.toContain('Ngozi owns the Kano target');
  });

  it('ends on the short reminder, read last', async () => {
    const prompt = await aWorld({ startedFrom: 'anchor', switchOn: true }).compose();
    expect(prompt.endsWith(THE_WEEKLY_REMINDER)).toBe(true);
    expect(prompt).not.toContain(READ_THIS_LAST);
  });

  it('runs the words stored in the database, says which version ran, and a stored version without a reminder has none', async () => {
    const w = aWorld({ startedFrom: 'anchor', switchOn: true, stored: { id: 'pv-31', content: 'STORED WEEKLY WORDS' } });
    const prompt = await w.compose();
    expect(prompt).toContain('STORED WEEKLY WORDS');
    expect(prompt).not.toContain('What moved since we last spoke?');
    expect(prompt).not.toContain(THE_WEEKLY_REMINDER);
    expect(w.version()).toBe('pv-31');
  });

  it('is seeded under its own key, with the reminder after the marker', () => {
    expect(SEED_PROMPTS.find((s) => s.key === ANCHOR_PARTICIPANT_PROMPT_KEY)?.content).toBe(ANCHOR_PARTICIPANT_PROMPT);
    expect(ANCHOR_PARTICIPANT_PROMPT).toContain(`${READ_THIS_LAST}\n\n${THE_WEEKLY_REMINDER}`);
  });

  it('says nothing about a wider aim when none has been told to this person', () => {
    const block = whatTheyToldYouBefore({ lastSession: null, theySaidTheyWould: [], whatTheGroupIsTryingToChange: [] }, new Date());
    expect(block).toContain('do not connect their work to a wider aim');
  });

  it('is guidance and not a script', () => {
    expect(THE_WEEKLY_CHECK_IN_GUIDANCE).toContain('These are examples of what you might ask, not a list to work through');
    expect(THE_WEEKLY_CHECK_IN_GUIDANCE).toContain('one question at a time');
    expect(THE_WEEKLY_CHECK_IN_GUIDANCE).toContain('Never invent a fact, a name, a number or a reason.');
  });
});

describe('anchor piece 15: the opening of the weekly check-in', () => {
  it('is written from the same words, with the reminder read after the instruction to write one message', async () => {
    const w = aWorld({ startedFrom: 'anchor', switchOn: true });
    (w.service as any).prisma.conversationTurn.findFirst = jest.fn(async () => null);
    (w.service as any).prisma.checkIn.findUnique = jest.fn(async () => ({ ...w.checkIn, status: CheckInStatus.NOT_STARTED }));
    (w.service as any).billing = { canStartSession: jest.fn(async () => ({ allowed: true, sessionsBalance: 5 })) };
    await w.service.open('ci2', 'user-1').catch(() => undefined);
    const opener = w.seen[0] ?? '';
    expect(opener).toContain('What moved since we last spoke?');
    expect(opener).toContain(`- ${THEIR_WORDS}`);
    expect(opener.endsWith(THE_WEEKLY_REMINDER)).toBe(true);
    expect(opener.indexOf('<<')).toBe(-1);
  });
});

describe('anchor piece 15: who it is for, and who it is not for', () => {
  it.each([
    ['the switch is off', { startedFrom: 'anchor', switchOn: false }],
    ['the check-in did not begin at the anchor link', { startedFrom: null, switchOn: true }],
    ['it is the lead', { startedFrom: 'anchor', switchOn: true, asTheLead: true }],
    ['it is their first session, which is the team baseline', { startedFrom: 'anchor', switchOn: true, sessionNumber: 1 }],
  ] as [string, World][])('is not sent when %s', async (_n, w) => {
    const world = aWorld(w);
    const prompt = await world.compose();
    expect(prompt).not.toContain('This person was invited by their lead');
    expect(prompt).not.toContain('# What this person has told you before');
    expect(world.version()).toBeNull();
  });

  it('the gate is one function: the answer is the same without the service', async () => {
    const on = async () => true;
    expect(await theAnchorParticipantGuidance(on, undefined, { ground: { startedFrom: 'anchor' }, isTheLead: false, sessionNumber: 2 })).toMatchObject({ text: THE_WEEKLY_CHECK_IN_GUIDANCE, promptVersionId: null });
    expect(await theAnchorParticipantGuidance(async () => false, undefined, { ground: { startedFrom: 'anchor' }, isTheLead: false, sessionNumber: 2 })).toBeNull();
  });
});

describe('with the anchor in play or not, every other prompt is byte for byte what it was', () => {
  const every = Object.values(GroundScenario);
  it.each(every.map((s) => [s, s]))('the second-session prompt for %s is the same with the switch off or on, when the check-in is not an anchor one', async (_n, scenario) => {
    const off = await aWorld({ scenario, switchOn: false }).compose();
    const on = await aWorld({ scenario, switchOn: true }).compose();
    expect(on).toBe(off);
    expect(off).not.toContain('This person was invited by their lead');
  });

  it('an anchor check-in with the switch off reads exactly what a check-in that is not an anchor one reads', async () => {
    const plain = await aWorld({ switchOn: false }).compose();
    const anchorOff = await aWorld({ startedFrom: 'anchor', switchOn: false }).compose();
    expect(anchorOff).toBe(plain);
  });
});
