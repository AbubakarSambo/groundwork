import { boardAs } from './the-switchboards-sections-harness';
import { review5, REVIEW_5_CHECK_INS, RUKIA_RUNS_IT, AMANI, BARAKA_M, NEEMA, JUMA_READS, GRACE_SET_IT_UP } from './__fixtures__/sales-board-review-5';

/**
 * SCREENS REQUEST 134 (5): WHO IS ASKED TO FIND AN OWNER (Hafsah, 5 October 2026).
 *
 * The lead's board read "Ask Amani Wekesa to find out who owns this by name." Amani is the one
 * waiting, and the lead is the one who can find out. Hafsah decided the lead is asked, with the
 * person waiting as the reason. Here Neema waits on "the warehouse", which names nobody.
 */
/*
 * Changed 22 November 2026 (Hafsah, "Yes, move it on"): the team's session is the latest one that has begun, so on 2 October it is
 * session 2, and a row for somebody who has not answered session 2 says only that they have not checked in yet. Baraka and Neema had
 * answered only session 1 in the review's rows, so their rows no longer said their waits. This spec is about how a wait is said on the
 * row of somebody who has checked in, so here they have answered session 2 as well (on 1 October).
 */
const BOTH_ANSWERED_SESSION_2 = REVIEW_5_CHECK_INS.map((c: any) => (c.sessionNumber === 2 && (c.participantId === 'p-baraka' || c.participantId === 'p-neema')
  ? { ...c, status: 'COMPLETED', completedAt: new Date('2026-10-01T10:00:00Z'), startedAt: c.availableFrom, specificityLevel: 'specific', specificityDimensions: { checkable: 'specific' } }
  : c));
const rowOf = (b: any, id: string) => (b.eachPerson as any[]).find((r) => r.participantId === id);
const THE_ASK = 'Find out who owns this, so that Neema Achieng is not left waiting.';

describe('request 134 (5): the lead is asked to find the owner', () => {
  it.each([
    ['Rukia, who runs it', RUKIA_RUNS_IT],
    ['Grace, the admin who set it up', GRACE_SET_IT_UP],
    ['Juma, an admin who only reads', JUMA_READS],
  ])('%s reads that finding the owner is theirs to do, so that Neema is not left waiting', async (_who, reader) => {
    const neema = rowOf(await boardAs(review5({ checkIns: BOTH_ANSWERED_SESSION_2 }), reader[0], reader[1]), 'p-neema');
    expect(neema.ask).toContain(THE_ASK);
    expect(neema.ask).not.toMatch(/Ask Neema[^.]* to find out who owns/);
    expect(neema.ask).not.toMatch(/by name/);
  });

  /* With the review's own rows, unchanged: Neema has not answered session 2, and her wait on the warehouse is still open, so her row still says it (22 November 2026). */
  it.each([
    ['Rukia, who runs it', RUKIA_RUNS_IT],
    ['Grace, the admin who set it up', GRACE_SET_IT_UP],
  ])('%s reads that Neema has not checked in yet, and still reads what she is waiting for', async (_who, reader) => {
    const neema = rowOf(await boardAs(review5(), reader[0], reader[1]), 'p-neema');
    expect(neema.says).toMatch(/^Neema Achieng has not checked in yet, and (?:has been|is) waiting .*Naivas Karen.*\.$/);
    expect(neema.ask).toBe('Ask Neema Achieng to check in.');
  });

  it.each([['Amani', AMANI], ['Baraka', BARAKA_M], ['Neema', NEEMA]])('%s, who checks in, is sent no rows about the team, so no ask either', async (_who, reader) => {
    const b = await boardAs(review5(), reader[0], reader[1]);
    expect(b.eachPerson ?? []).toEqual([]);
  });
});
