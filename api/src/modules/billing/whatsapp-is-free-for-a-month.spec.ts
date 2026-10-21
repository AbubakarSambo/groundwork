import { readFileSync } from 'fs';
import { join } from 'path';
import { WhatsAppAddOnService } from './whatsapp-add-on.service';
import { whatsAppIsOnFor } from '../whatsapp/only-where-whatsapp-is-turned-on';

/* Comments are taken out before anything is matched, so a sentence in a comment cannot satisfy a check (a-guard-that-a-comment-satisfies-is-not-a-guard). */
const withoutComments = (t: string): string => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');


/**
 * HAFSAH'S DECISION D1, 13 OCTOBER 2026, EVENING: "You don't turn on WhatsApp ... This is turned on automatically but
 * also for only a one month trial like your other trials; you pay for it when you add it on your subscription. This
 * screen is meant to be there."
 *
 * Read as the admin of a paying organisation that never added WhatsApp, and as a person in it: in the free month, and
 * after it. Nothing here is charged; Stripe is not reached.
 */
const NOW = new Date('2026-10-15T10:00:00Z');
const PLANS = [{ plan: 'SMALL_TEAM', amountCents: 9000, memberCap: 20, whatsappAddOnCents: 7200, whatsappMonthlyLimit: 2000, whatsappAddOnStripePriceId: null, whatsappPersonCents: 400 }];
const PAYING = {
  id: 'org-baridi', createdAt: new Date('2026-09-01T09:00:00Z'), subscriptionPlan: 'SMALL_TEAM', subscriptionStatus: 'active', subscriptionStripeId: 'sub_test_baridi',
  freeUntil: new Date('2026-10-01T09:00:00Z'), freePlan: 'SMALL_TEAM', freeTrialStartedAt: new Date('2026-09-01T09:00:00Z'),
  whatsappAddOnOn: false, whatsappAddOnItemId: null,
};
function addOnFor(org: any) {
  const prisma: any = {
    organization: { findUnique: jest.fn(async () => ({ ...org })) },
    pricingPlan: { findMany: jest.fn(async () => PLANS) },
    platformSetting: { findUnique: jest.fn(async (q: any) => (q.where.key === 'pricing.freeTrial' ? { value: { on: true, teamsUnder: 20, months: 1, onSince: '2026-09-01T00:00:00Z' } } : q.where.key === 'pricing.freeMemberLimit' ? { value: 5 } : null)) },
    whatsAppMonthlyUse: { findUnique: jest.fn(async () => null) },
  };
  const pricing: any = { getFreeTrial: async () => ({ on: true, teamsUnder: 20, months: 1, onSince: '2026-09-01T00:00:00Z' }), getFreeMemberLimit: async () => 5 };
  return new WhatsAppAddOnService(prisma, pricing, { isConfigured: false } as any);
}

describe('every organisation has WhatsApp on for a free month', () => {
  it('in its free month, WhatsApp goes without anybody turning it on, and nothing is charged', async () => {
    const addOn = addOnFor({ ...PAYING, whatsappFreeUntil: new Date('2026-11-13T00:00:00Z') });
    const s = await addOn.standing('org-baridi', NOW);
    expect(s.sending).toBe(true);
    expect(s.charged).toBe(false);
    expect(whatsAppIsOnFor({ whatsappAddOnOn: false, whatsappFreeUntil: new Date('2026-11-13T00:00:00Z') }, NOW)).toBe(true);
  });

  it('nothing is charged for WhatsApp during the free month, even when a paying organisation adds it to its subscription', async () => {
    /* Paying, past its trial, the switch on: the line goes on the bill only once the free month has ended (Hafsah, fix list item 2). */
    const stripe: any = { isConfigured: true, stripe: { subscriptionItems: { create: jest.fn(), update: jest.fn(), retrieve: jest.fn(), del: jest.fn() } } };
    const org = { ...PAYING, whatsappAddOnOn: true, whatsappFreeUntil: new Date('2026-11-13T00:00:00Z') };
    const addOn = new WhatsAppAddOnService((addOnFor(org) as any).prisma, (addOnFor(org) as any).pricing, stripe);
    const s = await addOn.standing('org-baridi', NOW);
    expect(s.sending).toBe(true);
    expect(s.charged).toBe(false);
    await addOn.syncTheStripeLine('org-baridi', NOW);
    expect(stripe.stripe.subscriptionItems.create).not.toHaveBeenCalled();
    expect(stripe.stripe.subscriptionItems.update).not.toHaveBeenCalled();
    const read: any = await addOn.whatTheyRead('org-baridi', true, NOW);
    expect(read.says.charge).toBe('Nothing is charged for WhatsApp until its free month ends on 13 November 2026.');
    expect(read.says.freeMonth).toBe('WhatsApp is free until 13 November 2026. After that it is paid as part of your subscription.');

    /* The day after the month ends, it is charged: $4 for each person who used it (fix list item 6). */
    const after = new Date('2026-11-14T10:00:00Z');
    expect((await addOn.standing('org-baridi', after)).charged).toBe(true);
  });

  it('the admin reads the WhatsApp part, with the free month and how to keep it', async () => {
    const addOn = addOnFor({ ...PAYING, whatsappFreeUntil: new Date('2026-11-13T00:00:00Z') });
    const read: any = await addOn.whatTheyRead('org-baridi', true, NOW);
    expect(read.says.onOrOff).toBe('WhatsApp is on for your organisation during its free month.');
    expect(read.says.freeMonth).toBe('WhatsApp is free until 13 November 2026. To keep it after that, add it to your subscription with the switch above.');
    expect(read.on).toBe(false);
    /* The one fact every page reads (15 October): on for the organisation, which is what onOrOff says. */
    expect(read.onForTheOrganisation).toBe(true);
  });

  it('a person in it is not told WhatsApp is off', async () => {
    const addOn = addOnFor({ ...PAYING, whatsappFreeUntil: new Date('2026-11-13T00:00:00Z') });
    const read: any = await addOn.whatTheyRead('org-baridi', false, NOW);
    expect(read).toEqual({ sending: true, says: null });
  });

  it('after the month, it is off until it is added to the subscription, and the admin is told so', async () => {
    const addOn = addOnFor({ ...PAYING, whatsappFreeUntil: new Date('2026-10-14T00:00:00Z') });
    const s = await addOn.standing('org-baridi', NOW);
    expect(s.sending).toBe(false);
    expect(s.heldBecause).toBe('not turned on');
    const read: any = await addOn.whatTheyRead('org-baridi', true, NOW);
    expect(read.says.onOrOff).toBe('WhatsApp is off for your organisation, so check-ins stay in the app.');
    expect(read.says.freeMonth).toBeNull();
  });

  it('organisations already here get the month from the day it came in, and new ones from when they are made', () => {
    const sql = withoutComments(readFileSync(join(__dirname, '..', '..', '..', 'prisma', 'migrations', '20261014090000_whatsapp_is_free_for_a_month', 'migration.sql'), 'utf8'));
    expect(sql).toContain(`ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "whatsapp_free_until" TIMESTAMP(3);`);
    expect(sql).toContain(`SET DEFAULT (now() + '1 mon'::interval)`);
    expect(sql).toContain(`UPDATE "organizations" SET "whatsapp_free_until" = now() + '1 mon'::interval WHERE "whatsapp_free_until" IS NULL;`);
  });
});
