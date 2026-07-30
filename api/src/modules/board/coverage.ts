/**
 * WHERE WORK IS LANDING (the coverage read).
 *
 * Named from the mock's own subtitle - "whose work is landing where" - not
 * "encroachment". Encroachment only ever describes the bad direction, and this
 * read is explicitly TWO-SIDED: it has to hold leaking-out and absorbing-in
 * without the label itself doing the accusing.
 *
 * The mechanic: a drop in ownership rarely announces itself. The work does not
 * vanish, it gets absorbed by others. So the clearest tell that someone stopped
 * owning their responsibility is that their responsibilities increasingly show
 * up in OTHER people's accounts. It is EARLY - it shows before targets are
 * missed, because the targets still get hit, by whoever absorbed the work.
 *
 * Why it is dangerous, and why the shape below is what it is: "other people
 * doing your work" is genuinely ambiguous and means four different things. A raw
 * score punishes the overloaded, mislabels healthy teamwork, and blames the
 * person being encroached upon. So it is surfaced as a SIGNAL COUPLED TO THE
 * REASON IT CANNOT SELF-DETERMINE, two-sided, own-voice enabled, never a verdict.
 */

export enum CoverageKind {
  /** Their work is increasingly landing in others' accounts. The early warning. */
  LEAKING = 'LEAKING',
  /** They are taking on others' work. Watch for overload, not for a drop. */
  ABSORBING = 'ABSORBING',
  /** Work is staying where it belongs. Healthy. */
  STABLE = 'STABLE',
}

/** The four things a coverage signal can mean. The read must name which, or say it cannot tell. */
export enum CoverageReason {
  /** Others covering a gap. The signal you actually want to catch. */
  OWNERSHIP_DROP = 'OWNERSHIP_DROP',
  /** Healthy shared work by design. Must NOT be flagged. */
  SHARED_BY_DESIGN = 'SHARED_BY_DESIGN',
  /** They are blocked or overloaded and others stepped in. The team working well. */
  BLOCKED_OR_OVERLOADED = 'BLOCKED_OR_OVERLOADED',
  /** Someone else is over-reaching into their role. A problem with the OTHER person. */
  OVER_REACH = 'OVER_REACH',
  /** Genuinely cannot tell from the record. The honest default. */
  CANNOT_DETERMINE = 'CANNOT_DETERMINE',
}

/** The scopes the same signal is read at, where it means four different things. */
export type CoverageScope = 'project' | 'role' | 'department' | 'company';

export interface CoverageRead {
  participantId: string;
  name: string | null;
  scope: CoverageScope;
  /** 0-100. Only rendered in the bar variant; the text variant never shows it. */
  pct: number;
  kind: CoverageKind;
  trend: 'rising' | 'stable' | 'falling';
  /** What the record shows, plainly. */
  what: string;
  reason: CoverageReason;
  /** Why it cannot self-determine which of the four this is. Always attached. */
  reasonText: string;
  /** The person's own note, from their next check-in. Never overwritten by the engine. */
  ownVoice: string | null;
  /** True when this person is blocked - couples the read to the dependency layer. */
  coupledToBlocker: boolean;
  /** False when the remit was never defined: no boundary, nothing measurable. */
  remitDefined: boolean;
}

export const COVERAGE_SECTION_TITLE = 'Where work is landing';
export const COVERAGE_SECTION_SUBTITLE = 'whose work is landing where';

export const COVERAGE_LEAD_IN =
  'A drop in ownership shows up as your responsibilities landing more and more in other people\'s accounts. Rising is the early warning, often before targets are missed, because the work still gets done, by someone else.';

export const COVERAGE_GUARD_LINE =
  'Other people doing your work can mean four different things: an ownership drop (others covering a gap), healthy shared work by design, you being blocked or overloaded, or someone else over-reaching into your role. This shows the signal and the reason it cannot tell which on its own, two-sided (leaking out vs absorbing in), coupled to the dependency and role-clarity views, with your own voice. It never concludes you stopped contributing. It surfaces a question the team should discuss, not a verdict about a person. Only shown where the role is defined, an undefined boundary has no coverage to measure.';

