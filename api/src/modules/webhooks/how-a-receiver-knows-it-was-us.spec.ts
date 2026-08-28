import { sign, verify, nextAttemptAfter, newSecret, BACKOFF_SECONDS } from './how-a-receiver-knows-it-was-us';
import { validateEvents, SENDABLE_EVENTS } from './events-we-can-actually-send';

/**
 * THE SIGNATURE IS VERIFIED WITH THE CODE A CUSTOMER WOULD WRITE.
 *
 * `verify` exists so the documentation can show a receiver exactly how to check, and so this file
 * tests the signature against an independent implementation of the rule rather than against the
 * function that produced it. A test that signs and then calls the same signer proves the signer is
 * deterministic and nothing else.
 */
const BODY = JSON.stringify({ id: 'evt_1', type: 'round.completed', data: { roundNumber: 2 } });
const now = new Date('2026-08-27T10:00:00Z');
const ts = Math.floor(now.getTime() / 1000);

describe('how a receiver knows it was us', () => {
  it('verifies a signature we produced', () => {
    expect(verify(BODY, sign(BODY, 'sec', ts), 'sec', 300, now)).toBe(true);
  });

  it('refuses a changed body', () => {
    const header = sign(BODY, 'sec', ts);
    expect(verify(BODY.replace('2', '9'), header, 'sec', 300, now)).toBe(false);
  });

  it('refuses the wrong secret', () => {
    expect(verify(BODY, sign(BODY, 'sec', ts), 'other', 300, now)).toBe(false);
  });

  it('refuses a replayed old delivery', () => {
    const header = sign(BODY, 'sec', ts);
    const muchLater = new Date(now.getTime() + 3_600_000);
    expect(verify(BODY, header, 'sec', 300, muchLater)).toBe(false);
  });

  it('and the timestamp cannot be edited to make an old one look fresh', () => {
    /*
     * THE REASON THE TIMESTAMP IS INSIDE THE SIGNATURE. If it were a separate header, anybody
     * replaying an old request could rewrite it and the signature would still verify - which
     * defeats the entire point of having one.
     */
    const header = sign(BODY, 'sec', ts);
    const fresher = header.replace(/t=\d+/, `t=${ts + 3600}`);
    expect(verify(BODY, fresher, 'sec', 300, new Date(now.getTime() + 3_600_000))).toBe(false);
  });

  it('refuses a malformed header rather than throwing', () => {
    for (const h of ['', 'nonsense', 't=abc,v1=zz', 'v1=deadbeef', `t=${ts}`]) {
      expect(() => verify(BODY, h, 'sec', 300, now)).not.toThrow();
      expect(verify(BODY, h, 'sec', 300, now)).toBe(false);
    }
  });

  it('a secret is long, random, and announces what it is', () => {
    const a = newSecret(), b = newSecret();
    expect(a).not.toBe(b);
    expect(a.startsWith('gwh_')).toBe(true);
    expect(a.length).toBeGreaterThan(40);
  });
});

describe('when to try again', () => {
  it('backs off, and each wait is longer than the last', () => {
    for (let i = 1; i < BACKOFF_SECONDS.length; i++) {
      expect(BACKOFF_SECONDS[i]).toBeGreaterThan(BACKOFF_SECONDS[i - 1]);
    }
  });

  it('starts quickly, because most failures are a deploy restarting', () => {
    expect(BACKOFF_SECONDS[0]).toBeLessThanOrEqual(60);
  });

  it('gives up after roughly a day rather than hammering a dead endpoint forever', () => {
    const total = BACKOFF_SECONDS.reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(20 * 3600);
    expect(total).toBeLessThan(48 * 3600);
    expect(nextAttemptAfter(BACKOFF_SECONDS.length, now)).toBeNull();
  });

  it('schedules from now, not from when the delivery was created', () => {
    /* Otherwise a delivery that sat in a backlog is instantly overdue on every attempt and burns
       its whole retry budget in one sweep. */
    expect(nextAttemptAfter(0, now)!.getTime()).toBe(now.getTime() + BACKOFF_SECONDS[0] * 1000);
  });
});

describe('only events that can fire are offered', () => {
  it('accepts the ones that exist', () => {
    expect(validateEvents([...SENDABLE_EVENTS])).toEqual({ ok: true });
  });

  it('refuses a subscription that could never deliver anything', () => {
    /*
     * An admin who subscribes to blocker.raised, sees it accepted, and waits forever would conclude
     * their endpoint was broken and spend a day proving it was not. A subscription that cannot fire
     * is a promise the product cannot keep, made in the one place a customer builds against.
     */
    const r = validateEvents(['blocker.raised']);
    expect(r.ok).toBe(false);
    expect((r as any).message).toMatch(/not emitted yet/i);
  });

  it('tells a typo apart from a real event that is not built', () => {
    const r = validateEvents(['made.up', 'handover.ready']) as any;
    expect(r.message).toMatch(/Unknown event\(s\): made\.up/);
    expect(r.message).toMatch(/handover\.ready/);
    expect(r.message).toMatch(/Available now/);
  });

  it('refuses an empty subscription rather than treating it as all', () => {
    /* A customer who adds an endpoint and forgets to choose should get silence, not everything. */
    expect(validateEvents([]).ok).toBe(false);
  });
});
