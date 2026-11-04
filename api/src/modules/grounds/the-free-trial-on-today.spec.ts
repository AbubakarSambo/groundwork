import { theFreeTrialLine } from './the-free-trial-on-today';
import { forgetTheOrganisationsZone } from '../../common/the-organisations-own-day';

/** Hafsah, 12 October 2026: "Today shows one line for a new admin: the free trial has started and when it ends." */
const NOW = new Date('2026-10-12T09:00:00Z');
const ON = { 'pricing.freeTrial': { on: true, teamsUnder: 20, months: 1, onSince: '2026-10-01T00:00:00Z' }, 'pricing.trialGrace': { weeks: 4, dailyForTheLastDays: 7, fromHour: 9, onSince: '2026-10-01T00:00:00Z' } };
let n = 0;
/* `told` is whether the reader is somebody the database counts as told about paying (an admin or a lead, TOLD_ABOUT_PAYING). */
const org = (o: any, settings: Record<string, unknown> = {}, told = 1) => {
  forgetTheOrganisationsZone(`org-${n}`);
  return {
    organization: { findUnique: async () => ({ name: 'Baridi Appliances', subscriptionPlan: null, subscriptionStatus: null, freePlan: 'SMALL_TEAM', freeMonthOfReleaseAt: null, ...o }) },
    platformSetting: { findUnique: async ({ where }: any) => (where.key in settings ? { key: where.key, value: settings[where.key] } : null) },
    user: { count: async () => told },
  };
};

describe('the free trial on Today', () => {
  it('says it has started and the day it ends, in one sentence', async () => {
    const line = await theFreeTrialLine(org({ freeTrialStartedAt: NOW, freeUntil: new Date('2026-11-12T09:00:00Z'), timeZone: 'Africa/Nairobi' }) as any, `org-${++n}`, 'u-grace', 'ADMIN', NOW);
    console.log(`THE NEW ADMIN READS: ${line}`);
    /* Changed 15 October (fix list item 6): the free month, WhatsApp included, in the light prototype's words. */
    expect(line).toBe('Your free month has started, WhatsApp included. It ends on 12 November 2026.');
  });

  it('says nothing with no trial, or once it has ended while the free trial is switched off', async () => {
    expect(await theFreeTrialLine(org({ freeTrialStartedAt: null, freeUntil: new Date('2026-11-12T09:00:00Z') }) as any, `org-${++n}`, 'u-grace', 'ADMIN', NOW)).toBeNull();
    expect(await theFreeTrialLine(org({ freeTrialStartedAt: new Date('2026-08-01'), freeUntil: new Date('2026-09-01') }) as any, `org-${++n}`, 'u-grace', 'ADMIN', NOW)).toBeNull();
  });
});

/*
 * THE QUIET NOTE AFTER THE FREE MONTH (Hafsah, 2 November 2026): to admins and leads only, "Team members see nothing". Baridi's free
 * month ended on 19 October in Nairobi; Groundwork pauses there on 16 November.
 */
describe('the quiet note on Today once the free month has ended, as each reader reads it', () => {
  const ended = { freeTrialStartedAt: new Date('2026-09-18T22:30:00Z'), freeUntil: new Date('2026-10-18T22:30:00Z'), timeZone: 'Africa/Nairobi' };
  const IN_THE_WEEKS = new Date('2026-11-02T07:00:00Z');
  const PAUSED = new Date('2026-11-17T07:00:00Z');

  it('during the four weeks, an admin and a lead each read how long is left, in their own words', async () => {
    const admin = await theFreeTrialLine(org(ended, ON) as any, `org-${++n}`, 'u-grace', 'ADMIN', IN_THE_WEEKS);
    const lead = await theFreeTrialLine(org(ended, ON) as any, `org-${++n}`, 'u-wanjiru', 'LEAD', IN_THE_WEEKS);
    console.log(`GRACE, AN ADMIN, READS: ${admin}\nWANJIRU, A LEAD, READS: ${lead}`);
    expect(admin).toBe('Your free month has ended. Everything keeps working until 16 November, and then Groundwork pauses until you choose a plan.');
    expect(lead).toBe('The free month at Baridi Appliances has ended. Everything keeps working until 16 November, and then Groundwork pauses until an admin chooses a plan.');
  });

  it('once paused, an admin and a lead each read that it is paused and that nothing is lost', async () => {
    const admin = await theFreeTrialLine(org(ended, ON) as any, `org-${++n}`, 'u-grace', 'ADMIN', PAUSED);
    const lead = await theFreeTrialLine(org(ended, ON) as any, `org-${++n}`, 'u-wanjiru', 'MEMBER', PAUSED);
    console.log(`GRACE, PAUSED, READS: ${admin}\nWANJIRU, WHO RUNS A CHECK-IN, PAUSED, READS: ${lead}`);
    expect(admin).toBe('Groundwork is paused at Baridi Appliances until you choose a plan. No check-ins open and no messages go out. Everything is kept, and you can still read it all.');
    expect(lead).toBe('Groundwork is paused at Baridi Appliances until an admin chooses a plan. No check-ins open and no messages go out. Everything is kept, and you can still read it all.');
  });

  it('a team member reads nothing, in the weeks or once paused', async () => {
    expect(await theFreeTrialLine(org(ended, ON, 0) as any, `org-${++n}`, 'u-juma', 'MEMBER', IN_THE_WEEKS)).toBeNull();
    expect(await theFreeTrialLine(org(ended, ON, 0) as any, `org-${++n}`, 'u-juma', 'MEMBER', PAUSED)).toBeNull();
  });

  it('nobody reads it once the organisation pays', async () => {
    const paid = { ...ended, subscriptionPlan: 'SMALL_TEAM', subscriptionStatus: 'active' };
    expect(await theFreeTrialLine(org(paid, ON) as any, `org-${++n}`, 'u-grace', 'ADMIN', PAUSED)).toBeNull();
    expect(await theFreeTrialLine(org(paid, ON) as any, `org-${++n}`, 'u-wanjiru', 'LEAD', PAUSED)).toBeNull();
  });
});
