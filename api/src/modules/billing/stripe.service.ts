import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { theKindOfStripeKey, type TheKindOfKey } from './what-kind-of-stripe-key';
import Stripe from 'stripe';

/** Thin Stripe wrapper. USD. */
@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);

  /** Null when no key is configured. See the note on the getter below. */
  private readonly client: Stripe | null;

  /** Whether this deployment can take money. Readable without triggering a throw. */
  readonly isConfigured: boolean;

  /** Test, live or a placeholder, from the key's own prefix. Never the key. */
  readonly keyKind: TheKindOfKey;

  constructor(private config: ConfigService) {
    const secretKey = this.config.get<string>('stripe.secretKey');
    this.isConfigured = Boolean(secretKey);
    this.keyKind = theKindOfStripeKey(secretKey);

    /*
     * NO KEY MEANS NO CLIENT, RATHER THAN A CLIENT BUILT ON A FAKE ONE.
     *
     * This used to fall back to the literal string `sk_test_placeholder`. The
     * Stripe SDK accepts any string at construction, so the app booted, every
     * billing surface looked live, and the first person to press Pay got an
     * authentication failure from Stripe's servers rendered as a 500 with no
     * indication that the deployment simply has no key.
     *
     * That is the worst version of every option: it fails, it fails late, it
     * fails in front of somebody trying to give us money, and it fails in a way
     * that sends whoever investigates to Stripe's dashboard rather than to the
     * environment variable.
     *
     * It does not throw at construction either — the module is imported by
     * grounds, admin and auth, so refusing to build it would take the whole API
     * down over a variable that only the paying path needs. It fails at the
     * point of use, saying which variable is missing.
     */
    this.client = secretKey
      ? new Stripe(secretKey, { apiVersion: '2024-12-18.acacia' as any })
      : null;

    if (!this.isConfigured) {
      this.logger.warn(
        'STRIPE_SECRET_KEY is not set. Everything except billing works; anything that charges a card will refuse and say so.',
      );
    }
  }

  /**
   * The Stripe client, or a refusal that names the reason.
   *
   * A getter rather than a field so every existing `stripe.stripe.…` call site
   * gets the check without being rewritten — and so a call site added later
   * cannot forget it.
   */
  get stripe(): Stripe {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Billing is not set up on this deployment. STRIPE_SECRET_KEY is not configured, so nothing can be charged. Nothing was attempted and no card was touched.',
      );
    }
    return this.client;
  }

  async ensureCustomer(orgId: string, email?: string, existingCustomerId?: string | null): Promise<string> {
    if (existingCustomerId) return existingCustomerId;
    const customer = await this.stripe.customers.create({ email: email ?? undefined, metadata: { organizationId: orgId } });
    return customer.id;
  }

  /** The default payment method on a subscription (saved during Checkout). */
  async getSubscriptionDefaultPaymentMethod(subscriptionId: string): Promise<string | null> {
    const sub = await this.stripe.subscriptions.retrieve(subscriptionId, { expand: ['default_payment_method'] });
    const pm = sub.default_payment_method;
    if (!pm) return null;
    return typeof pm === 'string' ? pm : pm.id;
  }

  /** Schedule a subscription to cancel at the end of the current paid period. */
  async cancelSubscriptionAtPeriodEnd(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
  }

  /** A Stripe Customer Portal session - self-serve card/invoice/cancel. */
  async createBillingPortalSession(customerId: string, returnUrl: string): Promise<string> {
    const session = await this.stripe.billingPortal.sessions.create({ customer: customerId, return_url: returnUrl });
    return session.url;
  }

  constructEvent(payload: Buffer, signature: string): Stripe.Event {
    const secret = this.config.get<string>('stripe.webhookSecret');
    if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is required but not set');
    return this.stripe.webhooks.constructEvent(payload, signature, secret);
  }
}
