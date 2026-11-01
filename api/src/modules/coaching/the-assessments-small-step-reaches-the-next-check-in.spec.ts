/**
 * THE ASSESSMENTS' SMALL STEP REACHES THE PERSON'S NEXT CHECK-IN, THROUGH THE COACH (layer 3, 1 November 2026).
 *
 * Hafsah's brief says small steps "happen on their own". A pattern seen across three of a person's assessments gets a coaching
 * question, then a clear expectation. That step is offered by the coach's one writer (observeForCoaching, then recordCoachingStep
 * into CoachingState), only where the coach's own read offers nothing, and behind the same switches as any coaching step. It
 * reaches the next check-in through coachingBlock. The lead's steps (a conversation, a deadline, a plan, firing) are never offered.
 */
import { ConversationService } from '../conversation/conversation.service';
import { RoleFunction } from '../board/role-maps';
import { theSmallStepForThePerson, type AnIntervention } from '../patterns/the-next-step-for-each-pattern';

const QUESTION = 'Which of the things you said you would do since last time is still open, and what day will you finish it?';

const aStep = (o: Partial<AnIntervention> = {}): AnIntervention => ({
  key: 'slipping-promises', participantId: 'p1', ladder: 'work', rung: 0, step: 'a coaching question', forWhom: 'the person', theLeadDecides: false,
  says: QUESTION, because: 'Promises Amani made were not kept, or not mentioned, when they came due. Seen in 3 check-ins: session 1, "I will call Westgate".',
  state: 'open', startedIn: { checkInId: 'ci3', sessionNumber: 3 }, followedUp: [], ...o,
});

function aService(o: { interventions: AnIntervention[]; judgementsOn?: boolean; coachingLive?: boolean }) {
  let row: any = null;
  const prisma: any = {
    checkIn: {
      findUnique: jest.fn(async (a: any) => {
        if (a?.select?.sessionReport) return { sessionReport: { kind: 'assessment', version: 1, interventions: o.interventions } };
        if (a?.select?.isSetup) return { isSetup: false };
        if (a?.select?.groundId) return { groundId: 'g1' };
        return { completedAt: new Date('2026-11-03T09:00:00Z'), startedAt: null, createdAt: new Date(), ground: { cadence: 'WEEKLY' } };
      }),
    },
    ground: { findUnique: jest.fn(async () => ({ organizationId: 'org' })) },
    organization: { findUnique: jest.fn(async () => ({ personJudgementsOn: o.judgementsOn !== false })) },
    groundParticipant: {
      findUnique: jest.fn(async (a: any) => (a?.select?.userId
        ? { userId: null, ground: { organizationId: 'org' } }
        : { detectedFunction: RoleFunction.SALES, detectedFunctionConfidence: 0.9, detectedFunctionConfirmedAt: new Date(), joinedAt: null, leftAt: null, leavePeriods: null })),
    },
    conversationTurn: { findMany: jest.fn(async () => [{ role: 'AI', content: 'How did the week go?' }, { role: 'PERSON', content: 'Busy week, still on it.' }]) },
    patternDetection: { findMany: jest.fn(async () => []) },
    coachingState: {
      findUnique: jest.fn(async () => row),
      upsert: jest.fn(async (a: any) => { row = { ...a.create, ...(row ? a.update : {}) }; return row; }),
    },
    platformSetting: { findUnique: jest.fn(async () => (o.coachingLive === false ? { value: false } : null)) },
  };
  /* The coach's own read notices nothing this time. */
  const anthropic: any = { extract: jest.fn(async () => null) };
  const service = new ConversationService(
    prisma, {} as any, anthropic, {} as any,
    { emit: () => Promise.resolve() } as any, {} as any, {} as any, {} as any, {} as any,
    { get: jest.fn(() => true) } as any,
  );
  return { service, prisma, row: () => row };
}

describe('the assessments\' small step', () => {
  it('is the coach\'s one step when the coach\'s own read offers nothing, and reaches the next check-in', async () => {
    const w = aService({ interventions: [aStep()] });
    await (w.service as any).observeForCoaching('ci3', 'p1', 3);
    expect(w.prisma.coachingState.upsert).toHaveBeenCalledTimes(1);
    expect(w.row()).toMatchObject({ currentStep: QUESTION, stepGivenAt: 3 });
    const block = await (w.service as any).coachingBlock('p1', 4);
    expect(block).toContain(QUESTION);
  });

  it('stays behind the same switches: person judgements off writes nothing, coaching paused says nothing', async () => {
    const off = aService({ interventions: [aStep()], judgementsOn: false });
    await (off.service as any).observeForCoaching('ci3', 'p1', 3);
    expect(off.prisma.coachingState.upsert).not.toHaveBeenCalled();
    const paused = aService({ interventions: [aStep()], coachingLive: false });
    await (paused.service as any).observeForCoaching('ci3', 'p1', 3);
    expect(paused.row()?.currentStep).toBe(QUESTION);
    expect(await (paused.service as any).coachingBlock('p1', 4)).toBe('');
  });

  it('is never a step the lead decides, and never a step from another check-in', async () => {
    const lead = aService({ interventions: [aStep({ step: 'a conversation', forWhom: 'the lead', theLeadDecides: true, state: 'waiting for the lead', says: 'Talk with them about it.' })] });
    await (lead.service as any).observeForCoaching('ci3', 'p1', 3);
    expect(lead.row()?.currentStep ?? null).toBeNull();
    expect(theSmallStepForThePerson([aStep({ startedIn: { checkInId: 'ci2', sessionNumber: 2 } })], 'ci3')).toBeNull();
    /* A step moved on in this check-in is this check-in's. */
    expect(theSmallStepForThePerson([aStep({ step: 'a clear expectation', startedIn: { checkInId: 'ci2', sessionNumber: 2 }, followedUp: [{ checkInId: 'ci3', sessionNumber: 3, worked: false }] })], 'ci3')?.step).toBe('a clear expectation');
  });

  it('the coach runs after the conversation\'s assessment, not beside it', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'conversation', 'conversation.service.ts'), 'utf8');
    expect(src).toMatch(/Promise\.allSettled\(\[theReadsTheCoachWaitsFor, assessed\]\)\s*\.then\(\(\) => this\.observeForCoaching\(/);
  });
});

describe('the channel the turns came by', () => {
  it('is WhatsApp when a turn arrived there, the app when they all came through it, and not known after a restart', async () => {
    const seen: any[] = [];
    const svc: any = Object.create(ConversationService.prototype);
    Object.assign(svc, { prisma: {}, anthropic: {}, prompts: null, events: { emit: () => undefined }, logger: { log: () => undefined, warn: () => undefined } });
    const assess = jest.spyOn(require('../conversation/assess-the-conversation'), 'assessTheConversation').mockImplementation(async (_d: any, _id: any, how: any) => { seen.push(how.channel); return null; });
    for (const m of ['extractDependencies', 'settleWhatTheySaidTheyWouldDo', 'writeWhatTheyPromised']) svc[m] = async () => 0;
    svc._doorsOfCheckIns = new Map([['a', new Set(['web', 'whatsapp'])], ['b', new Set(['web'])]]);
    for (const id of ['a', 'b', 'c']) await svc.assessAndThenRead({ id, participantId: 'p', groundId: 'g', sessionNumber: 1 }, { howItEnded: 'finished by the person', closedAt: new Date() });
    expect(seen).toEqual(['WhatsApp', 'the app', 'not known']);
    expect(svc._doorsOfCheckIns.size).toBe(0);
    assess.mockRestore();
  });
});
