import { AssistantService } from './assistant.service';
import { asksToAddADocument, whatKindOfThingWasSaid } from './what-kind-of-thing-was-said';

/**
 * B-083 AND B-084. A lead who is setting a check-in up through Ask says many kinds of thing, in no order.
 * A fact for everyone is said back as a line everybody in the check-in reads, with Yes and No, and is
 * never filed as what doing well looks like. "I want to add a document" is never read as a measure, and
 * Ask never tells the lead to use a control that is not there. These read what the lead is shown.
 */
const FACT = 'The Westlands depot closes for repairs from 20 October to 27 October, so no deliveries leave Westlands that week. Everyone in this check-in should know this.';

function svc(extract: (message: string) => any, opts: { parked?: any } = {}) {
  const proposals: any[] = [];
  const prisma: any = {
    platformSetting: { findUnique: async ({ where }: any) => (where.key === 'release.contextInAskGroundwork' ? { value: { on: true } } : null) },
    person: { findFirst: jest.fn(async () => ({ id: 'p1', externalId: 'u-1', active: true, linkedUserId: 'lead-1', displayName: 'Tendai' })) },
    user: { findUnique: jest.fn(async () => ({ role: 'LEAD', organizationId: 'org-a' })) },
    ground: {
      findMany: jest.fn(async () => [{ id: 'g1', label: 'Kijani deliveries', initiatorId: 'lead-1', organizationId: 'org-a', scenario: 'NEW_PROJECT', participants: [] }]),
      findFirst: jest.fn(async () => ({ id: 'g1', label: 'Kijani deliveries', initiatorId: 'lead-1', organizationId: 'org-a', scenario: 'NEW_PROJECT', participants: [] })),
    },
    groundParticipant: {
      findMany: jest.fn(async () => [{ id: 'gp1', nameGiven: 'Amani', user: { firstName: 'Amani', lastName: 'Wekesa' } }]),
      findFirst: jest.fn(async () => ({ id: 'gp-lead' })),
    },
    groundDocument: { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null) },
    assistantTurn: { count: jest.fn(async () => 5), createMany: jest.fn(async () => ({ count: 2 })) },
    assistantProposal: {
      findFirst: jest.fn(async () => opts.parked ?? null),
      create: jest.fn(async ({ data }: any) => { const p = { id: `pr${proposals.length + 1}`, state: 'PARKED', ...data }; proposals.push(p); return p; }),
      update: jest.fn(async () => ({})),
    },
    commitment: { create: jest.fn(), findUnique: jest.fn(async () => null), findMany: jest.fn(async () => []) },
    subject: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
    detectionQuietPeriod: { findMany: jest.fn(async () => []) },
  };
  const engine: any = {
    respond: jest.fn(async () => { throw new Error('model off for these tests'); }),
    extract: jest.fn(async (_s: string, history: any[]) => extract(String(history[0]?.content ?? ''))),
  };
  const contextChat = jest.fn(async () => ({ reply: 'How long should this run?', gaps: ['timeline'], done: false, proposal: null, openQuestion: 'How long should this run?' }));
  const addContextLine = jest.fn(async () => ({}));
  const groundsService: any = { contextChat, addContextLine, applyContextProposal: jest.fn(), mayOpenSetupChatFor: jest.fn(async () => true), questionsForPeople: jest.fn(async () => []), addLeadContext: jest.fn(async () => ({})) };
  const truth: any = { forPerson: async () => ({ person: { externalId: 'u-1' }, sessions: { value: [] } }) };
  const service = new AssistantService(
    prisma, engine, { retrieve: jest.fn(async () => ({ cards: [], truncated: false })) } as any,
    { waitingAcrossTheOrg: async () => ({ waiting: [], waitedOn: [] }) } as any, { statusFor: async () => ({ roleName: null, gates: [], left: [] }) } as any,
    { pendingFor: async () => [], decide: async () => { throw new Error('no'); } } as any, { start: async () => { throw new Error('no'); } } as any,
    truth, { read: async () => ({ read: false, because: 'no' }) } as any, { sendRoundDigest: async () => { throw new Error('no'); } } as any, groundsService,
  );
  return { service, proposals, engine, contextChat, addContextLine, groundsService };
}
const said = (r: any) => (r.blocks ?? []).filter((b: any) => b.type !== 'proposal').map((b: any) => b.body ?? b.label ?? '').filter(Boolean).join(' / ');

