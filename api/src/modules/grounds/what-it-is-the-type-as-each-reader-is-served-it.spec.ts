import { GroundsService } from './grounds.service';
import { readPeopleAndSetup, whereTheTypeCameFrom } from './people-and-setup';
import { MUCHEMI_ORG, MUCHEMI_PEOPLE, MUCHEMI_FEE_NOTES, MUCHEMI_LITIGATION } from './__fixtures__/muchemi-and-co';

/**
 * "WHAT IT IS" ON PEOPLE AND SETUP: THE TYPE, AS EACH READER IS SERVED IT (Release 2, pull request 1 of 3; the B8 picture
 * people-and-setup-fee-notes-lead: "Kind of work: Fee notes and invoices, Loan repayments"). Read on Muchemi & Co (test)'s
 * weekly fee notes check-in, which Wanjiru Muchemi runs and Brian, Aisha and Njeri check in to.
 *
 *  - Wanjiru (the lead) is served the two types, the one read from her own words, and one sentence telling her to save to
 *    confirm it; once she confirms it, it is stored, and only then;
 *  - an admin who does not run it reads the same, said about Wanjiru, and cannot confirm it;
 *  - Brian (a team member) is served the short page, with no type in it;
 *  - with Release 2 off, the page is served exactly as before, with no type key at all, and nothing is ever written by a read.
 */
const NOW = new Date('2026-10-19T09:00:00Z');

function theFeeNotesCheckIn(over: { release2?: boolean; release1b?: boolean; ground?: Partial<typeof MUCHEMI_FEE_NOTES> | typeof MUCHEMI_LITIGATION; others?: any[] } = {}) {
  const g: any = { ...MUCHEMI_FEE_NOTES, ...(over.ground ?? {}) };
  const person = (key: keyof typeof MUCHEMI_PEOPLE) => {
    const p = MUCHEMI_PEOPLE[key];
    return {
      id: p.participantId, userId: p.userId, email: p.email, nameGiven: null, partyType: key === 'partner' ? 'INITIATOR' : 'PARTICIPANT',
      managingOnly: false, roleAsDescribed: key === 'partner' ? null : 'Follows up fee notes', inviteDeliveryStatus: 'DELIVERED', awaitingSeat: false,
      cameThroughTheLink: false, createdAt: new Date('2026-10-12'),
      user: { firstName: p.firstName, lastName: p.lastName, jobTitle: p.jobTitle, awaitingOrgApproval: false, phoneNumber: null },
    };
  };
  const participants = (g.people as readonly (keyof typeof MUCHEMI_PEOPLE)[]).map(person);
  const ground = {
    ...g, createdByUserId: g.initiatorId, status: 'ACTIVE', approvedById: null, cadenceAnchorDay: 1, runsUntilEnded: true, startsAt: new Date('2026-10-12T05:00:00Z'),
    endsAt: null, createdAt: new Date('2026-10-10T08:00:00Z'), overWhatsApp: null, peersVisibleToEachOther: true, restrictExternalVisibility: true,
    initiator: { firstName: 'Wanjiru', lastName: 'Muchemi' },
    organization: { name: MUCHEMI_ORG.name, timeZone: 'Africa/Nairobi', billWord: MUCHEMI_ORG.billWord, release2CollectionsOn: over.release2 ?? true, whatsappConnection: { enabled: true } },
    participants, checkIns: [], roundCompletions: [],
  };
  const users: Record<string, any> = {
    'u-wanjiru': { role: 'LEAD', organizationId: MUCHEMI_ORG.id, email: 'wanjiru@muchemi.test', awaitingOrgApproval: false },
    'u-brian': { role: 'MEMBER', organizationId: MUCHEMI_ORG.id, email: 'brian@muchemi.test', awaitingOrgApproval: false },
    'u-admin': { role: 'ADMIN', organizationId: MUCHEMI_ORG.id, email: 'office@muchemi.test', awaitingOrgApproval: false },
  };
  const writes: any[] = [];
  const write = (what: string) => jest.fn(async (a: any) => { writes.push([what, a]); return { id: ground.id, ...(a?.data ?? {}) }; });
  const prisma: any = {
    ground: {
      findFirst: jest.fn(async () => ground),
      findMany: jest.fn(async () => over.others ?? []),
      findUnique: jest.fn(async () => ({ id: ground.id, organizationId: ground.organizationId, initiatorId: ground.initiatorId, scenario: ground.scenario, createdByUserId: ground.createdByUserId, status: ground.status, approvedById: null, participants: participants.map((p) => ({ userId: p.userId, email: p.email })) })),
      update: write('ground.update'), updateMany: write('ground.updateMany'),
    },
    organization: { findUnique: jest.fn(async () => ({ release1bTabsOn: over.release1b ?? true, release2CollectionsOn: over.release2 ?? true })), update: write('organization.update') },
    user: { findUnique: jest.fn(async (a: any) => users[a.where.id] ?? null) },
    person: { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null) },
    platformSetting: { findUnique: jest.fn(async () => null), findFirst: jest.fn(async () => null) },
  };
  return { prisma, writes };
}

const read = (prisma: any, userId: string) => readPeopleAndSetup(prisma, { groundId: MUCHEMI_FEE_NOTES.id, organizationId: MUCHEMI_ORG.id, userId }, NOW);

