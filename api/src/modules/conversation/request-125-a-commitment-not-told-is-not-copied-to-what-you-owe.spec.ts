import { ConversationService } from './conversation.service';
import { PartyType, TurnRole } from '@prisma/client';

/**
 * REQUEST 125, FINDING 3 (decisions 48 and 56). Amina said Tobi is to close eight renewals a quarter, a commitment, and has not told him.
 * The conversation copied it to the organisation's commitments at once, and Tobi read it under what he owes. It is copied only once she says
 * she has told him.
 */
function service(prior: any = null, awareness = 'NOT_TOLD') {
  const mirrored: any[] = [];
  const participants = [
    { id: 'lead', partyType: PartyType.INITIATOR, managingOnly: false, email: 'amina@x.test', roleAsDescribed: null, user: { firstName: 'Amina', lastName: 'Bello' } },
    { id: 'tobi', partyType: PartyType.PARTICIPANT, managingOnly: false, email: 'tobi@x.test', roleAsDescribed: null, user: { firstName: 'Tobi', lastName: 'Adewale' } },
  ];
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => ({ participants })) },
    conversationTurn: { findMany: jest.fn(async () => [{ role: TurnRole.PERSON, content: 'Tobi is to close eight renewals a quarter.' }]) },
    personObjective: {
      findFirst: jest.fn(async () => prior), create: jest.fn(async (a: any) => ({ id: 'new-1', ...a.data })), update: jest.fn(async (a: any) => a), findUnique: jest.fn(async () => prior),
    },
    groundObjective: { count: jest.fn(async () => 0), findMany: jest.fn(async () => [] as any[]), createMany: jest.fn(async () => ({ count: 1 })) },
    groundParticipant: { findUnique: jest.fn(async () => ({ email: 'tobi@x.test', userId: 'u-tobi', ground: { organizationId: 'org1' } })) },
    person: { findFirst: jest.fn(async () => ({ externalId: 'ext-tobi' })) },
    commitment: { upsert: jest.fn(async (a: any) => { mirrored.push(a.create); return a; }) },
  };
  const anthropic: any = { extract: jest.fn(async () => ({ groundAims: [], expectations: [{ personName: 'Tobi', expectation: 'Close eight renewals a quarter', kind: 'COMMITMENT', awareness }] })) };
  const svc = new ConversationService(prisma, {} as any, anthropic, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  return { svc, mirrored };
}

describe('a commitment the lead has not told the person about', () => {
  it('is not copied to the organisation\'s commitments, so it is not in what Tobi owes', async () => {
    const { svc, mirrored } = service();
    await svc.extractExpectations('c1', 'lead', 'g1');
    expect(mirrored).toEqual([]);
  });

  it('is copied once Amina says she has told him', async () => {
    const told = service({ id: 'pg-1', text: 'Close eight renewals a quarter', trackedUrl: null, awareness: 'NOT_TOLD', authoredBy: 'lead' }, 'TOLD');
    await told.svc.extractExpectations('c1', 'lead', 'g1');
    expect(told.mirrored.map((c) => c.text)).toEqual(['Close eight renewals a quarter']);
  });

  it('is copied at once when she says she has already told him', async () => {
    const { svc, mirrored } = service(null, 'TOLD');
    await svc.extractExpectations('c1', 'lead', 'g1');
    expect(mirrored.map((c) => c.text)).toEqual(['Close eight renewals a quarter']);
  });
});
