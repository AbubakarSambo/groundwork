import { whereTheTrialStands, WHAT_COVER_READS, type TheGrace, type WhereTheTrialStands } from '../../common/subscription';
import { UserRole } from '@prisma/client';
import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';
import { A_GROUND_IS_OVER } from '../grounds/a-ground-that-has-ended';
import { theOrganisationsZone, THE_PRODUCTS_OWN_ZONE, isAZone } from '../../common/the-organisations-own-day';

/**
 * THE FOUR WEEKS AFTER A FREE TRIAL, AS A SETTING (Hafsah, 2 November 2026: "The 4 weeks, the timing of the emails and their
 * wording are settings, so they're easy to change").
 *
 * One `platform_settings` row, `pricing.trialGrace`, beside the free trial's own row, edited at Admin, System, Pricing. Where an
 * organisation stands is worked out in `common/subscription.ts` (`whereTheTrialStands`); this file only reads the numbers and the
 * words, and fills the words in. Nothing here decides who is paused.
 *
 * It applies only while the free trial's switch (`pricing.freeTrial`) is on, the switch that turns billing on: with it off there
 * is no trial to end, nothing is charged, and nobody is paused.
 */
export const TRIAL_GRACE_KEY = 'pricing.trialGrace';

/**
 * The words, with the blanks the product fills in:
 *   {organisation} the organisation's name, {endDay} the day the free month ended, {pauseDay} the day Groundwork pauses,
 *   {timeLeft} "4 weeks" or "7 days", {days} the number of days left, {admins} the names of the organisation's admins.
 */
export interface TheGraceWords {
  /** The email at the start of each of the weeks before the last. */
  weekSubject: string;
  weekOpening: string;
  /** The email each day of the last days, counting down. */
  daySubject: string;
  dayOpening: string;
  /** The email on the last day. */
  lastDaySubject: string;
  lastDayOpening: string;
  /** What a pause means, in every email. */
  whilePaused: string;
  /** How to pay: to an admin, who can, and to a lead, who asks an admin. */
  howToPayAdmin: string;
  howToPayLead: string;
  linkLabel: string;
  /** The quiet note on Today, for admins and leads only. */
  noteAfterTrialAdmin: string;
  noteAfterTrialLead: string;
  notePausedAdmin: string;
  notePausedLead: string;
}

export interface TrialGraceSetting {
  /** How long everything keeps working after the free month ends. */
  weeks: number;
  /** One email a day for this many days before the pause; one a week, at the start of each week, before that. */
  dailyForTheLastDays: number;
  /** The first hour of the organisation's own day an email may go in. They go until 6 in the evening. */
  fromHour: number;
  words: TheGraceWords;
  /** When the row was first written (the migration that brought this in). Nobody is paused without their weeks from then. */
  onSince?: string;
}

export const DEFAULT_GRACE_WORDS: TheGraceWords = {
  weekSubject: 'Groundwork pauses at {organisation} on {pauseDay}',
  weekOpening: 'Your free month at {organisation} ended on {endDay}. Everything keeps working until {pauseDay}, which is {timeLeft} from today.',
  daySubject: 'Groundwork pauses in {days} days',
  dayOpening: 'Groundwork pauses at {organisation} in {days} days, on {pauseDay}.',
  lastDaySubject: 'Groundwork pauses tomorrow',
  lastDayOpening: 'Groundwork pauses at {organisation} tomorrow, {pauseDay}. Today is the last day everything runs.',
  whilePaused: 'While Groundwork is paused, no check-ins open and no messages go out. Nothing is deleted, and everyone can still sign in and read what is there.',
  howToPayAdmin: 'To keep everything running, choose a plan on Plan and billing. Everything starts again as soon as you do.',
  howToPayLead: 'Only an admin can choose a plan. {admins} can do it on Plan and billing, and everything starts again as soon as they do.',
  linkLabel: 'Open Plan and billing',
  noteAfterTrialAdmin: 'Your free month has ended. Everything keeps working until {pauseDay}, and then Groundwork pauses until you choose a plan.',
  noteAfterTrialLead: 'The free month at {organisation} has ended. Everything keeps working until {pauseDay}, and then Groundwork pauses until an admin chooses a plan.',
  notePausedAdmin: 'Groundwork is paused at {organisation} until you choose a plan. No check-ins open and no messages go out. Everything is kept, and you can still read it all.',
  notePausedLead: 'Groundwork is paused at {organisation} until an admin chooses a plan. No check-ins open and no messages go out. Everything is kept, and you can still read it all.',
};

