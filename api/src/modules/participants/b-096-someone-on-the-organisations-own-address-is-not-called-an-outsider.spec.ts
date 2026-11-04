import { WhoIsWaitingAtTheDoorService } from './who-is-waiting-at-the-door.service';

/**
 * B-096. halima@msingi.test, waiting to be let into Msingi Foods, whose own address is msingi.test, was told "You're from outside Msingi
 * Foods", and Grace, the admin, read "People from outside Msingi Foods". She is not from outside. The server now says which of the three
 * reasons is true, as a whole sentence, and which people waiting are on the organisation's own address.
 */
function make(email: string, opts: { seatsFull?: boolean; viaInvitation?: boolean } = {}) {
  const request = {
    id: 'r1', userId: 'u-halima', email, organizationId: 'o1', groundId: 'g1', requestedByUserId: 'u-baraka',
    createdAt: new Date('2026-10-09T01:00:00Z'), lastRemindedAt: null, viaInvitation: opts.viaInvitation ?? true,
    organization: { name: 'Msingi Foods', email: 'grace@msingi.test', joinDomain: null },
  };
  const prisma: any = {
    membershipRequest: { findFirst: jest.fn(async () => request), findMany: jest.fn(async () => [{ ...request, user: { firstName: 'Halima', lastName: 'Yusuf' } }]) },
    organization: { findUnique: jest.fn(async () => ({ ownerUserId: 'u-grace', email: 'grace@msingi.test', joinDomain: null })) },
    user: {
      findMany: jest.fn(async () => [{ id: 'u-grace', email: 'grace@msingi.test', firstName: 'Grace', lastName: 'Achieng' }]),
      findUnique: jest.fn(async () => ({ firstName: 'Baraka', lastName: 'Mutua', email: 'baraka@msingi.test' })),
    },
    ground: { findMany: jest.fn(async () => []), findUnique: jest.fn(async () => ({ label: 'Help my team understand' })) },
  };
  const billing: any = { canInviteMember: jest.fn(async () => ({ allowed: !opts.seatsFull })) };
  return new WhoIsWaitingAtTheDoorService(prisma, {} as any, billing);
}

describe('B-096: who is called an outsider', () => {
  it('Halima, on msingi.test, is told the true reason and is not called an outsider', async () => {
    const r: any = await make('halima@msingi.test').myOwnRequest('u-halima');
    expect(r.onTheOrganisationsOwnAddress).toBe(true);
    expect(r.says).toBe('Baraka invited you. Grace Achieng, an admin, has to add you to Msingi Foods first.');
    expect(r.says).not.toMatch(/outside/);
  });
  it('somebody on another address is still told they are from outside', async () => {
    const r: any = await make('halima@gmail.com').myOwnRequest('u-halima');
    expect(r.onTheOrganisationsOwnAddress).toBe(false);
    expect(r.says).toBe('You’re from outside Msingi Foods, so an admin there has to let you in. I’ve asked Grace Achieng.');
  });
  it('a full plan is said as a full plan, whoever the person is', async () => {
    const r: any = await make('halima@msingi.test', { seatsFull: true }).myOwnRequest('u-halima');
    expect(r.says).toBe('Msingi Foods has no free seat right now, so an admin there has to make room before you can start. I’ve asked Grace Achieng.');
  });
  it('Grace reads which of the people waiting are on the organisation\'s own address', async () => {
    const rows: any[] = await make('halima@msingi.test').waiting('o1');
    expect(rows[0]).toMatchObject({ email: 'halima@msingi.test', onTheOrganisationsOwnAddress: true });
  });
});
