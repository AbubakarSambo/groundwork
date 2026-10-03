import { AssistantService } from './assistant.service';

/**
 * DECISION 50, STEP (b), PIECE 2, POINT 1: ITEMS 8, 9 AND 17 THROUGH ASK GROUNDWORK.
 *
 * Same discipline as `add-context-is-the-context-chat.spec.ts`: these fake `GroundsService`'s own
 * methods rather than the database underneath them, because the guarantee is "the same function
 * runs, with its own rule", not a second copy of what `addContextLine`, `addLeadContext`,
 * `confirmQuestionForPerson` and `declineQuestionForPerson` already do to a ground's record - see
 * `docs/context-chat-inventory.md`, items 8, 9 and 17, for what those already do and keep doing here.
 *
 * What IS tested here: that each of the three lanes says the thing back and waits for a yes before
 * calling the real write (decision 12), that item 9's rule against sharing a note about one named
 * person is never bypassed by the chat guessing a share, and that a bare "yes"/"no" from this lane is
 * never written into the person's ordinary Ask Groundwork history (inventory item 2, kept the same
 * way as `add_context`).
 */
function svc(opts: {
  person?: any;
  viewerRole?: string;
  viewerOrgId?: string;
  grounds?: any[];
  parked?: any;
  participants?: any[];
  addContextLine?: jest.Mock;
  addLeadContext?: jest.Mock;
  questionsForPeople?: jest.Mock;
  confirmQuestionForPerson?: jest.Mock;
  declineQuestionForPerson?: jest.Mock;
} = {}) {
  const proposals: any[] = [];
  const grounds = opts.grounds ?? [
    { id: 'g1', label: 'Q4 sales', initiatorId: 'lead-1', organizationId: 'org-a' },
  ];
  const participants = opts.participants ?? [
    { id: 'part-ben', nameGiven: 'Ben', user: { firstName: 'Ben', lastName: 'Okafor' } },
  ];

  const addContextLine = opts.addContextLine ?? jest.fn(async () => ({ id: 'line-1', kind: 'DECISION', text: 'we will drop the pilot', audience: 'EVERYONE' }));
  const addLeadContext = opts.addLeadContext ?? jest.fn(async () => ({ id: 'note-1', participantId: null, text: 'x', audience: 'LEAD_ONLY' }));
  const questionsForPeople = opts.questionsForPeople ?? jest.fn(async () => [
    { id: 'q1', who: 'Ben', exactQuestion: 'How is the Lagos pitch going?', status: 'waiting' },
  ]);
  const confirmQuestionForPerson = opts.confirmQuestionForPerson ?? jest.fn(async () => ({ id: 'q1', say: 'Confirmed. Groundwork will ask Ben "How is the Lagos pitch going?" in their next check-in, word for word.' }));
  const declineQuestionForPerson = opts.declineQuestionForPerson ?? jest.fn(async () => ({ id: 'q1', status: 'left out', say: 'I have left it out. Groundwork will not ask Ben this question.' }));

  const prisma: any = {
    /* The move into Ask Groundwork is hidden at release; these specs prove the path itself, so it is turned on here. */
    platformSetting: { findUnique: async ({ where }: any) => (where.key === 'release.contextInAskGroundwork' ? { value: { on: true } } : null) },
    person: {
      findFirst: jest.fn(async ({ where }: any) => {
        if (where?.active === true && opts.person === null) return null;
        return { id: 'p1', externalId: 'u-1', active: true, linkedUserId: 'lead-1', ...(opts.person ?? {}) };
      }),
    },
    user: {
      findUnique: jest.fn(async () => ({ role: opts.viewerRole ?? 'MEMBER', organizationId: opts.viewerOrgId ?? 'org-a' })),
    },
    ground: { findMany: jest.fn(async () => grounds) },
    groundParticipant: { findMany: jest.fn(async () => participants) },
    assistantTurn: { count: jest.fn(async () => 5), createMany: jest.fn(async () => ({ count: 2 })) },
    assistantProposal: {
      findFirst: jest.fn(async () => opts.parked ?? null),
      create: jest.fn(async ({ data }: any) => { const p = { id: 'pr1', state: 'PARKED', ...data }; proposals.push(p); return p; }),
      update: jest.fn(async ({ where, data }: any) => { proposals.push({ id: where.id, ...data }); return data; }),
    },
    commitment: { create: jest.fn(async () => ({})), findUnique: jest.fn(async () => null), findMany: jest.fn(async () => []) },
    subject: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
    detectionQuietPeriod: { findMany: jest.fn(async () => []) },
  };
  const knowledge: any = { retrieve: jest.fn(async () => ({ cards: [], truncated: false })) };
  const engine: any = { respond: jest.fn(async () => { throw new Error('model off for these tests'); }) };
  const groundsService: any = {
    addContextLine, addLeadContext, questionsForPeople, confirmQuestionForPerson, declineQuestionForPerson,
    contextChat: jest.fn(), applyContextProposal: jest.fn(),
  };

  const service = new AssistantService(
    prisma,
    engine,
    knowledge,
    { waitingAcrossTheOrg: async () => ({ waiting: [], waitedOn: [] }) } as any,
    { statusFor: async () => ({ roleName: null, gates: [], left: [] }) } as any,
    { pendingFor: async () => [], decide: async () => { throw new Error('no suggestions in these tests'); } } as any,
    { start: async () => { throw new Error('no drafting in these tests'); } } as any,
    { forPerson: async () => { throw new Error('no assembly in these tests'); } } as any,
    { read: async () => ({ read: false, because: 'no reading in these tests' }) } as any,
    { sendRoundDigest: async () => { throw new Error('no mail in these tests'); } } as any,
    groundsService,
  );
  return { service, prisma, proposals, addContextLine, addLeadContext, questionsForPeople, confirmQuestionForPerson, declineQuestionForPerson };
}

