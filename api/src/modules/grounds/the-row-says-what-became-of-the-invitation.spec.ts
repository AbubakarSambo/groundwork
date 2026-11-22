import { GroundsService } from './grounds.service';
import { whereEachPersonIsGettingStarted } from './getting-each-person-started';

/**
 * THE ROW SAYS WHAT BECAME OF THE INVITATION (release test, 21 November 2026, bug 17). Wairimu added Olu to "Sales team, Q4" two
 * minutes after Grace added him to Msingi as a guest. The mail door held the check-in invitation back (it read as the same
 * invitation), nothing reached Olu, and his row said "Olu was invited by email on Saturday." The row is stamped from what the door
 * says became of the mail: sent, it is invited; held back, it is not, and the lead is told.
 */
function makeService(outcome: 'sent' | 'suppressed') {
  const updates: any[] = [];
  const tx: any = {
    groundParticipant: { create: jest.fn(async (args: any) => ({ id: 'p-olu', ...args.data })) },
    checkIn: { create: jest.fn(async () => ({})) },
    ground: { update: jest.fn(async () => ({})) },
  };
  const prisma: any = {
    ground: { findFirst: jest.fn(async (args: any) => (args?.where?.status === 'AWAITING_APPROVAL' ? null : { id: 'g-sales', initiatorId: 'u-wairimu', label: 'Sales team, Q4', scenario: 'TEAM', isFreeGround: false, cadence: 'WEEKLY', status: 'ACTIVE', organizationId: 'org-msingi' })) },
    groundDocument: { count: jest.fn(async () => 0) },
    leadContextNote: { count: jest.fn(async () => 0) },
    user: { findUnique: jest.fn(async () => ({ id: 'u-wairimu', firstName: 'Wairimu' })), count: jest.fn(async () => 1) },
    organization: { findUnique: jest.fn(async () => ({ subscriptionPlan: null, subscriptionStatus: null })) },
    organizationMembership: { findFirst: jest.fn(async () => null) },
    groundParticipant: {
      findFirst: jest.fn(async () => null),
      count: jest.fn(async () => 0),
      update: jest.fn(async (args: any) => { updates.push(args.data); return {}; }),
    },
    checkIn: { findFirst: jest.fn(async () => null), count: jest.fn(async () => 1) },
    $transaction: jest.fn(async (fn: any) => fn(tx)),
  };
  /* The door, as the real one answers: it writes what became of the mail on the context it is given. */
  const email: any = { sendTheInviteThisGroundSends: jest.fn(async (...a: any[]) => { a[5].outcome = outcome; return {}; }) };
  const service = new GroundsService(
    prisma, email,
    { seatsIncludedFor: async () => null } as any,
    { emit: () => Promise.resolve() } as any,
    { emit: () => Promise.resolve() } as any, {} as any,
    { respond: async () => '' } as any,
  );
  return { service, tx, updates };
}

const theRowAfter = (invitedAt: Date | null) => whereEachPersonIsGettingStarted([{
  participantId: 'p-olu', name: 'Olu Bankole', team: null, invitedAt, acceptedAt: null, hasAnAccount: false, bounced: false, delivered: false, checkIns: [],
}], new Date('2026-11-21T20:10:00Z'))[0].says;

describe('Olu, added to Sales team, Q4', () => {
  it('when the door held the invitation back, he is not marked invited, the lead is told, and his row says so', async () => {
    const { service, tx, updates } = makeService('suppressed');
    const added: any = await service.addParticipant('g-sales', 'org-msingi', 'u-wairimu', { email: 'olu@partnerco.test', displayName: 'Olu Bankole' } as any);
    expect(updates).toContainEqual({ invitedAt: null });
    expect(updates.some((u) => u.notifiedAt instanceof Date)).toBe(false);
    expect(added.invitedAt).toBeNull();
    expect(added.notInvitedBecause).toBe('mail_failed');
    expect(added.emailFailed).toBe('The invitation was not sent, because the same invitation already went to them today.');
    expect(tx.groundParticipant.create).toHaveBeenCalled();
    expect(theRowAfter(null)).toBe('Olu has not been sent an invitation yet.');
  });

  it('when the door sent it, he is marked invited and his row says he was invited by email', async () => {
    const { service, updates } = makeService('sent');
    const added: any = await service.addParticipant('g-sales', 'org-msingi', 'u-wairimu', { email: 'olu@partnerco.test', displayName: 'Olu Bankole' } as any);
    expect(added.invitedAt).toBeInstanceOf(Date);
    expect(added.emailFailed).toBeUndefined();
    expect(updates.some((u) => u.notifiedAt instanceof Date)).toBe(true);
    expect(theRowAfter(new Date('2026-11-21T20:05:00Z'))).toBe('Olu was invited by email on Saturday. Olu has not opened the link yet.');
  });
});
