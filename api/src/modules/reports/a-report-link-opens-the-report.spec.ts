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
    const release = reports.slice(reports.indexOf('async release('), reports.indexOf('async release(') + 3000);
    expect(release).toMatch(/p\.user\?\.passwordHash \|\| !p\.inviteToken\s*\? reportUrl\s*: `\$\{frontend\}\/invite\?token=\$\{p\.inviteToken\}&next=\$\{encodeURIComponent\(`\/grounds\/\$\{groundId\}\/report`\)\}`/);
    expect(release).toMatch(/sendReportReady\(p\.email, ground\.label, linkFor\(p\)\)/);
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
