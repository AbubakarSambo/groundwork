import { theLeadsLetter, theWeekOf, type AWeekInOneCheckIn } from './the-leads-weekly-letter';

/**
 * NAMES IN THE LEAD'S SUBJECT, AS FACTS AND NEVER AS COMPARISONS (decision 109 item 3), AS WAIRIMU READS IT.
 *
 * "Abigail closed 4 commitments; 2 handoffs are waiting on James" says what happened. It never says who is ahead, who
 * is behind, or how a person is doing, and a name is used only when the fact is about that one person.
 */
const week = (over: Partial<AWeekInOneCheckIn> = {}): AWeekInOneCheckIn => ({
  groundId: 'g1', label: 'Sales team, Q4', ofHowMany: 6, checkedIn: 5, notYet: ['Omar'], saidWhatNext: 3, done: 4, waiting: 2,
  closedBy: [{ name: 'Abigail', count: 4 }], waitingOn: [{ name: 'James', count: 2 }], ...over,
});
const COMPARISON = /ahead|behind|best|worst|strong|weak|carrying|struggl|falling|slow|more than|less than|better|worse|rank/i;

describe('the subject Wairimu reads', () => {
  it('names a person when one person closed all of them, and when all the handoffs wait on one person, and says the same in the body', () => {
    const l = theLeadsLetter([week()])!;
    expect(l.subject).toBe('Four things people said they would do were done, all by Abigail; two handoffs are still waiting, both on James');
    expect(l.lines.join(' ')).toContain('Four things people said they would do were done, all by Abigail. Two handoffs are still waiting, both on James.');
    expect(l.subject + l.lines.join(' ')).not.toMatch(COMPARISON);
    expect(l.subject + l.lines.join(' ')).not.toMatch(/commitment/);
  });

  it('says "you" when the lead is the one, and one by one in the singular', () => {
    expect(theLeadsLetter([week({ closedBy: [{ name: 'you', count: 1 }], done: 1, waiting: 1, waitingOn: [{ name: 'James', count: 1 }] })])!.subject)
      .toBe('One thing people said they would do was done, by you; one handoff is still waiting, on James');
  });

  it('names nobody when the facts are about several people, or when one person closed only some of them', () => {
    const l = theLeadsLetter([week({ closedBy: [{ name: 'Abigail', count: 3 }, { name: 'Femi', count: 1 }], waitingOn: [{ name: 'James', count: 1 }, { name: 'Bisi', count: 1 }] })])!;
    expect(l.subject).toBe('Four things people said they would do were done; two handoffs are still waiting');
    expect(l.subject).not.toMatch(/Abigail|Femi|James|Bisi/);
    const some = theLeadsLetter([week({ closedBy: [{ name: 'Abigail', count: 3 }], done: 4, waitingOn: [{ name: 'James', count: 1 }], waiting: 2 })])!;
    expect(some.subject + some.lines.join(' ')).not.toMatch(/Abigail|James/);
  });

  it('with nothing closed or waiting, says only who checked in, in words, and names nobody', () => {
    expect(theLeadsLetter([week({ done: 0, waiting: 0, closedBy: [], waitingOn: [] })])!.subject).toBe('This week, five of six people checked in');
  });

  it('with several check-ins, counts a person who is in two of them once, and names nobody', () => {
    const a = week({ answerableIds: ['u1', 'u2', 'u3', 'u4', 'u5', 'u6'], checkedInIds: ['u1', 'u2', 'u3', 'u4', 'u5'] });
    const b = week({ groundId: 'g2', label: 'Product', ofHowMany: 4, checkedIn: 2, answerableIds: ['u1', 'u2', 'u7', 'u8'], checkedInIds: ['u1', 'u2'] });
    expect(theLeadsLetter([a, b])!.subject).toBe('This week, five of eight people checked in across your two check-ins');
  });
});

describe('what the names are built from', () => {
  it('only people who can answer in this check-in, counted in this check-in alone', async () => {
    const people = [
      { id: 'p-a', userId: 'u-a', managingOnly: false, nameGiven: null, user: { firstName: 'Abigail', lastName: null, awaitingOrgApproval: false } },
      { id: 'p-j', userId: 'u-j', managingOnly: false, nameGiven: null, user: { firstName: 'James', lastName: null, awaitingOrgApproval: false } },
      { id: 'p-g', userId: 'u-g', managingOnly: true, nameGiven: null, user: { firstName: 'Grace', lastName: null, awaitingOrgApproval: false } },
    ];
    const prisma: any = {
      groundParticipant: { findMany: async () => people },
      checkIn: { findMany: async () => [] },
      groundCommitment: {
        findMany: async ({ where }: any) => (where.status === 'DONE'
          ? ['p-a', 'p-a', 'p-g'].map((participantId) => ({ participantId, status: 'DONE' }))
          : []),
        count: async () => 3,
      },
      groundDependency: { findMany: async () => ['p-j', 'p-j'].map((onParticipantId) => ({ onParticipantId, status: 'WAITING' })), count: async () => 2 },
    };
    const w = await theWeekOf(prisma, { id: 'g1', label: 'Sales team, Q4', initiatorId: 'u-lead' }, new Date('2026-10-09T14:00:00Z'));
    expect(w.closedBy).toEqual([{ name: 'Abigail', count: 2 }]);
    expect(w.waitingOn).toEqual([{ name: 'James', count: 2 }]);
    expect(JSON.stringify(w)).not.toContain('Grace');
  });
});
