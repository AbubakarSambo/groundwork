import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Hafsah, 26 October 2026: "document synthesize needs to happen each chat where it tells them whats in the doc and uses it as context, we
 * used to have that on the product". The check-in's prompt said "Do not summarise the document"; WhatsApp only said the file was on the
 * check-in; the first-check-in part of setup sent the file with no ask to read it.
 */
const read = (...p: string[]) => readFileSync(join(__dirname, ...p), 'utf8');
describe('what is in a document is said back, in every chat', () => {
  it('the check-in says what is in it, as written, then asks what it confirms', () => {
    const src = read('conversation.service.ts').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(src).not.toContain('Do not summarise the document.');
    expect(src).toContain('say in two to four short sentences what is in it that matters to this check-in, from the whole of it and not only its start');
  });
  it('WhatsApp says the same back after the file arrives', () => {
    const wa = read('..', 'public-api', 'whatsapp-for-an-organisation.service.ts');
    expect(wa).toContain('documentReceived?.(current.id, userId!)');
    expect(wa).toContain('${readBack ? `\\n\\n${readBack}` : \'\'}');
  });
  it('setup asks Groundwork to say what is in it and use it, in both parts', () => {
    const entry = read('..', '..', '..', '..', 'client', 'src', 'pages', 'enter', 'EntryChatPage.tsx');
    expect(entry).toContain('Please read it and tell me what you gathered from it that I have not already said, then continue.');
    expect(entry).toContain('Please read it, tell me in a few short lines what is in it that I have not already said, and use it from now on.');
  });
});
