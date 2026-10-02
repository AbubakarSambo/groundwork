import { boardAs } from './the-switchboards-sections-harness';
import { review5, RUKIA_RUNS_IT, AMANI, JUMA_READS, GRACE_SET_IT_UP } from './__fixtures__/sales-board-review-5';

/**
 * REQUEST 118 (5), FROM REQUEST 117 (4): THE WON HEADING DOES NOT SAY A DEAL ADDED ON THE BOARD WAS REPORTED.
 *
 * Tuskys Westgate was added on the board by Rukia at Won. The group heading over it still read "Somebody reported
 * each of these at Won, the last stage." (each-deal-in-its-group.ts). It now reads "Each of these was put at Won,
 * the last stage, on the board." A deal somebody reported in a check-in still reads "Somebody reported each of these
 * at Won, the last stage."
 */
const theWonGroup = (b: any) => ((b.workRecords ?? []) as any[]).flatMap((s) => s.groups ?? []).find((g: any) => g.group === 'won');

describe('request 118 (5): a deal added on the board at Won was not reported', () => {
  it.each([['Rukia, who runs it', RUKIA_RUNS_IT], ['Grace, the admin who set it up', GRACE_SET_IT_UP], ['Juma, an admin who only reads', JUMA_READS]])('%s reads that it was put at Won on the board', async (_who, reader) => {
    const b = await boardAs(review5(), reader[0], reader[1]);
    expect(theWonGroup(b)?.reason).toBe('Each of these was put at Won, the last stage, on the board.');
    expect(JSON.stringify(b.workRecords)).not.toMatch(/Somebody reported each of these/);
  });

  it('Amani, who checks in, is never told a deal was reported that nobody reported', async () => {
    const b = await boardAs(review5(), ...AMANI);
    expect(JSON.stringify(b.workRecords ?? null)).not.toMatch(/Somebody reported each of these/);
  });
});
