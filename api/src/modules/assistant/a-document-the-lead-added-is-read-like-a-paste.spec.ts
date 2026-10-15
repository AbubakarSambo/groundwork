import { AssistantService } from './assistant.service';

/**
 * DUMPS AND DOCUMENTS (4 October 2026), fault 5: A DOCUMENT'S NUMBERS WERE SAID BACK AND NOTHING ELSE.
 *
 * A lead added a quarter's update as a document and told Ask Groundwork so. Ask Groundwork said back
 * the numbers in it, and nothing else: none of its dates, decisions, rules, questions for people or
 * what it expects of each person, which the same words pasted into the box would have given. A
 * document the lead added to a check-in they run is now read the way a paste is, said back the same
 * way, written on the lead's yes, and its numbers are then not offered a second time. Anybody else's
 * own document is unchanged: its numbers, for them.
 */
const DOC = 'Weekly sales update. Samuel Okoro is at N31m and I want him at N45m. Ngozi has not sent the Client B proposal. '.repeat(6);

const HOLDS = {
  waiting: [{ name: 'Sales', target: 45, ownerParticipantId: 'x' }], takenAt: null, dates: [], unmatched: [], fileName: 'q4.txt', whatItIs: 'An update.',
  forEverybody: [{ by: null, kind: 'to reach', what: 'Sales', target: 45 }], forOnePerson: [],
};

function aLeadAddingADocument(over: { runsIt?: boolean; holds?: any } = {}) {
  const updates: any[] = [];
  const contextChat = jest.fn(async () => ({ reply: '', gaps: [], done: false, proposal: { kind: 'everything', say: 'Here is what I took from that.\n\nRecord all of this?' } }));
  const applyContextProposal = jest.fn(async () => ({ changed: 'everything', say: 'Recorded.' }));
  let parked: any = null;
  const prisma: any = {
    platformSetting: { findUnique: async ({ where }: any) => (where.key === 'release.contextInAskGroundwork' ? { value: { on: true } } : null) },
    person: { findFirst: async () => ({ id: 'p1', externalId: 'u-1', active: true, linkedUserId: 'lead-1' }) },
    user: { findUnique: async () => ({ role: 'MEMBER', organizationId: 'org-a' }) },
    ground: { findMany: async () => [{ id: 'g1', label: 'Q4 sales', initiatorId: 'lead-1', organizationId: 'org-a', scenario: 'OKR_ALIGNMENT' }] },
    groundParticipant: { findMany: async () => [{ id: 'part-lead', groundId: 'g1' }] },
    groundDocument: {
      findMany: async () => [{ id: 'd1', groundId: 'g1', content: DOC, holds: over.holds === undefined ? { ...HOLDS } : over.holds }],
      findUnique: async () => ({ holds: { ...HOLDS } }),
      update: jest.fn(async (a: any) => { updates.push(a); return {}; }),
    },
    assistantTurn: { count: async () => 5, createMany: async () => ({ count: 2 }) },
    assistantProposal: {
      findFirst: jest.fn(async () => parked),
      create: jest.fn(async ({ data }: any) => { parked = { id: 'pr1', state: 'PARKED', ...data }; return parked; }),
      update: jest.fn(async () => ({})),
    },
    commitment: { create: async () => ({}), findUnique: async () => null, findMany: async () => [] },
    subject: { findMany: async () => [], count: async () => 0 },
    detectionQuietPeriod: { findMany: async () => [] },
  };
  const groundsService: any = {
    contextChat, applyContextProposal, declineContextOffer: jest.fn(), questionsForPeople: async () => [],
    mayOpenSetupChatFor: jest.fn(async () => over.runsIt !== false),
  };
  const service = new AssistantService(
    prisma, { respond: async () => { throw new Error('model off'); } } as any, { retrieve: async () => ({ cards: [], truncated: false }) } as any,
    { waitingAcrossTheOrg: async () => ({ waiting: [], waitedOn: [] }) } as any, { statusFor: async () => ({ roleName: null, gates: [], left: [] }) } as any,
    { pendingFor: async () => [], decide: async () => { throw new Error('x'); } } as any, { start: async () => { throw new Error('x'); } } as any,
    { forPerson: async () => { throw new Error('x'); } } as any, { read: async () => ({ read: false, because: 'x' }) } as any,
    { sendRoundDigest: async () => { throw new Error('x'); } } as any, groundsService,
  );
  return { service, contextChat, applyContextProposal, updates, prisma };
}

describe('a document the lead added to a check-in they run', () => {
  it('is read as a paste is, and said back as one list with a yes', async () => {
    const { service, contextChat, prisma } = aLeadAddingADocument();
    const r: any = await service.respond('org-a', 'p1', 'I have just added the Q4 sales update', 'g1');
    expect(r.lane).toBe('add_context');
    expect(contextChat).toHaveBeenCalledWith('g1', 'lead-1', [{ role: 'user', content: DOC.trim() }], { yesOrNo: true });
    expect(r.blocks.some((b: any) => b.type === 'proposal')).toBe(true);
    expect(prisma.assistantProposal.create.mock.calls[0][0].data.payload.documentId).toBe('d1');
  });

  it('writes on the yes what a paste writes, and marks the document taken so its numbers are not offered again', async () => {
    const { service, applyContextProposal, updates } = aLeadAddingADocument();
    await service.respond('org-a', 'p1', 'I have just added the Q4 sales update', 'g1');
    await service.respond('org-a', 'p1', 'yes');
    expect(applyContextProposal).toHaveBeenCalledWith('g1', 'lead-1', expect.objectContaining({ said: DOC.trim() }));
    expect(updates).toHaveLength(1);
    expect(updates[0].data.holds.takenAt).toEqual(expect.any(String));
    expect(updates[0].data.holds.wholeAt).toEqual(expect.any(String));
    expect(updates[0].data.holds.waiting).toHaveLength(1);
  });

  it('a no writes nothing and marks nothing', async () => {
    const { service, applyContextProposal, updates } = aLeadAddingADocument();
    await service.respond('org-a', 'p1', 'I have just added the Q4 sales update', 'g1');
    await service.respond('org-a', 'p1', 'no');
    expect(applyContextProposal).not.toHaveBeenCalled();
    expect(updates).toEqual([]);
  });

  it('a document already taken is not read again', async () => {
    const { service, contextChat } = aLeadAddingADocument({ holds: { waiting: [], takenAt: '2026-10-04T00:00:00.000Z', wholeAt: '2026-10-04T00:00:00.000Z' } });
    await service.respond('org-a', 'p1', 'I have just added the Q4 sales update', 'g1');
    expect(contextChat).not.toHaveBeenCalled();
  });

  it('somebody who does not run the check-in keeps the old way: their own numbers, never the whole document', async () => {
    const { service, contextChat } = aLeadAddingADocument({ runsIt: false });
    await service.respond('org-a', 'p1', 'I have just added the Q4 sales update', 'g1');
    expect(contextChat).not.toHaveBeenCalled();
  });
});
