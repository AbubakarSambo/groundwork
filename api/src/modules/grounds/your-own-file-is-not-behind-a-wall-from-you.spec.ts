import * as fs from 'fs';
import * as path from 'path';

/**
 * THE CONTEXT CHAT ASKED FOR A DOCUMENT AND THEN COULD NOT SEE THE ONE IT WAS HANDED.
 *
 * "Why can't a context chat pull our context from a doc that aligns with the scenario?"
 *
 * It can, and it always could - but only for documents whose visibility is OPEN. A document starts
 * private to whoever uploaded it, deliberately: G24 rule 3, because a performance plan or a note
 * about somebody's health dropped into shared context in a hurried first week cannot be recalled.
 *
 * So the sequence that broke was the obvious one. The conversation says "the brief you sent them
 * would settle this". Somebody uploads it, from the button now beside the message box. The next
 * turn tells them no document has been shared with the check-in and asks again.
 *
 * A PERSON'S OWN FILE IS NOT BEHIND A WALL FROM THEM. The wall is other people reading it, and
 * this conversation has exactly one reader - the lead, who is also the uploader. Nobody else's
 * private document is included and OPEN is unchanged for everybody else's.
 */
const service = fs
  .readFileSync(path.join(__dirname, 'grounds.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*$/gm, '');

const contextChat = (() => {
  const at = service.indexOf('async contextChat(');
  expect(at).toBeGreaterThan(-1);
  const next = service.indexOf('\n  async ', at + 1);
  return service.slice(at, next > -1 ? next : undefined);
})();

describe('what the context conversation may read', () => {
  it('reads the documents everybody can read', () => {
    expect(contextChat).toContain("{ visibility: 'OPEN' }");
  });

  it('and the reader\'s own, whatever their visibility', () => {
    expect(contextChat).toContain('{ participant: { userId: requestingUserId } }');
  });

  it('scoped to the person asking, never to everybody\'s private files', () => {
    /* `participant: { userId: requestingUserId }` and not a bare visibility widening: one is the
       lead reading their own upload, the other is the wall coming down. */
    expect(contextChat).not.toMatch(/visibility: \{ in: \[/);
    expect(contextChat).not.toContain("visibility: 'OWN'");
  });

  it('and only ever within this check-in', () => {
    const at = contextChat.indexOf('groundDocument.findMany');
    expect(contextChat.slice(at, at + 260)).toContain('groundId,');
  });
});
