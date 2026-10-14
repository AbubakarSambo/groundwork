import { anInboundHarness } from './a-whatsapp-inbound-harness';
import { ParticipantsService } from '../participants/participants.service';
import { readFileSync } from 'fs';
import { join } from 'path';

/* Comments are taken out before anything is matched, so a sentence in a comment cannot satisfy a check (a-guard-that-a-comment-satisfies-is-not-a-guard). */
const withoutComments = (t: string): string => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');


/**
 * PILOTS, 13 OCTOBER 2026, PROBLEM 8. Wanjiru saved Brian's number on People. His "ask" on WhatsApp was answered "Ask
 * Muchemi & Co (test) needs your number on your organisation's roster. Ask your admin to add it, then write 'ask' again."
 * The number already says who he is, so his roster entry is made, as the app makes it, and he reaches Ask.
 */
describe('a number saved on People reaches Ask on WhatsApp', () => {
  it('Brian writes "ask" and is talking to Ask, with his own roster entry', async () => {
    const h = anInboundHarness({ open: [], who: { personId: null, userId: 'u-brian', externalId: null }, organisationName: 'Muchemi & Co (test)' });
    const made: any[] = [];
    h.prisma.person.findFirst = jest.fn(async () => null);
    h.prisma.person.updateMany = jest.fn(async () => ({ count: 0 }));
    h.prisma.person.create = jest.fn(async (a: any) => { made.push(a.data); return { id: 'person-brian', externalId: 'u-brian' }; });
    h.prisma.user = { findUnique: jest.fn(async () => ({ firstName: 'Brian', lastName: 'Kiptoo', email: 'brian@muchemi.test' })), findFirst: jest.fn(async () => null) };
    await h.service.handle('org-1', h.message('ask'), 'ours');
    expect(made[0]).toMatchObject({ organizationId: 'org-1', linkedUserId: 'u-brian', email: 'brian@muchemi.test', givenName: 'Brian', active: true });
    expect(h.said.join(' ')).not.toMatch(/needs your number on your organisation's roster/);
    expect(h.said[0]).toMatch(/^You are now talking to Ask Muchemi/);
  });

  it('somebody the organisation switched off is not given a new entry', async () => {
    const h = anInboundHarness({ open: [], who: { personId: null, userId: 'u-gone', externalId: null } });
    h.prisma.person.findFirst = jest.fn(async (q: any) => (q.where.active === false ? { id: 'off' } : null));
    h.prisma.person.create = jest.fn();
    h.prisma.user = { findUnique: jest.fn(async () => ({ firstName: 'Gone', lastName: '', email: 'gone@x.test' })), findFirst: jest.fn(async () => null) };
    await h.service.handle('org-1', h.message('ask'), 'ours');
    expect(h.prisma.person.create).not.toHaveBeenCalled();
  });
});

describe('joining from the invitation sent to your address confirms it', () => {
  it('an existing, unconfirmed sign-in with the same address is confirmed when the link is opened', () => {
    const src = withoutComments(readFileSync(join(__dirname, '..', 'participants', 'participants.service.ts'), 'utf8'));
    const at = src.indexOf('existingAccount = true;');
    expect(at).toBeGreaterThan(-1);
    expect(src.slice(at, at + 900)).toContain("if (!user.isEmailVerified && user.email.toLowerCase() === email.toLowerCase()) {");
    expect(src.slice(at, at + 900)).toContain('data: { isEmailVerified: true }');
    expect(ParticipantsService).toBeDefined();
  });
});

describe('the roster entry made for a sign-in carries its number (reviewer, 14 October)', () => {
  it('so the number is the same on both', async () => {
    const { theirOwnRosterEntry } = require('../ask/their-own-roster-entry');
    const made: any[] = [];
    const prisma: any = {
      person: { findFirst: jest.fn(async () => null), create: jest.fn(async (a: any) => { made.push(a.data); return { id: 'p', externalId: 'u' }; }) },
      user: { findUnique: jest.fn(async () => ({ firstName: 'Kevin', lastName: 'Omondi', email: 'kevin@kilima.test', phoneNumber: '+254722000202' })) },
    };
    await theirOwnRosterEntry(prisma, 'org-1', 'u-kevin');
    expect(made[0].phone).toBe('+254722000202');
  });
});
