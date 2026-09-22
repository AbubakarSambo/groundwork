import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * A CHECK-IN MUST BE ABLE TO SEE THE DOCUMENTS THE PERSON CAN SEE. W8-6.
 *
 * `documents.list` was moved onto `documentWhereFor` so an OPEN document - the
 * lead's brief, a grant's terms - reaches everybody on the ground. The query
 * that builds the session prompt was left on `participantId: <mine>`, so a
 * participant could open the Context tab, read the brief the lead had shared
 * with them, start their check-in, and be interviewed by something that had
 * never seen it. The one case OPEN exists for was the one case it did not reach.
 *
 * Asserted against source because the alternative is standing up the whole
 * prompt pipeline to observe a `where` clause, and the clause is the fix.
 */
const SRC = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('the documents that reach the session prompt', () => {
  it('are chosen by the same rule as the documents list', () => {
    expect(SRC).toContain('documentWhereFor(');
  });

  it('and not by a hand-written "mine only" filter', () => {
    /**
     * The exact shape of the old bug. A `groundDocument.findMany` whose where is
     * the participant id and nothing else is the query that shipped, and it
     * would read as perfectly reasonable to anybody adding a second one.
     *
     * SCOPED TO THE PROMPT, 22 September 2026, when a second mine-only query arrived that is
     * correct: `whatTheDocumentWaitsFor` takes the numbers off a document when the person says yes
     * to them, and saying yes in your own check-in must take what YOU attached - never what the lead
     * shared with you. The rule this guards is about what the interview can SEE, so it is asserted
     * over the part of the file that builds the prompt.
     */
    const prompt = SRC.slice(SRC.indexOf('private async composeSystemPrompt('));
    const handWritten = /groundDocument\.findMany\(\{\s*where:\s*\{\s*groundId:[^}]*participantId:/;
    expect(prompt).not.toMatch(handWritten);
    /* And the one exception says what it is for, so it cannot be copied without the reason. */
    const waits = SRC.slice(SRC.indexOf('private async whatTheDocumentWaitsFor('), SRC.indexOf('private async composeSystemPrompt('));
    expect(waits === '' || waits.includes('participantId: checkIn.participantId')).toBe(true);
  });

  it('and the flag is passed, so CONTEXT_ENABLED off still means private', () => {
    // documentWhereFor takes the flag as an argument and treats every document
    // as OWN when it is false. Passing `true` unconditionally would be a kill
    // switch that kills nothing.
    expect(SRC).toContain("this.config.get<boolean>('app.contextEnabled') === true");
  });
});
