import { tidy, isItADirection, whatYouNamed, THE_LISTS, DIRECTION_SCHEMA, DIRECTION_TOOL } from './what-the-room-said';

/**
 * THE DIRECTION A DISCOVERY SESSION IS FOR.
 *
 * Read live on a session with twenty-three accounts in it: "the main barrier to growth is not a
 * lack of demand, but a lack of specific, actionable market data." True, and not a direction. The
 * lead asked which regions, which markets, which value chains, which actors, which gaps.
 */
const room = ['Participant A', 'Participant B', 'Participant C'];
const raw = {
  regions: [
    { name: 'Jigawa', namedBy: ['Participant A', 'Participant B'], asSaid: 'where the paddy actually is' },
    { name: 'Kebbi', namedBy: ['Participant A'] },
  ],
  markets: [], valueChains: [{ name: 'Rice', namedBy: ['Participant A', 'Participant C'] }],
  actors: [], networks: [], pilots: [],
  dataGaps: [
    { name: 'Weekly paddy price outside Kano', namedBy: ['Participant A', 'Participant B', 'Participant C'] },
    /* A label nobody in this room has. It is not a smaller count; it is a fabrication. */
    { name: 'Something nobody said', namedBy: ['Participant Z'] },
  ],
};

describe('what the room said', () => {
  const d = tidy(raw, room, 3);

  it('keeps the room own words and counts from the labels rather than trusting a number', () => {
    expect(d.regions[0]).toMatchObject({ name: 'Jigawa', asSaid: 'where the paddy actually is' });
    expect(d.regions[0].namedBy).toHaveLength(2);
    expect(d.outOf).toBe(3);
  });

  it('ranks by how many named it', () => {
    expect(d.dataGaps[0].name).toBe('Weekly paddy price outside Kano');
    expect(d.regions.map(r => r.name)).toEqual(['Jigawa', 'Kebbi']);
  });

  /* A label the room does not contain is a label nobody said. */
  it('drops anything attributed to somebody who is not in the room', () => {
    expect(d.dataGaps.map(g => g.name)).not.toContain('Something nobody said');
  });

  it('leaves a list empty rather than filling it, because an empty list is a finding', () => {
    expect(d.pilots).toEqual([]);
    /* And what their own next twelve months takes, which is where the dates belong. */
    expect(THE_LISTS).toEqual(['regions', 'markets', 'valueChains', 'actors', 'dataGaps', 'networks', 'pilots', 'nextTwelveMonths']);
    expect(Object.keys(DIRECTION_SCHEMA.properties)).toEqual(THE_LISTS);
    /* A tool, not a bare schema: the first version passed the schema alone, which type-checks at
       the boundary and fails at the call, so a session of twenty-three accounts returned nothing. */
    expect(DIRECTION_TOOL.input_schema).toBe(DIRECTION_SCHEMA);
    expect(DIRECTION_TOOL.name).toBeTruthy();
  });

  it('says whether this is a direction or a room that agreed on nothing', () => {
    expect(isItADirection(d).enough).toBe(true);
    expect(isItADirection(d).saying).toContain('out of 3 accounts');
    const nobodyAgrees = tidy({ regions: [{ name: 'Kano', namedBy: ['Participant A'] }] }, room, 3);
    expect(isItADirection(nobodyAgrees).enough).toBe(false);
    expect(isItADirection(nobodyAgrees).saying).toContain('no shared priority');
    expect(isItADirection(tidy({}, room, 3)).enough).toBe(false);
  });

  /**
   * AND THE READ THE PERSON WHO ANSWERED GETS BACK. They gave their market knowledge and were handed
   * a paragraph about everybody. This says what they named and how many others named it, and names
   * nobody - which is all this session can honestly offer them.
   */
  it('gives the person who answered their own read, naming nobody', () => {
    const mine = whatYouNamed(d, 'Participant B');
    expect(mine.yours.map(y => y.name)).toEqual(['Weekly paddy price outside Kano', 'Jigawa']);
    expect(mine.yours[0].alsoNamedBy).toBe(2);
    expect(mine.line).toContain('2 of the 2 things you named');
    expect(JSON.stringify(mine)).not.toContain('Participant');
  });

  it('and tells somebody plainly when nothing they named was shared', () => {
    const alone = tidy({ regions: [{ name: 'Sokoto', namedBy: ['Participant C'] }] }, room, 3);
    expect(whatYouNamed(alone, 'Participant C').line).toContain('nobody else has named any of them');
    expect(whatYouNamed(alone, 'Participant A').yours).toEqual([]);
  });
});

/**
 * AND THE LABEL THE MODEL ACTUALLY WRITES BACK. Asked for "Participant P" it answers "P", and the
 * first version of this read that as an invention and dropped it - so a session with twenty-three
 * accounts produced seven empty lists and told the lead nothing could be read as a direction.
 */
describe('a label written short', () => {
  it('is the same person', () => {
    const d = tidy({ regions: [{ name: 'Jigawa', namedBy: ['B', 'participant c'] }] }, ['Participant B', 'Participant C'], 2);
    expect(d.regions[0].namedBy).toEqual(['Participant B', 'Participant C']);
  });

  it('and something that is nobody still matches nobody', () => {
    const d = tidy({ regions: [{ name: 'Nowhere', namedBy: ['ZZ'] }] }, ['Participant B'], 1);
    expect(d.regions).toEqual([]);
  });

  it('and their own read finds them whichever way it was written', () => {
    const d = tidy({ dataGaps: [{ name: 'Paddy price', namedBy: ['B', 'C'] }] }, ['Participant B', 'Participant C'], 2);
    expect(whatYouNamed(d, 'Participant B').yours[0].alsoNamedBy).toBe(1);
  });
});
