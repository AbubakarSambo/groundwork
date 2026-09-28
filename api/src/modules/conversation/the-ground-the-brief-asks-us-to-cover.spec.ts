import {
  theyHaveTalkedAbout, whatIsStillUncovered, breadthFirst, whatToCoverNext, type ASubject,
} from './the-ground-the-brief-asks-us-to-cover';

/**
 * "THE QUESTIONS DONT HELP US GET WHAT WE WANT."
 *
 * Measured across a hundred real conversations: 626 questions, of which 91 were about expansion
 * plans, 62 about volumes and 15 about how anybody vets anybody - on a check-in whose strongest
 * finding was that nineteen organisations cannot vet anybody. The questions followed the brief's
 * WORDING, which is what it repeated most, rather than its subjects.
 *
 * The eight subjects below are what the product actually read out of her real brief, printed from a
 * live run on 23 September 2026. The five answers are her own.
 */
const HERS: ASubject[] = [
  { id: 'expansion', subject: 'where you want to expand', ask: 'Where do you want to expand?', words: ['Nigeria', 'markets', 'products', 'states', 'scale'] },
  { id: 'people', subject: 'the people you need', ask: 'What kind of people do you need?', words: ['farmers', 'traders', 'agents', 'distributors', 'actors'] },
  { id: 'volumes', subject: 'the volumes you need', ask: 'What volumes do you need?', words: ['volumes', 'supply', 'demand', 'capacity'] },
  { id: 'quality', subject: 'check quality', ask: 'How do you check quality?', words: ['quality', 'inconsistent'] },
  { id: 'sourcing', subject: 'find reliable sources of supply', ask: 'How do you find reliable supply?', words: ['sources', 'networks'] },
  { id: 'vetting', subject: 'vet the people you buy from', ask: 'How do you vet the people you work with?', words: ['trust', 'relationships', 'reliable', 'knowledge'] },
  { id: 'risks', subject: 'respond when things go wrong', ask: 'How do you respond when things go wrong?', words: ['fraud', 'theft', 'weather', 'climate'] },
  { id: 'information', subject: 'the information you need', ask: 'What information would help most?', words: ['information', 'research', 'interventions'] },
];

const HER_ANSWERS = [
  'I plan to run interventions to impact 30k women farmers',
  'no specific states but they have to be women',
  'horticulture',
  'no volumes, just increase their incomes by 30%',
  'getting data from the women before and after the intervention',
];

describe('what her five answers covered', () => {
  it('the four she was asked about', () => {
    for (const id of ['expansion', 'people', 'volumes', 'information']) {
      expect(theyHaveTalkedAbout(HERS.find((s) => s.id === id)!, HER_ANSWERS)).toBe(true);
    }
  });

  /* And these are exactly the four she said were never asked. */
  it('and not quality, sourcing, vetting, or what they do when things go wrong', () => {
    expect(whatIsStillUncovered(HERS, HER_ANSWERS).map((s) => s.id))
      .toEqual(['quality', 'sourcing', 'vetting', 'risks']);
  });
});

describe('breadth against depth', () => {
  /*
   * AT EXACTLY HALF, BREADTH. A strict majority test chose depth at four of eight - the exact state
   * her transcript reached - and the complaint was never that claims went unsharpened.
   */
  it('chooses breadth while half the ground is untouched', () => {
    expect(breadthFirst(HERS, HER_ANSWERS)).toBe(true);
  });

  it('and depth once most of it has been touched', () => {
    const nearlyAll = [...HER_ANSWERS, 'we check quality by moisture at the gate', 'we find supply through our own networks', 'we trust people our suppliers vouch for'];
    expect(breadthFirst(HERS, nearlyAll)).toBe(false);
  });

  /* Neither can starve: a check-in with no subjects read falls back to the holes, and one with
     everything covered does too. */
  it('and never claims breadth where there is no ground to cover', () => {
    expect(breadthFirst([], HER_ANSWERS)).toBe(false);
    expect(breadthFirst(null, HER_ANSWERS)).toBe(false);
  });
});

