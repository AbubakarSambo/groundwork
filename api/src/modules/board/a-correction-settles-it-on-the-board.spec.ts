import { boardAs, SALES_RUN, BISI, NGOZI, SALES_PEOPLE, type Setup } from './the-switchboards-sections-harness';
import { labelsForParties } from '../reports/party-labels';

/**
 * THE DROP ACCESS SHORT RUN (gw_sweep_drop3), ITEM 1, ON THE BOARD. A report stored before the rule held Mercy's KES 120,000 and
 * KES 125,000 as a difference and a question for the lead ("Ask Mercy Wairimu which of the two figures ..."), and her own board read
 * "You first reported the Greenfield deal as 25 units for KES 120,000." Here Ngozi says the same two lines, word for word, and the
 * stored report is the one Grace was served, about Ngozi. Bisi runs it.
 */
const label = labelsForParties(SALES_PEOPLE as any);
const NGOZI_LABEL = label.get('p-ngozi')!;
const LINES = [
  { id: 'l1', participantId: 'p-ngozi', type: 'PROGRESS', text: "I called Mrs. Njeri today and Greenfield signed the order! That's 25 units, KES 120,000, in the bag.", createdAt: new Date('2026-09-15T10:00:00Z') },
  { id: 'l2', participantId: 'p-ngozi', type: 'PROGRESS', text: "Okay, so for Greenfield, we got the order signed yesterday for 25 units. I mistakenly said it was KES 120,000, but it's actually KES 125,000.", createdAt: new Date('2026-09-16T10:00:00Z') },
];
const REPORT = {
  sharedPicture: 'Two people answered.',
  agreements: [],
  divergences: [{
    topic: 'The value of the signed deal with Greenfield Supermarket is reported differently in the same week.',
    atStake: 'If sales values are not consistent, the total revenue picture is unreliable.',
    evidence: [`In one check-in, ${NGOZI_LABEL}'s record celebrates the Greenfield deal as being 'in the bag' for KES 120,000.`],
    positions: [
      { view: `${NGOZI_LABEL} first reported the Greenfield deal as 25 units for KES 120,000.`, participantLabel: NGOZI_LABEL },
      { view: `In a later check-in the same week, ${NGOZI_LABEL} stated the same deal was for KES 125,000.`, participantLabel: NGOZI_LABEL },
    ],
    settledBy: 'Confirm the final amount for the Greenfield deal and update the record.',
  }],
  centralQuestion: null,
  theJudgement: {
    theGap: 'Sales are behind.',
    whatToDo: [{ move: `Ask ${NGOZI_LABEL} which of the two figures for the Greenfield Supermarket deal, KES 120,000 or KES 125,000, is the correct one.`, because: 'Two values.', startWith: NGOZI_LABEL }],
    whatTheNumbersSay: [],
  },
};
const RUN: Setup = { ...SALES_RUN, kindOfWork: 'sales org', releaseOneSalesBoard: true, lines: LINES, recordLines: LINES, report: REPORT };
const everything = (b: any) => JSON.stringify(b);

describe('a person correcting themselves is not a difference on the board, for the lead or for them', () => {
  it('Bisi reads no difference, no question and no judgement line about KES 120,000', async () => {
    const b = await boardAs(RUN, ...BISI);
    expect(everything(b)).not.toMatch(/120,000/);
    expect(everything(b)).not.toMatch(/said different things about|which of the two figures/);
  });
  it('Ngozi never reads "You first reported"', async () => {
    const n = await boardAs(RUN, ...NGOZI);
    expect(everything(n)).not.toMatch(/first reported|120,000/);
  });
  it('with the switch off, the board reads the stored report as before', async () => {
    const b = await boardAs({ ...RUN, releaseOneSalesBoard: false }, ...BISI);
    expect(everything(b)).toMatch(/120,000/);
  });
});
