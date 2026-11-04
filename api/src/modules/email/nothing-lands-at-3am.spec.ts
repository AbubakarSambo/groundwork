import { readFileSync } from 'fs';
import { join } from 'path';
import {
  mayNotSend, localHour, digestBody, digestSubject,
  DEFAULT_QUIET_BEFORE, DEFAULT_QUIET_AFTER, Prefs, DigestFacts,
} from './nothing-lands-at-3am';

const at = (hourUtc: number) => new Date(Date.UTC(2026, 2, 1, hourUtc, 0, 0));
const prefs = (o: Partial<Prefs> = {}): Prefs => ({
  quietBeforeHour: null, quietAfterHour: null, unsubscribedAt: null,
  roundDigest: true, nudges: true, ...o,
});

describe('nothing lands at 3am', () => {
  it('refuses before the morning and after the evening', () => {
    expect(mayNotSend({ kind: 'round_digest', prefs: prefs(), timezone: 'UTC', now: at(3) })).toBe('quiet_hours');
    expect(mayNotSend({ kind: 'round_digest', prefs: prefs(), timezone: 'UTC', now: at(23) })).toBe('quiet_hours');
    expect(mayNotSend({ kind: 'round_digest', prefs: prefs(), timezone: 'UTC', now: at(10) })).toBeNull();
  });

  it('in THEIR hours, not the server\'s', () => {
    /* 10am UTC is 2am in Los Angeles, and the person in Los Angeles is the one being woken up. */
    expect(mayNotSend({ kind: 'round_digest', prefs: prefs(), timezone: 'America/Los_Angeles', now: at(10) }))
      .toBe('quiet_hours');
    expect(mayNotSend({ kind: 'round_digest', prefs: prefs(), timezone: 'Africa/Lagos', now: at(10) })).toBeNull();
  });

  it('and a zone nobody recognises falls back rather than sending anyway', () => {
    /* A data problem is not a reason to mail somebody at 3am. */
    expect(localHour(at(3), 'Not/AZone')).toBe(3);
    expect(mayNotSend({ kind: 'round_digest', prefs: prefs(), timezone: 'Not/AZone', now: at(3) }))
      .toBe('quiet_hours');
  });

  it('and honours hours they set for themselves', () => {
    expect(mayNotSend({ kind: 'round_digest', prefs: prefs({ quietBeforeHour: 11 }), timezone: 'UTC', now: at(10) }))
      .toBe('quiet_hours');
    expect(DEFAULT_QUIET_BEFORE).toBeLessThan(DEFAULT_QUIET_AFTER);
  });
});

describe('an opt-out an admin cannot override', () => {
  it('unsubscribing stops everything, not only the thing they clicked from', () => {
    /*
     * The promise most easily broken by a later feature that checks only its own flag. Unsubscribed
     * is checked first and unconditionally.
     */
    const p = prefs({ unsubscribedAt: new Date(), roundDigest: true, nudges: true });
    expect(mayNotSend({ kind: 'round_digest', prefs: p, timezone: 'UTC', now: at(10) })).toBe('unsubscribed');
    expect(mayNotSend({ kind: 'nudge', prefs: p, timezone: 'UTC', now: at(10) })).toBe('unsubscribed');
  });

  it('and each kind can be turned off on its own', () => {
    expect(mayNotSend({ kind: 'nudge', prefs: prefs({ nudges: false }), timezone: 'UTC', now: at(10) }))
      .toBe('opted_out');
    expect(mayNotSend({ kind: 'round_digest', prefs: prefs({ nudges: false }), timezone: 'UTC', now: at(10) }))
      .toBeNull();
  });
});

describe('one nudge budget across both channels', () => {
  it('so a person nudged in the panel is not nudged again by mail', () => {
    /*
     * §12 and §13D.3. Otherwise each channel behaves reasonably on its own and the person receives
     * twice what either intended - which is how somebody decides the product nags.
     */
    expect(mayNotSend({ kind: 'nudge', prefs: prefs(), timezone: 'UTC', now: at(10), nudgedInPanelToday: true }))
      .toBe('already_nudged_today');
  });

  it('and the budget does not silence a round digest, which is a different thing', () => {
    expect(mayNotSend({ kind: 'round_digest', prefs: prefs(), timezone: 'UTC', now: at(10), nudgedInPanelToday: true }))
      .toBeNull();
  });
});

describe('what a digest may carry', () => {
  const facts: DigestFacts = {
    groundLabel: 'Renewal push', sessionNumber: 3, participantCount: 4,
    needsAttention: 2, permalink: 'https://app/grounds/g1',
  };

  it('a headline, a count, and a link', () => {
    const body = digestBody(facts);
    expect(digestSubject(facts)).toBe('Renewal push - session 3 is complete');
    expect(body).toMatch(/4 people took part/);
    /* Changed 19 October (messages test): "2 things need attention" did not say what; it says what kind of thing, still with no name. */
    expect(body).toMatch(/Two things people are waiting for are still open, and the check-in's board shows who is waiting and for what\./);
    expect(body).toMatch(/https:\/\/app\/grounds\/g1/);
  });

  it('and has nowhere to put a quote, a name, or a finding', () => {
    /*
     * §13D.2. Mail leaves the boundary permanently and lands where the customer's administrators can
     * read, forward and export it - so the shape has no field for content, and adding one means
     * editing this file rather than passing more into a template.
     */
    const SRC = readFileSync(join(__dirname, 'nothing-lands-at-3am.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const field of ['findings', 'quote', 'transcript', 'body:', 'content', 'names', 'says']) {
      expect(SRC).not.toContain(field);
    }
    expect(Object.keys(facts).sort()).toEqual(
      ['groundLabel', 'needsAttention', 'participantCount', 'permalink', 'sessionNumber'],
    );
  });

  /* Changed 4 November 2026 (release batch 1): the link to stop these is in the footer every mail of this kind carries, not said twice. */
  it('and carries a working unsubscribe link on every mail, in the footer the door adds', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { whatThisMailIs } = require('./nothing-goes-out-that-was-turned-off');
    expect(whatThisMailIs('sendRoundDigest')).toBe('we decided to send it');
    expect(digestBody(facts)).toMatch(/Read it on the check-in's board at https:\/\/app\/grounds\/g1/);
  });

  it('and says nothing is flagged rather than reporting a zero', () => {
    expect(digestBody({ ...facts, needsAttention: 0 })).toMatch(/Nothing is flagged for attention/);
  });
});
