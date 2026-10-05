import { GroundScenario, PartyType, CheckInStatus } from '@prisma/client';
import { ConversationService } from './conversation.service';
import { ConversationContextService } from './context.service';
import { ANCHOR_BASELINE_PROMPT, ANCHOR_BASELINE_PROMPT_KEY, THE_BASELINE_GUIDANCE, THE_BASELINE_REMINDER, theAnchorBaselineGuidance } from './the-anchor-baseline';
import { READ_THIS_LAST } from './the-anchor-lead-conversation';

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
