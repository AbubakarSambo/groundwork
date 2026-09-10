import { readFileSync } from 'fs';
import { join } from 'path';
import { insideTheServiceWindow, isBusinessInitiated, templateFor, TEMPLATES, SERVICE_WINDOW_MS, OUTSIDE_THE_WINDOW } from './a-message-outside-the-window';

/**
 * A MESSAGE OUTSIDE THE WINDOW GOES AS A TEMPLATE, OR NOT AT ALL. Every outbound was free text, so a
 * business-initiated send outside Meta's 24-hour window was money spent on a rejection. The window is
 * checked before anything is composed; a template goes only once Meta has approved its name.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const service = strip(readFileSync(join(__dirname, 'whatsapp.service.ts'), 'utf8'));

describe('the window', () => {
  const now = new Date('2026-09-11T12:00:00Z');
  it('is 24 hours from the last time THIS person wrote, and nothing when they never have', () => {
    expect(insideTheServiceWindow(new Date(now.getTime() - SERVICE_WINDOW_MS + 60_000), now)).toBe(true);
    expect(insideTheServiceWindow(new Date(now.getTime() - SERVICE_WINDOW_MS - 60_000), now)).toBe(false);
    expect(insideTheServiceWindow(null, now)).toBe(false);
  });
  it('a reply is never business-initiated; a notice the product starts is', () => {
    expect(isBusinessInitiated('reply')).toBe(false);
    expect(isBusinessInitiated(undefined)).toBe(false);
    for (const k of ['session-ready', 'opening', 'report']) expect(isBusinessInitiated(k)).toBe(true);
  });
  it('a template is used only once its name is approved', () => {
    expect(templateFor('session-ready', [])).toBeNull();
    expect(templateFor('session-ready', [TEMPLATES['session-ready'].name])?.name).toBe('groundwork_session_ready');
    expect(templateFor('reply', ['groundwork_session_ready'])).toBeNull();
  });
});

describe('the service', () => {
  it('gates both senders before composing or paying, and records a message it did not send with the reason', () => {
    expect(service.match(/const gate = await this\.mayInitiate\(/g)?.length).toBe(2);
    expect(service).toContain('if (insideTheServiceWindow(person?.whatsappLastInboundAt)) return { free: true };');
    expect(service).toContain('because: OUTSIDE_THE_WINDOW');
    expect(OUTSIDE_THE_WINDOW).toMatch(/not sent$/);
    expect(service).toMatch(/type: 'template'/);
  });
  it('the callers that start a conversation say which kind of message they are sending', () => {
    expect(strip(readFileSync(join(__dirname, '..', 'grounds', 'grounds.cron.ts'), 'utf8'))).toMatch(/kind: 'session-ready'/);
    expect(strip(readFileSync(join(__dirname, '..', 'webhooks', 'webhooks.listener.ts'), 'utf8'))).toMatch(/kind: 'opening'/);
  });
});
