import { whatYourOwnRecordSays } from './what-your-own-record-says';

/*
 * 4.4: "the individual report sucks and says nothing really", against the sentence she read -
 * "this kind of sales and expansion work often faces unfair reading". Her own answer for what it
 * should say is the first test below.
 */
describe('what your own record says', () => {
  it('says the thing she asked for, in figures off her own record', () => {
    const out = whatYourOwnRecordSays({
      theirs: { name: 'bags a month', target: 150 },
      whole: { name: 'units of tea sold in Abuja', target: 10000 },
      peopleWithANumber: 1,
      peopleInIt: 3,
      promises: [{ what: 'I will send the pricing sheet', hasDate: false }],
      anythingDocumented: false,
    });
    expect(out[0]).toContain('150');
    expect(out[0]).toContain('10,000');
    expect(out[0]).toMatch(/has not been divided up/);
    expect(out[1]).toBe('There is no date on send the pricing sheet.');
    expect(out[2]).toMatch(/came from memory/);
  });

  it('never says more than three things', () => {
    const out = whatYourOwnRecordSays({
      theirs: { name: 'x', target: 150 },
      whole: { name: 'y', target: 10000 },
      peopleWithANumber: 1,
      peopleInIt: 3,
      promises: [{ what: 'a', hasDate: false }, { what: 'b', hasDate: false }],
      anythingDocumented: false,
    });
    expect(out.length).toBeLessThanOrEqual(3);
  });

  it('counts the other undated promises rather than listing them', () => {
    const out = whatYourOwnRecordSays({
      promises: [
        { what: 'I will send the pricing sheet', hasDate: false },
        { what: 'I will call the distributor', hasDate: false },
        { what: 'I will write the note', hasDate: false },
      ],
    });
    expect(out[0]).toMatch(/or on 2 other things you said you would do/);
  });

  it('says nothing at all where there is nothing of theirs to say', () => {
    expect(whatYourOwnRecordSays({})).toEqual([]);
    expect(whatYourOwnRecordSays({ anythingDocumented: true, promises: [{ what: 'a', hasDate: true }] })).toEqual([]);
  });

  it('and every sentence it does say carries something only this person has', () => {
    /* The test in her complaint: a line that survives being said to somebody else is not about you. */
    const out = whatYourOwnRecordSays({
      theirs: { name: 'units', target: 3000 },
      standsAt: 900,
      anythingDocumented: true,
    });
    expect(out).toEqual(['You are at 900 of your 3,000.']);
    for (const line of out) expect(line).toMatch(/\d/);
  });
});
