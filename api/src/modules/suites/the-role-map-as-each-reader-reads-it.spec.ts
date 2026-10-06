import { readFileSync } from 'fs';
import { join } from 'path';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RoleMapService, ROLES_REFUSED } from './the-role-map.service';

/**
 * THE ROLE MAP, AS EACH PERSON IS SERVED IT (E6, U.17).
 *
 * Baridi Appliances, 27 September 2026. The organisation's own system gave four roles: Sales lead
 * (held by Wairimu), Head of operations (Grace), Stock planning (nobody) and Sales rep, with a
 * description of what each owns. The staff directory gives Miriam and Aisha the title "Sales rep"
 * and Kamau "Operations lead", which no role record names. Samuel's Sales rep role has ended. The
 * engine has written one role interview answer, for the Sales lead, and why nobody owning stock
 * planning matters.
 *
 * The rules under test, each read from what the server actually hands each reader:
 *   - nobody reads anything while the suite is off;
 *   - only an admin reads the map; a lead, a member and a guest are refused;
 *   - a role is one row, however it is capitalised, with who holds it now, from the role records and
 *     the directory's job titles; a role that ended is not held; a role nobody holds is named;
 *   - what a role owns comes from the role interview when the engine has written it, else from the
 *     organisation's own description;
 *   - no labels on people, no email address, and the map writes nothing and reaches no report.
 */

const ORG = 'org-baridi';
const roles: Record<string, string> = { 'u-grace': 'ADMIN', 'u-wairimu': 'LEAD', 'u-miriam': 'MEMBER', 'u-tomas': 'GUEST' };
const person = (ext: string, name: string, title: string | null = null, active = true) => {
  const [givenName, familyName] = name.split(' ');
  return { externalId: ext, displayName: name, givenName, familyName, title, active, email: `${givenName.toLowerCase()}@baridi.example` };
};

function setup(opts: { on?: boolean; engine?: boolean } = {}) {
  const writes: string[] = [];
  const directory = [
    person('p-grace', 'Grace Achieng'), person('p-wairimu', 'Wairimu Kamau'),
    person('p-miriam', 'Miriam Wanjiku', 'Sales rep'), person('p-aisha', 'Aisha Otieno', 'sales Rep'),
    person('p-kamau', 'Kamau Njenga', 'Operations lead'), person('p-samuel', 'Samuel Njoroge', null, false),
  ];
  const write = (what: string) => jest.fn(async () => { writes.push(what); });
  const prisma: any = {
    organizationSuite: { findUnique: jest.fn(async ({ where }: any) => (
      where.organizationId_suite.organizationId === ORG && where.organizationId_suite.suite === 'roles' ? { isOn: opts.on ?? true } : null)) },
    organizationMembership: { findUnique: jest.fn(async ({ where }: any) => {
      const { userId, organizationId } = where.userId_organizationId;
      return organizationId === ORG && roles[userId] ? { role: roles[userId] } : null;
    }) },
    role: {
      findMany: jest.fn(async () => [
        { key: 'head-ops', name: 'Head of operations', description: 'People, pay, finance and credit terms' },
        { key: 'sales-lead', name: 'Sales lead', description: 'The sales team' },
        { key: 'sales-rep', name: 'Sales rep', description: 'Their own customers and deals' },
        { key: 'stock', name: 'Stock planning', description: 'Booking freezers before customers need them' },
      ]),
      upsert: write('role'), create: write('role'), update: write('role'),
    },
    roleAssignment: {
      findMany: jest.fn(async ({ where }: any) => [
        { personExternalId: 'p-grace', roleName: 'Head of operations', endedAt: null },
        { personExternalId: 'p-wairimu', roleName: 'sales-lead', endedAt: null },
        { personExternalId: 'p-samuel', roleName: 'Sales rep', endedAt: new Date('2026-09-15') },
      ].filter((a) => where.endedAt === null ? a.endedAt === null : true)),
      create: write('roleAssignment'), update: write('roleAssignment'),
    },
    person: { findMany: jest.fn(async ({ where }: any) => directory.filter((p) => !where.active || p.active)) },
    roleInterviewAnswer: { findMany: jest.fn(async () => (opts.engine ? [
      { roleName: 'Sales lead', owns: 'The sales target and the sales team', createdAt: new Date('2026-09-20') },
    ] : [])) },
    roleGapNote: { findMany: jest.fn(async () => (opts.engine ? [
      { roleName: 'Stock planning', says: 'That is why Kwame waited three weeks for freezers.', createdAt: new Date('2026-09-21') },
    ] : [])) },
  };
  return { svc: new RoleMapService(prisma), as: (userId: string) => ({ userId, organizationId: ORG }), writes };
}

