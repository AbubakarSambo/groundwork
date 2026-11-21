import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CompanyService, NOT_YOUR_DESK } from './company.service';
import { CompanyController } from './company.controller';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { WHAT_IS_IN_IT_PROMPT, aDeskKeyFor } from '../knowledge/the-desk';

/**
 * THE DESK (S7, 20 November 2026), AS EACH READER IS SERVED IT. Hafsah: "The Company page is a mess. Rebuild it as the
 * Desk, as designed: the organisation's shared context (policies, handbook, procedures, documents, the directory), clear
 * and simple. Admins and managers can upload company context there, and by chat. Each document is read, summarised, and
 * used by the chat and the check-ins."
 *
 * Baridi Appliances: Grace is the admin, Wairimu a lead, Miriam a member, Kofi a guest from another company. Everything
 * below is what each of them is served, and what the server refuses them, decided on the server.
 */
const ORG = 'org-baridi';

const users: Record<string, any> = {
  'u-grace': { id: 'u-grace', email: 'grace@baridi.test', firstName: 'Grace', lastName: 'Wanjiru', jobTitle: 'Chief executive', phoneNumber: '+254700000001', isActive: true, deletedAt: null },
  'u-wairimu': { id: 'u-wairimu', email: 'wairimu@baridi.test', firstName: 'Wairimu', lastName: 'Kamau', jobTitle: 'Sales lead', phoneNumber: null, isActive: true, deletedAt: null },
  'u-miriam': { id: 'u-miriam', email: 'miriam@baridi.test', firstName: 'Miriam', lastName: 'Otieno', jobTitle: null, phoneNumber: '+254700000002', isActive: true, deletedAt: null },
  'u-kofi': { id: 'u-kofi', email: 'kofi@elsewhere.test', firstName: 'Kofi', lastName: 'Mensah', jobTitle: 'Buyer', phoneNumber: '+233200000000', isActive: true, deletedAt: null },
};
const memberships = [
  { organizationId: ORG, userId: 'u-grace', role: 'ADMIN', team: null, reportsToUserId: null, heldForASeat: false, user: users['u-grace'] },
  { organizationId: ORG, userId: 'u-wairimu', role: 'LEAD', team: 'Sales', reportsToUserId: 'u-grace', heldForASeat: false, user: users['u-wairimu'] },
  { organizationId: ORG, userId: 'u-miriam', role: 'MEMBER', team: 'Sales', reportsToUserId: 'u-wairimu', heldForASeat: false, user: users['u-miriam'] },
  { organizationId: ORG, userId: 'u-kofi', role: 'GUEST', team: null, reportsToUserId: null, heldForASeat: false, user: users['u-kofi'] },
  { organizationId: 'org-other', userId: 'u-other', role: 'ADMIN', team: null, reportsToUserId: null, heldForASeat: false, user: { id: 'u-other', firstName: 'SOMEBODY-ELSES-PERSON', lastName: '', email: 'x@other.test', isActive: true, deletedAt: null } },
];
const cards = [
  { organizationId: ORG, key: 'desk:leave-policy#1', title: 'Leave policy - Leave', body: 'Everyone has 21 days a year.', effectiveTo: null },
  { organizationId: ORG, key: 'desk:leave-policy#2', title: 'Leave policy - Asking', body: 'Ask your manager two weeks before.', effectiveTo: null },
  { organizationId: ORG, key: 'how-contracting-works', title: 'How contracting works', body: 'Legal signs every contract.', effectiveTo: null },
  { organizationId: 'org-other', key: 'their-secret', title: 'SOMEBODY-ELSES-DOCUMENT', body: 'x', effectiveTo: null },
];
const deskRows = [
  { organizationId: ORG, key: 'desk:leave-policy', title: 'Leave policy', summary: 'Everyone has 21 days of leave a year, and asks their manager two weeks before.', addedByUserId: 'u-grace', createdAt: new Date('2026-11-19T09:00:00Z'), updatedAt: new Date('2026-11-19T09:00:00Z') },
];

