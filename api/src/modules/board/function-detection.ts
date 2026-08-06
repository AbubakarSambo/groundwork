import { RoleFunction, UniversalMode, priorFunctionFromRole } from './role-maps';

/**
 * Continuous function detection.
 *
 * The stated role is only a STARTING PRIOR. What actually settles which map
 * reads someone fairly is what their work is made of, over sessions. Someone
 * titled "product manager" whose account is all coordinating other people and
 * clearing blockers is functionally doing project management, and the revision
 * below is what catches that - a title alone must never be enough to coach from.
 *
 * Deliberately conservative:
 *  - Confidence climbs slowly and only when the evidence is consistent.
 *  - A title on its own caps out below MIN_COACHING_CONFIDENCE, so the chat adds
 *    no role-tuned probing until real account texture agrees with it.
 *  - When the signals are mixed, confidence goes DOWN, not up. Holding the
 *    profile open is the honest state, and the alternative (forcing a bucket)
 *    is how a lens becomes a label.
 */

/** Signals in a person's own account that point at a function. */
const FUNCTION_SIGNALS: Record<RoleFunction, RegExp[]> = {
  // SALES SIGNALS HAVE TO BE SALES WORDS.
  //
  // This list used to contain bare `close[ds]?`, `lead[s]?`, `intro` and `demo`.
  // Those are ordinary English in every job. "Closed out three of the open
  // questions with Priya" is project work, and it scored SALES - which is how an
  // entire software team came out classified as sales at 0.78 confidence and got
  // read against "named buyers with budget and authority, real pipeline moving".
  // A lens becomes a label the moment it is confidently wrong, so the generic
  // verbs now need a sales object next to them.
  [RoleFunction.SALES]: [
    /\b(buyer|prospect|pipeline|quota|outreach|client win)\b/i,
    /\b(clos(e|ed|ing)) (the |a |that )?(deal|account|sale|contract|customer|logo)\b/i,
    /\b(deal|sales lead|inbound lead|qualified lead|sales pitch|sales demo|product demo)\b/i,
    /\b(budget holder|decision maker|procurement|proposal|contract sent|renewal (call|conversation|discussion))\b/i,
  ],
  [RoleFunction.PRODUCT]: [
    /\b(roadmap|spec|prioriti[sz]|feature|user research|discovery|backlog|requirement|scope cut)\b/i,
    /\b(decided|the call is|trade.?off|we will not build)\b/i,
  ],
  [RoleFunction.ENGINEERING]: [
    /\b(ship|shipped|deploy|merge[ds]?|refactor|bug|regression|staging|production|test[s]?|api|migration|infra)\b/i,
    /\b(pull request|code review|latency|build|release)\b/i,
  ],
  [RoleFunction.OPS]: [
    /\b(process|handoff|onboard(ing)?|payroll|policy|compliance|vendor|supplier|rota|incident)\b/i,
    /\b(hiring|exit|performance conversation|contract admin)\b/i,
  ],
  [RoleFunction.PROJECT_MANAGEMENT]: [
    /\b(coordinat|chase[ds]?|status|track(ing)?|unblock|critical path|milestone|timeline|dependency|standup)\b/i,
    /\b(escalat|follow[- ]up with|nudged|checked in with)\b/i,
  ],
  [RoleFunction.CEO]: [
    /\b(board|investor|fundrais|runway|strategy|strategic|pivot|vision|leadership team|exec team)\b/i,
    /\b(hired|the whole company|org|culture)\b/i,
  ],
  [RoleFunction.MARKETING]: [
    /\b(campaign|content|brand|positioning|channel|impressions|reach|audience|seo|social|newsletter|launch)\b/i,
    /\b(conversion|sign.?ups|funnel|top of funnel)\b/i,
  ],
  [RoleFunction.FINANCE]: [
    /\b(budget|forecast|margin|cash|runway|invoice|collections|reconcil|payroll cost|spend|p&l|revenue recognition)\b/i,
    /\b(model|modelled|projection|variance)\b/i,
  ],
  [RoleFunction.MANAGEMENT]: [
    /\b(my team|direct report|one.?on.?one|1:1|delegat|hired|performance review|coach(ed|ing)?)\b/i,
    /\b(gave feedback|held them to|their commitment)\b/i,
  ],
};

