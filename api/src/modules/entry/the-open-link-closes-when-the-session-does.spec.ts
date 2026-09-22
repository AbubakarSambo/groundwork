import { readFileSync } from 'fs';
import { join } from 'path';

const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

/**
 * "YOUR REPORT IS READY NOW. SPEAK SOON." - and the box stayed open under it, so the person typed
 * two more questions into a session that had ended and got answers to neither (22 September 2026).
 */
describe('the open link closes when the session does', () => {
  it('passes the engine’s own flag through, rather than only the words', () => {
    const svc = strip(readFileSync(join(__dirname, 'the-open-link.service.ts'), 'utf8'));
    const say = svc.slice(svc.indexOf('async say('), svc.indexOf('async finish('));
    /* sendMessage returns { reply, sessionComplete } and this returns it whole. */
    expect(say).toContain('return this.conversation.sendMessage(checkIn.id, { theParticipant: row.id }, message);');
    const api = strip(readFileSync(join(__dirname, '..', '..', '..', '..', 'client', 'src', 'api', 'entry.ts'), 'utf8'));
    expect(api).toContain("apiClient.post<{ reply: string; sessionComplete?: boolean }>('/entry/open-say'");
  });

  it('and the page moves to the ending rather than leaving the box open', () => {
    const page = strip(readFileSync(join(__dirname, '..', '..', '..', '..', 'client', 'src', 'pages', 'join', 'AnswerFirstPage.tsx'), 'utf8'));
    expect(page).toContain("if (back.sessionComplete) setPhase('address')");
  });
});
