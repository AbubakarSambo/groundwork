import { sendTheLeadsDailySummaries, aCheckInInASentence } from './the-leads-daily-summary';

/**
 * Wairimu leads "Sales team, Q4" and has a check-in of her own on it. Her daily summary on WhatsApp
 * said "1 of 4 people have checked in, and Wairimu, Amani and Baraka have not yet" - her own name,
 * in the third person, to her. Found by driving the journeys through the signed webhook. She is "you".
 */
const NOW = new Date('2026-10-05T06:00:00Z');
const person = (first: string, userId: string, status: string) => ({ status, sessionNumber: 1, participant: { userId, managingOnly: false, nameGiven: null, user: { firstName: first, awaitingOrgApproval: false } } });

function aMorning(session: any[]) {
  const sent: string[] = [];
  const prisma: any = {
    ground: { findMany: jest.fn(async () => [{ id: 'g-sales', label: 'Sales team, Q4', organizationId: 'org-1', overWhatsApp: null, initiatorId: 'u-wairimu' }]) },
    organization: { findMany: jest.fn(async () => [{ id: 'org-1' }]) },
    checkIn: { findMany: jest.fn(async () => session) },
    user: { findUnique: jest.fn(async () => ({ firstName: 'Wairimu', phoneNumber: null, deletedAt: null })), findMany: jest.fn(async () => []) },
    person: { findFirst: jest.fn(async () => ({ phone: '+254711000111' })), findMany: jest.fn(async () => []) },
    leaveRequest: { findMany: jest.fn(async () => []) },
  };
  const whatsapp: any = { isEnabled: jest.fn(async () => true), sendFor: jest.fn(async (_o: string, _t: string, text: string) => { sent.push(text); return { sent: true }; }) };
  const boards: any = { leave: { board: jest.fn(async () => ({ waiting: [] })) } };
  return { run: () => sendTheLeadsDailySummaries({ prisma, whatsapp, boards, frontendUrl: 'https://myground.work' }, NOW), sent };
}

describe('what Wairimu reads about her own check-in', () => {
  it('"you" for herself, first, and "have" because "you" is plural to the verb', async () => {
    const m = aMorning([person('Chidi', 'u-chidi', 'COMPLETED'), person('Wairimu', 'u-wairimu', 'NOT_STARTED'), person('Amani', 'u-amani', 'IN_PROGRESS'), person('Baraka', 'u-baraka', 'NOT_STARTED')]);
    await m.run();
    expect(m.sent[0]).toContain('In "Sales team, Q4", 1 of 4 people has checked in for the first check-in, and you, Amani and Baraka have not yet.');
    expect(m.sent[0]).not.toMatch(/Wairimu, Amani|and Wairimu/);
  });
  it('when she is the only one left', async () => {
    const m = aMorning([person('Chidi', 'u-chidi', 'COMPLETED'), person('Amani', 'u-amani', 'COMPLETED'), person('Wairimu', 'u-wairimu', 'NOT_STARTED')]);
    await m.run();
    expect(m.sent[0]).toContain('2 of 3 people have checked in for the first check-in, and you have not yet.');
  });
  it('somebody else who is the only one left is still "has"', () => {
    expect(aCheckInInASentence({ label: 'Sales team, Q4', ofHowMany: 6, answered: 5, notYet: ['Omar'] })).toBe('In "Sales team, Q4", 5 of 6 people have checked in, and Omar has not yet.');
  });
});
