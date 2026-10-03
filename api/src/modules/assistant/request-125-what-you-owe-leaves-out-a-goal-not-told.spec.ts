import { withoutCommitmentsFromGoalsNotToldYet } from '../grounds/a-commitment-from-a-goal-not-told-is-not-read-by-its-person';
import { MyOwnRecordService } from '../people/my-own-record.service';

/**
 * REQUEST 125, FINDING 3, THE READS. Rows copied before the rule: Tobi's commitment "Close eight renewals a quarter" came from a goal
 * Amina has not told him about. He does not read it in Ask Groundwork's "what you owe", the embed's opening line or his own record, and he
 * still reads what he promised himself.
 */
const rows = [
  { id: 'k1', text: 'Close eight renewals a quarter', state: 'OPEN', dueSaid: null, dueAt: null, statedAt: new Date('2026-09-01'), resolvedAt: null, lastFollowedUpAt: null, sourcePersonObjectiveId: 'pg-untold' },
  { id: 'k2', text: 'Send the Westgate quote', state: 'OPEN', dueSaid: 'Friday', dueAt: null, statedAt: new Date('2026-09-02'), resolvedAt: null, lastFollowedUpAt: null, sourcePersonObjectiveId: 'pg-told' },
  { id: 'k3', text: 'Call Mama Fresh', state: 'OPEN', dueSaid: null, dueAt: null, statedAt: new Date('2026-09-03'), resolvedAt: null, lastFollowedUpAt: null, sourcePersonObjectiveId: null },
];
const GOALS = [
  { id: 'pg-untold', awareness: 'NOT_TOLD', authoredBy: 'lead' },
  { id: 'pg-told', awareness: 'TOLD', authoredBy: 'lead' },
];
const prisma: any = {
  personObjective: { findMany: jest.fn(async ({ where }: any) => GOALS.filter((g) => where.id.in.includes(g.id) && (!where.awareness || g.awareness === where.awareness))) },
};

describe('what Tobi owes', () => {
  it('leaves out the copy of a goal not told, and keeps the rest', async () => {
    expect((await withoutCommitmentsFromGoalsNotToldYet(prisma, rows)).map((r) => r.text)).toEqual(['Send the Westgate quote', 'Call Mama Fresh']);
  });

  it('is left out of his own record', async () => {
    const p: any = {
      ...prisma,
      user: { findUnique: jest.fn(async () => ({ email: 't@x.test', organizationId: 'org1' })) },
      person: { findFirst: jest.fn(async () => ({ externalId: 'ext-tobi', timezone: null })) },
      commitment: { findMany: jest.fn(async () => rows) },
      contribution: { findMany: async () => [] }, detectorResult: { findMany: async () => [] }, onboardingStatus: { findMany: async () => [] },
      scenarioCandidate: { findMany: async () => [] }, groundDependency: { findMany: async () => [] }, emailPreference: { findUnique: async () => null },
    };
    const out: any = await new MyOwnRecordService(p).orgScopedRecord('u-tobi');
    expect(out.commitments.map((c: any) => c.text)).toEqual(['Send the Westgate quote', 'Call Mama Fresh']);
    expect(JSON.stringify(out)).not.toContain('eight renewals');
    expect(JSON.stringify(out)).not.toContain('pg-untold');
  });
});
