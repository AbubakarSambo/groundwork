/**
 * "That report could not be found, so go back to the check-in and open it from there." was shown to people who had just finished answering. The 404 stays; the
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
    /* Wording changed on 4 October 2026: whole sentences, a capital letter after each full stop, no dash, the count in words. */
    expect(whyThereIsNoReportYet({ parties: [done, midway, untouched] })).toBe('The report is written once everybody has answered. Two people have not finished yet. You will be emailed when it is ready.');
    expect(whyThereIsNoReportYet({ parties: [done, midway] })).toBe('The report is written once everybody has answered. One person has not finished yet. You will be emailed when it is ready.');
  });

  it('is plain full sentences in every case: each begins with a capital letter, none is joined with a dash or a colon', () => {
    for (const parties of [[untouched, untouched], [done, midway], [done, midway, untouched], [done, done]]) {
      const said = whyThereIsNoReportYet({ parties });
      expect(said).toMatch(/^[A-Z][^.]*\.( [A-Z][^.]*\.)*$/);
      expect(said).not.toMatch(/ - |:/);
    }
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
    expect(whyThereIsNoReportYet({ parties: [] })).toBe('That report could not be found, so go back to the check-in and open it from there.');
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
    /* Changed for the second review's leak B: the stranger is now told "That check-in could not be found, so go back to your check-ins and open it from the list.", the sentence every other route gives. */
    expect(around).toContain("if (!mine) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.')");
  });

  it('is still a 404, because the shape is what protects a stranger', () => {
    expect(src.slice(callSite - 80, callSite)).toContain('NotFoundException');
  });
});
