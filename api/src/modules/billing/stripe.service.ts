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

  /**
   * Hosted Checkout for the $20/mo care fee subscription. Collects + saves the
   * card (so scenario fees can be charged later) and starts the subscription.
   * The result of the flow arrives via webhook (checkout.session.completed).
   */
  async createCareFeeCheckout(params: { customerId: string; organizationId: string; successUrl: string; cancelUrl: string }): Promise<string> {
    const priceId = this.config.get<string>('stripe.careFeePriceId');
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: params.customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      payment_method_collection: 'always',
      client_reference_id: params.organizationId,
      subscription_data: { metadata: { organizationId: params.organizationId } },
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    });
    if (!session.url) throw new Error('Stripe did not return a checkout URL');
    return session.url;
  }

  /** The default payment method on a subscription (saved during Checkout). */
  async getSubscriptionDefaultPaymentMethod(subscriptionId: string): Promise<string | null> {
    const sub = await this.stripe.subscriptions.retrieve(subscriptionId, { expand: ['default_payment_method'] });
    const pm = sub.default_payment_method;
    if (!pm) return null;
    return typeof pm === 'string' ? pm : pm.id;
  }

  /** Scenario fee: queue one charge ($50 x person-months) onto the next invoice. */
  async chargeScenarioFee(customerId: string, personMonths: number, groundLabel: string) {
    const unit = this.config.get<number>('stripe.scenarioFeeCents') || 5000;
    return this.stripe.invoiceItems.create({
      customer: customerId,
      amount: unit * personMonths,
      currency: 'usd',
      description: `Scenario fee — ${groundLabel} (${personMonths} person-month${personMonths === 1 ? '' : 's'})`,
    });
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
    const secret = this.config.get<string>('stripe.webhookSecret') || '';
    return this.stripe.webhooks.constructEvent(payload, signature, secret);
  }
}
