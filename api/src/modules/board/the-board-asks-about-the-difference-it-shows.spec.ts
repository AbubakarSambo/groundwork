import * as fs from 'fs';
import * as path from 'path';
import { draftTheQuestion } from '../reports/the-picture-is-drafted-from-the-reads';

/**
 * TWO SENTENCES FROM THE SAME PAGE.
 *
 * "Where people differ" named it: one person selling tractors, the other subscriptions. A few
 * inches below, "What to settle together" asked a role-map probe about sales work in general. The
 * report learnt to lead with the difference on 22 September 2026; the board's own call to the same
 * function passed only the role map and the blockers, so the board kept asking about neither.
 */
describe('the board asks about the difference it is showing', () => {
  const source = fs
    .readFileSync(path.join(__dirname, 'board.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  it('hands its own divergences to the question, as the report does', () => {
    const at = source.indexOf('draftTheQuestion({');
    expect(at).toBeGreaterThan(-1);
    const call = source.slice(at, source.indexOf('});', at));
    expect(call).toContain('differences:');
    expect(call).toContain('report.divergences');
    expect(call).toMatch(/topic: String\(d\.topic\)/);
    expect(call).toMatch(/settledBy: d\.settledBy \?\? d\.atStake \?\? null/);
  });

  it('and the difference is what the question is then about', () => {
    const q = draftTheQuestion({
      functions: [{ fn: 'SALES', confidence: 0.9 }],
      blockers: [],
      differences: [{ topic: 'What we are actually selling', settledBy: 'Agree the one thing the next ten calls pitch' }],
    });
    expect(q?.text).toContain('Agree the one thing the next ten calls pitch');
    expect(q?.text?.toLowerCase()).toContain('what we are actually selling');
  });
});
