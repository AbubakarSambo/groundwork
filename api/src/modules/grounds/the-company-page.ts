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
 * WHAT THE ENGINE WRITES (request 17, the-company-picture.ts): how each priority is moving, what
 * each level under it understood, where the strategy is not reaching the work, what more than one
 * team has named, and what leadership says next to what the check-ins show. It is written once when
 * the record changes and only READ here.
 *
 * WHO READS IT (decision 79, item 1): an admin, a lead, and anybody who runs a check-in, the same
 * readers as what the organisation keeps (organisation-memory.ts, `mayReadWhatIsKept`). Somebody who
 * only takes part in check-ins is given none of it: `reading` is null, `levels` and the lists are
 * empty. Within it, each item is given only if the reader may open every check-in it was built from;
 * "what you say" is for readers who may read every check-in, and "where the strategy is not reaching
 * the work" too, except that a lead is given the questions asked of them. Until a picture has been
 * written for the organisation these are empty, and nothing is worked out on opening.
 */
import { freshnessOf } from '../subjects/a-pointer-goes-stale';
import { theRowsAsTheyShouldRead, theShareFor, tidyTitle, type StoredNotReaching, type StoredPicture } from './the-company-picture';

/** A title with the marks the organisation's system left at its front taken off (": three customers live on the API"). */
const withoutLeadingMarks = (t: string) => (t ?? '').replace(/^[\s:;,.\-–—]+/, '').trim() || (t ?? '');

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
  /** How this priority is moving, written from the record. Null when none is written yet, or when it rests on a check-in the reader may not open. */
  reading: { tag: string; says: string } | null;
  /**
   * WHAT EACH LEVEL UNDERSTOOD, from the priority down through every objective and project under it.
   * Empty for a reader of the page who may not read the company-wide picture, and until it is written.
   */
  levels: CompanyLevel[];
  /** Admins only: what success looks like. */
  measure?: string | null;
  target?: string | null;
}

export interface CompanyLevel {
  id: string;
  /** 0 for the priority itself, 1 for what hangs directly under it, and so on. */
  depth: number;
  /** "Priority 1", "Objective" or "Project". */
  level: string;
  title: string;
  /** "The meaning changed here, from more farmers to more visits.", or null. */
  changedHere: string | null;
  /** "Fed by Sales team, Q3" for the check-ins tied to exactly this level that the reader may open, or null. */
  fedBy: string | null;
}

export interface CompanyPage {
  name: string;
  line: string | null;
  priorities: CompanyPriority[];
  /** Whether this reader is served what success looks like for each priority. */
  readsTargets: boolean;
  /** Where the strategy is not reaching the work. For readers who may read every check-in. */
  notReaching: { id: string; observation: string; question: string; forWhom: string }[];
  /** Something named by more than one team. Teams are in alphabetical order, never ranked. */
  namedByTeams: { id: string; title: string; touches: string; teams: { team: string; says: string; checkIns: { id: string; name: string }[] }[] }[];
  /** What leadership says, next to what the check-ins show. For readers who may read every check-in. */
  saidAndShown: { id: string; area: string; youSaid: string; checkInsShow: string }[];
  /**
   * WHAT A LEAD CONFIRMED IS TRUE OF THE WHOLE COMPANY (week 20). Present only for an admin, a lead
   * and anybody who runs a check-in; absent for everyone else, not empty. Each item is the lead's
   * own sentence and where it came from, never a participant's words and never a private note.
   */
  whatWeKeep?: { readBy: string; items: { id: string; kind: string; says: string; source: string }[] };
}

export interface OwnerDetail { name: string; title: string | null; linkedUserId: string | null }

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

/**
 * THE COUNTS, AS A SENTENCE (group 2's review, fault F): "6 people." and "6 people, 21 check-ins
 * this week." read as noun phrases with a full stop stuck on, not sentences. A verb is given to
 * each part instead - "6 people work here." / "3 teams work here." / "21 check-ins happened this
 * week." - and joined with "and" rather than a bare comma, so what the reader is given still reads
 * as one plain sentence: "3 teams and 11 people work here, and there were 34 check-ins this week."
 */
