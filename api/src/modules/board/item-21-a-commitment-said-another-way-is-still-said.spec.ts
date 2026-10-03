import { boardAs, answered, commitment, AMINA, RUKIA, JUMA } from './the-switchboards-sections-harness';

/**
 * ITEM 21, THE FOUNDER'S BOARD: A COMMITMENT SAID ANOTHER WAY IS STILL SAID.
 *
 * "A second founder joining" (local test database, 9a904212): Tunde read in his timeline "On 30
 * September, you made a commitment, which is in the record." for "I am continuing to assess the
 * documentation and codebases", and Ada's "I just need to schedule a dedicated call for that exact
 * topic." was the same. Only "I will", "I'll", "I'm going to" and "I plan to" were taken off.
 */
const setup = {
  checkIns: [answered('p-rukia', 1), answered('p-baraka', 1)],
  commitments: [
    commitment('k-1', 'p-rukia', 'I am continuing to assess the documentation and codebases', { statedInSession: 1, saidWordForWord: true }),
    commitment('k-2', 'p-rukia', 'I just need to schedule a dedicated call for that exact topic.', { statedInSession: 1, saidWordForWord: true }),
    /* The support desk board: Maria read "You committed to going to continue with that." */
    commitment('k-3', 'p-rukia', 'going to continue with that', { statedInSession: 1, saidWordForWord: true }),
  ],
};
const timeline = async (reader: readonly [string, string]) => ((await boardAs(setup as any, ...reader)).timeline ?? []).map((t: any) => t.says);

describe('a commitment said another way, in the timeline, as each reader reads it', () => {
  it('Rukia reads what she committed to', async () => {
    const t = await timeline(RUKIA);
    expect(t).toContain('On 2 September, you committed to continue to assess the documentation and codebases.');
    expect(t).toContain('On 2 September, you committed to schedule a dedicated call for that exact topic.');
    expect(t).toContain('On 2 September, you committed to continue with that.');
  });
  it.each([['Amina, who runs it', AMINA], ['Juma, an admin', JUMA]])('%s reads it with Rukia named,', async (_w, reader) => {
    const t = await timeline(reader as readonly [string, string]);
    expect(t.join(' ')).not.toMatch(/which is in the record/);
    expect(t).toContain('On 2 September, Rukia Mwangi committed to continue to assess the documentation and codebases.');
  });
});
