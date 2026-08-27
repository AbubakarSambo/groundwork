import { quietPeriodFor, quietUntil, isQuiet, QUIET_DAYS, BULK_THRESHOLD } from './detection-holds-its-tongue';

const at = (d: number) => new Date(2026, 0, d, 9, 0, 0);

/**
 * THE WINDOW HAS TO BE RECORDED WHEN THE IMPORT HAPPENS, NOT WORKED OUT LATER.
 *
 * No detector exists yet to be suppressed, which is precisely the argument for stamping it now: an
 * implementation that computed the window when detectors arrive would find the import months in the
 * past with nothing left to measure from, and the first customer - the one whose first impression
 * this exists to protect - would be the one it failed.
 */
describe('detection holds its tongue', () => {
  it("an org's first import starts a window whatever its size", async () => {
    /* Three objectives is still a first sync, and the first thing a new customer sees should not be
       three findings about work nobody has mentioned. */
    expect(quietPeriodFor({ subjectCount: 3, isFirstImport: true }, at(1))?.reason).toBe('INITIAL_IMPORT');
  });

  it('a later import starts one only when it is large enough to look like a wall', () => {
    expect(quietPeriodFor({ subjectCount: BULK_THRESHOLD, isFirstImport: false }, at(1))?.reason).toBe('BULK_IMPORT');
    expect(quietPeriodFor({ subjectCount: BULK_THRESHOLD - 1, isFirstImport: false }, at(1))).toBeNull();
  });

  it('an import of nothing is not an event', () => {
    expect(quietPeriodFor({ subjectCount: 0, isFirstImport: true }, at(1))).toBeNull();
  });

  it('the window is measured from the import', () => {
    const q = quietPeriodFor({ subjectCount: 100, isFirstImport: true }, at(1))!;
    expect(q.endsAt.getTime()).toBe(at(1).getTime() + QUIET_DAYS * 86_400_000);
  });

  it('uses first-import as a fact, not a count of rows already held', () => {
    /* An org whose first import failed halfway HAS subjects and has still not had its quiet
       period. Counting rows would decide it had, and it would never get one. */
    expect(quietPeriodFor({ subjectCount: 5, isFirstImport: true }, at(1))?.reason).toBe('INITIAL_IMPORT');
    expect(quietPeriodFor({ subjectCount: 5, isFirstImport: false }, at(1))).toBeNull();
  });
});

describe('overlapping windows extend the silence rather than ending it early', () => {
  it('the latest end wins', () => {
    /* A customer loading objectives and then projects an hour later must not start getting findings
       about the projects on the older import's clock. */
    const periods = [{ endsAt: at(10) }, { endsAt: at(20) }, { endsAt: at(15) }];
    expect(quietUntil(periods, at(5))).toEqual(at(20));
  });

  it('ignores windows that have already closed', () => {
    expect(quietUntil([{ endsAt: at(1) }, { endsAt: at(2) }], at(5))).toBeNull();
    expect(isQuiet([{ endsAt: at(1) }], at(5))).toBe(false);
  });

  it('and a closed one does not shorten an open one', () => {
    expect(quietUntil([{ endsAt: at(1) }, { endsAt: at(30) }], at(5))).toEqual(at(30));
  });

  it('no windows at all means the product speaks', () => {
    expect(isQuiet([], at(5))).toBe(false);
  });
});
