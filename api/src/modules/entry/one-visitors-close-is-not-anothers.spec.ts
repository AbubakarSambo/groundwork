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
    /* The close is read once from what the model wrote, before the text is cleaned (issue 48, fix plan group 5), and travels beside it. */
    expect(service).toMatch(/const \{ text: reply, hadMarker: closed \} = stripCloseMarker\(raw\);/);
    expect(service).toMatch(/return \{ reply: forHumans\(restored\), closed \};/);
    expect(service).toMatch(/async chat\([\s\S]*?\): Promise<\{ reply: string; closed: boolean; promptVersionId\?: string \| null \}>/);
    expect(controller).toMatch(/const \{ reply, closed(, promptVersionId)? \} = await this\.service\.chat\(/);
    expect(controller).toMatch(/private sessionCompleteFrom\(reply: string, markerClosed: boolean\)/);
  });
});
