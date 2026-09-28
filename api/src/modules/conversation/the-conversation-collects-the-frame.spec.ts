import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  whatIsStillOwed, theFieldWorthAsking, theFrameComesFirst, askForThisField, itAppliesToThem,
  ENOUGH_TIMES_TO_ASK,
} from './the-field-this-answer-is-missing';
import { theFrameFrom, whatTheFrameLeftOut, READ_THE_FRAME_AGAIN } from './what-a-complete-answer-holds';

/**
 * EIGHTY-SIX OF A HUNDRED AND ONE CONVERSATIONS NEVER REACHED HOW THE PERSON VETS ANYBODY.
 *
 * Seventy-two never reached which actors they need. Sixty never reached volumes. That is why the
 * report was worthless: it was asked to bucket answers that had never been collected. The frame
 * said what a complete answer holds and nothing held the conversation to it.
 *
 * Driven live on her own update brief after this: five of seven fields given in seven turns, with
 * vetting asked and answered at turn four.
 */
const FRAME = theFrameFrom({
  fields: [
    { id: 'states', asks: 'Which states do you want to expand into?', shape: 'PLACE', matters: 'see where expansion is concentrated' },
    { id: 'products', asks: 'What products are you looking for?', shape: 'THING', matters: 'see which chains have energy' },
    { id: 'volumes', asks: 'At what volumes?', shape: 'QUANTITY', matters: 'size it' },
    { id: 'vetting', asks: 'How do you assess a new supplier?', shape: 'CHOICE', matters: 'count who has no way to', oneOf: ['no formal vetting', 'we go on who vouches', 'a written process'] },
    { id: 'rd', asks: 'What data do you need?', shape: 'THING', matters: 'see what to collect', askedOf: 'organisations doing research' },
  ],
});

describe('which field the next turn is for', () => {
  it('the ones this person has not given, in the brief’s order', () => {
    expect(whatIsStillOwed(FRAME, null).map((f) => f.id)).toEqual(['states', 'products', 'volumes', 'vetting']);
    expect(theFieldWorthAsking(FRAME, { filled: ['states'] })!.id).toBe('products');
  });

  /* A field only asked of one kind of respondent is not asked of everybody. */
  it('and never one that is not theirs to answer', () => {
    expect(whatIsStillOwed(FRAME, null, 'a research institute').map((f) => f.id)).toContain('rd');
    expect(whatIsStillOwed(FRAME, null, 'an aggregator').map((f) => f.id)).not.toContain('rd');
    expect(itAppliesToThem(FRAME[0], null)).toBe(true);
  });

  /*
   * AND NEVER THE SAME ONE THREE TIMES.
   *
   * Driven live before this existed: she said "maize and soya" in her first sentence, the read did
   * not credit it to the products field, and the conversation asked what products she wanted three
   * turns running - through an answer about farmers and agents and an answer about vetting - until
   * the reply guards stripped the repeat and left "Understood. What else should I know?". The same
   * fault as asking about states twice, one layer down, reintroduced by me.
   */
  it('one that has been asked once goes to the back, not the front', () => {
    const asked = { askedFields: ['states'] };
    expect(theFieldWorthAsking(FRAME, asked)!.id).toBe('products');
  });

  it('and two asks with no answer is enough', () => {
    expect(ENOUGH_TIMES_TO_ASK).toBe(2);
    const twice = { askedFields: ['products', 'products'] };
    expect(whatIsStillOwed(FRAME, twice).map((f) => f.id)).not.toContain('products');
    /* Which is a finding, not a silence: the report says we never got it. */
    expect(theFieldWorthAsking(FRAME, twice)!.id).toBe('states');
  });

  /* "I have no way of knowing that" is an answer, and asking again makes it an interrogation. */
  it('and one they have ruled out is closed', () => {
    expect(whatIsStillOwed(FRAME, { cannotSay: ['vetting'] }).map((f) => f.id)).not.toContain('vetting');
  });

  it('and giving a value later beats having ruled it out', () => {
    const SRC = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(SRC).toMatch(/for \(const id of filled\) ruledOut\.delete\(id\)/);
  });
});

