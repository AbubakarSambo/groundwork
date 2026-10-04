import { aFindingThatReadsRight } from './a-finding-reads-right';

/** The check-in list's latest finding, as every reader reads it (requests 127, 129, 135, 136). */
describe('the latest finding in the check-in list', () => {
  const STORED = [
    ['The objective is 6,000 The plan is to have reached 6,000 farmers by now., and nobody in this check-in has a number of their own against it.',
      'The objective, in the lead\'s own words, is "The plan is to have reached 6,000 farmers by now", and nobody in this check-in has a number of their own against it.'],
    ['The objective is 100 All 100 tasks for the release are deployed to production., and nobody in this check-in has a number of their own against it.',
      'The objective, in the lead\'s own words, is "All 100 tasks for the release are deployed to production", and nobody in this check-in has a number of their own against it.'],
    ['The objective is 40 All 40 traders are fully up to date', 'The objective, in the lead\'s own words, is "All 40 traders are fully up to date".'],
  ];
  it.each(STORED)('reads right: %s', (stored, right) => {
    expect(aFindingThatReadsRight(stored)).toBe(right);
  });
  it('does not name the reader twice (request 135 item 5)', () => {
    expect(aFindingThatReadsRight('You and You are waiting for the signed witness statement, and nothing on record says anybody has chased it.'))
      .toBe('You are waiting for the signed witness statement, and nothing on record says anybody has chased it.');
  });
  it('leaves a finding that is already right, and an empty one, alone', () => {
    expect(aFindingThatReadsRight('The objective is 40 approved facilities, and nobody in this check-in has a number of their own against it.')).toBe('The objective is 40 approved facilities, and nobody in this check-in has a number of their own against it.');
    expect(aFindingThatReadsRight(null)).toBeNull();
  });
});
