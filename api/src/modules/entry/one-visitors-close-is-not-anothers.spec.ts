import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * ONE VISITOR'S CLOSE IS NOT ANOTHER'S. Whether a reply closed the session was a field on a singleton
 * service serving a public route, read by the controller after an await - two visitors finishing in
 * the same tick decided each other's close. The flag travels with the reply.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const service = strip(readFileSync(join(__dirname, 'entry.service.ts'), 'utf8'));
const controller = strip(readFileSync(join(__dirname, 'entry.controller.ts'), 'utf8'));

describe('the close flag', () => {
  it('is not a field on the service', () => {
    expect(service).not.toContain('lastReplyHadCloseMarker');
    expect(service).not.toContain('didLastReplyClose');
    expect(controller).not.toContain('didLastReplyClose');
  });
  it('comes back beside the reply and is what the controller reads', () => {
    /*
     * The reply is now read once more before it is sent, so the returned text is the reader's,
     * while the close flag is still read off the SAME `best` the reply was made from. That pairing
     * is what this file is about, and pinning the literal old line hid it behind a rename.
     */
    expect(service).toMatch(/return \{ reply: \w+, closed: hadCloseMarker\(best\) \};/);
    expect(service).toMatch(/async chat\([\s\S]*?\): Promise<\{ reply: string; closed: boolean \}>/);
    expect(controller).toMatch(/const \{ reply, closed \} = await this\.service\.chat\(/);
    expect(controller).toMatch(/private sessionCompleteFrom\(reply: string, markerClosed: boolean\)/);
  });
});