describe('item 17: typing a context line directly, with no chat', () => {
  it('a "kind: text" message is said back and parked, never written on its own', async () => {
    const { service, proposals, addContextLine } = svc();
    const r = await service.respond('org-a', 'p1', 'decision: we will drop the pilot', 'g1');
    expect(r.lane).toBe('add_context');
    expect(r.blocks.some((b) => b.type === 'proposal')).toBe(true);
    expect(proposals[0]).toMatchObject({ kind: 'context_line', payload: { groundId: 'g1', kind: 'DECISION', text: 'we will drop the pilot' } });
    expect(addContextLine).not.toHaveBeenCalled();
  });

  it('a yes calls the same addContextLine the Context and resources page calls', async () => {
    const parked = { id: 'pr1', kind: 'context_line', payload: { groundId: 'g1', kind: 'DECISION', text: 'we will drop the pilot' } };
    const { service, addContextLine } = svc({ parked });
    await service.respond('org-a', 'p1', 'yes');
    expect(addContextLine).toHaveBeenCalledWith('g1', 'lead-1', { kind: 'DECISION', text: 'we will drop the pilot' });
  });

  it('a no writes nothing', async () => {
    const parked = { id: 'pr1', kind: 'context_line', payload: { groundId: 'g1', kind: 'DECISION', text: 'we will drop the pilot' } };
    const { service, addContextLine } = svc({ parked });
    await service.respond('org-a', 'p1', 'no');
    expect(addContextLine).not.toHaveBeenCalled();
  });

  it('not one of the five kinds the door accepts is left unplaced rather than guessed', async () => {
    const { service, addContextLine } = svc();
    const r = await service.respond('org-a', 'p1', 'gossip: something unrelated', 'g1');
    expect(r.lane).not.toBe('context_line');
    expect(addContextLine).not.toHaveBeenCalled();
  });
});

