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
  /**
   * What a paying client is worth, by monthly value.
   *
   * A judgement about what a client is worth to this company at this size, and
   * that judgement will change - so it is data rather than a constant. Editing
   * it recomputes every credit, because nothing is stored.
   */
  clientValueBands: 'commercial.clientValueBands',
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
    value: 'Africa/Lagos',
    note: 'The clock the boards date themselves by: where the company is run from. Decided 2026-09-05. A board dated in a timezone nobody is in makes "today" a different day for the person reading it.',
  },
  [OPS_SETTINGS.clientValueBands]: {
    value: JSON.stringify([
      { fromMonthly: 0, toMonthly: 100, credits: 0.25 },
      { fromMonthly: 100, toMonthly: 500, credits: 0.5 },
      { fromMonthly: 500, toMonthly: 1000, credits: 1 },
      { fromMonthly: 1000, toMonthly: 2500, credits: 2 },
      { fromMonthly: 2500, toMonthly: null, credits: 3 },
    ]),
    note: 'What a paying client is worth in Client Value Credits, by monthly value. A $25 client is not a $1,000 client, and counting clients treats them as if they were. Editing this recomputes every credit in the system, because none is stored.',
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

  /**
   * The settings a person chose, and could choose differently.
   *
   * Anything not in SETTING_DEFAULTS is left out: `set` already refuses to write
   * a key it does not know, so those rows are records this system keeps for
   * itself — the rolled-out capability list is one — and a settings page that
   * lists them offers a control that cannot do anything.
   */
  async all() {
    const rows = await this.prisma.opsSetting.findMany({ orderBy: { key: 'asc' } });
    return rows.filter((row) => SETTING_DEFAULTS[row.key] !== undefined);
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
