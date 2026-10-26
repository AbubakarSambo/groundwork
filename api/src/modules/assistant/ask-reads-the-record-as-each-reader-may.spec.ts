import { theRecordTheyMayRead } from './a-question-is-answered-from-the-documents';

/** Polish round 1, 26 October 2026: Ask reads the record, a lead their team's and anybody else only their own. */
const NOW = new Date('2026-10-19T09:00:00+03:00');
const people = [
  { id: 'p-kevin', groundId: 'g', userId: 'u-kevin', email: 'kevin@x.test', nameGiven: null },
  { id: 'p-joseph', groundId: 'g', userId: 'u-joseph', email: 'joseph@x.test', nameGiven: null },
];
const users = [{ id: 'u-kevin', firstName: 'Kevin', lastName: 'Omondi' }, { id: 'u-joseph', firstName: 'Joseph', lastName: 'Kariuki' }];
const entries = [
  { participantId: 'p-kevin', text: 'Kilele Hotel paid for 40 units.', type: 'PROGRESS', createdAt: new Date('2026-10-12T11:00:00Z'), anchoredDocumentId: 'd1', disputedAt: null },
  { participantId: 'p-joseph', text: 'Mama Pima is a done deal, 15 units.', type: 'PROGRESS', createdAt: new Date('2026-10-13T11:00:00Z'), anchoredDocumentId: null, disputedAt: null },
];
const prisma: any = {
  ground: { findMany: jest.fn(async ({ where }: any) => [{ id: 'g', label: 'Sales team, Q4', initiatorId: 'u-grace' }].filter((g) => where.OR.some((o: any) => o.initiatorId === g.initiatorId || (o.participants && people.some((p) => p.userId === o.participants.some.userId))))) },
  groundParticipant: { findMany: jest.fn(async ({ where }: any) => people.filter((p) => !where.userId || p.userId === where.userId).map((p) => ({ ...p }))) },
  user: { findMany: jest.fn(async ({ where }: any) => users.filter((u) => where.id.in.includes(u.id))) },
  recordEntry: { findMany: jest.fn(async ({ where }: any) => entries.filter((e) => e.participantId === where.participantId)) },
  workItem: { findMany: jest.fn(async ({ where }: any) => [
    { id: 'w1', kind: 'deal', name: 'Kilele Hotel', stage: null, fields: { Units: '40' }, ownerParticipantId: 'p-kevin' },
    { id: 'w2', kind: 'deal', name: 'Mama Pima', stage: null, fields: { Units: '15' }, ownerParticipantId: 'p-joseph' },
  ].filter((i) => !where.ownerParticipantId || where.ownerParticipantId.in.includes(i.ownerParticipantId))) },
  itemEvidence: { findMany: jest.fn(async () => [{ workItemId: 'w1', readAs: 'A payment' }]) },
};

describe('Ask reads the record as each reader may', () => {
  it('Grace, who leads it, reads each person, what is proven and what is their word', async () => {
    const [doc] = await theRecordTheyMayRead(prisma, { organizationId: 'o', userId: 'u-grace' }, NOW);
    expect(doc.fileName).toBe('the record of Sales team, Q4');
    expect(doc.content).toContain('PERSON: Kevin Omondi');
    expect(doc.content).toContain('Monday 12 October, progress, proven by a document: Kilele Hotel paid for 40 units.');
    expect(doc.content).toContain('Tuesday 13 October, progress, their word: Mama Pima is a done deal, 15 units.');
    expect(doc.content).toContain("- Kilele Hotel, Kevin Omondi's. Units 40. Proof on file: a payment.");
    expect(doc.content).toContain("- Mama Pima, Joseph Kariuki's. Units 15. No proof on file.");
  });
  it('Kevin reads only his own, never Joseph\'s', async () => {
    const [doc] = await theRecordTheyMayRead(prisma, { organizationId: 'o', userId: 'u-kevin' }, NOW);
    expect(doc.content).toContain('PERSON: Kevin Omondi (you)');
    expect(doc.content).not.toMatch(/Joseph|Mama Pima/);
  });
});
