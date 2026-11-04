import { serviceFor, theSessionReportAs, everyString } from './__fixtures__/sales-team-q3-two-sessions';
import { whatIDontKnowYet } from './what-i-dont-know-yet';

/**
 * "WHAT I DON'T KNOW YET" (screen match; team-report.jpg). What a check-in asked a person for and did not get, read
 * from the open gaps on record, with what happens next. Rukia, who runs "Sales team, Q3", reads it in the team's report;
 * Amani and Baraka, who check in, never do, and never read another person's gap, whether or not the report is shared.
 */
function withGaps() {
  const { svc, w } = serviceFor('sales');
  const gaps = [
    { participantId: 'p-baraka', what: 'what is getting in the way now', firstRound: 1, asked: 2, certain: true, answeredAt: null },
    { participantId: 'p-amani', what: 'what they need from other people', firstRound: 2, asked: 1, certain: true, answeredAt: null },
    { participantId: 'p-neema', what: 'how they are making their number. Not the total: the deals that make it up.', firstRound: 2, asked: 1, certain: false, answeredAt: null },
  ];
  (svc as any).prisma.checkInGap = { findMany: async ({ where }: any) => gaps.filter((g) => where?.groundId === 'g1' && g.answeredAt === null) };
  return { svc, w };
}

describe('What I don’t know yet, as each reader reads it', () => {
  it('Rukia reads each open gap: the question that was put, who was asked, and what happens next', async () => {
    const read = await theSessionReportAs(withGaps().svc, 'u-rukia', 2);
    expect(read.refused).toBeUndefined();
    expect(read.whatIDontKnowYet).toEqual([
      {
        title: '“What is getting in the way now?”',
        says: 'Groundwork asked Baraka this in session 1 and once more since, and Baraka has not answered it yet. It won’t be asked again. You could ask Baraka yourself.',
      },
      {
        title: '“What do you need from other people?”',
        says: 'Groundwork asked Amani this in session 2, and Amani has not answered it yet. They’ll be asked again in a later check-in.',
      },
      {
        title: '“How are you making your number?”',
        says: 'Groundwork asked Neema this in session 2, and nothing on record can confirm the answer yet. They’ll be asked again in a later check-in.',
      },
    ]);
    /* The engine's own working note on the gap goes nowhere. */
    expect(everyString(read).join(' ')).not.toContain('Not the total');
  });

  it('session 1 holds only what was asked by session 1', async () => {
    const read = await theSessionReportAs(withGaps().svc, 'u-rukia', 1);
    expect((read.whatIDontKnowYet ?? []).map((x: any) => x.title)).toEqual(['“What is getting in the way now?”']);
  });

  it.each([['Amani', 'u-amani'], ['Baraka', 'u-baraka']])('%s, who checks in, is served no such list, not even their own gap', async (_who, userId) => {
    const read = await theSessionReportAs(withGaps().svc, userId, 1);
    expect(read.refused).toBeUndefined();
    expect(read.whatIDontKnowYet).toBeUndefined();
    expect(everyString(read).join(' ')).not.toMatch(/has not answered it yet|You could ask/);
  });

  it('with nothing open, Rukia is served an empty list, so the page can say nothing is waiting', async () => {
    const { svc } = serviceFor('sales');
    (svc as any).prisma.checkInGap = { findMany: async () => [] };
    const read = await theSessionReportAs(svc, 'u-rukia', 2);
    expect(read.whatIDontKnowYet).toEqual([]);
  });

  it('a gap with no plain question is named for what it is, and a person with no name on record is "a colleague"', () => {
    const items = whatIDontKnowYet([{ participantId: 'p-x', what: 'an engine note nobody should read', firstRound: 3, asked: 1, certain: true }], 4, () => null);
    expect(items).toEqual([{ title: 'Something the check-in asked', says: 'Groundwork asked a colleague this in session 3, and they have not answered it yet. They’ll be asked again in a later check-in.' }]);
  });
});
