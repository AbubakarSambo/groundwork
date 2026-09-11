import { EmailService } from './email.service';

/**
 * A DEPLOYMENT THAT CANNOT SEND SAYS SO AT BOOT.
 *
 * Whether mail left the building was decided by NODE_ENV: anything but "production" logged and sent
 * nothing, so a staging deployment with real credentials and NODE_ENV unset silently sent nothing,
 * and the log line was the only evidence (fix plan D20). Now it is decided on the credential and an
 * explicit EMAIL_SENDS_FOR_REAL=true, and the boot log says which way it went.
 */
function aService(config: Record<string, unknown>) {
  const svc = new EmailService({ get: (k: string) => config[k] } as any, {} as any, {} as any);
  const lines: { level: string; line: string }[] = [];
  (svc as any).logger = {
    log: (l: string) => lines.push({ level: 'log', line: l }),
    warn: (l: string) => lines.push({ level: 'warn', line: l }),
    error: (l: string) => lines.push({ level: 'error', line: l }),
  };
  return { svc, lines };
}
const REAL = { 'resend.apiKey': 're_live_abcdef', 'resend.sendsForReal': true };

describe('whether mail is sent for real', () => {
  const env = process.env.NODE_ENV;
  afterEach(() => { process.env.NODE_ENV = env; });

  it('needs the flag and a real key, whatever NODE_ENV says', () => {
    process.env.NODE_ENV = 'development';
    expect((aService(REAL).svc as any).isDev()).toBe(false);
    process.env.NODE_ENV = 'production';
    expect((aService({ 'resend.apiKey': 're_live_abcdef', 'resend.sendsForReal': false }).svc as any).isDev()).toBe(true);
    expect((aService({ 'resend.apiKey': 're_...placeholder', 'resend.sendsForReal': true }).svc as any).isDev()).toBe(true);
    expect((aService({ 'resend.apiKey': 're_test', 'resend.sendsForReal': true }).svc as any).isDev()).toBe(true);
  });

  it('says at boot that nothing leaves, and why, as an error where the deployment is live', () => {
    process.env.NODE_ENV = 'production';
    const { svc, lines } = aService({ 'resend.apiKey': 're_live_abcdef', 'resend.sendsForReal': false });
    svc.onModuleInit();
    expect(lines).toEqual([{ level: 'error', line: expect.stringContaining('EMAIL_SENDS_FOR_REAL is not "true"') }]);
    expect(lines[0].line).toContain('No mail leaves this deployment');
  });

  it('as a warning where it is not live, naming a placeholder key', () => {
    process.env.NODE_ENV = 'development';
    const { svc, lines } = aService({ 'resend.apiKey': '', 'resend.sendsForReal': true });
    svc.onModuleInit();
    expect(lines[0]).toEqual({ level: 'warn', line: expect.stringContaining('RESEND_API_KEY is missing or a placeholder') });
  });

  it('and says so plainly when it can send', () => {
    const { svc, lines } = aService(REAL);
    svc.onModuleInit();
    expect(lines).toEqual([{ level: 'log', line: 'Mail is sent for real through Resend.' }]);
  });
});
