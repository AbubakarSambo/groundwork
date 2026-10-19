import { theRestOfTheWeekIn } from './the-leads-weekly-letter';

/**
 * "TELL THE TEAM A SALE COUNTS ONLY WITH A PAYMENT OR A SIGNED ORDER KEVIN OMONDI COUNTED KILELE HOTEL AS SOLD ON 12 OCTOBER" (messages
 * test, 19 October, finding 5, the letter's part). Grace's weekly letter of Friday 16 October ran the thing to do into its reason with
 * no full stop, and "Answer Joseph Kariuki on a decision on the price for Juja Hardware" ended with none. Each thing to do is a sentence
 * of its own now, in the letter and on Today, which draws the same lines.
 */
const week = {
  groundId: '3c5ddb85-2722-4db0-b73b-c407dac19071', label: 'Sales team, Q4', ofHowMany: 5, checkedIn: 5, notYet: [], saidWhatNext: 5, done: 1, waiting: 5,
  toDo: [
    { do: 'Answer Joseph Kariuki on a decision on the price for Juja Hardware', why: null },
    { do: 'Tell the team a sale counts only with a payment or a signed order', why: 'Kevin Omondi counted Kilele Hotel as sold on 12 October, and its payment record came on 13 October.' },
    { do: 'Decide what to do about samples.', why: 'Mercy Wairimu cannot move until it is settled, and it is waiting on Joseph Kariuki.' },
  ],
} as any;

describe('a thing to do ends before its reason starts', () => {
  it('reads as Grace should have read it on Friday 16 October', () => {
    expect(theRestOfTheWeekIn(week, 3)).toEqual([
      'Here is what I would do this week.',
      'Answer Joseph Kariuki on a decision on the price for Juja Hardware.',
      'Tell the team a sale counts only with a payment or a signed order. Kevin Omondi counted Kilele Hotel as sold on 12 October, and its payment record came on 13 October.',
      'Decide what to do about samples. Mercy Wairimu cannot move until it is settled, and it is waiting on Joseph Kariuki.',
    ]);
  });
});
