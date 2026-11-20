import type { PrismaService } from '../prisma/prisma.service';
import { saidAsADay } from './who-is-away';

/**
 * WHERE PEOPLE TAKE LEAVE FROM: OFFICES AND PUBLIC HOLIDAYS (the leave policy, 21 November 2026).
 *
 * An organisation with offices in other countries names each with its country (`LeaveOffice`), ties the people who work from it
 * (`OrganizationMembership.officeId`), and gives each place its public holidays as dated rows (`PublicHoliday`; no office is the
 * organisation's own country). Only a confirmed holiday counts in anybody's leave (the-leave-calendar.ts). Whoever sets up leave, an
 * admin or whoever looks after HR, reads and sets these, through SuitesService, by the Suites page or by talking to Groundwork.
 */

export type Day = string;

export const PLACES_REFUSED = {
  badOffices: 'Give up to 20 offices, each with a name and a country of up to 80 letters, and no two with the same name.',
  badPeople: 'The people tied to an office have to be people in your organisation.',
  badHolidays: 'Give each public holiday a real date in the year it is listed under, and a name of up to 80 letters, with up to 40 in a year for each place.',
  badOffice: 'That office is not one your organisation has. Add the office first.',
};

export interface TheLeavePlaces {
  offices: { id: string; name: string; country: string; people: { id: string; name: string }[] }[];
  holidays: { id: string; office: string | null; on: Day; when: string; name: string; confirmed: boolean; drafted: boolean }[];
  people: { id: string; name: string }[];
  country: string | null;
  said: string[];
}

export interface APlacesChange {
  offices?: { name: string; country: string; people?: string[] }[] | null;
  holidays?: { office: string | null; year: number; list: { on: Day; name: string; confirmed?: boolean; drafted?: boolean }[] }[] | null;
}

const text = (v: unknown, max = 80) => (typeof v === 'string' && v.trim() && v.trim().length <= max ? v.trim().replace(/\s+/g, ' ') : null);
const aRealDay = (d: unknown): d is Day => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && new Date(`${d}T00:00:00Z`).toISOString().slice(0, 10) === d;
const andList = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** The change, checked: every office with a name and a country, every holiday a real day in its year. The refusal otherwise. */
export function checkThePlaces(input: unknown, people: Set<string>): { change: APlacesChange } | { refused: string } {
  const g = (input && typeof input === 'object' ? input : {}) as Record<string, any>;
  const change: APlacesChange = {};
  if (g.offices !== undefined) {
    if (g.offices === null) change.offices = [];
    else {
      if (!Array.isArray(g.offices) || g.offices.length > 20) return { refused: PLACES_REFUSED.badOffices };
      const out: NonNullable<APlacesChange['offices']> = [];
      for (const o of g.offices) {
        const name = text(o?.name), country = text(o?.country);
        if (!name || !country || out.some((x) => x.name.toLowerCase() === name.toLowerCase())) return { refused: PLACES_REFUSED.badOffices };
        const ids = o?.people === undefined ? undefined : Array.isArray(o.people) ? [...new Set(o.people as unknown[])] : null;
        if (ids === null || (ids && !ids.every((id) => typeof id === 'string' && people.has(id)))) return { refused: PLACES_REFUSED.badPeople };
        out.push({ name, country, ...(ids ? { people: ids as string[] } : {}) });
      }
      change.offices = out;
    }
  }
  if (g.holidays !== undefined && g.holidays !== null) {
    if (!Array.isArray(g.holidays) || g.holidays.length > 40) return { refused: PLACES_REFUSED.badHolidays };
    const out: NonNullable<APlacesChange['holidays']> = [];
    for (const h of g.holidays) {
      const year = Number.isInteger(h?.year) && h.year >= 2000 && h.year <= 2100 ? h.year : null;
      const office = h?.office === null || h?.office === undefined ? null : text(h.office);
      if (!year || (h?.office != null && !office) || !Array.isArray(h?.list) || h.list.length > 40) return { refused: PLACES_REFUSED.badHolidays };
      const list: { on: Day; name: string; confirmed?: boolean; drafted?: boolean }[] = [];
      for (const x of h.list) {
        const name = text(x?.name);
        if (!aRealDay(x?.on) || Number(x.on.slice(0, 4)) !== year || !name || list.some((y) => y.on === x.on)) return { refused: PLACES_REFUSED.badHolidays };
        list.push({ on: x.on, name, confirmed: x.confirmed === true, drafted: x.drafted === true });
      }
      out.push({ office, year, list });
    }
    change.holidays = out;
  }
  return { change };
}

const dayOf = (d: Date) => d.toISOString().slice(0, 10);

