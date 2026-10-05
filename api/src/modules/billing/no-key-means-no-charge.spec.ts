/**
 * A DEPLOYMENT WITH NO STRIPE KEY LOOKED EXACTLY LIKE ONE THAT COULD TAKE MONEY.
 *
 * `new Stripe(key || 'sk_test_placeholder')` — the SDK accepts any string at
 * construction, so the API booted, every billing surface rendered, and the first
 * person to press Pay got an authentication failure from Stripe's servers as an
 * opaque 500. Nothing anywhere said the deployment simply has no key.
 *
 * That is the worst version of every option: it fails, late, in front of
 * somebody trying to give us money, and it sends whoever investigates to
 * Stripe's dashboard rather than to an environment variable.
 */
import { ServiceUnavailableException } from '@nestjs/common';
import { StripeService } from './stripe.service';

const withKey = (secretKey?: string) =>
  new StripeService({ get: (k: string) => (k === 'stripe.secretKey' ? secretKey : undefined) } as never);

describe('with no key configured', () => {
  const service = withKey(undefined);

  it('still constructs, because the whole API must not fall over for it', () => {
    /* Grounds, admin and auth all import this module. Refusing to build would
       take down every surface over a variable only the paying path needs. */
    expect(service).toBeInstanceOf(StripeService);
  });

  it('says it is not configured, without anybody having to trigger a failure', () => {
    expect(service.isConfigured).toBe(false);
  });

  it('refuses at the point of use rather than pretending', () => {
    expect(() => service.stripe).toThrow(ServiceUnavailableException);
  });

  it('and names the variable, so the fix is not a search', () => {
    expect(() => service.stripe).toThrow(/STRIPE_SECRET_KEY/);
  });

  it('and says nothing was attempted, because a payment error reads as a charge', () => {
    expect(() => service.stripe).toThrow(/no card was touched/);
  });

  it('refuses the calls that go through it too, not only direct access', async () => {
    await expect(service.ensureCustomer('org-1', 'them@example.test')).rejects.toThrow(
      ServiceUnavailableException,
    );
    await expect(service.createBillingPortalSession('cus_1', 'https://x.test')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});

describe('with a key configured', () => {
  const service = withKey('sk_test_something_real_shaped');

  it('says so', () => {
    expect(service.isConfigured).toBe(true);
  });

  it('hands back a client rather than throwing', () => {
    expect(() => service.stripe).not.toThrow();
    expect(service.stripe.customers).toBeDefined();
  });

  it('and hands back the same one every time, not a new client per call', () => {
    expect(service.stripe).toBe(service.stripe);
  });
});

describe('somebody can find out without pressing Pay', () => {
  /**
   * The Pricing section of the admin console lets somebody set what we charge,
   * which reads as a promise that charging works. The only way to learn it did
   * not was for a customer to reach checkout and get a 500.
   */
  const CONTROLLER = require('fs')
    .readFileSync(require('path').join(__dirname, '..', 'admin', 'admin.controller.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('the console can ask', () => {
    expect(CONTROLLER).toContain("@Get('stripe')");
    expect(CONTROLLER).toContain('this.stripe.isConfigured');
  });

  it('and is never told the key itself', () => {
    const route = CONTROLLER.slice(CONTROLLER.indexOf("@Get('stripe')"), CONTROLLER.indexOf("@Get('whatsapp')"));
    expect(route).not.toMatch(/secretKey/);
    /* The route may read whether a key is set and what kind (`keyKind`: test, live or placeholder, a word from its prefix), never the key. */
    expect(route).not.toMatch(/\.stripe\b(?!\.isConfigured|\.keyKind)/);
  });
});

describe('the placeholder', () => {
  it('is gone from the source, not just unused', () => {
    /* A fallback left in place is a fallback somebody re-enables. */
    const source = require('fs')
      .readFileSync(require('path').join(__dirname, 'stripe.service.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(source).not.toContain('sk_test_placeholder');
  });
});
