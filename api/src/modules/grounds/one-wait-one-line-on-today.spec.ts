import { whatTheBoardAsksOfTheLead } from './what-the-board-asks-of-the-lead';

/* Fatima's Today, 25 January 2027: one wait was two items. The board's action for it is kept, the bare wait is not. */
describe('one wait, one line on Today', () => {
  it('keeps the action for a wait and drops the board line about the same wait', () => {
    const needs = whatTheBoardAsksOfTheLead({
      decisions: [
        { source: 'blocker', ref: 'wait-d1', question: 'Halima Yusuf is waiting for the bank charges detail, and nobody has been named to provide it.', why: 'They cannot move until it comes.' },
        { source: 'blocker', ref: 'wait-d2', question: 'Musa Garba is waiting on the state government for a meeting date.', why: 'They cannot move until it comes.' },
      ],
      leadActions: [{ id: 'nobody-named-d1', says: 'You need to find out who can provide the bank charges detail that Halima Yusuf is waiting for, because nobody has been named yet.' }],
    }, { id: 'g1', organizationId: 'o1' });
    expect(needs.map((n) => n.title)).toEqual([
      'Musa Garba is waiting on the state government for a meeting date.',
      'You need to find out who can provide the bank charges detail that Halima Yusuf is waiting for, because nobody has been named yet.',
    ]);
  });
});
