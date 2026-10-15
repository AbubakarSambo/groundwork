import { readFileSync } from 'fs';
import { join } from 'path';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CustomersService, CUSTOMERS_REFUSED } from './the-customers.service';

/**
 * CUSTOMERS AND DEALS, AS EACH PERSON IS SERVED THEM (E9, U.17).
 *
 * Baridi Appliances, 27 September 2026. The organisation's own system gave five customers: Kariuki
 * Butchery ("Paid", Aisha), Green Mart ("Quoted", Miriam), Westgate Deli (Miriam), Naivas Ngong Road
 * (Kwame, in Operations) and Old Shop, which their system has since deleted. Miriam told her check-in
 * she visited Green Mart on 23 September ("the buyer was rude", which must never travel), and a call
 * on 20 September is disputed. The engine has written where Green Mart stands.
 *
 * The rules under test, each read from what the server actually hands each reader:
 *   - nobody reads anything while the suite is off; a member, a guest and somebody outside are refused;
 *   - an admin reads every customer; a lead only those owned by their own team and themselves;
 *   - where it stands is the engine's words once written, else their own system's word;
 *   - the last contact is the latest undisputed one, the day only, never what anybody said;
 *   - nothing is written, no label, no address.
 */

const ORG = 'org-baridi';
const roles: Record<string, string> = { 'u-grace': 'ADMIN', 'u-wairimu': 'LEAD', 'u-kamau': 'LEAD', 'u-miriam': 'MEMBER', 'u-tomas': 'GUEST' };
const person = (u: string | null, ext: string, name: string, department: string | null, manager: string | null = null) => {
  const [givenName, familyName] = name.split(' ');
  return { externalId: ext, linkedUserId: u, displayName: name, givenName, familyName, department, managerExternalId: manager, email: `${givenName.toLowerCase()}@baridi.example` };
};
const DIRECTORY = [
  person('u-grace', 'p-grace', 'Grace Achieng', null), person('u-wairimu', 'p-wairimu', 'Wairimu Kamau', 'Sales'),
  person('u-kamau', 'p-kamau', 'Kamau Njenga', 'Operations'), person('u-miriam', 'p-miriam', 'Miriam Wanjiku', 'Sales', 'p-wairimu'),
  person('u-aisha', 'p-aisha', 'Aisha Otieno', 'Sales', 'p-wairimu'), person('u-kwame', 'p-kwame', 'Kwame Boateng', 'Operations', 'p-kamau'),
];
const subject = (id: string, title: string, owner: string | null, status: string | null, deleted = false) =>
  ({ id: `s-${id}`, organizationId: ORG, externalId: `crm-${id}`, type: 'COUNTERPARTY', title, status, ownerExternalId: owner, sourceDeletedAt: deleted ? new Date() : null });
const SUBJECTS = [
  subject('green', 'Green Mart', 'p-miriam', 'Quoted'),
  subject('kariuki', 'Kariuki Butchery', 'p-aisha', 'Paid'),
  subject('naivas', 'Naivas Ngong Road', 'p-kwame', 'First order placed'),
  subject('old', 'Old Shop', 'p-miriam', 'Lost', true),
  subject('westgate', 'Westgate Deli', 'p-miriam', null),
];
const at = (d: string) => new Date(`${d}T10:00:00Z`);
const INTERACTIONS = [
  { counterpartyExternalId: 'crm-green', happenedAt: at('2026-09-23'), note: 'the buyer was rude', disputedAt: null },
  { counterpartyExternalId: 'crm-green', happenedAt: at('2026-09-10'), note: null, disputedAt: null },
  { counterpartyExternalId: 'crm-kariuki', happenedAt: at('2026-09-20'), note: null, disputedAt: at('2026-09-21') },
  { counterpartyExternalId: 'crm-kariuki', happenedAt: at('2026-09-18'), note: null, disputedAt: null },
];

function setup(opts: { on?: boolean } = {}) {
  const writes: string[] = [];
  const write = () => jest.fn(async () => { writes.push('write'); });
  const prisma: any = {
    organizationSuite: { findUnique: jest.fn(async ({ where }: any) => (
      where.organizationId_suite.organizationId === ORG && where.organizationId_suite.suite === 'customers' ? { isOn: opts.on ?? true } : null)) },
    organizationMembership: { findUnique: jest.fn(async ({ where }: any) => {
      const { userId, organizationId } = where.userId_organizationId;
      return organizationId === ORG && roles[userId] ? { role: roles[userId] } : null;
    }) },
    person: { findMany: jest.fn(async () => DIRECTORY) },
    subject: {
      findMany: jest.fn(async ({ where }: any) => SUBJECTS.filter((s) => s.organizationId === where.organizationId && s.type === where.type && (where.sourceDeletedAt !== null || !s.sourceDeletedAt))),
      update: write(), upsert: write(), create: write(),
    },
    customerStanding: { findMany: jest.fn(async () => [
      { counterpartyExternalId: 'crm-green', says: 'Interested.', createdAt: at('2026-09-01') },
      { counterpartyExternalId: 'crm-green', says: 'Quote sent. Buys in January.', createdAt: at('2026-09-23') },
    ]) },
    interaction: { findMany: jest.fn(async ({ where }: any) => INTERACTIONS
      .filter((i) => where.counterpartyExternalId.in.includes(i.counterpartyExternalId) && (where.disputedAt !== null || !i.disputedAt))
      .sort((a, b) => b.happenedAt.getTime() - a.happenedAt.getTime())) },
  };
  return { svc: new CustomersService(prisma), as: (userId: string) => ({ userId, organizationId: ORG }), writes };
}