/** Universal modes read from the shape of an account, independent of function. */
export function detectUniversalModes(texts: string[]): UniversalMode[] {
  const corpus = texts.join(' \n ').toLowerCase();
  const modes: UniversalMode[] = [];
  // Vagueness: quantities and generalities with no nameable specifics.
  const vagueHits = (corpus.match(/\b(several|a few|some|multiple|various|a lot of|lots of|going well|on track|good progress)\b/g) ?? []).length;
  const namedHits = (corpus.match(/\b[A-Z][a-z]{2,}\b/g) ?? []).length;
  if (vagueHits >= 3 && namedHits < vagueHits) modes.push(UniversalMode.VAGUENESS);
  if (/\b(still gathering|still exploring|not decided|too early to tell|waiting to see)\b/.test(corpus)) {
    modes.push(UniversalMode.NON_COMMITMENT);
  }
  if (/\b(working on|looking at|continuing with)\b/.test(corpus) && !/\b(shipped|delivered|live|done|signed)\b/.test(corpus)) {
    modes.push(UniversalMode.ILLEGIBILITY);
  }
  if (/\b(no issues|nothing to report|all quiet|no drama)\b/.test(corpus)) {
    modes.push(UniversalMode.INVISIBILITY);
  }
  if (/\b(went quiet|no response|heard nothing|never replied)\b/.test(corpus) && !/\b(followed up|chased|tried again|another route)\b/.test(corpus)) {
    modes.push(UniversalMode.UNDER_PERSISTENCE);
  }
  return modes;
}

export interface DetectionResult {
  fn: RoleFunction | null;
  confidence: number;
  /** Why this landed where it did. Kept so a low confidence is explainable, not mysterious. */
  basis: string;
}

/**
 * Revise the function profile from the person's own account texts plus the prior.
 *
 * @param roleAsDescribed the stated remit (weak evidence, a prior only)
 * @param accountTexts    this person's own record entries, across sessions
 * @param previous        the profile currently stored, if any
 */
export function detectFunction(
  roleAsDescribed: string | null | undefined,
  accountTexts: string[],
  previous?: { fn: string | null; confidence: number | null } | null,
): DetectionResult {
  const prior = priorFunctionFromRole(roleAsDescribed);

  if (accountTexts.length === 0) {
    // Nothing but a title. Deliberately below the coaching threshold.
    return prior
      ? { fn: prior.fn, confidence: prior.confidence, basis: 'Stated role only, no account yet. Held provisional.' }
      : { fn: null, confidence: 0, basis: 'No stated role and no account yet.' };
  }

  const corpus = accountTexts.join(' \n ');
  const scores = new Map<RoleFunction, number>();
  for (const [fn, patterns] of Object.entries(FUNCTION_SIGNALS) as [RoleFunction, RegExp[]][]) {
    let hits = 0;
    for (const re of patterns) {
      const m = corpus.match(new RegExp(re.source, 'gi'));
      hits += m?.length ?? 0;
    }
    if (hits > 0) scores.set(fn, hits);
  }

  if (scores.size === 0) {
    return prior
      ? { fn: prior.fn, confidence: prior.confidence, basis: 'Account did not clearly show a function. Falling back to the stated role, held provisional.' }
      : { fn: null, confidence: 0, basis: 'Account did not clearly show a function, and no stated role to fall back on.' };
  }

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const [topFn, topHits] = ranked[0];
  const secondHits = ranked[1]?.[1] ?? 0;
  const total = ranked.reduce((s, [, h]) => s + h, 0);

  // Dominance: how clearly the top function beats the runner-up. A near-tie is
  // exactly the case where forcing a bucket would be wrong.
  const dominance = topHits / Math.max(1, topHits + secondHits);
  const volume = Math.min(1, total / 12);
  let confidence = 0.25 + dominance * 0.45 + volume * 0.2;

  // The account disagreeing with the stated title is the interesting case, and
  // the account wins - but only carefully, so a title/account clash lowers
  // confidence rather than confidently overriding on thin evidence.
  const basisParts: string[] = [`Account shows ${topFn.toLowerCase().replace(/_/g, ' ')} work most (${topHits} signals of ${total}).`];
  if (prior && prior.fn !== topFn) {
    confidence -= 0.1;
    basisParts.push(`The stated role suggested ${prior.fn.toLowerCase().replace(/_/g, ' ')}, which the account does not bear out. The account is what counts, but this is held more tentatively because the two disagree.`);
  } else if (prior && prior.fn === topFn) {
    confidence += 0.1;
    basisParts.push('The stated role agrees with the account.');
  }

  // Stability: agreeing with the previously stored read is mild evidence it is
  // real rather than one session's noise.
  if (previous?.fn === topFn) {
    confidence += 0.05;
    basisParts.push('Consistent with the previous read.');
  }

  return {
    fn: topFn,
    confidence: Math.max(0, Math.min(0.95, Number(confidence.toFixed(2)))),
    basis: basisParts.join(' '),
  };
}
