import { AssistantService } from './assistant.service';

/**
 * DECISION 50, STEP (b), PIECE 1: ASK GROUNDWORK'S `add_context` LANE CALLS THE CONTEXT CHAT'S OWN
 * SERVICE CODE, NEVER A COPY.
 *
 * These tests fake `GroundsService.contextChat`/`applyContextProposal` themselves rather than the
 * database underneath them - the guarantee this lane exists to keep is "the same two functions run",
 * not "grounds.service.ts is reimplemented a second time inside a spec". What each of those two
 * functions does with a ground's record is covered where they already are:
 * `the-context-chat.spec.ts`, `lead-confirmation-not-skipped.spec.ts`, and the rest of
 * `docs/context-chat-inventory.md`.
 *
 * What IS tested here, at the lane: who reaches the setup conversation at all (item 14), that the
 * propose half and the confirm half hit `contextChat`/`applyContextProposal` with the ground and the
 * user the request actually named, that a "yes" re-sends the lead's own words rather than manufacturing
 * one, and that the asymmetry inventory item 5 and item 14 both flag - the propose half allows an
 * admin, the confirm half does not - survives the move into Ask Groundwork rather than being smoothed
 * away by a shared "lead or admin" guard. That last one is the test the inventory says is missing.
 */
function svc(opts: {
  person?: any;
  viewerRole?: string;
  viewerOrgId?: string;
  grounds?: any[];
  parked?: any;
  contextChat?: jest.Mock;
  applyContextProposal?: jest.Mock;
} = {}) {
  const proposals: any[] = [];
  const grounds = opts.grounds ?? [
    { id: 'g1', label: 'Q4 sales', initiatorId: 'lead-1', organizationId: 'org-a' },
  ];
  const contextChat = opts.contextChat ?? jest.fn(async () => ({
    reply: 'How long does this check-in run for?',
    gaps: ['duration'],
    done: false,
    proposal: null,
  }));
  const applyContextProposal = opts.applyContextProposal ?? jest.fn(async () => ({ changed: 'timeline', say: 'Set to twelve weeks.' }));

  const prisma: any = {
    person: {
      findFirst: jest.fn(async ({ where }: any) => {
        if (where?.active === true && opts.person === null) return null;
        return { id: 'p1', externalId: 'u-1', active: true, linkedUserId: 'lead-1', ...(opts.person ?? {}) };
      }),
    },
    user: {
      findUnique: jest.fn(async () => ({ role: opts.viewerRole ?? 'MEMBER', organizationId: opts.viewerOrgId ?? 'org-a' })),
    },
    ground: {
      findMany: jest.fn(async () => grounds),
    },
    assistantTurn: {
      count: jest.fn(async () => 5),
      createMany: jest.fn(async () => ({ count: 2 })),
    },
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
  const groundsService: any = { contextChat, applyContextProposal };

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
  return { service, prisma, proposals, contextChat, applyContextProposal };
}

describe('who reaches the setup conversation at all (inventory item 14)', () => {
  it('the lead who runs the check-in reaches it', async () => {
    const { service, contextChat } = svc();
    const r = await service.respond('org-a', 'p1', 'add this as context', 'g1');
    expect(r.lane).toBe('add_context');
    expect(contextChat).toHaveBeenCalledWith('g1', 'lead-1', [{ role: 'user', content: 'add this as context' }]);
  });

  it('an admin of the same organisation, covering for the lead, reaches it too', async () => {
    const { service, contextChat } = svc({
      person: { linkedUserId: 'admin-1' },
      viewerRole: 'ADMIN',
      viewerOrgId: 'org-a',
    });
    const r = await service.respond('org-a', 'p1', 'add this as context', 'g1');
    expect(r.lane).toBe('add_context');
    expect(contextChat).toHaveBeenCalledWith('g1', 'admin-1', expect.anything());
  });

  it('an admin of a DIFFERENT organisation is a stranger to this check-in, same rule as the old route', async () => {
    const { service, contextChat } = svc({
      person: { linkedUserId: 'admin-2' },
      viewerRole: 'ADMIN',
      viewerOrgId: 'org-b',
    });
    const r = await service.respond('org-a', 'p1', 'add this as context', 'g1');
    expect(r.lane).toBe('unplaced');
    expect(contextChat).not.toHaveBeenCalled();
  });

  it('a participant who is neither the lead nor an admin never reaches it - Ask Groundwork\'s ordinary answer instead', async () => {
    const { service, contextChat } = svc({
      person: { linkedUserId: 'member-1' },
      viewerRole: 'MEMBER',
      viewerOrgId: 'org-a',
    });
    const r = await service.respond('org-a', 'p1', 'add this as context', 'g1');
    expect(r.lane).toBe('unplaced');
    expect(contextChat).not.toHaveBeenCalled();
  });

  it('a message that is not about a check-in\'s context never calls contextChat at all', async () => {
    const { service, contextChat } = svc();
    const r = await service.respond('org-a', 'p1', 'what am I on?', 'g1');
    expect(r.lane).not.toBe('add_context');
    expect(contextChat).not.toHaveBeenCalled();
  });
});

describe('which check-in (a check-in chosen or named; ambiguous asks)', () => {
  it('with only one check-in to set up, no name is needed', async () => {
    const { service, contextChat } = svc();
    const r = await service.respond('org-a', 'p1', 'the context for our check-in');
    expect(r.lane).toBe('add_context');
    expect(contextChat).toHaveBeenCalledWith('g1', 'lead-1', expect.anything());
  });

  it('with more than one, an unnamed request asks which, rather than guessing', async () => {
    const { service, contextChat } = svc({
      grounds: [
        { id: 'g1', label: 'Q4 sales', initiatorId: 'lead-1', organizationId: 'org-a' },
        { id: 'g2', label: 'Onboarding', initiatorId: 'lead-1', organizationId: 'org-a' },
      ],
    });
    const r = await service.respond('org-a', 'p1', 'add this as context');
    expect(r.lane).toBe('add_context');
    expect(r.blocks.some((b) => b.type === 'picker')).toBe(true);
    expect(contextChat).not.toHaveBeenCalled();
  });

  it('naming one of several resolves it without asking', async () => {
    const { service, contextChat } = svc({
      grounds: [
        { id: 'g1', label: 'Q4 sales', initiatorId: 'lead-1', organizationId: 'org-a' },
        { id: 'g2', label: 'Onboarding', initiatorId: 'lead-1', organizationId: 'org-a' },
      ],
    });
    const r = await service.respond('org-a', 'p1', 'the context for Onboarding');
    expect(r.lane).toBe('add_context');
    expect(contextChat).toHaveBeenCalledWith('g2', 'lead-1', expect.anything());
  });

  it('answering the "which check-in" question by name continues into the same setup conversation', async () => {
    const parked = {
      id: 'pr1',
      kind: 'which_context_check_in',
      payload: {
        candidates: [{ groundId: 'g1', label: 'Q4 sales' }, { groundId: 'g2', label: 'Onboarding' }],
        said: 'add this as context',
      },
    };
    const { service, contextChat } = svc({ parked });
    const r = await service.respond('org-a', 'p1', 'Onboarding');
    expect(r.lane).toBe('add_context');
    expect(contextChat).toHaveBeenCalledWith('g2', 'lead-1', [{ role: 'user', content: 'add this as context' }]);
  });
});

describe('say-back and confirm before saving (inventory item 5), by calling the real functions', () => {
  it('a concrete proposal is parked and echoed back, never written on its own', async () => {
    const contextChat = jest.fn(async () => ({
      reply: 'I will set this to run for twelve weeks.',
      gaps: [],
      done: true,
      proposal: { gap: 'duration', say: 'I will set this to run for twelve weeks.' },
    }));
    const applyContextProposal = jest.fn();
    const { service, prisma, proposals } = svc({ contextChat, applyContextProposal });
    const said = 'add this as context: it runs for twelve weeks';
    const r = await service.respond('org-a', 'p1', said, 'g1');
    expect(r.blocks.some((b) => b.type === 'proposal')).toBe(true);
    expect(proposals[0]).toMatchObject({ kind: 'context', payload: { groundId: 'g1', said } });
    expect(applyContextProposal).not.toHaveBeenCalled();
    /* Nothing from this lane is remembered in the person's ordinary Ask Groundwork history. */
    expect(prisma.assistantTurn.createMany).not.toHaveBeenCalled();
  });

  it('confirming re-sends the lead\'s OWN WORDS, not the word "yes" - applyContextProposal derives the value itself', async () => {
    const parked = {
      id: 'pr1',
      kind: 'context',
      payload: { groundId: 'g1', said: 'twelve weeks', history: [{ role: 'user', content: 'twelve weeks' }] },
    };
    const applyContextProposal = jest.fn(async () => ({ changed: 'timeline', say: 'Set to twelve weeks.' }));
    const { service } = svc({ parked, applyContextProposal });
    const r = await service.respond('org-a', 'p1', 'yes');
    expect(applyContextProposal).toHaveBeenCalledWith('g1', 'lead-1', { said: 'twelve weeks', history: [{ role: 'user', content: 'twelve weeks' }] });
    expect(r.blocks[0]).toMatchObject({ type: 'text', body: 'Set to twelve weeks.' });
  });

  it('declining writes nothing', async () => {
    const parked = { id: 'pr1', kind: 'context', payload: { groundId: 'g1', said: 'twelve weeks', history: [] } };
    const applyContextProposal = jest.fn();
    const { service } = svc({ parked, applyContextProposal });
    await service.respond('org-a', 'p1', 'no');
    expect(applyContextProposal).not.toHaveBeenCalled();
  });

  /*
   * FOUND LIVE, 30 September 2026, on the four live checks: after a lead confirmed what doing well
   * looks like through Ask Groundwork, the very next reply opened with the product's own opening
   * line again - "This check-in runs for 12 weeks and people check in once a week." -
   * `contextChat` (grounds.service.ts) only adds that on the FIRST reply of a conversation
   * (`isOpeningTurn`, true when no turn in `history` has `role: 'assistant'`), and nothing here used
   * to carry the fact that a turn had already happened forward to the next message: confirming
   * through `resolveParkedContext` wrote the row and replied, and parked nothing, so the next message
   * reached `contextChat` with a fresh one-turn history and no assistant turn in it at all.
   */
  it('confirming parks the exchange forward as a context_turn, so the next message does not read as the opening turn', async () => {
    const parked = {
      id: 'pr1',
      kind: 'context',
      payload: { groundId: 'g1', said: 'twelve weeks', history: [{ role: 'user', content: 'twelve weeks' }] },
    };
    const applyContextProposal = jest.fn(async () => ({ changed: 'timeline', say: 'Set to twelve weeks.' }));
    const { service, proposals } = svc({ parked, applyContextProposal });
    await service.respond('org-a', 'p1', 'yes');
    const carried = proposals.find((p) => p.kind === 'context_turn');
    expect(carried).toBeDefined();
    expect(carried.payload.groundId).toBe('g1');
    /* The confirmation itself is now an ASSISTANT turn in the carried history - the one thing
       `isOpeningTurn` checks for. */
    expect(carried.payload.history).toEqual([
      { role: 'user', content: 'twelve weeks' },
      { role: 'assistant', content: 'Set to twelve weeks.' },
    ]);
  });

  it('and the next message reaches contextChat with that assistant turn already in its history', async () => {
    const afterConfirm = {
      id: 'pr2',
      kind: 'context_turn',
      payload: {
        groundId: 'g1',
        history: [{ role: 'user', content: 'twelve weeks' }, { role: 'assistant', content: 'Set to twelve weeks.' }],
      },
    };
    const contextChat = jest.fn(async () => ({ reply: 'What does doing well look like?', gaps: ['success'], done: false, proposal: null }));
    const { service } = svc({ parked: afterConfirm, contextChat });
    await service.respond('org-a', 'p1', 'Good means every stage has an owner.');
    expect(contextChat).toHaveBeenCalledWith('g1', 'lead-1', [
      { role: 'user', content: 'twelve weeks' },
      { role: 'assistant', content: 'Set to twelve weeks.' },
      { role: 'user', content: 'Good means every stage has an owner.' },
    ]);
  });
});

/**
 * DECISION 63, 30 September 2026, NARROWED THIS: an admin now CAN confirm, but only once the lead
 * has left the organisation - `applyContextProposal` itself decides that (who-may-confirm-setup.ts).
 * This mock stands in for "the lead is still here", which is the one case still refused. What this
 * test protects is unchanged either way: assistant.service.ts surfaces whatever
 * `applyContextProposal` throws, honestly, rather than pretending the write saved.
 */
describe('propose allows an admin; confirm still refuses one while the lead is still here (inventory items 5 and 14)', () => {
  it('an admin can have the whole conversation and still be refused at the confirm step, honestly, not silently, while the lead is still in the organisation', async () => {
    const parked = {
      id: 'pr1',
      kind: 'context',
      payload: { groundId: 'g1', said: 'twelve weeks', history: [{ role: 'user', content: 'twelve weeks' }] },
    };
    const applyContextProposal = jest.fn(async () => {
      throw new Error("Setting this check-in up is the lead's.");
    });
    const { service, prisma } = svc({ parked, person: { linkedUserId: 'admin-1' }, applyContextProposal });
    const r = await service.respond('org-a', 'p1', 'yes');
    expect(applyContextProposal).toHaveBeenCalledWith('g1', 'admin-1', expect.anything());
    expect(r.blocks[0]).toMatchObject({ type: 'text', body: "Setting this check-in up is the lead's." });
    expect(prisma.assistantProposal.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ state: 'DROPPED' }) }),
    );
  });
});