describe('when the frame outranks everything else', () => {
  it('while half of it is still missing', () => {
    expect(theFrameComesFirst(FRAME, null)).toBe(true);
    expect(theFrameComesFirst(FRAME, { filled: ['states', 'products', 'volumes'] })).toBe(false);
    expect(theFrameComesFirst([], null)).toBe(false);
  });

  /* Ahead of the challenge early, behind it later - the same trade breadthFirst makes. */
  it('and it is ranked ahead of our own curiosity, then behind it', () => {
    const SRC = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const rank = SRC.slice(SRC.indexOf('private whichHoleToPush('), SRC.indexOf('async theFrameFor('));
    const early = rank.indexOf('theFrameComesFirst(frame, notes, theirKind)');
    const challenge = rank.indexOf('theChallengeWorthPutting(');
    const late = rank.lastIndexOf('theFieldWorthAsking(frame, notes, theirKind)');
    expect(early).toBeGreaterThan(-1);
    expect(early).toBeLessThan(challenge);
    expect(late).toBeGreaterThan(challenge);
    /* And a steer still beats all of it. */
    expect(rank.indexOf('followTheirLead(')).toBeLessThan(early);
  });
});

describe('what the turn is told about the field', () => {
  it('the lead’s own question, and what makes the answer countable', () => {
    const said = askForThisField(FRAME[2]);
    expect(said).toContain('At what volumes?');
    expect(said).toContain('WITH its unit and its period');
    /* Never a form: the options exist to count people into, not to read out. */
    const choice = askForThisField(FRAME[3]);
    expect(choice).toContain('Never list these to them');
    expect(choice).toContain('no formal vetting');
  });

  it('and never asks twice for something they have ruled out', () => {
    expect(askForThisField(FRAME[0])).toContain('DO NOT ASK AGAIN');
  });
});

/**
 * AND THE FRAME ITSELF IS CHECKED AGAINST THE BRIEF THAT MADE IT.
 *
 * From the newer MarketView brief the read returned a field for the biggest risk. From the Friends
 * of NABG brief, which asks in as many words about "the risks and challenges you have encountered,
 * what you would prefer not to repeat", it returned nine fields and not one about failure. Same
 * reader, same instruction, one subject the lead had spent a sentence on quietly gone. With the
 * second pass it came back as "What single kind of setback, if you had to name one, would you
 * prefer not to repeat?" - the brief's own words.
 */
describe('a subject the frame dropped', () => {
  const subjects = [
    { id: 'states', subject: 'the states they want to grow in', words: ['states', 'grow'] },
    { id: 'risks', subject: 'the risks and challenges they have encountered', words: ['risks', 'challenges', 'failures'] },
  ];

  it('is found by comparing it with the brief’s own subjects', () => {
    expect(whatTheFrameLeftOut(FRAME, subjects).map((s) => s.id)).toEqual(['risks']);
  });

  it('and nothing is flagged where a field already asks about it', () => {
    expect(whatTheFrameLeftOut(FRAME, [subjects[0]])).toEqual([]);
    expect(whatTheFrameLeftOut([], subjects)).toEqual([]);
  });

  it('and the second pass asks only for what was missed', () => {
    const said = READ_THE_FRAME_AGAIN([{ subject: 'the risks they have encountered' }]);
    expect(said).toContain('- the risks they have encountered');
    expect(said).toContain('Do not return the ones you gave before');
  });

  /* One field IS a valid top-up, though three is the floor for a whole frame. */
  it('and a single field survives the validator on a top-up', () => {
    const one = { fields: [{ id: 'risks', asks: 'What went wrong?', shape: 'THING', matters: 'rank what to fix' }] };
    expect(theFrameFrom(one).length).toBe(0);
    expect(theFrameFrom(one, undefined, 1).length).toBe(1);
  });
});
