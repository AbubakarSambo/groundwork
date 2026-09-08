import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * `namesVisibleTo` TAKES A PARTICIPANT ID, AND ONE CALL PASSED A USER ID.
 *
 * It finds the viewer by their row on this check-in (`p.id`) to decide whether they are the lead
 * and therefore entitled to everybody's name. Handed a USER id it finds nobody, concludes the
 * reader is not the lead, and resolves only the lead's own name plus the reader's - everybody else
 * falls through to the email fallback.
 *
 * Seen on a real board: the success band read "Amara", "Amara", "Amara", then
 * "nadia.hr@northwindlog.test" - one list, two kinds of identity, on a check-in whose lead is
 * plainly entitled to her name and is shown it on the next tab along. Nothing errored; a name was
 * simply never found. The types cannot catch it: both arguments are strings.
 */
const SRC = readFileSync(join(__dirname, 'reports.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('every call passes the viewer as a participant, not as a user', () => {
  const calls = SRC.match(/namesVisibleTo\([^)]*\)/g) ?? [];

  it('found the calls, so an empty match cannot pass', () => {
    expect(calls.length).toBeGreaterThanOrEqual(3);
  });

  it('and none of them hands it a user id', () => {
    const wrong = calls.filter((c) => /requestingUserId|userId\b/.test(c));
    expect(wrong).toEqual([]);
  });
});
