import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * WE STOP WRITING TO A DEAD ADDRESS. A hard bounce was recorded correctly and the daily sweeps kept
 * mailing the address anyway, damaging the sending domain for every tenant. And the rest of the
 * batch: an unreachable endpoint is switched off rather than retried forever; the missing webhook
 * secret reaches the health surface; and every outcome is written to a ledger a person can read.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const service = strip(readFileSync(join(__dirname, 'email.service.ts'), 'utf8'));

describe('the door', () => {
  it('refuses an address whose latest delivery bounced, after the way-back-in exemption', () => {
    const door = service.slice(service.indexOf('private async wouldTheyRatherNot('), service.indexOf('private async sendEmail('));
    const exempt = door.indexOf("if (kind === 'the way back in' || kind === 'operational') return null;");
    const bounced = door.indexOf("if (latest?.status === 'BOUNCED') return");
    expect(exempt).toBeGreaterThan(-1);
    expect(bounced).toBeGreaterThan(exempt);
    expect(door).toMatch(/emailDelivery\s*\.findFirst\(\{ where: \{ email: \{ equals: address, mode: 'insensitive' \} \}, orderBy: \{ createdAt: 'desc' \}/);
  });
  it('writes every outcome to the ledger: sent, held, suppressed, failed', () => {
    for (const outcome of ["'suppressed'", "'held'", "'sent'", "'failed'"]) expect(service).toMatch(new RegExp(`this\\.writeItDown\\(options, sender, ${outcome}`));
    expect(service).toMatch(/notification\s*\.create\(\{ data: \{ channel: 'email'/);
  });
});

describe('the rest of the batch', () => {
  it('a dead endpoint is switched off in the same write as the notice, and can be switched back on', () => {
    const webhooks = strip(readFileSync(join(__dirname, '..', 'webhooks', 'webhooks.service.ts'), 'utf8'));
    expect(webhooks).toMatch(/data: \{ deadNoticeAt: new Date\(\), active: false \}/);
    expect(webhooks).toMatch(/async reactivate\(organizationId: string, id: string\)/);
    expect(strip(readFileSync(join(__dirname, '..', 'webhooks', 'webhooks.controller.ts'), 'utf8'))).toContain("@Post('endpoints/:id/reactivate')");
    expect(service).toContain('We have switched this endpoint off');
  });
  it('the missing webhook secret is on the health surface, not only in a log line', () => {
    const main = strip(readFileSync(join(__dirname, '..', '..', 'main.ts'), 'utf8'));
    expect(main).toContain("httpAdapter.get('/health/mail'");
    expect(main).toMatch(/delivery\.webhookSecretConfigured\(\)/);
  });
  it('and WhatsApp sends write to the same ledger', () => {
    expect(strip(readFileSync(join(__dirname, '..', 'whatsapp', 'whatsapp.service.ts'), 'utf8'))).toMatch(/notification\s*\.create\(\{ data: \{ channel: 'whatsapp'/);
  });
});
