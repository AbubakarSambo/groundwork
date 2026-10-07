import { theMemberWithThisAddress, withTheirNamesFromTheOrganisation } from './colleagues';

/** User journeys F-7: somebody already in the organisation, added by email, read as their address, "Somebody invited by email" or "A colleague". */
const db = (members: { email: string; firstName: string; lastName: string }[]) => ({
  organizationMembership: {
    findFirst: jest.fn(async ({ where }: any) => {
      const m = members.find((x) => x.email === where.user.email);
      return m ? { user: m } : null;
    }),
    findMany: jest.fn(async ({ where }: any) => members.filter((x) => where.user.email.in.includes(x.email)).map((x) => ({ user: x }))),
  },
});
const MEMBERS = [{ email: 'amani.wekesa@kito.test', firstName: 'Amani', lastName: 'Wekesa' }];

describe('somebody already here, added by their address', () => {
  it('is named by their membership', async () => {
    expect(await theMemberWithThisAddress(db(MEMBERS), 'org1', 'Amani.Wekesa@kito.test')).toEqual({ name: 'Amani Wekesa' });
  });
  it('a stranger is not named, and is not said to be here', async () => {
    expect(await theMemberWithThisAddress(db(MEMBERS), 'org1', 'someone@elsewhere.test')).toBeNull();
  });

  it('on the roster, a row with no name and no account yet reads the member\'s name, and nothing else changes', async () => {
    const rows: any[] = [
      { email: 'amani.wekesa@kito.test', nameGiven: null, user: null },
      { email: 'someone@elsewhere.test', nameGiven: null, user: null },
      { email: 'baraka@kito.test', nameGiven: 'Baraka Mutua', user: null },
      { email: 'amani.wekesa@kito.test', nameGiven: null, user: { firstName: 'Amani' } },
    ];
    await withTheirNamesFromTheOrganisation(db(MEMBERS), 'org1', rows);
    expect(rows.map((r) => r.nameGiven)).toEqual(['Amani Wekesa', null, 'Baraka Mutua', null]);
  });

  it('a lookup that is not there leaves the rows as they were', async () => {
    const rows: any[] = [{ email: 'amani.wekesa@kito.test', nameGiven: null, user: null }];
    await withTheirNamesFromTheOrganisation({}, 'org1', rows);
    expect(rows[0].nameGiven).toBeNull();
  });
});
