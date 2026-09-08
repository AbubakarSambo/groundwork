import {
  aDirectiveAboutRepeatingYourself,
  howAlikeTheseQuestionsAre,
  isTheSameQuestion,
  questionsIn,
  SAME_QUESTION_AT,
  whatItIsAsking,
} from './asked-twice-is-a-loop';

/**
 * THE PAIRS THIS WAS MEASURED AGAINST, taken off two live runs rather than invented.
 *
 * The threshold is the whole design, so the cases that must NOT fire are as important as the ones
 * that must: a setup conversation is a series of different questions, and a guard that fires on
 * ordinary progress would stop the chat asking anything twice about anything.
 */
const THE_SAME_QUESTION = [
  [
    'What do you want to get out of having this written down?',
    "What's the main reason for getting this on record right now?",
  ],
  [
    'What do you hope having this record will help you and Margaret achieve in her first few weeks?',
    "What's the most important thing you want to establish by setting this up for her?",
  ],
  [
    'Is this something you want to come back to as her role develops?',
    'Is this a one-off check-in just for her onboarding, or something you plan to use more than once as she settles in?',
  ],
  [
    'What do you want to get out of having this written down?',
    'So, thinking about the process, what do you want to get out of having this written down?',
  ],
];

const DIFFERENT_QUESTIONS = [
  ['Who is the new hire, and what did you bring them in to do?', 'And when does Margaret start?'],
  ['What is their name, or their role?', 'What do you want to get out of having this written down?'],
  ['Is there anything you want the questions to focus on?', 'Who else is part of this?'],
];

describe('telling a repeat from progress', () => {
  it('reads the questions out of a reply, and ignores the rest of it', () => {
    expect(questionsIn('Got it, thanks. And when does Margaret start?')).toEqual(['And when does Margaret start?']);
    expect(questionsIn('Okay. That is on the record.')).toEqual([]);
  });

  it('calls the live repeats the same question', () => {
    /* The first pair is 0.13 similar by word overlap and is plainly the same question, which is
       why subject comes first and overlap sits underneath it. */
    for (const [a, b] of THE_SAME_QUESTION) {
      expect(isTheSameQuestion(a, b)).toBe(true);
    }
    expect(howAlikeTheseQuestionsAre(...(THE_SAME_QUESTION[0] as [string, string]))).toBeLessThan(SAME_QUESTION_AT);
  });

  it('and calls genuinely different questions different', () => {
    for (const [a, b] of DIFFERENT_QUESTIONS) {
      expect(isTheSameQuestion(a, b)).toBe(false);
    }
  });

  it('reads the subject where there is one, and admits when there is not', () => {
    expect(whatItIsAsking('Is this a one-off, or something you come back to as it goes?')).toBe('how long this runs');
    expect(whatItIsAsking('What do you want to get out of having this written down?')).toBe('what they want out of it');
    expect(whatItIsAsking('And how did the handover go?')).toBeNull();
  });
});

describe('the directive', () => {
  const turn = (role: string, content: string) => ({ role, content });

  it('is not issued on a first ask', () => {
    expect(aDirectiveAboutRepeatingYourself([
      turn('user', 'A new hire'),
      turn('assistant', 'Who is the new hire?'),
    ])).toBeNull();
  });

  it('is not issued while the questions keep moving', () => {
    expect(aDirectiveAboutRepeatingYourself([
      turn('assistant', 'Who is the new hire, and what did you bring them in to do?'),
      turn('user', 'Margaret, to bring in revenue'),
      turn('assistant', 'And when does Margaret start?'),
    ])).toBeNull();
  });

  it('is issued on the second ask of the same question, quoting both', () => {
    const out = aDirectiveAboutRepeatingYourself([
      turn('assistant', THE_SAME_QUESTION[0][0]),
      turn('user', 'she starts next week on the 15th'),
      turn('assistant', THE_SAME_QUESTION[0][1]),
    ]);
    expect(out).toContain('DO NOT ASK IT A THIRD TIME');
    expect(out).toContain(THE_SAME_QUESTION[0][0]);
    expect(out).toContain(THE_SAME_QUESTION[0][1]);
  });

  it('and tells it what to do instead, which is not to rephrase and ask again', () => {
    const out = aDirectiveAboutRepeatingYourself([
      turn('assistant', THE_SAME_QUESTION[1][0]),
      turn('user', 'is this about me or someone else'),
      turn('assistant', THE_SAME_QUESTION[1][1]),
    ])!;
    expect(out).toContain('take the answer their situation makes obvious');
    expect(out).toContain('Never rephrase them and ask again');
  });

  it('survives a reply with no question in it', () => {
    expect(aDirectiveAboutRepeatingYourself([
      turn('assistant', 'Noted.'),
      turn('user', 'ok'),
      turn('assistant', 'Saved.'),
    ])).toBeNull();
  });
});

describe('the setup call applies it', () => {
  const service = require('fs')
    .readFileSync(require('path').join(__dirname, 'entry.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  it('appends the directive to the setup prompt for that turn only', () => {
    expect(service).toContain('const repeating = aDirectiveAboutRepeatingYourself(');
    expect(service).toMatch(/repeating \? `\$\{setupPrompt\}/);
  });
});
