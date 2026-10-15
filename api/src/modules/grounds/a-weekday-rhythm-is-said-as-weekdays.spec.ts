import { everyDayThatTheyWork } from './which-days-this-team-works';
import { openingLine } from './the-context-chat';

/* Setup page review, 13 October: a check-in saved for weekdays only was said back as "every day". */
describe('a daily rhythm on some days is said as those days', () => {
  it('in the engine’s own words, for every set of days', () => {
    expect(everyDayThatTheyWork([])).toBe('every day');
    expect(everyDayThatTheyWork([1, 2, 3, 4, 5])).toBe('every weekday, Monday to Friday');
    expect(everyDayThatTheyWork([1, 2, 3, 4, 5, 6])).toBe('every day from Monday to Saturday');
    expect(everyDayThatTheyWork([1, 3, 5])).toBe('every Monday, Wednesday and Friday');
    expect(everyDayThatTheyWork([0, 1, 2, 3, 4, 5, 6])).toBe('every day');
  });

  it('and the context chat’s opening line says it', () => {
    expect(openingLine(null, 'DAILY', true, [1, 2, 3, 4, 5])).toBe('This check-in runs until you end it and people check in every weekday, Monday to Friday.');
    expect(openingLine(null, 'DAILY', false, [1, 2, 3, 4, 5, 6])).toBe('In this check-in, people check in every day from Monday to Saturday.');
    expect(openingLine(null, 'DAILY', false, null)).toBe('In this check-in, people check in every day.');
  });
});
