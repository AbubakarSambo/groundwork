import { boardAs } from './the-switchboards-sections-harness';
import { review5, RUKIA_RUNS_IT, AMANI, BARAKA_M, NEEMA, JUMA_READS, GRACE_SET_IT_UP } from './__fixtures__/sales-board-review-5';

/**
 * SCREENS REQUEST 117 (4): A DEAL CARD THAT AGREES WITH ITSELF.
 *
 * Both deals on "Sales team, Q3" were added on the board by Rukia, with nobody's name on them. One card said both
 * "Nobody has spoken about it in a check-in yet." and "On 27 September, somebody spoke about it", and the board said
 * Tuskys Westgate was "reported ... at Won" though it was added on the board. The day it was last spoken about is
 * now the newest day in its own contact history, and a deal added on the board is counted as added, not reported.
 *
 * Who owns each deal is a claim the lead answers (decision 76, item 3), so neither has an owner until she says
 * yes; that part is the record, and is brought up to date by journey/bring-a-check-in-up-to-date.ts.
 */
const deals = (b: any) => ((b.workRecords ?? []) as any[]).flatMap((s) => (Array.isArray(s.rows) ? s.rows : []));

describe('request 117 (4): a deal card agrees with itself', () => {
  it.each([['Rukia, who runs it', RUKIA_RUNS_IT], ['Grace, the admin who set it up', GRACE_SET_IT_UP], ['Juma, an admin who only reads', JUMA_READS]])('%s reads one day each deal was last spoken about', async (_who, reader) => {
    const b = await boardAs(review5(), reader[0], reader[1]);
    for (const d of deals(b)) {
      const history = (d.contactHistory ?? []) as any[];
      if (history.length) {
        expect(d.groupSays).not.toMatch(/Nobody has spoken about it in a check-in yet/);
        expect(d.lastSaidOn).toBe(history[0].on);
      }
    }
    const tuskys = deals(b).find((d: any) => d.name === 'Tuskys Westgate');
    expect(tuskys.groupSays).toBe('It was added on the board, not said in a check-in. No date has been given for it. It was last spoken about on 26 September. Nobody has said what happens next.');
  });

  it('the stage count says Tuskys Westgate was added on the board at Won, not reported', async () => {
    const b = await boardAs(review5(), ...RUKIA_RUNS_IT);
    const won = b.reportedAgainstCriteria.stages.find((s: any) => s.stage === 'Won');
    expect(won).toMatchObject({ reported: 0, addedOnTheBoard: 1, says: '1 deal was added on the board at Won, not reported in a check-in.' });
    expect(JSON.stringify(b.reportedAgainstCriteria)).not.toMatch(/reported at Won/);
  });

  it.each([['Amani', AMANI], ['Baraka', BARAKA_M], ['Neema', NEEMA]])('%s, who checks in, reads no card that contradicts itself', async (_who, reader) => {
    for (const peersVisibleToEachOther of [true, false]) {
      const b = await boardAs(review5({ peersVisibleToEachOther }), reader[0], reader[1]);
      for (const d of deals(b)) if ((d.contactHistory ?? []).length) expect(d.groupSays ?? '').not.toMatch(/Nobody has spoken about it in a check-in yet/);
    }
  });
});
