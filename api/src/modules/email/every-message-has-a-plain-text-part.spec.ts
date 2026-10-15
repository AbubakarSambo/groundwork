import { readFileSync } from 'fs';
import { join } from 'path';
import { plainTextOf, UNSUBSCRIBE_FOOTER } from './email.service';

/**
 * EVERY MESSAGE HAS A PLAIN TEXT PART AND A WAY OUT. Forty-eight senders, one chokepoint: the text
 * part is generated from the HTML each sender already composes, the unsubscribe footer and the
 * List-Unsubscribe headers are added there for every mail we decided to send, and the way-back-in
 * mails carry neither.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const service = strip(readFileSync(join(__dirname, 'email.service.ts'), 'utf8'));
const send = service.slice(service.indexOf('private async sendEmail('), service.indexOf('private layout('));

describe('the text part', () => {
  it('keeps the words and the link addresses, and drops the markup', () => {
    const t = plainTextOf('<p>Hi &amp; hello</p><p><a href="https://x.test/go" style="x">Read it</a></p>');
    /* Changed 11 October: paragraphs are now separated by a blank line, as a text-only mail program needs to read them as paragraphs. */
    expect(t).toBe('Hi & hello\n\nRead it (https://x.test/go)');
  });
  it('is passed to the provider on every production send', () => {
    expect(send).toMatch(/const text = plainTextOf\(options\.html\);/);
    expect(send).toMatch(/emails\.send\(\{ from: this\.fromEmail, \.\.\.options, text,/);
  });
});

describe('the way out', () => {
  it('is added for every mail we decided to send, as a footer and as the headers a mail client reads', () => {
    /* Changed 8 October: the footer was on everything except the way back in, so mail an unsubscribed person still gets carried a "stop them here" that stopped nothing. It is on what we decide to send (the-stop-link-is-only-where-it-stops.spec.ts). */
    expect(send).toMatch(/whatThisMailIs\(sender\) === 'we decided to send it' \? await this\.theWayToStopHearingFromUs\(options\.to\) : null/);
    expect(send).toContain("'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'");
    expect(UNSUBSCRIBE_FOOTER('https://x.test/u/t')).toContain('href="https://x.test/u/t"');
  });
  /* Changed under decision 109: the old test held that an address on no roster got no footer, which is the defect. Everyone has one now; the behaviour is read in engagement/everyone-can-stop-the-mail-we-decide-to-send.spec.ts. */
  it('is minted from the preference row the digest uses for a person on a roster, and from the address alone for everybody else', () => {
    expect(service).toMatch(/emailPreference\.upsert\(\{\s*where: \{ organizationId_personExternalId/);
    expect(service).toMatch(/emailAddressPreference\.upsert\(/);
  });
});
