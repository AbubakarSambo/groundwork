import { findingFor, theOverview, thePictureTheProductWrites } from './the-finding-per-person';

/** Run 6, 21 Sep 2026: the loan cohort's final picture was "All acknowledge their repayment obligations to the finance company." */
describe('the finding, per person, written by the product', () => {
  const grace = {
    participantId: 'g', label: 'the tractor owner', isLead: false,
    said: [
      { text: 'To plough my own maize on time and get a better crop.', type: 'SUCCESS_DEFINITION', session: 1 },
      { text: 'Hiring it out brings N420,000 a month; my maize was late and the crop smaller.', type: 'PROGRESS', session: 3 },
      { text: 'Losing hire income on the days I plough my own land.', type: 'WORRY', session: 3 },
    ],
    targets: [],
  };
  const halima = {
    participantId: 'h', label: 'the poultry farmer', isLead: false,
    said: [
      { text: '500 birds, 400 eggs a day.', type: 'SUCCESS_DEFINITION', session: 1 },
      { text: 'I have 260 birds laying and 240 eggs today.', type: 'PROGRESS', session: 3 },
    ],
    targets: [],
  };
  const dayo = {
    participantId: 'd', label: 'the northern dealers rep', isLead: false,
    said: [{ text: 'N38m, all on credit.', type: 'PROGRESS', session: 3 }],
    targets: [{ name: 'Bring in at least N50m', target: 50_000_000, count: 0, yours: true, setByThem: false }, { name: 'N40m', target: 40_000_000, count: 38_000_000, yours: true, setByThem: true }],
  };

  it('writes each person from their own record and names the gap', () => {
    const g = findingFor(grace, 3)!;
    expect(g.text).toContain('the tractor owner said this was for: To plough my own maize on time and get a better crop.');
    expect(g.text).toContain('Where they say they stand now: Hiring it out brings N420,000 a month');
    /* Was "Named as in the way:" - not a sentence: the start of the phrase lived in the variable
       name, and a live board on 23 September 2026 read "Named as in the way: you didnt even as me
       what i do". */
    expect(g.text).toContain('What they say is in the way: Losing hire income');
    const h = findingFor(halima, 3)!;
    expect(h.hasGap).toBe(true);
    expect(h.text).toContain('The count moved: 500 birds then 260: down 48%.');
    const d = findingFor(dayo, 3)!;
    expect(d.text).toContain('The lead set 50m for them (Bring in at least N50m); their own number is 40m (N40m).');
    expect(d.hasGap).toBe(true);
  });

  it('the overview counts, and never says all', () => {
    const fs = [findingFor(grace, 3)!, findingFor(halima, 3)!, findingFor(dayo, 3)!];
    const o = theOverview(fs, 5);
    expect(o).toMatch(/^The record shows a gap for \d of the 5 people who answered: /);
    expect(o).not.toMatch(/\ball\b/i);
    expect(theOverview([findingFor(grace, 3)!], 1)).toContain('shows no gap');
    expect(thePictureTheProductWrites(fs, 5).split('\n\n')).toHaveLength(4);
  });

  it('nothing for a person who said nothing', () => {
    expect(findingFor({ participantId: 'x', label: 'x', isLead: false, said: [], targets: [] }, 1)).toBeNull();
  });
});

/** Run 10, 21 Sep 2026: "$400,000 in new business" on the board as shared, and "no gap", for a man who had never said the figure. */
describe('a number set for them that they have never said', () => {
  const { findingFor, everMentioned } = require('./the-finding-per-person');
  it('is a gap of its own kind', () => {
    const f = findingFor({
      participantId: 't', label: 'Engagement Director', isLead: false,
      said: [{ text: 'Building relationships and warming up the pipeline.', type: 'SUCCESS_DEFINITION', session: 1 }, { text: 'Proposals for two NGOs, out by Friday.', type: 'PROGRESS', session: 1 }],
      targets: [{ name: 'New business in the first year', target: 400_000, count: 0, yours: true, setByThem: false }],
    }, 1);
    expect(f.hasGap).toBe(true);
    expect(f.headline).toBe('Engagement Director: 400,000 set by the lead, not yet said by them');
    expect(f.text).toMatch(/nothing they have said mentions that figure/);
  });
  it('and not when they have said it, in any shape', () => {
    expect(everMentioned([{ text: 'The $400k was not a figure I was aware of.', type: 'INTENT', session: 2 }], 400_000)).toBe(true);
    expect(everMentioned([{ text: 'We are at N38m.', type: 'PROGRESS', session: 2 }], 180_000_000)).toBe(false);
    const f = findingFor({
      participantId: 't', label: 'Rep', isLead: false,
      said: [{ text: 'My target is N45m for the quarter.', type: 'SUCCESS_DEFINITION', session: 1 }],
      targets: [{ name: 'Hit N45m', target: 45_000_000, count: 0, yours: true, setByThem: false }],
    }, 1);
    expect(f.hasGap).toBe(false);
  });
});
