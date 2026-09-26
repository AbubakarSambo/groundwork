import { colleaguesOf, theAddressOfAColleague, onlyNameRoleAndTeam } from './colleagues';

/**
 * WHO SOMEBODY MAY SEE AS A COLLEAGUE (U.4, Hafsah's decision of 26 September): a member sees the
 * organisation's people by name, role and team; a guest from another organisation sees only the
 * people in their own check-in; nobody gets anything beyond name, role and team.
 *
 * A small organisation in memory, Baridi, with its own people, a guest (Peter, from Ouma Agencies),
 * somebody still waiting to be let in, and two check-ins. The fake reads the same `where` the real
 * query sends, so what is tested is the query, not a copy of it.
 */
type Person = {
  id: string; firstName: string; lastName: string; email: string; phoneNumber?: string;
  isActive?: boolean; isEmailVerified?: boolean; deletedAt?: Date | null; awaitingOrgApproval?: boolean;
};
type Membership = { userId: string; organizationId: string; role: string; team: string | null; level?: string | null; reportsToUserId?: string | null };
type Row = { groundId: string; organizationId: string; userId: string | null };

const people: Person[] = [
  { id: 'grace', firstName: 'Grace', lastName: 'Achieng', email: 'grace@baridi.co.ke' },
  { id: 'wairimu', firstName: 'Wairimu', lastName: 'Kamau', email: 'wairimu@baridi.co.ke', phoneNumber: '+254712345678' },
  { id: 'miriam', firstName: 'Miriam', lastName: 'Wanjiku', email: 'miriam@baridi.co.ke' },
  { id: 'njeri', firstName: 'Njeri', lastName: 'Wambui', email: 'njeri@baridi.co.ke' },
  { id: 'peter', firstName: 'Peter', lastName: 'Ouma', email: 'peter@ouma-agencies.co.ke' },
  { id: 'tom', firstName: 'Tom', lastName: 'Odhiambo', email: 'tom@example.com', awaitingOrgApproval: true },
];
const memberships: Membership[] = [
  { userId: 'grace', organizationId: 'baridi', role: 'ADMIN', team: 'Operations', level: 'Head of operations' },
  { userId: 'wairimu', organizationId: 'baridi', role: 'LEAD', team: 'Sales', level: 'Sales lead', reportsToUserId: 'amani' },
  { userId: 'miriam', organizationId: 'baridi', role: 'MEMBER', team: 'Sales', level: 'Sales rep', reportsToUserId: 'wairimu' },
  { userId: 'njeri', organizationId: 'baridi', role: 'MEMBER', team: 'Operations', level: 'Operations officer' },
  { userId: 'peter', organizationId: 'baridi', role: 'GUEST', team: null },
  { userId: 'peter', organizationId: 'ouma', role: 'ADMIN', team: null },
  { userId: 'tom', organizationId: 'baridi', role: 'MEMBER', team: null },
];
const rows: Row[] = [
  /* Sales team, Q3: Wairimu runs it, Miriam and Peter check in. */
  { groundId: 'sales', organizationId: 'baridi', userId: 'wairimu' },
  { groundId: 'sales', organizationId: 'baridi', userId: 'miriam' },
  { groundId: 'sales', organizationId: 'baridi', userId: 'peter' },
  { groundId: 'sales', organizationId: 'baridi', userId: null },
  /* Operations weekly: Grace and Njeri. Peter is not on it. */
  { groundId: 'ops', organizationId: 'baridi', userId: 'grace' },
  { groundId: 'ops', organizationId: 'baridi', userId: 'njeri' },
  /* Tom's own check-in at Baridi, with Njeri on it. */
  { groundId: 'toms', organizationId: 'baridi', userId: 'tom' },
  { groundId: 'toms', organizationId: 'baridi', userId: 'njeri' },
];

const userOk = (p: Person, w: any) =>
  (!w || (
    (w.deletedAt === undefined || (p.deletedAt ?? null) === w.deletedAt)
    && (w.isActive === undefined || (p.isActive ?? true) === w.isActive)
    && (w.isEmailVerified === undefined || (p.isEmailVerified ?? true) === w.isEmailVerified)
    && (w.awaitingOrgApproval === undefined || (p.awaitingOrgApproval ?? false) === w.awaitingOrgApproval)
  ));
const idOk = (id: string, w: any) =>
  w === undefined || (typeof w === 'string' ? id === w : (!w.in || w.in.includes(id)) && (w.not === undefined || id !== w.not));

