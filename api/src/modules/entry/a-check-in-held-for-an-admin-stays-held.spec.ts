import { EntryService } from './entry.service';

/**
 * A CHECK-IN MADE ON THE SCREEN WAITS FOR AN ADMIN, AS ONE MADE BY POST /grounds DOES (user journeys, F-8).
 *
 * `grounds.create` holds a check-in (AWAITING_APPROVAL) when the organisation says new check-ins wait and the person is not an admin.
 * The save from the entry chat then moved a check-in with nobody named on it to ACTIVE, which lifted the hold: the lead added people from
 * the settings page and the invitations went out before any admin had said yes. The hold now stays, whether or not anybody is named.
 */
function makeService(role: string, needsApproval: boolean) {
  const prisma: any = {
    user: { findUnique: jest.fn(async () => ({ role, email: 'wairimu@kito.test' })) },
    organization: { findUnique: jest.fn(async () => ({ whoMayOpenCheckIns: 'NAMED_LEADS', checkInsNeedApproval: needsApproval })), update: jest.fn(async () => ({})) },
    platformSetting: { findUnique: jest.fn(async () => null) },
    entryDraft: { findUnique: jest.fn(async () => null), updateMany: jest.fn(async () => ({ count: 0 })) },
    groundParticipant: { findMany: jest.fn(async () => [{ id: 'p1' }]), findFirst: jest.fn(async () => ({ id: 'p1' })), update: jest.fn(async () => ({})), updateMany: jest.fn(async () => ({})) },
    roundCompletion: { create: jest.fn(async (a: any) => a.data) },
    checkIn: { count: jest.fn(async () => 1), findFirst: jest.fn(async () => ({ id: 'ci1' })), update: jest.fn(async () => ({})) },
    conversationTurn: { createMany: jest.fn(async () => ({ count: 0 })) },
    leadContextNote: { create: jest.fn(async () => ({})) },
    ground: { update: jest.fn(async () => ({})), findUnique: jest.fn(async () => ({ joinToken: 'jt' })) },
  };
  const grounds: any = { create: jest.fn(async () => ({ id: 'g1', joinToken: 'jt' })), createForLead: jest.fn(), addParticipant: jest.fn(async () => ({})) };
  const conversation: any = { extractRecordEntries: jest.fn(async () => undefined), extractExpectations: jest.fn(async () => undefined), ensureNextSession: jest.fn(async () => undefined), buildSoloArtifact: jest.fn(async () => undefined) };
  const service = new EntryService({} as any, prisma, grounds, {} as any, {} as any, conversation, { emit: jest.fn() } as any);
  return { service, prisma, grounds };
}
const save = (service: EntryService) =>
  service.commit('org1', 'user1', { groundLabel: 'Sales team', scenario: 'OKR_ALIGNMENT', history: [{ role: 'user', content: 'hi' }] as any, report: null, contributors: [] } as any);
const movedToActive = (prisma: any) => prisma.ground.update.mock.calls.some((c: any[]) => c[0]?.data?.status === 'ACTIVE');

describe('a lead saving a check-in with nobody named, in an organisation where new check-ins wait for an admin', () => {
  it('asks for it to be held, by the same rule as POST /grounds, and does not lift the hold', async () => {
    const { service, prisma, grounds } = makeService('LEAD', true);
    await save(service);
    expect(grounds.create.mock.calls[0][3]).toBe('LEAD');
    expect(movedToActive(prisma)).toBe(false);
  });
});

describe('everybody the hold does not apply to', () => {
  it('an admin still gets a check-in that runs at once', async () => {
    const { service, prisma } = makeService('ADMIN', true);
    await save(service);
    expect(movedToActive(prisma)).toBe(true);
  });
  it('a lead in an organisation that does not hold check-ins still gets one that runs at once', async () => {
    const { service, prisma } = makeService('LEAD', false);
    await save(service);
    expect(movedToActive(prisma)).toBe(true);
  });
});
