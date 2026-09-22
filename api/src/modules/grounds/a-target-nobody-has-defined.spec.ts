import { whatIsNotSettledAbout, theLinesUnder } from './a-target-nobody-has-defined';
import { NOT_SETTLED_OPENS } from './a-dump-is-many-things';

/**
 * "SIGNED 12M" ON A BOARD, AND A NOTE A PAGE AWAY SAYING NOBODY KNOWS IF IT IS SIGNED OR RECOGNISED.
 * Both in the product on 22 September 2026, and only one of them anywhere near the number.
 */
describe('a target nobody has defined', () => {
  const lines = [
    'The Q3 target was 12m, but it is not clear if this is for signed deals or collected revenue.',
    'Finance measures collection and sales measures booked.',
    'A Q4 target of 15m was mentioned but not approved.',
  ];

  it('finds the line by the number as a person writes it', () => {
    expect(whatIsNotSettledAbout({ name: 'signed', target: 12_000_000 }, lines)).toContain('signed deals or collected revenue');
  });

  it('and by the measure\'s own words', () => {
    expect(whatIsNotSettledAbout({ name: 'collected revenue', target: null }, lines)).toContain('signed deals or collected revenue');
  });

  it('says nothing about a target nothing disputes', () => {
    expect(whatIsNotSettledAbout({ name: 'new paying customers', target: 6 }, lines)).toBeNull();
    expect(whatIsNotSettledAbout({ name: 'warm referrals', target: 2 }, [])).toBeNull();
  });

  /*
   * READ LIVE: five of seven targets carried a note about something else, because a small number can
   * be found inside any sentence. "expansions = 4" matched the 4 of "Q4"; "warm referrals = 2"
   * matched the 2 inside "12m"; "new paying customers = 6" matched "only 6 are real".
   */
  it('a small number is not a name, and a big one matches only on its own', () => {
    expect(whatIsNotSettledAbout({ name: 'expansions', target: 4 }, lines)).toBeNull();
    expect(whatIsNotSettledAbout({ name: 'warm referrals', target: 2 }, lines)).toBeNull();
    expect(whatIsNotSettledAbout({ name: 'new paying customers', target: 6 }, ['Sarah thinks only 6 are real'])).toBeNull();
    expect(whatIsNotSettledAbout({ name: 'next q qualified pipeline', target: 20_000_000 }, ['nobody approved the 20m pipeline number'])).toContain('20m');
    /* And a number inside another number is not it: 2m is not the 12m. */
    expect(whatIsNotSettledAbout({ name: 'expansion revenue', target: 2_000_000 }, ['the 12m may be booked or collected'])).toBeNull();
  });

  it('reads the lines out of the note the paste writes', () => {
    const note = `${NOT_SETTLED_OPENS}\n- one thing\n- another thing`;
    expect(theLinesUnder(note)).toEqual(['one thing', 'another thing']);
    expect(theLinesUnder(null)).toEqual([]);
  });
});
