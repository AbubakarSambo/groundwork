import { readFileSync } from 'fs';
import { join } from 'path';
import { inQuietHours, nextAllowedMoment, DEFAULT_QUIET_BEFORE } from './nothing-lands-at-3am';

/**
 * NOTHING LANDS AT 3AM, AND NOTHING IS LOST EITHER. The file was always called nothing-lands-at-3am
 * and one sender of many asked it - and that sender dropped the mail. A held message is SENT, not
 * merely not sent at 3am: that is the assertion this whole batch turns on.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const service = strip(readFileSync(join(__dirname, 'email.service.ts'), 'utf8'));
const cron = strip(readFileSync(join(__dirname, 'held-mail.cron.ts'), 'utf8'));
const digest = strip(readFileSync(join(__dirname, 'round-digest.service.ts'), 'utf8'));

describe('the next allowed moment', () => {
  it('is the start of the next hour inside the window, in the recipient\'s own zone', () => {
    const at3amLagos = new Date('2026-09-11T02:30:00Z'); // 03:30 in Africa/Lagos (UTC+1)
    const next = nextAllowedMoment(at3amLagos, 'Africa/Lagos', null);
    expect(next.toISOString()).toBe(`2026-09-11T${String(DEFAULT_QUIET_BEFORE - 1).padStart(2, '0')}:00:00.000Z`);
    expect(inQuietHours(next, 'Africa/Lagos', null)).toBe(false);
  });
  it('and inside the window nothing is held', () => {
    expect(inQuietHours(new Date('2026-09-11T12:00:00Z'), 'Europe/London', null)).toBe(false);
    expect(inQuietHours(new Date('2026-09-11T22:30:00Z'), 'Europe/London', null)).toBe(true);
  });
});

describe('every sender', () => {
  it('asks the one rule, and a refused mail is written down with its moment rather than dropped', () => {
    /* Changed 18 October (Drop Access run 1, item 12): a mail somebody asked for is held in the night too ("Joseph Kariuki has checked in" went at 2:30am in Nairobi). Only the way back in and the running of the product go at any hour. */
    expect(service).toMatch(/if \(sender && \(whatThisMailIs\(sender\) === 'we decided to send it' \|\| whatThisMailIs\(sender\) === 'asked for'\)\) \{\s*const held = await this\.holdForTheMorning\(/);
    expect(service).toMatch(/scheduledEmail\.create\(\{\s*data: \{ toAddress: options\.to, subject: options\.subject, html: options\.html, sender, context: [^,]+, notBefore \}/);
  });
  it('and the sweep sends what is due, once, under its own lock', () => {
    expect(cron).toMatch(/@Cron\('\*\/15 \* \* \* \*', \{ timeZone: 'UTC' \}\)/);
    expect(cron).toContain('CronLock.HELD_MAIL');
    expect(cron).toMatch(/where: \{ sentAt: null, notBefore: \{ lte: new Date\(\) \} \}/);
    expect(cron).toMatch(/await this\.email\.deliverHeld\(row\);\s*await this\.prisma\.scheduledEmail\.update\(\{ where: \{ id: row\.id \}, data: \{ sentAt: new Date\(\) \} \}\)/);
  });
  it('the digest no longer drops a mail for the hour', () => {
    expect(digest).toMatch(/if \(refuse && refuse !== 'quiet_hours'\)/);
  });
  it('and the session-ready sweep holds its own lock, not the daily reminders\'', () => {
    const grounds = strip(readFileSync(join(__dirname, '..', 'grounds', 'grounds.cron.ts'), 'utf8'));
    expect(grounds).toMatch(/withAdvisoryLock\(CronLock\.SESSION_READY, async \(\) => this\.sendSessionReadyNotificationsInner\(\)\)/);
    expect(grounds.match(/CronLock\.SEND_REMINDERS/g)?.length).toBe(1);
  });
});
