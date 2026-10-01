import { peersAreNamedOn } from './peers-are-named';

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
 *   - Nothing at all when the first step or the last step is one the reader may not read: the two
 *     ends are what the page is about, and a chain without them says nothing true.
 *   - When any step between is hidden, the sentences that sum the whole chain up ("Where it started",
 *     the decision) are left off as well, because they were written from all the steps. The reader
 *     gets the steps they may read, and no more.
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
  if (!mayRead(steps[0]) || !mayRead(steps[steps.length - 1])) return null;
  const readable = steps.filter(mayRead);
  return { id: trace.id, steps: readable, whole: readable.length === steps.length };
}
