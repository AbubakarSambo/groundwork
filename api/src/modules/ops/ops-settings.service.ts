import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * The decisions this system runs on, kept as data.
 *
 * Every key here is something a person chose and could choose differently. The
 * qualifying line is the one that matters most: whether a contributor's
 * introduction counts once it is READY or only once it is QUALIFIED changes
 * every contributor's number, and that is a call about how we pay attention to
 * people — not a constant to bury in a file.
 */
export const OPS_SETTINGS = {
  /** The point at which a contributor's introduction counts toward their target. */
  contributorQualifyingStatus: 'contributor.qualifyingStatus',
  /** What we count money in. Groundwork is a US company and earns in dollars. */
  defaultCurrency: 'currency.default',
  /** The clock every board dates itself by. */
  displayTimezone: 'display.timezone',
  /** The day the fortnightly cycles are counted from. */
  cycleAnchorDate: 'cycle.anchorDate',
} as const;

/** Used until somebody sets one. Written by the seed so they are visible, not implied. */
export const SETTING_DEFAULTS: Record<string, { value: string; note: string }> = {
  [OPS_SETTINGS.contributorQualifyingStatus]: {
    value: 'READY',
    note: "Where a contributor's introduction starts counting. INTRODUCED counts a name; READY counts a company that is willing and a fit; QUALIFIED counts one that is live. Awaiting a decision — READY is the placeholder, and every contributor number moves if it changes.",
  },
  [OPS_SETTINGS.defaultCurrency]: {
    value: 'USD',
    note: 'Groundwork is a US company and earns in dollars.',
  },
  [OPS_SETTINGS.displayTimezone]: {
    value: 'America/New_York',
    note: 'The clock the boards date themselves by. Awaiting a decision.',
  },
  [OPS_SETTINGS.cycleAnchorDate]: {
    value: '2026-10-01',
    note: 'Fortnightly cycles are counted from the first day of Q4.',
  },
};

@Injectable()
export class OpsSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(key: string): Promise<string> {
    const row = await this.prisma.opsSetting.findUnique({ where: { key } });
    if (row) return row.value;

    const fallback = SETTING_DEFAULTS[key];
    if (!fallback) throw new Error(`${key} is not a setting this system knows about`);
    return fallback.value;
  }

  all() {
    return this.prisma.opsSetting.findMany({ orderBy: { key: 'asc' } });
  }

  async set(key: string, value: string, updatedBy?: string) {
    if (!SETTING_DEFAULTS[key]) throw new Error(`${key} is not a setting this system knows about`);
    return this.prisma.opsSetting.upsert({
      where: { key },
      update: { value, updatedBy },
      create: { key, value, note: SETTING_DEFAULTS[key].note, updatedBy },
    });
  }
}
