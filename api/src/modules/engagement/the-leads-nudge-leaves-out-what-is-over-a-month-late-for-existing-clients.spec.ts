import { everythingOutstandingFor } from './the-leads-daily-nudge';

/**
 * DECISION 121, ITEM 6. For an existing client, whose check-ins were made before the release (before the moment the engagement messages
 * began), the lead's daily nudge leaves out what is more than a month overdue. A check-in made since is untouched.
 * Wairimu leads "Sales team" (made 1 August, before the release on 1 September) and "Renewals push" (made 20 September). Today is 12 October.
 */
const NOW = new Date('2026-10-12T06:00:00Z');
const day = (s: string) => new Date(`${s}T00:00:00Z`);
const person = (userId: string, first: string) => ({ userId, email: `${first.toLowerCase()}@x.test`, nameGiven: null, managingOnly: false, leftAt: null, user: { firstName: first, lastName: null, awaitingOrgApproval: false } });
const SALES = { id: 'g-old', label: 'Sales team', scenario: 'ALIGNMENT', overWhatsApp: null, organizationId: 'org-1', initiatorId: 'u-wairimu', timelineDays: 84, cadence: 'WEEKLY', createdAt: day('2026-08-01') };
const RENEWALS = { id: 'g-new', label: 'Renewals push', scenario: 'ALIGNMENT', overWhatsApp: null, organizationId: 'org-1', initiatorId: 'u-wairimu', timelineDays: 84, cadence: 'WEEKLY', createdAt: day('2026-09-20') };
const PEOPLE: any[] = [
  { id: 'p-omar', groundId: 'g-old', ...person('u-omar', 'Omar') },
  { id: 'p-bisi', groundId: 'g-old', ...person('u-bisi', 'Bisi') },
  { id: 'p-kofi', groundId: 'g-new', ...person('u-kofi', 'Kofi') },
];
const promise = (text: string, due: string, who: string, ground: any) => ({ text, dueDate: day(due), groundId: ground.id, authoredBy: 'self', seenBySubject: true, participantId: PEOPLE.find((p) => p.userId === who)!.id, participant: { ...PEOPLE.find((p) => p.userId === who), ground } });

function morning(promises: any[], extra: { waits?: any[] } = {}) {
  const prisma: any = {
    ground: { findMany: jest.fn(async (a: any) => (a.where?.id?.in ? [SALES, RENEWALS].filter((g) => a.where.id.in.includes(g.id)) : [SALES, RENEWALS])) },
    platformSetting: { findUnique: jest.fn(async () => ({ value: { at: '2026-09-01T00:00:00Z' } })), create: jest.fn() },
    person: { findFirst: jest.fn(async () => null) },
    groundParticipant: { findMany: jest.fn(async ({ where }: any) => (where.userId ? [] : PEOPLE.filter((p) => where.groundId.in.includes(p.groundId)))) },
    personObjective: { findMany: jest.fn(async () => promises) },
    groundDependency: { findMany: jest.fn(async () => extra.waits ?? []) },
    subject: { findMany: jest.fn(async () => []) },
    groundObjective: { findMany: jest.fn(async () => []) },
    groundObjectiveSnapshot: { findMany: jest.fn(async () => []) },
    checkIn: { findMany: jest.fn(async () => []) },
    notification: { findMany: jest.fn(async () => []) },
  };
  const boards: any = { leave: { board: jest.fn(async () => ({ waiting: [] })) } };
  return everythingOutstandingFor(prisma, { userId: 'u-wairimu', organizationId: 'org-1' }, { boards }, NOW);
}

describe('the lead\'s nudge, for an existing client', () => {
  const stale = promise('send the old price list', '2026-08-20', 'u-omar', SALES);
  const recent = promise('call the Naivas buyer', '2026-09-27', 'u-bisi', SALES);
  const newOneLong = promise('update the renewals sheet', '2026-08-25', 'u-kofi', RENEWALS);

  it('leaves out what is more than a month overdue on a check-in made before the release, and keeps what is less', async () => {
    const read = await morning([stale, recent]);
    const all = JSON.stringify(read);
    expect(all).not.toContain('old price list');
    expect(read!.overdueOnYourTeam.join(' ')).toContain('Bisi committed to “call the Naivas buyer”');
    expect(read!.overdueOnYourTeam.join(' ')).toContain('15 days late');
  });

  it('keeps the same item on a check-in made since the release', async () => {
    const read = await morning([stale, newOneLong]);
    expect(read!.overdueOnYourTeam.join(' ')).toContain('Kofi committed to “update the renewals sheet”');
    expect(read!.overdueOnYourTeam.join(' ')).not.toContain('old price list');
  });

  it('says nothing at all when the only things outstanding are that old', async () => {
    expect(await morning([stale])).toBeNull();
  });

  it('keeps the most overdue first among what is left', async () => {
    const twentyDays = promise('write up the Mombasa visit', '2026-09-22', 'u-omar', SALES);
    const read = await morning([recent, twentyDays, newOneLong]);
    const lines = read!.overdueOnYourTeam;
    expect(lines[0]).toContain('renewals sheet');
    expect(lines[1]).toContain('Mombasa visit');
    expect(lines[2]).toContain('Naivas buyer');
  });
});

/*
 * (Final check, 9 October.) The same for a wait or a blocker that has been open for more than a month, which has no day of its own and so
 * was never "overdue": it sat in Risks every morning for an existing client's check-in.
 */
describe('the lead\'s nudge, for an existing client: a wait open for more than a month', () => {
  const OMAR = PEOPLE[0];
  const BISI = PEOPLE[1];
  const wait = (id: string, groundId: string, what: string, createdAt: string) => ({
    id, groundId, what, namedTheThing: true, onLabel: null, status: 'WAITING', createdAt: day(createdAt), dueOn: null, blockerKind: null,
    fromParticipantId: BISI.id, onParticipantId: OMAR.id,
    fromParticipant: { ...BISI }, onParticipant: { ...OMAR },
  });
  it('leaves it out for a check-in made before the release, and keeps a younger one', async () => {
    const read = await morning([], { waits: [wait('w-old', 'g-old', 'the price list for Mombasa', '2026-08-20'), wait('w-young', 'g-old', 'the stock count for Kisumu', '2026-09-20')] });
    const risks = (read?.risks ?? []).join(' ');
    expect(risks).not.toContain('price list for Mombasa');
    expect(risks).toContain('stock count for Kisumu');
  });
  it('keeps the same old wait on a check-in made since the release', async () => {
    const read = await morning([], { waits: [{ ...wait('w-old2', 'g-new', 'the price list for Mombasa', '2026-08-20'), fromParticipantId: PEOPLE[2].id, fromParticipant: { ...PEOPLE[2] } }] });
    expect((read?.risks ?? []).join(' ')).toContain('price list for Mombasa');
  });
});
