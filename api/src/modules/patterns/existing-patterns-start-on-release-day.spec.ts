import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { thePersonHasHadTheirTurn, patternRowsThisReaderMayRead, type APatternRow } from './who-reads-a-pattern';

/**
 * DECISION 62: A PATTERN THAT ALREADY EXISTED AT RELEASE STARTS THE PERSON-FIRST PROCESS ON RELEASE
 * DAY, NEVER ON THE DAY IT WAS LAST SEEN.
 *
 * The migration `20260928090000_the_person_sees_their_pattern_first` first shipped setting
 * `ready_at = last_seen_at` for every pattern already seen in three periods. Because
 * `thePersonHasHadTheirTurn`'s seven-day fallback (who-reads-a-pattern.ts) measures from `ready_at`,
 * a pattern last seen more than seven days before release would have been readable by whoever runs
 * the check-in the moment the migration ran - before the person it is about had ever been shown it.
 * That is exactly what decision 62 forbids: "The person is shown theirs first, and the lead sees it
 * only after the usual 3 or 7 days."
 *
 * This reads the migration's own SQL - not a re-implementation of it - and proves two things: the
 * SQL no longer backdates `ready_at` to `last_seen_at`, and, carrying the rule it does write into
 * `who-reads-a-pattern.ts`'s own reader, that nothing becomes readable by whoever runs the check-in
 * on release day, while the person's own clock (the seven-day fallback) starts counting from then.
 */
const MIGRATION_SQL = readFileSync(
  join(__dirname, '..', '..', '..', 'prisma', 'migrations', '20260928090000_the_person_sees_their_pattern_first', 'migration.sql'),
  'utf8',
)
  /* SQL carries both kinds of comment; a guard a comment satisfies is not a guard. */
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/--.*$/gm, '');

describe('an existing pattern starts the person-first process on release day', () => {
  it('sets ready_at to the moment the migration runs, never to when the pattern was last seen', () => {
    expect(MIGRATION_SQL).toMatch(/UPDATE\s+"pattern_detections"\s+SET\s+"ready_at"\s*=\s*now\(\)/i);
    expect(MIGRATION_SQL).not.toMatch(/SET\s+"ready_at"\s*=\s*"last_seen_at"/i);
  });

  it('leaves shown_to_person_at unset, so nobody is recorded as already having been shown it', () => {
    /* The only UPDATE in this migration is the one above, on ready_at; shown_to_person_at, like
       person_answer and person_answered_at, is only ever set later, by the product itself. */
    const updates = MIGRATION_SQL.match(/UPDATE\s+"pattern_detections"[\s\S]*?;/gi) ?? [];
    expect(updates).toHaveLength(1);
    expect(updates[0]).not.toMatch(/shown_to_person_at/i);
  });

  /*
   * A DATABASE ROW, EXACTLY AS THE MIGRATION LEAVES ONE: a pattern that reached three periods
   * long before release, "last seen" months ago, but with ready_at freshly set to the moment the
   * migration ran (modelled here as "releaseDay"), and shown_to_person_at still null.
   */
  const releaseDay = new Date('2026-09-30T09:00:00.000Z');
  const longBeforeRelease = new Date('2026-06-01T00:00:00.000Z');
  const existingRow: APatternRow = {
    id: 'pattern-1',
    participantId: 'participant-1',
    code: 'B3',
    observationText: 'Something that kept coming up.',
    seenInSessions: [1, 2, 3],
    periodsObserved: 3,
    readyAt: releaseDay,
    shownToPersonAt: null,
    personAnswer: null,
    personAnsweredAt: null,
  };

  it('is not readable by whoever runs the check-in on release day itself', () => {
    expect(thePersonHasHadTheirTurn(existingRow, releaseDay)).toBe(false);
    const forTheLead = patternRowsThisReaderMayRead([existingRow], { participantId: null, runsIt: true }, { on: true, now: releaseDay });
    expect(forTheLead).toHaveLength(0);
  });

  it('is readable by the person it is about, from release day, before whoever runs the check-in', () => {
    const forThePerson = patternRowsThisReaderMayRead(
      [existingRow],
      { participantId: 'participant-1', runsIt: false },
      { on: true, now: releaseDay },
    );
    expect(forThePerson).toHaveLength(1);
  });

  it('still is not readable by whoever runs the check-in a few days after release, before either clock has run out', () => {
    const threeDaysIn = new Date(releaseDay.getTime() + 2 * 24 * 60 * 60 * 1000);
    expect(thePersonHasHadTheirTurn(existingRow, threeDaysIn)).toBe(false);
  });

  it('reaches whoever runs the check-in seven days after release, if the person never opens a page that shows it - never seven days after it was last seen', () => {
    const sixDaysIn = new Date(releaseDay.getTime() + 6 * 24 * 60 * 60 * 1000);
    expect(thePersonHasHadTheirTurn(existingRow, sixDaysIn)).toBe(false);
    const sevenDaysIn = new Date(releaseDay.getTime() + 7 * 24 * 60 * 60 * 1000);
    expect(thePersonHasHadTheirTurn(existingRow, sevenDaysIn)).toBe(true);
    /* And it is nothing to do with how long ago it was last seen: longBeforeRelease is unused by
       the rule at all, which is the point - the clock is ready_at, not last_seen_at. */
    expect(longBeforeRelease.getTime()).toBeLessThan(releaseDay.getTime());
  });

  it('reaches whoever runs the check-in three days after the person is actually shown it, sooner than the seven-day fallback', () => {
    const shownOnReleaseDay = { ...existingRow, shownToPersonAt: releaseDay };
    const twoDaysAfterShown = new Date(releaseDay.getTime() + 2 * 24 * 60 * 60 * 1000);
    expect(thePersonHasHadTheirTurn(shownOnReleaseDay, twoDaysAfterShown)).toBe(false);
    const threeDaysAfterShown = new Date(releaseDay.getTime() + 3 * 24 * 60 * 60 * 1000);
    expect(thePersonHasHadTheirTurn(shownOnReleaseDay, threeDaysAfterShown)).toBe(true);
  });
});
