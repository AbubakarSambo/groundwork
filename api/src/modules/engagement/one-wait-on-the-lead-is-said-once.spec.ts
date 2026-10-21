import { withWhatTheBoardsSay } from './the-summary-reads-the-board';
import { theTemplateParagraph, withPlacesWhereTheyTellApart, type WhatIsOutstanding } from './the-leads-daily-nudge';

/**
 * ONE WAIT ON THE LEAD IS SAID ONCE (engine test, second run, Drop Access, every morning from Friday 16 October).
 *
 * Peter said on Thursday 15 October that he was waiting on Grace for "a specific area to focus on". Grace's morning summary read
 * "Peter is waiting on you for a specific area to focus on since Thursday 15 October. Peter Njoroge is waiting on you for a specific
 * area to focus on." The first line is the summary's own, from the wait on record; the second is her board's decision made from the
 * same wait ("Peter Njoroge is waiting on you for a specific area to focus on.", owner "You"). Both are as this code built them from
 * the run's database on Tuesday 20 October.
 */
const GROUND = 'a0cdc357-32d0-4df4-bece-692b27e5511f';
const WAIT = 'cf1ee764-daa2-4325-b043-875b91eb6a25';
const fromTheRecord = (): WhatIsOutstanding => ({
  releaseOne: true,
  saidAsACount: true,
  needsYou: [{ text: 'Peter is waiting on you for a specific area to focus on{in} since Thursday 15 October.', group: 1, place: 'Sales team, Q4', groundId: GROUND, about: { kind: 'decision', ids: [WAIT] }, waitFor: 'a specific area to focus on' }],
  overdueOnYourTeam: [],
  risks: [],
});
const board = {
  decisions: [
    { question: 'Peter Njoroge is waiting on you for a specific area to focus on.', why: 'They cannot move until it comes.', owner: 'You', source: 'blocker' },
    { question: 'Joseph Kariuki is waiting on your answer about the KES 4,500 price, so it needs deciding.', why: 'They cannot move until this is decided.', owner: 'You', source: 'blocker' },
  ],
};

describe("Grace's morning summary, with Peter's wait on her", () => {
  const all = withWhatTheBoardsSay(fromTheRecord(), [{ label: 'Sales team, Q4', groundId: GROUND, board }]);

  it("says Peter's wait once, with its day", () => {
    const paragraph = theTemplateParagraph('Grace', withPlacesWhereTheyTellApart(all), 'http://localhost:5220/grounds/x/board').params[1];
    expect(paragraph).toContain('Peter is waiting on you for a specific area to focus on since Thursday 15 October.');
    expect(paragraph).not.toContain('Peter Njoroge is waiting on you for a specific area to focus on.');
    expect(paragraph.match(/a specific area to focus on/g)).toHaveLength(1);
  });

  it("keeps the board's decision about another wait the summary did not say", () => {
    expect(all.needsYou.map((t) => t.text)).toContain('Joseph Kariuki is waiting on your answer about the KES 4,500 price, so it needs deciding{in}.');
  });
});

describe('A difference on her board, in the same summary', () => {
  it('says once that it needs settling', () => {
    const all = withWhatTheBoardsSay({ ...fromTheRecord(), needsYou: [] }, [{ label: 'Sales team, Q4', groundId: GROUND, board: { decisions: [
      { question: 'People in this check-in said different things about the status of the sale to Mama Pima Stores, so it needs settling.', owner: 'You', source: 'divergence' },
    ] } }]);
    const said = withPlacesWhereTheyTellApart(all).needsYou.map((t) => t.text);
    expect(said).toEqual(['People in this check-in said different things about the status of the sale to Mama Pima Stores, so it needs settling.']);
  });
});