describe('inventory item 2: a multi-turn setup conversation continues (decision 50, piece 2, point 2)', () => {
  /*
   * THE DEFECT THIS FIXES: the lane had no history, so a bare answer with nothing else in it
   * ("twelve weeks") - which is exactly how somebody answers the SECOND question of a setup
   * conversation - was read as a fresh, contextless message rather than as the reply to the gap
   * `contextChat` had just asked about. A three-turn exchange: still gathering, still gathering,
   * then a concrete proposal - and by the third turn `contextChat` is given every earlier turn.
   */
  it('three turns: the first two are parked as an open conversation, and the third receives the whole history so far', async () => {
    const contextChat = jest.fn()
      .mockResolvedValueOnce({ reply: 'How long does this check-in run for?', gaps: ['duration', 'cadence'], done: false, proposal: null })
      .mockResolvedValueOnce({ reply: 'And how often do you want to check in?', gaps: ['cadence'], done: false, proposal: null })
      .mockResolvedValueOnce({ reply: 'I will set this to run for twelve weeks, checking in weekly.', gaps: [], done: true, proposal: { gap: 'duration', say: 'I will set this to run for twelve weeks, checking in weekly.' } });
    const { service, prisma, proposals } = svc({ contextChat });

    const r1 = await service.respond('org-a', 'p1', 'the context for our check-in', 'g1');
    expect(r1.blocks.some((b) => b.type === 'proposal')).toBe(false);
    expect(contextChat).toHaveBeenNthCalledWith(1, 'g1', 'lead-1', [{ role: 'user', content: 'the context for our check-in' }]);
    const firstParked = proposals.find((p) => p.kind === 'context_turn' && p.state === 'PARKED');
    expect(firstParked).toBeTruthy();

    /* The second turn answers by naming the parked row directly, the way `svc`'s fake findFirst works. */
    const { service: service2, proposals: proposals2 } = svc({ contextChat, parked: firstParked });
    const r2 = await service2.respond('org-a', 'p1', 'twelve weeks');
    expect(r2.blocks.some((b) => b.type === 'proposal')).toBe(false);
    expect(contextChat).toHaveBeenNthCalledWith(2, 'g1', 'lead-1', [
      { role: 'user', content: 'the context for our check-in' },
      { role: 'assistant', content: 'How long does this check-in run for?' },
      { role: 'user', content: 'twelve weeks' },
    ]);
    const secondParked = proposals2.find((p) => p.kind === 'context_turn' && p.state === 'PARKED');
    expect(secondParked).toBeTruthy();
    /* The first parked row was superseded, not left dangling. */
    expect(proposals2.some((p) => p.id === 'pr1' && p.state === 'ACCEPTED')).toBe(true);

    /* The third turn resolves into a concrete proposal, still carrying every earlier turn. */
    const { service: service3, proposals: proposals3, prisma: prisma3 } = svc({ contextChat, parked: secondParked });
    const r3 = await service3.respond('org-a', 'p1', 'weekly');
    expect(r3.blocks.some((b) => b.type === 'proposal')).toBe(true);
    expect(contextChat).toHaveBeenNthCalledWith(3, 'g1', 'lead-1', [
      { role: 'user', content: 'the context for our check-in' },
      { role: 'assistant', content: 'How long does this check-in run for?' },
      { role: 'user', content: 'twelve weeks' },
      { role: 'assistant', content: 'And how often do you want to check in?' },
      { role: 'user', content: 'weekly' },
    ]);
    const finalProposal = proposals3.find((p) => p.kind === 'context' && p.state === 'PARKED');
    expect(finalProposal).toBeTruthy();
    /* Still never written on its own - a concrete proposal at the end of a long conversation is
       confirmed exactly the same way a one-turn one is (item 5). */
    expect(prisma3.assistantProposal.create).toHaveBeenCalled();
  });

  it('nothing from an open setup conversation reaches the person\'s ordinary Ask Groundwork history', async () => {
    const contextChat = jest.fn(async () => ({ reply: 'How long does this check-in run for?', gaps: ['duration'], done: false, proposal: null }));
    const { service, prisma } = svc({ contextChat });
    await service.respond('org-a', 'p1', 'the context for our check-in', 'g1');
    expect(prisma.assistantTurn.createMany).not.toHaveBeenCalled();
  });
});

