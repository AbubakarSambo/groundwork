import { AssistantService } from './assistant.service';

/**
 * DECISION 50, PIECE 3.
 *
 * Point 1: the say-back sentences for context_line, lead_note and question_for_person are full
 * sentences, never clipped or colon-joined - see `docs/decisions-merged.md` decision 50, piece 3.
 *
 * Point 2: the last two items through Ask Groundwork, each calling the existing service function,
 * never a copy - `shareLeadContext` (share one of the lead's own notes about the whole check-in with
 * everybody) and `changeContextLine` (reword, share, make private, or retire one line).
 *
 * Point 3: confirming a lead's exact question with their own changed wording (decision 34) - the
 * lead says the new sentence, Groundwork reads it back, and a yes calls the same
 * `confirmQuestionForPerson` the "as shown" confirm calls, with that wording.
 *
 * Same discipline as `items-8-9-17-through-ask-groundwork.spec.ts`: `GroundsService`'s own methods are
 * faked, never the database underneath them, because the guarantee is "the same function runs, with
 * its own rule", not a second copy of what `shareLeadContext`, `changeContextLine` and
 * `confirmQuestionForPerson` already do.
 */
function svc(opts: {
  person?: any;
  grounds?: any[];
  parked?: any;
  leadContextNotes?: any[];
  groundContextItems?: any[];
  questionsForPeople?: jest.Mock;
  confirmQuestionForPerson?: jest.Mock;
  shareLeadContext?: jest.Mock;
  changeContextLine?: jest.Mock;
} = {}) {
  const proposals: any[] = [];
  const grounds = opts.grounds ?? [{ id: 'g1', label: 'Q4 sales', initiatorId: 'lead-1', organizationId: 'org-a' }];
  const participants = [{ id: 'part-ben', nameGiven: 'Ben', user: { firstName: 'Ben', lastName: 'Okafor' } }];

  const questionsForPeople = opts.questionsForPeople ?? jest.fn(async () => [
    { id: 'q1', who: 'Ben', exactQuestion: 'How is the Lagos pitch going?', status: 'waiting' },
  ]);
  const confirmQuestionForPerson = opts.confirmQuestionForPerson ?? jest.fn(async () => ({ id: 'q1', say: 'Confirmed.' }));
  const shareLeadContext = opts.shareLeadContext ?? jest.fn(async () => ({ id: 'note-1', audience: 'EVERYONE' }));
  const changeContextLine = opts.changeContextLine ?? jest.fn(async () => ({ id: 'line-1' }));

  const prisma: any = {
    person: { findFirst: jest.fn(async () => ({ id: 'p1', externalId: 'u-1', active: true, linkedUserId: 'lead-1', ...(opts.person ?? {}) })) },
    /* The move into Ask Groundwork is hidden at release; these specs prove the path itself, so it is turned on here. */
    platformSetting: { findUnique: async ({ where }: any) => (where.key === 'release.contextInAskGroundwork' ? { value: { on: true } } : null) },
    user: { findUnique: jest.fn(async () => ({ role: 'MEMBER', organizationId: 'org-a' })) },
    ground: { findMany: jest.fn(async () => grounds) },
    groundParticipant: { findMany: jest.fn(async () => participants) },
    leadContextNote: { findMany: jest.fn(async () => opts.leadContextNotes ?? [{ id: 'note-1', text: 'the budget is not settled yet' }]) },
    groundContextItem: {
      findMany: jest.fn(async () => opts.groundContextItems ?? [{ id: 'line-1', text: 'we will drop the pilot', audience: 'EVERYONE' }]),
    },
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
    addContextLine: jest.fn(), addLeadContext: jest.fn(),
    questionsForPeople, confirmQuestionForPerson, declineQuestionForPerson: jest.fn(),
    shareLeadContext, changeContextLine,
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
  return { service, prisma, proposals, questionsForPeople, confirmQuestionForPerson, shareLeadContext, changeContextLine };
}

describe('point 1: the say-back sentences are full sentences, never clipped or colon-joined', () => {
  it('adding a context line', async () => {
    const { service, proposals } = svc();
    const r = await service.respond('org-a', 'p1', 'decision: we will drop the pilot', 'g1');
    const said = (r.blocks[0] as any).body as string;
    /* Changed 22 November 2026 (release test of 21 November, Ask #36): the say-back names the check-in, so the lead knows where it goes. */
    expect(said).toMatch(/^Shall I add "we will drop the pilot" to (?:“[^”]+”|this check-in) as a decision\? Everybody in that check-in will read it\.$/);
    expect(said).not.toContain(':');
    expect(proposals[0].summary).toBe(said);
  });

  it('a private note', async () => {
    const { service } = svc();
    const r = await service.respond('org-a', 'p1', 'private note: keep an eye on Ben\'s workload', 'g1');
    const said = (r.blocks[0] as any).body as string;
    expect(said).toBe('Shall I keep "keep an eye on Ben\'s workload" as a private note that only you can see?');
    expect(said).not.toContain(':');
  });

  it('confirming a question, as shown', async () => {
    const { service } = svc();
    const r = await service.respond('org-a', 'p1', 'confirm the question for Ben', 'g1');
    const said = (r.blocks[0] as any).body as string;
    expect(said).toBe('Groundwork will ask Ben, word for word, "How is the Lagos pitch going?" in Ben\'s next check-in. Shall I keep it for then?');
  });

  it('leaving a question out', async () => {
    const { service } = svc();
    const r = await service.respond('org-a', 'p1', 'leave out the question for Ben', 'g1');
    const said = (r.blocks[0] as any).body as string;
    expect(said).toBe('Shall I leave out the question for Ben, "How is the Lagos pitch going?"');
  });
});

describe('point 2: shareLeadContext, said back and confirmed, through the real function', () => {
  it('says the note back before it is shared, and shares nothing on its own', async () => {
    const { service, proposals, shareLeadContext } = svc({
      leadContextNotes: [{ id: 'note-1', text: 'the budget is not settled yet' }],
    });
    const r = await service.respond('org-a', 'p1', 'share the note "the budget is not settled yet"', 'g1');
    expect(r.blocks.some((b) => b.type === 'proposal')).toBe(true);
    expect((r.blocks[0] as any).body).toBe('Shall I share "the budget is not settled yet" with everybody on this check-in?');
    expect(proposals[0]).toMatchObject({ kind: 'share_lead_note', payload: { groundId: 'g1', noteId: 'note-1' } });
    expect(shareLeadContext).not.toHaveBeenCalled();
  });

  it('a yes calls the same shareLeadContext the Context and resources page\'s own button calls', async () => {
    const parked = { id: 'pr1', kind: 'share_lead_note', payload: { groundId: 'g1', noteId: 'note-1' } };
    const { service, shareLeadContext } = svc({ parked });
    await service.respond('org-a', 'p1', 'yes');
    expect(shareLeadContext).toHaveBeenCalledWith('g1', 'lead-1', 'note-1');
  });

  it('a note about a named person is never even offered up to be shared', async () => {
    /* Only notes with participantId: null are read by the lane (see shareLeadNoteByChat's own
       prisma query), so a note about somebody never reaches the list this chat offers - it never
       relies on shareLeadContext's own refusal to catch a guess made here. */
    const { service, prisma } = svc({ leadContextNotes: [] });
    const r = await service.respond('org-a', 'p1', 'share the note about Ben', 'g1');
    expect(prisma.leadContextNote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ participantId: null }) }),
    );
    expect((r.blocks[0] as any).body).toContain('no private note about this check-in waiting to be shared');
  });

  it('a refusal from shareLeadContext itself is surfaced honestly, not swallowed', async () => {
    const parked = { id: 'pr1', kind: 'share_lead_note', payload: { groundId: 'g1', noteId: 'note-1' } };
    const shareLeadContext = jest.fn(async () => { throw new Error('A note everyone reads is about the whole check-in, not about one person.'); });
    const { service } = svc({ parked, shareLeadContext });
    const r = await service.respond('org-a', 'p1', 'yes');
    expect((r.blocks[0] as any).body).toBe('A note everyone reads is about the whole check-in, not about one person.');
  });
});

