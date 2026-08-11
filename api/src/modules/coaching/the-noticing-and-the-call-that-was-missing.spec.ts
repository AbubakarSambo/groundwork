import { RoleFunction } from '../board/role-maps';
import { ConversationService } from '../conversation/conversation.service';

/**
 * THE NOTICING, AND THE CALL THAT WAS MISSING. (G42)
 *
 * An hour after committing a note about methods that are computed and wired to
 * nothing, recordCoachingStep() was a public method nothing invoked. The state
 * machine was right, the flag was right, the prompt block was right, and no
 * session would ever have produced a row.
 *
 * So this file asserts two separate things, because they fail separately:
 *
 *   the noticing behaves - a low-confidence function, a "none" answer, or an
 *   index with no reason all produce nothing rather than a step
 *
 *   complete() actually calls it - the part that was missing, and the part no
 *   module test can show
 */

const MANAGEMENT_STEP = /Hands over real ownership/;

function makeService({
  enabled = true,
  confidence = 0.9,
  fn = RoleFunction.MANAGEMENT,
  observed = { index: 0, reason: 'three of the four things named were things the team was meant to own', lastStepOutcome: null as any },
  personSays = 'I ran the Meridian handover myself again on Tuesday, and closed two of the three tickets.',
  joinedAt = null,
  leftAt = null,
  leavePeriods = null,
}: any = {}) {
  const upserts: any[] = [];
  const prisma: any = {
    groundParticipant: { findUnique: jest.fn(async () => ({ detectedFunction: fn, detectedFunctionConfidence: confidence, joinedAt, leftAt, leavePeriods })) },
    conversationTurn: {
      findMany: jest.fn(async () => [
        { role: 'AI', content: 'What did you spend the week on?' },
        { role: 'PERSON', content: personSays },
      ]),
    },
    coachingState: {
      findUnique: jest.fn(async () => null),
      upsert: jest.fn(async (a: any) => { upserts.push(a); return a.create; }),
    },
  };
  const anthropic: any = { extract: jest.fn(async () => observed) };
  const config: any = { get: jest.fn(() => enabled) };
  const service = new ConversationService(
    prisma, {} as any, anthropic, {} as any,
    { emit: () => Promise.resolve() } as any, {} as any, {} as any, {} as any, {} as any,
    config,
  );
  return { service, prisma, anthropic, upserts };
}

const observe = (s: any) => (s as any).observeForCoaching('ci1', 'p1', 4);