describe('item 9: a note only the lead sees', () => {
  it('a private note about the whole check-in is said back before it is saved', async () => {
    const { service, proposals, addLeadContext } = svc();
    const r = await service.respond('org-a', 'p1', 'private note: the budget is not settled yet', 'g1');
    expect(r.lane).toBe('add_context');
    expect(r.blocks.some((b) => b.type === 'proposal')).toBe(true);
    expect(proposals[0]).toMatchObject({ kind: 'lead_note', payload: { groundId: 'g1', participantId: null, text: 'the budget is not settled yet' } });
    expect(addLeadContext).not.toHaveBeenCalled();
  });

  it('a yes saves it LEAD_ONLY, through the same addLeadContext the Context and resources page calls', async () => {
    const parked = { id: 'pr1', kind: 'lead_note', payload: { groundId: 'g1', participantId: null, text: 'the budget is not settled yet' } };
    const { service, addLeadContext } = svc({ parked });
    await service.respond('org-a', 'p1', 'yes');
    expect(addLeadContext).toHaveBeenCalledWith('g1', 'lead-1', { participantId: null, text: 'the budget is not settled yet', audience: 'LEAD_ONLY' });
  });

  it('a private note about a named person on the check-in resolves the participant, and never guesses when nobody matches', async () => {
    const { service, proposals, addLeadContext } = svc();
    const r1 = await service.respond('org-a', 'p1', 'private note about Ben: keeps missing the Friday call', 'g1');
    expect(r1.blocks.some((b) => b.type === 'proposal')).toBe(true);
    expect(proposals[0]).toMatchObject({ kind: 'lead_note', payload: { groundId: 'g1', participantId: 'part-ben', text: 'keeps missing the Friday call' } });

    const r2 = await service.respond('org-a', 'p1', 'private note about Chidinma: is doing well', 'g1');
    expect(r2.blocks.some((b) => b.type === 'proposal')).toBe(false);
    expect(addLeadContext).not.toHaveBeenCalled();
  });

  it('this lane never asks addLeadContext to share a note about a named person - the audience it sends is always LEAD_ONLY', async () => {
    const parked = { id: 'pr1', kind: 'lead_note', payload: { groundId: 'g1', participantId: 'part-ben', text: 'keeps missing the Friday call' } };
    const { service, addLeadContext } = svc({ parked });
    await service.respond('org-a', 'p1', 'yes');
    expect(addLeadContext).toHaveBeenCalledWith('g1', 'lead-1', expect.objectContaining({ audience: 'LEAD_ONLY' }));
  });
});

describe('item 8: the lead\'s exact questions for people, confirmed word for word (decision 34)', () => {
  it('listing says the exact sentence back, and writes nothing', async () => {
    const { service, confirmQuestionForPerson } = svc();
    const r = await service.respond('org-a', 'p1', 'questions for people', 'g1');
    expect(r.lane).toBe('add_context');
    expect((r.blocks[0] as any).body).toContain('How is the Lagos pitch going?');
    expect(confirmQuestionForPerson).not.toHaveBeenCalled();
  });

  it('"confirm the question for Ben" is said back and parked before it is sent', async () => {
    const { service, proposals, confirmQuestionForPerson } = svc();
    const r = await service.respond('org-a', 'p1', 'confirm the question for Ben', 'g1');
    expect(r.blocks.some((b) => b.type === 'proposal')).toBe(true);
    expect(proposals[0]).toMatchObject({ kind: 'question_for_person', payload: { groundId: 'g1', itemId: 'q1', action: 'confirm' } });
    expect(confirmQuestionForPerson).not.toHaveBeenCalled();
  });

  it('a yes calls the same confirmQuestionForPerson the Context and resources page\'s own card calls, as shown', async () => {
    const parked = { id: 'pr1', kind: 'question_for_person', payload: { groundId: 'g1', itemId: 'q1', action: 'confirm' } };
    const { service, confirmQuestionForPerson } = svc({ parked });
    const r = await service.respond('org-a', 'p1', 'yes');
    expect(confirmQuestionForPerson).toHaveBeenCalledWith('g1', 'lead-1', 'q1', {});
    expect((r.blocks[0] as any).body).toContain('word for word');
  });

  it('"leave out the question for Ben" parks a decline, and a yes calls declineQuestionForPerson', async () => {
    const { service, proposals } = svc();
    await service.respond('org-a', 'p1', 'leave out the question for Ben', 'g1');
    expect(proposals[0]).toMatchObject({ kind: 'question_for_person', payload: { groundId: 'g1', itemId: 'q1', action: 'decline' } });

    const parked = { id: 'pr1', kind: 'question_for_person', payload: { groundId: 'g1', itemId: 'q1', action: 'decline' } };
    const { service: service2, declineQuestionForPerson } = svc({ parked });
    await service2.respond('org-a', 'p1', 'yes');
    expect(declineQuestionForPerson).toHaveBeenCalledWith('g1', 'lead-1', 'q1');
  });

  it('the asymmetry is honest, not smoothed: an admin can list and hear it back, and is still refused at the confirm step', async () => {
    const parked = { id: 'pr1', kind: 'question_for_person', payload: { groundId: 'g1', itemId: 'q1', action: 'confirm' } };
    const confirmQuestionForPerson = jest.fn(async () => { throw new Error('Only the person who runs this check-in can confirm a question for somebody on it.'); });
    const { service, prisma } = svc({ parked, person: { linkedUserId: 'admin-1' }, confirmQuestionForPerson });
    const r = await service.respond('org-a', 'p1', 'yes');
    expect(confirmQuestionForPerson).toHaveBeenCalledWith('g1', 'admin-1', 'q1', {});
    expect((r.blocks[0] as any).body).toBe('Only the person who runs this check-in can confirm a question for somebody on it.');
    expect(prisma.assistantProposal.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ state: 'DROPPED' }) }));
  });
});

