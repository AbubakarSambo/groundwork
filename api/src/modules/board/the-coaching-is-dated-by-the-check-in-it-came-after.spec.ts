import { R2, theRunAsADatabase, aPersonRecordTable, thePersonOf, THE_END_OF_THE_RUN } from './the-persons-record-bed';
import { rebuildThePersonsRecords, readThePersonsRecord } from './the-persons-record-store';

/**
 * THE COACHING IS DATED BY THE CHECK-IN IT CAME AFTER (browser test, 21 October 2026). Drop Access's records were built once, on Wednesday
 * 21 October, for people whose last check-in was on Monday 19 October, and Grace's board read "After Joseph’s check-in on Wednesday 21
 * October, Groundwork told Joseph …". The coaching now says the day of the check-in it was given after, whenever the record is built.
 */
describe('the coaching is dated by the check-in it came after', () => {
  it('Joseph’s coaching, built two days after his last check-in, names the day of that check-in, not the day it was built', async () => {
    const table = aPersonRecordTable();
    const twoDaysLater = new Date(THE_END_OF_THE_RUN.getTime() + 2 * 86_400_000);
    await rebuildThePersonsRecords(theRunAsADatabase('drop', { personRecord: table }), R2.drop.ground.id, twoDaysLater);
    const stored = await readThePersonsRecord({ personRecord: table }, thePersonOf('drop', 'Joseph').participantId);
    const given = stored!.coaching[stored!.coaching.length - 1];
    const lastDone = [...stored!.record.checkIns].reverse().find((c) => c.done && c.sessionNumber === given.afterSession)!;
    expect(given.givenOn).toBe(lastDone.on);
    expect(given.givenOn).not.toMatch(/22 October/);
  });
});
