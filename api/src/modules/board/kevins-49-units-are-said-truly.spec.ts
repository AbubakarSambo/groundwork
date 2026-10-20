import { theShareSays } from './your-share';
import { myWorkFrom } from './my-work';
import { goalFromTarget } from '../grounds/your-board';
import { aStoredSentenceReadsRight } from '../reports/a-stored-sentence-reads-right';
import * as RUN from '../engagement/__fixtures__/night-run-2.json';
import * as SERVED from '../reports/__fixtures__/night-run-2-served.json';

/**
 * KEVIN'S 49 UNITS, SAID TRULY, FOR EVERYBODY (night run 2, 20 October; a fix to something untrue, so not behind any switch).
 *
 * Kevin's share read "You have sold 49 of your 30 units so far", his My work read "3, sold, 2 with proof" beside "49 of 30, your target",
 * and his own report "49 of your 30 units". The record (gw_night_run2) holds three won deals that are his: Kilele Hotel 40 units, paid by
 * M-Pesa, Savannah Cafe 6 units, paid, and Roysambu Gym 3 units, on his word; 49 units against his own target of 30 units by 30 October.
 * Nothing counted is anybody else's, and the team's figure (120) is not his. So the counts were right, and the sentences were not: 49 is
 * not a part of 30, and "3 sold" counted deals while the target beside it counted units.
 */
const N: any = (RUN as any).default ?? RUN;
const S: any = (SERVED as any).default ?? SERVED;
const KEVIN = '9f2e58a4-06d8-4a0a-bddc-03cd96df027c';

describe('Kevin’s 49 units, from the stored record', () => {
  const deals = (N.drop.items as any[]).filter((i) => i.kind === 'deal' && i.ownerParticipantId === KEVIN);
  const target = (N.drop.objectives as any[]).find((o) => o.ownerParticipantId === KEVIN);

  it('the record holds 49 units in his own won deals, against his own target of 30', () => {
    const won = deals.filter((d) => d.stage === 'Won');
    expect(won.map((d) => d.name).sort()).toEqual(['Kilele Hotel', 'Roysambu Gym', 'Savannah Cafe']);
    expect(won.reduce((n, d) => n + Number(d.fields.Units), 0)).toBe(49);
    expect(target.count).toBe(49);
    expect(target.target).toBe(30);
  });

  it('his share says what he sold and how far past his target it is, never "49 of your 30"', () => {
    const before = S.readers[1].board.yourShare[0].says;
    expect(before).toBe('You have sold 49 of your 30 units so far, 46 paid (Savannah Cafe and Kilele Hotel) and 3 on your word (Roysambu Gym).');
    const after = theShareSays(target.name, 49, 30, null, {
      counts: 'units', proven: 46, thing: 'units',
      paidDeals: [{ name: 'Savannah Cafe', holds: 6 }, { name: 'Kilele Hotel', holds: 40 }],
      saidDeals: [{ name: 'Roysambu Gym', holds: 3 }],
    });
    expect(after).toBe('You have sold 49 units so far, 19 more than your target of 30, 46 paid (Savannah Cafe and Kilele Hotel) and 3 on your word (Roysambu Gym).');
    expect(after).not.toMatch(/49 of/);
  });

  it('within the target the share reads exactly as before', () => {
    expect(theShareSays('units sold by 30 October', 26, 30, null, { counts: 'units', proven: 25, thing: 'units', paidDeals: [{ name: 'Greenfield Supermarket', holds: 25 }], saidDeals: [{ name: 'Mama Rose’s Kiosk', holds: 1 }] }))
      .toBe('You have sold 26 of your 30 units so far, 25 paid (Greenfield Supermarket) and 1 on your word (Mama Rose’s Kiosk).');
  });

  it('his My work counts units in both numbers, as Kevin reads it and as Grace reads it', () => {
    const before = S.readers[1].myWork.numbers;
    expect(before.map((x: any) => `${x.value} ${x.label}`).slice(0, 2)).toEqual(['3 sold, 2 with proof', '49 of 30 your target']);
    const items = deals.map((d) => ({
      ...d, group: d.stage === 'Won' ? 'won' : 'possible', lost: false,
      paymentRecord: d.name === 'Kilele Hotel' || d.name === 'Savannah Cafe',
    }));
    const record = (reader: 'self' | 'lead') => ({
      reader, person: { participantId: KEVIN, name: 'Kevin Omondi', firstName: 'Kevin' }, leadFirst: 'Grace', kindOfWork: N.drop.ground.kindOfWork,
      items, commitments: [], waitsOnThem: [], raised: [], credits: [], checkIns: [], ownLines: [], patterns: [], teamCoaching: [], helpWith: null,
      target: { count: 49, target: 30 }, now: new Date('2026-10-20T09:00:00Z'), timeZone: 'Africa/Nairobi',
    }) as any;
    const kevin = myWorkFrom(record('self'), 'Sales team, Q4').numbers.map((x) => `${x.value} ${x.label}`);
    expect(kevin.slice(0, 2)).toEqual(['49 sold, 46 with proof', '19 over your target of 30']);
    const grace = myWorkFrom(record('lead'), 'Sales team, Q4').numbers.map((x) => `${x.value} ${x.label}`);
    expect(grace.slice(0, 2)).toEqual(['49 sold, 46 with proof', '19 over Kevin’s target of 30']);
  });

  it('a target not reached, and deals with no units on record, read as before', () => {
    const items = [{ id: 'a', name: 'A', stage: 'Won', group: 'won', fields: {}, lost: false, paymentRecord: true }, { id: 'b', name: 'B', stage: 'Won', group: 'won', fields: {}, lost: false }];
    const r = { reader: 'self', person: { participantId: 'p', name: 'Mercy W', firstName: 'Mercy' }, leadFirst: 'Grace', kindOfWork: N.drop.ground.kindOfWork, items, commitments: [], waitsOnThem: [], raised: [], credits: [], checkIns: [], ownLines: [], patterns: [], teamCoaching: [], helpWith: null, target: { count: 4, target: 40 }, now: new Date('2026-10-20T09:00:00Z'), timeZone: 'Africa/Nairobi' } as any;
    expect(myWorkFrom(r, 'x').numbers.map((x) => `${x.value} ${x.label}`).slice(0, 2)).toEqual(['2 sold, 1 with proof', '4 of 40 your target']);
  });

  it('his You board goal says it the same way', () => {
    expect(goalFromTarget({ id: 'o', name: 'Units sold by 30 October', target: 30, count: 49, groundId: 'g' } as any)).toBe('Units sold by 30 October. You have 49 so far, 19 more than the 30.');
    expect(goalFromTarget({ id: 'o', name: 'Units sold by 30 October', target: 30, count: 26, groundId: 'g' } as any)).toBe('Units sold by 30 October. You have 26 of 30.');
  });

  it('his own report, stored as the model wrote it, is served true', () => {
    const story = S.readers[1].teamReport.data.yourOwnReport.story;
    expect(story).toBe('Roysambu Gym is your third sale, 49 of your 30 units.');
    expect(aStoredSentenceReadsRight(story)).toBe('Roysambu Gym is your third sale, 49 units, 19 more than your 30.');
    expect(aStoredSentenceReadsRight('2 of your 3 sales have proof.')).toBe('2 of your 3 sales have proof.');
    expect(aStoredSentenceReadsRight('He said “49 of your 30 units” to Grace.')).toBe('He said “49 of your 30 units” to Grace.');
  });
});