describe('what it says to ask', () => {
  const told = whatToCoverNext(HERS, HER_ANSWERS);

  it('names the subject and gives the question', () => {
    expect(told).toContain('check quality');
    expect(told).toContain('How do you check quality?');
  });

  /* So a turn that lands on a subject does not have to guess whether it is nearly finished. */
  it('and says what is still to come', () => {
    expect(told).toContain('Still to come after that:');
    expect(told).toContain('vet the people you buy from');
  });

  it('and still answers the person first, one question at a time', () => {
    expect(told).toContain('Answer whatever they just said first');
    expect(told).toMatch(/One question/);
  });

  /* If they have covered it in other words, asking again is the thing she has complained about
     most - so the turn is told to move on rather than ask. */
  it('and does not ask about something they have already said', () => {
    expect(told).toContain('do not ask - move to the next one');
  });

  it('and says nothing once the whole brief has been covered', () => {
    const everything = [
      ...HER_ANSWERS,
      'quality is checked at the gate',
      'we find sources through our networks',
      'we trust who our suppliers vouch for',
      'when there is fraud we stop buying',
    ];
    expect(whatToCoverNext(HERS, everything)).toBe('');
  });
});

describe('a word that shows nothing shows nothing', () => {
  /* "need", "want", "people", "things" appear in every answer ever given. A subject whose words are
     those would read as covered by anybody who said anything. */
  it('does not count as having covered a subject', () => {
    const vague: ASubject = { id: 'v', subject: 'what you need', ask: 'What do you need?', words: ['need', 'want', 'things'] };
    expect(theyHaveTalkedAbout(vague, ['we need more time and we want better things'])).toBe(false);
  });

  /* And a plural in the brief matches a singular in the answer. */
  it('and a plural matches a singular', () => {
    const s: ASubject = { id: 'm', subject: 'markets', ask: 'Which markets?', words: ['markets'] };
    expect(theyHaveTalkedAbout(s, ['the market in Dawanau'])).toBe(true);
  });
});

describe('and the conversation is wired to prefer whichever is worth more', () => {
  const SRC = require('node:fs').readFileSync(require('node:path').join(__dirname, 'conversation.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('breadth while the ground is untouched, depth after', () => {
    /* One method owns the rank now - see the-same-question-twice - so the guard reads its body. */
    const rank = SRC.slice(SRC.indexOf('private whichHoleToPush('), SRC.indexOf('async theSubjectsToCover('));
    expect(rank).toMatch(/const breadth = breadthFirst\(subjects, theirAnswers, raised\);/);
    expect(rank).toMatch(/return \(breadth \? cover\(\) \?\? gap\(\) : gap\(\) \?\? cover\(\)\)/);
  });

  /* Neither starves: each branch falls back to the other, so a check-in with no subjects read still
     pushes on holes, and one with nothing missing still covers the ground. */
  it('and each falls back to the other', () => {
    const rank = SRC.slice(SRC.indexOf('private whichHoleToPush('), SRC.indexOf('async theSubjectsToCover('));
    expect((rank.match(/cover\(\)/g) ?? []).length).toBe(2);
    expect((rank.match(/gap\(\)/g) ?? []).length).toBe(2);
  });

  /* And coverage counts what was put to them, not only the brief's own vocabulary. */
  it('and both branches are told what has already been raised', () => {
    const rank = SRC.slice(SRC.indexOf('private whichHoleToPush('), SRC.indexOf('async theSubjectsToCover('));
    expect(rank).toMatch(/const raised = notes\?\.covered \?\? \[\];/);
    expect(rank).toMatch(/theSubjectWorthRaising\(subjects, theirAnswers, raised\)/);
    expect(rank).toMatch(/whatToCoverNext\(subjects, theirAnswers, raised\)/);
  });

  /* Read once per check-in, not per turn: every respondent must be asked about the same ground. */
  it('and the subjects are read once and kept on the ground', () => {
    const fn = SRC.slice(SRC.indexOf('async theSubjectsToCover('), SRC.indexOf('async noteWhatTheySaid('));
    expect(fn).toMatch(/if \(Array\.isArray\(already\) && already\.length\) return already;/);
    expect(fn).toMatch(/data: \{ subjectsToCover: subjects as any \}/);
    /* A one-line brief has one subject and the pack already asks about it. */
    expect(fn).toMatch(/brief\.split\(\/\\s\+\/\)\.length < 40/);
  });

  /* A conversation must never fail over this. Where the read fails it is what it was yesterday. */
  it('and a failure leaves the conversation exactly as it was', () => {
    const fn = SRC.slice(SRC.indexOf('async theSubjectsToCover('), SRC.indexOf('async noteWhatTheySaid('));
    expect(fn).toMatch(/Could not read the subjects out of the brief/);
    expect(fn).toMatch(/return \[\];/);
  });
});
