import { ConversationService } from './conversation.service';

/**
 * THE NUMBERS THEIR SYSTEMS PUSH HAVE TO SURVIVE INTO THE ASSEMBLED PROMPT.
 *
 * `evidenceBlock` is well covered on its own, and that proves nothing about this: the wiring between
 * it and the interview is one entry in one array, and an entry can be dropped by a refactor with
 * every unit test still green. This asks the real composer for a real prompt and looks for the
 * number in it.
 *
 * Written after a session where a running API served an eleven-hour-old build and I nearly believed
 * a feature worked because its tests passed.
 */

/*
 * A PRISMA THAT ANSWERS EVERYTHING, so the composer can run without a database.
 *
 * Reads it does not care about return empty rather than throwing. That is the point: this test is
 * about one line surviving to the end, not about any of the other twenty reads on the way there.
 */
const stubPrisma = (personObjectives: any[]) => {
  const ground = {
    id: 'g1', organizationId: 'org1', scenario: 'OKR_ALIGNMENT', moment: 'STARTING',
    label: 'Pipeline check-in', mode: 'SHARED', timelineDays: 90, objectives: [], brief: null,
    startsAt: null, endsAt: null, status: 'ACTIVE', leadRemit: null, cadence: null,
  };
  const answers: Record<string, any> = {
    'ground.findUnique': ground,
    'ground.findFirst': ground,
    'personObjective.findMany': personObjectives,
    /* What their own systems recorded. Empty here; the sales case has its own spec. */
    'interaction.findMany': [],
    'person.findFirst': null,
    'proposedChange.findMany': [],
  };
  return new Proxy({}, {
    get: (_t, model: string) => new Proxy({}, {
      get: (_t2, method: string) => async () => {
        const hit = answers[`${model}.${String(method)}`];
        if (hit !== undefined) return hit;
        return String(method).endsWith('Many') ? [] : null;
      },
    }),
  }) as any;
};

const service = (personObjectives: any[]) => {
  const s = Object.create(ConversationService.prototype) as any;
  /* The model service, as the product always has it: composing the prompt names its fixed rules to it, to be sent once (#408). */
  s.anthropic = { keepTheFixedInstructions: () => {} };
  s.prisma = stubPrisma(personObjectives);
  s.prompts = { getActiveContent: async () => null };
  s.logger = { log: () => {}, warn: () => {}, error: () => {}, debug: () => {} };
  s.config = { get: () => undefined };
  /* The collaborators this method reaches for. Each returns its own version of nothing. */
  s.context = { build: async () => ({ block: '' }) };
  s.documents = { forPrompt: async () => '' };
  s.notes = { pendingFor: async () => [] };
  s.coach = { stepFor: async () => null };
  return s;
};

const checkIn = {
  id: 'c1', groundId: 'g1', participantId: 'p1', sessionNumber: 1,
  participant: { partyType: 'PARTY', roleAsDescribed: 'Sales lead', userId: null },
} as any;

describe('the live numbers reach the assembled prompt', () => {
  const withAFeed = [{
    id: 'o1', externalId: 'OKR-1', text: 'Grow the pipeline to 2m',
    lastSeenState: '{"committed":"1.1m","deals":"7"}',
    lastSeenAt: new Date(Date.now() - 86_400_000),
  }];

  it('carries the figure their system pushed', async () => {
    const prompt = await service(withAFeed).composeSystemPrompt(checkIn);
    expect(prompt).toContain('committed: 1.1m');
    expect(prompt).toContain('Grow the pipeline to 2m');
  });

  it('carries the rule that goes with it, not just the number', async () => {
    /* A number with no instruction is a number the interviewer may ask them to read back to it. */
    const prompt = await service(withAFeed).composeSystemPrompt(checkIn);
    expect(prompt).toContain('Never ask them for a number you already have here');
  });

  it('says how old it is', async () => {
    const prompt = await service(withAFeed).composeSystemPrompt(checkIn);
    expect(prompt).toContain('as of yesterday');
  });

  it('adds nothing at all when no system is pushing anything', async () => {
    const prompt = await service([{ id: 'o1', text: 'Grow the pipeline', lastSeenState: null, lastSeenAt: null }])
      .composeSystemPrompt(checkIn);
    expect(prompt).not.toContain('LIVE EVIDENCE');
  });
});
