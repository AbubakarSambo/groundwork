import { ConversationService } from '../conversation/conversation.service';
import type { AnIntervention } from '../patterns/the-next-step-for-each-pattern';

/**
 * THE NOTICING, AND THE CALL THAT WAS MISSING. (G42)
 *
 * An hour after committing a note about methods that are computed and wired to
 * nothing, recordCoachingStep() was a public method nothing invoked. So this file
 * asserts two separate things, because they fail separately: what the coach offers,
 * and that complete() actually calls it.
 *
 * 2 November 2026 (F2, Hafsah's decisions): the coach no longer reads the transcript
 * with its own model call against the role map, and no longer keeps its own count of
 * what it has seen. Coaching and interventions have one owner, layer 3 on the
 * check-in's assessment; the coach delivers its small step into CoachingState. The
 * tests that asserted the old read (an index from the model, its reason, its
 * recurrence count, the inversion word check) asserted the second judge that was
 * removed, so they now assert the one owner: the assessment's step is offered, none
 * is offered when it has none, the last step's outcome is the assessment's
 * follow-up, no model is called, and the leave rules are unchanged.
 */

const QUESTION = 'Which of the things you said you would do since last time is still open, and what day will you finish it?';
const aStep = (o: Partial<AnIntervention> = {}): AnIntervention => ({
  key: 'slipping-promises', participantId: 'p1', ladder: 'work', rung: 0, step: 'a coaching question', forWhom: 'the person', theLeadDecides: false,
  says: QUESTION, because: 'Promises were not kept when they came due.', state: 'open',
  startedIn: { checkInId: 'ci1', sessionNumber: 4 }, followedUp: [], ...o,
});

function makeService({
  enabled = true,
  joinedAt = null,
  leftAt = null,
  leavePeriods = null,
  interventions = [aStep()] as AnIntervention[],
  prior = null as any,
}: any = {}) {
  const upserts: any[] = [];
  const prisma: any = {
    checkIn: {
      findUnique: jest.fn(async (a: any) => (a?.select?.sessionReport
        ? { sessionReport: { kind: 'assessment', version: 1, interventions } }
        : { groundId: 'g1', isSetup: false })),
    },
    ground: { findUnique: jest.fn(async () => ({ organizationId: 'org' })) },
    organization: { findUnique: jest.fn(async () => ({ personJudgementsOn: true })) },
    groundParticipant: { findUnique: jest.fn(async () => ({ joinedAt, leftAt, leavePeriods, userId: null, ground: { organizationId: 'org' } })) },
    coachingState: {
      findUnique: jest.fn(async () => prior),
      upsert: jest.fn(async (a: any) => { upserts.push(a); return a.create; }),
    },
  };
  const anthropic: any = { extract: jest.fn(async () => null), respond: jest.fn(async () => null) };
  const config: any = { get: jest.fn(() => enabled) };
  const service = new ConversationService(
    prisma, {} as any, anthropic, {} as any,
    { emit: () => Promise.resolve() } as any, {} as any, {} as any, {} as any, {} as any,
    config,
  );
  return { service, prisma, anthropic, upserts };
}

const observe = (s: any) => (s as any).observeForCoaching('ci1', 'p1', 4);
const OUTSTANDING = { currentStep: 'a step', stepGivenAt: 3, staircase: null, staircasePosition: 0, history: [{ step: 'a step', givenAtSession: 3, outcome: null }] };

