/**
 * Password-setup links had one hour, seventy-two hours, seven days and twenty-four hours in four
 * different places, and a dead link said the same thing whichever you held — so somebody could not
 * tell whether they were an hour or a week late. And the used-link message asserted "so your
 * password is set" to people who had arrived by a verification link and have no password.
 */
import * as fs from 'fs';
import * as path from 'path';
import { TokenType } from '@prisma/client';
import { HOW_LONG, WHICH_TYPE, expiresAtFor, howLongInWords, whatToSayAboutADeadLink, type Purpose } from './how-long-a-link-lasts';

describe('how long a link lasts', () => {
  it('gives every purpose a window and a type', () => {
    for (const purpose of Object.keys(HOW_LONG) as Purpose[]) {
      expect(HOW_LONG[purpose]).toBeGreaterThan(0);
      expect(WHICH_TYPE[purpose]).toBeDefined();
    }
  });

  it('keeps the short one short and the long one long, deliberately', () => {
    /* The one handed to the screen is not emailed, so it does not need a day. The team invitation
       is opened when somebody gets round to it. Both are decisions, and this is where they live. */
    expect(HOW_LONG['set a password on the screen you are already on']).toBeLessThan(HOW_LONG['set a password from an email']);
    expect(HOW_LONG['set a password from a team invitation']).toBeGreaterThan(HOW_LONG['set a password from an email']);
  });

  it('counts from now', () => {
    const now = new Date('2026-09-07T09:00:00.000Z');
    expect(expiresAtFor('reset a password', now).toISOString()).toBe('2026-09-07T10:00:00.000Z');
    expect(expiresAtFor('verify an address', now).toISOString()).toBe('2026-09-08T09:00:00.000Z');
  });

  it('says the window in words a person reads', () => {
    expect(howLongInWords('reset a password')).toBe('an hour');
    expect(howLongInWords('verify an address')).toBe('24 hours');
    expect(howLongInWords('set a password from an email')).toBe('3 days');
    expect(howLongInWords('join a check-in')).toBe('14 days');
  });
});

describe('what a dead link should say', () => {
  it('claims a password is set only for a password link', () => {
    expect(whatToSayAboutADeadLink({ type: TokenType.PASSWORD_SETUP, used: true, expired: false }))
      .toMatch(/your password is set/);
  });

  it('never tells a verification-link holder their password is set', () => {
    const said = whatToSayAboutADeadLink({ type: TokenType.EMAIL_VERIFICATION, used: true, expired: false });
    expect(said).not.toMatch(/password is set/);
    expect(said).toMatch(/address is confirmed/);
  });

  it('and never tells a participant-invite holder either', () => {
    expect(whatToSayAboutADeadLink({ type: TokenType.PARTICIPANT_INVITE, used: true, expired: false }))
      .not.toMatch(/password/);
  });

  it('tells somebody with an expired link that nothing is lost', () => {
    const said = whatToSayAboutADeadLink({ type: TokenType.EMAIL_VERIFICATION, used: false, expired: true });
    expect(said).toMatch(/expired/);
    expect(said).toMatch(/nothing you have done is lost/i);
  });

  it('never mentions a database row, a token or a type', () => {
    for (const type of Object.values(TokenType)) {
      for (const used of [true, false]) {
        for (const expired of [true, false]) {
          const said = whatToSayAboutADeadLink({ type, used, expired });
          expect(said).not.toMatch(/token|row|null|invalid/i);
          expect(said.length).toBeGreaterThan(40);
        }
      }
    }
  });
});

describe('and no lifetime is written out beside a create any more', () => {
  const src = fs
    .readFileSync(path.join(__dirname, 'auth.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('every token create asks for a named window', () => {
    expect(src).not.toMatch(/expiresAt: new Date\(Date\.now\(\) \+ \d+/);
    expect((src.match(/expiresAtFor\('/g) ?? []).length).toBeGreaterThan(6);
  });

  it('and the wrong KIND of link is refused before anything is claimed about what it did', () => {
    const from = src.indexOf('private async consumeToken');
    const body = src.slice(from, src.indexOf('async updateProfile', from));
    expect(body.indexOf('tokenRecord.type !== expectedType')).toBeLessThan(body.indexOf('tokenRecord.usedAt'));
  });
});
