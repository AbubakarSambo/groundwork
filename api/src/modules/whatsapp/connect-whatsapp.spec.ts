import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { connectWhatsAppFor, aConnectLink, youCanAlsoAnswerOnWhatsApp } from './connect-whatsapp';
import { EmailService } from '../email/email.service';

/**
 * "CONNECT WHATSAPP" (decision 106 item 4): one tap that opens WhatsApp with "Hi" typed to Groundwork's
 * number. Read for Amani (the person), Wairimu (her lead) and Grace (an admin).
 */
const DISPLAY = '+44 7700 900123';
function aWorld(o: { switchedOn?: boolean; addOn?: boolean; display?: string | null; ownNumber?: boolean; wrote?: boolean; phone?: string | null } = {}) {
  const prisma: any = {
    platformSetting: { findUnique: jest.fn(async ({ where }: any) => (where.key === 'whatsapp_enabled' ? { value: o.switchedOn ?? true } : null)) },
    organization: { findUnique: jest.fn(async () => ({ whatsappAddOnOn: o.addOn ?? true })) },
    whatsAppConnection: { findUnique: jest.fn(async () => (o.ownNumber ? { enabled: true } : null)) },
    person: { findFirst: jest.fn(async () => ({ phone: o.phone === undefined ? '+254700000001' : o.phone, whatsappLastInboundAt: o.wrote ? new Date() : null })) },
    user: { findUnique: jest.fn(async () => ({ phoneNumber: null })) },
    whatsAppInboundMessage: { findFirst: jest.fn(async () => null) },
    ground: { findUnique: jest.fn(async () => ({ organizationId: 'org-1', overWhatsApp: null })) },
  };
  const config: any = { get: (k: string) => ({ 'whatsapp.enabled': true, 'whatsapp.accessToken': 't', 'whatsapp.phoneNumberId': '1', 'whatsapp.displayNumber': o.display === undefined ? DISPLAY : o.display } as any)[k] };
  return { prisma, config };
}
const AMANI = { organizationId: 'org-1', userId: 'u-amani', email: 'amani@kito.test' };

describe('the link Amani is offered', () => {
  it('opens WhatsApp with Hi typed to Groundwork\'s number, digits only', async () => {
    const { prisma, config } = aWorld();
    expect(await connectWhatsAppFor(prisma, config, AMANI)).toEqual({ link: 'https://wa.me/447700900123?text=Hi', number: DISPLAY, says: 'Connect WhatsApp' });
    expect(aConnectLink('+234 801 234 5678')).toBe('https://wa.me/2348012345678?text=Hi');
  });

  it('is offered with no number saved too', async () => {
    const { prisma, config } = aWorld({ phone: null });
    expect((await connectWhatsAppFor(prisma, config, AMANI))?.says).toBe('Connect WhatsApp');
  });

  it.each([
    ['the platform switch is off', { switchedOn: false }],
    ['her organisation has not turned WhatsApp on', { addOn: false }],
    ['no display number is saved', { display: null }],
    ['her organisation has a number of its own', { ownNumber: true }],
    ['she has written to Groundwork from her number', { wrote: true }],
  ])('is null when %s', async (_why, o) => {
    const { prisma, config } = aWorld(o as any);
    expect(await connectWhatsAppFor(prisma, config, AMANI)).toBeNull();
  });

  it('is null on a check-in kept in the app', async () => {
    const { prisma, config } = aWorld();
    expect(await connectWhatsAppFor(prisma, config, { ...AMANI, keptInTheApp: true })).toBeNull();
  });
});

describe('the invitation email', () => {
  const email = (o: any) => {
    const { prisma, config } = aWorld(o);
    return new EmailService({ get: (k: string) => config.get(k) } as any, {} as any, prisma);
  };
  it('says she can answer on WhatsApp, with the Connect WhatsApp link', async () => {
    const html = await email({}).theWhatsAppLine('amani@kito.test', { kind: 'PARTICIPANT_INVITE', groundId: 'g-1' });
    expect(html).toContain(`<p>${youCanAlsoAnswerOnWhatsApp(DISPLAY)}</p>`);
    expect(youCanAlsoAnswerOnWhatsApp(DISPLAY)).toBe('You can also answer on WhatsApp: send Hi to +44 7700 900123.');
    expect(html).toContain('href="https://wa.me/447700900123?text=Hi"');
    expect(html).toContain('>Connect WhatsApp</a>');
  });
  it('has no line at all when WhatsApp is off or no number is saved', async () => {
    expect(await email({ switchedOn: false }).theWhatsAppLine('amani@kito.test', { kind: 'PARTICIPANT_INVITE', groundId: 'g-1' })).toBe('');
    expect(await email({ display: null }).theWhatsAppLine('amani@kito.test', { kind: 'PARTICIPANT_INVITE', groundId: 'g-1' })).toBe('');
  });
});

describe('nobody else\'s read carries it', () => {
  const SRC = join(__dirname, '..', '..');
  const every = (dir: string): string[] => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? every(p) : p.endsWith('.ts') && !p.endsWith('.spec.ts') ? [p] : []; });
  it('only the person\'s own profile, their own check-in read and the invitation compute it', () => {
    const users = every(SRC).filter((p) => /connectWhatsAppFor\(/.test(readFileSync(p, 'utf8'))).map((p) => p.replace(SRC + '/', '')).sort();
    expect(users).toEqual(['modules/auth/auth.service.ts', 'modules/conversation/conversation.service.ts', 'modules/email/email.service.ts', 'modules/whatsapp/connect-whatsapp.ts']);
  });
  it('the check-in read is the owner-only one, and the profile is /auth/me, which is the signed-in person', () => {
    const conv = readFileSync(join(SRC, 'modules/conversation/conversation.service.ts'), 'utf8');
    const t = conv.slice(conv.indexOf('async getTranscript('));
    expect(t.indexOf('loadOwnedCheckIn(checkInId, requestingUserId)')).toBeGreaterThan(-1);
    expect(t.indexOf('loadOwnedCheckIn(checkInId, requestingUserId)')).toBeLessThan(t.indexOf('connectWhatsApp:'));
    expect(t).toContain('this.connectWhatsAppOn(checkIn.groundId, requestingUserId)');
    const ctrl = readFileSync(join(SRC, 'modules/auth/auth.controller.ts'), 'utf8');
    expect(ctrl).toMatch(/getProfile\(@CurrentUser\(\) user: CurrentUserData\) \{\s*return this\.authService\.getProfile\(user\.id\);/);
  });
});
