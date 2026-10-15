import { theFreeTrialLine } from './the-free-trial-on-today';

/** Hafsah, 12 October 2026: "Today shows one line for a new admin: the free trial has started and when it ends." */
const NOW = new Date('2026-10-12T09:00:00Z');
const org = (o: any) => ({ organization: { findUnique: async () => o }, platformSetting: { findUnique: async () => null } });

describe('the free trial on Today', () => {
  it('says it has started and the day it ends, in one sentence', async () => {
    const line = await theFreeTrialLine(org({ freeTrialStartedAt: NOW, freeUntil: new Date('2026-11-12T09:00:00Z'), timeZone: 'Africa/Nairobi' }) as any, 'org-new', NOW);
    console.log(`THE NEW ADMIN READS: ${line}`);
    /* Changed 15 October (fix list item 6): the free month, WhatsApp included, in the light prototype's words. */
    expect(line).toBe('Your free month has started, WhatsApp included. It ends on 12 November 2026.');
  });

  it('says nothing with no trial, or once it has ended', async () => {
    expect(await theFreeTrialLine(org({ freeTrialStartedAt: null, freeUntil: new Date('2026-11-12T09:00:00Z') }) as any, 'org-a', NOW)).toBeNull();
    expect(await theFreeTrialLine(org({ freeTrialStartedAt: new Date('2026-08-01'), freeUntil: new Date('2026-09-01') }) as any, 'org-b', NOW)).toBeNull();
  });
});