export const DEFAULT_TRIAL_GRACE: TrialGraceSetting = { weeks: 4, dailyForTheLastDays: 7, fromHour: 9, words: DEFAULT_GRACE_WORDS };

const isWhole = (n: unknown, lo: number, hi: number): n is number => Number.isInteger(n) && (n as number) >= lo && (n as number) <= hi;

/**
 * The setting as stored, with anything missing or wrong read as the default, field by field, so a typo in one sentence never
 * stops the emails or the pause. Never throws.
 */
export function theGraceSettingFrom(value: unknown): TrialGraceSetting {
  const v = (value && typeof value === 'object' ? value : {}) as Partial<TrialGraceSetting>;
  const weeks = isWhole(v.weeks, 1, 12) ? v.weeks : DEFAULT_TRIAL_GRACE.weeks;
  const daily = isWhole(v.dailyForTheLastDays, 0, weeks * 7) ? v.dailyForTheLastDays : Math.min(DEFAULT_TRIAL_GRACE.dailyForTheLastDays, weeks * 7);
  const fromHour = isWhole(v.fromHour, 0, 17) ? v.fromHour : DEFAULT_TRIAL_GRACE.fromHour;
  const given = (v.words && typeof v.words === 'object' ? v.words : {}) as Partial<TheGraceWords>;
  const words = { ...DEFAULT_GRACE_WORDS };
  for (const k of Object.keys(DEFAULT_GRACE_WORDS) as (keyof TheGraceWords)[]) {
    if (typeof given[k] === 'string' && given[k]!.trim()) words[k] = given[k]!.trim();
  }
  const onSince = typeof v.onSince === 'string' && !Number.isNaN(new Date(v.onSince).getTime()) ? v.onSince : undefined;
  return { weeks, dailyForTheLastDays: daily, fromHour, words, ...(onSince ? { onSince } : {}) };
}

export async function theGraceSetting(prisma: any): Promise<TrialGraceSetting> {
  const row = await Promise.resolve(prisma?.platformSetting?.findUnique?.({ where: { key: TRIAL_GRACE_KEY } })).catch(() => null);
  return theGraceSettingFrom(row?.value);
}

/**
 * THE GRACE IN FORCE NOW: the weeks and the moment nobody's weeks start before. Null while the free trial's switch is off, which
 * means no trial ends into a pause. Read straight from the two rows so every door (the email door, the WhatsApp door, the gates)
 * reads the same thing without needing the pricing service.
 */
export async function theGraceInForce(prisma: any): Promise<TheGrace | null> {
  const [trialRow, setting] = await Promise.all([
    Promise.resolve(prisma?.platformSetting?.findUnique?.({ where: { key: 'pricing.freeTrial' } })).catch(() => null),
    theGraceSetting(prisma),
  ]);
  const trial = trialRow?.value as { on?: unknown; onSince?: unknown } | undefined;
  if (trial?.on !== true) return null;
  const moments = [setting.onSince, typeof trial.onSince === 'string' ? trial.onSince : undefined]
    .map((s) => (s ? new Date(s).getTime() : NaN))
    .filter((t) => !Number.isNaN(t));
  return { weeks: setting.weeks, notBefore: moments.length ? new Date(Math.max(...moments)) : null };
}

/** Where this organisation's trial stands now. 'not on a trial' for an organisation that cannot be read. */
export async function whereThisOrganisationStands(
  prisma: any,
  organizationId: string | null | undefined,
  now: Date = new Date(),
): Promise<{ stands: WhereTheTrialStands; trialEnded: Date | null; pausesAt: Date | null }> {
  const nothing = { stands: 'not on a trial' as WhereTheTrialStands, trialEnded: null, pausesAt: null };
  if (!organizationId) return nothing;
  const [org, grace] = await Promise.all([
    Promise.resolve(prisma?.organization?.findUnique?.({ where: { id: organizationId }, select: WHAT_COVER_READS })).catch(() => null),
    theGraceInForce(prisma).catch(() => null),
  ]);
  return org ? whereTheTrialStands(org, grace, now) : nothing;
}

