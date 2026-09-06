/**
 * The two things this board must never become.
 *
 * Both would arrive as reasonable additions. A total across the columns looks
 * like a summary; sorting by contribution looks like putting the most useful
 * row first. Each one turns a record kept for an equity conversation into a
 * ranking of people whose jobs are not on one scale.
 *
 * Held here rather than in a comment on the page, because the page will be
 * rewritten and this file will not.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  OneRow,
  inTheOrderTheBoardIsRead,
  whatThisRowShows,
  whatIsTrueOfTheQuarter,
} from './everybody-in-one-place';

const row = (over: Partial<OneRow> = {}): OneRow => ({
  personId: 'p',
  key: 'k',
  displayName: 'Zoe',
  functionalRole: 'ENGINEERING',
  objectives: [],
  commitments: { total: 0, closed: 0, missed: 0, blocked: 0, overdue: 0 },
  sales: { originated: 0, positioned: 0, newRevenueCents: 0 },
  product: { total: 0, byServes: {} },
  ...over,
});

describe('the order the board is read in', () => {
  it('is by name, whatever the numbers say', () => {
    const ordered = inTheOrderTheBoardIsRead([
      row({ displayName: 'Zoe', sales: { originated: 9, positioned: 0, newRevenueCents: 900000 } }),
      row({ displayName: 'Adam', sales: { originated: 0, positioned: 0, newRevenueCents: 0 } }),
    ]);
    expect(ordered.map((r) => r.displayName)).toEqual(['Adam', 'Zoe']);
  });

  it('and takes no second argument, so there is nowhere to pass a sort key', () => {
    expect(inTheOrderTheBoardIsRead.length).toBe(1);
  });

  it('and does not reorder the caller\'s own array underneath it', () => {
    const rows = [row({ displayName: 'Zoe' }), row({ displayName: 'Adam' })];
    inTheOrderTheBoardIsRead(rows);
    expect(rows.map((r) => r.displayName)).toEqual(['Zoe', 'Adam']);
  });
});

describe('what the board counts across people', () => {
  it('is people, and nothing they contributed', () => {
    const quarter = whatIsTrueOfTheQuarter([
      row({ displayName: 'Adam', sales: { originated: 3, positioned: 1, newRevenueCents: 500000 } }),
      row({ displayName: 'Zoe', objectives: [{ id: 'o', title: 'T', serves: 'SALES', status: 'ACTIVE', unjustifiedKeyResults: 0 }] }),
    ]);
    expect(quarter.people).toBe(2);
    expect(Object.keys(quarter)).toEqual(['people', 'withoutAnObjective', 'ready', 'says']);
  });

  it('and names who has no objective rather than counting it as a failure rate', () => {
    const quarter = whatIsTrueOfTheQuarter([row({ displayName: 'Adam' })]);
    expect(quarter.withoutAnObjective).toEqual(['Adam']);
    expect(quarter.ready).toBe(false);
    expect(quarter.says).toContain('Adam');
    expect(quarter.says).not.toMatch(/%/);
  });
});

describe('the source of the board', () => {
  const withoutComments = (file: string) =>
    fs
      .readFileSync(path.join(__dirname, file), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');

  it('never sums a contribution column across people', () => {
    /*
     * Reduce over `rows` is how a column total would be written. The rules file
     * may only reduce over ONE PERSON'S OWN objectives, which is why the check
     * is on the shape of what is being reduced rather than on the word.
     */
    const source = withoutComments('everybody-in-one-place.ts');
    expect(source).not.toMatch(/rows\s*\.\s*reduce/);
    expect(source).not.toMatch(/rows\s*\.\s*sort\s*\(\s*\(a,\s*b\)\s*=>\s*b\./);
  });

  it('and the service hands the board over in that order, rather than ordering it itself', () => {
    const service = withoutComments('ops-intent.service.ts');
    expect(service).toMatch(/inTheOrderTheBoardIsRead\(rows\)/);
  });
});

describe('what a row says about itself', () => {
  it('names a missing objective as the finding it is', () => {
    expect(whatThisRowShows(row()).join(' ')).toContain('No objective set');
  });

  it('separates blocked from late, because they need different help', () => {
    const said = whatThisRowShows(
      row({ commitments: { total: 3, closed: 0, missed: 0, blocked: 1, overdue: 1 } }),
    ).join(' ');
    expect(said).toContain('waiting on something');
    expect(said).toContain('past the date');
  });

  it('and counts a missed commitment once, not twice', () => {
    const said = whatThisRowShows(
      row({ commitments: { total: 1, closed: 0, missed: 1, blocked: 0, overdue: 0 } }),
    );
    expect(said.filter((s) => /missed|past the date/.test(s)).length).toBe(1);
  });

  it('and says nothing about somebody whose quarter is in order', () => {
    const said = whatThisRowShows(
      row({
        objectives: [{ id: 'o', title: 'T', serves: 'MOAT', status: 'ACTIVE', unjustifiedKeyResults: 0 }],
        commitments: { total: 2, closed: 2, missed: 0, blocked: 0, overdue: 0 },
      }),
    );
    expect(said).toEqual([]);
  });
});
