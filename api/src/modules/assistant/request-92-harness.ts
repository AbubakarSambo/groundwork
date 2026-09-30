import { AssistantService } from './assistant.service';

/**
 * A real `AssistantService` over a fake prisma, for the tests of request 92 (the live checks of Ask
 * Groundwork). Only what a test passes in is faked: the lead is `lead-1`, who runs "Sales team, Q3"
 * (`g1`). Whatever `GroundsService` is given is the test's own.
 */
export function askGroundwork(opts: {
  userId?: string;
  role?: string;
  sessions?: { groundId: string; label: string; checkInId: string; standing: string }[];
  groundsService?: any;
  engine?: any;
  parked?: any;
  grounds?: { id: string; label: string; initiatorId: string; organizationId: string }[];
  groundRows?: Record<string, any>;
} = {}) {
  const grounds = opts.grounds ?? [{ id: 'g1', label: 'Sales team, Q3', initiatorId: 'lead-1', organizationId: 'org-a' }];
  const created: any[] = [];
  const prisma: any = {
    person: { findFirst: jest.fn(async () => ({ id: 'p1', externalId: 'u-1', displayName: 'Rukia Otieno', active: true, linkedUserId: opts.userId ?? 'lead-1' })) },
    user: { findUnique: jest.fn(async () => ({ role: opts.role ?? 'MEMBER', organizationId: 'org-a' })) },
    ground: {
      findMany: jest.fn(async () => grounds),
      findFirst: jest.fn(async ({ where }: any) => grounds.find((g) => g.id === where.id) ?? null),
    },
    groundParticipant: { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null) },
    groundDocument: { findMany: jest.fn(async () => []), create: jest.fn(async () => ({ id: 'd1' })) },
    documentElsewhere: { create: jest.fn(async () => ({ id: 'e1' })) },
    assistantTurn: { count: jest.fn(async () => 5), createMany: jest.fn(async () => ({ count: 2 })), findMany: jest.fn(async () => []) },
    assistantProposal: {
      findFirst: jest.fn(async () => opts.parked ?? null),
      create: jest.fn(async ({ data }: any) => {
        const row = { id: `pr${created.length + 1}`, state: 'PARKED', ...data };
        created.push(row);
        return row;
      }),
      update: jest.fn(async ({ data }: any) => data),
    },
    commitment: { create: jest.fn(async () => ({})), findUnique: jest.fn(async () => null), findMany: jest.fn(async () => []) },
    subject: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
    detectionQuietPeriod: { findMany: jest.fn(async () => []) },
  };
  const truth: any = {
    forPerson: async () => ({ sessions: { value: opts.sessions ?? [] } }),
  };
  const engine: any = opts.engine ?? { respond: jest.fn(async () => { throw new Error('model off for these tests'); }) };
  const service = new AssistantService(
    prisma, engine, { retrieve: jest.fn(async () => ({ cards: [], truncated: false })) } as any,
    { waitingAcrossTheOrg: async () => ({ waiting: [], waitedOn: [] }) } as any,
    { statusFor: async () => ({ roleName: null, gates: [], left: [] }) } as any,
    { pendingFor: async () => [], decide: async () => { throw new Error('no suggestions in these tests'); } } as any,
    { start: async () => { throw new Error('no drafting in these tests'); } } as any,
    truth,
    { read: async () => ({ read: false, because: 'no reading in these tests' }) } as any,
    { sendRoundDigest: async () => { throw new Error('no mail in these tests'); } } as any,
    (opts.groundsService ?? {}) as any,
  );
  return { service, prisma, created };
}

export const textOf = (reply: any) => reply.blocks.filter((b: any) => b.type === 'text').map((b: any) => b.body).join('\n');