function matches(row: any, where: any): boolean {
  return Object.entries(where ?? {}).every(([k, v]: [string, any]) => {
    if (k === 'OR') return (v as any[]).some((w) => matches(row, w));
    if (k === 'user') return matches(row.user ?? {}, v);
    if (v && typeof v === 'object' && 'not' in v) return row[k] !== v.not;
    if (v && typeof v === 'object' && 'startsWith' in v) return String(row[k]).startsWith(v.startsWith);
    if (v && typeof v === 'object' && 'in' in v) return v.in.includes(row[k]);
    if (v === null) return row[k] == null;
    if (v === false && k !== 'heldForASeat') return !row[k];
    return row[k] === v || (v === false && !row[k]);
  });
}

function world() {
  const prisma: any = {
    user: { findUnique: jest.fn(async () => ({ awaitingOrgApproval: false })) },
    organization: { findUnique: jest.fn(async () => ({ name: 'Baridi Appliances' })) },
    subject: { findMany: jest.fn(async () => []) },
    person: { findMany: jest.fn(async () => []) },
    ground: { findMany: jest.fn(async () => []) },
    companyPicture: { findUnique: jest.fn(async () => null) },
    organizationMemory: { findMany: jest.fn(async () => []) },
    organizationMembership: { findMany: jest.fn(async ({ where }: any) => memberships.filter((m) => matches(m, where))) },
    knowledgeCard: { findMany: jest.fn(async ({ where }: any) => cards.filter((c) => matches(c, where))) },
    deskDocument: {
      findMany: jest.fn(async ({ where }: any) => deskRows.filter((r) => r.organizationId === where.organizationId)),
      findUnique: jest.fn(async ({ where }: any) => deskRows.find((r) => r.organizationId === where.organizationId_key.organizationId && r.key === where.organizationId_key.key) ?? null),
    },
  };
  const grounds: any = { list: jest.fn(async () => []) };
  const knowledge: any = { ingestDocument: jest.fn(async () => ({ key: 'k', chunks: 1, retired: 0, summary: 'A short summary.' })) };
  const documents: any = { textOutOf: jest.fn(async () => 'Travel\n\nUse the travel form five working days before you travel.') };
  const svc = new CompanyService(prisma, grounds, knowledge, documents);
  const as = (userId: string, role: string) => ({ userId, email: users[userId]?.email ?? '', organizationId: ORG, role });
  return { svc, prisma, knowledge, documents, as };
}

