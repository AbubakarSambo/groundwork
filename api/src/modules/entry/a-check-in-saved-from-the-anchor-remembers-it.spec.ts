import { EntryService } from './entry.service';

/**
 * A CHECK-IN SAVED FROM THE ANCHOR CONVERSATION REMEMBERS IT (anchor piece 15), so the weeks after it
 * read as the anchor's weeks. Written only when the lead saved the anchor conversation and the anchor
 * switch is on; every other check-in leaves the mark empty.
 */
function makeService(switchOn: boolean) {
  const prisma: any = {
    user: { findUnique: jest.fn(async () => ({ role: 'ADMIN' })) },
    organization: { findUnique: jest.fn(async () => ({ whoMayOpenCheckIns: 'NAMED_LEADS', checkInsNeedApproval: true })), update: jest.fn(async () => ({})) },
    platformSetting: { findUnique: jest.fn(async () => (switchOn ? { value: { on: true } } : { value: { on: false } })) },
    entryDraft: { findUnique: jest.fn(async () => null), updateMany: jest.fn(async () => ({ count: 0 })) },
    groundParticipant: { findMany: jest.fn(async () => [{ id: 'p1' }]), findFirst: jest.fn(async () => ({ id: 'p1' })), update: jest.fn(async () => ({})) },
    roundCompletion: { create: jest.fn(async (a: any) => a.data) },
    checkIn: { count: jest.fn(async () => 1), findFirst: jest.fn(async () => ({ id: 'ci1' })), update: jest.fn(async () => ({})) },
    conversationTurn: { createMany: jest.fn(async () => ({ count: 0 })) },
    leadContextNote: { create: jest.fn(async () => ({})) },
    ground: { update: jest.fn(async () => ({})), findUnique: jest.fn(async () => ({ joinToken: 'jt' })) },
  };
  const grounds: any = { create: jest.fn(async () => ({ id: 'g-self', joinToken: 'jt' })), createForLead: jest.fn(), addParticipant: jest.fn(async () => ({})) };
  const conversation: any = { extractRecordEntries: jest.fn(async () => undefined), extractExpectations: jest.fn(async () => undefined), ensureNextSession: jest.fn(async () => undefined), buildSoloArtifact: jest.fn(async () => undefined) };
  const service = new EntryService({} as any, prisma, grounds, {} as any, {} as any, conversation, { emit: jest.fn() } as any);
  return { service, prisma };
}
const save = (service: EntryService, scenario: string) =>
  service.commit('org1', 'user1', { groundLabel: 'Help my team understand', scenario, cadence: 'ONE_TIME', cadenceChosen: true, history: [{ role: 'user', content: 'hi' }] as any, report: null, contributors: [] } as any);
const markWrites = (prisma: any) => prisma.ground.update.mock.calls.filter((c: any[]) => c[0]?.data?.startedFrom !== undefined);

describe('saving the anchor conversation', () => {
  it('marks the check-in as started from the anchor, once, when the switch is on', async () => {
    const { service, prisma } = makeService(true);
    await save(service, 'HELP_TEAM_UNDERSTAND');
    expect(markWrites(prisma)).toEqual([[{ where: { id: 'g-self' }, data: { startedFrom: 'anchor' } }]]);
  });

  it('leaves the mark empty when the switch is off', async () => {
    const { service, prisma } = makeService(false);
    await save(service, 'HELP_TEAM_UNDERSTAND');
    expect(markWrites(prisma)).toEqual([]);
  });

  it('leaves the mark empty for every other situation, switch on or off', async () => {
    for (const on of [false, true]) {
      const { service, prisma } = makeService(on);
      await save(service, 'NEW_PROJECT');
      expect(markWrites(prisma)).toEqual([]);
    }
  });
});