const LABELS = /\b(PIP|exit|at[- ]risk|low[- ]performer|flight risk|score|rating)\b/i;

describe('while the suite is off', () => {
  it('nobody reads the list, not even an admin', async () => {
    const { svc, as } = setup({ on: false });
    await expect(svc.board(as('u-grace'))).rejects.toThrow(new NotFoundException(CUSTOMERS_REFUSED.notOn));
  });
});

describe('who may open the list', () => {
  for (const [who, userId] of [['Miriam, a member', 'u-miriam'], ['a guest', 'u-tomas'], ['somebody outside', 'u-nobody']]) {
    it(`${who} is refused`, async () => {
      const { svc, as } = setup();
      await expect(svc.board(as(userId))).rejects.toThrow(new ForbiddenException(CUSTOMERS_REFUSED.onlyAdminsAndLeads));
    });
  }
});

describe('Grace, an admin', () => {
  it('reads every customer, where it stands, who owns it and the last contact', async () => {
    const { svc, as } = setup();
    expect((await svc.board(as('u-grace'))).customers).toEqual([
      { id: 's-green', name: 'Green Mart', standing: 'Quote sent. Buys in January.', owner: 'Miriam Wanjiku', lastContact: '2026-09-23' },
      { id: 's-kariuki', name: 'Kariuki Butchery', standing: 'Paid', owner: 'Aisha Otieno', lastContact: '2026-09-18' },
      { id: 's-naivas', name: 'Naivas Ngong Road', standing: 'First order placed', owner: 'Kwame Boateng', lastContact: null },
      { id: 's-westgate', name: 'Westgate Deli', standing: null, owner: 'Miriam Wanjiku', lastContact: null },
    ]);
  });
});

describe('a lead', () => {
  it('Wairimu reads only the customers her team owns', async () => {
    const { svc, as } = setup();
    expect((await svc.board(as('u-wairimu'))).customers.map((c) => c.name)).toEqual(['Green Mart', 'Kariuki Butchery', 'Westgate Deli']);
  });

  it('Kamau reads only Kwame’s', async () => {
    const { svc, as } = setup();
    expect((await svc.board(as('u-kamau'))).customers.map((c) => c.name)).toEqual(['Naivas Ngong Road']);
  });
});

describe('where a customer stands, written from a sales check-in (request 28)', () => {
  it('the board shows only the latest line for a customer, however the rows come back', async () => {
    const { svc, as } = setup();
    const green = (await svc.board(as('u-grace'))).customers.find((c) => c.name === 'Green Mart');
    expect(green?.standing).toBe('Quote sent. Buys in January.');
    expect(JSON.stringify(green)).not.toMatch(/Interested/);
  });

  it('is served only to the readers who are served that customer', async () => {
    const { svc, as } = setup();
    expect(JSON.stringify(await svc.board(as('u-kamau')))).not.toMatch(/Quote sent|Green Mart/);
    expect(JSON.stringify(await svc.board(as('u-wairimu')))).toMatch(/Quote sent\. Buys in January\./);
    await expect(svc.board(as('u-miriam'))).rejects.toThrow(ForbiddenException);
  });
});

describe('what the list never holds or does', () => {
  it('never what anybody said about a contact, no label and no address', async () => {
    const { svc, as } = setup();
    const b = JSON.stringify(await svc.board(as('u-grace')));
    expect(b).not.toMatch(/rude/);
    expect(b).not.toMatch(LABELS);
    expect(b).not.toMatch(/@/);
  });

  it('writes nothing: the customers stay the organisation’s own', async () => {
    const { svc, as, writes } = setup();
    await svc.board(as('u-grace'));
    expect(writes).toEqual([]);
    const own = readFileSync(join(__dirname, 'the-customers.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(own).not.toMatch(/\.(create|update|upsert|delete)(Many)?\(/);
    /* And never a contact's note. */
    expect(own).not.toMatch(/\bnote\b/);
  });
});
