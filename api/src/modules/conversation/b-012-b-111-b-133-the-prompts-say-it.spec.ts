import { readFileSync } from 'fs';
import { join } from 'path';
import { THE_OPENER_IS_ONE_MESSAGE } from './the-first-thing-it-says-is-its-own-job';
import { thePictureInstruction } from '../reports/the-picture-in-plain-sentences';

/* Comments are taken out before anything is matched, so a sentence in a comment cannot satisfy a check (a-guard-that-a-comment-satisfies-is-not-a-guard). */
const withoutComments = (t: string): string => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');


/**
 * B-012, B-111 and B-133 are faults in what the model writes, so each is fixed in the instruction the model
 * reads. None of these three is stored as a PromptVersion row: each is built in code on every call, so the
 * text checked here is the text that runs. Whether the model now follows it needs confirming when quality
 * testing returns.
 */
describe('the instructions the model reads carry each fix', () => {
  it('B-133: the opener says "Last time you said", never the lead\'s name in front of their own words', () => {
    expect(THE_OPENER_IS_ONE_MESSAGE).toContain('WHAT THEY SAID LAST TIME IS THEIRS.');
    expect(THE_OPENER_IS_ONE_MESSAGE).toContain('say "Last time you said ..."');
    expect(THE_OPENER_IS_ONE_MESSAGE).toContain('never write "says" about something said before');
  });

  it('B-111: after the count, only the people who answered are described', () => {
    const p = thePictureInstruction({ peopleAnswered: 1, peopleExpected: 6, differenceTopics: [], aboutOnePerson: false });
    expect(p).toContain('Open with this sentence, exactly as it is: "One of the six people has answered so far."');
    expect(p).toContain('AFTER THAT SENTENCE, WRITE ONLY ABOUT THE PEOPLE WHO HAVE ANSWERED.');
    expect(p).toContain('never give a count of people larger than the number who\nhave answered');
  });

  it('B-012: the setup chat never sends the "Context and Setup tabs" sentence as its whole reply', () => {
    const src = withoutComments(readFileSync(join(__dirname, '../entry/entry.service.ts'), 'utf8'));
    const system = src.slice(src.indexOf('const ONBOARD_SYSTEM = `'));
    expect(system).toContain('NEVER SEND THAT SECOND SENTENCE ON ITS OWN, AND NEVER AS THE WHOLE REPLY');
    expect(system).toContain('says back, in half a sentence, what they just told you, including what is still undecided');
  });
});
