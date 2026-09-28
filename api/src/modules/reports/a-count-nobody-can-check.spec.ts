import { theFrameFrom, theFrameAsShown } from '../conversation/what-a-complete-answer-holds';
import {
  theThingsIn, whatTheNumbersSay, howGoodIsThis, theTable, everySentenceCarriesANumber, talksLikeAPerson,
} from './the-judgement-over-the-answers';
import { theFitFrom, howCompletely } from './fitting-an-answer-into-the-frame';

/**
 * A COUNT THAT IS VISIBLY WRONG COSTS MORE THAN A MISSING ONE.
 *
 * The reader stops believing the column, and the column is the whole product. Every case here was
 * read off the first real table, over the hundred and one answers to the Friends of NABG brief.
 */
const FRAME = theFrameFrom({
  fields: [
    { id: 'states', asks: 'Which states are you looking to grow in?', shape: 'PLACE', matters: 'see where expansion is concentrated' },
    { id: 'volumes', asks: 'What volumes do you handle?', shape: 'QUANTITY', matters: 'size the market' },
    { id: 'vetting', asks: 'How do you vet the people you work with?', shape: 'CHOICE', matters: 'count how many rely on trust', oneOf: ['no formal vetting', 'we go on who vouches for them', 'we have a written process'] },
    { id: 'rd', asks: 'What data do you need?', shape: 'THING', matters: 'see what to collect', askedOf: 'organisations focused on research' },
  ],
});

describe('splitting an answer into things that can be counted', () => {
  it('never inside a number', () => {
    /* "3,000 farmers" became "3" and "000 farmers", and "000 farmers who" reached the table. */
    expect(theThingsIn('another 3,000 farmers', 'ACTOR')).toEqual(['another 3,000 farmers']);
    expect(theThingsIn('10,000 young people', 'ACTOR')).toEqual(['10,000 young people']);
  });

  it('and a quantity is one thing however it is worded', () => {
    expect(theThingsIn('200mt fresh roots a day at peak, that is aug to dec', 'QUANTITY'))
      .toEqual(['200mt fresh roots a day at peak, that is aug to dec']);
  });

  it('and a place is the place, not how they said it', () => {
    /* "Jigawa states", "Bauchi state" and "Jigawa" were three rows in the first table. */
    expect(theThingsIn('Jigawa states', 'PLACE')).toEqual(['Jigawa']);
    expect(theThingsIn('Bauchi state', 'PLACE')).toEqual(['Bauchi']);
    expect(theThingsIn('Niger and Kogi', 'PLACE')).toEqual(['Niger', 'Kogi']);
  });

  it('and a sentence that escaped the fit is not a thing to count', () => {
    /* "agents who collect from them. Basically" was a row. */
    expect(theThingsIn('agents who collect from them. Basically', 'ACTOR')).toEqual(['agents who collect from them']);
    expect(theThingsIn('everyone who can reliably supply us with raw cashew nuts at the right moisture', 'ACTOR')).toEqual([]);
  });
});

describe('the counts, over answers of the same shape', () => {
  const answers = [
    { participantId: 'a', who: 'Aisha', organisation: null, kind: 'trader', completeness: 0.75, specificity: 0.4, gaveEvidence: true,
      values: [{ fieldId: 'states', value: 'Kano and Jigawa states' }, { fieldId: 'vetting', value: 'no formal vetting', option: 'no formal vetting' }] },
    { participantId: 'b', who: 'Bala', organisation: null, kind: 'aggregator', completeness: 0.5, specificity: 0.2, gaveEvidence: false,
      values: [{ fieldId: 'states', value: 'kano' }, { fieldId: 'vetting', value: 'no formal vetting', option: 'no formal vetting' }] },
    { participantId: 'c', who: 'Chidi', organisation: null, kind: 'processor', completeness: 0.25, specificity: 0.1, gaveEvidence: false,
      values: [{ fieldId: 'vetting', couldNotSay: true, value: null }] },
  ];

  const reads = whatTheNumbersSay(FRAME, answers as any);

  it('groups one thing however people capitalised it', () => {
    const states = reads.find((r) => r.field.id === 'states')!;
    expect(states.counts[0]).toMatchObject({ value: 'Kano', howMany: 2 });
    expect(states.counts.map((c) => c.value)).toContain('Jigawa');
  });

  /* The difference between "nobody asked them" and "they have no way to do it" is the product. */
  it('and keeps an admission apart from a blank', () => {
    const vet = reads.find((r) => r.field.id === 'vetting')!;
    expect(vet.answered).toBe(2);
    expect(vet.couldNotSay).toBe(1);
    const states = reads.find((r) => r.field.id === 'states')!;
    expect(states.neverReached).toBe(1);
  });

  /* A field the brief asks of one kind of respondent is not counted against everybody. */
  it('and only asks a field of the people it applies to', () => {
    const rd = reads.find((r) => r.field.id === 'rd')!;
    expect(rd.asked).toBe(0);
  });

  it('and says which findings are worth acting on', () => {
    const say = Object.fromEntries(reads.map((r) => [r.field.id, howGoodIsThis(r).standing]));
    /* 86 of 101 never reached vetting on the real run, and that is our failure, not a finding. */
    expect(say.volumes).toBe('WE_NEVER_ASKED');
    expect(say.states).toBe('THIN');
    /* Too few to rank, with two answers and one admission - which is the honest verdict here. */
    expect(say.vetting).toBe('THIN');
  });

  /*
   * AND WHERE MORE PEOPLE ADMIT THEY CANNOT THAN ANSWER, THE ADMISSION IS THE FINDING.
   *
   * On the real run ten people said they have no way to vet anybody and five described a way. For a
   * business selling a way to check people, that ten is the specification - and before this it was
   * stored as an empty cell and dropped.
   */
  it('and an admission by most of the people asked is the finding', () => {
    const admitted = [...answers, ...['d', 'e', 'f'].map((id) => ({
      participantId: id, who: id, organisation: null, kind: 'trader', completeness: 0.25, specificity: 0.1, gaveEvidence: false,
      values: [{ fieldId: 'vetting', couldNotSay: true, value: null }, { fieldId: 'states', value: 'Kano' }],
    }))];
    const read = whatTheNumbersSay(FRAME, admitted as any).find((r) => r.field.id === 'vetting')!;
    expect(read.couldNotSay).toBe(4);
    expect(read.answered).toBe(2);
    const verdict = howGoodIsThis(read);
    expect(verdict.standing).toBe('NOBODY_COULD_ANSWER');
    expect(verdict.because).toContain('4 of 6 who were asked said they have no way to answer it');
  });

  /* If it cannot be laid out as rows and columns, we built a newsletter. */
  it('and lays out as a table', () => {
    const table = theTable(reads, reads.map(howGoodIsThis), answers.length);
    expect(table).toContain('3 people answered this check-in.');
    expect(table).toMatch(/asked \d+ · answered \d+ · said they cannot \d+ · never reached \d+/);
    expect(table).toContain('Kano');
  });
});

