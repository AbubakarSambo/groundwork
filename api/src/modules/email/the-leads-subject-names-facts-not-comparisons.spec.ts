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
  it('names each person once, as what happened', () => {
    const l = theLeadsLetter([week()])!;
    expect(l.subject).toBe('Abigail closed 4 commitments; 2 handoffs are waiting on James');
    expect(l.lines.join(' ')).toContain('Abigail closed 4 commitments. 2 handoffs are waiting on James.');
    expect(l.subject + l.lines.join(' ')).not.toMatch(COMPARISON);
  });

  it('says "You" when the lead is the one, and a count when several people did it', () => {
    expect(theLeadsLetter([week({ closedBy: [{ name: 'you', count: 1 }], done: 1 })])!.subject).toBe('You closed 1 commitment; 2 handoffs are waiting on James');
    const l = theLeadsLetter([week({ closedBy: [{ name: 'Abigail', count: 3 }, { name: 'Femi', count: 1 }], waitingOn: [{ name: 'James', count: 1 }, { name: 'Bisi', count: 1 }] })])!;
    expect(l.subject).toBe('4 commitments were closed; 2 handoffs are still waiting');
    expect(l.subject).not.toMatch(/Abigail|Femi|James|Bisi/);
  });

  it('with nothing closed or waiting, says only who checked in, and names nobody', () => {
    expect(theLeadsLetter([week({ done: 0, waiting: 0, closedBy: [], waitingOn: [] })])!.subject).toBe('This week, 5 of 6 people checked in');
  });

  it('with several check-ins, adds nothing across them and names nobody', () => {
    const l = theLeadsLetter([week(), week({ groundId: 'g2', label: 'Product', ofHowMany: 4, checkedIn: 2 })])!;
    expect(l.subject).toBe('This week, 7 of 10 people checked in across your 2 check-ins');
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
