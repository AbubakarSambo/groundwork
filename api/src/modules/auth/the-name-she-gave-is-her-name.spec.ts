import { AuthService } from './auth.service';

/**
 * Local test of staging, 15 October. Hafsah set a check-in up from /start and saved it with hjumare+local@example.test.
 * Nothing asked her name, so it was worked out from the address: her invitations went out as "Hjumare would like your
 * take on Sales check-in" and her welcome said "Hi Hjumare". The save step asks "Your name" now, and the name she gives
 * is her name: Hafsah, with Jumare as her last name, and the link is sent to her by it.
 */
function save(payload: Record<string, any>) {
  const calls: any[] = [];
  const sent: any[] = [];
  const svc = Object.create(AuthService.prototype) as AuthService;
  (svc as any).prisma = {
    user: { findUnique: async () => null },
    pendingSignup: { upsert: async (args: any) => { calls.push(args); return {}; } },
  };
  (svc as any).emailService = { sendMagicLinkEmail: async (to: string, firstName: string) => { sent.push({ to, firstName }); } };
  return (svc as any).entrySave('hjumare+local@example.test', { payload, history: [] }).then(() => ({ args: calls[0], sent }));
}

describe('the name she gave at the save step', () => {
  it('is her first and last name, never a piece of her address, and the link greets her by it', async () => {
    const { args, sent } = await save({ groundLabel: 'Sales check-in', firstName: 'Hafsah Jumare' });
    console.log(`THE LINK GREETS: Hi ${sent[0].firstName}`);
    expect(args.create.firstName).toBe('Hafsah');
    expect(args.create.lastName).toBe('Jumare');
    expect(args.update.firstName).toBe('Hafsah');
    expect(args.update.lastName).toBe('Jumare');
    expect(sent[0].firstName).toBe('Hafsah');
    expect(JSON.stringify(args)).not.toMatch(/Hjumare/);
  });

  it('is kept on the waiting sign-up, not in the check-in\'s draft, which the commit reads field by field', async () => {
    const { args } = await save({ groundLabel: 'Sales check-in', firstName: 'Hafsah Jumare' });
    expect(args.create.payload).toEqual({ groundLabel: 'Sales check-in' });
    expect(args.update.payload).toEqual({ groundLabel: 'Sales check-in' });
  });
});
