import { DependencyStatus } from '@prisma/client';
import { blockerHasSubstance, dedupeDependencies, type ReadDependency } from '../board/reads';
import { peersAreNamedOn, theReaderBySignIn } from '../reports/peers-are-named';
import { theDueFields } from './when-a-handoff-is-due';

/**
 * EVERYTHING ASKED OF YOU (D3, U.16): YOUR LOAD ACROSS CHECK-INS, FOR YOUR EYES ONLY.
 *
 * WHAT IT IS. Every handoff still open in a check-in you are in, where somebody said they are
 * waiting on you. Each one is already on that check-in's own board for you (the board shows you
 * every handoff you are part of, whatever the check-in's wall). What is new, and what is private,
 * is putting them together across check-ins: that is your load, and it is yours.
 *
 * WHO READS IT. Only you. It is served only on your own You board (`GET /you`), which refuses
 * anybody else before anything is read, and nothing else serves it. There is no sharing yet: the
 * prototype's "Share with your lead" waits for Hafsah to say who may read a shared load
 * (docs/morning-report-ui.md, U.16).
 *
 * WHAT IS NAMED. Who asked is named only where the check-in lets its people see each other, or
 * where you run it. On a check-in where people give their accounts without seeing each other, the
 * request is still yours to see, without the name of whoever made it.
 *
 * WHAT IT NEVER HOLDS. How anybody's answers were rated, a label on anybody, or anything from a
 * check-in you are not in.
 */

export interface AskedOfYouRow {
  id: string;
  groundId: string;
  onParticipantId: string | null;
  fromParticipantId: string;
  onLabel: string | null;
  what: string;
  status: DependencyStatus;
  namedTheThing?: boolean | null;
  dueSaid?: string | null;
  dueOn?: Date | string | null;
  blockerKind?: string | null;
  createdAt: Date | string;
  fromParticipant?: {
    userId: string | null;
    email?: string | null;
    nameGiven?: string | null;
    user?: { firstName: string | null; lastName: string | null } | null;
  } | null;
  ground?: {
    label: string | null;
    initiatorId: string | null;
    scenario?: any;
    peersVisibleToEachOther?: boolean | null;
    /** Who is on it, so the person reviewed can be told apart from a colleague (decision 17). */
    participants?: { id: string; userId: string | null; partyType: string; managingOnly?: boolean | null; createdAt?: Date | string | null }[] | null;
  } | null;
}

export interface SomethingAskedOfYou {
  id: string;
  /** Who asked, or null where the check-in does not let you see who. */
  who: string | null;
  checkIn: string;
  what: string;
  /** When it was first asked, as a moment. The screen says it in the reader's time. */
  asked: string;
  /** The person's own words for when, word for word; null where they gave none. */
  dueSaid: string | null;
  /** The day those words meant, as YYYY-MM-DD; null where the words name no day. */
  dueOn: string | null;
  /** "Overdue", "Today", a short weekday ("Fri") or a short date; null where no day is known. */
  dueWord: string | null;
  /** One plain sentence of where it stands, written from the record. */
  standing: string;
}

export interface AskedOfYou {
  items: SomethingAskedOfYou[];
  /** "3 requests from 2 people across 2 check-ins." */
  says: string;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function nameOf(p: AskedOfYouRow['fromParticipant']): string | null {
  if (!p) return null;
  const n = [p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ').trim();
  return n || (p.nameGiven ?? '').trim() || null;
}

export function askedOfYou(
  rows: AskedOfYouRow[],
  reader: { userId: string; role?: string | null },
  mine: { groundIds: Set<string>; participantIds: Set<string> },
  today: Date = new Date(),
): AskedOfYou | null {
  /* Only open handoffs on you, in your own check-ins, and never one you raised yourself. */
  const onYou = rows.filter((r) =>
    mine.groundIds.has(r.groundId)
    && !!r.onParticipantId && mine.participantIds.has(r.onParticipantId)
    && !mine.participantIds.has(r.fromParticipantId)
    && (r.fromParticipant?.userId ?? null) !== reader.userId);

  /* The same rules the board uses for what counts as one real handoff. */
  const kept = dedupeDependencies(onYou as (AskedOfYouRow & ReadDependency)[])
    .filter(blockerHasSubstance)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  if (kept.length === 0) return null;

  const items: SomethingAskedOfYou[] = kept.map((r) => {
    const g = r.ground ?? null;
    const youRunIt = !!g?.initiatorId && g.initiatorId === reader.userId;
    const mayName = youRunIt || reader.role === 'ADMIN' || peersAreNamedOn(g as any, theReaderBySignIn(g as any, reader.userId));
    return {
      id: r.id,
      who: mayName ? nameOf(r.fromParticipant) : null,
      checkIn: (g?.label ?? '').trim(),
      what: r.what.trim(),
      asked: new Date(r.createdAt).toISOString(),
      ...theDueFields(r, today),
    };
  });

  const people = new Set(kept.map((r) => r.fromParticipant?.userId || r.fromParticipant?.email?.toLowerCase() || r.fromParticipantId));
  const checkIns = new Set(kept.map((r) => r.groundId));
  const says = `${plural(items.length, 'request', 'requests')} from ${plural(people.size, 'person', 'people')} across ${plural(checkIns.size, 'check-in', 'check-ins')}.`;
  return { items, says };
}
