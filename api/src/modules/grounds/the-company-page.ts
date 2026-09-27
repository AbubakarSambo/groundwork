/**
 * THE COMPANY PAGE (D2, U.15): what the organisation is trying to do, and how its check-ins feed it,
 * built only from what the reader may already read.
 *
 * WHAT IT HOLDS, AND FOR WHOM:
 * - The organisation's name, and one sentence of counts: its teams and its people, and, for a
 *   reader who may read every check-in (an admin), how many check-ins were finished this week. A
 *   lead or a member reads the check-ins they are in, not the organisation's, so a count of the
 *   organisation's would tell them about check-ins they may not open; and a count of their own
 *   would read as the company's. So they are given no count of check-ins at all.
 * - Its priorities: the organisation's own objectives, brought in from its own systems (a
 *   `Subject` of type OBJECTIVE that hangs under nothing). Everybody in the organisation reads a
 *   priority's name and who owns it. What success looks like, its measure and its target, is
 *   served to admins only ("Everyone reads the priorities. Targets and numbers are leadership
 *   only.", company-context.txt).
 * - Which check-ins feed each one, named only where the reader may open that check-in.
 *
 * WHAT IT NEVER HOLDS: anybody's words from a check-in, anybody's own report, their questions to
 * Ask Groundwork, a lead's private notes, how many check-ins any one person has, any rating, and
 * any label on a person. A priority that has been deleted in the organisation's own system is not
 * shown; one whose wording has not been refreshed for a while says when it was.
 *
 * WHAT THE ENGINE WRITES, AND IS NOT HERE YET: how each priority is moving, where the strategy is
 * not reaching the work, what more than one team has named, and what leadership says next to what
 * the check-ins show. See docs/requests-to-engine.md, request 17.
 */
import { freshnessOf } from '../subjects/a-pointer-goes-stale';

export interface CompanyPriority {
  id: string;
  /** "Priority 1", in the order the organisation's system gave them to us. */
  number: number;
  title: string;
  /** The owner's name, or null when nobody owns it. */
  owner: string | null;
  /** "Nobody owns it yet" when nobody does. Null otherwise. */
  tag: string | null;
  /** "Fed by Sales team, Q3", "No team feeds it", or null when what feeds it is not the reader's to read. */
  fedBy: string | null;
  /** When the wording was last brought in, if that was long enough ago to say so. */
  staleSays: string | null;
  /** Admins only: what success looks like. */
  measure?: string | null;
  target?: string | null;
}

export interface CompanyPage {
  name: string;
  line: string | null;
  priorities: CompanyPriority[];
  /** Whether this reader is served what success looks like for each priority. */
  readsTargets: boolean;
}

export interface SubjectRow {
  id: string;
  externalId: string;
  type: string;
  title: string;
  measure: string | null;
  target: string | null;
  ownerExternalId: string | null;
  parentExternalId: string | null;
  syncedAt: Date;
  sourceDeletedAt: Date | null;
  createdAt: Date;
}

export interface GroundRow {
  id: string;
  label?: string | null;
  name?: string | null;
  organizationId: string;
  subjectExternalId?: string | null;
  checkIns?: { status: string; completedAt: Date | string | null; isSetup?: boolean | null }[];
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "Sales team, Q3", "Sales team, Q3 and Operations", "A, B and C". */
function andList(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const onDay = (d: Date) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;

/** "3 teams, 11 people, 34 check-ins this week." with only the parts this reader is given. */
export function countsLine(counts: { teams: number; people: number; checkInsThisWeek: number | null }): string | null {
  const parts: string[] = [];
  if (counts.teams > 0) parts.push(plural(counts.teams, 'team', 'teams'));
  if (counts.people > 0) parts.push(plural(counts.people, 'person', 'people'));
  if (counts.checkInsThisWeek !== null) parts.push(`${plural(counts.checkInsThisWeek, 'check-in', 'check-ins')} this week`);
  if (!parts.length) return null;
  const s = parts.join(', ');
  return `${s[0].toUpperCase()}${s.slice(1)}.`;
}

export function companyPage(input: {
  name: string;
  readsEverything: boolean;
  subjects: SubjectRow[];
  owners: Map<string, string>;
  /** Every check-in in the organisation that names a subject, whether or not the reader may open it. */
  linkedGrounds: { id: string; subjectExternalId: string }[];
  /** The check-ins this reader may open, with their names. */
  mayOpen: GroundRow[];
  counts: { teams: number; people: number; checkInsThisWeek: number | null };
  now: Date;
}): CompanyPage {
  const live = input.subjects.filter((s) => freshnessOf(s, input.now) !== 'disconnected');
  const top = live
    .filter((s) => s.type === 'OBJECTIVE' && !s.parentExternalId)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  /* Everything under a priority, however deep: its own objectives, projects and the rest. */
  const under = (externalId: string): Set<string> => {
    const seen = new Set<string>([externalId]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const s of live) {
        if (s.parentExternalId && seen.has(s.parentExternalId) && !seen.has(s.externalId)) {
          seen.add(s.externalId);
          grew = true;
        }
      }
    }
    return seen;
  };

  const openable = new Map(input.mayOpen.map((g) => [g.id, g]));

  const priorities = top.map((s, i): CompanyPriority => {
    const branch = under(s.externalId);
    const feeding = input.linkedGrounds.filter((g) => branch.has(g.subjectExternalId));
    const named = feeding
      .map((g) => openable.get(g.id))
      .filter((g): g is GroundRow => !!g)
      .map((g) => (g.label || g.name || '').trim())
      .filter(Boolean);
    const nothingUnder = branch.size === 1 && feeding.length === 0;
    const owner = s.ownerExternalId ? input.owners.get(s.ownerExternalId) ?? null : null;
    const stale = freshnessOf(s, input.now) === 'stale';

    const p: CompanyPriority = {
      id: s.id,
      number: i + 1,
      title: s.title,
      owner,
      tag: s.ownerExternalId ? null : 'Nobody owns it yet',
      fedBy: nothingUnder ? 'No team feeds it' : named.length ? `Fed by ${andList([...new Set(named)])}` : null,
      staleSays: stale ? `This was last updated on ${onDay(s.syncedAt)}.` : null,
    };
    if (input.readsEverything) {
      p.measure = s.measure;
      p.target = s.target;
    }
    return p;
  });

  return { name: input.name, line: countsLine(input.counts), priorities, readsTargets: input.readsEverything };
}
