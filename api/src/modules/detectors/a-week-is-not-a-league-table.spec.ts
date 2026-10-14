import { readFileSync } from 'fs';
import { join } from 'path';
import { whoNeedsYou, Need, WHAT_IT_ASKS, NOT_A_RANKING, NOTHING_FLAGGED } from './who-needs-you-this-week';

const need = (over: Partial<Need> = {}): Need => ({
  kind: 'CYCLE_RAN_OUT', who: 'Dele', says: 'the same thing across three check-ins', waitingDays: 5, ...over,
});

describe('a manager\'s week, which must never become a ranking of people', () => {
  it('groups by what the manager has to do, not by who the person is', () => {
    const w = whoNeedsYou([need({ kind: 'WAITING_ON_YOU' }), need({ kind: 'ASKED_TO_BE_SHOWN' })]);
    expect(w.buckets.map((b) => b.kind)).toEqual(['WAITING_ON_YOU', 'ASKED_TO_BE_SHOWN']);
  });

  it('puts the manager\'s own work first', () => {
    const w = whoNeedsYou([need({ kind: 'ASKED_TO_BE_SHOWN' }), need({ kind: 'WAITING_ON_YOU' })]);
    expect(w.buckets[0].kind).toBe('WAITING_ON_YOU');
    expect(w.buckets[0].asks).toContain('yours to clear');
  });

  it('carries no number anybody could sort people by', () => {
    /*
     * ASSERTED AGAINST THE TYPE, not against an object this test builds. The first version checked
     * `Object.keys` of a Need the test had constructed itself, so it could only ever find fields the
     * test had put there - adding `severity: number` to the interface sailed straight past it. A
     * guard that inspects its own fixture is a guard about its own fixture.
     *
     * waitingDays describes the WAIT and is the only number allowed. A score, a rating, a rank or a
     * priority would each be a property of the PERSON, and the first one added is the day this
     * becomes the league table the product refuses to build.
     */
    const src = readFileSync(join(__dirname, 'who-needs-you-this-week.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/^\s*\/\/.*$/gm, '');
    const iface = src.slice(src.indexOf('export interface Need {'), src.indexOf('}', src.indexOf('export interface Need {')));
    expect(iface).toContain('waitingDays: number;');
    const numbers = [...iface.matchAll(/(\w+)\??:\s*number/g)].map((m) => m[1]);
    expect(numbers).toEqual(['waitingDays']);
    for (const forbidden of ['score', 'rating', 'rank', 'priority', 'severity', 'weight', 'points']) {
      expect(iface.toLowerCase()).not.toContain(forbidden);
    }
  });

  it('orders by how long the situation has waited, and by nothing else', () => {
    const w = whoNeedsYou([
      need({ who: 'A', waitingDays: 2 }),
      need({ who: 'B', waitingDays: 30 }),
      need({ who: 'C', waitingDays: 9 }),
    ]);
    expect(w.buckets[0].needs.map((n) => n.who)).toEqual(['B', 'C', 'A']);
  });

  it('never mixes two situations into one list', () => {
    /* Four buckets exist because they ask for four different things. One list under one heading
       throws away the only thing that made splitting them worth doing. */
    const w = whoNeedsYou([need({ kind: 'WAITING_ON_YOU' }), need({ kind: 'STUCK_AND_RAISED' })]);
    expect(w.buckets).toHaveLength(2);
    expect(new Set(Object.values(WHAT_IT_ASKS)).size).toBe(4);
  });

  it('sends being shown somewhere other than a performance conversation', () => {
    expect(WHAT_IT_ASKS.ASKED_TO_BE_SHOWN).toContain('not a conversation about performance');
  });

  it('says what it is not, every time, including when the list is long', () => {
    const w = whoNeedsYou([need(), need({ kind: 'WAITING_ON_YOU' }), need({ kind: 'STUCK_AND_RAISED' })]);
    expect(w.whatThisIsNot).toEqual(NOT_A_RANKING);
    expect(w.whatThisIsNot.join(' ')).toContain('not being compared');
    expect(w.whatThisIsNot.join(' ')).toContain('not a mark against anybody');
  });

  it('never lets an empty week read as everybody being fine', () => {
    expect(whoNeedsYou([]).buckets).toEqual([]);
    /* The sentence the whole file exists to get right. */
    expect(NOTHING_FLAGGED).toContain('does not tell you how anybody is');
    expect(NOTHING_FLAGGED).toContain('quietest');
  });
});
