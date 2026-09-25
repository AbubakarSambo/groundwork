import { factsAbout, everMentioned } from './the-facts-about-a-person';
import { plainlyWithoutAModel, howManyAnsweredInWords, factsAsLines } from './the-picture-in-plain-sentences';

/**
 * THE EXTRACTION KEEPS ITS SCARS; THE GLUE DOES NOT.
 *
 * This replaces `the-finding-per-person.spec`, which tested both halves of a file that did two
 * jobs. Every assertion about WHAT the record holds is carried over unchanged - those were earned
 * across six adversarial runs. Every assertion about the glued prose is gone, because the prose it
 * pinned is the defect: "said this was for:", "Where they say they stand now:", and an opening
 * claiming the accounts did not contradict each other.
 *
 * What replaces those is the rule that the fallback must never glue.
 */

const said = (type: string, text: string, session = 1) => ({ type, text, session });

describe('the facts about a person', () => {
  it('takes their own purpose, standing and worry, and writes nothing', () => {
    const f = factsAbout({
      participantId: 'p1',
      label: 'Femi Okonkwo',
      isLead: false,
      said: [
        said('SUCCESS_DEFINITION', 'Twelve approved facilities by the end of the quarter'),
        said('PROGRESS', 'I have visited many businesses, 46 in total', 2),
        said('WORRY', 'Many of them are still trying to get the statements from their banks', 2),
      ],
      targets: [],
    }, 2)!;

    expect(f.whatTheySaidItWasFor).toBe('Twelve approved facilities by the end of the quarter');
    expect(f.whereTheySayTheyAre).toBe('I have visited many businesses, 46 in total');
    expect(f.whatTheySayIsInTheWay).toBe('Many of them are still trying to get the statements from their banks');
    /* And not one slot name anywhere in it. */
    expect(JSON.stringify(f)).not.toContain('said this was for');
    expect(JSON.stringify(f)).not.toContain('Where they say they stand now');
  });

  it('prefers the latest progress line that has a number in it', () => {
    const f = factsAbout({
      participantId: 'p1', label: 'A', isLead: false,
      said: [said('PROGRESS', 'Six approved, N19m', 1), said('PROGRESS', 'Still going', 2)],
      targets: [],
    }, 2)!;
    expect(f.whereTheySayTheyAre).toBe('Six approved, N19m');
  });

  it('nothing at all for a person who said nothing', () => {
    expect(factsAbout({ participantId: 'p1', label: 'A', isLead: false, said: [], targets: [] }, 1)).toBeNull();
  });
});

describe('a number set for them that they have never said', () => {
  const target = (over: any = {}) => ({ name: 'new business', target: 400000, count: 0, yours: true, setByThem: false, ...over });

  it('is a gap of its own kind', () => {
    const f = factsAbout({
      participantId: 'p1', label: 'Tunde', isLead: false,
      said: [said('PROGRESS', 'I have been meeting people')],
      targets: [target()],
    }, 1)!;
    expect(f.aNumberSetForThemTheyHaveNeverSaid).toEqual({ what: 'new business', target: 400000 });
    expect(f.hasGap).toBe(true);
  });

  it('and not when they have said it, in any shape', () => {
    for (const shape of ['400,000', '400k', '$400,000', '0.4m']) {
      const f = factsAbout({
        participantId: 'p1', label: 'Tunde', isLead: false,
        said: [said('PROGRESS', `We agreed ${shape} in new business`)],
        targets: [target()],
      }, 1)!;
      expect(f.aNumberSetForThemTheyHaveNeverSaid).toBeNull();
    }
  });

  it('two numbers for one target is its own fact', () => {
    const f = factsAbout({
      participantId: 'p1', label: 'Nathan', isLead: false,
      said: [said('PROGRESS', 'Six renewals done')],
      targets: [
        { name: 'renewals', target: 8, count: 6, yours: true, setByThem: false },
        { name: 'renewals', target: 5, count: 6, yours: true, setByThem: true },
      ],
    }, 1)!;
    expect(f.twoNumbersForOneTarget).toEqual({ what: 'renewals', theLeads: 8, theirs: 5 });
  });

  it('everMentioned reads a figure in any of its shapes', () => {
    expect(everMentioned([said('PROGRESS', 'about 400k so far')], 400000)).toBe(true);
    expect(everMentioned([said('PROGRESS', 'about 12 so far')], 400000)).toBe(false);
  });
});

describe('and when the model cannot be reached, the fallback does not glue', () => {
  const facts = [
    factsAbout({
      participantId: 'p1', label: 'Femi', isLead: false,
      said: [
        said('SUCCESS_DEFINITION', 'Twelve approved facilities'),
        said('PROGRESS', 'I have visited 46 businesses', 2),
        said('WORRY', 'customers are slow with bank statements', 2),
      ],
      targets: [],
    }, 2)!,
  ];

  it('writes whole sentences with no slot names in them', () => {
    const out = plainlyWithoutAModel(facts, (l) => l);
    const text = out.perPerson[0].text;
    expect(text).not.toMatch(/said this was for:|Where they say they stand now:|What they say is in the way:/);
    expect(text).toContain('Femi');
    /* Every sentence starts with a capital and ends with a stop. */
    for (const sentence of text.split(/(?<=\.)\s+/)) {
      expect(sentence.charAt(0)).toBe(sentence.charAt(0).toUpperCase());
    }
  });

  it('never claims the accounts do not contradict each other', () => {
    const out = plainlyWithoutAModel(facts, (l) => l);
    expect(JSON.stringify(out)).not.toContain('contradicts');
  });
});

describe('how many have answered, in words', () => {
  it('never says "1 people"', () => {
    expect(howManyAnsweredInWords(1, 1)).toBe('One person has answered.');
    expect(howManyAnsweredInWords(1, 4)).toBe('One person has answered so far, of 4.');
    for (let a = 0; a <= 9; a++) {
      for (let e = a; e <= 9; e++) {
        expect(howManyAnsweredInWords(a, e)).not.toMatch(/\b1 people\b|\b1 of 1 people\b/);
      }
    }
  });

  it('says everybody is in when everybody is in', () => {
    expect(howManyAnsweredInWords(4, 4)).toBe('All four people have checked in.');
  });

  it('and says so when nobody has', () => {
    expect(howManyAnsweredInWords(0, 3)).toBe('Nobody has answered yet.');
  });
});

describe('what the model is shown', () => {
  it('is facts, quoted, with no sentence written for it', () => {
    const f = factsAbout({
      participantId: 'p1', label: 'Femi', isLead: false,
      said: [said('PROGRESS', 'I have visited 46 businesses')],
      targets: [],
    }, 1)!;
    const lines = factsAsLines(f, (l) => l);
    expect(lines).toContain('PERSON id=p1 name=Femi');
    expect(lines).toContain('"I have visited 46 businesses"');
    expect(lines).not.toMatch(/said this was for:|Where they say they stand now:/);
  });
});
