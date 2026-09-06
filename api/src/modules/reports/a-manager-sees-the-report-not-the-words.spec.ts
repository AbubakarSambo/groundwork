/**
 * A MANAGER MAY SEE THEIR DEPARTMENT'S REPORT. ONLY THE EXACT WORDS ARE WALLED OFF.
 *
 * Correcting a real over-caution: a management tool whose output a manager
 * cannot see is not a management tool. The wall is around verbatim sentences
 * attributed to a person, not around a manager knowing how their people are
 * doing.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  whatAManagerMayRead,
  sayWhatIsWithheld,
  type AGroundWithAReport,
} from './whose-reports-a-manager-may-read';

const inIt = (personExternalId: string, managerExternalId: string | null, isLead = false) => ({
  personExternalId,
  managerExternalId,
  isLead,
});

const ground = (over: Partial<AGroundWithAReport> = {}): AGroundWithAReport => ({
  groundId: 'g1',
  label: 'Delivery push',
  releasedAt: new Date('2026-09-01'),
  participants: [inIt('sam', 'me'), inIt('kemi', 'me'), inIt('lead', 'someone', true)],
  ...over,
});

describe('what a manager may read', () => {
  it('the report of a check-in about their own people', () => {
    const got = whatAManagerMayRead([ground()], 'me');
    expect(got.readable).toHaveLength(1);
    expect(got.readable[0].about).toEqual(['sam', 'kemi']);
  });

  it('and the lead reporting elsewhere does not change that', () => {
    /* The lead is running it rather than being read in it. */
    const got = whatAManagerMayRead([ground({ participants: [inIt('sam', 'me'), inIt('boss', 'nobody', true)] })], 'me');
    expect(got.readable).toHaveLength(1);
  });
});

describe('the trap', () => {
  it('a report with somebody else\'s person in it is not handed over', () => {
    /**
     * A report is ONE DOCUMENT about everybody in the check-in. Handing it over
     * because one participant reports here would hand over an account of
     * somebody who reports somewhere else, to a manager who is not theirs. It is
     * invisible until somebody reads a report about a peer's direct report.
     */
    const mixed = ground({ participants: [inIt('sam', 'me'), inIt('theirs', 'another-manager')] });
    const got = whatAManagerMayRead([mixed], 'me');
    expect(got.readable).toHaveLength(0);
    expect(got.withheld[0].because).toBe('somebody in it reports elsewhere');
  });

  it('and the reason is said, not hidden', () => {
    /* A manager shown a short list concludes their people are quiet. A manager
       shown a short list and three reasons knows where to look. */
    const said = sayWhatIsWithheld([
      { groundId: 'g', label: 'Delivery push', because: 'somebody in it reports elsewhere' },
    ]);
    expect(said[0]).toContain('does not report to you');
    expect(said[0]).toContain('stays with the people in it');
  });
});

describe('what it never includes', () => {
  const source = fs
    .readFileSync(path.join(__dirname, 'whose-reports-a-manager-may-read.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  it('a solo report, which is somebody\'s own account of their own record', () => {
    /* It is theirs, and they decide whether to share it. A manager never
       receives one by being a manager. */
    expect(source).not.toMatch(/solo/i);
  });

  it('or a transcript, at any level, to anybody', () => {
    expect(source).not.toMatch(/transcript|conversationTurn|turns\b/i);
  });

  it('and it returns identifiers rather than report content, so it cannot leak by accident', () => {
    /* This file decides ACCESS. It never carries the words, so there is nothing
       in it to redact and nothing to get wrong later. */
    expect(source).not.toMatch(/sharedPicture|agreements|divergences|centralQuestion/);
  });
});

describe('an unreleased report', () => {
  it('is not shown early to a manager', () => {
    /* Everybody in it gets it at the same moment. A manager receiving it first
       would be the one thing that makes an independent record not independent. */
    const got = whatAManagerMayRead([ground({ releasedAt: null })], 'me');
    expect(got.readable).toHaveLength(0);
    expect(got.withheld[0].because).toBe('not released yet');
    expect(sayWhatIsWithheld(got.withheld)[0]).toContain('at the same moment, including you');
  });
});