/**
 * WHEN EACH OF THESE ORGANISATIONS PAUSED, for the ones paused now. The pause is a state read from the free month and its weeks, never a
 * stored stretch, so its start is derived here, once, for whatever counts rounds (fix plan 17 November, group C: after day 58 the
 * rounds nobody could open were counted as missed). An organisation that is not paused is not in the map.
 */
export async function whenTheseOrganisationsPaused(prisma: any, organizationIds: (string | null | undefined)[], now: Date = new Date()): Promise<Map<string, Date>> {
  const out = new Map<string, Date>();
  for (const id of [...new Set(organizationIds.filter((x): x is string => !!x))]) {
    const where = await whereThisOrganisationStands(prisma, id, now).catch(() => null);
    if (where?.stands === 'paused' && where.pausesAt) out.set(id, where.pausesAt);
    /* The pause is kept as a stretch the first time it is seen, and closed the first time it is seen over (N51). A fault never changes what is returned. */
    await keepThePause(prisma, id, where?.stands === 'paused' ? (where.pausesAt ?? null) : null, now).catch(() => undefined);
  }
  return out;
}

async function keepThePause(prisma: any, organizationId: string, pausedFrom: Date | null, now: Date): Promise<void> {
  const table = prisma?.organizationPause;
  if (!table?.findFirst) return;
  const open = await table.findFirst({ where: { organizationId, resumedAt: null }, orderBy: { pausedFrom: 'desc' }, select: { id: true } });
  if (pausedFrom && !open) await table.create({ data: { organizationId, pausedFrom } });
  else if (!pausedFrom && open) await table.update({ where: { id: open.id }, data: { resumedAt: now } });
}

/**
 * THE PAUSES THAT ARE OVER (N51): for each organisation, the stretches when Groundwork was paused and has since started again. A round that opened inside
 * one could not have been answered, whatever the organisation's state is now. The pause that is running is `whenTheseOrganisationsPaused`'s, as before.
 * An organisation with none kept is not in the map, so it reads exactly as it did.
 */
export async function thePausesThatAreOver(prisma: any, organizationIds: (string | null | undefined)[]): Promise<Map<string, { from: Date; until: Date }[]>> {
  const out = new Map<string, { from: Date; until: Date }[]>();
  const ids = [...new Set(organizationIds.filter((x): x is string => !!x))];
  if (!ids.length || !prisma?.organizationPause?.findMany) return out;
  const rows: any[] = await Promise.resolve(prisma.organizationPause.findMany({ where: { organizationId: { in: ids }, resumedAt: { not: null } }, select: { organizationId: true, pausedFrom: true, resumedAt: true } })).catch(() => []);
  for (const r of Array.isArray(rows) ? rows : []) out.set(r.organizationId, [...(out.get(r.organizationId) ?? []), { from: new Date(r.pausedFrom), until: new Date(r.resumedAt) }]);
  return out;
}

/** Why a message about the work did not go: for the send record and the log, never to the person. */
export const GROUNDWORK_IS_PAUSED_THERE = 'Nothing about the work goes out while Groundwork is paused here. It stays paused until the organisation chooses a plan.';

/**
 * WHAT A PERSON IS TOLD ON WHATSAPP WHEN THEY WRITE IN A PAUSE (run 6, 20 November). It read "Your organisation has not turned on WhatsApp, so this check-in stays in the
 * app. You can carry on in the Groundwork app.", but in a pause no check-in is open anywhere. Said plainly, and without a place to carry on.
 */
export const CHECK_INS_ARE_PAUSED = 'Check-ins are paused until your organisation chooses a plan, so no check-in is open here or in the app.';