describe('what each reader of Baridi Appliances is served on the Desk', () => {
  it('Grace, the admin, reads each document with its kept summary, who added it, and may add one', async () => {
    const { svc, as } = world();
    const page: any = await svc.forReader(as('u-grace', 'ADMIN'));
    expect(page.desk.documents).toEqual([
      { key: 'desk:leave-policy', title: 'Leave policy', summary: 'Everyone has 21 days of leave a year, and asks their manager two weeks before.', added: 'Grace Wanjiru added this on 19 November 2026.' },
      { key: 'how-contracting-works', title: 'How contracting works', summary: null, added: null },
    ]);
    expect(page.desk.mayAdd).toBe(true);
  });

  /* Phone numbers (O-11, Hafsah's decision): an admin reads every number, anybody else only their own. Decided on the server. */
  const row = (id: string, name: string, jobTitle: string | null, team: string | null, reportsTo: string | null, phone: string | null) => ({ id, name, jobTitle, team, reportsTo, phone });
  it('Grace, the admin, reads the directory with every phone number there is', async () => {
    const { svc, as } = world();
    expect(((await svc.forReader(as('u-grace', 'ADMIN'))) as any).desk.directory).toEqual([
      row('u-grace', 'Grace Wanjiru', 'Chief executive', null, null, '+254700000001'),
      row('u-miriam', 'Miriam Otieno', null, 'Sales', 'Wairimu Kamau', '+254700000002'),
      row('u-wairimu', 'Wairimu Kamau', 'Sales lead', 'Sales', 'Grace Wanjiru', null),
    ]);
  });

  it('Wairimu, a lead, reads names, job titles, teams and who each reports to, and no colleague\'s number', async () => {
    const { svc, as } = world();
    expect(((await svc.forReader(as('u-wairimu', 'LEAD'))) as any).desk.directory).toEqual([
      row('u-grace', 'Grace Wanjiru', 'Chief executive', null, null, null),
      row('u-miriam', 'Miriam Otieno', null, 'Sales', 'Wairimu Kamau', null),
      row('u-wairimu', 'Wairimu Kamau', 'Sales lead', 'Sales', 'Grace Wanjiru', null),
    ]);
  });

  it('Miriam, a member, reads the same, with only her own number', async () => {
    const { svc, as } = world();
    const said = ((await svc.forReader(as('u-miriam', 'MEMBER'))) as any).desk.directory;
    expect(said).toEqual([
      row('u-grace', 'Grace Wanjiru', 'Chief executive', null, null, null),
      row('u-miriam', 'Miriam Otieno', null, 'Sales', 'Wairimu Kamau', '+254700000002'),
      row('u-wairimu', 'Wairimu Kamau', 'Sales lead', 'Sales', 'Grace Wanjiru', null),
    ]);
    expect(JSON.stringify(said)).not.toContain('+254700000001');
  });

  it('the directory never holds a guest, another organisation\'s people, an address, or another organisation\'s documents', async () => {
    const { svc, as } = world();
    const said = JSON.stringify((await svc.forReader(as('u-miriam', 'MEMBER')) as any).desk);
    for (const s of ['Kofi', 'SOMEBODY-ELSES-PERSON', 'SOMEBODY-ELSES-DOCUMENT', '@', 'email']) expect(said).not.toContain(s);
  });

  it('Wairimu, a lead, may add a document; Miriam, a member, may not', async () => {
    const { svc, as } = world();
    expect(((await svc.forReader(as('u-wairimu', 'LEAD'))) as any).desk.mayAdd).toBe(true);
    expect(((await svc.forReader(as('u-miriam', 'MEMBER'))) as any).desk.mayAdd).toBe(false);
  });

  it('Kofi, a guest, is served one plain sentence by the route and nothing of the organisation', async () => {
    const { svc, prisma, as } = world();
    await expect(svc.forReader(as('u-kofi', 'GUEST'))).rejects.toBeInstanceOf(ForbiddenException);
    const page = await new CompanyController(svc).page({ id: 'u-kofi', email: 'kofi@elsewhere.test', organizationId: ORG, role: 'GUEST' } as any);
    expect(page).toEqual({ name: 'Baridi Appliances', outsider: 'The Desk is for the people who work at Baridi Appliances, so there is nothing here for you to read. You can still open any check-in you were added to.' });
    expect(NOT_YOUR_DESK('Baridi Appliances')).toBe((page as any).outsider);
    expect(prisma.knowledgeCard.findMany).not.toHaveBeenCalled();
    expect(prisma.organizationMembership.findMany).not.toHaveBeenCalled();
  });
});

