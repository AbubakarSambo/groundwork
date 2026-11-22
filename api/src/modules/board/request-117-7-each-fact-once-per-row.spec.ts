import { boardAs } from './the-switchboards-sections-harness';
import { review5, REVIEW_5_CHECK_INS, REVIEW_5_PEOPLE, RUKIA_RUNS_IT, AMANI, BARAKA_M, NEEMA, JUMA_READS, GRACE_SET_IT_UP } from './__fixtures__/sales-board-review-5';
import { labelsForParties } from '../reports/party-labels';
import { aFindingThatDoesNotSayTheWaitAgain } from './where-each-person-is-against-their-number';

/**
 * SCREENS REQUEST 117 (7): EACH ROW OF "THE TEAM TODAY" SAYS ONE WAIT ONCE.
 *
 * Rukia read, on Amani's row, "Amani Wekesa has checked in, and is waiting on you for the price list." (says),
 * "Amani Wekesa has been waiting 4 days on you for the price list. Give Amani Wekesa an answer, or say when you
 * will." (ask), and "Amani is waiting for you to send a price list." (finding). The wait and its day are said once
 * in `says`, the ask only asks, and the finding keeps only what it adds.
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
const labels = labelsForParties(REVIEW_5_PEOPLE as any);
const REPORT = {
  releasedAt: new Date('2026-09-27T17:00:00Z'), releasedSessions: [1, 2], sharedAs: null, theOpening: null, networkPicture: null,
  sharedPicture: 'Two shops are signed.', agreements: [], divergences: [], centralQuestion: null, engagement: {},
  findings: [
    { participantId: 'p-amani', text: `${labels.get('p-amani')} is waiting for you to send a price list. ${labels.get('p-amani')} has set an aim of 3 shops in Kilimani.`, hasGap: false },
    { participantId: 'p-baraka', text: `${labels.get('p-baraka')} is waiting for a decision on the discount.`, hasGap: false },
  ],
  createdAt: new Date('2026-09-26T09:00:00Z'), updatedAt: new Date('2026-09-30T15:00:00Z'),
};
const rowOf = (b: any, id: string) => (b.eachPerson as any[]).find((r) => r.participantId === id);
const theWaitIn = (t: string | null | undefined, what: string) => (t ?? '').split(/(?<=[.!?])\s+/).filter((x) => /wait/i.test(x) && x.includes(what)).length;

describe('request 117 (7): each fact once per row', () => {
  it('Rukia reads Amani\'s wait once, with its day, then only what to do', async () => {
    const amani = rowOf(await boardAs(review5({ report: REPORT, checkIns: BOTH_ANSWERED_SESSION_2 }), ...RUKIA_RUNS_IT), 'p-amani');
    expect(amani.says).toBe('Amani Wekesa has checked in, and has been waiting on you for the price list since 28 September.');
    expect(amani.ask).toBe('Give Amani Wekesa an answer, or say when you will.');
    expect(amani.finding).toMatch(/^Amani( Wekesa)? has set an aim of 3 shops in Kilimani\.$/);
  });

  it('Rukia reads Baraka\'s wait once, and no finding that only says it again', async () => {
    const baraka = rowOf(await boardAs(review5({ report: REPORT, checkIns: BOTH_ANSWERED_SESSION_2 }), ...RUKIA_RUNS_IT), 'p-baraka');
    expect(baraka.says).toBe('Baraka Mwangi has checked in, and has been waiting on you for the discount since 27 September.');
    expect(baraka.ask).toBe('Give Baraka Mwangi an answer, or say when you will.');
    expect(baraka).not.toHaveProperty('finding');
  });

  /* With the review's own rows, unchanged: on 2 October the team is on session 2, which Baraka has not answered. His wait on Rukia is still open,
     so his row still says it, once, beside "has not checked in yet" (22 November 2026). */
  it('Rukia reads that Baraka has not checked in yet, and still reads his wait on her, once', async () => {
    const baraka = rowOf(await boardAs(review5({ report: REPORT }), ...RUKIA_RUNS_IT), 'p-baraka');
    expect(baraka.says).toBe('Baraka Mwangi has not checked in yet, and has been waiting on you for the discount since 27 September.');
    expect(baraka.ask).toBe('Ask Baraka Mwangi to check in.');
    expect(theWaitIn(baraka.says, 'discount') + theWaitIn(baraka.ask, 'discount') + theWaitIn(baraka.finding, 'discount')).toBe(1);
  });

  it.each([['Grace, the admin who set it up', GRACE_SET_IT_UP], ['Juma, an admin who only reads', JUMA_READS]])('%s reads each wait once on each row', async (_who, reader) => {
    const b = await boardAs(review5({ report: REPORT, checkIns: BOTH_ANSWERED_SESSION_2 }), reader[0], reader[1]);
    for (const [id, what] of [['p-amani', 'price list'], ['p-baraka', 'discount'], ['p-neema', 'Naivas Karen']] as const) {
      const row = rowOf(b, id);
      const times = theWaitIn(row.says, what) + theWaitIn(row.ask, what) + theWaitIn(row.finding, what);
      expect(times).toBe(1);
    }
    expect(rowOf(b, 'p-amani').says).toBe('Amani Wekesa has checked in, and has been waiting on Rukia Otieno for the price list since 28 September.');
    expect(rowOf(b, 'p-amani').ask).toBe('Nobody has said yet what was tried. Ask Amani Wekesa to speak to Rukia Otieno rather than write to them.');
  });

  it.each([['Amani', AMANI], ['Baraka', BARAKA_M], ['Neema', NEEMA]])('%s, who checks in, is sent no rows about the team', async (_who, reader) => {
    for (const peersVisibleToEachOther of [true, false]) {
      const b = await boardAs(review5({ report: REPORT, peersVisibleToEachOther }), reader[0], reader[1]);
      expect(b.eachPerson ?? []).toEqual([]);
    }
  });

  it('the rule keeps a finding\'s other sentences', () => {
    expect(aFindingThatDoesNotSayTheWaitAgain('Amani is waiting for you to send a price list. Amani visited four shops.', ['the price list'])).toBe('Amani visited four shops.');
    expect(aFindingThatDoesNotSayTheWaitAgain('Amani is waiting for the warehouse.', ['the price list'])).toBe('Amani is waiting for the warehouse.');
    expect(aFindingThatDoesNotSayTheWaitAgain('Amani is waiting for you to send a price list.', ['the price list'])).toBeNull();
  });
});
