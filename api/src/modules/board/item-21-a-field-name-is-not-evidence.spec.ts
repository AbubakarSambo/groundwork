import { boardAs, answered, A_RELEASED_REPORT, AMINA, RUKIA, JUMA } from './the-switchboards-sections-harness';

/**
 * ITEM 21, THE ENGINEERING BOARD: A FIELD NAME THE MODEL WROTE INTO A LINE OF EVIDENCE IS NOT SERVED.
 *
 * "Rebuilding the payments integration" (local test database, c6e70dcb): Ifeoma read, as the evidence
 * under the difference about what the project is for, "atStake: If this holds, the project could be
 * delivered on time according to your definition, but fail to solve the underlying business problem
 * ...". The topic was already cleaned of field names when a report was written; the evidence was not,
 * and a report already stored was never cleaned at the read.
 */
const report = {
  ...A_RELEASED_REPORT,
  divergences: [{
    topic: 'The definition of success is not agreed.',
    atStake: 'The project could deliver the swap while the reconciliation is left untouched.',
    evidence: ['atStake: If this holds, the project could be delivered on time but fail to solve the business problem.', 'Rita said it is useless without the reconciliation.'],
    positions: [],
  }],
};
const setup = { checkIns: [answered('p-rukia', 1), answered('p-baraka', 1)], report };
const evidence = async (reader: readonly [string, string]) => ((await boardAs(setup as any, ...reader)).divergence?.items ?? []).flatMap((d: any) => d.evidence ?? []);

describe('the evidence under a difference, as each reader reads it', () => {
  it.each([['Amina, who runs it', AMINA], ['Rukia, who checks in', RUKIA], ['Juma, an admin', JUMA]])('%s reads no field name', async (_w, reader) => {
    const e = await evidence(reader as readonly [string, string]);
    expect(e).toEqual(['If this holds, the project could be delivered on time but fail to solve the business problem.', 'Rita said it is useless without the reconciliation.']);
  });
});
