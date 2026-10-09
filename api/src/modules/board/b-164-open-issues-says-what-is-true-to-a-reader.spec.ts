import { NO_OPEN_ISSUES_ON_RECORD } from './board.service';

/** B-164: "Open issues" read like a note to the developers: "Nothing on record follows an issue from unclear, to decided, to done and checked...". */
describe('the sentence under Open issues', () => {
  it('is plain, full sentences that say what is true and where to look', () => {
    expect(NO_OPEN_ISSUES_ON_RECORD).toBe('Groundwork does not follow an issue from the day it is raised to the day it is decided and done, so there is no list of open issues here. Where people see something differently, and the questions written down to decide on the Context page, are under what needs you.');
    expect(NO_OPEN_ISSUES_ON_RECORD).not.toMatch(/on record follows|unclear, to decided/);
  });
});
