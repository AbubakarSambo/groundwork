import { ReportsService } from './reports.service';
import { whatThisCannotTellYou, toSettleFirst, aMeetingIsOnRecord, overTimeForThisReader } from './what-the-record-shows-over-time';
import { GroundScenario, PartyType } from '@prisma/client';

/**
 * ITEM 21, THE ENGINEERING BOARD: "WHO ARRANGED THE MEETINGS" ONLY WHERE A MEETING IS ON RECORD.
 *
 * "The outage, and what we each thought was happening" (local test database, 5dcde4bf): Elena, who runs
 * it, read "Nobody on record has said who arranged the meetings that happened, so this cannot tell you
 * who secured them." and "Ask who secured each one before crediting anybody with them." Nobody had
 * spoken of a meeting: it was an outage. Served to the lead only, under "what the record shows".
 */
const OUTAGE = [
  { text: 'I first knew about the outage at 08:40. All I knew was that a customer could not access the service.' },
  { text: 'An automated alert appeared in the incidents channel at 08:55.' },
];
const FOUNDER = [{ text: 'Ada arranged our next meeting.' }, { text: 'I had a meeting with the investors on Monday.' }];
const NO_MEETINGS = 'Nobody on record has said who arranged the meetings that happened';

const at = (d: number) => new Date(`2026-09-0${d}T09:00:00Z`);
const person = (id: string, first: string, last: string, lead = false) => ({ id, partyType: lead ? PartyType.INITIATOR : PartyType.PARTICIPANT, roleAsDescribed: null, email: `${id}@ops.test`, createdAt: at(lead ? 1 : 2), user: { firstName: first, lastName: last } });
const PEOPLE = [person('p-elena', 'Elena', 'Rossi', true), person('p-ben', 'Ben', 'Carter')];
const overTimeFor = (lines: { text: string }[]) => {
  const meetingsOnRecord = aMeetingIsOnRecord(lines);
  return {
    sessions: 1, commitments: [], dependencies: [], patterns: [], gaps: [], stillOpen: [],
    cannotTellYou: whatThisCannotTellYou({ documentsAttached: 0, peopleWhoAnswered: 2, peopleInvited: 2, anybodyAskedWhoArrangedThings: false, meetingsOnRecord }),
    toSettleFirst: toSettleFirst({ commitments: [], dependencies: [], patterns: [], documentsAttached: 0, anybodySaidWhoArrangedThings: false, meetingsOnRecord }),
  };
};
const readAs = (overTime: any, participantId: string, isLead: boolean) =>
  (Object.create(ReportsService.prototype) as ReportsService).theReportAsItWasShared({ scenario: GroundScenario.CRISIS_ALIGNMENT, peersVisibleToEachOther: true, participants: PEOPLE, report: { overTime } } as any, participantId, isLead) as any;

describe('who arranged the meetings', () => {
  it('Elena, on the outage, is not asked about meetings nobody spoke of', () => {
    const served = readAs(overTimeFor(OUTAGE), 'p-elena', true).overTime;
    expect([...served.cannotTellYou, ...served.toSettleFirst].join(' ')).not.toContain(NO_MEETINGS);
    expect(served.cannotTellYou).toContain('Nothing here is backed by a document. Every line is what somebody said, and none of it has been checked against anything outside this check-in.');
  });
  it('where somebody spoke of a meeting, it is still asked', () => {
    expect(overTimeFor(FOUNDER).cannotTellYou.join(' ')).toContain(NO_MEETINGS);
  });
  it('Ben, who checks in, is not given the lead\'s questions, as before, and on the outage reads no meetings either', () => {
    const founder = readAs(overTimeForThisReader(overTimeFor(FOUNDER) as any, { isLead: false, participantId: 'p-ben' }), 'p-ben', false).overTime;
    expect(founder.toSettleFirst).toEqual([]);
    const outage = readAs(overTimeForThisReader(overTimeFor(OUTAGE) as any, { isLead: false, participantId: 'p-ben' }), 'p-ben', false).overTime;
    expect(outage.cannotTellYou.join(' ')).not.toContain(NO_MEETINGS);
  });
});