/**
 * DECISION 65 (30 September 2026): ASK GROUNDWORK OPENED FROM INSIDE A CHECK-IN.
 *
 * `respond`'s fifth argument, `openedFromSetup`, is `ask.service.ts` telling the assistant that the
 * screen opened Ask Groundwork from inside `groundId`'s own Context and resources page or setup -
 * after `ask.service.ts` has already checked, through `GroundsService.mayOpenSetupChatFor`, that the
 * sender may confirm setup there (decision 63's rule). These tests are at the level `respond` itself
 * decides: given that flag is true, does it skip the "context" keyword and go straight to the setup
 * conversation, with whatever was typed, empty included? Whether the flag is set correctly for a
 * lead versus a participant is `ask.service.ts`'s job, covered in ask/opened-from-check-in-setup.spec.ts.
 */
describe('decision 65: openedFromSetup skips the keyword and goes straight to the setup conversation', () => {
  /*
   * FIX, 30 September 2026: this used to assert `[{ role: 'user', content: '' }]`, which is not what
   * the old route sends on an empty opener - the old route's client sends `history: []`, and
   * `GroundsService.contextChat` only substitutes `{ role: 'user', content: 'Start.' }` for the MODEL
   * when `history.length` is zero. Sending a turn with empty content reaches Gemini as an empty user
   * turn, which Gemini refuses with a 400, surfaced to the person as a 503 - a real live defect found
   * on this exact path. An empty opener has to produce an empty history, matching the old route, not a
   * history with one empty turn in it.
   */
  it('an empty message opens on what the setup is missing, the same as opening the old context chat', async () => {
    const { service, contextChat } = svc();
    const r = await service.respond('org-a', 'p1', '', 'g1', true);
    expect(r.lane).toBe('add_context');
    expect(contextChat).toHaveBeenCalledWith('g1', 'lead-1', []);
  });

  it('a message with none of the "context" wording is still treated as an answer in the setup conversation', async () => {
    const { service, contextChat } = svc();
    const r = await service.respond('org-a', 'p1', 'twelve weeks', 'g1', true);
    expect(r.lane).toBe('add_context');
    expect(contextChat).toHaveBeenCalledWith('g1', 'lead-1', [{ role: 'user', content: 'twelve weeks' }]);
  });

  it('without the flag, the same message ("twelve weeks") is not read as setup at all', async () => {
    const { service, contextChat } = svc();
    const r = await service.respond('org-a', 'p1', 'twelve weeks', 'g1');
    expect(r.lane).not.toBe('add_context');
    expect(contextChat).not.toHaveBeenCalled();
  });

  it('still goes through the ordinary confirmation, not straight to writing anything', async () => {
    const { service, contextChat, prisma } = svc({
      contextChat: jest.fn(async () => ({ reply: 'I will set this to run for twelve weeks.', gaps: [], done: true, proposal: { field: 'timelineDays', value: 84 } })),
    });
    const r = await service.respond('org-a', 'p1', 'twelve weeks', 'g1', true);
    expect(r.blocks.some((b: any) => b.type === 'proposal')).toBe(true);
    expect(prisma.assistantProposal.create).toHaveBeenCalled();
    expect(contextChat).toHaveBeenCalled();
  });

  /*
   * FIX 1, 30 September 2026: an empty opener must reach `contextChat` as an EMPTY HISTORY, never a
   * turn with empty content - Gemini rejects an empty user turn with a 400. The stub here plays
   * Gemini's own part: it throws on anything but an empty array, the same way the real model throws
   * on an empty turn, so this test fails the way the live defect did if the fix ever regresses.
   */
  it('an empty opener reaches contextChat as an empty history - a stub that rejects an empty user turn, the way Gemini does', async () => {
    const contextChat = jest.fn(async (_groundId: string, _userId: string, history: { role: string; content: string }[]) => {
      if (history.some((h) => !h.content?.trim())) {
        throw new Error('400 Model input cannot be empty');
      }
      return { reply: 'This check-in runs for 12 weeks. What does doing well look like here?', gaps: ['success'], done: false, proposal: null };
    });
    const { service } = svc({ contextChat });
    const r = await service.respond('org-a', 'p1', '', 'g1', true);
    expect(contextChat).toHaveBeenCalledWith('g1', 'lead-1', []);
    expect(r.lane).toBe('add_context');
  });
});

