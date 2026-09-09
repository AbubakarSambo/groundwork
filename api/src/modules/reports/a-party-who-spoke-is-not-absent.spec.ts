/**
 * Found live, not by reading. Two parties completed a check-in, each said 123
 * characters, and the served report opened with "One person's record is not
 * present" - while the engagement payload in the same response said both had
 * contributed. The roster line was the cause: it described somebody who answered
 * and somebody who never opened their check-in with the same words.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { whatTheRosterSaysAbout } from './a-party-who-spoke-is-not-absent';

const spoke = { label: 'the initiator', leads: true, recordEntries: 0, charsSaid: 123 };
const silent = { label: 'participant B', leads: false, recordEntries: 0, charsSaid: 0 };
const contributed = { label: 'participant A', leads: false, recordEntries: 3, charsSaid: 900 };

describe('a party whose answers produced no distinct claim', () => {
  it('is never described as missing, absent or not provided', () => {
    const line = whatTheRosterSaysAbout(spoke).toLowerCase();
    for (const forbidden of ['record is not present', 'no record entries', 'has not checked in']) {
      expect(line).not.toContain(forbidden);
    }
  });

  it('is said to have taken part, because they did', () => {
    expect(whatTheRosterSaysAbout(spoke)).toMatch(/took part in this round and answered/);
  });

  it('and the reason is named as brevity, not absence', () => {
    expect(whatTheRosterSaysAbout(spoke)).toMatch(/too brief to compare/);
  });

  it('and the wording that caused the wrong sentence is forbidden out loud', () => {
    expect(whatTheRosterSaysAbout(spoke)).toMatch(/NEVER write that their record is missing/);
  });
});

describe('a party who has not checked in', () => {
  it('is still described as not yet heard from - absence is a real state', () => {
    expect(whatTheRosterSaysAbout(silent)).toMatch(/has not checked in yet/);
  });

  it('and is not confused with somebody who answered briefly', () => {
    expect(whatTheRosterSaysAbout(silent)).not.toMatch(/took part/);
  });

  it('so the two cases do not read the same, which was the whole defect', () => {
    expect(whatTheRosterSaysAbout(spoke)).not.toBe(whatTheRosterSaysAbout(silent));
  });
});

describe('a party who contributed', () => {
  it('is counted, singular and plural', () => {
    expect(whatTheRosterSaysAbout(contributed)).toMatch(/contributed 3 record entries \(shown below\)/);
    expect(whatTheRosterSaysAbout({ ...contributed, recordEntries: 1 })).toMatch(/1 record entry/);
  });

  it('and a party who leads says so, because the leadership rules match on it', () => {
    expect(whatTheRosterSaysAbout(spoke)).toContain('[leads this ground');
    expect(whatTheRosterSaysAbout(contributed)).not.toContain('[leads this ground');
  });
});

describe('the corpus actually uses it', () => {
  /**
   * The function can be perfect and reach nobody. This is the wire: the roster the
   * model is handed must be built from it, and the measurement it depends on must
   * be computed before the roster rather than after - which is where it used to sit.
   */
  const source = readFileSync(join(__dirname, 'reports.service.ts'), 'utf8').replace(
    /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,
    '',
  );

  it('builds the roster through it', () => {
    expect(source).toMatch(/rosterLines = parties\.map\(\(p\) => \{[\s\S]{0,400}whatTheRosterSaysAbout\(\{/);
  });

  it('and measures what each party said before the roster needs it', () => {
    expect(source.indexOf('const turnCounts =')).toBeGreaterThan(-1);
    expect(source.indexOf('const turnCounts =')).toBeLessThan(source.indexOf('const rosterLines ='));
  });
});
