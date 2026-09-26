import { WhoIsWaitingAtTheDoorService } from './who-is-waiting-at-the-door.service';

/**
 * "LETTING SOMEONE IN TELLS THEM STRAIGHT AWAY, AND TELLS WHOEVER INVITED THEM." (A4 people.txt)
 *
 * The People page says it, so it has to be true. Only the person was told; now whoever invited them
 * is told too, by name and with the check-in, unless the admin letting them in is the one who asked.
 */
function aDoor(request: any) {
  const sent: { to: string; what: string; args: any[] }[] = [];
  const prisma: any = {
    membershipRequest: { findUnique: jest.fn(async () => request), update: jest.fn(async () => ({})) },
    user: {
      update: jest.fn(async () => ({})),
      findUnique: jest.fn(async ({ where }: any) => (where.id === 'wairimu'
        ? { email: 'wairimu@baridi.co.ke', firstName: 'Wairimu' }
        : { firstName: 'Peter', lastName: 'Ouma' })),
    },
    ground: { findUnique: jest.fn(async () => ({ label: 'Sales team, Q3' })) },
    $transaction: jest.fn(async (fn: any) => fn(prisma)),
  };
  const email: any = {
    sendYouAreInNow: jest.fn(async (to: string, ...args: any[]) => { sent.push({ to, what: 'you are in', args }); }),
    sendTheyAreInNow: jest.fn(async (to: string, ...args: any[]) => { sent.push({ to, what: 'they are in', args }); }),
  };
  const door = new (WhoIsWaitingAtTheDoorService as any)(prisma, email);
  return { door, sent };
}
const flush = () => new Promise((r) => setImmediate(r));

const peter = {
  id: 'r1', organizationId: 'baridi', userId: 'peter', email: 'peter@ouma-agencies.co.ke', status: 'PENDING',
  requestedByUserId: 'wairimu', groundId: 'sales', organization: { name: 'Baridi Appliances' },
};

describe('letting someone in', () => {
  it('tells them, and tells Wairimu, who invited them, by name and with the check-in', async () => {
    const { door, sent } = aDoor(peter);
    await door.approve('baridi', 'r1', 'grace');
    await flush();
    expect(sent.map((s) => [s.to, s.what])).toEqual([
      ['peter@ouma-agencies.co.ke', 'you are in'],
      ['wairimu@baridi.co.ke', 'they are in'],
    ]);
    expect(sent[1].args).toEqual(['Wairimu', 'Peter Ouma', 'Sales team, Q3']);
  });

  it('and does not write to the admin about her own invitation', async () => {
    const { door, sent } = aDoor({ ...peter, requestedByUserId: 'grace' });
    await door.approve('baridi', 'r1', 'grace');
    await flush();
    expect(sent.map((s) => s.what)).toEqual(['you are in']);
  });
});
