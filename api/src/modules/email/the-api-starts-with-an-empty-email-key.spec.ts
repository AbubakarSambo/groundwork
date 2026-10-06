import { EmailService } from './email.service';

/**
 * THE API WOULD NOT START WHEN THE EMAIL KEY WAS EMPTY.
 *
 * Found by the screens workspace on 26 September 2026, setting up a second computer from the
 * repository's own instructions. `api/.env.example` says to leave `RESEND_API_KEY` empty. With it
 * empty the API died as it started, with "Missing API key", before anything else ran - so the
 * documented way to set the project up did not work, and the only way round it was to invent a
 * fake key.
 *
 * The service already treated an empty key as "nothing leaves this computer" everywhere else. The
 * single line that built the Resend client at construction time was the exception, and Resend
 * refuses an empty key at construction.
 *
 * These are on CONSTRUCTION and on the send path, because construction is where it died.
 */
const svc = (config: Record<string, unknown>) =>
  new EmailService({ get: (k: string) => config[k] } as any, {} as any, {} as any);

describe('the API starts whatever the email key says', () => {
  it('starts with the key empty, which is what the example settings file tells people to do', () => {
    expect(() => svc({ 'resend.apiKey': '', 'resend.sendsForReal': false })).not.toThrow();
  });

  it('starts with the key missing altogether', () => {
    expect(() => svc({})).not.toThrow();
  });

  it('starts with the placeholder the example file ships, and with the fake key used as a workaround', () => {
    expect(() => svc({ 'resend.apiKey': 're_...your_key_here' })).not.toThrow();
    expect(() => svc({ 'resend.apiKey': 're_test' })).not.toThrow();
  });

  it('builds no Resend client at all until something actually sends for real', () => {
    /* The field is the thing that used to throw. Nothing has been made yet. */
    expect((svc({ 'resend.apiKey': '' }) as any).resend).toBeNull();
    expect((svc({ 'resend.apiKey': 're_live_abcdef', 'resend.sendsForReal': true }) as any).resend).toBeNull();
  });

  it('and an empty key is the same as a fake one: nothing leaves this computer', () => {
    for (const apiKey of ['', 're_test', 're_...placeholder']) {
      const s: any = svc({ 'resend.apiKey': apiKey, 'resend.sendsForReal': true });
      expect(s.canSendForReal()).toBe(false);
      expect(s.isDev()).toBe(true);
    }
  });

  it('a real key with the flag on still sends for real, so this loosened nothing', () => {
    const s: any = svc({ 'resend.apiKey': 're_live_abcdef', 'resend.sendsForReal': true });
    expect(s.canSendForReal()).toBe(true);
  });
});
