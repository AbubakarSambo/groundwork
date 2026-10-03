import { EmbedService } from './embed.service';

/**
 * REQUEST 125, FINDING 3, THE OPENING LINE. Tobi opened the panel and read "Last time you said you would close eight renewals a quarter.
 * How did that go?" about a goal Amina had not told him about. He now reads the opening about what he did say he would do.
 */
const PAST = new Date(Date.now() - 5 * 86400000);
const rows = [
  { id: 'k1', text: 'Close eight renewals a quarter', dueSaid: null, dueAt: PAST, state: 'OPEN', lastFollowedUpAt: null, sourcePersonObjectiveId: 'pg-untold' },
  { id: 'k2', text: 'Send the Westgate quote', dueSaid: 'Friday', dueAt: new Date(PAST.getTime() + 86400000), state: 'OPEN', lastFollowedUpAt: null, sourcePersonObjectiveId: null },
];

function opening(commitments: any[]) {
  const prisma: any = {
    commitment: { findMany: jest.fn(async () => commitments), update: jest.fn(async () => ({})) },
    person: { update: jest.fn(async () => ({})) },
    personObjective: { findMany: jest.fn(async () => [{ id: 'pg-untold', awareness: 'NOT_TOLD', authoredBy: 'lead' }]) },
  };
  const svc = new EmbedService(prisma, {} as any, {} as any) as any;
  return svc.opening('org1', { id: 'p1', displayName: 'Tobi Adewale', userName: 'tobi', externalId: 'ext-tobi', lastNudgedOn: null });
}

describe('the opening line of the panel', () => {
  it('does not raise a commitment copied from a goal Amina has not told Tobi about', async () => {
    const o = await opening(rows);
    expect(o.line).toBe('Last time you said you would send the Westgate quote by Friday. How did that go?');
    expect(o.line).not.toContain('renewals');
  });

  it('says nothing about a commitment when the only one slipped is that goal', async () => {
    const o = await opening([rows[0]]).catch(() => null);
    expect(JSON.stringify(o)).not.toContain('eight renewals');
  });
});
