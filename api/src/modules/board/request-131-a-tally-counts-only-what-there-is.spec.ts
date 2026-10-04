import { boardAs, SALES_RUN, KWAME, BISI } from './the-switchboards-sections-harness';
import { theTallySaid } from './the-switchboards-own-sections';

/** Request 131 item 4: "0 are done, 0 are not done or dropped, and 1 is still open." */
describe('the tally of a person\'s own commitments', () => {
  it.each([
    [0, 0, 1, 'None is done yet, and 1 is still open.'],
    [1, 0, 0, '1 is done.'],
    [1, 0, 0 + 2, '1 is done, and 2 are still open.'],
    [2, 1, 0, '2 are done, and 1 is not done or dropped.'],
    [0, 1, 1, 'None is done yet, 1 is not done or dropped, and 1 is still open.'],
  ])('%i done, %i not done, %i open', (d, n, o, says) => {
    expect(theTallySaid(d, n, o)).toBe(says);
  });
  it('is what the person reads on their own board, and the lead reads none of it', async () => {
    const mine: any = await boardAs(SALES_RUN, ...KWAME);
    const line = mine.personHistory[0].says as string;
    expect(line).not.toMatch(/\b0 are\b/);
    expect(line).toMatch(/1 is done\./);
    const lead: any = await boardAs(SALES_RUN, ...BISI);
    expect(JSON.stringify(lead.personHistory)).not.toMatch(/is done|are done|still open/);
  });
});
