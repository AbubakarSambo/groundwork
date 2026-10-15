import { AssistantService } from './assistant.service';

/**
 * DUMPS AND DOCUMENTS (4 October 2026), fault 6: A PASTE WAS WRITTEN ON THE WRONG CHECK-IN.
 *
 * Found by running four dumps for one lead: a setup conversation left open on one check-in was
 * answered by whatever the lead said next in Ask Groundwork, even from another check-in's page. The
 * whole sales update was read as the answer to the earlier check-in's question and written there,
 * and the check-in it was pasted on got nothing.
 */
const DUMP = 'Weekly sales update. Samuel Okoro is at N31m and I want him at N45m. '.repeat(8);

function aLeadWithTwoCheckIns(parked: any) {
  const proposals: any[] = [];
  const contextChat = jest.fn(async () => ({ reply: '', gaps: [], done: false, proposal: { kind: 'everything', say: 'Here is what I took from that.\n\nRecord all of this?' } }));
  const prisma: any = {
    platformSetting: { findUnique: async ({ where }: any) => (where.key === 'release.contextInAskGroundwork' ? { value: { on: true } } : null) },
    person: { findFirst: async () => ({ id: 'p1', externalId: 'u-1', active: true, linkedUserId: 'lead-1' }) },
    user: { findUnique: async () => ({ role: 'MEMBER', organizationId: 'org-a' }) },
    ground: { findMany: async () => [
      { id: 'gA', label: 'Q3 sales', initiatorId: 'lead-1', organizationId: 'org-a', scenario: 'OKR_ALIGNMENT' },
      { id: 'gB', label: 'Q4 sales', initiatorId: 'lead-1', organizationId: 'org-a', scenario: 'OKR_ALIGNMENT' },
    ] },
    assistantTurn: { count: async () => 5, createMany: async () => ({ count: 2 }) },
    assistantProposal: {
      findFirst: jest.fn(async () => parked),
      create: jest.fn(async ({ data }: any) => { const r = { id: `new${proposals.length}`, state: 'PARKED', ...data }; proposals.push(r); return r; }),
      update: jest.fn(async ({ where, data }: any) => { proposals.push({ id: where.id, ...data }); return data; }),
    },
    commitment: { create: async () => ({}), findUnique: async () => null, findMany: async () => [] },
    subject: { findMany: async () => [], count: async () => 0 },
    detectionQuietPeriod: { findMany: async () => [] },
  };
  const groundsService: any = {
    contextChat, applyContextProposal: jest.fn(async () => ({ changed: 'everything', say: 'Recorded.' })), declineContextOffer: jest.fn(),
    questionsForPeople: async () => [], mayOpenSetupChatFor: jest.fn(async () => true),
  };
  const service = new AssistantService(
    prisma, { respond: async () => { throw new Error('model off'); } } as any, { retrieve: async () => ({ cards: [], truncated: false }) } as any,
    { waitingAcrossTheOrg: async () => ({ waiting: [], waitedOn: [] }) } as any, { statusFor: async () => ({ roleName: null, gates: [], left: [] }) } as any,
    { pendingFor: async () => [], decide: async () => { throw new Error('x'); } } as any, { start: async () => { throw new Error('x'); } } as any,
    { forPerson: async () => { throw new Error('x'); } } as any, { read: async () => ({ read: false, because: 'x' }) } as any,
    { sendRoundDigest: async () => { throw new Error('x'); } } as any, groundsService,
  );
  return { service, contextChat, proposals, prisma };
}

describe('a paste is for the check-in it was pasted on', () => {
  it('a setup turn left open on another check-in is let go, and the paste is read for the check-in named', async () => {
    const left = { id: 'old', kind: 'context_turn', state: 'PARKED', payload: { groundId: 'gA', history: [{ role: 'assistant', content: 'How long should it run?' }] } };
    const { service, contextChat, prisma } = aLeadWithTwoCheckIns(left);
    await service.respond('org-a', 'p1', DUMP, 'gB', true);
    expect(contextChat).toHaveBeenCalledTimes(1);
    expect(contextChat).toHaveBeenCalledWith('gB', 'lead-1', [{ role: 'user', content: DUMP }], { yesOrNo: true });
    expect(prisma.assistantProposal.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'old' }, data: expect.objectContaining({ state: 'DROPPED' }) }));
  });

  it('a yes waiting on another check-in is let go for a long paste, because a long paste is never a yes', async () => {
    const left = { id: 'old', kind: 'context', state: 'PARKED', payload: { groundId: 'gA', said: 'x', history: [] } };
    const { service, contextChat } = aLeadWithTwoCheckIns(left);
    await service.respond('org-a', 'p1', DUMP, 'gB', true);
    expect(contextChat).toHaveBeenCalledWith('gB', 'lead-1', expect.anything(), { yesOrNo: true });
  });

  it('a setup turn on the SAME check-in still takes the next message as its answer', async () => {
    const left = { id: 'old', kind: 'context_turn', state: 'PARKED', payload: { groundId: 'gB', history: [{ role: 'assistant', content: 'How long should it run?' }] } };
    const { service, contextChat } = aLeadWithTwoCheckIns(left);
    await service.respond('org-a', 'p1', 'twelve weeks', 'gB', true);
    expect(contextChat).toHaveBeenCalledWith('gB', 'lead-1', [{ role: 'assistant', content: 'How long should it run?' }, { role: 'user', content: 'twelve weeks' }], { yesOrNo: true });
  });
});