describe('FIX 2, 30 September 2026: a setup conversation opened with openedFromSetup carries its history turn to turn, even once the ground\'s own structural gaps are closed', () => {
  /*
   * THE DEFECT: `context_turn` used to park only when `result.done` was false, and `done` is
   * `gaps.length === 0` - a fact about the ground's structural setup, not about whether this
   * conversation (coaching the lead about a named person, inventory item 10) is finished. On a fully
   * set-up ground, `done` is true from the first turn, so nothing ever parked and the SECOND message
   * of the exchange reached `contextChat` with no memory of the first.
   */
  it('a coaching exchange on an already-set-up ground still carries its history to the second turn', async () => {
    const contextChat = jest.fn()
      .mockResolvedValueOnce({
        reply: 'What have you seen that makes you say that, and what have you already tried with him?',
        gaps: [],
        done: true,
        proposal: null,
      })
      .mockResolvedValueOnce({
        reply: 'I will record that as what you expect of Ben: "the pipeline update in by every Friday". It goes down as your expectation.',
        gaps: [],
        done: true,
        proposal: { gap: 'objectives', say: 'Shall I record that as what you expect of Ben?' },
      });
    const { service, proposals } = svc({ contextChat });

    const r1 = await service.respond('org-a', 'p1', 'Ben is struggling and honestly he is difficult to work with.', 'g1', true);
    expect(r1.blocks.some((b) => b.type === 'proposal')).toBe(false);
    const firstParked = proposals.find((p) => p.kind === 'context_turn' && p.state === 'PARKED');
    expect(firstParked).toBeTruthy();

    const { service: service2, contextChat: contextChat2 } = svc({ contextChat, parked: firstParked });
    const r2 = await service2.respond(
      'org-a', 'p1',
      'He has missed the last two pipeline updates. I spoke to him once. I want the update in by every Friday.',
    );
    expect(contextChat2).toHaveBeenNthCalledWith(2, 'g1', 'lead-1', [
      { role: 'user', content: 'Ben is struggling and honestly he is difficult to work with.' },
      { role: 'assistant', content: 'What have you seen that makes you say that, and what have you already tried with him?' },
      { role: 'user', content: 'He has missed the last two pipeline updates. I spoke to him once. I want the update in by every Friday.' },
    ]);
    expect(r2.blocks.some((b) => b.type === 'proposal')).toBe(true);
  });
});
