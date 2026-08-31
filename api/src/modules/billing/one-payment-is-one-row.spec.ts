import { BillingEventType } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';
import { BillingService } from './billing.service';
import { PricingService } from './pricing.service';

/**
 * ONE PAYMENT, ONE LEDGER ROW - AND THE LEDGER RECORDS THE THING WE ACTUALLY SELL.
 *
 * Two findings on one table, fixed together because either alone leaves it untrustworthy.
 *
 * C-9. `checkout.session.completed` deduped by reading `billingEvent.findFirst({ stripeInvoiceId })`
 * and skipping if found. That is check-then-act, and nothing stood behind it: the column had no
 * unique constraint. Stripe retries webhooks by design and can deliver concurrently, so two
 * deliveries of one event could both read nothing and both write - crediting the balance twice and
 * logging the charge twice for a single payment. It failed in both directions at once, giving
 * sessions away AND misreporting revenue.
 *
 * C-4. `BillingEventType` declares SUBSCRIPTION_FEE and nothing ever wrote it. Only FREE_EXTENSION
 * and SESSION_FEE were recorded, and per-session selling had been withdrawn from every screen. So the
 * ledger carried a row type for a product no longer sold and no row at all for subscriptions - the
 * whole revenue model - and an organisation disputing a charge could not be shown its own history.
 */
const svc = (createImpl: any) => {
  const prisma: any = { billingEvent: { create: createImpl } };
  /** Argument order read from the constructor, not assumed: prisma, stripe, pricing, config, email, usage. */
  return new BillingService(prisma, {} as any, new PricingService(prisma, {} as any), {} as any, {} as any, {} as any);
};
const call = (s: any) => (s as any).recordInvoiceOnce({
  organizationId: 'o1',
  type: BillingEventType.SUBSCRIPTION_FEE,
  amountCents: 2500,
  currency: 'USD',
  stripeInvoiceId: 'in_1',
  periodStart: new Date('2026-08-01'),
  periodEnd: new Date('2026-09-01'),
});

describe('a charge is written once', () => {
  it('the first delivery writes a row', async () => {
    const create = jest.fn(async () => ({}));
    await expect(call(svc(create))).resolves.toBe('written');
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('a redelivery is absorbed by the unique constraint, not by a prior read', async () => {
    /**
     * P2002 is the whole mechanism. The database refuses the second insert, so no race between a
     * read and a write can let a duplicate through.
     */
    const create = jest.fn(async () => { const e: any = new Error('dup'); e.code = 'P2002'; throw e; });
    await expect(call(svc(create))).resolves.toBe('duplicate');
  });

  it('and any OTHER database error is rethrown, never swallowed', async () => {
    /**
     * The failure mode that would undo the fix: a broad catch turns a lost charge record into a
     * silent success, which is exactly the class of defect this table already had three of.
     */
    const create = jest.fn(async () => { const e: any = new Error('connection reset'); e.code = 'P1001'; throw e; });
    await expect(call(svc(create))).rejects.toThrow('connection reset');
  });
});

describe('the constraint exists, because the code now depends on it', () => {
  const SCHEMA = readFileSync(join(__dirname, '../../../prisma/schema.prisma'), 'utf8')
    .replace(/\/\/\/.*$/gm, '').replace(/^\s*\/\/.*$/gm, '');

  it('stripeInvoiceId is unique in the schema', () => {
    expect(SCHEMA).toMatch(/stripeInvoiceId String\?\s+@unique @map\("stripe_invoice_id"\)/);
  });

  it('and a migration actually creates the index', () => {
    /** A schema attribute with no migration behind it is a constraint that exists only in a file. */
    const sql = readFileSync(
      join(__dirname, '../../../prisma/migrations/20260820090000_billing_event_invoice_unique/migration.sql'),
      'utf8',
    );
    expect(sql).toMatch(/CREATE UNIQUE INDEX/i);
    expect(sql).toMatch(/stripe_invoice_id/);
    /** Partial, so the event types that carry no invoice are unaffected. */
    expect(sql).toMatch(/IS NOT NULL/i);
  });
});

describe('the subscription charge reaches the ledger', () => {
  const SRC = readFileSync(join(__dirname, 'billing.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const invoiceCase = SRC.slice(SRC.indexOf("case 'invoice.payment_succeeded'"), SRC.indexOf("case 'invoice.payment_failed'"));

  it('SUBSCRIPTION_FEE is written on a paid invoice', () => {
    expect(invoiceCase).toMatch(/BillingEventType\.SUBSCRIPTION_FEE/);
    expect(invoiceCase).toMatch(/recordInvoiceOnce\(/);
  });

  it('and it does not depend on the org having an email or a readable plan', () => {
    /**
     * The record was originally going to sit inside the renewal-email branch, which would have made
     * the financial record conditional on a notification succeeding.
     */
    const emailBranch = invoiceCase.slice(invoiceCase.indexOf('sendSubscriptionRenewal'));
    expect(emailBranch).toMatch(/recordInvoiceOnce/);
    expect(invoiceCase).toMatch(/if \(paidOrg && \(invoice\.amount_paid \?\? 0\) > 0\)/);
  });

  it('the amount and currency come from the invoice, not from a constant', () => {
    /** A hardcoded amount here would be the pricing bug all over again, in the ledger. */
    expect(invoiceCase).toMatch(/amountCents: invoice\.amount_paid/);
    expect(invoiceCase).toMatch(/invoice\.currency/);
  });
});
