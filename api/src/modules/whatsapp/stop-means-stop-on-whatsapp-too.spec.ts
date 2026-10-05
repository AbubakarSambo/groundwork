import { readFileSync } from 'fs';
import { join } from 'path';
import { A_STOP_WORD, A_START_WORD, THEY_SAID_STOP } from './a-message-outside-the-window';

/** A person must be able to stop this by the means the channel itself offers. The router knew only finish, complete, done and close. */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const handler = strip(readFileSync(join(__dirname, '..', 'public-api', 'whatsapp-for-an-organisation.service.ts'), 'utf8'));
const service = strip(readFileSync(join(__dirname, 'whatsapp.service.ts'), 'utf8'));

describe('the words', () => {
  it('stop and start, alone', () => {
    for (const w of ['STOP', 'stop.', 'unsubscribe', 'opt out']) expect(A_STOP_WORD.test(w)).toBe(true);
    expect(A_STOP_WORD.test('stop chasing the supplier')).toBe(false);
    for (const w of ['START', 'unstop', 'resume']) expect(A_START_WORD.test(w)).toBe(true);
  });
});

describe('the handler', () => {
  it('writes the stop and says so, before anything is opened or answered', () => {
    const stop = handler.indexOf('A_STOP_WORD.test(arrived.text)');
    const open = handler.indexOf('await this.openCheckInsFor(');
    expect(stop).toBeGreaterThan(-1);
    expect(stop).toBeLessThan(open);
    expect(handler).toContain('data: { whatsappStoppedAt: new Date() }');
    expect(handler).toContain("data: { whatsappStoppedAt: null, whatsappConsentAt: new Date() }");
  });
  it('and every message the person writes moves their window clock', () => {
    expect(handler).toContain('data: { whatsappLastInboundAt: new Date() }');
  });
});

describe('the sender', () => {
  it('refuses a business-initiated message to somebody who said stop, and says why in the record', () => {
    expect(service).toContain("if (person?.whatsappStoppedAt || (await this.saidStopFrom(to))) return { free: false, template: null, because: THEY_SAID_STOP };");
    expect(THEY_SAID_STOP).toMatch(/STOP/);
  });
});
