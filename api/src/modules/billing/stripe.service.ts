import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

/** Thin Stripe wrapper. USD. */
@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  readonly stripe: Stripe;

  constructor(private config: ConfigService) {
    this.stripe = new Stripe(this.config.get<string>('stripe.secretKey') || 'sk_test_placeholder', {
      apiVersion: '2024-12-18.acacia' as any,
    });
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

  /** A Stripe Customer Portal session — self-serve card/invoice/cancel. */
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
