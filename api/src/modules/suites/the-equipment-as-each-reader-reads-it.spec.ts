import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EquipmentService, EQUIPMENT_REFUSED } from './the-equipment.service';

/**
 * EQUIPMENT, AS EACH PERSON IS SERVED IT (E10, U.17).
 *
 * Baridi Appliances, 27 September 2026. Laptop 03 is with Kamau, with a broken screen; Phone 12 is
 * with Kwame, working. Grace is an admin; Wairimu a lead; Miriam a member; Tomas a guest.
 *
 * The rules under test, each read from what the server actually hands each reader:
 *   - nobody reads or changes anything while the suite is off;
 *   - only an admin reads the board or changes it; a lead, a member, a guest and somebody outside are
 *     refused, and nothing changes;
 *   - who has an item is somebody in the directory, or nobody; an item's name is not used twice;
 *   - the engine can record an update somebody confirmed, by the item's name; a guest cannot;
 *   - no labels on people, no address, and nothing here reaches a check-in or its report.
 */

const ORG = 'org-baridi';
const roles: Record<string, string> = { 'u-grace': 'ADMIN', 'u-wairimu': 'LEAD', 'u-miriam': 'MEMBER', 'u-tomas': 'GUEST' };
const person = (ext: string, name: string) => {
  const [givenName, familyName] = name.split(' ');
  return { externalId: ext, displayName: name, givenName, familyName, active: true, email: `${givenName.toLowerCase()}@baridi.example` };
};
const DIRECTORY = [person('p-faith', 'Faith Kerubo'), person('p-kamau', 'Kamau Njenga'), person('p-kwame', 'Kwame Boateng')];

function setup(opts: { on?: boolean } = {}) {
  let n = 0;
  const items: any[] = [
    { id: 'e-1', organizationId: ORG, name: 'Laptop 03', holderExternalId: 'p-kamau', condition: 'Broken screen.' },
    { id: 'e-2', organizationId: ORG, name: 'Phone 12', holderExternalId: 'p-kwame', condition: 'Working.' },
  ];
  const prisma: any = {
    organizationSuite: { findUnique: jest.fn(async ({ where }: any) => (
      where.organizationId_suite.organizationId === ORG && where.organizationId_suite.suite === 'equipment' ? { isOn: opts.on ?? true } : null)) },
    organizationMembership: { findUnique: jest.fn(async ({ where }: any) => {
      const { userId, organizationId } = where.userId_organizationId;
      return organizationId === ORG && roles[userId] ? { role: roles[userId] } : null;
    }) },
    person: {
      findMany: jest.fn(async () => DIRECTORY),
      findFirst: jest.fn(async ({ where }: any) => DIRECTORY.find((p) => p.externalId === where.externalId) ?? null),
    },
    equipmentItem: {
      findMany: jest.fn(async () => [...items].sort((a, b) => a.name.localeCompare(b.name))),
      findUnique: jest.fn(async ({ where }: any) => (where.id ? items.find((i) => i.id === where.id) : items.find((i) => i.name === where.organizationId_name.name)) ?? null),
      findFirst: jest.fn(async ({ where }: any) => items.find((i) => i.name.toLowerCase() === where.name.equals.toLowerCase()) ?? null),
      create: jest.fn(async ({ data }: any) => { const i = { id: `e-new-${++n}`, ...data }; items.push(i); return i; }),
      update: jest.fn(async ({ where, data }: any) => Object.assign(items.find((i) => i.id === where.id), data)),
    },
  };
  return { svc: new EquipmentService(prisma), as: (userId: string) => ({ userId, organizationId: ORG }), items };
}

const LABELS = /\b(PIP|exit|at[- ]risk|low[- ]performer|flight risk|score|rating)\b/i;

describe('while the suite is off', () => {
  it('nobody reads or changes anything, and the engine cannot record an update', async () => {
    const { svc, as } = setup({ on: false });
    await expect(svc.board(as('u-grace'))).rejects.toThrow(new NotFoundException(EQUIPMENT_REFUSED.notOn));
    await expect(svc.add(as('u-grace'), { name: 'Laptop 07' })).rejects.toThrow(NotFoundException);
    await expect(svc.record(ORG, 'u-miriam', { item: 'Laptop 03', holderId: 'p-faith' })).rejects.toThrow(NotFoundException);
  });
});

