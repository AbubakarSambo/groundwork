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
  return CRON.slice(at, CRON.indexOf('private async sendRemindersInner', at));
})();

describe('GW-WA-01: a phone number does not switch email off', () => {
  it('there is no else-branch handing the choice to one channel', () => {
    /** The exact shape of the defect: an email send reachable only when WhatsApp was not used. */
    expect(BLOCK).not.toMatch(/\}\s*else\s*\{\s*await this\.email\.sendSessionReady/);
  });

  it('the email send is not nested inside the WhatsApp condition', () => {
    const emailAt = BLOCK.indexOf('this.email.sendSessionReady');
    const waCondAt = BLOCK.indexOf('this.whatsapp.isEnabled');
    expect(emailAt).toBeGreaterThan(-1);
    expect(waCondAt).toBeGreaterThan(-1);
    /** Email first means it cannot be guarded by anything decided after it. */
    expect(emailAt).toBeLessThan(waCondAt);
  });

  it('and WhatsApp is still sent, so this is additive rather than a removal', () => {
    expect(BLOCK).toMatch(/this\.whatsapp\.sendMessage\(/);
    /* And never for a check-in the lead keeps in the app (survey item 5). */
    expect(BLOCK).toMatch(/p\.user\?\.phoneNumber && !keptOffThePhone\(p\.ground\) && !theirOwnNumber\?\.enabled && \(await this\.whatsapp\.isEnabled\(\)\)/);
  });

  it('a WhatsApp failure cannot take the email or the stamp with it', () => {
    /**
     * Without its own catch, a throw from the second channel would skip the notified stamp, and the
     * next pass would email the same person a second time - a duplicate caused by the channel that
     * is not even live.
     */
    const waAt = BLOCK.indexOf('this.whatsapp.sendMessage');
    expect(BLOCK.slice(0, waAt)).toMatch(/try \{\s*$/m);
    expect(BLOCK.slice(waAt)).toMatch(/catch \(waErr/);
    /**
     * The WRITE, not the first mention: `sessionReadyNotifiedAt` also appears in the query's `where`
     * clause that selects un-notified rows, which is above all of this. Matching that instead was the
     * first version of this assertion and it failed for the right reason.
     */
    expect(BLOCK.indexOf('data: { sessionReadyNotifiedAt: now }')).toBeGreaterThan(waAt);
  });
});
