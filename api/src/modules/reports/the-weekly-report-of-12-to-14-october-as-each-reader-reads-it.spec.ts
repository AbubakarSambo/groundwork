import { TheWeeklyReportService } from './the-weekly-report.service';
import { theShortRunsDatabase, G, uidOf } from './the-short-run-reports-bed';

/**
 * HAFSAH'S QUALITY PASS OF 18 OCTOBER, SECTION 6: THE WEEKLY REPORT FOR 12 TO 14 OCTOBER, AS EACH PERSON IS SERVED IT.
 *
 * Built on the short run's record exactly as it stood (gw_sweep_drop3, `__fixtures__/drop-access-short-run.json`) by the same build a
 * check-in triggers, on Thursday 15 October at 11am Nairobi time, and opened on Sunday 18 October at 8:09pm. No stall rule is set
 * (standing decision 4 as changed). Grace runs it; Mercy reads only what is about her own deals.
 */
const WRITTEN = new Date('2026-10-15T08:00:00Z');
const OPENED = new Date('2026-10-18T17:09:00Z');
const as = (first: string) => ({ userId: uidOf(first), role: 'MEMBER', organizationId: 'org' });

describe('the weekly report for 12 to 14 October', () => {
  let grace: any; let mercy: any; let joseph: any;
  beforeAll(async () => {
    jest.useFakeTimers({ now: WRITTEN, doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    const svc = new TheWeeklyReportService(theShortRunsDatabase() as any);
    await svc.build(G, WRITTEN);
    jest.setSystemTime(OPENED);
    grace = await svc.read(G, as('Grace'), OPENED);
    mercy = await svc.read(G, as('Mercy'), OPENED);
    joseph = await svc.read(G, as('Joseph'), OPENED);
  });
  afterAll(() => jest.useRealTimers());

  it('W-1: the week runs to the last check-in, and says when it was written', () => {
    expect(grace.heading).toBe('This week, 12 to 14 Oct, so far. Written Thursday 15 October.');
  });

  it('W-2: a first mention is not a move, sales backed by a document are counted, and no stall rule is applied that Grace never set', () => {
    expect(grace.inNumbers.map((f: any) => `${f.figure} ${f.of}`)).toEqual([
      '100% of check-ins made this week',
      '4 deals moved stage',
      '2 sales backed by a document',
      '2 sales closed, 1 with proof of payment',
      '0 deals hit a stall rule',
    ]);
    expect(grace.inNumbers[4].says).toBe('No stall rule is set yet, so no deal is marked for going quiet.');
  });

  it('W-3, W-8: what this week shows says what each person sold and one line about the work, then the amber strip', () => {
    expect(grace.whatThisWeekShows).toEqual([
      'Sales moved forward this week, but much more for some people than for others.',
      'Mercy Wairimu has 25 units on a signed order from Greenfield Supermarket. Tuskys Westgate waits on Joseph Kariuki\'s samples. Mama Mboga Mart has a quote and nothing booked. Joseph has sold none of the 40 units yet. Wanjiru\'s discount has had no answer since 12 October. No buying date is on record for any of Joseph\'s open deals. Kevin Omondi sold 40 units, paid, to Kilele Hotel. Kevin quoted Savannah Cafe and Ngong Road Minimart before asking the budget.',
    ]);
    expect(grace.acrossTheTeam).toEqual(['Joseph Kariuki’s two deals and Mercy Wairimu’s Tuskys Westgate all wait on one person each.']);
  });

  it('W-4: the promise carried over three check-ins running is there, in the board’s words', () => {
    expect(grace.threeInARow).toEqual([{ who: 'Joseph Kariuki', isYou: false, says: 'The samples for Tuskys Westgate, promised three check-ins running, still not done.' }]);
  });

  it('W-5: the prices that are only someone’s word, named', () => {
    expect(grace.saidAndProof).toBe('Four prices this week are only someone’s word: Savannah Cafe’s KES 15,000 deposit, the KES 30,000 and KES 20,000 quotes from Kevin Omondi, and Mama Mboga Mart’s KES 10,000. Ask for a copy of each quote.');
  });

  it('W-6: What changed has no first mention as a move, and the kit’s Adapted row', () => {
    expect(grace.whatChanged.moved).not.toContain('Mama Pima Stores moved forward, from Contacted to Need established.');
    expect(grace.whatChanged.adapted).toEqual(['Kevin Omondi will ask about their budget during the initial conversations with new leads (14 October).']);
  });

  it('W-7: for you to do next week, in the order to do it, with no goal nobody said', () => {
    expect(grace.forNextWeekIsRanked).toBe(true);
    expect(grace.forNextWeek.map((t: any) => [t.do, t.why])).toEqual([
      ['Answer Joseph Kariuki on 5 units at KES 4,500 for Juja Hardware', 'Mr Kariuki is waiting for Joseph Kariuki to call back.'],
      ['Decide whether Mama Pima Stores can have 10 units for KES 38,000, which is KES 12,000 off', 'Wanjiru asked Joseph Kariuki on 12 October and has had no answer. You said on 12 October that you would decide that day.'],
      ['Decide what to do about the samples for Tuskys Westgate', 'Joseph Kariuki promised it three check-ins running, and Mercy Wairimu is still waiting.'],
      /* Changed 19 October (messages test, finding 5): the reason says what came and when, never "before there was a payment" beside a record that holds one. */
      ['Tell the team a sale counts only with a payment or a signed order', 'Mercy Wairimu counted Greenfield Supermarket as sold on 12 October, and the first document about it came on 13 October.'],
      ['Decide whether Kevin Omondi drops Upper Hill Offices', 'Paul has not answered three calls from Kevin Omondi, on 13 and 14 October. No stall rule is set yet.'],
    ]);
    expect(JSON.stringify(grace)).not.toMatch(/order confirmation process|deal activation|Participant [A-Z]/);
  });

  it('Mercy reads only what is about her own deals, and Joseph reads his own promise carried over', () => {
    expect(mercy.whatThisWeekShows).toEqual(['You have 25 units on a signed order from Greenfield Supermarket. Tuskys Westgate waits on Joseph Kariuki\'s samples. Mama Mboga Mart has a quote and nothing booked.']);
    expect(mercy.saidAndProof).toBe('One price this week is only your word: Mama Mboga Mart’s KES 10,000. Ask for a copy of the quote.');
    expect(mercy.acrossTheTeam).toEqual([]);
    expect(mercy.threeInARow).toEqual([]);
    expect(mercy.forNextWeek).toEqual([]);
    expect(JSON.stringify(mercy)).not.toMatch(/Kilele|Savannah|Juja|Mama Pima|Upper Hill/);
    expect(joseph.threeInARow).toEqual([{ who: 'You', isYou: true, says: 'The samples for Tuskys Westgate, promised three check-ins running, still not done.' }]);
    expect(JSON.stringify(joseph.whatThisWeekShows)).not.toMatch(/Greenfield|Kilele/);
  });
});
