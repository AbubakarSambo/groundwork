import { AssistantService } from './assistant.service';

/**
 * B-028: "Tell me what you can see" put an internal name where the source goes ("groundwork-chat, last
 * updated ...") and counted only the people on the roster, so an organisation of 19 read "15 people".
 * The source is said in plain words and the people are everyone who belongs to the organisation.
 */
function svc(source: string, rosterRows: number, members: number, linked = rosterRows) {
  const prisma: any = {
    subject: { findMany: jest.fn(async () => [{ sourceSystem: source, syncedAt: new Date(), sourceDeletedAt: null }]), count: jest.fn(async () => 1) },
    person: {
      count: jest.fn(async () => rosterRows), findFirst: jest.fn(async () => ({ externalId: 'u-1' })),
      findMany: jest.fn(async () => Array.from({ length: linked }, (_, i) => ({ linkedUserId: `u${i + 1}` }))),
    },
    organizationMembership: { findMany: jest.fn(async () => Array.from({ length: members }, (_, i) => ({ userId: `u${i + 1}` }))) },
    detectionQuietPeriod: { findMany: jest.fn(async () => []) },
    assistantProposal: { findFirst: jest.fn(async () => null), create: jest.fn(async (a: any) => ({ id: 'pr1', ...a.data })), update: jest.fn(async () => ({})) },
    assistantTurn: { count: jest.fn(async () => 5), createMany: jest.fn(async () => ({ count: 2 })) },
  };
  const knowledge: any = { retrieve: jest.fn(async () => ({ cards: [], truncated: false })) };
  const engine: any = { respond: jest.fn(async () => { throw new Error('no model in this test'); }) };
  return { service: new AssistantService(prisma, engine, knowledge, { waitingAcrossTheOrg: async () => ({ waiting: [], waitedOn: [] }) } as any, { statusFor: async () => ({ roleName: null, gates: [], left: [] }) } as any, { pendingFor: async () => [], decide: async () => { throw new Error('no suggestions in these tests'); } } as any, { start: async () => { throw new Error('no drafting in these tests'); } } as any, { forPerson: async () => { throw new Error('no assembly in these tests'); } } as any, { read: async () => ({ read: false, because: 'no reading in these tests' }) } as any, { sendRoundDigest: async () => { throw new Error('no mail in these tests'); } } as any, { create: async () => { throw new Error('no ground creation in these tests'); }, addParticipant: async () => { throw new Error('no ground creation in these tests'); } } as any), engine };
}
const body = async (s: AssistantService) => String(((await s.respond('org-a', 'p1', 'what can you see?')).blocks[0] as any).body);

describe('what the assistant says it can see', () => {
  it('names what people told Groundwork in plain words, never the internal source name', async () => {
    for (const source of ['groundwork-chat', 'groundwork-panel', 'groundwork', 'panel', 'gwc_179490422d0717f67812f3de', 'seed']) {
      const said = await body(svc(source, 15, 15).service);
      expect(said).toContain('What you have told Groundwork, last updated');
      expect(said).not.toContain(`${source}, last updated`);
      expect(said).not.toContain(`${source} last`);
    }
  });

  it("leaves a customer's own system under its own name", async () => {
    expect(await body(svc('workday', 15, 15).service)).toContain('workday, last updated');
  });

  it('counts everyone who belongs to the organisation, not only the roster rows', async () => {
    const said = await body(svc('groundwork-chat', 15, 19).service);
    expect(said).toContain('and 19 people.');
    expect(said).not.toContain('15 people');
  });

  it('does not count a person twice when the roster and the membership are the same person', async () => {
    expect(await body(svc('groundwork-chat', 15, 15).service)).toContain('and 15 people.');
  });
});
