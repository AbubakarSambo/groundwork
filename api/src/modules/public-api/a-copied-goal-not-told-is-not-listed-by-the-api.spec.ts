import { CommitmentsByApiService } from './commitments-by-api.service';

/**
 * REQUEST 125, SECOND PRIVACY REVIEW, FINDING 1. "GET /api/v1/commitments/mine" listed every row, so a commitment copied before the
 * rule from a goal Amina has not told Tobi about still reached him. It now leaves that copy out, for him and for the machine read of
 * his commitments, and keeps what he promised himself.
 */
const row = (id: string, text: string, source: string | null) => ({
  id, text, dueSaid: null, dueAt: null, state: 'OPEN', source: 'chat', statedAt: new Date('2026-09-02'), resolvedAt: null, subjectExternalId: null, sourcePersonObjectiveId: source,
});
const rows = [row('k1', 'Close eight renewals a quarter', 'pg-untold'), row('k2', 'Send the Westgate quote', 'pg-told'), row('k3', 'Call Mama Fresh', null)];
const GOALS = [{ id: 'pg-untold', awareness: 'NOT_TOLD', authoredBy: 'lead' }, { id: 'pg-told', awareness: 'TOLD', authoredBy: 'lead' }];
const prisma: any = {
  person: { findFirst: jest.fn(async () => ({ externalId: 'ext-tobi' })) },
  commitment: { findMany: jest.fn(async () => rows) },
  personObjective: { findMany: jest.fn(async ({ where }: any) => GOALS.filter((g) => where.id.in.includes(g.id) && (!where.awareness || g.awareness === where.awareness))) },
};

describe('what the API lists as Tobi commitments', () => {
  it('leaves out the copy of a goal not told, for Tobi himself', async () => {
    const out: any = await new CommitmentsByApiService(prisma).mine('org1', 'p-tobi');
    expect(out.open.map((c: any) => c.text)).toEqual(['Send the Westgate quote', 'Call Mama Fresh']);
    expect(JSON.stringify(out)).not.toContain('eight renewals');
  });

  it('leaves it out of the machine read of his commitments too', async () => {
    const out: any = await new CommitmentsByApiService(prisma).forPerson('org1', 'ext-tobi');
    expect(out.open.map((c: any) => c.text)).toEqual(['Send the Westgate quote', 'Call Mama Fresh']);
  });
});
