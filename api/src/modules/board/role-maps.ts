/**
 * Role maps: what good and going-wrong look like, per function.
 *
 * The map does TWO different jobs on two different surfaces:
 *
 *  1. IN THE CHAT (see buildRoleProbeBlock): it tunes what gets asked. A
 *     salesperson gets pushed on named buyers, a product lead on whether they
 *     have actually decided, an engineer on what someone else can now do -
 *     because those are the specific ways each function tends to go wrong. The
 *     probe is always a NEUTRAL question about the work; the failure mode is
 *     never named in the question. The mode falls out of the SHAPE of the
 *     answer.
 *
 *  2. ON THE BOARD (see buildContributionReads): it is the lens that reads each
 *     person against their own function's version of on-track, never all of
 *     them on one shared scale. Tech and sales do not share a unit.
 *
 * HARD RULES, carried from the design:
 *  - Detection runs on the person's OWN account only. Never surface another
 *    party's words to prompt them.
 *  - Success signals surface immediately (credit fast). Failure signals need a
 *    PATTERN over the three-period rule before they become a board read (flag
 *    slow) - which is patterns.service.ts's existing observe()/observePositive
 *    split, reused, not reimplemented.
 *  - The engine never renders a verdict about a person ("this person is
 *    avoidant"). It shows the record in the role's own terms, with the reason
 *    attached, and the human decides.
 *  - If the remit is undefined, do NOT assess. Gate first. You cannot measure
 *    someone against a bar that was never set.
 */

/** Functions with a tuned map. Deliberately a small starting library, not all nine. */
export enum RoleFunction {
  SALES = 'SALES',
  PRODUCT = 'PRODUCT',
  ENGINEERING = 'ENGINEERING',
  OPS = 'OPS',
  PROJECT_MANAGEMENT = 'PROJECT_MANAGEMENT',
  MANAGEMENT = 'MANAGEMENT',
}

/**
 * The role-agnostic floor. These apply to ANYONE in any role, so a person whose
 * job was never mapped still gets read fairly - the modes are the floor, not the
 * job buckets. An unmapped role derives its remit live and watches these.
 */
export enum UniversalMode {
  VAGUENESS = 'VAGUENESS',
  AVOIDANCE = 'AVOIDANCE',
  NON_COMMITMENT = 'NON_COMMITMENT',
  ILLEGIBILITY = 'ILLEGIBILITY',
  INVISIBILITY = 'INVISIBILITY',
  UNDER_PERSISTENCE = 'UNDER_PERSISTENCE',
  DIFFUSION = 'DIFFUSION',
}

export interface RoleMap {
  fn: RoleFunction;
  label: string;
  /** The one way ownership breaks here. */
  rootFailure: string;
  /** The one thing mastery looks like here. */
  rootSuccess: string;
  /** What "on track" means in THIS function's terms - the board's yardstick. */
  onTrackMeans: string;
  /** What going wrong looks like - never shown as a verdict, only as a lens. */
  goingWrongLooksLike: string;
  /**
   * The neutral probes the chat asks. Each is a normal question about the work.
   * None of them name a failure mode. The answer's shape is the signal.
   */
  neutralProbes: string[];
  /**
   * How this function's people get unfairly read, and what the engine must
   * therefore protect. This is the fairness half of the map, and it is why the
   * map is not just a stick.
   */
  protectAgainst: string;
  /** Universal modes this function most often expresses. */
  commonModes: UniversalMode[];
}