export function countsLine(counts: { teams: number; people: number; checkInsThisWeek: number | null }): string | null {
  const who: string[] = [];
  if (counts.teams > 0) who.push(plural(counts.teams, 'team', 'teams'));
  if (counts.people > 0) who.push(plural(counts.people, 'person', 'people'));
  const parts: string[] = [];
  if (who.length) parts.push(`${andList(who)} work here`);
  if (counts.checkInsThisWeek !== null) {
    const checkIns = plural(counts.checkInsThisWeek, 'check-in', 'check-ins');
    const was = counts.checkInsThisWeek === 1 ? 'was' : 'were';
    /* "there were no check-ins this week", not "there were 0 check-ins" (request 161, item 4). */
    parts.push(counts.checkInsThisWeek === 0 ? 'there were no check-ins this week' : `there ${was} ${checkIns} this week`);
  }
  if (!parts.length) return null;
  const s = parts.join(', and ');
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
  /** What was written when the record last changed, or null when nothing has been yet. */
  picture?: StoredPicture | null;
  /** Who owns what was asked of somebody, by the customer's own id. */
  ownerDetails?: Map<string, OwnerDetail>;
  readerUserId?: string;
  /** An admin, a lead, or anybody who runs a check-in. Nobody else is given any of the picture. */
  readsThePicture?: boolean;
}): CompanyPage {
  const askedOfThem = (n: StoredNotReaching) => {
    if (n.forWhom.kind !== 'owner') return false;
    const o = input.ownerDetails?.get(n.forWhom.externalId);
    return !!(o?.linkedUserId && input.readerUserId && o.linkedUserId === input.readerUserId);
  };
  const share = input.picture && input.readsThePicture
    ? theShareFor(input.picture, { readsEverything: input.readsEverything, mayOpen: new Set(input.mayOpen.map((g) => g.id)), askedOfThem })
    : null;

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
  const nameOf = (g: GroundRow) => (g.label || g.name || '').trim();
  const externalOf = new Map(live.map((s) => [s.id, s.externalId]));
  /** The check-ins tied to exactly this aim that the reader may open. */
  const fedByExactly = (subjectId: string): string | null => {
    const ext = externalOf.get(subjectId);
    const names = input.linkedGrounds.filter((g) => ext && g.subjectExternalId === ext)
      .map((g) => openable.get(g.id)).filter((g): g is GroundRow => !!g).map(nameOf).filter(Boolean);
    return names.length ? `Fed by ${andList([...new Set(names)])}` : null;
  };

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
      title: withoutLeadingMarks(s.title),
      owner,
      tag: s.ownerExternalId ? null : 'Nobody owns it yet',
      fedBy: nothingUnder ? 'No team feeds it' : named.length ? `Fed by ${andList([...new Set(named)])}` : null,
      staleSays: stale ? `This was last updated on ${onDay(s.syncedAt)}.` : null,
      reading: (() => { const r = share?.readings.get(s.id); return r ? { tag: r.tag, says: r.says } : null; })(),
      levels: (share?.levels.get(s.id) ?? []).map((l) => ({
        id: l.subjectId,
        depth: l.depth,
        level: l.kind === 'Priority' ? `Priority ${i + 1}` : l.kind,
        title: withoutLeadingMarks(l.title),
        changedHere: l.changedHere,
        fedBy: fedByExactly(l.subjectId),
      })),
    };
    if (input.readsEverything) {
      p.measure = s.measure;
      p.target = s.target;
    }
    return p;
  });

  /* What a stored row is about, so it is read today's way (the-company-picture.ts, theRowsAsTheyShouldRead). */
  const aboutThing = (subjectId: string) => {
    const s = live.find((x) => x.id === subjectId);
    if (!s) return null;
    const at = top.findIndex((x) => x.id === s.id);
    return { title: s.title, number: at >= 0 ? at + 1 : undefined, ownerExternalId: s.ownerExternalId ?? null, ownerKnown: !s.ownerExternalId || input.owners.has(s.ownerExternalId) };
  };

  const forWhom = (w: { kind: string; externalId?: string }): string => {
    if (w.kind !== 'owner' || !w.externalId) return 'For you';
    const o = input.ownerDetails?.get(w.externalId);
    if (!o) return 'For the person who owns it';
    if (o.linkedUserId && o.linkedUserId === input.readerUserId) return 'For you';
    return `For ${o.name}${o.title ? `, ${o.title}` : ''}`;
  };

  return {
    name: input.name,
    line: countsLine(input.counts),
    priorities,
    readsTargets: input.readsEverything,
    notReaching: theRowsAsTheyShouldRead(share?.notReaching ?? [], aboutThing).map((n) => ({ id: n.id, observation: n.observation, question: n.question, forWhom: forWhom(n.forWhom) })),
    namedByTeams: (share?.namedByTeams ?? []).map((g) => ({
      id: g.id, title: g.title, touches: g.touches,
      teams: g.teams.map((t) => ({
        team: t.team,
        says: t.says,
        /* Where "Read what each team said" goes: only check-ins this reader may open, which is all of them, or the item would not be here. */
        checkIns: (t.restsOn ?? []).map((id) => openable.get(id)).filter((x): x is GroundRow => !!x).map((x) => ({ id: x.id, name: nameOf(x) })),
      })),
    })),
    saidAndShown: (share?.saidAndShown ?? []).map((x) => ({ id: x.id, area: x.area, youSaid: tidyTitle(x.youSaid), checkInsShow: x.checkInsShow })),
  };
}
