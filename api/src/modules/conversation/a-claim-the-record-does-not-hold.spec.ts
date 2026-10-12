import { aClaimTheRecordDoesNotHold, withoutAClaimTheRecordDoesNotHold, everyClaimTheRecordHolds, theKindsOfClaimIn } from './a-claim-the-record-does-not-hold';
import { WHAT_IS_ASKED_WHEN_NOTHING_IS_LEFT } from './a-record-claim-nobody-holds';

/**
 * The exact sentences read in the final evaluation (docs/final-evaluation/test1-0*.md), each against what the record held at the time.
 * Decision 138, part 1; decision 139, must-fix 3.
 */
const NOTHING_SENT = { remindersSent: false };
const NOBODY_TOOK_IT_HIGHER = { somebodySaidTheyTookItHigher: false };

/* Profile 5: the lead's setup, as Wairimu wrote it, and Juma's own words. Nobody set ten shops. */
const KEVINS_PILOT = [
  'We are piloting ordering by WhatsApp with 40 of our shops in Eastlands and Westlands, live by Friday 20 November. Kevin Odhiambo runs the pilot day to day and owns: the catalogue of 120 products loaded by Friday 16 October; the list of 40 pilot shops (20 Eastlands, 20 Westlands); and 10 test orders from 5 shops by Friday 30 October.',
  'I did 24 shops this week on my route.',
];
/* Profile 4: Samuel's 30-day plan, which Baraka did set. */
const SAMUELS_PLAN = ['shadow Sade on 10 calls in the first week, then take calls on his own, 10 a day by the end of week two and 15 a day by the end of week four'];

describe('a claim the record does not hold', () => {
  it('Wairimu is not told reminders went to Brian when none did', () => {
    const r = withoutAClaimTheRecordDoesNotHold('Brian did not check in. I have already sent reminders to Brian this week. Ask him what got in the way.', NOTHING_SENT);
    expect(r.text).toBe('Brian did not check in. Ask him what got in the way.');
    expect(r.cut).toEqual([{ sentence: 'I have already sent reminders to Brian this week.', claim: 'a reminder sent' }]);
  });

  it('where a reminder really went, the sentence stays', () => {
    const t = 'I have already sent reminders to Brian this week.';
    expect(withoutAClaimTheRecordDoesNotHold(t, { remindersSent: true }).text).toBe(t);
  });

  it('Felix is not asked about four items he escalated, when he escalated nothing, and is still asked something', () => {
    const r = withoutAClaimTheRecordDoesNotHold('What happened to the four items you escalated 15 days ago?', NOBODY_TOOK_IT_HIGHER);
    expect(r.text).toBe(WHAT_IS_ASKED_WHEN_NOTHING_IS_LEFT);
    expect(r.cut[0].claim).toBe('an escalation');
  });

  it.each([
    'Kevin Odhiambo has been waiting for the list of shops since 11 October, and has raised it higher.',
    'All 3 were taken above the person they were with.',
    "The 'ask for Westlands shops' was escalated.",
    'You have already taken an explanation of the difference between refunds and credits to somebody above them.',
    'Felix Ndungu is waiting on various teams for replies on the four items escalated 15 days ago.',
  ])('cuts, when nobody said they took it higher: %s', (s) => {
    expect(aClaimTheRecordDoesNotHold(s, NOBODY_TOOK_IT_HIGHER)).toBe('an escalation');
    /* Where somebody did say so, it is their word and it stays. */
    expect(aClaimTheRecordDoesNotHold(s, { somebodySaidTheyTookItHigher: true })).toBeNull();
  });

  it.each([
    'Have you escalated it?',
    'Did you take it above finance?',
    'Take it above finance.',
    'If it is still open, ask Fatuma what she needs in order to finish it.',
    'It was still open after 14 days, so Groundwork raised it on 25 October.',
  ])('keeps a question, advice, or what Groundwork itself did: %s', (s) => {
    expect(aClaimTheRecordDoesNotHold(s, { ...NOBODY_TOOK_IT_HIGHER, ...NOTHING_SENT })).toBeNull();
  });

  it('Wairimu\'s report does not hold a 10-shop objective nobody set', () => {
    const r = withoutAClaimTheRecordDoesNotHold(
      'Juma Otieno plans 24 shops this week. If the plan for 24 shops holds, the work could meet the 10-shop objective and still have committed resources to 14 shops that were not required. The objective for the pilot is 10 shops.',
      { targetsMayComeFrom: KEVINS_PILOT },
    );
    expect(r.text).toBe('Juma Otieno plans 24 shops this week.');
    expect(r.cut.map((c) => c.claim)).toEqual(['a target', 'a target']);
  });

  it('a target the lead did set stays: 40 pilot shops, and Samuel\'s 10 calls a day', () => {
    expect(aClaimTheRecordDoesNotHold('The target is 40 shops on the pilot.', { targetsMayComeFrom: KEVINS_PILOT })).toBeNull();
    expect(aClaimTheRecordDoesNotHold("Baraka Mutua's target is 10 calls a day.", { targetsMayComeFrom: SAMUELS_PLAN })).toBeNull();
    expect(aClaimTheRecordDoesNotHold("Baraka Mutua's target is 12 calls a day.", { targetsMayComeFrom: SAMUELS_PLAN })).toBe('a target');
  });

  it('a year is not a target number', () => {
    expect(aClaimTheRecordDoesNotHold('The 2026 sales target is on the board.', { targetsMayComeFrom: [] })).toBeNull();
  });

  it('Victor\'s promise is not counted as a new account, and the sentence that leans on it goes too', () => {
    const live = 'Donholm Distributors placing a 100-bag order this week counts as a new account and meets the minimum order size. That\'s one of the six new wholesale accounts. What is stopping any other potential new accounts from placing their first orders?';
    const r = withoutAClaimTheRecordDoesNotHold(live, {});
    expect(r.text).toBe('What is stopping any other potential new accounts from placing their first orders?');
    expect(r.cut.map((c) => c.claim)).toEqual(['a promise counted as done', 'a promise counted as done']);
  });

  it('an order that was placed still counts', () => {
    const t = 'Eastleigh Cash and Carry placed its first order on Thursday, and that counts as a new account.';
    expect(aClaimTheRecordDoesNotHold(t, {})).toBeNull();
  });

  it('evidence a caller did not give is not checked, so nothing is cut on a guess', () => {
    const t = 'I have already sent reminders to Brian this week. The objective for the pilot is 10 shops.';
    expect(withoutAClaimTheRecordDoesNotHold(t, {}).cut).toEqual([]);
    expect([...theKindsOfClaimIn(t)].sort()).toEqual(['a reminder sent', 'a target']);
  });

  it('over a stored report: an item left empty leaves its list, a field on its own is kept empty, ids are never read', () => {
    const report = {
      sharedPicture: 'The objective for the pilot is 10 shops.',
      findings: [{ id: 'f-10-shop-objective', text: 'The 10-shop objective is at risk.' }, { id: 'f2', text: 'Kevin has loaded 64 products.' }],
    };
    const r = everyClaimTheRecordHolds(report, { targetsMayComeFrom: KEVINS_PILOT });
    expect(r.value).toEqual({ sharedPicture: '', findings: [{ id: 'f2', text: 'Kevin has loaded 64 products.' }] });
    expect(r.cut).toHaveLength(2);
  });
});

