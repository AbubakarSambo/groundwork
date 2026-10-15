import { readFileSync } from 'fs';
import { join } from 'path';
import { AN_INVITE_LASTS_DAYS, inviteExpiryFrom } from '../participants/how-long-an-invite-lasts';

/**
 * A REMINDER DOES NOT QUOTE WHAT YOU WROTE. The session-ready sweep put the person's last private
 * record entry into the mail and the WhatsApp body as "Last time: ...". The product's central promise
 * is that nothing they wrote reaches a mailbox. Structural: the sweep's select no longer has the rows.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const cron = strip(readFileSync(join(__dirname, '..', 'grounds', 'grounds.cron.ts'), 'utf8'));
const service = strip(readFileSync(join(__dirname, 'email.service.ts'), 'utf8'));

describe('the session-ready sweep', () => {
  it('does not select record entries and sends no "Last time" line anywhere', () => {
    const sweep = cron.slice(cron.indexOf('private async sendSessionReadyNotificationsInner('), cron.indexOf('private async sendRemindersInner('));
    expect(sweep.length).toBeGreaterThan(200);
    expect(sweep).not.toContain('recordEntries');
    expect(sweep).not.toContain('Last time');
    expect(service).not.toContain('Last time:');
    /* The one addition is `missed`, the product's own decision-136 lines folded into the opening (reviewer, 14 October); nothing the person wrote. */
    /* And `groundId`, only to find whether WhatsApp is on for its organisation (fix list, item 5). */
    expect(service).toMatch(/async sendSessionReady\(email: string, groundLabel: string, checkInUrl: string, simplerWords\?: boolean \| null, missed\?: string\[\] \| null, groundId\?: string\)/);
    expect(sweep).toMatch(/theMissedNoticeToFold\(this\.prisma, p\.userId, p\.id, now\)/);
  });
});

describe('an invitation', () => {
  /* Was ninety. Hafsah's decision of 26 September (U.3): fourteen, as the prototype says, now that an
     expired link offers a fresh one. Still written once and read by every writer. */
  it('lasts fourteen days, written once and read by every writer', () => {
    expect(AN_INVITE_LASTS_DAYS).toBe(14);
    const now = new Date('2026-09-11T00:00:00Z');
    expect(inviteExpiryFrom(now).toISOString()).toBe('2026-09-25T00:00:00.000Z');
    for (const rel of ['../grounds/grounds.service.ts', '../participants/participants.service.ts']) {
      const src = strip(readFileSync(join(__dirname, rel), 'utf8'));
      expect(src).not.toMatch(/inviteTokenExpiresAt: new Date\(Date\.now\(\) \+ \d+ \* 24/);
      expect(src).not.toMatch(/const inviteTokenExpiresAt = new Date\(Date\.now\(\) \+ 14/);
      expect(src).toContain('inviteExpiryFrom()');
    }
  });
  it('is warned about two days out and its lapse is told to the lead, each once', () => {
    expect(cron).toMatch(/@Cron\('0 7 \* \* \*', \{ timeZone: 'UTC' \}\)\s*async tellThemBeforeAnInviteLapses\(\)/);
    expect(cron).toContain('inviteExpiryWarnedAt: null');
    expect(cron).toContain('inviteLapsedToldAt: null');
    expect(cron).toMatch(/sendInviteAboutToLapse\(p\.email, p\.ground\.label, this\.email\.buildInviteUrl\(p\.inviteToken!\), p\.id\)/);
    expect(cron).toMatch(/sendInviteLapsed\(p\.ground\.initiator\.email/);
  });
  it('and the preview route is throttled like every other public token route', () => {
    const controller = strip(readFileSync(join(__dirname, '..', 'participants', 'participants.controller.ts'), 'utf8'));
    expect(controller).toMatch(/@Throttle\(\{ global: \{ limit: 30, ttl: 60_000 \} \}\)\s*@Get\('invite'\)/);
  });
});
