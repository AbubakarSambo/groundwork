import { RoleFunction, UniversalMode, priorFunctionFromRole, MIN_COACHING_CONFIDENCE } from './role-maps';

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
  /**
   * SUPPORT SIGNALS, AND THE REASON THEY ARE NOT JUST "ticket".
   *
   * A twelve-session record about clearing a support queue scored zero on all nine
   * functions, so this list exists. But the lesson that made SALES strict applies
   * here too: `account` is a bank account and an account of events, `case` is a
   * legal case and a use case, `customer` appears in every commercial conversation.
   * So the words are the ones only this work uses, or are paired with an object that
   * makes them unambiguous.
   */
  [RoleFunction.SUPPORT]: [
    /\b(ticket[s]?|queue|triage[ds]?|escalation|sla|first response|resolution time)\b/i,
    /\b(customer|client) (?:waiting|complained|reported|raised|chased|churn)\b/i,
    /\b(workaround|known issue|root cause|repeat (?:issue|problem)|came back again)\b/i,
    /\b(help ?desk|service desk|support (?:rota|inbox|queue|request))\b/i,
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
/*
 * SOMEBODY WHO RUNS THEIR OWN BUSINESS HAS NO OFFICE FUNCTION. Run 10, 21 Sep 2026, read off the
 * individual reports: a poultry farmer was coached as a software engineer ("This is session 3 of
 * engineering work"), a motorbike courier as project management, a cold-store owner as a founder or
 * CEO, a rice miller as sales and expansion. The maps below describe functions inside an
 * organisation - what on track means for a salesperson, an engineer, a finance lead. A farmer, a
 * trader, a driver, a miller or a borrower is not any of those, whatever words their account
 * happens to share with the signal lists. Their role, as they gave it, says so; the read stops there.
 */
const RUNS_THEIR_OWN_BUSINESS =
  /\b(farmer|farm|poultry|birds?|eggs?|layers?|tractor|plough|harvest|hectares?|acres?|maize|paddy|rice mill|miller|destoner|parboil|cold ?store|cold ?chain|motor ?bike|okada|rider|courier|deliver(?:y|ies) business|trader|market woman|market stall|shop ?keeper|kiosk|agro-?dealer|aggregator|borrower|(?:took|taking|got|on|with) a loan|smallholder|agribusiness owner|owner[- ]operator|sole trader|my (?:own )?(?:business|mill|shop|farm|store)|runs? (?:a|my|her|his) (?:own )?(?:business|shop|farm|mill))\b/i;

export function runsTheirOwnBusiness(roleAsDescribed: string | null | undefined): boolean {
  return RUNS_THEIR_OWN_BUSINESS.test(roleAsDescribed ?? '');
}

/**
 * How many hits the WINNING function needs before it is named.
 *
 * Two. One word that happens to sit on a function's list is what everybody's speech does - a
 * consultant who mentioned building a relationship read as ENGINEERING off a single hit. Two hits
 * of the same function is the least that can be called a signal, and it is deliberately not higher:
 * a real account of closing a deal carries two or three sales words in its first sentence, and
 * refusing to read that would be its own kind of wrong.
 */
export const ENOUGH_SIGNALS_TO_NAME_A_FUNCTION = 2;

export function detectFunction(
  roleAsDescribed: string | null | undefined,
  accountTexts: string[],
  previous?: { fn: string | null; confidence: number | null } | null,
): DetectionResult {
  if (runsTheirOwnBusiness(roleAsDescribed)) {
    return { fn: null, confidence: 0, basis: 'Runs their own business; no office function applies, so nothing is read against a role map.' };
  }
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

  /*
   * AND TWO WORDS IN A WHOLE CONVERSATION ARE NOT A JOB.
   *
   * Live run, 24 September 2026, first session of a government liaison consultant: "In-session
   * function read: none -> ENGINEERING (0.51). Account shows engineering work most (1 signals of
   * 2)." One hit, out of two in the entire transcript, named a man who writes letters to ministries
   * as an engineer - and 0.51 clears the coaching threshold, so the next question came off the
   * engineering map.
   *
   * The arithmetic did what it was built to do: dominance is 1 of 2, which reads as a clear winner,
   * and the volume term can only pull a confident read down by a fraction. What was missing is a
   * floor. Below it there is no read, which is the honest answer and costs nothing - the map only
   * decides which question is asked next, and the general questions are the ones everybody gets.
   */
  if (topHits < ENOUGH_SIGNALS_TO_NAME_A_FUNCTION) {
    return prior
      ? {
        fn: prior.fn,
        confidence: Math.min(prior.confidence, 0.45),
        basis: `The account carries one word of ${topFn.toLowerCase().replace(/_/g, ' ')} work and nothing more, which is too little to read a function from. The stated role stands, held provisional.`,
      }
      : {
        fn: null,
        confidence: 0,
        basis: `One word of ${topFn.toLowerCase().replace(/_/g, ' ')} work in the whole account, out of ${total}, and no stated role. Too little to name a function.`,
      };
  }

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
    /*
     * THE STATED ROLE WINS WHEN THE WORDS DISAGREE WITH IT. Run 10: a territory sales rep whose account
     * was full of invoices, credit and arrears read as FINANCE; a new sales rep who talked about
     * chasing and following up read as PROJECT MANAGEMENT; and each was coached against the wrong
     * map for three sessions. The words a job uses are not the job. The title the person gave is
     * what they are answerable for; the account's function is kept as the basis, held low.
     */
    return {
      fn: prior.fn,
      confidence: Math.min(prior.confidence, 0.45),
      basis: `Stated role is ${prior.fn.toLowerCase().replace(/_/g, ' ')}; the account reads more like ${topFn.toLowerCase().replace(/_/g, ' ')} work (${topHits} signals of ${total}). The stated role stands, held provisional.`,
    };
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

/**
 * A ROLE GUESSED WITH LOW CONFIDENCE IS CONFIRMED BEFORE IT IS USED (decision 57, item 5).
 *
 * Reuses `MIN_COACHING_CONFIDENCE` rather than a new number: it is already the one line in this
 * codebase between "confident enough to coach from" and "not" (see role-maps.ts, reads.ts,
 * conversation.service.ts, what-to-work-on-next.ts, the-picture-is-drafted-from-the-reads.ts) - a
 * read below it already never reaches a role-tuned probe or coaching strategy, so a guess this
 * unconfident is exactly the case decision 57 means by "low confidence". Introducing a second,
 * different threshold just for asking would mean the product could ask about a read it was already
 * confident enough to act on, or act on one it had not thought sure enough to even ask about.
 */
export const LOW_CONFIDENCE_CONFIRM_THRESHOLD = MIN_COACHING_CONFIDENCE;

/** The plain, everyday name for a function, the same way the "basis" sentences above say it. */
function plainFunctionName(fn: RoleFunction): string {
  return fn.toLowerCase().replace(/_/g, ' ');
}

/**
 * Whether Groundwork should ask, this once, before a guessed function is used for a role-tuned probe
 * or coaching strategy. Only when there is a guess to confirm, it is below the threshold, and nobody
 * has confirmed or corrected it yet - once confirmed it stands, so this never asks twice.
 */
export function needsRoleConfirmation(
  detection: Pick<DetectionResult, 'fn' | 'confidence'>,
  confirmedAt: Date | null | undefined,
): boolean {
  if (!detection.fn || confirmedAt) return false;
  return (detection.confidence ?? 0) < LOW_CONFIDENCE_CONFIRM_THRESHOLD;
}

/**
 * The plain-words question a person is asked, once, in their own check-in, to confirm a low-
 * confidence read of their function - decision 57's own example: "It sounds like most of your work
 * is sales. Is that right, or would you describe it differently?" The lead may instead confirm it
 * for them on the Context page (a screens-workspace surface; this is the question's wording, used
 * wherever it is asked).
 */
export function roleConfirmationQuestion(fn: RoleFunction): string {
  return `It sounds like most of your work is ${plainFunctionName(fn)}. Is that right, or would you describe it differently?`;
}

/**
 * ASKED ONCE, NOT EVERY CHECK-IN (decision 57, item 5, tightened 30 September 2026).
 *
 * Nothing recorded the person's answer, so a low-confidence, unconfirmed role was put to them again
 * in every check-in until it was confirmed - which for anyone who never gave a clear answer was
 * every check-in forever. The stamp reuses `ConversationTurn.askedFor`, the field a document read
 * differently from a check-in's record already uses the same way (commit 301e558e): the turn that
 * asked is stamped, and a stamp within the cooldown means it is not asked again yet. Unlike that
 * stamp, this one is set from OUTSIDE the turn that carries it - after the check-in closes, once the
 * record is read and the person's answer turns out not to be a clear confirmation or correction - so
 * the value itself, not when it is written, is what a caller checks.
 */
export const ROLE_CONFIRM_ASKED = 'role-confirm-asked';

/** How many periods to wait before asking again after an unclear answer. Not indefinite: a person
 *  who was distracted, not refusing, should still get asked again in time. */
export const ROLE_CONFIRM_COOLDOWN_PERIODS = 2;

/**
 * READING WHAT THEY SAID BACK (decision 57, item 5). Code checks the result: the model classifies
 * the reply as a plain confirmation, a correction (with their own words for the corrected role), or
 * neither - never a role name it invents on its own reading of unrelated text.
 */
export const ROLE_CONFIRMATION_READ_PROMPT = `You are reading how somebody answered a plain, single question about their own role at work. The question they were asked and their reply follow.

Decide only one of these:
- "confirmed": they agreed - "yes", "that's right", "pretty much", or anything else that agrees with no different description of their role.
- "corrected": they described their role differently from how it was put to them. Give their own words for what they said their role is, as close to verbatim as you can, never invented, expanded, or guessed beyond what they actually said.
- "unclear": anything else - they did not really answer, changed the subject, asked a question back, or you cannot tell which of the above it is.

Never invent a role they did not say. "unclear" is a correct and common answer - it is not a failure to give it.`;

export const ROLE_CONFIRMATION_READ_SCHEMA = {
  name: 'role_confirmation_read',
  description: 'Says whether the person confirmed or corrected a plain question about their own role. Judge it from their reply alone.',
  input_schema: {
    type: 'object',
    properties: {
      verdict: { type: 'string', enum: ['confirmed', 'corrected', 'unclear'] },
      correctedRole: { type: 'string', description: 'Their own words for their role. Only when verdict is "corrected".' },
    },
    required: ['verdict'],
  },
} as const;

export type ARoleConfirmationVerdict = { verdict: 'confirmed' } | { verdict: 'corrected'; correctedRole: string } | { verdict: 'unclear' };

/** Turns the model's raw answer into one of the three outcomes, never trusting a "corrected" with nothing said. */
export function theRoleConfirmationVerdict(said: { verdict?: string; correctedRole?: string } | null | undefined): ARoleConfirmationVerdict {
  if (said?.verdict === 'confirmed') return { verdict: 'confirmed' };
  if (said?.verdict === 'corrected' && said.correctedRole?.trim()) return { verdict: 'corrected', correctedRole: said.correctedRole.trim() };
  return { verdict: 'unclear' };
}
