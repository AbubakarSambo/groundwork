/**
 * `thinNotice` compares each party against the BIGGEST contributor: under 15% of the most talkative
 * person and you are flagged. That catches one person writing three pages beside another writing a
 * line, and it is blind to the case that turns out to be far more common — everybody wrote a line.
 * Two people at a hundred and seventy characters each are both at 100% of the maximum, so nothing
 * fires and the model is handed almost nothing with no indication that it is almost nothing.
 *
 * Measured on the hundred-journey corpus: 58 of 59 thin reports followed a thin check-in rather
 * than a rich one. Synthesis was doing its job on the material it had.
 */
import * as fs from 'fs';
import * as path from 'path';
import { everybodySaidLittle, A_PARTY_SAID_LITTLE_UNDER_CHARS } from './a-record-can-be-thin-for-everybody';

const said = (label: string, charCount: number) => ({ label, charCount });

describe('a record can be thin for everybody', () => {
  it('says so when every party said very little', () => {
    const out = everybodySaidLittle([said('The manager', 170), said('The new starter', 190)], '');
    expect(out).toMatch(/the whole record is thin/);
    expect(out).toMatch(/a few sentences in total/);
  });

  it('tells the model what to do about it rather than only that it is true', () => {
    const out = everybodySaidLittle([said('A', 100), said('B', 120)], '');
    expect(out).toMatch(/do not describe a sentence as a position/);
    expect(out).toMatch(/do not infer a stance nobody stated/);
    expect(out).toMatch(/say that rather than composing a difference/);
  });

  it('says nothing when anybody said a real amount', () => {
    expect(everybodySaidLittle([said('A', 120), said('B', A_PARTY_SAID_LITTLE_UNDER_CHARS + 1)], '')).toBe('');
  });

  it('and nothing when the relative notice already covers it', () => {
    /* Two instructions about one fact invite the model to weigh it twice. */
    expect(everybodySaidLittle([said('A', 20), said('B', 40)], 'NOTE: A said much less.')).toBe('');
  });

  it('ignores a party who said nothing at all, who is a different fact', () => {
    /* Somebody who has not checked in is absence, not thinness - the report names a decline or a
       missing party separately, and counting them here would call a full record thin. */
    const out = everybodySaidLittle([said('A', 900), said('B', 0)], '');
    expect(out).toBe('');
  });

  it('says nothing for an empty round', () => {
    expect(everybodySaidLittle([], '')).toBe('');
    expect(everybodySaidLittle([said('A', 0)], '')).toBe('');
  });

  it('names the size, so the model is not guessing at the scale', () => {
    expect(everybodySaidLittle([said('A', 170), said('B', 210)], '')).toMatch(/about 210 characters/);
  });
});

describe('and the corpus carries whichever applies', () => {
  const src = fs
    .readFileSync(path.join(__dirname, 'reports.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('prefers the relative notice and falls back to the absolute one', () => {
    expect(src).toContain('relativeThinNotice || everybodySaidLittle(turnCounts, relativeThinNotice)');
  });

  it('and it is still the same variable the corpus is built from', () => {
    expect(src).toContain('thinNotice +');
  });
});
