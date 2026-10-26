import { theRound15AsADatabase, R15, R15_FRIDAY_EVENING } from '../board/the-round-15-bed';
import { withTheSalesReadings } from './the-sales-readings-for-a-report';
import { theSessionReportAtAGlance } from './a-report-at-a-glance';

/**
 * GRACE'S TEAM REPORT OF FRIDAY 16 OCTOBER, AS POLISH ROUND 15 LEFT IT (the scorer's untrue line U29). It read "No sale moved forward
 * today", "not sure yet, because no sale has a payment or a signed order behind it", and "15 people said it in their own words" in a
 * check-in of six. On record that day: Joseph's M-Pesa code for Juja Hardware came in, Kilele has its M-Pesa message, and Ngong Road
 * Minimart and Savannah Cafe have their codes. The run's own rows, as Grace reads them, with no database and no model.
 */
const graceReads = async (sessionNumber: number) =>
  ((await withTheSalesReadings(theRound15AsADatabase({ asOf: R15_FRIDAY_EVENING }) as any, R15.drop.ground.id, sessionNumber, R15.drop.ground.initiatorId, {})) as any).theTeamsDay;

describe('a payment coming in is a sale moving forward (U29)', () => {
  it('Friday’s report says Juja Hardware moved forward, paid, and is sure about the four sales with their payments', async () => {
    const day = await graceReads(6);
    expect(day.title).toBe('The team’s report, Friday 16 October');
    expect(day.inShort[0]).toBe('One sale moved forward on 16 October, and it has proof.');
    expect(day.moved.map((m: any) => [m.name, m.says, m.proven])).toEqual([['Juja Hardware', 'Now paid.', true]]);
    expect(day.howSure).toBe('How sure Groundwork is about this report: sure about Kilele, which is backed by M-Pesa, Juja Hardware, which M-Pesa code TGH5K2M9QX backs, Ngong Road Minimart, which M-Pesa code SFK2P8LQ4C backs, and Savannah Cafe, which M-Pesa code RBT7Y3KQ2P backs. Not sure about the deals still open, which are each person’s word so far.');
    expect(JSON.stringify(day)).not.toMatch(/No sale moved forward|no sale has a payment or a signed order/);
  });
  it('the session before says the payments of Thursday moved Ngong Road Minimart and Savannah Cafe, each said as paid, never as signed', async () => {
    const day = await graceReads(5);
    const moved = Object.fromEntries(day.moved.map((m: any) => [m.name, m.says]));
    expect(moved['Ngong Road Minimart']).toBe('Now paid. Kevin said, "Ngong Road Minimart paid for the 5 units today! KES 25,000 by M-Pesa."');
    expect(String(moved['Savannah Cafe'])).toMatch(/^Now paid\./);
    expect(JSON.stringify(day.moved)).not.toMatch(/Now signed/);
  });
});

describe('what good looks like is counted in people, not lines (U29)', () => {
  it('three lines from two people are “2 people said it in their own words”', () => {
    const glance = theSessionReportAtAGlance({ againstSuccess: { definitions: [
      { who: 'Kevin Omondi', text: 'My aim is still 30 units for the period.' },
      { who: 'Kevin Omondi', text: 'I want to make sure I am still bringing in new clients.' },
      { who: 'Joseph Kariuki', text: 'Sell 30 units, easily.' },
    ] } });
    expect(glance.goodLooksLike).toBe('2 people said it in their own words');
  });
});
