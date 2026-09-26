import { factsAbout } from './the-facts-about-a-person';
import { factsAsLines, thePictureInstruction } from './the-picture-in-plain-sentences';

/**
 * "OUR WRITTEN TERMS STATE 30 DAYS" WAS ON THE RECORD AND REACHED NOBODY.
 *
 * Run 6 stored fifteen OPERATING_DIFFERENCE entries across the twenty-four scenarios - how a person
 * says the work really runs, where that is not how it is supposed to - and `PersonFacts` had no field
 * fed by that type. The per-person paragraph is written from those fields alone, and the judgement
 * from the paragraphs, so all fifteen were lost, including:
 *
 *   Patience, handing over: a verbal 60-day payment arrangement with the main printing supplier,
 *   agreed with their MD in 2022, against written terms of 30 days. Her paragraph said something
 *   minor about following up purchases.
 *   Daniel, the new manager: "I'm faster at them, so it's quicker for me to just handle them" - the
 *   scenario's right answer, nearly word for word.
 *
 * The same defect the INTENT field was added for (see the-record-says-who-asked.spec), one type along.
 */
const entry = (type: string, text: string, session = 1) => ({ type, text, session } as any);
const person = (said: any[]) => ({ participantId: 'p1', label: 'Participant A', isLead: false, said, targets: [] });

describe('the record says how the work really runs, and so does the person’s paragraph', () => {
  it('fills the field from OPERATING_DIFFERENCE, in their own words', () => {
    const f = factsAbout(person([
      entry('PROGRESS', 'I have handed over the supplier list.'),
      entry('OPERATING_DIFFERENCE', "I'm faster at them, so it's quicker for me to just handle them."),
    ]) as any, 1)!;
    expect(f.howTheySayTheWorkReallyRuns).toEqual(["I'm faster at them, so it's quicker for me to just handle them"]);
  });

  it('prefers the lines carrying a specific over later vague ones', () => {
    /* The terms, the figure and the name are what the finding turns on. Recency alone would have
       kept "things are informal here" and thrown away the 60 days. */
    const f = factsAbout(person([
      entry('OPERATING_DIFFERENCE', 'I have a verbal 60-day payment arrangement with our main printing supplier; our written terms state 30 days.', 1),
      entry('OPERATING_DIFFERENCE', 'I have been focused on inbound sales support as requested by Nadia.', 1),
      entry('OPERATING_DIFFERENCE', 'Things are quite informal here, to be honest.', 3),
    ]) as any, 3)!;
    expect(f.howTheySayTheWorkReallyRuns).toHaveLength(2);
    expect(f.howTheySayTheWorkReallyRuns.join(' ')).toContain('written terms state 30 days');
    expect(f.howTheySayTheWorkReallyRuns.join(' ')).toContain('as requested by Nadia');
    expect(f.howTheySayTheWorkReallyRuns.join(' ')).not.toContain('informal');
  });

  it('keeps two at most, the latest first among equals, and the same sentence once', () => {
    const f = factsAbout(person([
      entry('OPERATING_DIFFERENCE', 'The reconciliation runs off a spreadsheet on my personal drive with 11 years of adjustments.', 1),
      entry('OPERATING_DIFFERENCE', 'The reconciliation runs off a spreadsheet on my personal drive with 11 years of adjustments.', 2),
      entry('OPERATING_DIFFERENCE', 'Since March 11th I have done almost no partnership work.', 2),
      entry('OPERATING_DIFFERENCE', 'The supplier terms are 60 days, not 30.', 3),
    ]) as any, 3)!;
    expect(f.howTheySayTheWorkReallyRuns).toEqual([
      'The supplier terms are 60 days, not 30',
      'The reconciliation runs off a spreadsheet on my personal drive with 11 years of adjustments',
    ]);
  });

  it('is empty where they said nothing of the kind, and invents nothing', () => {
    const f = factsAbout(person([entry('PROGRESS', 'I shipped the referral scheme.')]) as any, 1)!;
    expect(f.howTheySayTheWorkReallyRuns).toEqual([]);
    expect(f.hasGap).toBe(false);
  });

  it('counts as something the lead should look at', () => {
    const f = factsAbout(person([entry('OPERATING_DIFFERENCE', 'Nobody explained that the repayments started immediately.')]) as any, 1)!;
    expect(f.hasGap).toBe(true);
  });

  it('and it reaches the model, one line each, in their own words', () => {
    const f = factsAbout(person([
      entry('PROGRESS', 'I have handed over the supplier list.'),
      entry('OPERATING_DIFFERENCE', 'I have a verbal 60-day payment arrangement with our main printing supplier, which I agreed with their MD in 2022; our written terms state 30 days.'),
      entry('OPERATING_DIFFERENCE', 'Our year-end reconciliation runs off a spreadsheet on my personal drive with eleven years of adjustments in it.'),
    ]) as any, 1)!;
    const lines = factsAsLines(f, () => 'Patience Okafor');
    expect(lines).toContain('how they say the work really runs, in their words: "I have a verbal 60-day payment arrangement with our main printing supplier, which I agreed with their MD in 2022; our written terms state 30 days"');
    expect(lines).toContain('how they say the work really runs, in their words: "Our year-end reconciliation runs off a spreadsheet on my personal drive with eleven years of adjustments in it"');
  });

  it('and the writer is told to keep those lines', () => {
    const instruction = thePictureInstruction({ peopleAnswered: 1, peopleExpected: 1, differenceTopics: [], aboutOnePerson: false });
    expect(instruction).toContain('KEEP HOW THEY SAY THE WORK REALLY RUNS');
  });

  it('does not disturb the fields that were already there', () => {
    const f = factsAbout(person([
      entry('SUCCESS_DEFINITION', 'Success is the referral scheme being live and bringing in signups'),
      entry('PROGRESS', 'I have 40 signups so far.'),
      entry('WORRY', 'I am not sure anybody else knows I am doing this.'),
      entry('INTENT', 'The CEO asked me to build it.'),
      entry('OPERATING_DIFFERENCE', 'I report to Nadia day to day, not to my lead.'),
    ]) as any, 1)!;
    expect(f.whatTheySaidItWasFor).toContain('referral scheme being live');
    expect(f.whereTheySayTheyAre).toContain('40 signups');
    expect(f.whatTheySayIsInTheWay).toContain('anybody else knows');
    expect(f.whyTheySayTheyAreOnIt).toContain('The CEO asked me to');
    expect(f.howTheySayTheWorkReallyRuns).toEqual(['I report to Nadia day to day, not to my lead']);
  });
});
