import * as fs from 'fs';
import * as path from 'path';

/**
 * THE SETUP CONVERSATION IS SOMETHING A MODEL SAYS TO A PERSON, SO IT GOES THROUGH THE BOUNDARY.
 *
 * `contextChat` returned the model's reply straight to the screen. Found the moment CONTEXT_ENABLED
 * was switched on and this surface was watched for the first time: it opened with
 *
 *     "To set up this ground, I need to know what the new hire is there to do."
 *
 * which is the exact leak the vocabulary work exists to stop - and a hardcoded reply beside it said
 * "This ground has what it needs".
 *
 * THE WORD WAS THE SYMPTOM. `forHumans` is where control markers, markdown, em dashes, house style
 * and the product's own noun are all settled, and this surface had NONE of it. A model reply that
 * skips the boundary is not slightly unpolished, it is unprocessed.
 *
 * WHY IT SURVIVED SO LONG: the flag was off, so nobody had ever seen this screen.
 */
const SERVICE = fs
  .readFileSync(path.join(__dirname, 'grounds.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

const CHAT = SERVICE.slice(SERVICE.indexOf('async contextChat('), SERVICE.indexOf('async addLeadContext('));

describe('the setup chat goes through the boundary', () => {
  it('the reply does', () => {
    /* `changeSay` is the reply on a turn where they asked to change something - see
       what-the-lead-wants-changed. Either way it goes through the boundary. */
    expect(CHAT).toContain('reply: forHumans(changeSay ?? reply)');
  });

  /** The proposal is said to a person too - "I will set this to run for 90 days" - so it does as well. */
  it('and so does the proposal it asks you to confirm', () => {
    expect(CHAT).toContain('say: forHumans(proposal.say)');
  });

  /** The hardcoded reply beside it carried the same word, and no boundary can fix a literal. */
  it('and the written-out reply uses the product\'s own noun', () => {
    expect(CHAT).toContain('This check-in has what it needs');
    expect(CHAT).not.toContain('This ground has what it needs');
  });
});
