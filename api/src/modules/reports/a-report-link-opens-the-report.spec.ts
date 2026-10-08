import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * A REPORT LINK OPENS THE REPORT. The report route is behind the sign-in wall and the report mail
 * goes to people invited by address who never set a password, so the one mail whose whole job is to
 * bring somebody back landed them on a sign-in page. For them the link is their own invite link, with
 * the report as where to go next. And the cancellation mail pointed at a client route that did not exist.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const reports = strip(readFileSync(join(__dirname, 'reports.service.ts'), 'utf8'));
const billing = strip(readFileSync(join(__dirname, '..', 'billing', 'billing.service.ts'), 'utf8'));
const invite = strip(readFileSync(join(__dirname, '..', '..', '..', '..', 'client', 'src', 'pages', 'invite', 'InvitePage.tsx'), 'utf8'));

describe('the report-ready mail', () => {
  it('gives a participant with no password their invite link with the report as next, and everybody else the report', () => {
    /* The mails moved out of release() into tellThemTheReportIsReady, and link to the round's page. */
    const tell = reports.slice(reports.indexOf('async tellThemTheReportIsReady('), reports.indexOf('async tellThemTheReportIsReady(') + 4000);
    expect(tell).toMatch(/p\.user\?\.passwordHash \|\| !p\.inviteToken\s*\? `\$\{frontend\}\/grounds\/\$\{groundId\}\/session\/\$\{sessionNumber\}`\s*: `\$\{frontend\}\/invite\?token=\$\{p\.inviteToken\}&next=\$\{encodeURIComponent\(`\/grounds\/\$\{groundId\}\/session\/\$\{sessionNumber\}`\)\}`/);
    /* Decision 53 (29 September 2026) added a fourth argument: the sentence naming who shared the
       report, when it was not the lead - see who-shared-it-because-the-lead-left.ts. */
    /* Changed under decision 109: the call also carries the subject, a fact about who checked in (theReportReadySubject). */
    /* Changed again on 8 October (engagement spec section 7): the call also carries the finding read for that person (theInsightFor), and the lead's subject is the
       finding where there is one. The link, the sentence naming who shared it and the check-in are the same. */
    /* Changed again on 8 October (request 198): the call also carries the way into Ask about the finding, `chat`, only where there is a finding and the person signs in with a password. */
    expect(tell).toMatch(/sendReportReady\(p\.email, ground\.label, linkFor\(p\), sharedByAnAdminSentence, ground\.id, subject, insight\?\.lines, chat\)/);
    expect(tell).toMatch(/await this\.theReportReadySubject\(ground, p\)/);
    /* And release() sends through it, not on its own. */
    const release = reports.slice(reports.indexOf('async release('), reports.indexOf('async tellThemTheReportIsReady('));
    expect(release).toContain('await this.tellThemTheReportIsReady(groundId, roundNow, undefined, sharedBecauseLeadLeft?.sentence)');
    expect(release).not.toContain('sendReportReady(');
  });
  it('and the invite page honours next only for a report path', () => {
    expect(invite).toMatch(/const next = /);
    expect(invite).toMatch(/next\.startsWith\('\/grounds\/'\)/);
  });
});

describe('the cancellation mail', () => {
  it('points at the settings page that exists, and claims no lifetime it has not got', () => {
    expect(billing).toContain("/settings`");
    expect(billing).not.toContain('/users/me/export`');
    expect(strip(readFileSync(join(__dirname, '..', 'email', 'email.service.ts'), 'utf8'))).not.toContain('valid for 30 days');
  });
});