describe('point 2: changeContextLine, said back and confirmed, through the real function', () => {
  it('rewording a line is said back with the new wording, before anything changes', async () => {
    const { service, proposals, changeContextLine } = svc({
      groundContextItems: [{ id: 'line-1', text: 'we will drop the pilot', audience: 'EVERYONE' }],
    });
    const r = await service.respond('org-a', 'p1', 'reword the line "we will drop the pilot" to "we will pause the pilot"', 'g1');
    expect((r.blocks[0] as any).body).toBe('Shall I change the line "we will drop the pilot" to say "we will pause the pilot" instead?');
    expect(proposals[0]).toMatchObject({ kind: 'change_context_line', payload: { groundId: 'g1', itemId: 'line-1', action: 'reword', newText: 'we will pause the pilot' } });
    expect(changeContextLine).not.toHaveBeenCalled();
  });

  it('a yes to a reword calls the same changeContextLine the Context and resources page calls', async () => {
    const parked = { id: 'pr1', kind: 'change_context_line', payload: { groundId: 'g1', itemId: 'line-1', action: 'reword', newText: 'we will pause the pilot' } };
    const { service, changeContextLine } = svc({ parked });
    await service.respond('org-a', 'p1', 'yes');
    expect(changeContextLine).toHaveBeenCalledWith('g1', 'lead-1', 'line-1', { text: 'we will pause the pilot' });
  });

  it('sharing a line asks first, and a yes sends audience EVERYONE', async () => {
    const { service, proposals } = svc({ groundContextItems: [{ id: 'line-1', text: 'we will drop the pilot', audience: 'LEAD_ONLY' }] });
    const r = await service.respond('org-a', 'p1', 'share the line "we will drop the pilot"', 'g1');
    expect((r.blocks[0] as any).body).toBe('Shall I share the line "we will drop the pilot" with everybody on this check-in?');
    expect(proposals[0]).toMatchObject({ kind: 'change_context_line', payload: { action: 'share' } });

    const parked = { id: 'pr1', kind: 'change_context_line', payload: { groundId: 'g1', itemId: 'line-1', action: 'share', newText: null } };
    const { service: service2, changeContextLine } = svc({ parked });
    await service2.respond('org-a', 'p1', 'yes');
    expect(changeContextLine).toHaveBeenCalledWith('g1', 'lead-1', 'line-1', { audience: 'EVERYONE' });
  });

  it('making a line private asks first, and a yes sends audience LEAD_ONLY', async () => {
    const parked = { id: 'pr1', kind: 'change_context_line', payload: { groundId: 'g1', itemId: 'line-1', action: 'private', newText: null } };
    const { service, changeContextLine } = svc({ parked });
    await service.respond('org-a', 'p1', 'yes');
    expect(changeContextLine).toHaveBeenCalledWith('g1', 'lead-1', 'line-1', { audience: 'LEAD_ONLY' });
  });

  it('retiring a line asks first, said as staying on the record, and a yes sends closed true', async () => {
    const { service, proposals } = svc({ groundContextItems: [{ id: 'line-1', text: 'we will drop the pilot', audience: 'EVERYONE' }] });
    const r = await service.respond('org-a', 'p1', 'retire the line "we will drop the pilot"', 'g1');
    expect((r.blocks[0] as any).body).toBe('Shall I retire the line "we will drop the pilot"? It stays on the record but no longer counts as open.');
    expect(proposals[0]).toMatchObject({ kind: 'change_context_line', payload: { action: 'retire' } });

    const parked = { id: 'pr1', kind: 'change_context_line', payload: { groundId: 'g1', itemId: 'line-1', action: 'retire', newText: null } };
    const { service: service2, changeContextLine } = svc({ parked });
    await service2.respond('org-a', 'p1', 'yes');
    expect(changeContextLine).toHaveBeenCalledWith('g1', 'lead-1', 'line-1', { closed: true });
  });

  it('a line about a named person is never offered here at all - only STRATEGY/WAY_OF_WORKING/DECISION/UNSETTLED/NOTE are read', async () => {
    const { service, prisma } = svc({ groundContextItems: [] });
    await service.respond('org-a', 'p1', 'share the line "Dayo keeps missing the Friday call"', 'g1');
    expect(prisma.groundContextItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ kind: { in: ['STRATEGY', 'WAY_OF_WORKING', 'DECISION', 'UNSETTLED', 'NOTE'] } } as any) }),
    );
  });

  it('ambiguous wording that names no line lists what is open, rather than guessing', async () => {
    const { service, changeContextLine } = svc({
      groundContextItems: [
        { id: 'line-1', text: 'we will drop the pilot', audience: 'EVERYONE' },
        { id: 'line-2', text: 'the Lagos office leads on this', audience: 'EVERYONE' },
      ],
    });
    const r = await service.respond('org-a', 'p1', 'retire the line', 'g1');
    expect((r.blocks[0] as any).body).toContain('I cannot tell which line you mean');
    expect(changeContextLine).not.toHaveBeenCalled();
  });
});

