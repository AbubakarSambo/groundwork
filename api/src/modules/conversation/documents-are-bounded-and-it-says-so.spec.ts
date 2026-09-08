import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * THE BOUND, AND THE HONESTY ABOUT IT, BOTH HAVE TO BE WIRED.
 *
 * A cap that silently drops the end of somebody's specification is the same failure as no cap: the
 * session sounds informed either way. What makes this an improvement rather than a different bug is
 * that the model is told what it is missing and forbidden from pretending otherwise.
 *
 * Comments stripped: this explanation names the code it protects.
 */
const SRC = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, '');

/*
 * Bounded FORWARD from the start of the block. My first version ended it at the next mention of
 * `between-session-notes`, which appears far earlier in this file - so the slice ran backwards and
 * was empty, and three assertions failed against perfectly correct code.
 */
const FROM = SRC.indexOf('const fitted = whatFitsInTheRoom');
const BLOCK = SRC.slice(FROM, SRC.indexOf('between-session-notes', FROM));

describe('documents are bounded and the session is told', () => {
  it('bounds them at all', () => {
    expect(BLOCK).toContain('whatFitsInTheRoom(');
  });

  it('reads the newest first, because that is the one they are about to talk about', () => {
    /* `withProvenance` is `uploadedDocs` with a line attached to each saying who provided it and
       who can read it - see where-this-document-came-from.ts. What this pins is the REVERSE. */
    expect(BLOCK).toContain('[...withProvenance].reverse()');
  });

  it('tells the session what did not fit', () => {
    expect(BLOCK).toContain('tellThemWhatIsMissing(fitted.leftOut)');
  });

  it('and never silently, which is the whole point', () => {
    /* A truncation nobody is told about is indistinguishable from having read everything. */
    expect(BLOCK).toContain('documents that did not fit the prompt');
  });

  it('no longer concatenates every document whole', () => {
    expect(BLOCK).not.toContain('uploadedDocs.map((d)');
  });
});
