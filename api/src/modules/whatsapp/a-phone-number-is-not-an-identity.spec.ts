import { UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { WhatsAppService } from './whatsapp.service';

/**
 * THE WEBHOOK USED TO TAKE A PHONE NUMBER IN THE BODY AS PROOF OF WHO YOU ARE.
 *
 * `receive()` read `message.from`, looked up the matching account, and handed that identity to the
 * conversation engine - which then wrote the caller's text into that person's private check-in AS
 * THEM, and returned the engine's next question. The engine's own ownership check passed, because the
 * identity it was given was forged rather than bypassed.
 *
 * Nothing verified the request came from Meta: the controller is `@Public()` at class level, and both
 * the admin toggle and the credential check govern SENDING. The GET handler's verifyToken is only
 * Meta's subscribe handshake and says nothing about any later POST.
 *
 * Knowing one linked number was therefore enough to author somebody else's account of their own work,
 * and have it reach the report their manager reads.
 */
const SECRET = 'test-app-secret';
const svc = (secret?: string) =>
  new WhatsAppService({ get: (k: string) => (k === 'whatsapp.appSecret' ? secret : undefined) } as any, {} as any);

const sign = (raw: Buffer, secret = SECRET) =>
  'sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex');

describe('a genuine Meta signature is accepted', () => {
  it('passes when the digest matches the raw body', () => {
    const raw = Buffer.from(JSON.stringify({ entry: [{ changes: [] }] }));
    expect(() => svc(SECRET).verifySignature({ 'x-hub-signature-256': sign(raw) }, raw)).not.toThrow();
  });
});

describe('everything else is refused, and the refusal is the point', () => {
  const raw = Buffer.from('{"entry":[]}');

  it('no app secret configured - fails closed rather than open', () => {
    /** The state every unconfigured deployment is in. It must have no live inbound path at all. */
    expect(() => svc(undefined).verifySignature({ 'x-hub-signature-256': sign(raw) }, raw))
      .toThrow(UnauthorizedException);
  });

  it('no signature header at all', () => {
    expect(() => svc(SECRET).verifySignature({}, raw)).toThrow(UnauthorizedException);
  });

  it('a header that is not the sha256 scheme', () => {
    expect(() => svc(SECRET).verifySignature({ 'x-hub-signature-256': 'md5=abc' }, raw)).toThrow(UnauthorizedException);
  });

  it('a signature computed with the wrong secret', () => {
    expect(() => svc(SECRET).verifySignature({ 'x-hub-signature-256': sign(raw, 'attacker') }, raw))
      .toThrow(UnauthorizedException);
  });

  it('a valid signature over DIFFERENT bytes than were sent', () => {
    /** The replay-with-edits case: sign one payload, deliver another. */
    const other = Buffer.from('{"entry":[{"tampered":true}]}');
    expect(() => svc(SECRET).verifySignature({ 'x-hub-signature-256': sign(other) }, raw))
      .toThrow(UnauthorizedException);
  });

  it('a truncated digest, which a naive prefix comparison would accept', () => {
    const good = sign(raw).slice(0, 20);
    expect(() => svc(SECRET).verifySignature({ 'x-hub-signature-256': good }, raw)).toThrow(UnauthorizedException);
  });
});

describe('the controller verifies before it reads anything', () => {
  const SRC = require('fs').readFileSync(__dirname + '/whatsapp.controller.ts', 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  it('verifySignature is called before the body is touched', () => {
    /**
     * PRESENCE ASSERTED BEFORE ORDER, and this is not pedantry - the first version of this test
     * compared indexOf values only, and `indexOf` returns -1 when the thing is absent. Deleting the
     * verification call entirely left `-1 < bodyIndex` true and all nine tests green. A guard that
     * passes BECAUSE the code it guards is gone is worse than no guard, and this repository's own
     * audit found 67 more of the same shape.
     */
    const recv = SRC.slice(SRC.indexOf('async receive('));
    expect(recv).toContain('this.whatsapp.verifySignature(');
    expect(recv).toContain('req.body as any');
    expect(recv.indexOf('verifySignature')).toBeGreaterThan(-1);
    expect(recv.indexOf('verifySignature')).toBeLessThan(recv.indexOf('req.body as any'));
  });

  it('and an unconfigured channel returns before any lookup', () => {
    const recv = SRC.slice(SRC.indexOf('async receive('));
    expect(recv).toMatch(/if \(!\(await this\.whatsapp\.isEnabled\(\)\)\) return/);
    /** Same trap: assert both are present before comparing positions. */
    expect(recv.indexOf('isEnabled')).toBeGreaterThan(-1);
    expect(recv.indexOf('findUserByPhoneNumber')).toBeGreaterThan(-1);
    expect(recv.indexOf('isEnabled')).toBeLessThan(recv.indexOf('findUserByPhoneNumber'));
  });
});
