import { theBehavioursAnybodyCanBeRead } from '../board/a-role-nobody-mapped-is-still-a-person';
import { roleMapFor, RoleFunction } from '../board/role-maps';
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
  /* Recurrence: a step is offered only when the same thing was seen in two distinct sessions. The
     default harness has seen it once before, in session 3, so session 4 is the second time. */
  priorObservations = [{ sessionNumber: 3, noticed: roleMapFor(RoleFunction.MANAGEMENT)?.failureSignals?.[0] ?? '', reason: 'seen before' }],
}: any = {}) {
  const upserts: any[] = [];
  const prisma: any = {
    groundParticipant: { findMany: jest.fn(async () => [{ id: 'p1' }]), findUnique: jest.fn(async () => ({ detectedFunction: fn, detectedFunctionConfidence: confidence, joinedAt, leftAt, leavePeriods })) },
    conversationTurn: {
      findMany: jest.fn(async () => [
        { role: 'AI', content: 'What did you spend the week on?' },
        { role: 'PERSON', content: personSays },
      ]),
    },
    coachingState: {
      findUnique: jest.fn(async () => (priorObservations ? { observations: priorObservations } : null)),
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
  it('waits when this is the first session the behaviour was seen in: one instance is not a pattern', async () => {
    const { service, upserts } = makeService({ priorObservations: null });
    await observe(service);
    expect(upserts[0].create.currentStep).toBeNull();
    expect(upserts[0].create.observations).toHaveLength(1);
    expect(upserts[0].create.lastInput.observed.recurring).toBe(false);
  });

  it('never offers the thing the person asked for themselves, by their own words', async () => {
    const step = roleMapFor(RoleFunction.MANAGEMENT)!.successSignals![0];
    const { service, upserts } = makeService({ personSays: `What I want is exactly this: ${step}. I have asked for it twice.` });
    await observe(service);
    expect(upserts[0].create.currentStep).toBeNull();
    expect(upserts[0].create.lastInput.observed.inverted).toBe(true);
  });

  it('the model saying they asked for it does not suppress on its own; it is kept for reading', async () => {
    const { service, upserts } = makeService({ observed: { index: 0, reason: 'they said it', theyAskedForThisThemselves: true, lastStepOutcome: null } });
    await observe(service);
    expect(upserts[0].create.currentStep).toMatch(MANAGEMENT_STEP);
    expect(upserts[0].create.lastInput.observed.modelSaidTheyAsked).toBe(true);
  });

  it('turns an observed behaviour into one step, from that person\'s own map', async () => {
    const { service, upserts } = makeService();
    await observe(service);
    expect(upserts[0].create.currentStep).toMatch(MANAGEMENT_STEP);
    expect(upserts[0].create.stepGivenAt).toBe(4);
  });

  it('never runs on a guess about what somebody\'s job is', async () => {
    /*
     * THE RULE IS UNCHANGED AND THE ASSERTION IS NOT. "A step chosen from a low-confidence function
     * reads as a stranger's advice" - so no step may come from a guessed job, and that still holds
     * exactly. What changed is that failing to read the job no longer means reading nothing at all:
     * 477 people are on record and 32 clear this threshold, so the old early return meant 93% could
     * never be coached about anything, not because nothing was noticed but because nothing was ever
     * looked at.
     *
     * The old assertion was that the model is not called. That is the implementation, not the rule.
     * The rule is that the behaviours it reads against are not this person's guessed function - so
     * that is what is asserted now, along with the row recording which floor the step came off, so
     * a weaker read can never be mistaken later for a role-mapped one.
     */
    const { service, anthropic, upserts } = makeService({ confidence: 0.2 });
    await observe(service);

    /* The behaviours are handed over as the user content, not the system prompt - that is where
       the list lives, and it is the list that must not be this person's guessed function. */
    const handed = (anthropic.extract as jest.Mock).mock.calls[0]?.[1]?.[0]?.content ?? '';
    const map = roleMapFor(RoleFunction.MANAGEMENT)!;
    for (const signal of map.failureSignals ?? []) expect(handed).not.toContain(signal);
    /* The floor instead: read off the ACCOUNT, never off the work, because the work is the part
       that cannot be read without knowing the job. */
    /* Asserted through the module rather than by quoting the line, which was rewritten out of
       Yoda once already and will be again. What matters is that the floor's own list is what was
       handed over. */
    for (const line of theBehavioursAnybodyCanBeRead()) expect(handed).toContain(line);

    expect(upserts).toHaveLength(1);
    expect(upserts[0].create.lastInput.why).toMatch(/below 0.5|no role map/);
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

  /*
   * THIS ASSERTED THAT THE FLAG TURNED IT OFF. The flag is gone - it was off in every environment
   * for long enough that the coach had never run for anybody, which is a decision nobody was
   * making rather than caution.
   *
   * What is worth proving now is the thing the flag was standing in for: the coach reads the
   * session before it says anything, so it can be silent when there is nothing to say.
   */
  it('reads the session before it decides anything', async () => {
    const { service, prisma, anthropic } = makeService({ enabled: true });
    await observe(service);
    expect(prisma.groundParticipant.findUnique).toHaveBeenCalled();
    expect(anthropic.extract).toHaveBeenCalled();
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
    for (const m of ['extractRecordEntries', 'buildSoloArtifact', 'ensureNextSession', 'extractDependencies', 'extractWorkMentions', 'assessAndThenRead', 'reviseDetectedFunction']) {
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