describe('only an admin', () => {
  for (const [who, userId] of [['Wairimu, a lead', 'u-wairimu'], ['Miriam, a member', 'u-miriam'], ['a guest', 'u-tomas'], ['somebody outside', 'u-nobody']]) {
    it(`${who} is refused the board and every change, and nothing changes`, async () => {
      const { svc, as, items } = setup();
      await expect(svc.board(as(userId))).rejects.toThrow(new ForbiddenException(EQUIPMENT_REFUSED.onlyAnAdmin));
      await expect(svc.add(as(userId), { name: 'Laptop 07' })).rejects.toThrow(ForbiddenException);
      await expect(svc.change(as(userId), 'e-1', { condition: 'Fixed.' })).rejects.toThrow(ForbiddenException);
      expect(items).toHaveLength(2);
      expect(items[0].condition).toBe('Broken screen.');
    });
  }
});

describe('Grace, an admin', () => {
  it('reads each item, who has it and how it is, and the directory to choose from', async () => {
    const { svc, as } = setup();
    const b = await svc.board(as('u-grace'));
    expect(b.items).toEqual([
      { id: 'e-1', name: 'Laptop 03', holderId: 'p-kamau', holder: 'Kamau Njenga', condition: 'Broken screen.' },
      { id: 'e-2', name: 'Phone 12', holderId: 'p-kwame', holder: 'Kwame Boateng', condition: 'Working.' },
    ]);
    expect(b.people.map((p) => p.name)).toEqual(['Faith Kerubo', 'Kamau Njenga', 'Kwame Boateng']);
  });

  it('adds an item, gives it to somebody, and changes how it is', async () => {
    const { svc, as } = setup();
    let b = await svc.add(as('u-grace'), { name: '  Laptop   07 ', holderId: 'p-faith', condition: 'New. Given out on Monday.' });
    expect(b.items.find((i) => i.name === 'Laptop 07')).toMatchObject({ holder: 'Faith Kerubo', condition: 'New. Given out on Monday.' });
    b = await svc.change(as('u-grace'), 'e-1', { condition: 'Fixed.', holderId: null });
    expect(b.items.find((i) => i.id === 'e-1')).toMatchObject({ holderId: null, holder: null, condition: 'Fixed.' });
  });

  it('refuses a name used twice, no name, and somebody outside the directory', async () => {
    const { svc, as } = setup();
    await expect(svc.add(as('u-grace'), { name: 'Laptop 03' })).rejects.toThrow(new BadRequestException(EQUIPMENT_REFUSED.alreadyThere));
    await expect(svc.add(as('u-grace'), { name: '   ' })).rejects.toThrow(new BadRequestException(EQUIPMENT_REFUSED.badName));
    await expect(svc.change(as('u-grace'), 'e-1', { holderId: 'p-stranger' })).rejects.toThrow(new BadRequestException(EQUIPMENT_REFUSED.badHolder));
    await expect(svc.change(as('u-grace'), 'e-nothing', { condition: 'x' })).rejects.toThrow(new NotFoundException(EQUIPMENT_REFUSED.notFound));
  });
});

describe('an update somebody told Groundwork, for the engine', () => {
  it('records who has it now, by the item’s name, and says who that is', async () => {
    const { svc } = setup();
    expect(await svc.record(ORG, 'u-miriam', { item: 'laptop 03', holderId: 'p-faith' })).toEqual({ item: 'Laptop 03', holder: 'Faith Kerubo', condition: 'Broken screen.' });
  });

  it('refuses a guest, and an item that does not exist', async () => {
    const { svc } = setup();
    await expect(svc.record(ORG, 'u-tomas', { item: 'Laptop 03', holderId: 'p-faith' })).rejects.toThrow(new ForbiddenException(EQUIPMENT_REFUSED.notInIt));
    await expect(svc.record(ORG, 'u-miriam', { item: 'Laptop 99', holderId: 'p-faith' })).rejects.toThrow(new NotFoundException(EQUIPMENT_REFUSED.notFound));
  });
});

describe('what the board never holds', () => {
  it('no label on anybody, and no email address', async () => {
    const { svc, as } = setup();
    const b = JSON.stringify(await svc.board(as('u-grace')));
    expect(b).not.toMatch(LABELS);
    expect(b).not.toMatch(/@/);
  });

  it('nothing outside the suites reads equipment, so none reaches a check-in or report', () => {
    const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const faults: string[] = [];
    const walk = (d: string) => {
      for (const name of readdirSync(d)) {
        const p = join(d, name);
        if (statSync(p).isDirectory()) { if (name !== 'suites') walk(p); }
        else if (/\.ts$/.test(name) && !/\.spec\.ts$/.test(name) && /\bequipmentItem\b/.test(strip(readFileSync(p, 'utf8')))) faults.push(p);
      }
    };
    walk(join(__dirname, '..'));
    expect(faults).toEqual([]);
    expect(strip(readFileSync(join(__dirname, 'the-equipment.service.ts'), 'utf8'))).toMatch(/\bequipmentItem\b/);
  });
});
