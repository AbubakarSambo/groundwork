import { boardAs } from './the-switchboards-sections-harness';
import { review5, RUKIA_RUNS_IT, AMANI, GRACE_SET_IT_UP } from './__fixtures__/sales-board-review-5';

/**
 * REQUEST 121, PART 3: A TARGET DOES NOT POINT TO A PLACE TO WRITE ITS ASSUMPTIONS, BECAUSE THERE IS NONE, read as each person who reads the board.
 */
describe('request 121 (3): a target does not point to a place that is not there', () => {
  it.each([['Rukia, who runs it', RUKIA_RUNS_IT], ['the admin who set it up', GRACE_SET_IT_UP], ['Amani, who checks in', AMANI]])('%s', async (_who, reader) => {
    const b = await boardAs(review5(), ...(reader as readonly [string, string]));
    const served = JSON.stringify(b);
    expect(served).not.toMatch(/write down what it assumes here/);
    const says = (b.objectives as any[]).map((o) => o.assumesSays).filter(Boolean);
    expect(says.length).toBeGreaterThan(0);
    for (const s of says) expect(s).toMatch(/^(Nothing on record says what this target assumes yet\.|Nobody has written down what this target assumes yet\.)$/);
  });

  it('the lead reads the plain sentence', async () => {
    const b = await boardAs(review5(), ...RUKIA_RUNS_IT);
    expect((b.objectives as any[])[0].assumesSays).toBe('Nothing on record says what this target assumes yet.');
  });
});

