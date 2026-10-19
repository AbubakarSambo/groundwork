import { aLineSaysItIsDone, theWaitsSaidDone, type AnOpenWait, type ALineOnRecord } from './a-wait-said-done-is-cleared';

/**
 * A WAIT IS CLEARED ONLY WHEN THE WHOLE THING CAME, AND AN OUTSIDE BODY'S ANSWER CLEARS IT WHOEVER IN THE CHECK-IN SAYS IT (messages
 * test, third run, items 9 and 14). Muchemi & Co (test), the lines word for word as they were said.
 *
 * Item 9. Aisha waited on the client for the witness statements. On Tuesday 13 October she said "Since the last check-in, the client
 * has sent us two of the three witness statements for the Jamii Clinics employment claim. We're just waiting on the last one now."
 * Wanjiru's weekly letter on Friday said "Aisha Kamau is no longer waiting on the client for the witness statements."
 *
 * Item 14. Brian waited on the court for a hearing date. On Wednesday 14 October David said, four minutes after him, "In Kasarani Foods
 * v. Tumaini Traders, the hearing date is set for November 12th." The litigation board still said on Thursday and Friday "Brian Otieno
 * is waiting on the court for a hearing date."
 */
const at = (s: string) => new Date(s);
const NAMES: Record<string, string[]> = { 'p-aisha': ['Aisha', 'Kamau'], 'p-brian': ['Brian', 'Otieno'], 'p-david': ['David', 'Mwangi'], 'p-njeri': ['Njeri', 'Wambui'] };
const namesOf = (pid: string) => NAMES[pid] ?? [];
const line = (id: string, participantId: string, checkInId: string, text: string, createdAt: string): ALineOnRecord => ({ id, participantId, checkInId, type: 'PROGRESS', text, createdAt: at(createdAt) });

const STATEMENTS: AnOpenWait = { id: 'd-statements', fromParticipantId: 'p-aisha', onParticipantId: null, onLabel: 'the client', what: 'the witness statements', createdAt: at('2026-10-13T06:30:57Z'), sourceCheckInId: 'c1-aisha' };
const HEARING: AnOpenWait = { id: 'd-hearing', fromParticipantId: 'p-brian', onParticipantId: null, onLabel: 'the court', what: 'a hearing date', createdAt: at('2026-10-14T11:03:04Z'), sourceCheckInId: 'c3-brian' };

describe("Aisha's wait on the client for the witness statements", () => {
  it('"two of the three" does not clear it, alone or with "We\'re just waiting on the last one now."', () => {
    expect(aLineSaysItIsDone(line('a1', 'p-aisha', 'c2-aisha', 'Since the last check-in, the client has sent us two of the three witness statements for the Jamii Clinics employment claim.', '2026-10-13T11:03:53Z'), STATEMENTS, namesOf)).toBe(false);
    expect(aLineSaysItIsDone(line('a2', 'p-aisha', 'c2-aisha', "Since the last check-in, the client has sent us two of the three witness statements for the Jamii Clinics employment claim. We're just waiting on the last one now.", '2026-10-13T11:03:53Z'), STATEMENTS, namesOf)).toBe(false);
  });
  it('the last one arriving does', () => {
    expect(aLineSaysItIsDone(line('a3', 'p-aisha', 'c4-aisha', 'The client sent the witness statements today, all three.', '2026-10-15T11:03:53Z'), STATEMENTS, namesOf)).toBe(true);
  });
});

describe("Brian's wait on the court for a hearing date", () => {
  const DAVID = line('d1', 'p-david', 'c2-david', 'In Kasarani Foods v. Tumaini Traders, the hearing date is set for November 12th.', '2026-10-14T11:05:37Z');
  it("David's line clears it, on the day he said it", () => {
    expect(theWaitsSaidDone([HEARING], [DAVID], namesOf, () => HEARING.createdAt as Date)).toEqual([{ id: 'd-hearing', clearedAt: at('2026-10-14T11:05:37Z'), lineId: 'd1' }]);
  });
  it('but not "We are still waiting for the hearing date", nor a line about another date, nor a wait on a colleague', () => {
    expect(aLineSaysItIsDone(line('d2', 'p-david', 'c2-david', 'We are still waiting for the hearing date to be set.', '2026-10-14T11:05:37Z'), HEARING, namesOf)).toBe(false);
    expect(aLineSaysItIsDone(line('d3', 'p-david', 'c2-david', 'The mention date is set for November 3rd.', '2026-10-14T11:05:37Z'), HEARING, namesOf)).toBe(false);
    const onNjeri: AnOpenWait = { ...HEARING, id: 'd-njeri', onParticipantId: 'p-njeri', onLabel: null, what: 'the hearing date' };
    expect(aLineSaysItIsDone(DAVID, onNjeri, namesOf)).toBe(false);
  });
});

/*
 * A FILING ENDS THE WAIT FOR WORK ON WHAT WAS FILED (engine test, Muchemi & Co). Wanjiru waited on Brian for "revisions to the Kasarani
 * Foods reply". On Wednesday 14 October Brian said "The reply in Kasarani Foods v. Tumaini Traders was successfully filed today." Her
 * summary on Tuesday 20 October said the revisions were "due on Thursday 15 October and ... five days late".
 */
describe("Wanjiru's wait on Brian for revisions to the Kasarani Foods reply", () => {
  const NAMES2: Record<string, string[]> = { 'p-wanjiru': ['Wanjiru', 'Muchemi'], 'p-brian': ['Brian', 'Otieno'] };
  const REVISIONS: AnOpenWait = { id: 'd-revisions', fromParticipantId: 'p-wanjiru', onParticipantId: 'p-brian', onLabel: null, what: 'revisions to the Kasarani Foods reply', createdAt: at('2026-10-13T08:31:03Z'), sourceCheckInId: 'c2-wanjiru' };
  const names = (pid: string) => NAMES2[pid] ?? [];
  it("Brian's filing clears it, though he did not name Wanjiru", () => {
    expect(aLineSaysItIsDone(line('b1', 'p-brian', 'c3-brian', 'Good morning all. The reply in Kasarani Foods v. Tumaini Traders was successfully filed today.', '2026-10-14T11:00:28Z'), REVISIONS, names)).toBe(true);
  });
  it('but "The reply has not been filed yet" does not, and nor does a filing of something else', () => {
    expect(aLineSaysItIsDone(line('b2', 'p-brian', 'c3-brian', 'The Kasarani Foods reply has not been filed yet.', '2026-10-14T11:00:28Z'), REVISIONS, names)).toBe(false);
    expect(aLineSaysItIsDone(line('b3', 'p-brian', 'c3-brian', 'The Jamii Clinics witness statements were filed today.', '2026-10-14T11:00:28Z'), REVISIONS, names)).toBe(false);
  });
});
