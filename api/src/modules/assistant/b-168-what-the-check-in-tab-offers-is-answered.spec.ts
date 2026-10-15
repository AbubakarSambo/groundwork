import { route } from './the-router-is-deterministic';

/** B-168: the Check-in tab offers "What am I missing?" and "Review my goals", and Ask answered both "I cannot answer that one yet." */
describe('the questions the Check-in tab offers reach a lane', () => {
  it.each([
    ['What am I missing?', 'where_am_i_up_to'],
    ['What is missing from my record that would make it stronger?', 'where_am_i_up_to'],
    ['Review my goals', 'what_am_i_on'],
    ['Review the goals I set at the start of this check-in and tell me where I stand against each one.', 'what_am_i_on'],
  ])('%s', (message, lane) => {
    expect(route(message).lane).toBe(lane);
  });
});
