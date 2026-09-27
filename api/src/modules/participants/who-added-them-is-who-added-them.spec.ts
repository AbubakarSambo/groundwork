import { WhoIsWaitingAtTheDoorService } from './who-is-waiting-at-the-door.service';

/**
 * "ADDED BY" NAMES WHO ADDED THEM (U.4 re-review). The no-seat list named the lead who runs the
 * check-in, even when an admin, Nadia, had added the person while setting it up. It reads the
 * participant row's added_by_user_id now, and only falls back to the lead on older rows.
 */
function aDoor(rows: any[]) {
  const prisma: any = {
    groundParticipant: { findMany: jest.fn(async () => rows) },
    user: {
      findMany: jest.fn(async ({ where }: any) => [{ id: 'nadia', firstName: 'Nadia', lastName: 'Owino', email: 'nadia@baridi.co.ke' }].filter((u) => where.id.in.includes(u.id))),
    },
  };
  return new (WhoIsWaitingAtTheDoorService as any)(prisma, {} as any) as WhoIsWaitingAtTheDoorService;
}
const lead = { firstName: 'Wairimu', lastName: 'Kamau', email: 'wairimu@baridi.co.ke' };

describe('who added the people with no seat', () => {
  it('the admin who added them, not the lead who runs the check-in', async () => {
    const list = await aDoor([
      { id: 'p1', email: 'tom@baridi.co.ke', createdAt: new Date(), addedByUserId: 'nadia', ground: { label: 'Sales team, Q3', initiator: lead } },
    ]).waitingForASeat('baridi');
    expect(list[0]).toMatchObject({ addedBy: 'Nadia Owino', forCheckIn: 'Sales team, Q3' });
  });

  it('the lead, on an older row that recorded nobody', async () => {
    const list = await aDoor([
      { id: 'p2', email: 'njeri@baridi.co.ke', createdAt: new Date(), addedByUserId: null, ground: { label: 'Operations weekly', initiator: lead } },
    ]).waitingForASeat('baridi');
    expect(list[0].addedBy).toBe('Wairimu Kamau');
  });
});
