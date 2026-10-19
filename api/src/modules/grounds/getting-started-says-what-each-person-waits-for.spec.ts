import { whereEachPersonIsGettingStarted, readWhereEachPersonIsGettingStarted, type APersonsRows } from './getting-each-person-started';

/**
 * GETTING EACH PERSON STARTED SAYS WHAT EACH PERSON IS WAITING FOR (messages test, 19 October, findings 9 and 10).
 *
 * 9. Drop Access (test), Monday 12 October. Amos joined Sales team, Q4 by the link and waited for Grace to let him in. Getting each person
 *    started told her "Amos opened the link on Monday, but has not started a check-in yet.": the one thing stopping him was her own
 *    approval, and the line did not say so.
 * 10. Muchemi & Co. (test), Wednesday to Friday. Fee notes runs on Mondays. Wanjiru read "Brian checked in once, on Monday, and has not
 *    come back since." when his next check-in had not opened yet, so nobody could have come back.
 */
const amos: APersonsRows = {
  participantId: '337d1403-55e7-41bb-84b7-e77bd83a8151', name: 'Amos Kiprono', team: null, invitedAt: new Date('2026-10-12T06:12:00Z'), acceptedAt: new Date('2026-10-12T06:13:00Z'),
  hasAnAccount: true, bounced: false, delivered: false, waitingToBeLetIn: true,
  checkIns: [{ startedAt: null, completedAt: null, quietClose: false }],
};
const brian: APersonsRows = {
  participantId: '52af0577-9d36-445b-aa10-ed237301e098', name: 'Brian Otieno', team: null, invitedAt: new Date('2026-10-12T06:00:00Z'), acceptedAt: new Date('2026-10-12T06:05:00Z'),
  hasAnAccount: true, bounced: false, delivered: true,
  checkIns: [
    { startedAt: new Date('2026-10-12T08:20:00Z'), completedAt: new Date('2026-10-12T08:31:00Z'), quietClose: false, sessionNumber: 1, availableFrom: null },
    { startedAt: null, completedAt: null, quietClose: false, sessionNumber: 2, availableFrom: new Date('2026-10-19T05:00:00Z') },
  ],
};

describe('getting each person started says what each person is waiting for', () => {
  it('9. Grace, an admin, reads that Amos is waiting for her to let him in', () => {
    const [p] = whereEachPersonIsGettingStarted([amos], new Date('2026-10-12T06:20:00Z'), { readerIsAnAdmin: true });
    expect(p.says).toBe('Amos opened the link on Monday, and is waiting for you to let them in before they can start a check-in. You can let them in on the People page.');
  });

  it('9. a lead who is not an admin reads that an admin has to let them in', () => {
    const [p] = whereEachPersonIsGettingStarted([amos], new Date('2026-10-12T06:20:00Z'), { readerIsAnAdmin: false });
    expect(p.says).toBe('Amos opened the link on Monday, and is waiting for an admin of your organisation to let them in before they can start a check-in.');
  });

  it('10. Wanjiru reads on Wednesday when Brian\'s next check-in opens, never that he has not come back', () => {
    const [p] = whereEachPersonIsGettingStarted([brian], new Date('2026-10-14T09:00:00Z'));
    expect(p.says).toBe('Brian checked in on Monday. Brian\'s next check-in opens on Monday 19 October.');
    expect(p.says).not.toContain('has not come back');
  });

  it('10. once his next check-in has opened and he has not answered it, "has not come back since" is true and is said', () => {
    const [p] = whereEachPersonIsGettingStarted([brian], new Date('2026-10-20T09:00:00Z'));
    expect(p.says).toBe('Brian checked in once, on 12 October, and has not come back since.');
  });

  it('as served: the rows are read with who is waiting at the door, and the next check-in\'s day', async () => {
    const prisma: any = {
      ground: { findFirst: jest.fn(async () => ({ id: 'g', initiatorId: 'u-grace', createdByUserId: 'u-grace' })) },
      groundParticipant: {
        findMany: jest.fn(async () => [{
          id: amos.participantId, email: 'amos@dropaccess.test', nameGiven: null, invitedAt: amos.invitedAt, acceptedAt: amos.acceptedAt, userId: 'u-amos', inviteDeliveryStatus: null, department: null,
          user: { firstName: 'Amos', lastName: 'Kiprono', awaitingOrgApproval: true }, checkIns: [{ startedAt: null, completedAt: null, closedReason: null, sessionNumber: 1, availableFrom: null }],
        }]),
      },
    };
    const read = await readWhereEachPersonIsGettingStarted(prisma, { groundId: 'g', organizationId: 'drop', userId: 'u-grace', role: 'ADMIN' }, new Date('2026-10-12T06:20:00Z'));
    expect(read.people[0].says).toBe('Amos opened the link on Monday, and is waiting for you to let them in before they can start a check-in. You can let them in on the People page.');
  });
});
