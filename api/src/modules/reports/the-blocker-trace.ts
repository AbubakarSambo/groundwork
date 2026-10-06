import { peersAreNamedOn } from './peers-are-named';
import { anArticleSaidMidSentence } from '../board/a-holder-in-their-own-words';

/**
 * WHERE THE BLOCKER STARTED, AS ONE READER MAY READ IT (request 18, D3 trace.txt).
 *
 * The trace is stored without names (BlockerTrace): each step holds the check-in it came from and the
 * id of the person who owns it. This decides which steps a reader may read, and nothing else. Names
 * are put in afterwards by the service, step by step, through the same wrapper every report uses.
 *
 * THE RULES.
 *   - A step is read only from a check-in the reader may open. Where that check-in keeps people apart
 *     (they do not see each other), only the reader's own steps are theirs, unless they run it or
 *     are an admin of the organisation.
 *   - Nothing at all when the last step is one the reader may not read: that is where the blocker is
 *     felt, and what the page is about.
 *   - When any step is hidden, the sentences that sum the whole chain up ("Where it started", the
 *     decision) are left off as well, because they were written from all the steps. The reader gets
 *     the steps they may read, and no more.
 *   - BUT THEY ALWAYS SEE WHICH TEAM IT IS WAITING ON, AND SINCE WHEN (decision 75, item 5). The Sales
 *     lead who cannot open Finance's check-in reads "This is waiting on Finance since 14 September."
 *     and no Finance step. Both come from the handoff in the reader's own check-in (the team as the
 *     person said it there, and the day they said it), so nothing from Finance's check-in is read.
 *     Where the first step is hidden, the trace is served only with that sentence; without it the old
 *     rule stands and nothing is served, because a chain with no start and no team says nothing true.
 */
export interface AStoredStep {
  kind: string;
  groundId: string;
  personId: string | null;
  text: string;
  sourceId: string;
}

export interface AStoredTrace {
  id: string;
  endGroundId: string;
  startGroundId: string;
  steps: AStoredStep[];
  whereItStarted: string;
  decisionNeeded: string | null;
  decisionOwnerParticipantId: string | null;
  /** The handoff in the check-in where it is felt, that the chain was followed from. */
  anchorDependencyId?: string | null;
}

export interface ACheckInTheReaderMayOpen {
  id: string;
  label: string | null;
  initiatorId: string | null;
  scenario?: any;
  peersVisibleToEachOther?: boolean | null;
  /** The reader's own place in it, if they have one. */
  readersParticipantId: string | null;
  /** Who is on it, so the person reviewed can be told apart from a colleague (decision 17). */
  participants?: { id: string; partyType: string; managingOnly?: boolean | null; createdAt?: Date | string | null }[] | null;
}

export interface TheTraceForThisReader {
  id: string;
  steps: AStoredStep[];
  /** True when every step of the chain is readable, so the summing-up sentences may be served too. */
  whole: boolean;
  /** The check-ins whose steps this reader may not read. */
  hiddenGroundIds: string[];
  /** The first step is one this reader may not read: served only with the sentence saying which team it waits on. */
  firstIsHidden: boolean;
  /** Whether this reader may read the handoff the chain was followed from, written by this person. */
  mayReadAStepBy: (groundId: string, personId: string | null) => boolean;
}

export function theTraceForThisReader(
  trace: AStoredTrace,
  mayOpen: Map<string, ACheckInTheReaderMayOpen>,
  reader: { userId: string; role?: string | null },
): TheTraceForThisReader | null {
  const mayRead = (s: AStoredStep): boolean => {
    const g = mayOpen.get(s.groundId);
    if (!g || !(g.label ?? '').trim()) return false;
    const runsIt = (!!g.initiatorId && g.initiatorId === reader.userId) || reader.role === 'ADMIN';
    if (runsIt || peersAreNamedOn(g as any, { participantId: g.readersParticipantId })) return true;
    return !!g.readersParticipantId && s.personId === g.readersParticipantId;
  };
  const steps = Array.isArray(trace.steps) ? trace.steps : [];
  if (steps.length < 2) return null;
  if (!mayRead(steps[steps.length - 1])) return null;
  const readable = steps.filter(mayRead);
  return {
    id: trace.id,
    steps: readable,
    whole: readable.length === steps.length,
    hiddenGroundIds: [...new Set(steps.filter((x) => !mayRead(x)).map((x) => x.groundId))],
    firstIsHidden: !mayRead(steps[0]),
    mayReadAStepBy: (groundId, personId) => mayRead({ groundId, personId, kind: '', text: '', sourceId: '' }),
  };
}

/**
 * "This is waiting on Finance since 14 September." From the handoff in the reader's own check-in: the
 * team in the person's own words for it, and the day they said it. "another team" where they named
 * none, or named a person rather than a team. Null where it waits on no check-in hidden from this reader.
 */
export function whichTeamItIsWaitingOn(
  anchor: { onLabel?: string | null; onParticipantId?: string | null; waitingOnGroundId?: string | null; createdAt: Date | string } | null,
  hiddenGroundIds: string[],
  dayInWords: (d: Date) => string,
): string | null {
  if (!anchor?.waitingOnGroundId || !hiddenGroundIds.includes(anchor.waitingOnGroundId)) return null;
  const team = !anchor.onParticipantId ? anArticleSaidMidSentence((anchor.onLabel ?? '').trim().replace(/[.\s]+$/, '')) : '';
  return `This is waiting on ${team || 'another team'} since ${dayInWords(new Date(anchor.createdAt))}.`;
}
