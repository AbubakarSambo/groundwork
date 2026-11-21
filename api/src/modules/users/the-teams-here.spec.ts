import { theTeamsFrom, theSpellingToKeep, oneKeyFor } from './the-teams-here';
import { UsersService } from './users.service';

/** TEAMS ARE A LIST, ONE SPELLING EACH, IGNORING CASE (Hafsah, 21 November 2026). */
describe('the teams here', () => {
  it('"Sales", "sales" and " SALES " are one team, under the spelling most people hold', () => {
    expect(theTeamsFrom(['Sales', 'sales', ' SALES ', 'Sales', 'Operations', null, ''])).toEqual([
      { name: 'Operations', people: 1 },
      { name: 'Sales', people: 4 },
    ]);
  });

  it('a different name is a different team: "Sales team" is not "Sales"', () => {
    expect(theTeamsFrom(['Sales', 'Sales team']).map((t) => t.name)).toEqual(['Sales', 'Sales team']);
  });

  it('typing a team that is already here keeps the spelling in use, and a new one as typed, tidied', () => {
    const teams = [{ name: 'Sales' }, { name: 'Field operations' }];
    expect(theSpellingToKeep('sales', teams)).toBe('Sales');
    expect(theSpellingToKeep('  FIELD   operations ', teams)).toBe('Field operations');
    expect(theSpellingToKeep(' Finance  team ', teams)).toBe('Finance team');
    expect(theSpellingToKeep('   ', teams)).toBeNull();
    expect(oneKeyFor(' Sales  Team ')).toBe('sales team');
  });
});

/**
 * THE LIST IS THE TEAMS PEOPLE ARE SHOWN WITH (release test, 21 November 2026, bugs 96 and 97). Msingi's teams came from the staff
 * directory, so People showed Finance and Sales while the picker read only the teams typed on memberships and offered "No team
 * yet" and "Add a new team" alone; "sales" typed then became a second team. The picker now reads each person's team as People
 * shows it, through the same service the People page and the Save button call.
 */
describe('the Team picker, for Grace at Msingi', () => {
  const ORG = 'org-msingi';
  function msingi() {
    const members = [
      { id: 'm-grace', userId: 'u-grace', organizationId: ORG, role: 'ADMIN', reportsToUserId: null, level: null, team: null as string | null },
      { id: 'm-ruth', userId: 'u-ruth', organizationId: ORG, role: 'MEMBER', reportsToUserId: null, level: null, team: null as string | null },
      { id: 'm-halima', userId: 'u-halima', organizationId: ORG, role: 'MEMBER', reportsToUserId: null, level: null, team: null as string | null },
    ];
    const users = [
      { id: 'u-grace', firstName: 'Grace', lastName: 'Mwangi', email: 'grace@msingi.test', deletedAt: null },
      { id: 'u-ruth', firstName: 'Ruth', lastName: 'Achieng', email: 'ruth@msingi.test', deletedAt: null },
      { id: 'u-halima', firstName: 'Halima', lastName: 'Noor', email: 'halima@msingi.test', deletedAt: null },
    ];
    /* The staff directory gives Grace "Management" and Ruth "Sales". Halima joined today and has no entry. */
    const directory = [
      { externalId: 'e-grace', linkedUserId: 'u-grace', email: 'grace@msingi.test', title: 'Managing director', department: 'Management', managerExternalId: null },
      { externalId: 'e-ruth', linkedUserId: 'u-ruth', email: 'ruth@msingi.test', title: 'Sales rep', department: 'Sales', managerExternalId: null },
    ];
    const pick = (row: any, select?: any) => (select ? Object.fromEntries(Object.keys(select).map((k) => [k, row[k]])) : row);
    const prisma: any = {
      organizationMembership: {
        findUnique: jest.fn(async ({ where, select }: any) => {
          const k = where.userId_organizationId;
          const m = members.find((x) => x.userId === k.userId && x.organizationId === k.organizationId);
          return m ? pick(m, select) : null;
        }),
        findMany: jest.fn(async ({ where, select }: any) => members.filter((m) => m.organizationId === where.organizationId
          && (!where.userId?.in || where.userId.in.includes(m.userId))).map((m) => pick(m, select))),
        update: jest.fn(async ({ where, data }: any) => { const m = members.find((x) => x.id === where.id)!; Object.assign(m, data); return m; }),
      },
      user: {
        findMany: jest.fn(async ({ where, select }: any) => users.filter((u) => !where?.id?.in || where.id.in.includes(u.id)).map((u) => pick(u, select))),
      },
      person: { findFirst: jest.fn(async () => null), findMany: jest.fn(async () => directory) },
    };
    return { people: new UsersService(prisma, {} as any, {} as any, {} as any, { emit: jest.fn() } as any), members };
  }

  it('lists the teams the staff directory gives, the ones People shows', async () => {
    const { people } = msingi();
    expect(await people.theTeams(ORG)).toEqual([
      { name: 'Management', people: 1 },
      { name: 'Sales', people: 1 },
    ]);
  });

  it('"sales" typed for Halima is saved as "Sales", her page reads "Sales", and there is still one Sales team', async () => {
    const { people, members } = msingi();
    const saved = await people.setWhereTheySit(ORG, 'u-halima', { team: 'sales' });
    expect(saved.team).toBe('Sales');
    expect(members.find((m) => m.userId === 'u-halima')!.team).toBe('Sales');
    expect(await people.theTeams(ORG)).toEqual([
      { name: 'Management', people: 1 },
      { name: 'Sales', people: 2 },
    ]);
  });
});
