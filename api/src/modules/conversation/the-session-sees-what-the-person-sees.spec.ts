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
const SRC = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8');

describe('the documents that reach the session prompt', () => {
  it('are chosen by the same rule as the documents list', () => {
    expect(SRC).toContain('documentWhereFor(');
  });

  it('and not by a hand-written "mine only" filter', () => {
    /**
     * The exact shape of the old bug. A `groundDocument.findMany` whose where is
     * the participant id and nothing else is the query that shipped, and it
     * would read as perfectly reasonable to anybody adding a second one.
     */
    const handWritten = /groundDocument\.findMany\(\{\s*where:\s*\{\s*groundId:[^}]*participantId:/;
    expect(SRC).not.toMatch(handWritten);
  });

  it('and the flag is passed, so CONTEXT_ENABLED off still means private', () => {
    // documentWhereFor takes the flag as an argument and treats every document
    // as OWN when it is false. Passing `true` unconditionally would be a kill
    // switch that kills nothing.
    expect(SRC).toContain("this.config.get<boolean>('app.contextEnabled') === true");
  });
});
