import { WhoIsWaitingAtTheDoorService } from './who-is-waiting-at-the-door.service';

/**
 * THE OTHER SHAPE OF REQUEST AT THE SAME QUEUE (item 11, 29 September).
 *
 * A check-in invitation's `MembershipRequest` always carries a `groundId`, and the account it is
 * about already belongs to this organisation - approving it only has to clear
 * `awaitingOrgApproval` (see letting-someone-in-tells-both.spec.ts). The organisation's own invite
 * link (the-organisation-invite-link.service.ts) raises a request with no `groundId` for somebody
 * whose account is a SECOND organisation's, whose email domain did not match this one's own - so
 * approving it has to make them a member here, seat-checked, which is what this file proves.
 */
function aDoor(request: any, o: { room?: boolean } = {}) {
  const created: any[] = [];
  const prisma: any = {
    membershipRequest: { findUnique: jest.fn(async () => request), update: jest.fn(async () => ({})) },
    user: {
      update: jest.fn(async () => ({})),
      findUnique: jest.fn(async () => ({ firstName: 'Stella', lastName: 'Otieno' })),
    },
    organizationMembership: {
      upsert: jest.fn(async ({ create }: any) => { created.push(create); return create; }),
    },
    $transaction: jest.fn(async (fn: any) => fn(prisma)),
  };
  const email: any = {
    sendYouAreInNow: jest.fn(async () => {}),
    sendTheyAreInNow: jest.fn(async () => {}),
  };
  const billing: any = { canInviteMember: jest.fn(async () => ({ allowed: o.room ?? true })) };
  const door = new (WhoIsWaitingAtTheDoorService as any)(prisma, email, billing);
  return { door, created, prisma };
}

const linkRequest = {
  id: 'r2', organizationId: 'baridi', userId: 'stella', email: 'stella@example.com', status: 'PENDING',
  requestedByUserId: null, groundId: null, organization: { name: 'Baridi Appliances' },
};

describe('approving a request with no ground - somebody from outside the domain, on the invite link', () => {
  it('makes them a member of this organisation, recorded as having come by the link', async () => {
    const { door, created, prisma } = aDoor(linkRequest);
    const r = await door.approve('baridi', 'r2', 'grace');
    expect(created).toEqual([{ userId: 'stella', organizationId: 'baridi', role: 'MEMBER', joinedHow: 'link' }]);
    /* Never the flag a check-in invitation's approval clears - this account's home organisation is
       somewhere else entirely, and that flag is not what is stopping them here. */
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(r).toEqual({ approved: true, email: 'stella@example.com' });
  });

  it('is refused when there is no room on the plan, and nothing is joined', async () => {
    const { door, created } = aDoor(linkRequest, { room: false });
    await expect(door.approve('baridi', 'r2', 'grace')).rejects.toThrow('Baridi Appliances has no room for another person on its plan right now.');
    expect(created).toHaveLength(0);
  });
});
