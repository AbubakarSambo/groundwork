import { withTheSalesReadings } from './the-sales-readings-for-a-report';
import { theOpenQuestionsThenTheDeals } from './the-sales-team-report-from-the-record';
import { theShortRunsDatabase, G, R, uidOf, pidOf } from './the-short-run-reports-bed';

/**
 * HAFSAH'S QUALITY PASS OF 18 OCTOBER, SECTION 4: THE TEAM'S REPORT FOR WEDNESDAY 14 OCTOBER, AS EACH PERSON IS SERVED IT.
 *
 * Built on the short run's record exactly as it stood (gw_sweep_drop3, `__fixtures__/drop-access-short-run.json`), opened on Sunday
 * 18 October at 8:09pm. Grace Achieng runs it; Kevin Omondi, Mercy Wairimu and Joseph Kariuki check in. The report as the service
 * built it before the sales readings is cut to what these parts read: who was counted, each person's row, and the old count of
 * quiet waits. Each test reads the sentences a person is served and checks them against the record and the findings.
 */
const NOW = new Date('2026-10-18T17:09:00Z');
const AS_BUILT = () => ({
  sessionNumber: 3,
  counting: [{ who: 'Mercy Wairimu', answered: true }, { who: 'Joseph Kariuki', answered: true }, { who: 'Kevin Omondi', answered: true }],
  confidence: { band: 'solid', saying: 'There is enough here to act on.', reasons: ['3 of 26 lines are backed by a document. The rest is from memory.', '1 of the 5 commitments has no owner or no date. Naming one of each would make it checkable.'] },
  whatWentQuiet: '2 things people were waiting on have not been raised since. They may be resolved; nobody has said so.',
  whatEachPersonSaid: ['Mercy Wairimu', 'Joseph Kariuki', 'Kevin Omondi'].map((who) => ({ who, isYou: false, lines: R.lines.filter((l: any) => l.participantId === pidOf(who.split(' ')[0]) && l.createdAt.startsWith('2026-10-14')).map((l: any) => l.text) })),
});
const served = async (first: string) => withTheSalesReadings(theShortRunsDatabase(), G, 3, uidOf(first), AS_BUILT()) as Promise<any>;

