import { sign, signWithBoth, verify, newSecret } from './how-a-receiver-knows-it-was-us';

/**
 * THE GRACE PERIOD WAS ADVERTISED AND DID NOT EXIST.
 *
 * `rotateSecret` stored the old secret and answered `previousSecretAcceptedUntilNextRotation:
 * true`, and nothing in the codebase read that column. Every delivery after a rotation was signed
 * with the new secret alone, so a receiver still holding the old one failed verification on the
 * very next event — the exact outage the grace period exists to prevent, promised in our own
 * response body.
 *
 * The first test is a rotation as a customer lives it: they rotate, they have not deployed the new
 * secret yet, and the events keep arriving.
 */
const BODY = JSON.stringify({ event: 'round.completed', groundId: 'g1' });
const now = new Date('2026-09-07T12:00:00Z');
const t = Math.floor(now.getTime() / 1000);

describe('a rotation nobody has finished deploying', () => {
  const oldSecret = newSecret();
  const newer = newSecret();

  it('the receiver still on the old secret keeps verifying', () => {
    const header = signWithBoth(BODY, { current: newer, previous: oldSecret }, t);
    expect(verify(BODY, header, oldSecret, 300, now)).toBe(true);
  });

  it('and so does the one that has deployed the new one', () => {
    const header = signWithBoth(BODY, { current: newer, previous: oldSecret }, t);
    expect(verify(BODY, header, newer, 300, now)).toBe(true);
  });

  it('a secret that was never ours verifies neither way', () => {
    const header = signWithBoth(BODY, { current: newer, previous: oldSecret }, t);
    expect(verify(BODY, header, newSecret(), 300, now)).toBe(false);
  });

  it('once the rotation is finished, only the current secret works', () => {
    /* The grace ends when the next rotation clears `previousSecret`, which is what the API says. */
    const header = signWithBoth(BODY, { current: newer, previous: null }, t);
    expect(verify(BODY, header, newer, 300, now)).toBe(true);
    expect(verify(BODY, header, oldSecret, 300, now)).toBe(false);
  });
});

describe('the header itself', () => {
  it('carries two signatures during a rotation and one otherwise', () => {
    const both = signWithBoth(BODY, { current: 'a', previous: 'b' }, t);
    expect([...both.matchAll(/v1=/g)]).toHaveLength(2);
    expect([...signWithBoth(BODY, { current: 'a' }, t).matchAll(/v1=/g)]).toHaveLength(1);
  });

  it('never repeats the same signature, which would tell a receiver nothing', () => {
    const same = signWithBoth(BODY, { current: 'a', previous: 'a' }, t);
    expect([...same.matchAll(/v1=/g)]).toHaveLength(1);
  });

  it('is still the one-signature shape every existing receiver already parses', () => {
    expect(signWithBoth(BODY, { current: 'a' }, t)).toBe(sign(BODY, 'a', t));
  });

  it('keeps the timestamp inside what is signed', () => {
    /* Otherwise a replay can change the age freely and still verify. */
    const header = signWithBoth(BODY, { current: 'a', previous: 'b' }, t);
    const moved = header.replace(`t=${t}`, `t=${t + 400}`);
    expect(verify(BODY, moved, 'a', 300, now)).toBe(false);
  });

  it('and still refuses an old delivery', () => {
    const header = signWithBoth(BODY, { current: 'a', previous: 'b' }, t - 600);
    expect(verify(BODY, header, 'a', 300, now)).toBe(false);
  });

  it('and a changed body', () => {
    const header = signWithBoth(BODY, { current: 'a', previous: 'b' }, t);
    expect(verify('{"event":"something.else"}', header, 'a', 300, now)).toBe(false);
  });
});

describe('what the sender actually puts on the wire', () => {
  const fs = require('fs') as typeof import('fs');
  const path = require('path') as typeof import('path');
  const service = fs
    .readFileSync(path.join(__dirname, 'webhooks.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  it('signs with both, rather than with the current secret alone', () => {
    expect(service).toContain('signWithBoth');
    expect(service).toContain('previous: d.endpoint.previousSecret');
  });

  it('and the column it promises is read by something', () => {
    /* The whole defect in one line: the API returned a field about `previousSecret` while nothing
       anywhere consulted it. */
    expect(service).toContain('previousSecret');
    expect(service.indexOf('previousSecretAcceptedUntilNextRotation')).toBeGreaterThan(-1);
  });
});
