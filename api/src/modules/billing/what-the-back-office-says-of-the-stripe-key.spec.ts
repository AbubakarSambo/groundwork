import { theKindOfStripeKey, whatTheStripeKeyIs } from './what-kind-of-stripe-key';
import { StripeService } from './stripe.service';
import { AdminController } from '../admin/admin.controller';

/**
 * THE SYSTEM TAB SAYS WHAT KIND OF STRIPE KEY IS SET (clean-install run, 6 October). It said "A Stripe key is set ... Live" for
 * the placeholder the install ran with. It now says test or live from the key's own prefix, and says a placeholder is not a real key.
 */
const TEST = ['sk', 'test', '51Nabcdefghijklmnopqrstuvwx'].join('_');
const LIVE = ['sk', 'live', '51Nabcdefghijklmnopqrstuvwx'].join('_');
const PLACEHOLDER = ['sk', 'test', '...'].join('_');

const read = (key: string | undefined) => {
  const stripe = new StripeService({ get: () => key } as any);
  const controller: any = Object.create(AdminController.prototype);
  controller.stripe = stripe;
  return controller.stripeStatus();
};

describe('what the System tab reads about the Stripe key', () => {
  it('a placeholder test key is not called live, and is said not to be a real key', () => {
    expect(theKindOfStripeKey(PLACEHOLDER)).toBe('placeholder');
    const got = read(PLACEHOLDER);
    expect(got.badge).toBe('Not a real key');
    expect(got.says).toBe('The Stripe key that is set is a placeholder, not a real key, so nothing can be charged. Prices below can still be edited. They will apply when a real key is set.');
    expect(JSON.stringify(got)).not.toContain('Live');
    expect(JSON.stringify(got)).not.toContain(PLACEHOLDER);
  });

  it('a real test key reads Test, and says no real money moves', () => {
    const got = read(TEST);
    expect(got.badge).toBe('Test');
    expect(got.says).toBe('A Stripe test key is set. Checkout and subscriptions reach Stripe, but no real money moves.');
    expect(got.isConfigured).toBe(true);
    expect(JSON.stringify(got)).not.toContain(TEST);
  });

  it('a live key reads Live', () => {
    const got = read(LIVE);
    expect(got.badge).toBe('Live');
    expect(got.says).toBe('A live Stripe key is set. Checkout and subscriptions reach Stripe and take real money.');
  });

  it('a placeholder is only a key made wholly of placeholder, and a real key that holds xxx is real', () => {
    const real = ['sk', 'test', '51Nabcxxxdefghijklmnopqrstu'].join('_');
    expect(theKindOfStripeKey(real)).toBe('test');
    expect(theKindOfStripeKey(['sk', 'test', 'xxxxxxxxxxxxxxxxxxxxxxxx'].join('_'))).toBe('placeholder');
    expect(theKindOfStripeKey(['sk', 'test', 'your_key_here'].join('_'))).toBe('placeholder');
    expect(theKindOfStripeKey(['sk', 'test', '51Nyourabcdefghijklmnopqr'].join('_'))).toBe('test');
    expect(whatTheStripeKeyIs('none').says).toContain('edited. They will apply');
  });

  it('no key, and something that is not a key at all', () => {
    expect(read(undefined).badge).toBe('No key set');
    expect(read('hello').badge).toBe('Check the key');
    expect(whatTheStripeKeyIs('none').says).toMatch(/^No Stripe key is set here/);
  });
});