describe('inventory item 2: nothing from any of the three lanes reaches the person\'s ordinary Ask Groundwork history', () => {
  it('for context_line', async () => {
    const { service, prisma } = svc();
    await service.respond('org-a', 'p1', 'decision: we will drop the pilot', 'g1');
    expect(prisma.assistantTurn.createMany).not.toHaveBeenCalled();
  });

  it('for lead_note', async () => {
    const { service, prisma } = svc();
    await service.respond('org-a', 'p1', 'private note: the budget is not settled yet', 'g1');
    expect(prisma.assistantTurn.createMany).not.toHaveBeenCalled();
  });

  it('for questions_for_people', async () => {
    const { service, prisma } = svc();
    await service.respond('org-a', 'p1', 'questions for people', 'g1');
    expect(prisma.assistantTurn.createMany).not.toHaveBeenCalled();
  });
});

describe('which check-in, for these three doors too (same mechanism as add_context)', () => {
  it('more than one check-in and none named asks which, and resumes the same door once answered', async () => {
    const { service, addContextLine } = svc({
      grounds: [
        { id: 'g1', label: 'Q4 sales', initiatorId: 'lead-1', organizationId: 'org-a' },
        { id: 'g2', label: 'Onboarding', initiatorId: 'lead-1', organizationId: 'org-a' },
      ],
    });
    const r1 = await service.respond('org-a', 'p1', 'decision: we will drop the pilot');
    expect(r1.blocks.some((b) => b.type === 'picker')).toBe(true);
    expect(addContextLine).not.toHaveBeenCalled();

    const parked = {
      id: 'pr1',
      kind: 'which_context_check_in',
      payload: {
        candidates: [{ groundId: 'g1', label: 'Q4 sales' }, { groundId: 'g2', label: 'Onboarding' }],
        said: 'decision: we will drop the pilot',
        purpose: 'context_line',
      },
    };
    const { service: service2 } = svc({
      grounds: [
        { id: 'g1', label: 'Q4 sales', initiatorId: 'lead-1', organizationId: 'org-a' },
        { id: 'g2', label: 'Onboarding', initiatorId: 'lead-1', organizationId: 'org-a' },
      ],
      parked,
    });
    const r2 = await service2.respond('org-a', 'p1', 'Onboarding');
    expect(r2.blocks.some((b) => b.type === 'proposal')).toBe(true);
  });
});