describe('a document in full', () => {
  it('reads back in order, each section under its heading, for anybody who works here', async () => {
    const { svc, as } = world();
    const doc = await svc.aDocument(as('u-miriam', 'MEMBER'), 'desk:leave-policy');
    expect(doc).toEqual({
      key: 'desk:leave-policy',
      title: 'Leave policy',
      summary: 'Everyone has 21 days of leave a year, and asks their manager two weeks before.',
      text: 'Leave\n\nEveryone has 21 days a year.\n\nAsking\n\nAsk your manager two weeks before.',
    });
  });

  it('is never another organisation\'s, and a guest is refused it', async () => {
    const { svc, as } = world();
    await expect(svc.aDocument(as('u-grace', 'ADMIN'), 'their-secret')).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.aDocument(as('u-kofi', 'GUEST'), 'desk:leave-policy')).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('adding a document on the Desk', () => {
  it('Miriam, a member, is refused before anything is read', async () => {
    const { svc, knowledge, documents, as } = world();
    await expect(svc.addADocument(as('u-miriam', 'MEMBER'), { text: 'x', title: 'X' })).rejects.toThrow(
      new ForbiddenException('Only an admin or a lead of Baridi Appliances can add a document for the whole organisation.'),
    );
    await expect(svc.addADocument(as('u-kofi', 'GUEST'), { text: 'x', title: 'X' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(documents.textOutOf).not.toHaveBeenCalled();
    expect(knowledge.ingestDocument).not.toHaveBeenCalled();
  });

  it('Wairimu, a lead, pastes text: it is kept the one way every document is, under the Desk\'s key, as hers', async () => {
    const { svc, knowledge, as } = world();
    const out = await svc.addADocument(as('u-wairimu', 'LEAD'), { title: 'Travel', text: 'Use the travel form five working days before you travel.' });
    expect(knowledge.ingestDocument).toHaveBeenCalledWith(ORG, {
      key: 'desk:travel', title: 'Travel', text: 'Use the travel form five working days before you travel.', kind: 'handbook', sourceRef: null, sourceSystem: 'desk', addedByUserId: 'u-wairimu',
    });
    expect(out).toEqual({ key: 'desk:travel', title: 'Travel', summary: 'A short summary.' });
  });

  it('Grace uploads a file: it is read by the same reader Ask uses, and titled from its name', async () => {
    const { svc, knowledge, documents, as } = world();
    const file: any = { originalname: 'Travel_policy.pdf', size: 10, mimetype: 'application/pdf', buffer: Buffer.from('x') };
    await svc.addADocument(as('u-grace', 'ADMIN'), { file });
    expect(documents.textOutOf).toHaveBeenCalledWith(file);
    expect(knowledge.ingestDocument.mock.calls[0][1]).toMatchObject({ key: aDeskKeyFor('Travel policy'), title: 'Travel policy', sourceRef: 'Travel_policy.pdf' });
  });

  it('a document with no words in it is refused in a plain sentence', async () => {
    const { svc, as } = world();
    await expect(svc.addADocument(as('u-grace', 'ADMIN'), { title: 'Travel', text: '   ' })).rejects.toThrow(
      new BadRequestException('I could not find any words in Travel, so there is nothing to add. If it is a scan, try a copy that has the text in it.'),
    );
  });
});

describe('the summary is written once, by the model, and kept with the document', () => {
  function knowledgeWorld(before: any = null) {
    const upserts: any[] = [];
    const prisma: any = {
      $transaction: async (fn: any) => fn(prisma),
      knowledgeCard: {
        findFirst: jest.fn(async () => null),
        findMany: jest.fn(async () => []),
        create: jest.fn(async ({ data }: any) => ({ id: 'c', ...data })),
        update: jest.fn(async () => ({})),
      },
      deskDocument: {
        findUnique: jest.fn(async () => before),
        upsert: jest.fn(async (a: any) => { upserts.push(a); return {}; }),
      },
    };
    const engine: any = { respond: jest.fn(async () => 'This is the leave policy. Everyone has 21 days a year.') };
    return { k: new KnowledgeService(prisma, engine), engine, upserts };
  }
  const input = { key: 'desk:leave-policy', title: 'Leave policy', text: 'Leave\n\nEveryone has 21 days a year.', addedByUserId: 'u-grace' };

  it('a new document is summarised by the model with the say-what-is-in-it prompt, and the summary is kept', async () => {
    const { k, engine, upserts } = knowledgeWorld();
    const out = await k.ingestDocument(ORG, input);
    expect(engine.respond).toHaveBeenCalledTimes(1);
    expect(engine.respond.mock.calls[0][0]).toBe(WHAT_IS_IN_IT_PROMPT);
    expect(out.summary).toBe('This is the leave policy. Everyone has 21 days a year.');
    expect(upserts[0].create).toMatchObject({ organizationId: ORG, key: 'desk:leave-policy', title: 'Leave policy', summary: out.summary, addedByUserId: 'u-grace' });
  });

  it('the same words again keep their summary, and the model is not asked again', async () => {
    const first = knowledgeWorld();
    await first.k.ingestDocument(ORG, input);
    const kept = first.upserts[0].create;
    const again = knowledgeWorld({ ...kept });
    const out = await again.k.ingestDocument(ORG, input);
    expect(again.engine.respond).not.toHaveBeenCalled();
    expect(out.summary).toBe(kept.summary);
  });

  it('a summary already said back in Ask is kept as it was said', async () => {
    const { k, engine } = knowledgeWorld();
    const out = await k.ingestDocument(ORG, { ...input, summary: 'What Grace read in Ask.' });
    expect(engine.respond).not.toHaveBeenCalled();
    expect(out.summary).toBe('What Grace read in Ask.');
  });

  it('a model that does not answer keeps the document, with no summary', async () => {
    const { k, engine, upserts } = knowledgeWorld();
    engine.respond.mockRejectedValue(new Error('down'));
    const out = await k.ingestDocument(ORG, input);
    expect(out.chunks).toBeGreaterThan(0);
    expect(out.summary).toBeNull();
    expect(upserts[0].create.summary).toBeNull();
  });
});

describe('the people on the roster who never sign in are on the Desk too (Batch D, R7, D19)', () => {
  /* The 85 people a senior person works with were on the roster, written to and answered, and the Desk said "3 people work here". */
  const roster = [
    { id: 'p-ahmed', organizationId: ORG, externalId: 'team-1', active: true, linkedUserId: null, email: 'ahmed.bako@example.com', displayName: 'Ahmed Bako', title: 'Government Relations manager', phone: '+2348032000013' },
    { id: 'p-guest', organizationId: ORG, externalId: 'guest:kofi', active: true, linkedUserId: null, email: null, displayName: 'Kofi', title: null, phone: null },
    { id: 'p-gone', organizationId: ORG, externalId: 'team-2', active: false, linkedUserId: null, email: null, displayName: 'Somebody Who Left', title: null, phone: null },
  ];
  const withTheRoster = () => {
    const w = world();
    w.prisma.person.findMany = jest.fn(async ({ where }: any) => (where?.linkedUserId === null
      ? roster.filter((p) => p.organizationId === where.organizationId && p.active === where.active && !String(p.externalId).startsWith(where.NOT.externalId.startsWith))
      : []));
    return w;
  };
  it('lists them by name and job title for everyone, with their number for an admin only, and counts them', async () => {
    const { svc, as } = withTheRoster();
    const admin: any = await svc.forReader(as('u-grace', 'ADMIN'));
    const member: any = await svc.forReader(as('u-miriam', 'MEMBER'));
    expect(admin.desk.directory.find((p: any) => p.name === 'Ahmed Bako')).toEqual({ id: 'person:p-ahmed', name: 'Ahmed Bako', jobTitle: 'Government Relations manager', team: null, reportsTo: null, phone: '+2348032000013' });
    expect(member.desk.directory.find((p: any) => p.name === 'Ahmed Bako')).toEqual({ id: 'person:p-ahmed', name: 'Ahmed Bako', jobTitle: 'Government Relations manager', team: null, reportsTo: null, phone: null });
    for (const said of [JSON.stringify(admin.desk), JSON.stringify(member.desk)]) for (const s of ['Kofi', 'Somebody Who Left', 'ahmed.bako@example.com']) expect(said).not.toContain(s);
    console.log(`WHAT GRACE READS AT THE TOP OF THE DESK\n${admin.line}`);
    expect(admin.line).toMatch(new RegExp(`${admin.desk.directory.length} people work here`));
  });
});
