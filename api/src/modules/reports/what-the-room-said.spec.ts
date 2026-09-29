import { readFileSync } from 'fs';
import { join } from 'path';
import { tidy, isItADirection, whatYouNamed, THE_LISTS, DIRECTION_SCHEMA, DIRECTION_TOOL, mergeDirections, inChunks, ACCOUNTS_PER_READ, whereTheRoomSplit } from './what-the-room-said';

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
    expect(isItADirection(d).saying).toContain('out of 3 people who answered');
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

/**
 * TWENTY-FOUR ACCOUNTS ARE ONE DIRECTION, READ IN CHUNKS. One call over the whole room timed out or
 * came back as prose at exactly the size the session exists for (adversarial run, 20 Sep 2026).
 */
describe('a direction read in chunks', () => {
  const one = (name: string, by: string[]) => ({ name, namedBy: by, asSaid: null });
  const empty = { regions: [], markets: [], valueChains: [], actors: [], dataGaps: [], networks: [], pilots: [], nextTwelveMonths: [], outOf: 6 };
  it('merges the same thing named in different chunks into one item with everybody who named it', () => {
    const a = { ...empty, regions: [one('Jigawa', ['A', 'B']), one('Kano', ['A'])] };
    const b = { ...empty, regions: [one('jigawa', ['E']), one('Benue', ['F'])] };
    const m = mergeDirections([a, b], 12);
    expect(m.outOf).toBe(12);
    expect(m.regions[0]).toEqual({ name: 'Jigawa', namedBy: ['A', 'B', 'E'], asSaid: null });
    expect(m.regions.map((r) => r.name)).toEqual(['Jigawa', 'Benue', 'Kano']);
  });
  it('cuts a room into reads the model finishes', () => {
    expect(inChunks(Array.from({ length: 25 }, (_, i) => i), ACCOUNTS_PER_READ).map((c) => c.length)).toEqual([6, 6, 6, 6, 1]);
  });
  it('is read at release and served from the row, never computed on the page\'s clock', () => {
    const svc = readFileSync(join(__dirname, 'reports.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(svc).toContain("if (ground.scenario === 'DISCOVERY') {\n      await this.readAndKeepTheDirection(groundId)");
    expect(svc).toContain('const stored = ground.report?.direction as TheDirection | null | undefined;');
    /* Opening the report no longer starts the read in the background (decision 7): the warm-up that
       runs when something new comes in reads it instead, if it is not kept yet. */
    expect(svc).not.toMatch(/void this\.readAndKeepTheDirection\(ground\.id\)/);
    expect(svc).toMatch(/async wordTheReadsFor[\s\S]{0,900}ground\.scenario === 'DISCOVERY' && !ground\.report\?\.direction[\s\S]{0,80}this\.readAndKeepTheDirection\(groundId\)/);
  });
});

describe('where the room split', () => {
  const empty = { markets: [], actors: [], dataGaps: [], networks: [], pilots: [], nextTwelveMonths: [], outOf: 24 };
  it('two answers from two groups with nobody in common is a split; overlapping groups are not', () => {
    const d = {
      ...empty,
      regions: [
        { name: 'Kano and Jigawa', namedBy: ['A', 'B', 'C', 'D', 'E'], asSaid: null },
        { name: 'Ogun and Oyo', namedBy: ['S', 'T', 'U'], asSaid: null },
        { name: 'Katsina', namedBy: ['A', 'F'], asSaid: null },
        { name: 'Yobe', namedBy: ['G'], asSaid: null },
      ],
      valueChains: [{ name: 'paddy', namedBy: ['A', 'B'], asSaid: null }, { name: 'tomatoes', namedBy: ['B', 'S'], asSaid: null }],
    } as any;
    const splits = whereTheRoomSplit(d);
    expect(splits).toHaveLength(1);
    /* "The north" is not a place two groups disagree over; a pair of namers is not a group; the same thing spelt twice is one item. */
    const noisy = { ...d, regions: [{ name: 'the north', namedBy: ['A', 'B', 'C', 'D', 'E'], asSaid: null }, { name: 'Kano and Jigawa', namedBy: ['F', 'G'], asSaid: null }], valueChains: [{ name: 'Paddy / Rice', namedBy: ['A', 'B', 'C'], asSaid: null }, { name: 'Paddy and Rice', namedBy: ['D', 'E', 'F'], asSaid: null }] };
    expect(whereTheRoomSplit(noisy as any)).toEqual([]);
    expect(mergeDirections([noisy as any], 24).valueChains).toEqual([{ name: 'Paddy / Rice', namedBy: ['A', 'B', 'C', 'D', 'E', 'F'], asSaid: null }]);
    expect(splits[0].saying).toBe('5 named Kano and Jigawa; 3 named Ogun and Oyo, and none of them named Kano and Jigawa. Two answers, from two groups with nobody in common.');
  });
  it('nothing when nothing is split', () => {
    expect(whereTheRoomSplit({ ...empty, regions: [{ name: 'Kano', namedBy: ['A', 'B'], asSaid: null }], valueChains: [] } as any)).toEqual([]);
  });
});

/** Run 10, 21 Sep 2026: "By the next harvest, October, we would need six aggregators on the ground" never reached the twelve-month list. */
describe('the numbers the model missed reach the twelve-month list', () => {
  const { theTwelveMonthShapeIn, withTheNumbersTheModelMissed } = require('./what-the-room-said');
  const byLabel = new Map([
    ['Adamu Tanko, Tanko Rice Mills (agroprocessor)', ['We would need to bring in 40 tonnes a week. By the next harvest, October, we would need six aggregators on the ground.', 'Paddy. Always paddy.']],
    ['Ngozi Eze, Eze Agro Foods (agroprocessor)', ['200 tonnes stored before the dry season. A second parboiling line by March.']],
  ]);
  it('finds a quantity with a when', () => {
    const found = theTwelveMonthShapeIn(byLabel);
    expect(found.map((f: any) => f.name)).toEqual(expect.arrayContaining([
      expect.stringMatching(/six aggregators on the ground/),
      expect.stringMatching(/200 tonnes stored before the dry season/),
    ]));
    expect(found.some((f: any) => /Always paddy/.test(f.name))).toBe(false);
  });
  it('adds them under the person, unless the list already carries that figure of theirs', () => {
    const direction: any = { regions: [], markets: [], valueChains: [], actors: [], dataGaps: [], networks: [], pilots: [], outOf: 2,
      nextTwelveMonths: [{ name: 'double weekly intake to 40 tonnes/week', namedBy: ['Adamu Tanko, Tanko Rice Mills (agroprocessor)'], asSaid: null }] };
    const out = withTheNumbersTheModelMissed(direction, byLabel);
    const names = out.nextTwelveMonths.map((x: any) => x.name);
    expect(names).toEqual(expect.arrayContaining([expect.stringMatching(/six aggregators/), expect.stringMatching(/200 tonnes/)]));
    expect(names.filter((n: string) => /40 tonnes/.test(n))).toHaveLength(1);
  });
});
