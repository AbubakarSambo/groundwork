import { ConversationService } from './conversation.service';

/**
 * WHAT THEIR OWN SYSTEMS RECORDED HAS TO SURVIVE INTO THE ASSEMBLED PROMPT.
 *
 * The module that renders it is covered on its own, and that proves nothing about this: the wiring
 * between it and the interview is one entry in an array of twenty, and an entry can be dropped by a
 * refactor with every unit test still green. This asks the real composer for a real prompt and
 * looks for the visit in it.
 */
/*
 * THE STUB HONOURS THE WHERE CLAUSE, and it has to.
 *
 * The first version returned a fixed array whatever was asked for, so removing the
 * `personExternalId` filter from the query - which would have put every colleague's activity into
 * one person's check-in - left this spec green. Caught by breaking it on purpose.
 */
const stubPrisma = (interactions: any[], person: any) => {
  const ground = {
    id: 'g1', organizationId: 'org1', scenario: 'OKR_ALIGNMENT', moment: 'STARTING',
    label: 'Sales', mode: 'SHARED', timelineDays: 90, objectives: [], brief: null,
    startsAt: null, endsAt: null, status: 'ACTIVE', leadRemit: null, cadence: null,
  };
  const answers: Record<string, any> = {
    'ground.findUnique': ground,
    'ground.findFirst': ground,
    'personObjective.findMany': [],
    'proposedChange.findMany': [],
    'user.findUnique': { email: 'sam@x.test' },
    'person.findFirst': person,
    'interaction.findMany': interactions,
    'subject.findMany': [{ externalId: 'shop-a', title: 'Mama Ngozi Provisions' }],
  };
  return new Proxy({}, {
    get: (_t, model: string) => new Proxy({}, {
      get: (_t2, method: string) => async (args: any) => {
        if (model === 'interaction' && String(method) === 'findMany') {
          const wanted = args?.where?.personExternalId;
          /* Unscoped reads return nothing here, so a missing filter fails rather than passes. */
          if (!wanted) return [];
          return (answers['interaction.findMany'] as any[]).filter((i) => i.personExternalId === wanted);
        }
        const hit = answers[`${model}.${String(method)}`];
        if (hit !== undefined) return hit;
        return String(method).endsWith('Many') ? [] : null;
      },
    }),
  }) as any;
};

const service = (interactions: any[], person: any = { externalId: 'p-sam' }) => {
  const s = Object.create(ConversationService.prototype) as any;
  /* The model service, as the product always has it: composing the prompt names its fixed rules to it, to be sent once (#408). */
  s.anthropic = { keepTheFixedInstructions: () => {} };
  s.prisma = stubPrisma(interactions, person);
  s.prompts = { getActiveContent: async () => null };
  s.logger = { log: () => {}, warn: () => {}, error: () => {}, debug: () => {} };
  s.config = { get: () => undefined };
  s.context = { build: async () => ({ block: '' }) };
  s.knowledge = { covering: async () => [] };
  return s;
};

const checkIn = {
  id: 'c1', groundId: 'g1', participantId: 'p1', sessionNumber: 2,
  participant: { partyType: 'PARTICIPANT', roleAsDescribed: 'Salesperson', userId: 'u-sam' },
} as any;

const visit = {
  personExternalId: 'p-sam',
  kind: 'VISIT', strength: 'RECORDED', happenedAt: new Date('2026-11-03T10:00:00Z'),
  note: 'Owner not in', counterpartyExternalId: 'shop-a', sourceSystem: 'salesapp', disputedAt: null,
};

describe('their own systems reach the interview', () => {
  it('with the shop named as their system names it', async () => {
    const prompt = await service([visit]).composeSystemPrompt(checkIn);
    expect(prompt).toContain('Mama Ngozi Provisions');
    expect(prompt).toContain('2026-11-03');
  });

  it('and the rule that stops it becoming an audit', async () => {
    const prompt = await service([visit]).composeSystemPrompt(checkIn);
    expect(prompt).toContain('Never ask them something this already answers');
    expect(prompt).toContain('not a list to work through');
  });

  it('and what the record cannot tell anybody', async () => {
    const prompt = await service([visit]).composeSystemPrompt(checkIn);
    expect(prompt).toContain('an unlogged visit and');
  });
});

describe('whose records they are', () => {
  it('never somebody else\'s, even in the same organisation', async () => {
    /*
     * The filter that scopes this to one person is the whole privacy of the feature. Without it a
     * salesperson's check-in would open with their colleagues' visits.
     */
    const theirs = { ...visit, counterpartyExternalId: 'shop-a' };
    const somebodyElse = { ...visit, personExternalId: 'p-ada', note: 'Ada was here' };
    const prompt = await service([theirs, somebodyElse]).composeSystemPrompt(checkIn);
    expect(prompt).toContain('Mama Ngozi Provisions');
    expect(prompt).not.toContain('Ada was here');
  });
});

describe('when nothing is connected', () => {
  it('the prompt says nothing about records at all', async () => {
    /* Most organisations connect nothing, and that check-in must be exactly the one this product
       has always run. */
    const prompt = await service([]).composeSystemPrompt(checkIn);
    expect(prompt).not.toContain('WHAT THEIR OWN SYSTEMS RECORDED');
  });

  it('and somebody not in the directory is never matched to somebody else\'s records', async () => {
    const prompt = await service([visit], null).composeSystemPrompt(checkIn);
    expect(prompt).not.toContain('WHAT THEIR OWN SYSTEMS RECORDED');
  });
});
