/**
 * A SECOND FACTOR THAT HANDS YOU THE CODE IS NOT A SECOND FACTOR.
 *
 * Destructive platform-admin operations are guarded by an emailed one-time code. The generator
 * returned that code IN THE RESPONSE BODY whenever `NODE_ENV !== 'production'` — which is right for
 * a laptop and wrong for staging, because staging is not production either. So on any deployment
 * that is not literally production, the gate on operations that cannot be undone handed the code to
 * whoever asked for it.
 *
 * And a send failure was caught, logged, and answered `{ sent: true }`, so an admin waited for a
 * code that was never coming.
 */
import * as fs from 'fs';
import * as path from 'path';
import { AdminService } from './admin.service';

function makeService(mail: { sent: boolean; because?: string }) {
  const written: any[] = [];
  const prisma: any = {
    user: { findUnique: jest.fn(async () => ({ id: 'u1', email: 'admin@groundwork.test' })) },
    adminProfile: { upsert: jest.fn(async (a: any) => { written.push(a); return {}; }) },
  };
  const email: any = { sendAdminOtp: jest.fn(async () => mail) };
  /* prisma, config, email - in that order. */
  const service = new AdminService(prisma, { get: () => 'production' } as any, email);
  return { service, email, written };
}

describe('a second factor that hands you the code', () => {
  it('does not return the code when the email went', async () => {
    const { service, email } = makeService({ sent: true });
    const out = await service.generateOtpForAdmin('u1');
    expect(out).toEqual({ sent: true });
    expect(out).not.toHaveProperty('otp');
    expect(email.sendAdminOtp).toHaveBeenCalled();
  });

  it('returns it only when nothing could deliver it', async () => {
    /* A laptop with no mail key. Then the code in the response is the difference between a working
       local setup and none - and it is the ONLY case. */
    const { service } = makeService({ sent: false, because: 'the code could not be emailed' });
    const out = await service.generateOtpForAdmin('u1');
    expect(out.sent).toBe(false);
    expect(out.otp).toMatch(/^\d{6}$/);
  });

  it('never claims it sent when it did not', async () => {
    const { service } = makeService({ sent: false });
    expect((await service.generateOtpForAdmin('u1')).sent).toBe(false);
  });

  it('stores a hash, never the code itself', async () => {
    const { service, written } = makeService({ sent: true });
    await service.generateOtpForAdmin('u1');
    const stored = JSON.stringify(written[0]);
    expect(stored).toContain('hash');
    expect(stored).not.toMatch(/"\d{6}"/);
  });
});

describe('and it goes out through the email service, not around it', () => {
  const src = fs
    .readFileSync(path.join(__dirname, 'admin.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('does not cast past the type to reach a private method', () => {
    /* `(this.email as any).sendEmail(...)` skipped the opt-out check and the sender
       classification. Suppressing the opt-out for an OTP is right; doing it by cast means the next
       caller to copy the line suppresses something that should not be. */
    expect(src).not.toMatch(/\(this\.email as any\)/);
    expect(src).toContain('this.email.sendAdminOtp(');
  });

  it('and the environment name decides nothing', () => {
    const from = src.indexOf('async generateOtpForAdmin');
    const body = src.slice(from, src.indexOf('\n  async ', from + 10));
    expect(body).not.toMatch(/NODE_ENV/);
  });
});

describe('and the sender is classified rather than smuggled', () => {
  it('sendAdminOtp is on the list, as the way back in', () => {
    const { WHAT_EACH_MAIL_IS } = require('../email/nothing-goes-out-that-was-turned-off');
    expect(WHAT_EACH_MAIL_IS.sendAdminOtp).toBe('the way back in');
  });
});
