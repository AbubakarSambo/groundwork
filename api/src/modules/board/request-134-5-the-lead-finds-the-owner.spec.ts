import { boardAs } from './the-switchboards-sections-harness';
import { review5, RUKIA_RUNS_IT, AMANI, BARAKA_M, NEEMA, JUMA_READS, GRACE_SET_IT_UP } from './__fixtures__/sales-board-review-5';

/**
 * SCREENS REQUEST 134 (5): WHO IS ASKED TO FIND AN OWNER (Hafsah, 5 October 2026).
 *
 * The lead's board read "Ask Amani Wekesa to find out who owns this by name." Amani is the one
 * waiting, and the lead is the one who can find out. Hafsah decided the lead is asked, with the
 * person waiting as the reason. Here Neema waits on "the warehouse", which names nobody.
 */
const rowOf = (b: any, id: string) => (b.eachPerson as any[]).find((r) => r.participantId === id);
const THE_ASK = 'Find out who owns this, so that Neema Achieng is not left waiting.';

describe('request 134 (5): the lead is asked to find the owner', () => {
  it.each([
    ['Rukia, who runs it', RUKIA_RUNS_IT],
    ['Grace, the admin who set it up', GRACE_SET_IT_UP],
    ['Juma, an admin who only reads', JUMA_READS],
  ])('%s reads that finding the owner is theirs to do, so that Neema is not left waiting', async (_who, reader) => {
    const neema = rowOf(await boardAs(review5(), reader[0], reader[1]), 'p-neema');
    expect(neema.ask).toContain(THE_ASK);
    expect(neema.ask).not.toMatch(/Ask Neema[^.]* to find out who owns/);
    expect(neema.ask).not.toMatch(/by name/);
  });

  it.each([['Amani', AMANI], ['Baraka', BARAKA_M], ['Neema', NEEMA]])('%s, who checks in, is sent no rows about the team, so no ask either', async (_who, reader) => {
    const b = await boardAs(review5(), reader[0], reader[1]);
    expect(b.eachPerson ?? []).toEqual([]);
  });
});
