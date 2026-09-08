import * as fs from 'fs';
import * as path from 'path';

/**
 * THE ENTRY CHAT NEVER SAID A SESSION HAD FINISHED, SO FOUR THINGS NEVER HAPPENED.
 *
 * "We should have a forming report, why do you have this here" - and on any check-in created
 * through the entry chat there was no forming report to have. `commitInner` completes the check-in
 * with a direct `prisma.checkIn.update`, so `CHECK_IN_COMPLETED` was never emitted. It imported
 * both `GroundworkEvents` and `CheckInCompletedEvent` and used neither.
 *
 * What the listener does on that event: synthesise the report (which is built as soon as ANYBODY
 * checks in - that is what a forming report IS), release it once everybody is through, email the
 * lead, and record the usage event billing reads. None of it ran, which is also the answer to
 * "where did the shared report go".
 *
 * The order is load-bearing too: the synthesis reads RecordEntry rows, so the extraction has to be
 * awaited before the event, exactly as the normal completion path awaits it.
 */
const withoutComments = (file: string) =>
  fs
    .readFileSync(path.join(__dirname, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

describe('a session finished in the entry chat', () => {
  const service = withoutComments('entry.service.ts');

  it('is announced, so the report can form', () => {
    expect(service).toMatch(/this\.events\.emit\(GroundworkEvents\.CHECK_IN_COMPLETED/);
  });

  it('and announced with everything the listener reads', () => {
    const at = service.indexOf('GroundworkEvents.CHECK_IN_COMPLETED');
    const payload = service.slice(at, at + 300);
    for (const field of ['checkInId', 'groundId', 'participantId', 'sessionNumber']) {
      expect(payload).toContain(field);
    }
  });

  it('after the record it will be synthesised from has been written', () => {
    /* Fire-and-forget extraction would hand the synthesis an empty record - the synthesis runs
       inside the listener, on this same event. */
    const extraction = service.indexOf('extractRecordEntries(checkIn.id, participant.id)');
    const emit = service.indexOf('GroundworkEvents.CHECK_IN_COMPLETED');
    expect(extraction).toBeGreaterThan(-1);
    expect(extraction).toBeLessThan(emit);
    expect(service.slice(extraction - 120, extraction)).toContain('await this.conversation');
  });

  it('and a round is only called closed once everybody is on the check-in', () => {
    /*
     * `recordRoundCompletion` counts the participants that exist WHEN IT RUNS, and it used to run
     * before the contributors were added - so it wrote a closed round with a count of one on a
     * check-in that was about to have three people on it, permanently, because the row is unique
     * per round. The Report tab's header then said "report ready - you release it" over a body
     * saying "1 of 2 have checked in".
     */
    const invites = service.indexOf('for (const c of dto.contributors)');
    const record = service.indexOf('recordRoundCompletion(');
    expect(invites).toBeGreaterThan(-1);
    expect(record).toBeGreaterThan(invites);
  });

  it('and after the report they just read has been stored', () => {
    const stored = service.indexOf('sessionReport: dto.report');
    const emit = service.indexOf('GroundworkEvents.CHECK_IN_COMPLETED');
    expect(stored).toBeGreaterThan(-1);
    expect(stored).toBeLessThan(emit);
  });
});