/** Whether Groundwork is paused for this organisation now. False wherever it cannot be read: a fault never pauses anybody. */
export async function thisOrganisationIsPaused(prisma: any, organizationId: string | null | undefined, now: Date = new Date()): Promise<boolean> {
  return (await whereThisOrganisationStands(prisma, organizationId, now).catch(() => null))?.stands === 'paused';
}

/** The blanks filled in. A blank the product has no word for is left out, never shown in braces. */
export function filledIn(words: string, blanks: Record<string, string | number | null | undefined>): string {
  return words.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = blanks[k];
    return v === null || v === undefined ? '' : String(v);
  }).replace(/\s{2,}/g, ' ').trim();
}

/** "4 weeks", "3 weeks", "2 weeks", then days: "10 days", "7 days", "1 day". */
export function theTimeLeft(days: number): string {
  if (days >= 14 && days % 7 === 0) return `${days / 7} weeks`;
  return days === 1 ? '1 day' : `${days} days`;
}

/** The people told about paying: the organisation's admins and leads, and anybody who runs a check-in there. Never anybody else. */
export const TOLD_ABOUT_PAYING = (organizationId: string) => ({
  organizationId,
  deletedAt: null,
  isActive: true,
  OR: [{ role: { in: [UserRole.ADMIN, UserRole.LEAD] } }, { groundsInitiated: { some: { organizationId, status: { notIn: A_GROUND_IS_OVER } } } }],
});

/**
 * THE QUIET NOTE (2 November 2026: "a quiet note in the product" for admins and leads, and "Team members see nothing"). One
 * sentence, from the setting's words, said on Today and on Plan and billing. Null unless the free month has ended. Who reads it is
 * the caller's rule, enforced on the server: an admin reads the admin's words, a lead the lead's, and nobody else is served it.
 */
export async function theNoteAboutPaying(prisma: any, organizationId: string, reader: 'admin' | 'lead', now: Date = new Date()): Promise<string | null> {
  const where = await whereThisOrganisationStands(prisma, organizationId, now);
  if (where.stands !== 'after its trial' && where.stands !== 'paused') return null;
  const [setting, org, named] = await Promise.all([
    theGraceSetting(prisma),
    Promise.resolve(prisma?.organization?.findUnique?.({ where: { id: organizationId }, select: { name: true } })).catch(() => null),
    theOrganisationsZone(prisma, organizationId).catch(() => null),
  ]);
  const zone = isAZone(named) ? named : THE_PRODUCTS_OWN_ZONE;
  const w = setting.words;
  const words = where.stands === 'paused'
    ? (reader === 'admin' ? w.notePausedAdmin : w.notePausedLead)
    : (reader === 'admin' ? w.noteAfterTrialAdmin : w.noteAfterTrialLead);
  return filledIn(words, {
    organisation: org?.name?.trim() || 'your organisation',
    endDay: where.trialEnded ? whenItWas(where.trialEnded, 'dayAndMonthLong', zone) : null,
    pauseDay: where.pausesAt ? whenItWas(where.pausesAt, 'dayAndMonthLong', zone) : null,
  });
}

/**
 * EVERY ORGANISATION PAUSED NOW, for the one job that opens check-ins (grounds.cron.ts, sendSessionReadyNotifications). The doors
 * already stop a paused organisation's mail and WhatsApp; this is so the opening is not marked as told while it could not be told,
 * and is told on its usual schedule the moment the organisation pays, as approved leave is (week 23). Empty while nothing is in force.
 */
export async function theOrganisationsPausedNow(prisma: any, now: Date = new Date()): Promise<string[]> {
  const grace = await theGraceInForce(prisma).catch(() => null);
  if (!grace) return [];
  const rows: any[] = await Promise.resolve(prisma?.organization?.findMany?.({
    where: {
      freeUntil: { lt: now }, subscriptionStatus: null,
      OR: [{ freeTrialStartedAt: { not: null } }, { freeMonthOfReleaseAt: { not: null } }],
    },
    select: { id: true, ...WHAT_COVER_READS },
  })).catch(() => []);
  return (rows ?? []).filter((o) => whereTheTrialStands(o, grace, now).stands === 'paused').map((o) => o.id);
}
