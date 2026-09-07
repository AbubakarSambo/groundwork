/**
 * "Report not found" was shown to people who had just finished answering. The 404 stays; the
 * sentence has to say which of the three states this is.
 */
import * as fs from 'fs';
import * as path from 'path';
import { whyThereIsNoReportYet } from './why-there-is-no-report-yet';

const done = { completed: true, started: true };
const midway = { completed: false, started: true };
const untouched = { completed: false, started: false };

describe('why there is no report yet', () => {
  it('says nobody has answered when nobody has', () => {
    expect(whyThereIsNoReportYet({ parties: [untouched, untouched] })).toMatch(/nobody has completed/i);
  });

  it('names how many people are outstanding', () => {
    expect(whyThereIsNoReportYet({ parties: [done, midway, untouched] })).toContain('2 people have not finished');
    expect(whyThereIsNoReportYet({ parties: [done, midway] })).toContain('one person has not finished');
  });

  it('says it is being written when everybody is done — the case people actually met', () => {
    const said = whyThereIsNoReportYet({ parties: [done, done] });
    expect(said).toMatch(/being written/i);
    expect(said).not.toMatch(/not found/i);
  });

  it('never tells somebody entitled to be here that the thing does not exist', () => {
    for (const parties of [[untouched], [done, midway], [done, done]]) {
      expect(whyThereIsNoReportYet({ parties })).not.toMatch(/not found/i);
    }
  });

  it('falls back to the bare answer when there are no parties to describe', () => {
    expect(whyThereIsNoReportYet({ parties: [] })).toBe('Report not found');
  });
});

describe('and the report endpoint uses it', () => {
  const src = fs
    .readFileSync(path.join(__dirname, 'reports.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  /* The CALL, not the import — `indexOf` finds the import line and proves nothing. */
  const callSite = src.indexOf('whyThereIsNoReportYet(');

  it('reaches it on the missing-report path, and still refuses a stranger flatly', () => {
    expect(callSite).toBeGreaterThan(-1);
    // A stranger gets the bare sentence: the reason is only for somebody already on the check-in.
    const from = callSite;
    const around = src.slice(Math.max(0, from - 1200), from);
    expect(around).toContain("if (!mine) throw new NotFoundException('Report not found')");
  });

  it('is still a 404, because the shape is what protects a stranger', () => {
    expect(src.slice(callSite - 80, callSite)).toContain('NotFoundException');
  });
});