/** Plain-language label per kind. No word here accuses in one direction only. */
export const COVERAGE_KIND_LABEL: Record<CoverageKind, string> = {
  [CoverageKind.LEAKING]: 'Landing with others',
  [CoverageKind.ABSORBING]: 'Taking on others\' work',
  [CoverageKind.STABLE]: 'Staying with them',
};

export const COVERAGE_REASON_LABEL: Record<CoverageReason, string> = {
  [CoverageReason.OWNERSHIP_DROP]: 'Reads as an ownership gap others are covering',
  [CoverageReason.SHARED_BY_DESIGN]: 'Shared by design, not a gap',
  [CoverageReason.BLOCKED_OR_OVERLOADED]: 'They are blocked or carrying too much, and the team stepped in',
  [CoverageReason.OVER_REACH]: 'Someone else is reaching into this role',
  [CoverageReason.CANNOT_DETERMINE]: 'The record cannot tell which of the four this is',
};

/**
 * Decides which of the four a signal is, from things the record actually knows.
 * Deliberately conservative: it returns CANNOT_DETERMINE rather than guessing
 * OWNERSHIP_DROP, because the cost of wrongly reading a blocked or over-reached
 * person as a slacker is the exact harm this whole read has to avoid.
 */
export function classifyCoverageReason(input: {
  kind: CoverageKind;
  isBlocked: boolean;
  remitDefined: boolean;
  ownVoiceClaimsDelegation: boolean;
  risingPeriods: number;
}): { reason: CoverageReason; reasonText: string } {
  if (!input.remitDefined) {
    return {
      reason: CoverageReason.CANNOT_DETERMINE,
      reasonText:
        'The role was never clearly defined, so there is no boundary to measure work against. Define what this role owns before reading anything into where work is landing.',
    };
  }
  if (input.ownVoiceClaimsDelegation) {
    return {
      reason: CoverageReason.SHARED_BY_DESIGN,
      reasonText:
        'They have said this was handed over deliberately, so it is delegation, not a gap. Their own account settles this one.',
    };
  }
  // STABLE means nothing is moving either way, so there is nothing to explain.
  // Reaching for the blocked or ownership-drop reasons here would attach an
  // explanation to a non-signal, which reads as an accusation about someone whose
  // work is simply staying with them.
  if (input.kind === CoverageKind.STABLE) {
    return {
      reason: CoverageReason.SHARED_BY_DESIGN,
      reasonText:
        'Their responsibilities are staying with them. Nothing is leaking out or piling in, so there is nothing here to read into.',
    };
  }
  if (input.kind === CoverageKind.ABSORBING) {
    return {
      reason: CoverageReason.OVER_REACH,
      reasonText:
        'This is the other side of the read: they are taking work on, not letting it go. Watch for overload rather than for a drop, and check it was by agreement.',
    };
  }
  if (input.isBlocked) {
    return {
      reason: CoverageReason.BLOCKED_OR_OVERLOADED,
      reasonText:
        'Part of their work is blocked (see what people are waiting on), so some of this is the team covering a blocked person, not a drop. Separate the blocked part from the rest before reading anything into it.',
    };
  }
  if (input.kind === CoverageKind.LEAKING && input.risingPeriods >= 3) {
    return {
      reason: CoverageReason.OWNERSHIP_DROP,
      reasonText:
        'Not blocked on anyone, the role is clearly defined, and this has risen over three periods. That reads as an ownership gap others are covering rather than shared work by design. Worth asking about, not concluding.',
    };
  }
  return {
    reason: CoverageReason.CANNOT_DETERMINE,
    reasonText:
      'Not enough in the record yet to tell which of the four this is. Treat it as a question, not a finding.',
  };
}

/**
 * Which UI variant to render. Both ship, so the "does a bar get misread as a
 * verdict" question gets answered by real use rather than by either of us
 * guessing. Default is text - the safer of the two - and the bar is opt-in.
 */
export type CoverageVariant = 'text' | 'bar';
export const DEFAULT_COVERAGE_VARIANT: CoverageVariant = 'text';