describe('with Release 2 on', () => {
  it('Wanjiru reads the two types as the picture names them, the one read from her words, and how to confirm it', async () => {
    const { prisma, writes } = theFeeNotesCheckIn();
    const page: any = await read(prisma, 'u-wanjiru');
    expect(page.view).toBe('lead');
    expect(page.checkInType).toEqual({
      offered: [{ type: 'invoices or fee notes', label: 'Fee notes and invoices' }, { type: 'loans', label: 'Loan repayments' }],
      type: 'invoices or fee notes',
      confirmed: false,
      says: 'Groundwork read this from what you wrote when setting it up. Save changes to confirm it.',
      mayConfirm: true,
    });
    expect(writes).toEqual([]);
  });

  it('an admin who does not run it reads the same, said about Wanjiru, and may not confirm it', async () => {
    const { prisma } = theFeeNotesCheckIn();
    const page: any = await read(prisma, 'u-admin');
    expect(page.view).toBe('admin');
    expect(page.checkInType.says).toBe('Groundwork read this from what Wanjiru wrote when setting it up. Wanjiru has not confirmed it yet.');
    expect(page.checkInType.mayConfirm).toBe(false);
  });

  it('Brian, who checks in, is served his short page, with no type in it', async () => {
    const { prisma } = theFeeNotesCheckIn();
    const page: any = await read(prisma, 'u-brian');
    expect(page.view).toBe('member');
    expect(Object.keys(page)).not.toContain('checkInType');
  });

  it('once Wanjiru confirmed it, she reads that she did', async () => {
    const { prisma } = theFeeNotesCheckIn({ ground: { checkInType: 'invoices or fee notes', checkInTypeConfirmedAt: new Date('2026-10-19') } });
    const page: any = await read(prisma, 'u-wanjiru');
    expect(page.checkInType).toEqual(expect.objectContaining({ type: 'invoices or fee notes', confirmed: true, says: 'You confirmed this. The board, the reports and what each check-in asks about follow it.' }));
  });

  it('where her words say neither type and the firm has no word of its own, she is asked to choose', () => {
    expect(whereTheTypeCameFrom(null, false, true, 'Wanjiru')).toBe('Choose the kind of work, so the board and the reports fit it.');
    expect(whereTheTypeCameFrom('your organisation', false, true, 'Wanjiru')).toBe('Groundwork read this from your organisation\'s record. Save changes to confirm it.');
  });

  it('the litigation daily, a scenario with no types of its own, keeps its kind of work and is served no type row', async () => {
    const { prisma } = theFeeNotesCheckIn({ ground: MUCHEMI_LITIGATION });
    const page: any = await read(prisma, 'u-wanjiru');
    expect(page.kindOfWork).toBe('a law firm matter');
    expect(Object.keys(page)).not.toContain('checkInType');
  });
});

/* UPDATED 19 NOVEMBER (rest of the list): Release 2 has been always on since 15 November (Hafsah; release-2-collections.ts reads no column), so a column that says "off" changes nothing. These two tests pinned the October switch; they now pin that the column is not read, and that the page still holds the type. */
describe('the old Release 2 switch is no longer read: a column that says off changes nothing', () => {
  it('the lead is served the type, as everybody now is, and a read writes nothing', async () => {
    const { prisma, writes } = theFeeNotesCheckIn({ release2: false });
    const page: any = await read(prisma, 'u-wanjiru');
    expect(Object.keys(page)).toContain('checkInType');
    expect(writes).toEqual([]);
  });

});

describe('the type is stored only when the lead confirms it', () => {
  const grounds = (prisma: any) => Object.assign(Object.create(GroundsService.prototype), { prisma }) as GroundsService;

  it('Wanjiru confirms fee notes: the type and the day are written, and nothing else', async () => {
    const { prisma, writes } = theFeeNotesCheckIn();
    await grounds(prisma).confirmTheType(MUCHEMI_FEE_NOTES.id, 'u-wanjiru', { type: 'invoices or fee notes' });
    expect(writes).toHaveLength(1);
    const [what, a] = writes[0];
    expect(what).toBe('ground.update');
    expect(a.where).toEqual({ id: MUCHEMI_FEE_NOTES.id });
    expect(Object.keys(a.data).sort()).toEqual(['checkInType', 'checkInTypeConfirmedAt']);
    expect(a.data.checkInType).toBe('invoices or fee notes');
  });

  it('Brian may not confirm it, and nothing is written', async () => {
    const { prisma, writes } = theFeeNotesCheckIn();
    await expect(grounds(prisma).confirmTheType(MUCHEMI_FEE_NOTES.id, 'u-brian', { type: 'loans' })).rejects.toThrow();
    expect(writes).toEqual([]);
  });

  it('a type the scenario does not offer is refused in a full sentence', async () => {
    const { prisma, writes } = theFeeNotesCheckIn();
    await expect(grounds(prisma).confirmTheType(MUCHEMI_FEE_NOTES.id, 'u-wanjiru', { type: 'legal matter' })).rejects.toThrow('Choose one of these: Fee notes and invoices or Loan repayments.');
    expect(writes).toEqual([]);
  });

  it('with the old Release 2 column off, it is stored all the same, because the switch is no longer read (always on since 15 November)', async () => {
    const { prisma } = theFeeNotesCheckIn({ release2: false });
    await expect(grounds(prisma).confirmTheType(MUCHEMI_FEE_NOTES.id, 'u-wanjiru', { type: 'invoices or fee notes' })).resolves.toMatchObject({ checkInType: 'invoices or fee notes' });
  });

  it('a check-in whose scenario has no types of its own keeps its kind of work, and nothing is written', async () => {
    const { prisma, writes } = theFeeNotesCheckIn({ ground: MUCHEMI_LITIGATION });
    await expect(grounds(prisma).confirmTheType(MUCHEMI_LITIGATION.id, 'u-wanjiru', { type: 'legal matter' })).rejects.toThrow('This check-in has no type to choose. Its kind of work decides its board.');
    expect(writes).toEqual([]);
  });
});
