/**
 * THIS MAY BE RELEVANT (faith90-board.jpg; screen match, 16 October).
 *
 * What the organisation kept from another check-in of the same kind, offered to whoever runs a new one: "Check stock
 * before a new rep starts, because Kwame's first month was held up by three weeks of stock delays." with who
 * confirmed it and when. Only what was kept (status KEPT, never an offer still waiting), only from another check-in
 * of the same situation, never this one's own, and never what this lead already said was not relevant here.
 *
 * Kept knowledge is the organisation's (it reaches every later check-in's conversation and Ask Groundwork once kept),
 * so nothing private is read: not a report, not anybody's words, not the check-in it came from beyond its kind.
 */

export const NOT_RELEVANT_KEY = 'notRelevant';
export const MOST_OFFERED = 3;

export interface AKeptMemory {
  id: string;
  /** Only KEPT is ever offered: an item still OFFERED is the lead's own question, not the organisation's. */
  status: string;
  text: string;
  groundId: string | null;
  keptAt: Date | null;
  keptByFirstName: string | null;
  keptByTheReader: boolean;
}

export interface SomethingThatMayBeRelevant {
  id: string;
  says: string;
  whoConfirmedIt: string | null;
}

const theDay = (d: Date) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', timeZone: 'Africa/Lagos' }).format(d);
const withAStop = (t: string) => (/[.!?]$/.test(t.trim()) ? t.trim() : `${t.trim()}.`);

/** The memory ids this lead said were not relevant to this check-in, from the check-in's own record. */
export function whatWasSaidNotRelevant(groundAuditLog: unknown): string[] {
  if (!groundAuditLog || typeof groundAuditLog !== 'object' || Array.isArray(groundAuditLog)) return [];
  const ids = (groundAuditLog as Record<string, any>)[NOT_RELEVANT_KEY]?.memoryIds;
  return Array.isArray(ids) ? ids.filter((x): x is string => typeof x === 'string') : [];
}

export function whatMayBeRelevant(input: {
  groundId: string;
  scenario: string;
  memories: AKeptMemory[];
  /** The situation of each check-in a memory was kept from. */
  scenarioOf: Map<string, string>;
  notRelevant: string[];
}): SomethingThatMayBeRelevant[] {
  const out: SomethingThatMayBeRelevant[] = [];
  for (const m of input.memories) {
    if (m.status !== 'KEPT') continue;
    if (!m.groundId || m.groundId === input.groundId) continue;
    if (input.scenarioOf.get(m.groundId) !== input.scenario) continue;
    if (input.notRelevant.includes(m.id) || !m.text?.trim()) continue;
    /* Who kept it is said only to the person who kept it; anybody else reads when the organisation kept it. */
    out.push({
      id: m.id,
      says: withAStop(m.text),
      whoConfirmedIt: !m.keptAt ? null : m.keptByTheReader ? `You confirmed it on ${theDay(m.keptAt)}.` : `It was kept for the whole organisation on ${theDay(m.keptAt)}.`,
    });
    if (out.length >= MOST_OFFERED) break;
  }
  return out;
}

/**
 * THE READ, WITH ITS WALL. Only what the organisation's memory already lets this reader read (mayReadWhatIsKept, the
 * same rule Ask Groundwork and the company page use): KEPT items, which a lead said yes to keeping for the whole
 * organisation. Never an offer still waiting for its lead's answer, and nothing from any other table: no report, no
 * private note, no Ask question, no load. The check-in each item came from is read for its kind alone.
 */
export async function readWhatMayBeRelevant(
  prisma: any,
  ground: { id: string; organizationId: string; scenario: string; groundAuditLog?: unknown },
  reader: { userId: string; role: string | null | undefined },
  mayReadWhatIsKept: (reader: { userId: string; organizationId: string; role: string | null | undefined }) => Promise<boolean>,
): Promise<SomethingThatMayBeRelevant[]> {
  if (!(await mayReadWhatIsKept({ userId: reader.userId, organizationId: ground.organizationId, role: reader.role }))) return [];
  const rows: any[] = (await prisma.organizationMemory.findMany({
    where: { organizationId: ground.organizationId, status: 'KEPT', groundId: { not: null } },
    select: { id: true, status: true, text: true, groundId: true, keptAt: true, keptById: true },
    orderBy: { keptAt: 'desc' },
    take: 50,
  })) ?? [];
  if (!rows.length) return [];
  const grounds: any[] = await prisma.ground.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.groundId))] }, organizationId: ground.organizationId }, select: { id: true, scenario: true } });
  return whatMayBeRelevant({
    groundId: ground.id,
    scenario: String(ground.scenario),
    memories: rows.map((r) => ({
      id: r.id, status: String(r.status ?? ''), text: String(r.text ?? ''), groundId: r.groundId, keptAt: r.keptAt ? new Date(r.keptAt) : null,
      keptByFirstName: null, keptByTheReader: !!r.keptById && r.keptById === reader.userId,
    })),
    scenarioOf: new Map(grounds.map((g) => [g.id, String(g.scenario)])),
    notRelevant: whatWasSaidNotRelevant(ground.groundAuditLog),
  });
}
