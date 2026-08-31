import { roundCompletedPayload, checkInCompletedPayload, NEVER_IN_A_PAYLOAD } from './what-a-webhook-may-carry';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * A WEBHOOK LEAVES THE BOUNDARY AND DOES NOT COME BACK.
 *
 * It lands in a customer's systems, is logged by their gateway, forwarded by their alerting, and
 * read by whoever has access to any of that. This is the one surface where "only admins can see it"
 * stops being true, so the §12.8 exclusions bind harder here than anywhere else in the product.
 *
 * The rule: a fact and a pointer. Something happened, here is which thing, come and look with
 * credentials. Never what anybody said, never a judgement about a person.
 */
const APP = 'https://app.example.test';

describe('a webhook carries a fact and a pointer', () => {
  const round = roundCompletedPayload({
    groundId: 'g-1', roundNumber: 2, participantCount: 4,
    completedAt: new Date('2026-08-27T10:00:00Z'), appUrl: APP,
  });
  const checkin = checkInCompletedPayload({
    groundId: 'g-1', roundNumber: 2, completedAt: new Date('2026-08-27T10:00:00Z'), appUrl: APP,
  });

  it('says what happened and where to look', () => {
    expect(round.roundNumber).toBe(2);
    expect(round.permalink).toBe('https://app.example.test/grounds/g-1');
    expect(round.completedAt).toBe('2026-08-27T10:00:00.000Z');
  });

  it('never names a person, in either payload', () => {
    /* A count, not a roster. The receiver already knows who they invited; if they do not, the
       permalink is where to find out under authorisation. */
    for (const p of [round, checkin]) {
      const keys = Object.keys(p);
      expect(keys).not.toContain('participants');
      expect(keys).not.toContain('participantId');
      expect(keys).not.toContain('participantIds');
      expect(keys).not.toContain('names');
      expect(keys).not.toContain('emails');
    }
    expect(round.participantCount).toBe(4);
  });

  it('a check-in event does not say WHOSE check-in', () => {
    /*
     * "Naomi finished at 14:12 and Tom has not" is a surveillance feed assembled from timestamps,
     * and it would be assembled by whoever reads the webhook log rather than by anybody who decided
     * to build one.
     */
    expect(Object.keys(checkin)).not.toContain('participantId');
    expect(JSON.stringify(checkin)).not.toMatch(/participant/i);
  });

  it('carries none of the words that would mean content or judgement', () => {
    const blob = JSON.stringify({ round, checkin }).toLowerCase();
    for (const word of NEVER_IN_A_PAYLOAD) {
      expect(blob).not.toContain(word);
    }
  });

  it('is built field by field, never spread from a row', () => {
    /* A spread lets every column added later escape by default - and here it escapes into somebody
       else's logs rather than into a screen we control. */
    const src = readFileSync(join(__dirname, 'what-a-webhook-may-carry.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(src).not.toMatch(/\.\.\.\w/);
  });

  it('keeps a field in the shape before it has a value, so adding it later is not a break', () => {
    expect(round).toHaveProperty('groundExternalId');
    expect(round.groundExternalId).toBeNull();
  });

  it('does not double the slash when the app url has a trailing one', () => {
    expect(roundCompletedPayload({
      groundId: 'g-1', roundNumber: 1, participantCount: 1,
      completedAt: new Date(), appUrl: 'https://app.example.test/',
    }).permalink).toBe('https://app.example.test/grounds/g-1');
  });
});