export const ROLE_MAPS: Record<RoleFunction, RoleMap> = {
  [RoleFunction.SALES]: {
    fn: RoleFunction.SALES,
    label: 'Sales and expansion',
    rootFailure: 'Avoidance. Fear of exposure and rejection, dressed as productivity.',
    rootSuccess: 'Deliberate exposure. The scary right thing, in reps, on the right targets.',
    onTrackMeans: 'Named buyers with budget and authority, real pipeline moving, dated next actions.',
    goingWrongLooksLike: 'Plenty of activity and warm conversations, no named buyer who can actually decide.',
    neutralProbes: [
      'Which of those conversations was with someone who can actually buy, budget and authority?',
      'Which ones specifically, by name?',
      'It went quiet, then what did you try?',
      'What is the next action on that, and by when?',
    ],
    protectAgainst:
      'A rep is made to feel like a failure by a broken internal clock: the buyer-side process takes weeks and none of it is visible to them. Silence is usually a stage, not a rejection.',
    commonModes: [UniversalMode.AVOIDANCE, UniversalMode.UNDER_PERSISTENCE, UniversalMode.VAGUENESS],
  },

  [RoleFunction.PRODUCT]: {
    fn: RoleFunction.PRODUCT,
    label: 'Product',
    rootFailure: 'Non-commitment. Judgment lags, so ownership dissolves into perpetual input.',
    rootSuccess: 'Owned decisions. Makes the call and owns the reasoning, so a wrong bet is examinable.',
    onTrackMeans: 'Decisions actually made and owned, with the reasoning, specific enough to be falsifiable.',
    goingWrongLooksLike: 'Endlessly gathering feedback, direction stated so vaguely nobody can own or disprove it.',
    neutralProbes: [
      'What is the call, and what is the reasoning behind it?',
      'Have you decided, or is this still gathering?',
      'Who owns that decision?',
      'What would you need to actually decide?',
    ],
    protectAgainst:
      'Product runs on slow feedback. Punishing it with a fast metric reads a normal feedback lag as failure.',
    commonModes: [UniversalMode.NON_COMMITMENT, UniversalMode.VAGUENESS],
  },

  [RoleFunction.ENGINEERING]: {
    fn: RoleFunction.ENGINEERING,
    label: 'Engineering',
    rootFailure: 'Illegibility. Real work invisible to non-engineers, so ownership hides.',
    rootSuccess: 'Legible delivery. Ships outcomes and makes them visible in others’ terms.',
    onTrackMeans: 'Shipped and stable, described so a non-engineer can see what changed, blocked stated distinctly from behind.',
    goingWrongLooksLike: 'Committed to "working on" rather than delivering; real foundational work nobody can read.',
    neutralProbes: [
      'What can someone else do now that they could not before?',
      'What shipped that a non-engineer would notice?',
      'Is that blocked, or behind? If blocked, on whom?',
      'What is the shippable thing, and by when?',
    ],
    protectAgainst:
      'The invisible load-bearer and the blocked-not-slacking person both look like low contribution on a naive read. Foundational work must be surfaced and credited, and blocked must never read as behind.',
    commonModes: [UniversalMode.ILLEGIBILITY, UniversalMode.INVISIBILITY],
  },

  [RoleFunction.OPS]: {
    fn: RoleFunction.OPS,
    label: 'Operations and people',
    rootFailure: 'Invisibility. Seen only in failure, and "no drama" rewards avoidance.',
    rootSuccess: 'Held and visible. Handoffs hold, hard conversations happen on time, the good is surfaced.',
    onTrackMeans: 'Handoffs held and owned, the hard conversation had on time, preventive work visible.',
    goingWrongLooksLike: '"No issues" that turns out to be suppression; handoffs dropped and owned by nobody.',
    neutralProbes: [
      'What held or ran this period that nobody would have noticed?',
      'What did you prevent?',
      'Which conversation is still waiting to be had?',
      'Who owns that handoff?',
    ],
    protectAgainst:
      'Ops is noticed only when something breaks, so a good period looks like an empty account. Preventive work has to be actively credited or the role reads as low contribution for doing its job well.',
    commonModes: [UniversalMode.INVISIBILITY, UniversalMode.AVOIDANCE],
  },

  [RoleFunction.PROJECT_MANAGEMENT]: {
    fn: RoleFunction.PROJECT_MANAGEMENT,
    label: 'Project management',
    rootFailure: 'Coordination without ownership. Owns the status report, not the outcome.',
    rootSuccess: 'Drives the outcome through others. Clears blockers, holds the critical path.',
    onTrackMeans: 'Blockers driven to cleared, handoffs owned, real risks managed, bad news escalated early.',
    goingWrongLooksLike: 'Reports that something is blocked without driving it; everything green, then a deadline surprise.',
    neutralProbes: [
      'What are you doing to clear that, and who owns the unblock?',
      'What is the real risk to delivery here, not the task list?',
      'What is not on track that has not been said out loud yet?',
    ],
    protectAgainst:
      'A PM with no real authority can be blamed for slippage they could not prevent. Read what they drove, not only what slipped.',
    commonModes: [UniversalMode.DIFFUSION, UniversalMode.UNDER_PERSISTENCE],
  },

  [RoleFunction.MANAGEMENT]: {
    fn: RoleFunction.MANAGEMENT,
    label: 'Management',
    rootFailure:
      'Failure to create ownership in others. Two poles, same root: abdication (nobody held) or control (nobody allowed to own).',
    rootSuccess: 'Multiplies ownership. Gets others to author and own outcomes, holds them with care.',
    onTrackMeans: 'People author their own commitments, slips get noticed and raised, hard conversations happen on time.',
    goingWrongLooksLike:
      'An account full of work the team should own (control), or commitments that slip with no follow-up (abdication).',
    neutralProbes: [
      'Which of these should someone else own, and what would it take to hand it over?',
      'Did they author that, or did you hand it to them?',
      'Last period they committed to something - did that happen?',
      'Which conversation have you been putting off?',
    ],
    protectAgainst:
      'Management is a different competency from the craft. A strong individual contributor made lead is failing at a NEW skill, not regressing at their old one.',
    commonModes: [UniversalMode.DIFFUSION, UniversalMode.AVOIDANCE],
  },
};

/**
 * Universal probes for a role with no tuned map. The engine derives the remit
 * from the person's own account, infers what owning it well looks like, and
 * watches these - while being honest that its confidence is lower than on a
 * tuned map (tentative wording on unmapped roles, confident on mapped ones).
 */
