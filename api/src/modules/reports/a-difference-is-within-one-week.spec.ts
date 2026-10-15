import { aDifferenceHeldToOneWeek, differencesHeldToOneWeek, theWeekOf, type AStatementInItsWeek } from './a-difference-is-within-one-week';

/*
 * Night quality run 2, the lead's board. The record below is what Collins, Hassan and Amina said, in
 * their own words, with the weeks they said it in (week 1 from 28 September, week 3 from 12 October,
 * week 4 from 19 October).
 */
const W1 = new Date('2026-09-30T15:00:00Z');
const W3 = new Date('2026-10-14T15:00:00Z');
const W4 = new Date('2026-10-21T15:00:00Z');
const said: AStatementInItsWeek[] = [
  { who: 'Collins Odhiambo', text: 'Do ten kits.', saidOn: W1, wordForWord: true },
  { who: 'Collins Odhiambo', text: 'Honestly eleven was rounding up, it is lower, maybe four or five.', saidOn: W3, wordForWord: true },
  { who: 'Collins Odhiambo', text: 'Last week I did nine, maybe ten, so I know it works.', saidOn: W4, wordForWord: true },
  { who: 'Hassan Mwenda', text: 'I sent Amina my order on Monday at lunchtime, 15 kits.', saidOn: W3, wordForWord: true },
  { who: 'Hassan Mwenda', text: 'I sent the order on Tuesday afternoon, around four. Not Monday.', saidOn: W4, wordForWord: true },
  { who: 'Amina Otieno', text: 'This week I sent 20 kits to Kisii on Tuesday on delivery note DN-1182, and 12 to Homa Bay on Wednesday on DN-1183.', saidOn: W1, wordForWord: true },
  { who: 'Amina Otieno', text: "Dispatched 15 kits to Kisii on Tuesday 27 October on DN-1231, after Hassan's order on Monday at lunchtime.", saidOn: W3, wordForWord: false },
];

describe('a difference is raised only between statements in the same week, naming the week', () => {
  it('names the week as the Monday it starts on', () => {
    expect(theWeekOf(W3)).toBe('12 October');
    expect(theWeekOf(W4)).toBe('19 October');
  });

  it("Collins's two figures were two weeks, so the lead reads a change over time, in order, each week named", () => {
    const out = aDifferenceHeldToOneWeek(
      "Collins Odhiambo has given different numbers for last week's sales, first reporting nine or ten and later saying it was four or five.",
      said,
    );
    expect(out).toBe(
      'In the week of 12 October, Collins Odhiambo said, “Honestly eleven was rounding up, it is lower, maybe four or five”. In the week of 19 October, Collins Odhiambo said, “Last week I did nine, maybe ten, so I know it works”.',
    );
    expect(out).not.toMatch(/different numbers|first reporting|later saying/);
  });

  it("Hassan's Monday order and Tuesday order were two different weeks' orders, never one contradiction", () => {
    const out = aDifferenceHeldToOneWeek(
      'Hassan reports sending an order for 15 kits on Monday at lunchtime, but also says the order was sent on Tuesday afternoon.',
      said,
    );
    expect(out).toBe(
      'In the week of 12 October, Hassan Mwenda said, “I sent Amina my order on Monday at lunchtime, 15 kits”. In the week of 19 October, Hassan Mwenda said, “I sent the order on Tuesday afternoon, around four. Not Monday”.',
    );
  });

  it("Amina's twenty kits in week 1 are not set against Hassan's 15 kits in week 3", () => {
    const out = aDifferenceHeldToOneWeek('Amina reports sending twenty kits to Hassan Mwenda on Tuesday, not the 15 kits Hassan mentioned.', said);
    expect(out).not.toMatch(/not the 15 kits/);
    expect(out).toContain('In the week of 28 September, Amina Otieno said, “This week I sent 20 kits');
    expect(out).toContain('In the week of 12 October, Hassan Mwenda said, “I sent Amina my order on Monday at lunchtime, 15 kits”.');
    expect(out.indexOf('28 September')).toBeLessThan(out.indexOf('12 October'));
  });

  it('a real difference inside one week stands, and says its week', () => {
    const sameWeek: AStatementInItsWeek[] = [
      { who: 'Hassan Mwenda', text: 'I sent Amina my order on Monday at lunchtime, 15 kits.', saidOn: W3, wordForWord: true },
      { who: 'Amina Otieno', text: 'Hassan sent his order on Wednesday, so I dispatched on Thursday.', saidOn: W3, wordForWord: true },
    ];
    expect(aDifferenceHeldToOneWeek('Hassan says he sent his order on Monday, but Amina says it came on Wednesday.', sameWeek)).toBe(
      'In the week of 12 October, Hassan says he sent his order on Monday, but Amina says it came on Wednesday.',
    );
  });

  it('a sentence that sets nothing against anything is left exactly as it is', () => {
    const s = 'Hassan Mwenda sold three kits in Kisii town this week.';
    expect(aDifferenceHeldToOneWeek(s, said)).toBe(s);
  });

  it('a whole paragraph keeps its other sentences, and the lead reads the board line without the merged weeks', () => {
    const para = "Hassan Mwenda's plan is to sell eight kits. Hassan reports sending an order for 15 kits on Monday at lunchtime, but also says the order was sent on Tuesday afternoon. Hassan says that Amina Otieno is always slow with the dispatch.";
    const out = differencesHeldToOneWeek(para, said);
    expect(out).toContain("Hassan Mwenda's plan is to sell eight kits.");
    expect(out).toContain('Hassan says that Amina Otieno is always slow with the dispatch.');
    expect(out).not.toContain('but also says');
    expect(out).toContain('In the week of 19 October, Hassan Mwenda said');
  });
});

describe('a number word is read wherever the line is read after another', () => {
  it('reads "four or five" after a line that carried a number word was checked', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { carriesANumber, theNumbersIn } = require('./a-number-written-as-a-word-is-a-number');
    carriesANumber('Collins Odhiambo has given different numbers for last week, first reporting nine or ten');
    expect(theNumbersIn('it was four or five.')).toEqual([4, 5]);
  });
});

describe('what is not setting one statement against another', () => {
  it('"a stage, not a no" is not a difference', () => {
    const { setsOneStatementAgainstAnother } = require('./a-difference-is-within-one-week');
    expect(setsOneStatementAgainstAnother('Silence is usually a stage, not a no.')).toBe(false);
    expect(setsOneStatementAgainstAnother('Amina reports sending twenty kits to Hassan Mwenda on Tuesday, not the 15 kits Hassan mentioned.')).toBe(true);
  });
});
