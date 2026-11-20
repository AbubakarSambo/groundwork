import { AMINA, RUKIA, JUMA, A_RELEASED_REPORT, boardAs, answered } from './the-switchboards-sections-harness';

/**
 * ITEM 18 (THE ONBOARDING BOARD): A WAIT'S LINE THAT LOST ITS SUBJECT IS NOT SERVED.
 *
 * "Engagement Director, first 90 days" (served from the local test database on 2 October 2026). In the record over
 * time Amina read, as a wait of Tobi's: "Nothing on record says anybody has chased it since. This is work you owe Tobi
 * Adewale, not the other way round." The sentence that named the wait had been taken out by the quote check, and the
 * rest stayed. The list of what is still open already left such a line out; the wait's own line now does too (its
 * `say` is null), and its `what` stays.
 */
const LOST = 'Nothing on record says anybody has chased it since. This is work you owe Tobi Adewale, not the other way round.';
const SETUP = {
  checkIns: [answered('p-rukia', 1), answered('p-baraka', 1)],
  report: {
    ...A_RELEASED_REPORT,
    overTime: {
      sessions: 1, commitments: [], patterns: [], gaps: [], stillOpen: [], cannotTellYou: [], toSettleFirst: [],
      dependencies: [
        { participantId: 'p-rukia', what: 'a signal to lead client discussions', say: LOST },
        { participantId: 'p-baraka', what: 'the price list', say: 'Baraka Otieno is waiting on you for the price list for 1 check-in now.' },
      ],
    },
  },
};

describe('item 18: a wait line with nothing in it is not served', () => {
  it('Amina, who runs it, reads no line without its subject, and keeps the one with it', async () => {
    const b = await boardAs(SETUP, ...AMINA);
    const says = (b.overTime?.dependencies ?? []).map((d: any) => d.say);
    expect(says).toEqual([null, 'Baraka Otieno is waiting on you for the price list for 1 check-in now.']);
    expect(b.overTime.dependencies[0].what).toBe('a signal to lead client discussions');
    expect(JSON.stringify(b)).not.toContain(LOST);
  });

  it.each([['Rukia, who checks in', RUKIA], ['Juma, an admin who only reads', JUMA]])('%s is not served the record over time', async (_who, [user, role]) => {
    const b = await boardAs(SETUP, user, role);
    expect(b.overTime ?? null).toBeNull();
    expect(JSON.stringify(b)).not.toContain(LOST);
  });
});
