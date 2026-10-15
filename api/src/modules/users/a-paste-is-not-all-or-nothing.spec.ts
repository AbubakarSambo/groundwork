import { addressesIn, planFor, summarise, MOST_IN_ONE_PASTE } from './putting-a-whole-company-on';

/**
 * PASTING A COMPANY IN.
 *
 * The failure this is written against: 160 addresses into a free account, forty land, the rest do
 * not, and the admin has emailed a fraction of their company with no way to tell which fraction.
 */
const nobodyHere = () => false;

describe('what a paste is split into', () => {
  it('takes a spreadsheet column, a mail client and a chat message', () => {
    expect(addressesIn('a@x.com\nb@x.com')).toEqual(['a@x.com', 'b@x.com']);
    expect(addressesIn('a@x.com, b@x.com; c@x.com')).toEqual(['a@x.com', 'b@x.com', 'c@x.com']);
    expect(addressesIn('a@x.com\tb@x.com')).toEqual(['a@x.com', 'b@x.com']);
  });

  it('strips the display name a mail client hands over', () => {
    expect(addressesIn('Ada Lovelace <ada@x.com>')).toEqual(['ada@x.com']);
  });

  it('lowercases, since an address is not case sensitive and a duplicate check is', () => {
    expect(addressesIn('Ada@X.com')).toEqual(['ada@x.com']);
  });
});

describe('every row gets its own answer', () => {
  it('does not fail the batch over one typo', () => {
    const rows = planFor('a@x.com, oops, b@x.com', nobodyHere, null);
    expect(rows.map((r) => r.result)).toEqual(['invited', 'not an email', 'invited']);
  });

  it('counts a repeat once', () => {
    const rows = planFor('a@x.com, a@x.com', nobodyHere, null);
    expect(rows.map((r) => r.result)).toEqual(['invited', 'repeated']);
  });

  it('says somebody is already here rather than calling it an error', () => {
    const rows = planFor('a@x.com', (e) => e === 'a@x.com', null);
    expect(rows[0].result).toBe('already here');
  });
});

describe('seats, which is the whole reason there is a preview', () => {
  it('runs out in the order they were pasted, so the admin can predict who got in', () => {
    const rows = planFor('a@x.com, b@x.com, c@x.com', nobodyHere, 2);
    expect(rows.map((r) => r.result)).toEqual(['invited', 'invited', 'no seat']);
  });

  it('does not spend a seat on somebody who is already here', () => {
    /* They already have one. Counting them again would refuse a colleague for no reason. */
    const rows = planFor('a@x.com, b@x.com', (e) => e === 'a@x.com', 1);
    expect(rows.map((r) => r.result)).toEqual(['already here', 'invited']);
  });

  it('does not spend a seat on a typo', () => {
    const rows = planFor('oops, b@x.com', nobodyHere, 1);
    expect(rows.map((r) => r.result)).toEqual(['not an email', 'invited']);
  });

  it('lets an organisation with no cap through', () => {
    const rows = planFor('a@x.com, b@x.com, c@x.com', nobodyHere, null);
    expect(rows.every((r) => r.result === 'invited')).toBe(true);
  });
});

/*
 * U.4: the line is now full sentences, as every line a person reads must be. It read "1 to invite,
 * 1 already here, 1 repeated, 1 not an address, 1 with no seat on your plan", pieces joined with
 * commas, so these cases check the sentences instead. The order they protect is the same.
 */
describe('the line an admin reads before emailing their company', () => {
  it('leads with what will be sent and ends with what is blocked, in full sentences', () => {
    const rows = planFor('a@x.com, b@x.com, c@x.com, a@x.com, oops', (e) => e === 'b@x.com', 1);
    expect(summarise(rows)).toBe(
      '1 person will be invited. 1 person is already here. 1 address was listed twice, so it is left out. '
      + '1 line is not an email address. 1 person has no seat on your plan, so the invitation will be kept until there is room.',
    );
  });

  it('says the plural right, and changes tense once the invitations have gone', () => {
    const rows = planFor('a@x.com, b@x.com, a@x.com, b@x.com, oops, nope', () => false, null);
    expect(summarise(rows)).toBe('2 people will be invited. 2 addresses were listed twice, so they are left out. 2 lines are not email addresses.');
    expect(summarise(planFor('a@x.com', () => false, null), true)).toBe('1 person was invited.');
    expect(summarise(planFor('a@x.com, b@x.com', () => false, null), true)).toBe('2 people were invited.');
  });

  it('says so plainly when there is nothing to do', () => {
    expect(summarise([])).toBe('There is nobody new to invite.');
  });
});

describe('the cap on one paste', () => {
  it('exists, because without one a request is an unbounded fan-out of emails', () => {
    expect(MOST_IN_ONE_PASTE).toBeGreaterThan(160);
    expect(MOST_IN_ONE_PASTE).toBeLessThanOrEqual(1000);
  });
});
