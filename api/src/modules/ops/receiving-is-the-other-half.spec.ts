/**
 * WE PUSHED FOR MONTHS AND SUBSCRIBED TO NOTHING.
 *
 * Half of being a customer is receiving, and it is the half that flatters us
 * less: a released report had to be gone and found, and a commitment somebody
 * made in a check-in never reached the board they are measured on.
 */
import { createHmac } from 'crypto';
import {
  isReallyFromGroundwork,
  whatItMeansForUs,
  TOLERANCE_SECONDS,
} from './what-groundwork-tells-us';

const SECRET = 'gwh_test_secret';
const body = JSON.stringify({ event: 'round.completed', groundId: 'g-123456789', roundNumber: 2 });

const signedNow = (raw = body, at = new Date(), secret = SECRET) => {
  const t = Math.floor(at.getTime() / 1000);
  return `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${raw}`).digest('hex')}`;
};

/**
 * A ROTATION SENDS TWO SIGNATURES, and this receiver read the first one only — so the day the
 * product rotated its secret, our own back office would have started refusing its own deliveries.
 */
describe('a signing secret being rotated', () => {
  it('accepts a delivery signed with both the old secret and the new one', () => {
    const body = JSON.stringify({ kind: 'round.completed', payload: {} });
    const t = Math.floor(Date.now() / 1000);
    const mac = (secret: string) =>
      require('crypto').createHmac('sha256', secret).update(`${t}.${body}`).digest('hex');
    const header = `t=${t},v1=${mac('the-new-one')},v1=${mac('the-one-we-hold')}`;

    expect(isReallyFromGroundwork(body, header, 'the-one-we-hold')).toEqual({ ok: true });
    expect(isReallyFromGroundwork(body, header, 'the-new-one')).toEqual({ ok: true });
    expect(isReallyFromGroundwork(body, header, 'never-ours').ok).toBe(false);
  });
});

describe('checking it really came from Groundwork', () => {
  it('accepts a correctly signed delivery', () => {
    expect(isReallyFromGroundwork(body, signedNow(), SECRET)).toEqual({ ok: true });
  });

  it('refuses a body that changed after signing', () => {
    const header = signedNow();
    const tampered = body.replace('roundNumber":2', 'roundNumber":9');
    expect(isReallyFromGroundwork(tampered, header, SECRET).ok).toBe(false);
  });

  it('refuses a replay from outside the window', () => {
    /**
     * The timestamp is INSIDE the signature. If it sat outside, anybody
     * replaying an old delivery could change it freely and the signature would
     * still verify — which defeats the point of having one.
     */
    const old = new Date(Date.now() - (TOLERANCE_SECONDS + 60) * 1000);
    const said = isReallyFromGroundwork(body, signedNow(body, old), SECRET);
    expect(said.ok).toBe(false);
    expect((said as { because: string }).because).toContain('outside the window');
  });

  it('refuses somebody else\'s secret', () => {
    expect(isReallyFromGroundwork(body, signedNow(body, new Date(), 'someone-elses'), SECRET).ok).toBe(false);
  });

  it('and says why, every time', () => {
    /* A failure is recorded rather than dropped: somebody sending badly signed
       events is a thing to know about, and a silent rejection tells nobody. */
    for (const header of [undefined, 'nonsense', 't=1,v1=zz']) {
      const said = isReallyFromGroundwork(body, header, SECRET);
      expect(said.ok).toBe(false);
      expect((said as { because: string }).because.length).toBeGreaterThan(5);
    }
  });

  it('and is written here rather than imported from the product', () => {
    /**
     * Twice deliberate. The boundary forbids this back office reaching into a
     * product module — and a customer receiving these writes exactly this, from
     * the documentation, without our source. If the documented scheme is unclear,
     * we are the first ones outside it to find out.
     */
    const source = require('fs')
      .readFileSync(require('path').join(__dirname, 'what-groundwork-tells-us.ts'), 'utf8');
    expect(source).not.toMatch(/from '\.\.\/(webhooks|conversation|grounds|reports)/);
  });
});

describe('what an event means for us', () => {
  it('reads the three that matter and leaves the rest', () => {
    /* Writing a handler for an event nobody uses produces code that is never
       exercised and rots silently — the same disease as a route no screen
       reaches. The payload is kept whole either way. */
    expect(whatItMeansForUs('round.completed', { groundId: 'g-123456789' })).toContain('report is ready');
    expect(whatItMeansForUs('checkin.completed', { groundId: 'g-1' })).toContain('finished their check-in');
    expect(whatItMeansForUs('blocker.raised', { groundId: 'g-1' })).toContain('somebody is waiting');
    expect(whatItMeansForUs('scenario.proposed', { groundId: 'g-1' })).toBeNull();
  });

  it('and never goes looking for who or what they said', () => {
    /* A webhook carries a fact and a pointer. That is the sender's rule, and
       this must not quietly expect more than it. */
    const source = require('fs')
      .readFileSync(require('path').join(__dirname, 'what-groundwork-tells-us.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    expect(source).not.toMatch(/personExternalId|displayName|content|text|answer/);
  });
});
