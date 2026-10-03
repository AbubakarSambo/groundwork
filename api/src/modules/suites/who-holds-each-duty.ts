import type { PrismaService } from '../prisma/prisma.service';

/**
 * WHO HOLDS EACH DUTY, FOR ONE ORGANISATION (decision 85; step 2 of the build list in
 * docs/suites-against-the-workflow-model.md).
 *
 * Decision 85 names approvers by rule, never by person: "the requester's manager", "the budget owner",
 * "finance", "HR", "the department head", "the chief executive". So that a rule can be turned into a
 * person, each organisation says once who holds each duty. The requester's manager is already in the
 * staff directory (`Person.managerExternalId`), so it is not a duty here.
 *
 *   - finance, HR and the chief executive are one person each for the whole organisation;
 *   - the budget owner and the department head are one person for each team in the staff directory.
 *
 * WHERE IT IS KEPT. In the existing `OrganizationSuite` table, one row for each organisation with the
 * key `duties`, which is not one of the ten suites, so the Suites page, switching a suite and every
 * suite's own read never see it. `answers` holds the duties, and `changedById` and `changedAt` say who
 * last changed them and when. No migration was needed. Only an admin sets them (`SuitesService`).
 *
 * WHERE IT IS USED. The one approval resolver (who-may-decide.ts) reads it for the rules "the budget
 * owner", "the department head", "finance", "HR" and "the chief executive". Today only spending over
 * the limit uses any of them: the budget owner of the requester's team, then finance, then the person
 * the admin named.
 */
export const DUTIES_ROW = 'duties';

/** The duties held by one person for the whole organisation, with the question an admin answers. */
export const ORGANISATION_DUTIES = [
  { key: 'finance', ask: 'Who looks after finance?' },
  { key: 'hr', ask: 'Who looks after HR?' },
  { key: 'chiefExecutive', ask: 'Who is the chief executive?' },
] as const;

/** The duties held for each team in the staff directory, with the question an admin answers. */
export const TEAM_DUTIES = [
  { key: 'budgetOwners', ask: 'Who holds each team’s budget?' },
  { key: 'departmentHeads', ask: 'Who heads each team?' },
] as const;

export type OrganisationDuty = (typeof ORGANISATION_DUTIES)[number]['key'];
export type TeamDuty = (typeof TEAM_DUTIES)[number]['key'];

/** Who holds each duty, by sign-in. A duty nobody holds is left out. */
export interface Duties {
  finance?: string;
  hr?: string;
  chiefExecutive?: string;
  budgetOwners?: Record<string, string>;
  departmentHeads?: Record<string, string>;
}

/** The refusals, in plain full sentences. */
export const DUTIES_REFUSED = {
  onlyAnAdmin: 'Only an admin can say who holds each duty.',
  notAPerson: 'Choose somebody in this organisation.',
  notATeam: 'Choose a team from your staff directory.',
};

/** What is kept, read with care: anything that is not a sign-in id is left out. */
export function dutiesFrom(answers: unknown): Duties {
  const a = (answers && typeof answers === 'object' ? answers : {}) as Record<string, unknown>;
  const out: Duties = {};
  for (const { key } of ORGANISATION_DUTIES) if (typeof a[key] === 'string' && a[key]) out[key] = a[key] as string;
  for (const { key } of TEAM_DUTIES) {
    const m = a[key];
    if (!m || typeof m !== 'object' || Array.isArray(m)) continue;
    const kept = Object.fromEntries(Object.entries(m as Record<string, unknown>).filter(([t, u]) => t.trim() && typeof u === 'string' && u));
    if (Object.keys(kept).length) out[key] = kept as Record<string, string>;
  }
  return out;
}

/** The organisation's duties as kept. Nothing kept reads as nobody holding any duty. */
export async function readDuties(prisma: PrismaService, organizationId: string): Promise<Duties> {
  const row = await (prisma as any).organizationSuite
    ?.findUnique?.({ where: { organizationId_suite: { organizationId, suite: DUTIES_ROW } }, select: { answers: true } })
    ?.catch?.(() => null);
  return dutiesFrom(row?.answers);
}

/** Who holds one duty: for a team duty, the holder for that team. Null when nobody does. */
export function whoHolds(duties: Duties, duty: OrganisationDuty | TeamDuty, team?: string | null): string | null {
  if (duty === 'budgetOwners' || duty === 'departmentHeads') return (team?.trim() && duties[duty]?.[team.trim()]) || null;
  return duties[duty] ?? null;
}

/**
 * An admin's change, laid over what is kept. A duty given as null or an empty string is cleared; a
 * duty left out is kept. Every person must be somebody in this organisation who is not a guest, and
 * every team must be one in the staff directory. Returns the duties to keep, or the refusal.
 */
export function changeDuties(kept: Duties, input: unknown, people: Set<string>, teams: Set<string>): { duties: Duties } | { refused: string } {
  const given = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const next: Duties = JSON.parse(JSON.stringify(kept));
  for (const { key } of ORGANISATION_DUTIES) {
    if (given[key] === undefined) continue;
    const v = given[key];
    if (v === null || v === '') { delete next[key]; continue; }
    if (typeof v !== 'string' || !people.has(v)) return { refused: DUTIES_REFUSED.notAPerson };
    next[key] = v;
  }
  for (const { key } of TEAM_DUTIES) {
    if (given[key] === undefined) continue;
    const m = given[key];
    if (!m || typeof m !== 'object' || Array.isArray(m)) return { refused: DUTIES_REFUSED.notATeam };
    const held = { ...(next[key] ?? {}) };
    for (const [rawTeam, v] of Object.entries(m as Record<string, unknown>)) {
      const team = rawTeam.trim();
      if (!teams.has(team)) return { refused: DUTIES_REFUSED.notATeam };
      if (v === null || v === '') { delete held[team]; continue; }
      if (typeof v !== 'string' || !people.has(v)) return { refused: DUTIES_REFUSED.notAPerson };
      held[team] = v;
    }
    if (Object.keys(held).length) next[key] = held; else delete next[key];
  }
  return { duties: next };
}
