import { route } from './the-router-is-deterministic';
import { parseContextLine } from './a-line-or-a-note-typed-in-chat';

/**
 * REVIEWER, 14 OCTOBER: "Kilele Hotel wants installation next week. Please add that to my check-in." got "I cannot answer that one
 * yet. Here is what I can do with "Kilele Hotel wants installation next week. Please add tha..."". A request to add a line is a
 * statement to add: it goes to the line lane, and the statement is the line, said back before anything is saved.
 */
describe('a line asked for in plain words', () => {
  it.each([
    ['Kilele Hotel wants installation next week. Please add that to my check-in.', 'Kilele Hotel wants installation next week'],
    ['The van is fixed, can you add this to the check-in please', 'The van is fixed'],
    ['Add a line to my check-in: the Thika order moved to Monday.', 'the Thika order moved to Monday'],
  ])('"%s" is the line "%s"', (said, line) => {
    expect(route(said).lane).toBe('context_line');
    expect(parseContextLine(said)).toEqual({ kind: 'NOTE', text: line });
  });

  it('the old typed shapes and the other lanes are as they were', () => {
    expect(parseContextLine('decision: we will drop the pilot')).toEqual({ kind: 'DECISION', text: 'we will drop the pilot' });
    expect(route('add this to the context').lane).toBe('add_context');
    expect(route('Please add that to my check-in.').lane).not.toBe('context_line');
  });
});
