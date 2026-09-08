import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A SHARED DOCUMENT TOLD ITS READER IT WAS PRIVATE.
 *
 * `whoCanSeeIt` is the sentence beside a document on the Context page. It is produced by
 * `whoCanSeeItInWords(visibility, contextEnabled)` - and with the flag absent it returns the
 * flag-off truth, "Only you can see this. Nobody else on the check-in can open it."
 *
 * The LIST never passed the flag. So an OPEN document - one the lead deliberately shared with
 * everybody, which that same query had just handed to somebody who is not its uploader - was
 * described to that reader as private to her. She would never think to mention it, and would not
 * know the room had read it.
 *
 * The upload path always passed the flag, so a document was described correctly at the moment it
 * was attached and mislabelled on every page load afterwards. Found by reading a real participant's
 * document list, not by reading this function.
 */
const SRC = readFileSync(join(__dirname, 'documents.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('every read that describes a document passes the flag that decides the description', () => {
  const calls = SRC.match(/toDocShape\([^;]*?\)/g)?.filter((c) => !c.startsWith('toDocShape(\n')) ?? [];

  it('found the calls, so an empty match cannot pass', () => {
    expect(calls.length).toBeGreaterThanOrEqual(4);
  });

  it('and each one passes contextEnabled', () => {
    const without = calls.filter((c) => !c.includes('contextEnabled'));
    expect(without).toEqual([]);
  });
});
