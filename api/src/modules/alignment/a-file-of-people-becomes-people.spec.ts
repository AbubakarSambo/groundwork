import { peopleFrom, whichColumns, monthsFrom, HEADER_WORDS } from './a-file-of-people-becomes-people';

describe('a file of people becomes people', () => {
  it('reads the export a CRM actually produces', () => {
    const out = peopleFrom([
      ['Sales Rep', 'Region', 'Units Closed', 'Months With Us'],
      ['Musa', 'North', '31', '48'],
      ['Amina', 'North', '14', '11'],
    ]);
    expect(out.people).toHaveLength(2);
    expect(out.people[0]).toMatchObject({ key: 'Musa', lastPeriod: 31, months: 48, monthsKnown: true });
    expect(out.missing).toEqual([]);
  });

  it('finds columns however the header is worded', () => {
    const at = whichColumns(['full_name', 'deals won', 'length of service']);
    expect(at.key).toBe(0);
    expect(at.lastPeriod).toBe(1);
    expect(at.months).toBe(2);
  });

  it('reads tenure however somebody typed it', () => {
    expect(monthsFrom('18')).toBe(18);
    expect(monthsFrom('18 months')).toBe(18);
    expect(monthsFrom('1.5 years')).toBe(18);
    expect(monthsFrom('1 yr 6 mo')).toBe(18);
    expect(monthsFrom(4)).toBe(4);
  });

  it('says a column is missing rather than assuming what it would have held', () => {
    /* Assuming everybody is new, or everybody established, quietly moves every number on the page. */
    const out = peopleFrom([['Name', 'Closed'], ['Musa', '31']]);
    expect(out.missing).toEqual(['how long they have been here']);
    expect(out.people[0].monthsKnown).toBe(false);
  });

  it('counts the rows it could not read rather than dropping them quietly', () => {
    const out = peopleFrom([
      ['Name', 'Closed', 'Months'],
      ['Musa', '31', '48'],
      ['', '', ''],
      ['Nobody', '', '12'],
    ]);
    expect(out.people).toHaveLength(1);
    expect(out.skipped).toBe(1);
  });

  it('reads nothing out of nothing, and says everything is missing', () => {
    expect(peopleFrom([]).people).toEqual([]);
    expect(peopleFrom([]).missing).toHaveLength(3);
  });

  it('keeps the header words where somebody can add their own CRM’s wording', () => {
    expect(HEADER_WORDS.lastPeriod).toContain('closed');
    expect(HEADER_WORDS.months).toContain('tenure');
  });
});
