import { theSessionReportAtAGlance, theWeeklyReportAtAGlance, firstSentence, withItsFacts } from './a-report-at-a-glance';

/**
 * A REPORT AT A GLANCE (docs/light-rebuild/sales-first.md, section 2, rules 3 and 4). The one-line
 * fact on each folded part of the light team report and weekly report is read from the report as
 * this reader is served it, and says only what that report holds.
 */
describe('a session report at a glance', () => {
  const served = {
    confidence: { saying: 'There is enough here to talk about, and not enough to settle anything.' },
    whatEachPersonSaid: [{ who: 'Miriam Wanjiru' }, { who: 'Aisha Mohamed' }, { who: 'Brian Ochieng' }],
    finding: { key: 'numbers', text: 'The numbers add up to 30.' },
    picture: [
      { key: 'numbers', text: 'The numbers add up to 30.' },
      { key: 'basis', text: '5 of 6 people have answered.' },
      { key: 'block', text: 'Samuel Kiprop is waiting for 3 things. Brian is waiting on you.' },
    ],
    againstSuccess: { definitions: [], saying: 'What success looks like is stated, but nobody has said anything about it in a check-in yet. It fills in as people check in.' },
    cascade: { parentNamed: null },
  };

  it('says each line from the parts the reader is served', () => {
    expect(theSessionReportAtAGlance(served)).toEqual({
      reliesOn: 'There is enough here to talk about, and not enough to settle anything',
      eachPersonDid: '3 people, each in their own words',
      picture: 'Samuel Kiprop is waiting for 3 things',
      goodLooksLike: 'What success looks like is stated, but nobody has said anything about it in a check-in yet',
    });
  });

  /* Changed 24 November (page audit, row 6): where nothing above it is named, the part says so itself, once, and its folded line
     carries no second copy. A named parent is still the line's fact. */
  it('names what it sits under only where something is named', () => {
    expect(theSessionReportAtAGlance({ cascade: { parentNamed: 'Grow revenue' } }).sitsUnder).toBe('Grow revenue');
    expect(theSessionReportAtAGlance({ cascade: { parentNamed: null } }).sitsUnder).toBeUndefined();
  });

  it('says nothing for a part the reader is not served', () => {
    expect(theSessionReportAtAGlance({})).toEqual({});
    expect(theSessionReportAtAGlance({ whatEachPersonSaid: [] }).eachPersonDid).toBeUndefined();
  });
});

describe('a weekly report at a glance', () => {
  it('counts what kept happening and takes the first sentence of the rest', () => {
    expect(theWeeklyReportAtAGlance({
      threeInARow: [{ who: 'David' }, { who: 'Samuel' }],
      saidAndProof: 'This week, people said 15 things. None of them has a photo.',
      whatChanged: { moved: [], dropped: [], result: ['The team’s freezers sold went from 20 to 21 this week, against the aim of 25.'] },
    })).toEqual({
      threeInARow: '2 things that keep happening',
      saidAndProof: 'This week, people said 15 things',
      whatChanged: 'The team’s freezers sold went from 20 to 21 this week, against the aim of 25',
    });
    expect(theWeeklyReportAtAGlance({ threeInARow: [{ who: 'David' }] }).threeInARow).toBe('1 thing that keeps happening');
    expect(theWeeklyReportAtAGlance({})).toEqual({});
  });

  it('cuts a paragraph to its first sentence', () => {
    expect(firstSentence('One. Two.')).toBe('One');
    expect(firstSentence('')).toBeNull();
  });
});

describe('the facts go beside the report only where there is one', () => {
  it('adds nothing to a report withheld until the reader answers, or when there is no fact to give', () => {
    const withheld = { withheldUntilYouAnswer: true, saying: 'Answer first.' };
    expect(withItsFacts(withheld, theSessionReportAtAGlance)).toBe(withheld);
    expect(withItsFacts({ weekStart: 'x', eachPerson: [] }, theWeeklyReportAtAGlance)).toEqual({ weekStart: 'x', eachPerson: [] });
    expect((withItsFacts({ threeInARow: [{ who: 'D' }] }, theWeeklyReportAtAGlance) as any).inThisReport).toEqual({ threeInARow: '1 thing that keeps happening' });
  });
});