const LABELS = /\b(PIP|exit|at[- ]risk|low[- ]performer|flight risk|score|rating)\b/i;

describe('while the suite is off', () => {
  it('nobody reads the map, not even an admin', async () => {
    const { svc, as } = setup({ on: false });
    await expect(svc.board(as('u-grace'))).rejects.toThrow(new NotFoundException(ROLES_REFUSED.notOn));
  });
});

describe('only an admin', () => {
  for (const [who, userId] of [['Wairimu, a lead', 'u-wairimu'], ['Miriam, a member', 'u-miriam'], ['a guest', 'u-tomas'], ['somebody outside', 'u-nobody']]) {
    it(`${who} is refused`, async () => {
      const { svc, as } = setup();
      await expect(svc.board(as(userId))).rejects.toThrow(new ForbiddenException(ROLES_REFUSED.onlyAnAdmin));
    });
  }
});

describe('Grace, an admin', () => {
  it('reads every role, what it owns, and who holds it now', async () => {
    const { svc, as } = setup();
    const b = await svc.board(as('u-grace'));
    expect(b.roles).toEqual([
      { name: 'Head of operations', owns: 'People, pay, finance and credit terms', heldBy: ['Grace Achieng'] },
      { name: 'Sales lead', owns: 'The sales team', heldBy: ['Wairimu Kamau'] },
      { name: 'Sales rep', owns: 'Their own customers and deals', heldBy: ['Aisha Otieno', 'Miriam Wanjiku'] },
      { name: 'Stock planning', owns: 'Booking freezers before customers need them', heldBy: [] },
      { name: 'Operations lead', owns: null, heldBy: ['Kamau Njenga'] },
    ]);
    expect(b.nobody).toEqual([{ name: 'Stock planning', why: null }]);
  });

  it('once the engine has written them, reads what the role interview says a role owns, and why a job nobody owns matters', async () => {
    const { svc, as } = setup({ engine: true });
    const b = await svc.board(as('u-grace'));
    expect(b.roles.find((r) => r.name === 'Sales lead')?.owns).toBe('The sales target and the sales team');
    expect(b.nobody).toEqual([{ name: 'Stock planning', why: 'That is why Kwame waited three weeks for freezers.' }]);
  });
});

describe('what the map never holds or does', () => {
  it('no label on anybody, and no email address', async () => {
    const { svc, as } = setup({ engine: true });
    const b = JSON.stringify(await svc.board(as('u-grace')));
    expect(b).not.toMatch(LABELS);
    expect(b).not.toMatch(/@/);
  });

  it('writes nothing: roles and who holds them stay the organisation’s own', async () => {
    const { svc, as, writes } = setup();
    await svc.board(as('u-grace'));
    expect(writes).toEqual([]);
    const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const own = strip(readFileSync(join(__dirname, 'the-role-map.service.ts'), 'utf8'));
    expect(own).not.toMatch(/\.(create|update|upsert|delete)(Many)?\(/);
    /* And it never reads a handover brief. */
    expect(own).not.toMatch(/handoverBrief/);
  });

});