describe('B-083: a fact typed while a set-up question is open', () => {
  const fact = (m: string) => (m.includes('Westlands') ? { kind: 'fact', text: FACT } : { kind: 'answer' });

  it('is said back as a line everybody in the check-in reads, with Yes and No, and the set-up conversation is not asked', async () => {
    const { service, proposals, contextChat } = svc(fact);
    const r: any = await service.respond('org-a', 'p1', FACT, 'g1', true);
    expect(contextChat).not.toHaveBeenCalled();
    expect(said(r)).toBe(`Shall I add "${FACT}" to this check-in's context as a note? Everybody in this check-in will read it.`);
    expect(r.blocks.some((b: any) => b.type === 'proposal')).toBe(true);
    expect(said(r)).not.toMatch(/what doing well looks like/i);
    expect(proposals[0].payload).toMatchObject({ groundId: 'g1', kind: 'NOTE', text: FACT });
  });

  it('is also taken when it is the reply to a question that was open, and the question is asked again after the yes', async () => {
    const parkedTurn = { id: 'pt', kind: 'context_turn', state: 'PARKED', payload: { groundId: 'g1', history: [{ role: 'assistant', content: 'How long should this run?' }] } };
    const { service, proposals, contextChat } = svc(fact, { parked: parkedTurn });
    const r: any = await service.respond('org-a', 'p1', 'I do not want to answer that now. I want to add a fact to this check-in. The Westlands depot is closed from 20 to 27 October.', 'g1', true);
    expect(contextChat).not.toHaveBeenCalled();
    expect(said(r)).toMatch(/^Shall I add ".*Westlands.*" to this check-in's context as a note\? Everybody in this check-in will read it\.$/);
    expect(proposals[0].payload.carried.openQuestion).toBe('How long should this run?');
  });

  it('a yes writes the line through the Context page\'s own writer, and the question that was open is asked again', async () => {
    const parked = { id: 'pr1', kind: 'context_line', state: 'PARKED', payload: { groundId: 'g1', kind: 'NOTE', text: FACT, carried: { history: [{ role: 'assistant', content: 'How long should this run?' }], openQuestion: 'How long should this run?' } } };
    const { service, addContextLine, proposals } = svc(() => ({ kind: 'answer' }), { parked });
    const r: any = await service.respond('org-a', 'p1', 'yes', 'g1', true);
    expect(addContextLine).toHaveBeenCalledWith('g1', 'lead-1', { kind: 'NOTE', text: FACT });
    expect(said(r)).toBe('I have added the line to this check-in. Everybody in it can read it now.\n\nHow long should this run?');
    expect(proposals.some((p) => p.kind === 'context_turn')).toBe(true);
  });

  it('a private note about a person is kept for the lead alone, not as a line everyone reads', async () => {
    const { service, proposals } = svc(() => ({ kind: 'private_note', text: 'Amani keeps missing the Friday call', about: 'Amani' }));
    const r: any = await service.respond('org-a', 'p1', 'Amani keeps missing the Friday call and I want to remember that.', 'g1', true);
    expect(said(r)).toBe('Shall I keep "Amani keeps missing the Friday call" as a private note about Amani that only you can see?');
    expect(proposals[0].kind).toBe('lead_note');
  });

  it('a goal or a measure still goes to the set-up conversation, as before', async () => {
    const { service, contextChat } = svc(() => ({ kind: 'answer' }));
    await service.respond('org-a', 'p1', 'We want twelve qualified deals signed by the end of September.', 'g1', true);
    expect(contextChat).toHaveBeenCalledTimes(1);
  });

  it('when the model cannot be read, the words go to the set-up conversation as before and nothing is lost', async () => {
    const { service, contextChat, engine } = svc(() => { throw new Error('no model'); });
    engine.extract.mockRejectedValue(new Error('no model'));
    await service.respond('org-a', 'p1', FACT, 'g1', true);
    expect(contextChat).toHaveBeenCalledTimes(1);
  });

  it('the kept words are the lead\'s own: a rewrite by the model is not kept', async () => {
    const heard = await whatKindOfThingWasSaid({ extract: async () => ({ kind: 'fact', text: 'Depot shut, plan around it' }) } as any, FACT, null);
    expect(heard).toEqual({ kind: 'fact', text: FACT });
  });
});

describe('B-084: adding a document through Ask', () => {
  const none = () => ({ kind: 'answer' });
  it.each([
    'I want to add a document to this check-in.', 'I want to add a document.', 'Add a document', 'I would like to upload a file.', 'Can I attach a PDF?',
  ])('"%s" is a document to add, never a measure', (m) => {
    expect(asksToAddADocument(m)).toBe('wants');
  });
  it('"I have just added it" is a document that was added', () => {
    expect(asksToAddADocument('I have just added the document.')).toBe('did');
    expect(asksToAddADocument('We will add a second depot in Kisumu.')).toBeNull();
  });

  it('gives the lead a file control to draw and says nothing about a paperclip', async () => {
    const { service, contextChat, proposals } = svc(none);
    const r: any = await service.respond('org-a', 'p1', 'I want to add a document to this check-in.', 'g1', true);
    expect(contextChat).not.toHaveBeenCalled();
    expect(proposals.length).toBe(0);
    expect(said(r)).not.toMatch(/paperclip|icon|measure|aim of/i);
    const step = r.blocks.find((b: any) => b.type === 'next_step');
    expect(step).toMatchObject({ kind: 'upload_a_document', id: 'g1', label: 'Choose a file', context: { groundId: 'g1' } });
    expect(said(r)).toBe('It will go on "Kijani deliveries", and only you will be able to see it until you say otherwise. / Choose a file');
  });

  it('after the file is added, says what it read, and keeps nothing', async () => {
    const { service, proposals, groundsService } = svc(none);
    const prisma: any = (service as any).prisma;
    prisma.groundDocument.findFirst = jest.fn(async () => ({ fileName: 'q3-plan.txt', content: 'Q3 plan', holds: { whatItIs: 'the plan for the third quarter' }, visibility: 'OWN' }));
    const r: any = await service.respond('org-a', 'p1', 'I have just added the document.', 'g1', true);
    expect(said(r)).toBe(
      'I have read q3-plan.txt. It looks like the plan for the third quarter. It does not hold a number for anybody, so there is nothing in it for me to record as a target. Only you can read it until you share it. '
      + 'If there is a fact, a rule or a decision in it that you want everybody to know, tell me in a sentence and I will say it back to you first.',
    );
    expect(proposals.length).toBe(0);
    expect(groundsService.addContextLine).not.toHaveBeenCalled();
  });

  it('while the file is still being read, says so', async () => {
    const { service } = svc(none);
    (service as any).prisma.groundDocument.findFirst = jest.fn(async () => ({ fileName: 'q3-plan.txt', content: '', holds: null, visibility: 'OWN' }));
    const r: any = await service.respond('org-a', 'p1', 'I have just added the document.', 'g1', true);
    expect(said(r)).toBe('I am still reading q3-plan.txt. Tell me again that you have added it in a moment, and I will say what I found.');
  });
});