/** The offices, who works from each, and every place's public holidays, as stored, with the people by name. */
export async function readThePlaces(prisma: PrismaService, organizationId: string, country: string | null, people: { id: string; name: string }[]): Promise<TheLeavePlaces> {
  const p = prisma as any;
  const [offices, holidays, ties] = await Promise.all([
    Promise.resolve(p.leaveOffice?.findMany?.({ where: { organizationId }, orderBy: { name: 'asc' }, select: { id: true, name: true, country: true } })).catch(() => null),
    Promise.resolve(p.publicHoliday?.findMany?.({ where: { organizationId }, orderBy: { on: 'asc' }, select: { id: true, officeId: true, on: true, name: true, confirmed: true, drafted: true } })).catch(() => null),
    Promise.resolve(p.organizationMembership?.findMany?.({ where: { organizationId, officeId: { not: null } }, select: { userId: true, officeId: true } })).catch(() => null),
  ]);
  const nameOf = new Map(people.map((x) => [x.id, x.name] as const));
  const os = ((offices ?? []) as { id: string; name: string; country: string }[]).map((o) => ({
    id: o.id, name: o.name, country: o.country, people: ((ties ?? []) as { userId: string; officeId: string }[]).filter((t) => t.officeId === o.id && nameOf.has(t.userId)).map((t) => ({ id: t.userId, name: nameOf.get(t.userId)! })),
  }));
  const officeName = new Map(os.map((o) => [o.id, o.name] as const));
  const hs = ((holidays ?? []) as { id: string; officeId: string | null; on: Date; name: string; confirmed: boolean; drafted: boolean }[])
    .filter((h) => !h.officeId || officeName.has(h.officeId))
    .map((h) => ({ id: h.id, office: h.officeId ? officeName.get(h.officeId)! : null, on: dayOf(h.on), when: saidAsADay(dayOf(h.on)), name: h.name, confirmed: h.confirmed, drafted: h.drafted }));
  return { offices: os, holidays: hs, people, country, said: thePlacesSaid(os, hs, country) };
}

/** The offices and the holidays in full sentences, for the Suites page. */
export function thePlacesSaid(offices: TheLeavePlaces['offices'], holidays: TheLeavePlaces['holidays'], country: string | null): string[] {
  const out: string[] = [];
  for (const o of offices) {
    out.push(`The ${o.name} office is in ${o.country}.${o.people.length ? ` ${andList(o.people.map((x) => x.name))} ${o.people.length === 1 ? 'works' : 'work'} from it, and ${o.people.length === 1 ? 'follows' : 'follow'} its public holidays.` : ' Nobody is tied to it yet.'}`);
  }
  if (offices.length) out.push(`Everybody else follows the public holidays of ${country ?? 'your organisation'}.`);
  const places = [null, ...offices.map((o) => o.name)];
  for (const place of places) {
    const mine = holidays.filter((h) => h.office === place);
    if (!mine.length) continue;
    const where = place ? `the ${place} office` : country ?? 'your organisation';
    const confirmed = mine.filter((h) => h.confirmed).length;
    out.push(`${mine.length} public ${mine.length === 1 ? 'holiday is' : 'holidays are'} set for ${where}, and ${confirmed === mine.length ? 'you have confirmed all of them' : `${confirmed} of them ${confirmed === 1 ? 'is' : 'are'} confirmed. Only a confirmed holiday counts`}.`);
  }
  return out;
}

/** The change written: offices by name (an office left out is removed, and nobody is tied to it), and each place's holidays for a year replaced. */
export async function writeThePlaces(prisma: PrismaService, organizationId: string, change: APlacesChange): Promise<void> {
  const p = prisma as any;
  if (change.offices) {
    const kept = (await p.leaveOffice.findMany({ where: { organizationId }, select: { id: true, name: true } })) as { id: string; name: string }[];
    const gone = kept.filter((k) => !change.offices!.some((o) => o.name.toLowerCase() === k.name.toLowerCase()));
    if (gone.length) {
      const ids = gone.map((g) => g.id);
      await p.organizationMembership.updateMany({ where: { organizationId, officeId: { in: ids } }, data: { officeId: null } });
      await p.publicHoliday.deleteMany({ where: { organizationId, officeId: { in: ids } } });
      await p.leaveOffice.deleteMany({ where: { organizationId, id: { in: ids } } });
    }
    for (const o of change.offices) {
      const was = kept.find((k) => k.name.toLowerCase() === o.name.toLowerCase());
      const row = was
        ? await p.leaveOffice.update({ where: { id: was.id }, data: { name: o.name, country: o.country }, select: { id: true } })
        : await p.leaveOffice.create({ data: { organizationId, name: o.name, country: o.country }, select: { id: true } });
      if (o.people) {
        await p.organizationMembership.updateMany({ where: { organizationId, officeId: row.id, userId: { notIn: o.people } }, data: { officeId: null } });
        if (o.people.length) await p.organizationMembership.updateMany({ where: { organizationId, userId: { in: o.people } }, data: { officeId: row.id } });
      }
    }
  }
  for (const h of change.holidays ?? []) {
    let officeId: string | null = null;
    if (h.office) {
      const o = await p.leaveOffice.findFirst({ where: { organizationId, name: { equals: h.office, mode: 'insensitive' } }, select: { id: true } });
      if (!o) throw new Error(PLACES_REFUSED.badOffice);
      officeId = o.id;
    }
    await p.publicHoliday.deleteMany({ where: { organizationId, officeId, on: { gte: new Date(Date.UTC(h.year, 0, 1)), lte: new Date(Date.UTC(h.year, 11, 31)) } } });
    if (h.list.length) {
      await p.publicHoliday.createMany({ data: h.list.map((x) => ({ organizationId, officeId, on: new Date(`${x.on}T00:00:00.000Z`), name: x.name, confirmed: !!x.confirmed, drafted: !!x.drafted })) });
    }
  }
}
