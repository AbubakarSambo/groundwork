import { boardAs } from './the-switchboards-sections-harness';
import { review5, RUKIA_RUNS_IT, AMANI, BARAKA_M, NEEMA, JUMA_READS, GRACE_SET_IT_UP } from './__fixtures__/sales-board-review-5';
import { aPlainerWord } from '../reports/a-plainer-word';
import { withNames } from '../reports/party-labels';

/**
 * SCREENS REQUEST 117 (10): "signifies" BECOMES "means", IN WHAT PEOPLE READ.
 *
 * The written report described a difference on "Sales team, Q3" as "what document signifies that a shop is
 * successfully signed". The report is stored in labels and named for each reader by `withNames`, so the word
 * is changed there for every reader, on report text stored before this change too. A person's own words in
 * quotation marks keep their word.
 */
const TOPIC = 'The team does not agree on what document signifies that a shop is successfully signed.';
const REPORT = {
  releasedAt: new Date('2026-09-27T17:00:00Z'), releasedSessions: [1, 2], sharedAs: null, theOpening: null, networkPicture: null,
  sharedPicture: 'Two shops are signed.', agreements: [], centralQuestion: null, engagement: {}, findings: [],
  divergences: [{
    topic: TOPIC,
    positions: [
      { participantLabel: 'the initiator', view: 'A signed supply contract is what counts.' },
      { participantLabel: 'Participant A', view: 'A first order is what counts.' },
    ],
    atStake: 'Whether a shop is counted.', settledBy: 'The initiator says what document counts.',
  }],
  createdAt: new Date('2026-09-26T09:00:00Z'), updatedAt: new Date('2026-09-30T15:00:00Z'),
};

describe('request 117 (10): a plainer word', () => {
  it('the rule changes the word, and never a quotation', () => {
    expect(aPlainerWord(TOPIC)).toBe('The team does not agree on what document means that a shop is successfully signed.');
    expect(withNames('The initiator asked what "signifies" signifies.', new Map([['the initiator', 'Rukia Otieno']])))
      .toBe('Rukia Otieno asked what "signifies" means.');
  });

  it.each([
    ['Rukia, who runs it', RUKIA_RUNS_IT],
    ['Amani, who checks in', AMANI],
    ['Baraka, who checks in', BARAKA_M],
    ['Neema, who checks in', NEEMA],
    ['Juma, an admin who only reads', JUMA_READS],
    ['Grace, the admin who set it up', GRACE_SET_IT_UP],
  ])('%s reads "means" outside quotation marks, never "signifies"', async (_who, reader) => {
    for (const peersVisibleToEachOther of [true, false]) {
      const board = await boardAs(review5({ report: REPORT, peersVisibleToEachOther }), reader[0], reader[1]);
      const served = JSON.stringify(board);
      const outsideQuotes = served.replace(/\\"[^"\\]*\\"/g, '');
      expect(outsideQuotes).not.toMatch(/signif(?:y|ies|ied|ying)\b/i);
    }
  });

  it('the lead reads the difference with "means"', async () => {
    const board = await boardAs(review5({ report: REPORT }), ...RUKIA_RUNS_IT);
    expect(JSON.stringify(board)).toContain('what document means that a shop is successfully signed');
  });
});
