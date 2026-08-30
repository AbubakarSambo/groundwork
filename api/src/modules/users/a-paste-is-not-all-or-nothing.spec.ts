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

describe('the line an admin reads before emailing their company', () => {
  it('leads with what will be sent and ends with what is blocked', () => {
    const rows = planFor('a@x.com, b@x.com, c@x.com, a@x.com, oops', (e) => e === 'b@x.com', 1);
    const said = summarise(rows);
    expect(said).toContain('1 to invite');
    expect(said).toContain('1 already here');
    expect(said).toContain('1 repeated');
    expect(said).toContain('1 not an address');
    /* Last, because it is the one that needs a decision from them. */
    expect(said.endsWith('1 with no seat on your plan')).toBe(true);
  });

  it('says so plainly when there is nothing to do', () => {
    expect(summarise([])).toBe('Nothing to send');
  });
});

describe('the cap on one paste', () => {
  it('exists, because without one a request is an unbounded fan-out of emails', () => {
    expect(MOST_IN_ONE_PASTE).toBeGreaterThan(160);
    expect(MOST_IN_ONE_PASTE).toBeLessThanOrEqual(1000);
  });
});
