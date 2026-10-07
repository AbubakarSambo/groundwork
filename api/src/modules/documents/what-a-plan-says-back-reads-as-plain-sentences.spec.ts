import { aSentence, byWhen, theContextWeHave, inTheMiddle } from './what-a-document-holds';
import { dateSentence } from './a-document-read-item-by-item';

/** B-014: faults in the words said back after reading a plan, as a lead reads them. */
describe('what is said back after a plan is read', () => {
  it('never makes the first-person "I" small, and does not wrap a sentence that is already one', () => {
    expect(aSentence('I will keep this on record as the source for the sales team\'s structure and targets.')).toBe('I will keep this on record as the source for the sales team\'s structure and targets.');
    expect(aSentence('A Q4 sales target sheet')).toBe('It looks like a Q4 sales target sheet.');
    expect(aSentence('OKR sheet for the coast team')).toBe('It looks like OKR sheet for the coast team.');
  });
  it('says how often a number is meant, not "by each week"', () => {
    expect(byWhen('each week')).toBe(' each week');
    expect(byWhen('every Friday')).toBe(' every Friday');
    expect(byWhen('by 9 October')).toBe(' by 9 October');
    expect(byWhen(null)).toBe('');
  });
  it('writes a name from the document in the middle of a sentence with a small first letter only where it is "The"', () => {
    expect(inTheMiddle('The new stock system goes live in the four depots')).toBe('the new stock system goes live in the four depots');
    expect(inTheMiddle('Kilifi opening')).toBe('Kilifi opening');
    expect(dateSentence({ what: 'The new stock system goes live in the four depots', when: 'by the end of the quarter' })).toBe('The date it sets for the new stock system goes live in the four depots is by the end of the quarter.');
  });
  it('reads a whole say-back with all three fixed', () => {
    const held: any = {
      fileName: 'plan.txt', whatItIs: 'I will keep this on record as the source for the sales team\'s targets.',
      forOnePerson: [{ who: 'Amani Wekesa', what: 'new shops', target: 15, by: 'each week' }], forEverybody: [], unmatched: [],
      dates: [{ what: 'The new stock system goes live', when: 'by the end of the quarter' }],
    };
    expect(theContextWeHave(held)).toBe([
      "Here is the context we have from plan.txt. I will keep this on record as the source for the sales team's targets.",
      '',
      "Amani Wekesa's target for new shops is 15 each week.",
      '',
      'The date it sets for the new stock system goes live is by the end of the quarter.',
    ].join('\n'));
  });
});