describe('what the session showed', () => {
  it('turns an observed behaviour into one step, from that person\'s own map', async () => {
    const { service, upserts } = makeService();
    await observe(service);
    expect(upserts[0].create.currentStep).toMatch(MANAGEMENT_STEP);
    expect(upserts[0].create.stepGivenAt).toBe(4);
  });

  it('never runs on a guess about what somebody\'s job is', async () => {
    // A step chosen from a low-confidence function reads as a stranger's advice.
    // The same threshold already governs the role probes.
    const { service, anthropic, upserts } = makeService({ confidence: 0.2 });
    await observe(service);
    expect(anthropic.extract).not.toHaveBeenCalled();
    expect(upserts).toHaveLength(0);
  });

  it('offers nothing when the read says none, which is the normal answer', async () => {
    const { service, upserts } = makeService({ observed: { index: null, reason: null, lastStepOutcome: null } });
    await observe(service);
    expect(upserts[0].create.currentStep).toBeNull();
  });

  it('offers nothing on an index with no reason', async () => {
    // THE GUARD THAT MATTERS MOST. A model that returns a behaviour and no reason
    // must produce nothing, not a step with a blank explanation - which is a
    // verdict with homework attached.
    const { service, upserts } = makeService({ observed: { index: 0, reason: '   ', lastStepOutcome: null } });
    await observe(service);
    expect(upserts[0].create.currentStep).toBeNull();
  });

  it('offers nothing on an index that is not in the list', async () => {
    const { service, upserts } = makeService({ observed: { index: 99, reason: 'a real reason', lastStepOutcome: null } });
    await observe(service);
    expect(upserts[0].create.currentStep).toBeNull();
  });

  it('offers nothing to somebody who had a quiet week', async () => {
    // Even where a behaviour was observed. Nothing checkable in the session means
    // nothing to coach from, and homework for a quiet week is the worst version
    // of this feature.
    const { service, upserts } = makeService({ personSays: 'Not much really, same as before.' });
    await observe(service);
    expect(upserts[0].create.currentStep).toBeNull();
  });

  it('takes the outcome of the last step only from what the transcript says', async () => {
    const { service, prisma, upserts } = makeService({
      observed: { index: null, reason: null, lastStepOutcome: 'done' },
    });
    prisma.coachingState.findUnique = jest.fn(async () => ({
      currentStep: 'Hands over real ownership, not just tasks, and then lets go',
      stepGivenAt: 3, staircase: null, staircasePosition: 0,
      history: [{ step: 'Hands over real ownership, not just tasks, and then lets go', givenAtSession: 3, outcome: null }],
    }));
    await observe(service);
    expect(upserts[0].update.history[0].outcome).toBe('done');
    expect(upserts[0].update.staircasePosition).toBe(1);
  });

  it('and ignores an outcome the model made up', async () => {
    // Anything outside the four real outcomes is dropped rather than coerced,
    // because a coerced outcome puts a fact in the record nobody said.
    const { service, prisma, upserts } = makeService({
      observed: { index: null, reason: null, lastStepOutcome: 'partially done, good effort' },
    });
    prisma.coachingState.findUnique = jest.fn(async () => ({
      currentStep: 'a step', stepGivenAt: 3, staircase: null, staircasePosition: 0,
      history: [{ step: 'a step', givenAtSession: 3, outcome: null }],
    }));
    await observe(service);
    expect(upserts[0].update.history[0].outcome).toBeNull();
  });

  it('never coaches somebody who is on leave', async () => {
    /**
     * FOUND BY THE UNWIRED-MODULE RULE, IN CODE I HAD JUST WRITTEN.
     * participation-timeline.ts has said this since it was written and nothing
     * had ever called it, so the coaching path would have offered a step to
     * somebody on parental leave. Its own comment names it: the tone-deaf thing
     * that ends trust in a product permanently.
     */
    const { service, anthropic, upserts } = makeService({
      leavePeriods: [{ from: new Date(Date.now() - 86400000).toISOString(), to: null }],
    });
    await observe(service);
    expect(anthropic.extract).not.toHaveBeenCalled();
    expect(upserts).toHaveLength(0);
  });

  it('and never coaches somebody who has left', async () => {
    // A coaching prompt firing at somebody who is gone is both absurd and a leak.
    const { service, upserts } = makeService({ leftAt: new Date(Date.now() - 86400000) });
    await observe(service);
    expect(upserts).toHaveLength(0);
  });

  it('coaches somebody whose leave has ended', async () => {
    // The guard must not be a one-way door.
    const { service, upserts } = makeService({
      leavePeriods: [{ from: new Date(Date.now() - 2 * 86400000).toISOString(), to: new Date(Date.now() - 86400000).toISOString() }],
    });
    await observe(service);
    expect(upserts[0].create.currentStep).toMatch(MANAGEMENT_STEP);
  });

  it('survives a malformed leave record rather than refusing to coach anybody', async () => {
    // Json columns hold whatever was written into them, and a bad row must not
    // silently switch coaching off for a whole ground.
    const { service, upserts } = makeService({ leavePeriods: [{ from: 'not a date' }, 'nonsense'] });
    await observe(service);
    expect(upserts[0].create.currentStep).toMatch(MANAGEMENT_STEP);
  });

  it('reads the outcome from their own words when the model says nothing', async () => {
    /**
     * coaching-step.ts was written for exactly this and had never been called by
     * anything. A regex over what somebody actually typed is better evidence than
     * a model asked to classify it, so it is the fallback rather than the other
     * way round - and its spelling ("not_done") is mapped to the machine's at the
     * one point they meet.
     */
    const { service, prisma, upserts } = makeService({
      observed: { index: null, reason: null, lastStepOutcome: null },
      personSays: "I didn't get round to it, ran out of time, but I closed two of the three tickets.",
    });
    prisma.coachingState.findUnique = jest.fn(async () => ({
      currentStep: 'a step', stepGivenAt: 3, staircase: null, staircasePosition: 0,
      history: [{ step: 'a step', givenAtSession: 3, outcome: null }],
    }));
    await observe(service);
    expect(upserts[0].update.history[0].outcome).toBe('not done');
  });

  it('and leaves it unsaid when their words are unclear', async () => {
    // 'unclear' becomes null rather than a guess.
    const { service, prisma, upserts } = makeService({
      observed: { index: null, reason: null, lastStepOutcome: null },
      personSays: 'The Meridian numbers came in at four hundred and twelve on Tuesday.',
    });
    prisma.coachingState.findUnique = jest.fn(async () => ({
      currentStep: 'a step', stepGivenAt: 3, staircase: null, staircasePosition: 0,
      history: [{ step: 'a step', givenAtSession: 3, outcome: null }],
    }));
    await observe(service);
    expect(upserts[0].update.history[0].outcome).toBeNull();
  });

  it('does nothing at all with the flag off', async () => {
    const { service, prisma, anthropic } = makeService({ enabled: false });
    await observe(service);
    expect(prisma.groundParticipant.findUnique).not.toHaveBeenCalled();
    expect(anthropic.extract).not.toHaveBeenCalled();
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
      checkIn: {
        findUnique: jest.fn(async () => checkIn),
        update: jest.fn(async () => ({ status: 'COMPLETED', groundId: 'g1' })),
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
    for (const m of ['extractRecordEntries', 'buildSoloArtifact', 'ensureNextSession', 'extractDependencies', 'extractWorkMentions', 'reviseDetectedFunction']) {
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
