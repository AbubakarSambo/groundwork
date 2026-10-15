import { howACheckInIsGoing } from './how-a-check-in-is-going';

/**
 * THE LEAD'S BOARD STORY SAID "One of the two people has answered so far." FOR MINUTES AFTER THE SECOND PERSON ANSWERED, BESIDE "2/2 active".
 * The opening is written once, when the round's report is taken. The count in its first sentence is now the record's own, for whoever runs the check-in,
 * while that round is the open one. The check-ins list never carries a stored count (request 97b), and a round that is no longer the open one keeps its words.
 */
const person = (id: string, first: string, partyType = 'PARTICIPANT') => ({ id, userId: `u-${id}`, partyType, managingOnly: false, email: `${first}@x.test`, createdAt: new Date('2026-09-01'), user: { firstName: first, lastName: 'Test', awaitingOrgApproval: false } });
const row = (pid: string, n: number, status: string) => ({ participantId: pid, sessionNumber: n, status, isSetup: false, createdAt: new Date('2026-10-01'), availableFrom: new Date('2026-10-01'), completedAt: status === 'COMPLETED' ? new Date('2026-10-02') : null });
const base = (answered: number, over: any = {}) => ({
  participants: [person('juma', 'Juma'), person('wanjiru', 'Wanjiru')],
  checkIns: [row('juma', 1, 'COMPLETED'), row('wanjiru', 1, answered >= 2 ? 'COMPLETED' : 'NOT_STARTED')],
  dependencies: [], timelineDays: 28, cadence: 'WEEKLY', scenario: 'OKR_ALIGNMENT', sharedPicture: null,
  theOpening: 'One of the two people has answered so far. Juma is waiting on Wanjiru for the price list.',
  ...over,
});

describe('the board story and the active line agree', () => {
  it('after the second person answers, whoever runs it reads "Both people have answered." while the report is still the first one written', () => {
    const got = howACheckInIsGoing(base(2, { storyRound: 1 }), new Date('2026-10-03'));
    expect(got.glance.progress.answeredThisRound).toBe(2);
    expect(got.latestSummary).toBe('Both people have answered. Juma is waiting on Wanjiru for the price list.');
  });
  it('before that it still reads one of the two', () => {
    expect(howACheckInIsGoing(base(1, { storyRound: 1 }), new Date('2026-10-03')).latestSummary).toMatch(/^One of the two people has answered so far\./);
  });
  it('a reader who is not told the count (no story round) reads the words as written', () => {
    expect(howACheckInIsGoing(base(2), new Date('2026-10-03')).latestSummary).toMatch(/^One of the two people has answered so far\./);
  });
  it('a story written for an earlier round keeps its words', () => {
    expect(howACheckInIsGoing(base(2, { storyRound: 0 }), new Date('2026-10-03')).latestSummary).toMatch(/^One of the two people/);
  });
});