describe('point 3: confirming a question with the lead\'s own changed wording (decision 34)', () => {
  it('says the new sentence back, not the old one, before anything is sent', async () => {
    const { service, proposals, confirmQuestionForPerson } = svc();
    const r = await service.respond('org-a', 'p1', 'ask Ben "How are the Lagos numbers looking?" instead', 'g1');
    expect((r.blocks[0] as any).body).toBe('Groundwork will ask Ben, word for word, "How are the Lagos numbers looking?" in Ben\'s next check-in. Shall I keep it for then?');
    expect(proposals[0]).toMatchObject({
      kind: 'question_for_person',
      payload: { groundId: 'g1', itemId: 'q1', action: 'confirm', exactQuestion: 'How are the Lagos numbers looking?' },
    });
    expect(confirmQuestionForPerson).not.toHaveBeenCalled();
  });

  it('a yes calls the same confirmQuestionForPerson, with the lead\'s new wording as exactQuestion', async () => {
    const parked = {
      id: 'pr1',
      kind: 'question_for_person',
      payload: { groundId: 'g1', itemId: 'q1', action: 'confirm', exactQuestion: 'How are the Lagos numbers looking?' },
    };
    const { service, confirmQuestionForPerson } = svc({ parked });
    await service.respond('org-a', 'p1', 'yes');
    expect(confirmQuestionForPerson).toHaveBeenCalledWith('g1', 'lead-1', 'q1', { exactQuestion: 'How are the Lagos numbers looking?' });
  });

  it('confirming as shown (no reword) still sends undefined, unchanged from before this piece', async () => {
    const parked = { id: 'pr1', kind: 'question_for_person', payload: { groundId: 'g1', itemId: 'q1', action: 'confirm' } };
    const { service, confirmQuestionForPerson } = svc({ parked });
    await service.respond('org-a', 'p1', 'yes');
    expect(confirmQuestionForPerson).toHaveBeenCalledWith('g1', 'lead-1', 'q1', { exactQuestion: undefined });
  });
});

describe('nothing from any of these three doors reaches the person\'s ordinary Ask Groundwork history (inventory item 2)', () => {
  it('for share_lead_note', async () => {
    const { service, prisma } = svc();
    await service.respond('org-a', 'p1', 'share the note "the budget is not settled yet"', 'g1');
    expect(prisma.assistantTurn.createMany).not.toHaveBeenCalled();
  });

  it('for change_context_line', async () => {
    const { service, prisma } = svc();
    await service.respond('org-a', 'p1', 'retire the line "we will drop the pilot"', 'g1');
    expect(prisma.assistantTurn.createMany).not.toHaveBeenCalled();
  });

  it('for a reworded question confirm', async () => {
    const { service, prisma } = svc();
    await service.respond('org-a', 'p1', 'ask Ben "How are the Lagos numbers looking?" instead', 'g1');
    expect(prisma.assistantTurn.createMany).not.toHaveBeenCalled();
  });
});
