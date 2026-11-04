import { theWhatIsNewWords } from './heres-what-is-new';

/**
 * "NOBODY HAS CHECKED IN ON "SALES TEAM, Q4" YET" AFTER ALL FIVE HAD (messages test, 19 October, finding 17).
 *
 * Drop Access (test). Grace's "Here is what is new" emails were held for quiet hours and then not sent, because her summary took the day's
 * place, but their subjects were untrue: on Monday 12 October at 21:30, after all five had checked in, "Nobody has checked in on "Sales team,
 * Q4" yet, and here is what is new"; on Wednesday at 05:00, "Two of four people have checked in on "Sales team, Q4"", where there are five.
 * Each count is about one check-in, the second, as the body already said ("for the second check-in"); the subject now says so too.
 */
/* Changed 3 November (F5 part 3): Ask and What's new say the one count's own sentence (grounds/this-sessions-count.ts), as Today, the board and the list do; their own count wording is gone. The session is no longer named in the count (df0ff233a: the report's header says which session); the count is the clock's session's, so it stays true. */
describe('the subject says the count the body says', () => {
  it('Monday 21:30: nobody has checked in for the second check-in yet, which is true', () => {
    const w = theWhatIsNewWords('Grace', [{ label: 'Sales team, Q4', ofHowMany: 4, answered: 0, notYet: ['Kevin', 'Mercy', 'Joseph'], moreToCome: true, round: 2, says: 'Nobody has checked in yet; Kevin, Mercy and Joseph haven’t started yet.' }]);
    expect(w!.subject).toBe('Nobody has checked in yet on "Sales team, Q4", and here is what is new');
    expect(w!.lines[1]).toBe('In "Sales team, Q4", nobody has checked in yet; Kevin, Mercy and Joseph haven’t started yet.');
  });

  it('Wednesday 05:00: two of the four people asked for the second check-in', () => {
    const w = theWhatIsNewWords('Grace', [{ label: 'Sales team, Q4', ofHowMany: 4, answered: 2, notYet: ['Mercy', 'Joseph'], moreToCome: true, round: 2, says: '2 of 4 have checked in; Mercy and Joseph haven’t started yet.' }]);
    expect(w!.subject).toBe('2 of 4 have checked in on "Sales team, Q4", and here is what is new');
  });
});
