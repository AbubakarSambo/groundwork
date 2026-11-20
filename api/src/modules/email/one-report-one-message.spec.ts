import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * ONE REPORT, ONE MESSAGE. Activation released the report, which mailed everybody that the shared
 * record was ready, and then mailed everybody again seconds later saying the same thing at a
 * different link. And two engines sent the same nudge an hour apart, coordinated only by a timestamp.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('activation', () => {
  it('sends the report mail and no second announcement', () => {
    const listener = strip(readFileSync(join(__dirname, '..', 'reports', 'reports.listener.ts'), 'utf8'));
    expect(listener).not.toContain('sendGroundActivated');
    expect(listener).toMatch(/await this\.reports\.release\(event\.groundId, g\.organizationId\);/);
    expect(strip(readFileSync(join(__dirname, 'email.service.ts'), 'utf8'))).not.toContain('sendGroundActivated');
  });
});

describe('the nudge', () => {
  it('has one engine: remind.service keeps the policy that reads the lead\'s chase settings; the 09:00 job sends no report mail at all (the activation reminder was dead and is gone, decision 109; the reveal reminder is gone, 16 November)', () => {
    const grounds = strip(readFileSync(join(__dirname, '..', 'grounds', 'grounds.cron.ts'), 'utf8'));
    const start = grounds.indexOf('private async sendRemindersInner() {');
    const ends = ['\n  @Cron', '\n  private async '].map((m) => grounds.indexOf(m, start + 40)).filter((i) => i > start);
    const job = grounds.slice(start, Math.min(...ends));
    expect(job.length).toBeGreaterThan(200);
    expect(job).not.toContain('sendNudge(');
    /* Changed under decision 109: the activation reminder looked for a status nobody writes and never fired; the follow-up after a report is its own sweep. */
    expect(job).not.toContain('sendActivationReminder(');
    /* Changed 16 November (fix plan, group 6): the second "your report is ready to view" mail is gone; the report event sends one mail. */
    expect(job).not.toContain('sendActivationRevealReminder(');
    expect(strip(readFileSync(join(__dirname, '..', 'conversation', 'remind.service.ts'), 'utf8'))).toContain('sendNudge(');
  });
});
