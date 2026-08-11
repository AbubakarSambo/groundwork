import { detectFunction } from './function-detection';
import { ROLE_MAPS, RoleFunction, MIN_COACHING_CONFIDENCE, priorFunctionFromRole, signalRead } from './role-maps';

/**
 * THE MOST COMMON JUNIOR HIRE, WHOM THE PRODUCT COULD NOT SEE.
 *
 * A live twelve-session ground about a new hire clearing a support queue and
 * shadowing client accounts scored ZERO on all nine functions. Detection was
 * behaving correctly - its signals were deliberately tightened after an entire
 * software team came out as SALES at 0.78 and got read against "named buyers with
 * budget and authority" - so the gap was not a loose regex. There was simply no map
 * for the work.
 *
 * The consequence was silent and total: no role-tuned probes and no coaching, for
 * everybody doing support or customer-facing work.
 *
 * So this asserts against the REAL corpus from that run, not a hand-written one -
 * because the whole failure was that hand-written cases all passed while a genuine
 * record scored nothing.
 */

/** The shape of that record: fifteen entries about queues, tickets and clients. */
const THE_RECORD = [
  'Clear the support queue each week for the first four weeks.',
  'Shadow two client accounts.',
  'No direct client contact before month two.',
  'Week 6 review will assess ticket throughput and whether anything has slipped its date.',
  'By day 90, I will own at least one client relationship end to end.',
  'I worked through about forty tickets this week and the queue is roughly where it was.',
  'One customer complained twice about the same setup problem.',
  'I escalated the billing one because I could not resolve it.',
  'The workaround for the sync issue is in my notes.',
  'A client was waiting three days before I got to them.',
];

describe('the record that scored nothing', () => {
  it('now reads as support, confidently enough to coach from', () => {
    const read = detectFunction(null, THE_RECORD);
    expect(read.fn).toBe(RoleFunction.SUPPORT);
    expect(read.confidence).toBeGreaterThanOrEqual(MIN_COACHING_CONFIDENCE);
  });

  it('and the stated role agrees rather than arguing with it', () => {
    /**
     * FOUND BY PROBING, NOT BY READING. With the support branch placed after the
     * engineer one, "Support engineer, new hire" matched \\bengineer\\b and resolved
     * to ENGINEERING - so on the very record that prompted this map, the title
     * DISAGREED with the account and knocked 0.1 off the confidence. The title was
     * right, the account was right, and the ordering made them argue.
     *
     * The same trap the file already warns about for "project manager" and "product
     * manager": support titles are nearly all compounds another branch claims.
     */
    expect(priorFunctionFromRole('Support engineer, new hire')?.fn).toBe(RoleFunction.SUPPORT);
    expect(priorFunctionFromRole('Customer success manager')?.fn).toBe(RoleFunction.SUPPORT);
    expect(priorFunctionFromRole('Service desk analyst')?.fn).toBe(RoleFunction.SUPPORT);

    const agreeing = detectFunction('Support engineer, new hire', THE_RECORD);
    const silent = detectFunction(null, THE_RECORD);
    expect(agreeing.confidence).toBeGreaterThan(silent.confidence);
  });

  it('and the account still wins when the title is wrong', () => {
    // The designed behaviour, unchanged: somebody titled account executive whose
    // week is all queue work is functionally doing support, held more tentatively
    // because the two disagree.
    const read = detectFunction('Account executive', THE_RECORD);
    expect(read.fn).toBe(RoleFunction.SUPPORT);
    expect(read.basis).toMatch(/does not bear out/);
  });
});

describe('the new signals stay as strict as the ones they sit beside', () => {
  it('does not read a software team as support', () => {
    // THE REGRESSION THAT MADE THESE LISTS STRICT, checked from the other side. If
    // "ticket" or "customer" were bare, engineering work about a ticket tracker
    // would come out support.
    const engineering = [
      'Shipped the migration behind a flag and merged the refactor.',
      'Fixed a regression in staging before the release.',
      'Closed out three of the open questions with Priya on the API.',
      'Wrote the tests for the new endpoint.',
    ];
    expect(detectFunction(null, engineering).fn).toBe(RoleFunction.ENGINEERING);
  });

  it('does not read sales as support because a customer appears', () => {
    const sales = [
      'Got to the budget holder at Anvil and sent the proposal.',
      'The deal is with procurement now.',
      'Two qualified leads from the event, both named.',
    ];
    expect(detectFunction(null, sales).fn).toBe(RoleFunction.SALES);
  });

  it('and does not read an ordinary use of "account" as support', () => {
    // `account` is a bank account, an account of events, and half the sentences in
    // this product. It is not in the support list for exactly that reason.
    const finance = [
      'Reconciled the accounts and closed the month.',
      'The runway is about nine months on current burn.',
      'Sent the board the cash position.',
    ];
    expect(detectFunction(null, finance).fn).not.toBe(RoleFunction.SUPPORT);
  });
});

describe('the map itself, held to the same standard as the other nine', () => {
  const map = ROLE_MAPS[RoleFunction.SUPPORT];

  it('is written to absorption rather than avoidance', () => {
    // Support's failure is the opposite of sales'. Not fear of exposure - too much
    // of the right thing, in the wrong place, leaving no trace.
    expect(map.rootFailure).toMatch(/Absorption without a trace/);
    expect(map.rootSuccess).toMatch(/makes the next one unnecessary/);
  });

  it('protects against being read as low-value, not against being read as failing', () => {
    // The thing that is actually unfair to these people: the reward for solving
    // something cleanly is that nobody hears about it.
    expect(map.protectAgainst).toMatch(/invisible when it goes well/);
    expect(map.protectAgainst).toMatch(/escalations that never happened/);
  });

  it('pairs every failure with what it looks like going right', () => {
    expect(map.failureSignals).toHaveLength(map.successSignals!.length);
    expect(map.failureSignals!.length).toBeGreaterThanOrEqual(8);
  });

  it('and produces a step somebody could actually take this week', () => {
    const read = signalRead(RoleFunction.SUPPORT, 0, 'the same setup problem came back twice');
    expect(read?.lookingLike).toMatch(/Traces the repeat to a cause/);
    expect(read?.reason).toMatch(/came back twice/);
  });
});
