import { BadRequestException } from '@nestjs/common';
import { PricingService, DEFAULT_FREE_TRIAL, FREE_TRIAL_KEY } from './pricing.service';

/**
 * THE FREE TRIAL IS A SETTING, AND IT IS ON BY DEFAULT (updated 23 November 2026: Hafsah, 22 November, "turn the switch on,
 * nothing switch off from now on"; billing gives it for real, U.19). U.2, Hafsah's decision of
 * 26 September: teams under 20 people get Groundwork free; decision 78 (2 October) made it one month. The numbers live in the
 * database, every screen builds its sentence from them, and nothing says it until it is switched on,
 * which waits for billing to really grant it (U.19).
 */
function service(row: any) {
  const upserts: any[] = [];
  const prisma: any = {
    platformSetting: {
      findUnique: jest.fn(async () => row),
      upsert: jest.fn(async (a: any) => { upserts.push(a); return {}; }),
    },
    pricingPlan: { findMany: jest.fn(async () => []) },
  };
  return { svc: new PricingService(prisma, {} as any), upserts };
}

describe('the free trial', () => {
  it('is on by default, with the decided numbers: one month, for teams under 20 (decision 78)', async () => {
    expect(DEFAULT_FREE_TRIAL).toEqual({ on: true, teamsUnder: 20, months: 1 });
    expect(await service(null).svc.getFreeTrial()).toEqual({ on: true, teamsUnder: 20, months: 1 });
  });

  it('a nonsense row means the default, which is on, so a bad row never paywalls anybody', async () => {
    expect(await service({ value: { on: true, teamsUnder: 'lots', months: 3 } }).svc.getFreeTrial()).toEqual(DEFAULT_FREE_TRIAL);
    expect(await service({ value: 'yes' }).svc.getFreeTrial()).toEqual(DEFAULT_FREE_TRIAL);
  });

  it('reads what an admin saved', async () => {
    expect(await service({ value: { on: true, teamsUnder: 25, months: 2 } }).svc.getFreeTrial()).toEqual({ on: true, teamsUnder: 25, months: 2 });
  });

  it('is on the public pricing read, and there are no free limits beside it', async () => {
    const res: any = await service(null).svc.publicPricing();
    expect(res.trial).toEqual({ on: true, teamsUnder: 20, months: 1 });
    expect(res).not.toHaveProperty('free');
  });

  it('an admin change keeps what it does not mention, and refuses numbers that make no sense', async () => {
    const { svc, upserts } = service({ value: { on: false, teamsUnder: 20, months: 1 } });
    expect(await svc.setFreeTrial({ months: 6 }, 'admin-1')).toEqual({ on: false, teamsUnder: 20, months: 6 });
    expect(upserts[0].where).toEqual({ key: FREE_TRIAL_KEY });
    await expect(svc.setFreeTrial({ teamsUnder: 1 }, 'admin-1')).rejects.toThrow(BadRequestException);
    await expect(svc.setFreeTrial({ months: 0 }, 'admin-1')).rejects.toThrow(BadRequestException);
  });
});