describe('a status or a count stated as fact stands only on proof or a confirmation (night quality run 2, Collins)', () => {
  const NOTHING_BACKED = { shownOrConfirmed: [] as string[] };
  it('cuts "weekly sales confirmed by M-Pesa messages" and "Nine or ten kits last week is strong." when nothing backs them', () => {
    const report = 'Collins sells kits to households and shops, with weekly sales confirmed by M-Pesa messages. He has not sent the codes.';
    const r = withoutAClaimTheRecordDoesNotHold(report, NOTHING_BACKED, { whenNothingIsLeft: null });
    expect(r.text).toBe('He has not sent the codes.');
    expect(r.cut.map((c) => c.claim)).toEqual(['a status the record does not hold']);
    const turn = withoutAClaimTheRecordDoesNotHold('Nine or ten kits last week is strong. How many of those can you show a code for?', NOTHING_BACKED);
    expect(turn.text).toBe('How many of those can you show a code for?');
    expect(theKindsOfClaimIn('Nine or ten kits last week is strong.').has('a status the record does not hold')).toBe(true);
  });
  it('keeps a true line, one the record backs, a question, and people\'s own words in quotation marks', () => {
    const backed = { shownOrConfirmed: ['Sold nine kits, M-Pesa messages attached.'] };
    expect(aClaimTheRecordDoesNotHold('His sales are confirmed by M-Pesa messages.', backed)).toBeNull();
    expect(aClaimTheRecordDoesNotHold('Nine kits last week is strong.', backed)).toBeNull();
    expect(aClaimTheRecordDoesNotHold('Collins said he sold nine or ten kits last week, and has not sent the codes yet.', NOTHING_BACKED)).toBeNull();
    expect(aClaimTheRecordDoesNotHold('Can these be confirmed by M-Pesa messages?', NOTHING_BACKED)).toBeNull();
    expect(aClaimTheRecordDoesNotHold('He said, "the sales are confirmed by M-Pesa messages".', NOTHING_BACKED)).toBeNull();
  });
  it('is not checked when the record could not be read', () => {
    expect(aClaimTheRecordDoesNotHold('Nine or ten kits last week is strong.', {})).toBeNull();
  });
});

describe('a plain status or count the record does not hold (night quality run 2)', () => {
  const NOTHING_BACKED = { shownOrConfirmed: [] as string[] };
  it.each([
    'All 3 check-ins due this week were made.',
    'Collins Odhiambo won eleven deals this week.',
    'Your promise to send the M-Pesa codes was kept.',
    '4 of 6 orders were delivered.',
  ])('"%s" is taken out when nothing in the record backs it', (line) => {
    const r = withoutAClaimTheRecordDoesNotHold(`${line} Ask how the week went.`, NOTHING_BACKED);
    expect(r.text).toBe('Ask how the week went.');
    expect(r.cut[0].claim).toBe('a status the record does not hold');
  });

  it('a count a backed line holds stays', () => {
    const line = 'Collins Odhiambo won two deals this week.';
    expect(withoutAClaimTheRecordDoesNotHold(line, { shownOrConfirmed: ['Sold two kits to Oyugis shop, deals paid by M-Pesa QX12'] }).text).toBe(line);
  });

  it("a person's own words in quotation marks, and a question, stay", () => {
    const quoted = 'You said "I kept my promise and won the Oyugis deal."';
    expect(withoutAClaimTheRecordDoesNotHold(quoted, NOTHING_BACKED).text).toBe(quoted);
    const asked = 'Was your promise to send the codes kept?';
    expect(withoutAClaimTheRecordDoesNotHold(asked, NOTHING_BACKED).text).toBe(asked);
  });
});
