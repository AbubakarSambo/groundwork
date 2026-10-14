import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * WHATSAPP IS IN ADDITION TO EMAIL, NEVER INSTEAD OF IT. Her decision, stated plainly:
 * "Whatsapp checkin reminders should not replace email, they are in addition to email."
 *
 * What the code did: `if (phoneNumber && whatsappEnabled) { whatsapp } else { email }`. So saving a
 * phone number in Settings SILENTLY TURNED OFF check-in emails for that person. Nobody chose it, and
 * the Settings copy sold it as the feature - "reminders on WhatsApp instead of email" - so the
 * behaviour and the promise agreed with each other and both were wrong.
 *
 * WHY IT WAS WORSE THAN A PREFERENCE MISREAD: WhatsApp is key-gated and currently off, and its own
 * admin toggle says so. On an account with a number saved, switching that toggle on would have
 * narrowed every reminder to a single channel that had never delivered anything.
 *
 * WHAT THIS PINS:
 *  1. The email send is unconditional - not inside any branch that tests the phone or the toggle.
 *  2. WhatsApp has its own try, so its failure cannot lose the email or the notified stamp.
 */
const CRON = readFileSync(join(__dirname, 'grounds.cron.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

/** The session-ready sender only, so an unrelated notifier cannot satisfy or break these. */
const BLOCK = (() => {
  const at = CRON.indexOf('const newlyOpen');
  return CRON.slice(at, CRON.indexOf('async sendWhatsAppReminders(', at));
})();
const LISTENER = readFileSync(join(__dirname, '..', 'webhooks', 'webhooks.listener.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

/*
 * Changed 2 October (survey items 7 and 8): this sweep no longer sends its own WhatsApp message. The
 * WhatsApp notice for every session is the opening notice in webhooks.listener.ts, which now goes on
 * Groundwork's number as well as an organisation's own; two messages for one session was the defect.
 * What this file has always pinned still holds: the email never depends on a phone number.
 */
describe('GW-WA-01: a phone number does not switch email off', () => {
  it('there is no else-branch handing the choice to one channel', () => {
    /** The exact shape of the defect: an email send reachable only when WhatsApp was not used. */
    expect(BLOCK).not.toMatch(/\}\s*else\s*\{\s*await this\.email\.sendSessionReady/);
  });

  /*
   * Changed 14 October, by Hafsah's decision that day ("each opening message goes on one channel only"): the email is
   * left out only for somebody who has joined on WhatsApp (written from their number, with WhatsApp on), never because a
   * number is saved; and on the day the missed-check-ins notice is due, the email still goes and carries it.
   */
  it('the email is sent whatever number the person has, unless they have joined on WhatsApp, and before the stamp', () => {
    const emailAt = BLOCK.indexOf('this.email.sendSessionReady');
    expect(emailAt).toBeGreaterThan(-1);
    expect(BLOCK.slice(0, emailAt)).not.toMatch(/phoneNumber &&/);
    /* And, since Hafsah's later word of 14 October, the missed notice too goes in the WhatsApp check-in, never by email. */
    expect(BLOCK.slice(0, emailAt)).toMatch(/if \(await theyAreConnectedOnWhatsApp\(this\.prisma, /);
    expect(BLOCK.indexOf('data: { sessionReadyNotifiedAt: now }', emailAt)).toBeGreaterThan(emailAt);
  });

  it('and WhatsApp is still sent for the same session, once, by the opening notice', () => {
    expect(BLOCK).not.toMatch(/this\.whatsapp\.send/);
    expect(LISTENER).toMatch(/await this\.whatsapp\.sendFor\(ground\.organizationId, phone, said\.text/);
    /* A WhatsApp failure there cannot touch the email: it is a different job, in its own catch. */
    expect(LISTENER).toMatch(/this\.announceOnWhatsApp\(e, ground\)\.catch\(/);
  });
});