describe('the team’s report for Wednesday 14 October, as Grace is served it', () => {
  let grace: any;
  beforeAll(async () => {
    jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate'] });
    grace = await served('Grace');
  });
  afterAll(() => jest.useRealTimers());

  it('T-1, T-2: medium, because 3 of the 26 things said have a document, and the one promise with no date is named', () => {
    expect(grace.confidence.band).toBe('partial');
    expect(grace.confidence.saying).toBe('All 3 people checked in, and 3 of the 26 things said have a document behind them.');
    expect(grace.confidence.reasons).toEqual(['Joseph’s “I\'ll ask Grace first about the price, then I\'ll call Mr Kariuki back” has no date.']);
  });

  it('T-3: In short counts what moved, then says the news and what waits on a person', () => {
    expect(grace.theTeamsDay.inShort).toEqual([
      'Four sales moved forward on 14 October, but none of them has proof yet.',
      'Savannah Cafe said yes to 6 units, and Jane pays a KES 15,000 deposit on Friday 16 October.',
      'Mercy quoted Mama Mboga Mart KES 10,000.',
      'Joseph has still not brought the samples for Tuskys Westgate, promised three check-ins running.',
      'Joseph is waiting on your answer on 5 units at KES 4,500 each for Juja Hardware.',
    ]);
  });

  it('T-4, T-5: What moved has Savannah Cafe’s yes and Ngong Road Minimart’s quote, each said in the third person from the deal', () => {
    const says = Object.fromEntries(grace.theTeamsDay.moved.map((m: any) => [m.name, m.says]));
    expect(says).toEqual({
      'Ngong Road Minimart': 'Now quoted. Kevin quoted Ali KES 20,000 for 4 units. Ali decides next week.',
      'Mama Mboga Mart': 'Now quoted. Mercy quoted Rose KES 10,000 for 2 units.',
      'Juja Hardware': 'It is now at Need established. Mr Kariuki wants 5 units if they are KES 4,500 each.',
      'Savannah Cafe': 'Jane said yes to 6 units at KES 30,000. Jane pays a KES 15,000 deposit on Friday 16 October.',
    });
    expect(JSON.stringify(grace.theTeamsDay.moved)).not.toMatch(/said, "/);
  });

  it('T-6, T-7: each person’s day in the third person, marked as someone’s word, with what they will do', () => {
    const rows = Object.fromEntries(grace.whatEachPersonSaid.map((p: any) => [p.who, [p.inShort, p.mark, p.willDo]]));
    expect(rows['Mercy Wairimu']).toEqual(['Quoted Rose at Mama Mboga Mart KES 10,000 for 2 units. Greenfield Supermarket pays the KES 125,000 on delivery on Friday 16 October.', 'said', 'Call Joseph again on Thursday morning.']);
    expect(rows['Joseph Kariuki']).toEqual(['Mr Kariuki at Juja Hardware wants 5 units if they are KES 4,500 each. The samples for Tuskys Westgate, promised three check-ins running, still not done.', 'said', 'Get your answer on the price first, then call Mr Kariuki at Juja Hardware back.']);
    expect(rows['Kevin Omondi']).toEqual(['Savannah Cafe said yes to 6 units. Quoted Ali at Ngong Road Minimart KES 20,000 for 4 units.', 'said', 'Follow up with Ali at Ngong Road Minimart on Monday.']);
    /* Their own words stay behind "Open a person". */
    expect(grace.whatEachPersonSaid[0].lines).toContain('Rose, the owner, decides. I spoke to her directly.');
  });

  it('T-8: where people see it differently, in full sentences', () => {
    expect(grace.theTeamsDay.whereTheySeeItDifferently).toEqual([
      'You expect Kevin, Mercy and Joseph to sell 40 units each.',
      'Kevin said on 13 October that Kevin’s own aim is all 120 units, not 40. Kevin has not told you.',
    ]);
  });

  it('T-9: the waits that went quiet are named', () => {
    expect(grace.whatWentQuiet).toBe('Kevin is waiting on Ali at Ngong Road Minimart and on Jane’s deposit at Savannah Cafe. Neither came up after 14 October.');
  });

  it('T-10, T-11: what is not known yet lists no question that was answered, says “you”, and lists each once', () => {
    const gaps = R.gaps.filter((g: any) => !g.answeredAt);
    const turns = R.turns.map((t: any) => ({ ...t, checkIn: { participantId: R.checkIns.find((c: any) => c.id === t.checkInId)?.participantId } }));
    const nameOf = (pid: string) => R.participants.find((p: any) => p.id === pid)?.user.firstName ?? null;
    const listed = theOpenQuestionsThenTheDeals(gaps, turns, pidOf('Grace'), nameOf, grace.whatIsNotKnownYetFromTheDeals, 3);
    expect(listed).toEqual([
      { title: 'Whether Joseph brought the samples for Tuskys Westgate on Thursday 15 October', says: 'Nobody has said since. Next: Mercy will be asked.' },
      { title: 'When Wanjiru, Ali, Rose and Mr Kariuki will buy', says: 'No buying date is on record for any of them. Next: Joseph, Kevin and Mercy will be asked.' },
      { title: 'What Upper Hill Offices needs', says: 'Kevin has not reached Paul since 12 October. Next: Kevin will be asked.' },
    ]);
    expect(JSON.stringify(listed)).not.toMatch(/How are you making your number|asked Grace/);
  });

  it('T-12: the kit’s closing line, from the payment record and the signed order', () => {
    expect(grace.theTeamsDay.howSure).toBe('Groundwork is sure about Kilele Hotel, which is backed by M-Pesa, and Greenfield Supermarket, which has a signed order. It is not sure about the deals still open, which are each person’s word so far.');
  });
});

describe('the same report, as a person who checks in is served it', () => {
  beforeAll(() => jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate'] }));
  afterAll(() => jest.useRealTimers());
  it('Mercy is served none of the lead’s readings: no team day, no other person’s summary or “Will do”, no unknowns', async () => {
    const mercy = await served('Mercy');
    expect(mercy.theTeamsDay).toBeUndefined();
    expect(mercy.whatIsNotKnownYetFromTheDeals).toBeUndefined();
    for (const row of mercy.whatEachPersonSaid) {
      expect(row.inShort).toBeUndefined();
      expect(row.willDo).toBeUndefined();
    }
    expect(mercy.confidence).toEqual(AS_BUILT().confidence);
  });

  it('with Release 1’s switch off, Grace is served the report as it was built', async () => {
    const off = await withTheSalesReadings(theShortRunsDatabase({ switchOn: false }), G, 3, uidOf('Grace'), AS_BUILT());
    expect(off).toEqual(AS_BUILT());
  });
});

/*
 * SECTION 5: MERCY'S OWN REPORT FOR 14 OCTOBER (O-1 to O-7), from her own deals and lines only, served to her alone.
 */
describe('Mercy’s own report for Wednesday 14 October, as she is served it', () => {
  let mercy: any;
  beforeAll(async () => {
    jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate'] });
    mercy = await served('Mercy');
  });
  afterAll(() => jest.useRealTimers());

  it('O-1: what she did well is the signed order she added, in her own name, never her words with "yesterday"', () => {
    expect(mercy.yourOwnReport.didWell).toEqual([{ text: 'You got Greenfield Supermarket’s signed order for 25 units, KES 125,000, on 13 October, and you added it. It counts as proof.', how: null, mark: 'proven' }]);
  });

  it('O-2 to O-5: what she told us, each once: the quote with who decides, Greenfield’s promise as Greenfield’s, her own promise as hers, and no expectation about Joseph', () => {
    expect(mercy.yourOwnReport.toldUs).toEqual([
      { text: 'You quoted Rose at Mama Mboga Mart KES 10,000 for 2 units, and Rose decides.', how: 'You said this. A copy of the quote would prove it.', mark: 'said' },
      { text: 'Greenfield Supermarket takes delivery on Friday 16 October and pays then.', how: 'You said this. A message from Mrs Njeri would prove it.', mark: 'said' },
      { text: 'You’ll call Joseph again on Thursday morning.', how: null, mark: 'said' },
    ]);
    expect(JSON.stringify(mercy.yourOwnReport)).not.toMatch(/I will ask you|I expect|\bI\b/);
  });

  it('O-6: the kit’s story', () => {
    expect(mercy.yourOwnReport.story).toBe('Greenfield Supermarket is your first sale, 25 of your 40 units. Tuskys Westgate is still waiting on Joseph’s samples.');
  });

  it('O-7: one thing to think about is the deal that waits on Joseph, not a payment that is due on delivery', () => {
    expect(mercy.forYouToThinkAbout).toBe('Tuskys Westgate has waited on Joseph’s samples since 12 October. What could you show Peter before the samples come?');
  });

  it('Kevin’s and Joseph’s own reports carry only their own deals, and no colleague’s', async () => {
    const kevin = await served('Kevin');
    const joseph = await served('Joseph');
    expect(JSON.stringify(kevin.yourOwnReport)).not.toMatch(/Greenfield|Tuskys|Juja|Mama Pima/);
    expect(JSON.stringify(joseph.yourOwnReport)).not.toMatch(/Greenfield|Kilele|Savannah|Ngong/);
    expect(kevin.forYouToThinkAbout).toBe('Ngong Road Minimart has had your quote since 14 October, but they have not said yes yet. What would help you get an answer this week?');
    expect(joseph.forYouToThinkAbout).toBe('Mama Pima Stores wants 10 units, but you do not know yet how much they can spend or when they will buy. What would help you find out this week?');
  });

  it('Grace, who runs it, is served nobody’s own report', async () => {
    expect((await served('Grace')).yourOwnReport).toBeUndefined();
  });
});
