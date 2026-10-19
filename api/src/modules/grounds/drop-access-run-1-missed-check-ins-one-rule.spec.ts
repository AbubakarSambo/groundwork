import { whereTheyStand, theirClosedSessions, whatThePersonReads, whatTheLeadReads, theLeadIsTold, TOLD_THE_PERSON, TOLD_THE_LEAD } from './missed-check-ins';

/**
 * DROP ACCESS RUN 1, ITEM 25: WHAT JOSEPH IS TOLD ABOUT GRACE, AND WHAT GRACE IS TOLD, COME FROM ONE RULE (gw_sweep_drop10, 18 October 2026).
 *
 * Joseph's sessions 7 and 8 (20 and 21 October) were closed by the clock with nothing said. On 22 October 05:00 UTC his opening email said
 * "You've missed your last two check-ins. ... Grace will see this." Grace was told nothing: the lead is told from three of the last four.
 */
const JOSEPH = (until: number) => [5, 6, 7, 8, 9, 10].filter((n) => n <= until).map((n) => ({
  sessionNumber: n,
  status: n === until ? 'NOT_STARTED' : 'COMPLETED',
  closedReason: n === 7 || n === 8 ? 'auto_closed' : null,
  turns: n === 7 || n === 8 || n === until ? [] : [{ id: 't' }],
  availableFrom: new Date(`2026-10-${15 + n}T05:00:00Z`),
}));

describe("Joseph on 22 October, his sessions 7 and 8 missed", () => {
  const stand = whereTheyStand(theirClosedSessions(JOSEPH(9), [], new Date('2026-10-22T05:00:00Z')));
  it('two in a row: he is told, Grace is not yet', () => {
    expect([stand.inARow, stand.stage]).toEqual([2, TOLD_THE_PERSON]);
    expect(theLeadIsTold(stand)).toBe(false);
  });
  it('before: "Grace will see this." Now he reads what is true: Grace will be told if he misses the next one', () => {
    expect(whatThePersonReads(stand, { leadName: 'Grace', somebodyWaitsOnThem: false })).toBe(
      "You've missed your last two check-ins. When you miss them, your team works without your view. Things you know about surface late and Grace has to chase instead of help. If you miss the next one as well, Grace will be told. About ten minutes now puts your view back in the picture.",
    );
  });
  it('had he missed session 9 too, three of the last four: Grace is told, and he reads "Grace will see this." from the same rule', () => {
    const rows = JOSEPH(10).map((r) => (r.sessionNumber === 9 ? { ...r, closedReason: 'auto_closed', turns: [] } : r));
    const three = whereTheyStand(theirClosedSessions(rows, [], new Date('2026-10-23T05:00:00Z')));
    expect(three.stage).toBe(TOLD_THE_LEAD);
    expect(theLeadIsTold(three)).toBe(true);
    expect(whatThePersonReads(three, { leadName: 'Grace', somebodyWaitsOnThem: false })).toContain('Grace will see this.');
    expect(whatTheLeadReads('Joseph', three, 'Sales team, Q4')).toMatch(/^Joseph has missed 3 of the last 4 check-ins on "Sales team, Q4"\./);
  });
});