export const UNIVERSAL_PROBES: Record<UniversalMode, string> = {
  [UniversalMode.VAGUENESS]: 'Which ones specifically? By when, exactly?',
  [UniversalMode.AVOIDANCE]: 'Which of those actually moves the outcome?',
  [UniversalMode.NON_COMMITMENT]: 'What is the call, and has it been made?',
  [UniversalMode.ILLEGIBILITY]: 'What can someone else do now that they could not before?',
  [UniversalMode.INVISIBILITY]: 'What worked this period that nobody noticed? What did you prevent?',
  [UniversalMode.UNDER_PERSISTENCE]: 'It went quiet, then what? What did you try when that stalled?',
  [UniversalMode.DIFFUSION]: 'Whose was that? What did you do that someone else should own?',
};

/** Confidence below this must not be coached from - hold the profile open instead. */
export const MIN_COACHING_CONFIDENCE = 0.5;

export function roleMapFor(fn: string | null | undefined): RoleMap | null {
  if (!fn) return null;
  return ROLE_MAPS[fn as RoleFunction] ?? null;
}

/**
 * Maps a stated role/remit to the closest function as a STARTING PRIOR only.
 * Detection is continuous: the engine revises this from what the person's work
 * is actually made of over sessions, and a title is weak evidence. Someone
 * titled "product manager" whose account is all coordination and unblocking
 * reads as functionally PROJECT_MANAGEMENT, and the revision is what catches it.
 *
 * Returns a low confidence deliberately: a title alone should never be enough
 * to coach from.
 */
export function priorFunctionFromRole(
  roleText: string | null | undefined,
): { fn: RoleFunction; confidence: number } | null {
  if (!roleText?.trim()) return null;
  const t = roleText.toLowerCase();

  // ORDER MATTERS. Specific compound titles are matched BEFORE the generic
  // manager/lead pattern, or "project manager" and "product manager" both get
  // swallowed by \bmanager\b and read as people-management, which is wrong for
  // both of them.
  if (/\b(project manager|programme manager|program manager|pmo|delivery manager|delivery lead|scrum master)\b/.test(t)) {
    return { fn: RoleFunction.PROJECT_MANAGEMENT, confidence: 0.4 };
  }
  if (/\b(product manager|product owner|product lead|head of product|product)\b/.test(t)) {
    return { fn: RoleFunction.PRODUCT, confidence: 0.4 };
  }
  if (/\b(engineer|engineering|developer|dev|technical lead|tech lead|cto|architect)\b/.test(t)) {
    return { fn: RoleFunction.ENGINEERING, confidence: 0.4 };
  }
  if (/\b(sales|account exec|account executive|business development|revenue|growth|partnerships)\b/.test(t)) {
    return { fn: RoleFunction.SALES, confidence: 0.4 };
  }
  if (/\b(ops|operations|people|hr|human resources|chief of staff)\b/.test(t)) {
    return { fn: RoleFunction.OPS, confidence: 0.4 };
  }
  // Generic people-leadership LAST. Management sits on top of a functional map
  // rather than replacing it, so this is the fallback when the title says
  // "leads people" without naming the craft.
  if (/\b(head of|vp|chief|director|manager|people lead|team lead|line manager)\b/.test(t)) {
    return { fn: RoleFunction.MANAGEMENT, confidence: 0.35 };
  }
  return null;
}

/**
 * The chat-side block: the probes for this person's function, injected into the
 * scenario pack. Goes into buildScenarioPackForParty, NOT into ENGINE_RULES -
 * the `system` prompt is invariant-checked and reseeded on boot, and a bad edit
 * there hard-fails Nest startup.
 *
 * Returns '' when there is no map or confidence is too low, so an uncertain
 * profile simply adds nothing rather than coaching from a guess.
 */
export function buildRoleProbeBlock(
  fn: string | null | undefined,
  confidence: number | null | undefined,
): string {
  const map = roleMapFor(fn);
  if (!map) return '';
  const confident = (confidence ?? 0) >= MIN_COACHING_CONFIDENCE;

  const probes = map.neutralProbes.map((p) => `- ${p}`).join('\n');
  const hedge = confident
    ? ''
    : '\nThis read of their function is PROVISIONAL. Ask these as ordinary questions about the work, and do not lean on them or imply a conclusion about how they are working.';

  return `READING THIS PERSON'S WORK IN ITS OWN TERMS (${map.label})

For this function, on track means: ${map.onTrackMeans}
Where it usually goes wrong: ${map.goingWrongLooksLike}

Ask the natural next question from this list when it genuinely fits what they just told you. These are ordinary questions about the work, not a checklist to run:
${probes}

NEVER name a failure mode in a question. Do not ask "are you avoiding this" or "are you being vague". Ask about the work; how they answer is the signal, and it is yours to read, not theirs to be told.

Be fair to this function specifically: ${map.protectAgainst}${hedge}`;
}