describe('what the coach offers', () => {
  it('the assessment\'s small step for the person, as the one step, with no model call of its own', async () => {
    const { service, anthropic, upserts } = makeService();
    await observe(service);
    expect(upserts[0].create.currentStep).toBe(QUESTION);
    expect(upserts[0].create.stepGivenAt).toBe(4);
    expect(anthropic.extract).not.toHaveBeenCalled();
    expect(anthropic.respond).not.toHaveBeenCalled();
  });

  it('offers nothing when the assessment has no step for them, which is the normal answer', async () => {
    const { service, upserts } = makeService({ interventions: [] });
    await observe(service);
    expect(upserts[0].create.currentStep).toBeNull();
  });

  it('never offers a step the lead decides', async () => {
    const { service, upserts } = makeService({ interventions: [aStep({ step: 'a conversation', forWhom: 'the lead', theLeadDecides: true, state: 'waiting for the lead', says: 'Talk with them about it.' })] });
    await observe(service);
    expect(upserts[0].create.currentStep).toBeNull();
  });

  it('takes the outcome of the last step from the assessment\'s follow-up: not seen again is done', async () => {
    const { service, upserts } = makeService({ prior: OUTSTANDING, interventions: [aStep({ state: 'worked', startedIn: { checkInId: 'ci0', sessionNumber: 3 }, followedUp: [{ checkInId: 'ci1', sessionNumber: 4, worked: true }] })] });
    await observe(service);
    expect(upserts[0].update.history[0].outcome).toBe('done');
    expect(upserts[0].update.staircasePosition).toBe(1);
  });

  it('and seen again is not done', async () => {
    const { service, upserts } = makeService({ prior: OUTSTANDING, interventions: [aStep({ step: 'a clear expectation', rung: 1, startedIn: { checkInId: 'ci0', sessionNumber: 3 }, followedUp: [{ checkInId: 'ci1', sessionNumber: 4, worked: false }] })] });
    await observe(service);
    expect(upserts[0].update.history[0].outcome).toBe('not done');
  });

  it('and leaves it unsaid when no step of theirs was followed up in this check-in', async () => {
    const { service, upserts } = makeService({ prior: OUTSTANDING, interventions: [] });
    await observe(service);
    expect(upserts[0].update.history[0].outcome).toBeNull();
  });

  it('never coaches somebody who is on leave', async () => {
    /* participation-timeline.ts: never the tone-deaf step to somebody on parental leave. */
    const { service, upserts } = makeService({ leavePeriods: [{ from: new Date(Date.now() - 86400000).toISOString(), to: null }] });
    await observe(service);
    expect(upserts).toHaveLength(0);
  });

  it('and never coaches somebody who has left', async () => {
    const { service, upserts } = makeService({ leftAt: new Date(Date.now() - 86400000) });
    await observe(service);
    expect(upserts).toHaveLength(0);
  });

  it('coaches somebody whose leave has ended', async () => {
    const { service, upserts } = makeService({
      leavePeriods: [{ from: new Date(Date.now() - 2 * 86400000).toISOString(), to: new Date(Date.now() - 86400000).toISOString() }],
    });
    await observe(service);
    expect(upserts[0].create.currentStep).toBe(QUESTION);
  });

  it('survives a malformed leave record rather than refusing to coach anybody', async () => {
    const { service, upserts } = makeService({ leavePeriods: [{ from: 'not a date' }, 'nonsense'] });
    await observe(service);
    expect(upserts[0].create.currentStep).toBe(QUESTION);
  });
});

describe('and complete() calls it, which is the part that was missing', () => {
  function completable() {
    const checkIn = {
      id: 'ci1', groundId: 'g1', sessionNumber: 2, status: 'IN_PROGRESS',
      isSelfCorrection: true, participantId: 'p1',
      participant: { userId: 'user1', email: 'p@example.test' },
    };
    const prisma: any = {
      /* The round-closing call runs inside these flows now; see grounds/round-completion.ts. */
      roundCompletion: { create: jest.fn(async (a: any) => a.data) },
      groundParticipant: { findMany: jest.fn(async () => [{ id: 'p1' }]) },
      checkIn: {
        count: jest.fn(async () => 1),
        findUnique: jest.fn(async () => checkIn),
        update: jest.fn(async () => ({ status: 'COMPLETED', groundId: 'g1' })),
        /* The completion write is a guarded updateMany now; one row, this one, wins. */
        updateMany: jest.fn(async () => ({ count: 1 })),
      },
      ground: {
        findUnique: jest.fn(async () => ({ status: 'ACTIVE', organizationId: 'org1', isFreeGround: false })),
        updateMany: jest.fn(async () => ({ count: 1 })),
      },
      conversationTurn: {
        findFirst: jest.fn(async () => null),
        findMany: jest.fn(async () => [
          { role: 'PERSON', content: 'I closed two of the three tickets on Tuesday and handed the third to Ade.' },
        ]),
        create: jest.fn(async ({ data }: any) => ({ content: data.content })),
      },
    };
    const service = new ConversationService(
      prisma, {} as any, { respond: jest.fn(async () => 'x') } as any, {} as any,
      { emit: jest.fn() } as any, {} as any, { canStartSession: jest.fn() } as any, {} as any,
      { emit: jest.fn(() => Promise.resolve()) } as any, { get: jest.fn(() => true) } as any,
    );
    /* (1 November 2026: the coach now also waits for the conversation's assessment, stubbed here like the other readers.) */
    for (const m of ['theEndCardAtTheEnd', 'buildSoloArtifact', 'ensureNextSession', 'extractDependencies', 'extractWorkMentions', 'assessAndThenRead', 'reviseDetectedFunction']) {
      jest.spyOn(service as any, m).mockResolvedValue(undefined);
    }
    const spy = jest.spyOn(service as any, 'observeForCoaching').mockResolvedValue(undefined);
    return { service, spy };
  }

  it('with the participant and the session it just finished', async () => {
    // THE ASSERTION THAT WAS ABSENT. Everything else about coaching passed while
    // no session on earth would have produced a row.
    const { service, spy } = completable();
    await service.complete('ci1', 'user1');
    expect(spy).toHaveBeenCalledWith('ci1', 'p1', 2);
  });

  it('and a failure in it never stops the session completing', async () => {
    const { service, spy } = completable();
    spy.mockRejectedValue(new Error('the model was unreachable'));
    await expect(service.complete('ci1', 'user1')).resolves.toBeTruthy();
  });
});