describe('the frame it is all counted against', () => {
  it('drops a choice with nothing to count people into', () => {
    const why: string[] = [];
    const frame = theFrameFrom({
      fields: [
        { id: 'a', asks: 'Which states?', shape: 'PLACE', matters: 'x' },
        { id: 'b', asks: 'What products?', shape: 'THING', matters: 'x' },
        { id: 'c', asks: 'How do you vet?', shape: 'CHOICE', matters: 'x' },
        { id: 'd', asks: 'What volumes?', shape: 'QUANTITY', matters: 'x' },
      ],
    }, (w) => why.push(w));
    expect(frame.map((f) => f.id)).toEqual(['a', 'b', 'd']);
    expect(why.join(' ')).toContain('no options to count people into');
  });

  it('and is nothing at all rather than two questions', () => {
    expect(theFrameFrom({ fields: [{ id: 'a', asks: 'x?', shape: 'PLACE', matters: 'y' }] })).toEqual([]);
  });

  it('and reads back to the lead in their own words', () => {
    expect(theFrameAsShown(FRAME)).toContain('1. Which states are you looking to grow in?');
    expect(theFrameAsShown(FRAME)).toContain('one of: no formal vetting');
    expect(theFrameAsShown(FRAME)).toContain('(asked of organisations focused on research)');
  });
});

describe('fitting one person in', () => {
  it('takes only an option the frame actually offers', () => {
    const why: string[] = [];
    const out = theFitFrom({ values: [
      { fieldId: 'vetting', value: 'we phone around a bit', said: 'we phone around' },
      { fieldId: 'states', value: 'Kano', said: 'Kano mostly' },
      { fieldId: 'invented', value: 'x' },
    ] }, FRAME, (w) => why.push(w));
    expect(out.map((v) => v.fieldId)).toEqual(['states']);
    expect(why.join(' ')).toContain('not one of the options');
    expect(why.join(' ')).toContain('not in the frame');
  });

  /* "nothing formal" is the vouching option, not the written-process one, whatever words it used. */
  it('and matches an option by what it says', () => {
    const out = theFitFrom({ values: [{ fieldId: 'vetting', option: 'no formal vetting' }] }, FRAME);
    expect(out[0]).toMatchObject({ fieldId: 'vetting', option: 'no formal vetting' });
  });

  it('and completeness is fields filled over fields asked, not an opinion', () => {
    const filled = [{ fieldId: 'states', value: 'Kano' }, { fieldId: 'volumes', value: '500MT a month' }];
    expect(howCompletely(filled, FRAME, 'trader')).toBeCloseTo(0.67, 1);
    expect(howCompletely([{ fieldId: 'states', value: null, couldNotSay: true }], FRAME, 'trader')).toBe(0);
  });
});

/**
 * AND THE JUDGEMENT IS HELD TO ITS ONE RULE.
 *
 * "The report was to abstract and talked in parables rather than being clear in normal human
 * language about the gap." The prompt says so in the strongest terms available, and that has never
 * been enough on its own - the report promise, the filler and the goodbye each arrived anyway.
 */
describe('a finding with no number in it', () => {
  it('is not a finding', () => {
    expect(everySentenceCarriesANumber('29 of 34 have no way to check a new supplier.')).toBe(true);
    expect(everySentenceCarriesANumber('Many respondents rely on informal methods.')).toBe(false);
  });

  it('and the words the last report was thrown out for are caught', () => {
    expect(talksLikeAPerson('The supply landscape is fragmented.')).toHaveLength(1);
    expect(talksLikeAPerson('It is worth noting that this suggests that there appears to be a gap.')).toHaveLength(3);
    expect(talksLikeAPerson('4 of 50 named Lagos. Start with the distributor there.')).toEqual([]);
  });
});