const db: any = {
  organizationMembership: {
    findUnique: async ({ where }: any) => memberships.find((m) => m.userId === where.userId_organizationId.userId && m.organizationId === where.userId_organizationId.organizationId) ?? null,
    findMany: async ({ where, select }: any) => memberships
      .filter((m) => m.organizationId === where.organizationId && idOk(m.userId, where.userId))
      .filter((m) => !where.role || m.role !== where.role.not)
      .filter((m) => userOk(people.find((p) => p.id === m.userId)!, where.user))
      /* Returns the WHOLE row and the whole user, whatever was selected, so the test proves the code drops the rest. */
      .map((m) => ({ ...m, user: { ...people.find((p) => p.id === m.userId)! }, _selected: select })),
    findFirst: async ({ where }: any) => {
      const m = memberships.find((x) => x.organizationId === where.organizationId && x.userId === where.userId);
      const p = m && people.find((x) => x.id === m.userId);
      return m && p && userOk(p, where.user) ? { user: { email: p.email } } : null;
    },
  },
  user: { findUnique: async ({ where }: any) => people.find((p) => p.id === where.id) ?? null },
  groundParticipant: {
    findMany: async ({ where }: any) => rows
      .filter((r) => (where.ground ? r.organizationId === where.ground.organizationId : true))
      .filter((r) => (where.groundId ? where.groundId.in.includes(r.groundId) : true))
      .filter((r) => (where.userId === undefined ? true : typeof where.userId === 'string' ? r.userId === where.userId : r.userId !== null)),
  },
};

const names = (list: { name: string }[]) => list.map((c) => c.name);

describe('a member sees the organisation\'s own people, by name, role and team', () => {
  it('Miriam, who takes part, sees everyone at Baridi but herself, and not the guest or anybody waiting', async () => {
    const seen = await colleaguesOf(db, 'baridi', 'miriam');
    expect(names(seen)).toEqual(['Grace Achieng', 'Njeri Wambui', 'Wairimu Kamau']);
    expect(seen.find((c) => c.name === 'Wairimu Kamau')).toEqual({ id: 'wairimu', name: 'Wairimu Kamau', role: 'LEAD', team: 'Sales' });
  });
});

describe('a guest from another organisation sees only the people in their own check-in', () => {
  it('Peter, a guest on Sales team, Q3, sees Wairimu and Miriam, and nobody from Operations weekly', async () => {
    const seen = await colleaguesOf(db, 'baridi', 'peter');
    expect(names(seen)).toEqual(['Miriam Wanjiku', 'Wairimu Kamau']);
    expect(names(seen)).not.toContain('Grace Achieng');
    expect(names(seen)).not.toContain('Njeri Wambui');
  });

  it('and somebody still waiting to be let in is treated the same way', async () => {
    expect(names(await colleaguesOf(db, 'baridi', 'tom'))).toEqual(['Njeri Wambui']);
  });

  it('a guest on no check-in here sees nobody', async () => {
    const lonely = { ...db, groundParticipant: { findMany: async () => [] } };
    expect(await colleaguesOf(lonely, 'baridi', 'peter')).toEqual([]);
  });
});

describe('nothing beyond name, role and team ever leaves', () => {
  it('every row has exactly id, name, role and team: no address, number, level, manager or load', async () => {
    for (const who of ['miriam', 'peter', 'grace']) {
      for (const c of await colleaguesOf(db, 'baridi', who)) {
        expect(Object.keys(c).sort()).toEqual(['id', 'name', 'role', 'team']);
        const text = JSON.stringify(c);
        expect(text).not.toMatch(/@/);
        expect(text).not.toMatch(/\+254/);
        expect(text).not.toMatch(/Sales lead|Sales rep|Head of operations|amani/);
      }
    }
  });

  it('even when the database hands back the whole row', () => {
    const whole: any = { userId: 'x', role: 'MEMBER', team: 'Sales', level: 'Sales rep', reportsToUserId: 'y', user: { firstName: 'Ada', lastName: 'L', email: 'ada@x.co', phoneNumber: '+1' } };
    expect(onlyNameRoleAndTeam(whole)).toEqual({ id: 'x', name: 'Ada L', role: 'MEMBER', team: 'Sales' });
  });
});

describe('a colleague picked by id is looked up on the server, in this organisation only', () => {
  it('finds the address of somebody here, and nobody elsewhere', async () => {
    expect(await theAddressOfAColleague(db, 'baridi', 'miriam')).toBe('miriam@baridi.co.ke');
    expect(await theAddressOfAColleague(db, 'ouma', 'miriam')).toBeNull();
  });
});

describe('both doors that add a picked colleague look the address up on the server', () => {
  const { readFileSync } = require('fs');
  const { join } = require('path');
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  it('adding to a running check-in, and queuing in setup', () => {
    const grounds = strip(readFileSync(join(__dirname, '..', 'modules', 'grounds', 'grounds.service.ts'), 'utf8'));
    expect(grounds).toMatch(/if \(dto\.colleagueId\) \{\s*const address = await theAddressOfAColleague\(this\.prisma as any, organizationId, dto\.colleagueId\);\s*if \(!address\) throw new BadRequestException\(NOT_SOMEONE_HERE\);/);
    const entry = strip(readFileSync(join(__dirname, '..', 'modules', 'entry', 'entry.service.ts'), 'utf8'));
    expect(entry).toMatch(/dto = \{ \.\.\.dto, contributors: await this\.withColleaguesAddressed\(organizationId,/);
  });
});
