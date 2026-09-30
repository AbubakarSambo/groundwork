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
    /*
     * `changeSay` is the reply on a turn where they asked to change something - see
     * what-the-lead-wants-changed. FIX 3 (30 September 2026) added `spokenReply`, which is exactly
     * `changeSay ?? reply` with the opening turn's greeting stripped - still built from the same two
     * sources, and still returned through `forHumans` either way, so the boundary this test protects
     * is unchanged.
     *
     * FOUND LIVE AGAIN, 30 September 2026, on the four live checks: `changeSay` is the PRODUCT's own
     * sentence, built deterministically in this function (`restatesSuccess`/`whatTheyWantChanged`),
     * never the model's - so it no longer passes through the model-sentence guard at all (rule 2 of
     * the fix). Only `reply`, the model's own text, does, and only through `whatTheModelsReplyShows`,
     * which reads structurally for a question rather than by pattern - see
     * nothing-proposed-that-nobody-said.ts.
     */
    /* Request 92, point 7: the model's own text also loses any sentence with the bare word "ground", and
       says nothing at all beside a Yes and No answer (Ask Groundwork). */
    expect(CHAT).toContain("whatTheModelsReplyShows(withoutTheWordGround(reply), proposal.kind !== 'none')");
    expect(CHAT).toContain("const withoutFalsePromises = changeSay ?? (yesOrNoOnly ? '' :");
    expect(CHAT).toContain('const spokenReply = isOpeningTurn ? withoutTheOpeningGreeting(withoutFalsePromises) : withoutFalsePromises;');
    expect(CHAT).toContain('let replyText = forHumans(openedOn ? `${openedOn} ${spokenReply}`.trim() : spokenReply);');
  });

  /**
   * The proposal is said to a person too - "I will set this to run for 90 days" - so it does as
   * well.
   *
   * FOUND LIVE, 30 September 2026, on the four live checks (item 16): the reply and `proposal.say`
   * used to be built from the same source and shown twice on the one turn - once as the reply, again
   * underneath it as the say-back. `sayBack` is computed once, through `forHumans`, and the reply is
   * checked against it so a lead is never shown the same sentence twice on one turn - see the
   * "shown once, not shown twice" test below.
   */
  it('and so does the proposal it asks you to confirm', () => {
    /* Every proposal goes through the boundary except the paste's list, which the product writes itself
       and which forHumans would run into one paragraph (request 92, point 6). */
    expect(CHAT).toContain("(proposal.kind as string) === 'everything' ? (proposal.say as string) : forHumans(proposal.say);");
    expect(CHAT).toContain('say: sayBack as string,');
  });

  it('the reply never repeats the say-back word for word', () => {
    expect(CHAT).toContain('if (sayBack && (replyText === sayBack || replyText.includes(sayBack))) {');
  });

  /** The hardcoded reply beside it carried the same word, and no boundary can fix a literal. */
  it('and the written-out reply uses the product\'s own noun', () => {
    expect(CHAT).toContain('This check-in has what it needs');
    expect(CHAT).not.toContain('This ground has what it needs');
  });
});
