import { EntryService } from './entry.service';

/**
 * GW-ENTRY-LEAD tripwire.
 *
 * The coordinator/lead commit path must route through the EXISTING for-lead
 * machinery and must NOT fabricate any activity for the coordinator:
 *   - grounds.createForLead is called (AWAITING_LEAD, lead invited to confirm),
 *     with contributors mapped to pre-added participants,
 *   - the normal self-serve path (grounds.create, transcript persistence,
 *     session-1 completion, solo report storage) is never touched,
 *   - the coordinator's note becomes a LeadContextNote (about the ground),
 *   - NO conversation turns and NO check-in updates are written - the
 *     coordinator had no session, and the record must not pretend they did.
 */
function makeService() {
  const prisma: any = {
    organization: { update: jest.fn(async () => ({})) },
    leadContextNote: { create: jest.fn(async () => ({ id: 'note1' })) },
    groundParticipant: { findFirst: jest.fn(async () => ({ id: 'p1' })), update: jest.fn(async () => ({})) },
    checkIn: { findFirst: jest.fn(async () => ({ id: 'ci1' })), update: jest.fn(async () => ({})) },
    conversationTurn: { createMany: jest.fn(async () => ({ count: 0 })) },
    ground: { findUnique: jest.fn(async () => ({ joinToken: 'jt' })), update: jest.fn(async () => ({})) },
    entryDraft: { findUnique: jest.fn(async () => null), updateMany: jest.fn(async () => ({ count: 0 })) },
  };
  const grounds: any = {
    create: jest.fn(async () => ({ id: 'g-self' })),
    createForLead: jest.fn(async () => ({ id: 'g-lead', joinToken: 'lead-jt' })),
    addParticipant: jest.fn(async () => ({})),
  };
  const service = new EntryService(
    {} as any, // anthropic
    prisma,
    grounds,
    {} as any, // jwt
    {} as any, // email
    {} as any, // conversation
    {} as any, // events
  );
  return { service, prisma, grounds };
}

describe('GW-ENTRY-LEAD: coordinator commit routes through for-lead, fabricates nothing', () => {
  const baseDto = {
    groundLabel: 'Q3 alignment',
    orgName: 'Acme',
    scenario: 'NEW_PROJECT',
    history: [] as any[],
    report: null,
    brief: 'What this ground is for: the Q3 build',
    lead: { email: 'lead@acme.test', name: 'Priya', contextNote: 'She joined last month.' },
    contributors: [
      { email: 'dev@acme.test', context: 'Engineer' },
      { email: 'des@acme.test' },
    ],
  };

  it('routes through createForLead with the lead, brief, and pre-added participants', async () => {
    const { service, grounds } = makeService();
    const res = await service.commit('org1', 'admin1', baseDto as any);

    expect(grounds.createForLead).toHaveBeenCalledTimes(1);
    const arg = grounds.createForLead.mock.calls[0];
    expect(arg[0]).toBe('org1');
    expect(arg[1]).toBe('admin1');
    expect(arg[2]).toMatchObject({
      leadEmail: 'lead@acme.test',
      leadName: 'Priya',
      label: 'Q3 alignment',
      brief: 'What this ground is for: the Q3 build',
      participants: [
        { email: 'dev@acme.test', roleAsDescribed: 'Engineer' },
        { email: 'des@acme.test', roleAsDescribed: undefined },
      ],
    });
    expect(res.groundId).toBe('g-lead');
    expect(res.joinToken).toBe('lead-jt');
  });

  it('never touches the self-serve path or fabricates coordinator activity', async () => {
    const { service, grounds, prisma } = makeService();
    await service.commit('org1', 'admin1', baseDto as any);

    expect(grounds.create).not.toHaveBeenCalled(); // no self-serve ground
    expect(grounds.addParticipant).not.toHaveBeenCalled(); // contributors go via createForLead
    expect(prisma.conversationTurn.createMany).not.toHaveBeenCalled(); // no fake transcript
    expect(prisma.checkIn.update).not.toHaveBeenCalled(); // no phantom completed session
    expect(prisma.groundParticipant.update).not.toHaveBeenCalled(); // no solo report stored
  });

  it("stores the coordinator's note as a LeadContextNote about the ground", async () => {
    const { service, prisma } = makeService();
    await service.commit('org1', 'admin1', baseDto as any);

    expect(prisma.leadContextNote.create).toHaveBeenCalledWith({
      data: { groundId: 'g-lead', authorUserId: 'admin1', text: 'She joined last month.' },
    });
  });

  it('skips the note when none was written', async () => {
    const { service, prisma } = makeService();
    await service.commit('org1', 'admin1', { ...baseDto, lead: { email: 'lead@acme.test' } } as any);
    expect(prisma.leadContextNote.create).not.toHaveBeenCalled();
  });
});
