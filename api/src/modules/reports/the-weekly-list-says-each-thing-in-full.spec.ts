import { whatChangesSaidAsTheirs } from './what-today-reads-from-the-record';
import { theLeadIsNudgedToTell } from '../grounds/a-goal-not-told-stays-with-the-lead';

/**
 * THE DROP ACCESS SHORT RUN (gw_sweep_drop3), ITEM 13. Grace's weekly report of 15 October, "For next week":
 *   "Sort out an answer on the KES 4,500 price." Joseph Kariuki is waiting on you for it. Once it is settled, I'll call him back.
 *   "Tell Mercy Wairimu about the goal you set for Order confirmation process."
 * The wait's "then" on record is Joseph's "I'll call him back"; the goal's worded area is "Order confirmation process".
 * The goal's wording is Release 1's, behind its switch (release-one-sales-board); with it off, the sentence reads as before.
 */
const ON = { releaseOne: true };
describe('the weekly list says each thing in full, as a sentence', () => {
  it('Joseph\'s "I\'ll call him back" is never said in Groundwork\'s voice, and with "him" nobody named it is left out', () => {
    expect(whatChangesSaidAsTheirs("I'll call him back", 'Joseph Kariuki')).toBeNull();
  });

  it('a first-person line that stands on its own is said as theirs, and a line in nobody\'s voice is kept as it is', () => {
    expect(whatChangesSaidAsTheirs("I'll send the quote to Juja Hardware", 'Joseph Kariuki')).toBe('Joseph Kariuki will send the quote to Juja Hardware');
    expect(whatChangesSaidAsTheirs('Peter can make a decision', 'Mercy Wairimu')).toBe('Peter can make a decision');
    expect(whatChangesSaidAsTheirs("I'll call the owner back", null)).toBeNull();
  });

  it('Grace reads "Tell Mercy Wairimu about the goal you set for the order confirmation process."', () => {
    expect(theLeadIsNudgedToTell('Mercy Wairimu', 'Order confirmation process', ON).decide).toBe('Tell Mercy Wairimu about the goal you set for the order confirmation process.');
    expect(theLeadIsNudgedToTell('Joseph Kariuki', 'Deal activation', ON).decide).toBe('Tell Joseph Kariuki about the goal you set for the deal activation.');
    expect(theLeadIsNudgedToTell('Tobi', 'the scheduling and the stock counts', ON).decide).toBe('Tell Tobi about the goal you set for the scheduling and the stock counts.');
    expect(theLeadIsNudgedToTell('Kevin', 'Kilele Hotel', ON).decide).toBe('Tell Kevin about the goal you set for Kilele Hotel.');
  });

  it('with Release 1\'s switch off, the goal reads as it did before', () => {
    expect(theLeadIsNudgedToTell('Mercy Wairimu', 'Order confirmation process').decide).toBe('Tell Mercy Wairimu about the goal you set for Order confirmation process.');
  });
});
