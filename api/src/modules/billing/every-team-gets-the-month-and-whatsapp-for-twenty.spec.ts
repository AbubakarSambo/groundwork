import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { WhatsAppAddOnService, theFreePeopleAreTaken } from './whatsapp-add-on.service';

/**
 * EVERY TEAM GETS THE FREE MONTH, WHATEVER ITS SIZE, WITH WHATSAPP FREE FOR UP TO 20 PEOPLE (Hafsah, 25 November 2026).
 *
 * Rhea's pilot was held to 5 people and its team got no WhatsApp check-ins. The month is now given to every team, and every
 * organisation already here that is not paying is brought up to it by a migration. During the month WhatsApp is free for
 * the trial's number of people: somebody already on it keeps it, and the next new number is told in plain words that the
 * check-in stays in the app.
 */
const SINCE = new Date('2026-11-26T00:00:00Z');
const NOW = new Date('2026-12-01T10:00:00Z');

function rhea(numbersAlreadyOnIt: number) {
  const phones = Array.from({ length: numbersAlreadyOnIt }, (_, i) => ({ phone: `+2547000000${String(i).padStart(2, '0')}` }));
  const prisma: any = { whatsAppSend: { findMany: jest.fn(async () => phones) } };
  const svc = new WhatsAppAddOnService(prisma, {} as any, {} as any);
  jest.spyOn(svc, 'standing').mockResolvedValue({ sending: true, heldBecause: null, freePeople: { up: 20, since: SINCE } } as any);
  return svc;
}

describe('WhatsApp in the free month', () => {
  it('the twentieth person gets it', async () => {
    expect(await rhea(19).mayWeSend('org-rhea', NOW, '+254711111111')).toEqual({ send: true });
  });

  it('the twenty-first new person is told, in one full sentence, that the check-in stays in the app', async () => {
    const got = await rhea(20).mayWeSend('org-rhea', NOW, '+254711111111');
    expect(got).toEqual({ send: false, why: 'past the free people', saying: theFreePeopleAreTaken(20) });
    expect(theFreePeopleAreTaken(20)).toBe(
      "Your organisation's free month includes WhatsApp for 20 people, and 20 people already use it, so this check-in stays in the app. An admin can add WhatsApp to a plan so everybody gets it.",
    );
  });

  it('somebody already on WhatsApp keeps it, however many others there are', async () => {
    expect(await rhea(20).mayWeSend('org-rhea', NOW, '+254700000003')).toEqual({ send: true });
  });

  it('a paying organisation has no free-people count, so nothing is held for it', async () => {
    const svc = rhea(50);
    jest.spyOn(svc, 'standing').mockResolvedValue({ sending: true, heldBecause: null, freePeople: null } as any);
    expect(await svc.mayWeSend('org-paying', NOW, '+254711111111')).toEqual({ send: true });
  });

  it('every message the product sends asks with the number it goes to', () => {
    const src = readFileSync(join(__dirname, '../whatsapp/whatsapp.service.ts'), 'utf8');
    expect(src).toContain('this.addOn.mayWeSend(organizationId, new Date(), to)');
    expect(src).toContain('this.addOn.mayWeSend(o.id, new Date(), rawNumber)');
  });
});

describe('the migration that brings every organisation already here up to the month', () => {
  const dir = join(__dirname, '../../../prisma/migrations');
  const name = readdirSync(dir).find((d) => d.endsWith('_every_organisation_gets_the_free_month_for_any_size'));
  const sql = readFileSync(join(dir, name as string, 'migration.sql'), 'utf8').replace(/--.*$/gm, '');

  it('touches only organisations that are not paying', () => {
    expect(sql).toMatch(/WHERE NOT \(o\."subscription_plan" IS NOT NULL AND o\."subscription_status" = 'active'\)/);
  });

  it('gives at least a month from today, never shortens one, and the same for free WhatsApp', () => {
    expect(sql).toContain(`"free_until" = GREATEST(COALESCE(o."free_until", now()), now() + interval '1 month')`);
    expect(sql).toContain(`"whatsapp_free_until" = GREATEST(COALESCE(o."whatsapp_free_until", now()), now() + interval '1 month')`);
  });

  it('puts them on the cheapest plan that holds 20 people, unless the one they have holds 20 already, and counts it as their trial', () => {
    expect(sql).toMatch(/"member_cap" >= 20\)\s+ORDER BY p\."amount_cents" ASC LIMIT 1/);
    expect(sql).toContain(`"free_trial_started_at" = COALESCE(o."free_trial_started_at", now())`);
  });
});
