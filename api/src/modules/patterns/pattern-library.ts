/**
 * Part 4 - Patterns and Detection.
 *
 * Pattern codes describe BEHAVIOURS IN THE RECORD. They are never verdicts on a
 * person. A detection is a reason to have a specific conversation - never a
 * reason to make a decision about someone. The product must be as good at
 * recognising genuine work (emitting nothing) as it is at detecting managed
 * submissions.
 */

export interface PatternCode {
  code: string;
  name: string;
  signal: string;
  probe?: string;
}

// Positive patterns. R3 is a positive signal - surfaced separately, never mixed
// with bad-faith codes and never subject to the three-period rule.
export const POSITIVE_CODES: PatternCode[] = [
  {
    code: 'R3',
    name: 'Named Collaborator',
    signal: 'A person names another person positively in their check-in with specific evidence of that person\'s contribution.',
  },
];

export const POSITIVE_CODE_SET = new Set(POSITIVE_CODES.map((c) => c.code));
export const isPositiveCode = (code: string) => POSITIVE_CODE_SET.has(code);

// Delivery & output (D), Behavioural (B), Commercial (K), Equity (E),
// Relationship (R), Senior-hire composites (F). These are the longitudinal
// bad-faith signals the three-period rule governs. (R3 is positive - excluded.)
export const BAD_FAITH_CODES: PatternCode[] = [
  { code: 'D1', name: 'False Completion Reporting', signal: 'Completion claimed; downstream team contradicts.', probe: 'Has the team depending on this confirmed it works for them?' },
  { code: 'D2', name: 'Demo-Ready Shipping', signal: 'Works in walkthroughs, fails in real use.', probe: 'Has anyone outside your team tried to use this independently?' },
  { code: 'D3', name: 'Scope Rewriting', signal: 'Definition of success changes mid-period without naming it.', probe: 'What specifically was the goal when this period started?' },
  { code: 'D4', name: 'Strategy Theater', signal: 'Planning and discussion without workplans or output.', probe: 'What specifically has been produced that can be pointed to?' },
  { code: 'D5', name: 'Half-Built Product', signal: 'UI delivered, backend or workflow missing.', probe: 'Can someone outside your team complete the full workflow today?' },
  { code: 'D6', name: 'Dependency Creation', signal: 'Only one person can operate or explain the system.', probe: 'Who else can run this independently without asking you?' },
  { code: 'D7', name: 'Complexity Inflation', signal: 'Timelines disproportionate to actual scope.', probe: 'What would this take if you had to do it in half the time?' },
  { code: 'D8', name: 'Operational Fragility', signal: 'Repeated failures after supposedly completed delivery.', probe: 'What has broken since this was marked complete?' },

  { code: 'B1', name: 'CEO-Pleasing', signal: 'Optimistic upward reporting disconnected from team reality.', probe: 'What would the team say about this if asked separately?' },
  { code: 'B2', name: 'Confidence Without Delivery', signal: 'Strong presentation, poor execution across multiple periods.', probe: 'What specifically exists now that did not exist last period?' },
  { code: 'B3', name: 'Claimed Work Inflation', signal: 'Ownership claimed for work others delivered.', probe: 'Who else was involved and what specifically did they do?' },
  { code: 'B4', name: 'Founder Backstop Dependency', signal: 'Founder repeatedly rescues executive from operational failures.', probe: 'What happened when you were not available to intervene?' },
  { code: 'B5', name: 'Coordination Without Leverage', signal: 'Heavy communication, no reduction in blockers.', probe: 'What is the team able to do now that they could not do before?' },
  { code: 'B6', name: 'Exploration Without Action', signal: 'Research continues without transition to decision.', probe: 'What decision has been made from this research?' },
  { code: 'B7', name: 'Burn Without Outcomes', signal: 'High cost, low attributable movement.', probe: 'What specifically has this investment produced?' },
  { code: 'B8', name: 'Defensive Leadership', signal: 'Hostility or blame when delivery is questioned.', probe: 'What part of this situation was within your control?' },
  { code: 'B9', name: 'Team Without Direction', signal: 'Team describes different priorities from each other and from their leader.', probe: 'What are the three things the team is focused on right now?' },
  { code: 'B10', name: 'Meeting Dependency', signal: 'Basic execution requires constant calls to proceed.', probe: 'What would need to be true for this to move without a meeting?' },
  { code: 'B11', name: 'Blame Shifting', signal: 'Failures consistently attributed to external factors.', probe: 'What was within your control in this situation?' },
  { code: 'B12', name: 'Stage Mismatch', signal: 'Enterprise processes in startup context or vice versa.', probe: 'Is this structure helping the company move faster or slower?' },

  { code: 'K1', name: 'Sales Documentation Avoidance', signal: 'Decks and proposals instead of named conversations with named decision-makers.' },
  { code: 'K2', name: 'Passive Finance Leadership', signal: 'Spending tracked, waste unchallenged, no intervention.' },
  { code: 'K3', name: 'Reporting Without Intervention', signal: 'Issues flagged repeatedly without resolution or action.' },
  { code: 'K4', name: 'Tactical Busyness', signal: 'Inbox and admin dominate over strategic priorities.' },
  { code: 'K5', name: 'Activity Without Outcome Logic', signal: 'Tasks described without connection to goals.' },

  { code: 'E1', name: 'Equity Without Contribution', signal: 'Equity held, delivery absent across multiple periods.' },
  { code: 'E2', name: 'Intro Evasion', signal: 'Repeated future-tense promises without completions.' },
  { code: 'E3', name: 'Selective Presence', signal: 'Visible in high-status moments, absent in execution.' },
  { code: 'E4', name: 'Founder Burden Imbalance', signal: 'One founder consistently absorbs operational load for the other.' },
  { code: 'E5', name: 'Extractive Behaviour', signal: 'Repeated asks for upside without matching contribution.' },

  { code: 'R1', name: 'Dependency Bottleneck', signal: 'Multiple people name this person as a blocker without resolution.' },
  { code: 'R2', name: 'Ambiguity Generator', signal: 'Work from this person consistently creates confusion for others.' },
  { code: 'R4', name: 'Relationship Drift', signal: 'Two people who previously corroborated each other stop appearing in each other\'s check-ins.' },

  { code: 'F1', name: 'Insight Without Operation', signal: 'High thinking language, low output language. Ideas are genuinely good - a role mismatch, not dishonesty.', probe: 'What exists now - a document, a decision acted on, a process running - that would not exist if you had not been here this period?' },
  { code: 'F2', name: 'Vision Execution Gap', signal: 'Senior person describes strategy with confidence; team check-ins show no trace of it; team describes working to their own priorities.', probe: 'Your record describes direction-setting. The team\'s record describes working independently. Help me understand that gap.' },
  { code: 'F3', name: 'Equity Comfort', signal: 'Early check-ins specific and energised; later ones broader and more philosophical; specificity declining while equity continues vesting.', probe: 'Your contributions have shifted over time. Is that a deliberate change in how you see your role?' },
  { code: 'F4', name: 'Relationship Without Leverage', signal: 'Team genuinely likes working with the person; nothing they are responsible for has materially accelerated.', probe: 'What has the team been able to do this period because of your work specifically?' },
  { code: 'F5', name: 'Cofounder Burden Asymmetry', signal: 'One cofounder\'s record consistently shows more operational work, absorption and rescue; the other shows more strategic narrative.', probe: 'Surface to alignment feed only. Never name to either person directly.' },
];

// Patterns that may surface to the alignment feed but must NEVER be named to
// either person directly (Part 4 / alignment feed).
// LOW_SPEC_MULTI_DIM: 3+ dimensions vague/managed in one session - admin-only flag;
// participant is never told. Session builder reads it and shifts approach silently.
export const ALIGNMENT_FEED_ONLY_CODES = new Set(['F5', 'E4', 'LOW_SPEC_MULTI_DIM', 'COLLUSION_RISK']);

// ---------------------------------------------------------------------------
// COLLUSION_RISK - cross-party detector (feature: collusion detection).
//
// Collusion here = two parties corroborate each other's claims and the ONLY
// evidence for those claims is each other (reciprocal vouching, same claim
// framed settled, NO independent anchor). This is a REVIEWABLE ADMIN FLAG,
// never a verdict and never shown to the accused (feed-only above; no probe).
//
// The FP design is the whole point: an independent anchor (a document, a third
// party's record, a named external) exempts the pair BEFORE anything else -
// genuine work leaves traces outside the two people doing it. Prefer false
// negatives over false positives.
// ---------------------------------------------------------------------------

/** Completion / settled-claim framing shared with the single-party detectors. */
export const COLLUSION_COMPLETION_WORDS = [
  'completed', 'complete', 'done', 'finished', 'shipped', 'delivered',
  'launched', 'agreed', 'signed off', 'signed-off', 'confirmed', 'resolved',
];

export interface CollusionGateInput {
  aNamesB: boolean; // A's record names B
  bNamesA: boolean; // B's record names A
  aCompletionOnShared: boolean; // A frames the shared claim as settled/done
  bCompletionOnShared: boolean; // B frames the shared claim as settled/done
  sharedTopicTokens: string[]; // topic overlap between the entries where they name each other
  hasIndependentAnchor: boolean; // any document / third-party record / named external on the claim
}

/**
 * The cheap rule-based candidate gate. Pure and deterministic so the
 * false-positive design can be tested directly. Order matters: the independent
 * anchor is the HARD GATE and is checked first - if the claim is corroborated
 * by anything outside the pair, it is never a candidate.
 */
export function collusionRuleGate(i: CollusionGateInput): { candidate: boolean; reason: string } {
  // 1. HARD GATE - independent anchor exempts the pair, full stop.
  if (i.hasIndependentAnchor) return { candidate: false, reason: 'independent anchor present (document / third party / external)' };
  // 2. Reciprocity required - one-directional credit is R3, not collusion.
  if (!(i.aNamesB && i.bNamesA)) return { candidate: false, reason: 'not reciprocal (one-directional or no mutual mention)' };
  // 3. Same claim, both framing it as settled.
  if (!(i.aCompletionOnShared && i.bCompletionOnShared)) return { candidate: false, reason: 'no shared completion framing' };
  // 4. There must be an actual shared claim (topic overlap), not two different things.
  if (i.sharedTopicTokens.length === 0) return { candidate: false, reason: 'no shared claim (no topic overlap)' };
  return { candidate: true, reason: 'reciprocal vouching on a shared settled claim with no independent anchor' };
}

/**
 * Cross-party AI-confirm prompt (analog of PATTERN_DETECTION_PROMPT, extended
 * to a pair). Conservative by construction; returns YES only when the circular
 * corroboration is unambiguous. Never a verdict, never infers intent.
 */
export const COLLUSION_CONFIRM_PROMPT = `You are a pattern-detection verifier looking at TWO parties' records from the same ground, for a possible COLLUSION_RISK pattern.

COLLUSION_RISK means: the two accounts corroborate the SAME claim only through EACH OTHER, with no independent trace (no document, no third party, no named external). Reciprocal vouching, same claim treated as settled, and nothing outside the pair supports it.

This is a pattern-level observation for admin review, never a verdict and never an accusation. Emit YES only if the circular, unanchored mutual corroboration is genuinely and unambiguously present. If two people simply agree, or if either account points to anything outside the pair, answer NO. When in doubt, answer NO - a false positive is far more damaging than a missed one.

Answer only YES or NO. No explanation.`;

const KNOWN_CODES = new Set(BAD_FAITH_CODES.map((c) => c.code));
export const isBadFaithCode = (code: string) => KNOWN_CODES.has(code);

// Live-conversation trust boundary: a detected pattern is NEVER stated to the
// person as an observation or verdict in the live conversation - that belongs
// only in the report (see reports.service.ts's concernFlags routing). A
// pattern may only ever sharpen a follow-up QUESTION, the same way the
// INVISIBLE_LABOUR cross-reference already works - the person experiences a
// better question, never the detected pattern itself.
//
// This map is deliberately an ALLOWLIST built from BAD_FAITH_CODES' own
// authored `probe` field, not a denylist - a code with no entry here has no
// safe question form and is excluded from the live path by construction, not
// by remembering to exclude it. F5 is explicitly excluded even though it has
// a `probe` string, because that string is a routing instruction ("Surface to
// alignment feed only..."), not a real question - it must never be mistaken
// for one here.
export const PATTERN_PROBE_BY_CODE = new Map<string, string>(
  BAD_FAITH_CODES.filter((c) => c.probe && c.code !== 'F5').map((c) => [c.code, c.probe as string]),
);

// The prompt that drives detection over one party's period (transcript + record).
export const PATTERN_DETECTION_PROMPT = `You analyse ONE party's check-in for a single period and identify whether any behavioural pattern signals are present in the record. You are looking at the record, not judging the person.

Hard rules:
- Emit a code ONLY when its signal is genuinely present in this period's evidence. When the work is genuine and verified, emit NOTHING - recognising real work matters as much as detecting managed submissions.
- Each observation must be written at the PATTERN level, in plain language, describing what the record shows - NEVER a verdict, never "this person is X". Example: "The record describes completion without downstream confirmation." Never name the person.
- Do not infer intent. A pattern is a reason to have a specific conversation, not a conclusion.
- One data point is not a pattern. You are emitting a per-period observation; the system applies the three-period rule across periods. Do not claim a pattern is established.

The pattern codes and their signals:
${BAD_FAITH_CODES.map((c) => `- ${c.code} (${c.name}): ${c.signal}`).join('\n')}

Return the codes whose signal is present this period, each with a one-sentence plain-language observation of what the record shows.`;

export const PATTERN_DETECTION_SCHEMA = {
  name: 'emit_pattern_signals',
  description: 'Emit the behavioural pattern signals present in this period (empty if the work looks genuine).',
  input_schema: {
    type: 'object',
    properties: {
      detections: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            code: { type: 'string', enum: BAD_FAITH_CODES.map((c) => c.code), description: 'The pattern code.' },
            observation: { type: 'string', description: 'Plain-language, pattern-level description of what the record shows. Never names the person; never a verdict.' },
          },
          required: ['code', 'observation'],
        },
      },
    },
    required: ['detections'],
  },
};

// ---------------------------------------------------------------------------
// Rule-based detection infrastructure
// ---------------------------------------------------------------------------

/**
 * Per-code thresholds loaded from PatternConfig DB rows.
 * All fields are optional - missing values fall back to the hardcoded defaults
 * that were correct at launch so detectors never break on a sparse config.
 */
export interface PatternThresholds {
  consecutivePeriods?: number;
  outputScoreMax?: number | null;
  outputScoreMin?: number | null;
  thinkingScoreMax?: number | null;
  thinkingScoreMin?: number | null;
  meetingScoreMax?: number | null;
  meetingScoreMin?: number | null;
  specificityScoreMax?: number | null;
  keywordCountMin?: number | null;
  enabled?: boolean;
}

/** Map of pattern code → thresholds, populated from DB at detection time. */
export type PatternConfigMap = Record<string, PatternThresholds>;

export interface DetectionInput {
  submissions: string[];       // raw text from each period's check-in
  meetingScore?: number[];     // 0-1 per period (from intake)
  outputScore?: number[];      // 0-1 per period (from intake)
  thinkingScore?: number[];    // 0-1 per period (from intake)
  specificityScores?: number[]; // 0-1 per period (from intake)
  role?: string;               // participant's declared role
  /** Codes that have already been SURFACED for this participant (used for F1 composite). */
  priorSurfacedCodes?: string[];
  /** Live thresholds loaded from DB. Detectors fall back to hardcoded defaults when absent. */
  config?: PatternConfigMap;
}

function hasWords(text: string, words: string[]): boolean {
  const t = text.toLowerCase();
  return words.some(w => t.includes(w));
}

function cfg(input: DetectionInput, code: string): PatternThresholds {
  return input.config?.[code] ?? {};
}

function countPeriods(input: DetectionInput): number {
  return input.submissions.length;
}

function avgScore(scores: number[] | undefined, from: number, count: number): number {
  if (!scores || scores.length === 0) return 0;
  const slice = scores.slice(from, from + count);
  return slice.reduce((a, b) => a + b, 0) / Math.max(1, slice.length);
}

// ---------------------------------------------------------------------------
// D-codes
// ---------------------------------------------------------------------------

export function detectD1(input: DetectionInput): boolean {
  const COMPLETION = ['completed', 'done', 'finished', 'shipped', 'delivered', 'launched'];
  const PROBLEM = ['not working', 'broken', 'failing', 'blocked', 'issue', 'bug', 'delay'];
  let count = 0;
  for (const sub of input.submissions) {
    if (hasWords(sub, COMPLETION) && hasWords(sub, PROBLEM)) count++;
  }
  return count >= 2;
}

export function detectD2(input: DetectionInput): boolean {
  const DEMO = ['demo', 'prototype', 'proof of concept', 'not production', 'mvp', 'mock'];
  let count = 0;
  for (const sub of input.submissions) {
    if (hasWords(sub, DEMO)) count++;
  }
  return count >= 2;
}

export function detectD3(input: DetectionInput): boolean {
  const SCOPE = ['originally', 'actually', 'scope changed', 'we decided to', 'pivoted', 'revised the plan'];
  let count = 0;
  for (const sub of input.submissions) {
    if (hasWords(sub, SCOPE)) count++;
  }
  return count >= 2;
}

export function detectD4(input: DetectionInput): boolean {
  const t = cfg(input, 'D4');
  const periods = t.consecutivePeriods ?? 3;
  const outMax = t.outputScoreMax ?? 0.25;
  const thinkMin = t.thinkingScoreMin ?? 0.5;
  return countPeriods(input) >= periods &&
    (input.outputScore ?? []).slice(-periods).every(s => s < outMax) &&
    (input.thinkingScore ?? []).slice(-periods).every(s => s > thinkMin);
}

export function detectD5(input: DetectionInput): boolean {
  const ALMOST = ['almost', 'nearly done', '80%', '90%', 'partially', 'mostly done', 'close to'];
  let count = 0;
  for (const sub of input.submissions) {
    if (hasWords(sub, ALMOST)) count++;
  }
  return count >= 3;
}

export function detectD6(input: DetectionInput): boolean {
  const BLOCKED = ['waiting on', 'blocked by', 'need x before', 'depends on', 'pending approval', 'held up'];
  let count = 0;
  for (const sub of input.submissions) {
    if (hasWords(sub, BLOCKED)) count++;
  }
  return count >= 3;
}

export function detectD7(input: DetectionInput): boolean {
  if (countPeriods(input) < 3) return false;
  const JARGON = ['paradigm', 'synergy', 'ecosystem', 'stakeholder alignment', 'leverage', 'ideation', 'cadence'];
  let jargonGrowing = false;
  for (let i = 1; i < input.submissions.length; i++) {
    const prev = input.submissions[i - 1].toLowerCase();
    const curr = input.submissions[i].toLowerCase();
    const prevJ = JARGON.filter(j => prev.includes(j)).length;
    const currJ = JARGON.filter(j => curr.includes(j)).length;
    if (currJ > prevJ) jargonGrowing = true;
  }
  return jargonGrowing && (input.outputScore ?? []).slice(-2).every(s => s < 0.3);
}

export function detectD8(input: DetectionInput): boolean {
  const FRAGILE = ['only i know', "i'm the only one", 'i handle all', 'no one else can', 'i am the only', 'only me'];
  let count = 0;
  for (const sub of input.submissions) {
    if (hasWords(sub, FRAGILE)) count++;
  }
  return count >= 2;
}

// ---------------------------------------------------------------------------
// B-codes
// ---------------------------------------------------------------------------

export function detectB1(input: DetectionInput): boolean {
  const CEO_POS = ['founder loves it', 'ceo is happy', 'leadership is pleased', 'great feedback from', 'very positive from'];
  const SELF_CRIT = ['my mistake', 'i should have', 'my fault', 'i missed', 'i failed to'];
  let ceoCount = 0;
  let critCount = 0;
  for (const sub of input.submissions) {
    if (hasWords(sub, CEO_POS)) ceoCount++;
    if (hasWords(sub, SELF_CRIT)) critCount++;
  }
  return ceoCount >= 3 && critCount === 0;
}

export function detectB2(input: DetectionInput): boolean {
  const t = cfg(input, 'B2');
  const periods = t.consecutivePeriods ?? 3;
  const thinkMin = t.thinkingScoreMin ?? 0.6;
  const outMax = t.outputScoreMax ?? 0.25;
  return countPeriods(input) >= periods &&
    (input.thinkingScore ?? []).slice(-periods).every(s => s > thinkMin) &&
    (input.outputScore ?? []).slice(-periods).every(s => s < outMax);
}

export function detectB3(input: DetectionInput): boolean {
  const CLAIM = ['i led', 'i drove', 'i built', 'i created', 'i delivered'];
  const VERIFIABLE = ['link', 'doc', 'pr', 'pull request', 'sent to', 'delivered to', 'shipped'];
  let claimCount = 0;
  let verCount = 0;
  for (const sub of input.submissions) {
    if (hasWords(sub, CLAIM)) claimCount++;
    if (hasWords(sub, VERIFIABLE)) verCount++;
  }
  return claimCount >= 3 && verCount === 0;
}

export function detectB4(input: DetectionInput): boolean {
  const RESCUE = ['founder stepped in', 'ceo had to', 'they rescued', 'founder helped', 'had to escalate to'];
  let count = 0;
  for (const sub of input.submissions) {
    if (hasWords(sub, RESCUE)) count++;
  }
  return count >= 2;
}

export function detectB5(input: DetectionInput): boolean {
  const t = cfg(input, 'B5');
  const periods = t.consecutivePeriods ?? 3;
  const meetMin = t.meetingScoreMin ?? 0.5;
  const outMax = t.outputScoreMax ?? 0.2;
  return countPeriods(input) >= periods &&
    (input.meetingScore ?? []).slice(-periods).every(s => s > meetMin) &&
    (input.outputScore ?? []).slice(-periods).every(s => s < outMax);
}

export function detectB6(input: DetectionInput): boolean {
  const EXPLORE = ['exploring', 'researching', 'looking into', 'investigating', 'evaluating options'];
  let count = 0;
  for (const sub of input.submissions) {
    if (hasWords(sub, EXPLORE)) count++;
  }
  return count >= 3;
}

export function detectB7(input: DetectionInput): boolean {
  const BURN = ['long hours', 'busy week', 'lots of meetings', 'stretched', 'working late', 'non-stop'];
  let count = 0;
  for (const sub of input.submissions) {
    if (hasWords(sub, BURN)) count++;
  }
  return count >= 3 && (input.outputScore ?? []).slice(-3).every(s => s < 0.25);
}

export function detectB8(input: DetectionInput): boolean {
  const DEFENSIVE = ["not my responsibility", "wasn't told", 'no one told me', 'not my fault', 'they should have'];
  let count = 0;
  for (const sub of input.submissions) {
    if (hasWords(sub, DEFENSIVE)) count++;
  }
  return count >= 2;
}

export function detectB9(input: DetectionInput): boolean {
  const VAGUE = ['various things', 'several things', 'lots going on', 'multiple items', 'working on different'];
  let count = 0;
  for (const sub of input.submissions) {
    if (hasWords(sub, VAGUE)) count++;
  }
  return count >= 3;
}

export function detectB10(input: DetectionInput): boolean {
  const t = cfg(input, 'B10');
  const periods = t.consecutivePeriods ?? 3;
  const meetMin = t.meetingScoreMin ?? 0.6;
  const outMax = t.outputScoreMax ?? 0.2;
  return countPeriods(input) >= periods &&
    (input.meetingScore ?? []).slice(-periods).every(s => s > meetMin) &&
    (input.outputScore ?? []).slice(-periods).every(s => s < outMax);
}

export function detectB11(input: DetectionInput): boolean {
  const BLAME = ['because of them', 'if only', 'they should have', 'because of the team', 'it was their'];
  let count = 0;
  for (const sub of input.submissions) {
    if (hasWords(sub, BLAME)) count++;
  }
  return count >= 2;
}

export function detectB12(input: DetectionInput): boolean {
  const STRATEGY = ['vision', 'culture', 'ecosystem', 'market position', 'thought leadership', 'brand narrative'];
  const OPERATION = ['shipped', 'deployed', 'invoiced', 'signed', 'delivered'];
  let stratCount = 0;
  let opCount = 0;
  for (const sub of input.submissions) {
    if (hasWords(sub, STRATEGY)) stratCount++;
    if (hasWords(sub, OPERATION)) opCount++;
  }
  return stratCount >= 3 && opCount === 0;
}

// ---------------------------------------------------------------------------
// K-codes
// ---------------------------------------------------------------------------

export function detectK1(input: DetectionInput): boolean {
  if (!['sales', 'business development', 'account executive'].includes(input.role?.toLowerCase() ?? '')) return false;
  const NUMBERS = ['signed', 'closed', 'revenue', 'pipeline', 'deal', 'contract', 'proposal sent'];
  let count = 0;
  for (const sub of input.submissions) {
    if (!hasWords(sub, NUMBERS)) count++;
  }
  return count >= 3;
}

export function detectK2(input: DetectionInput): boolean {
  const PASSIVE = ['reviewing the numbers', 'tracking spend', 'monitoring', 'waiting for invoices'];
  let count = 0;
  for (const sub of input.submissions) {
    if (hasWords(sub, PASSIVE)) count++;
  }
  return count >= 3;
}

export function detectK3(input: DetectionInput): boolean {
  const REPORT = ['flagged', 'reported', 'raised this', 'told the team', 'mentioned it'];
  const ACTION = ['resolved', 'fixed', 'actioned', 'addressed', 'closed out'];
  let rCount = 0;
  let aCount = 0;
  for (const sub of input.submissions) {
    if (hasWords(sub, REPORT)) rCount++;
    if (hasWords(sub, ACTION)) aCount++;
  }
  return rCount >= 2 && aCount === 0;
}

export function detectK4(input: DetectionInput): boolean {
  return countPeriods(input) >= 3 &&
    (input.meetingScore ?? []).slice(-3).every(s => s > 0.55) &&
    (input.outputScore ?? []).slice(-3).every(s => s < 0.25);
}

export function detectK5(input: DetectionInput): boolean {
  const ACTIVITY = ['completed tasks', 'handled requests', 'processed', 'managed admin'];
  const OUTCOME = ['revenue', 'growth', 'signed', 'shipped', 'hired', 'launched'];
  let aCount = 0;
  let oCount = 0;
  for (const sub of input.submissions) {
    if (hasWords(sub, ACTIVITY)) aCount++;
    if (hasWords(sub, OUTCOME)) oCount++;
  }
  return aCount >= 3 && oCount === 0;
}

// ---------------------------------------------------------------------------
// E-codes
// ---------------------------------------------------------------------------

export function detectE1(input: DetectionInput): boolean {
  const EQUITY = ['vesting', 'equity', 'shares', 'cap table', 'cliff'];
  const DELIVERY = ['shipped', 'built', 'launched', 'delivered', 'signed'];
  let eCount = 0;
  let dCount = 0;
  for (const sub of input.submissions) {
    if (hasWords(sub, EQUITY)) eCount++;
    if (hasWords(sub, DELIVERY)) dCount++;
  }
  return eCount > 0 && dCount === 0 && countPeriods(input) >= 3;
}

export function detectE2(input: DetectionInput): boolean {
  const INTRO = ['will introduce', 'going to connect', 'planning to reach out', 'will make the intro'];
  const DONE = ['introduced', 'connected', 'intro made', 'sent over', 'made the connection'];
  let futureCount = 0;
  let doneCount = 0;
  for (const sub of input.submissions) {
    if (hasWords(sub, INTRO)) futureCount++;
    if (hasWords(sub, DONE)) doneCount++;
  }
  return futureCount >= 3 && doneCount === 0;
}

export function detectE3(input: DetectionInput): boolean {
  const PRESENCE = ['was around', 'available when needed', 'checked in', 'was present for'];
  let count = 0;
  for (const sub of input.submissions) {
    if (hasWords(sub, PRESENCE) && (input.outputScore?.[input.submissions.indexOf(sub)] ?? 0) < 0.2) count++;
  }
  return count >= 3;
}

export function detectE4(input: DetectionInput): boolean {
  const ABSORPTION = ['absorbed', 'picked up', 'covered for', 'took on their'];
  const RESCUE = ['had to step in', 'saved the situation', 'rescued', 'bailed out'];
  let absCount = 0;
  let rescCount = 0;
  for (const sub of input.submissions) {
    if (hasWords(sub, ABSORPTION)) absCount++;
    if (hasWords(sub, RESCUE)) rescCount++;
  }
  return (absCount + rescCount) >= 2;
}

export function detectE5(input: DetectionInput): boolean {
  const ASKS = ['needs more', 'asking for', 'wants a raise', 'requested more equity', 'demanding'];
  let count = 0;
  for (const sub of input.submissions) {
    if (hasWords(sub, ASKS)) count++;
  }
  return count >= 3;
}

// ---------------------------------------------------------------------------
// R-codes
// ---------------------------------------------------------------------------

export function detectR1(input: DetectionInput): boolean {
  return detectD8(input) && countPeriods(input) >= 2;
}

export function detectR2(input: DetectionInput): boolean {
  const AMBIG = ['unclear what you meant', 'could you clarify', 'what did you mean by', 'confused by'];
  let count = 0;
  for (const sub of input.submissions) {
    if (hasWords(sub, AMBIG)) count++;
  }
  return count >= 3;
}

export function detectR4(input: DetectionInput): boolean {
  if (input.specificityScores && input.specificityScores.length >= 3) {
    const last3 = input.specificityScores.slice(-3);
    return last3[0] > last3[1] && last3[1] > last3[2];
  }
  return false;
}

// ---------------------------------------------------------------------------
// R3 - positive signal (Named Collaborator)
// ---------------------------------------------------------------------------

export function detectR3(input: DetectionInput): boolean {
  // Signal: another person is named with specific positive evidence - concrete
  // contribution language referencing someone else's work in the same period.
  const POSITIVE_COLLAB = [
    'thanks to', 'credit to', 'great work by', 'shoutout to', 'kudos to',
    'really helped', 'made it happen', 'without whom', 'key contribution from',
    'supported by', 'stepped up', 'went above and beyond',
  ];
  let count = 0;
  for (const sub of input.submissions) {
    if (hasWords(sub, POSITIVE_COLLAB)) count++;
  }
  return count >= 1;
}

// ---------------------------------------------------------------------------
// F-codes
// ---------------------------------------------------------------------------

/**
 * F1 composite helper. All four conditions must hold simultaneously:
 *   1. High thinking-language score for the last 3 periods (> 0.6).
 *   2. Low output-language score for the last 3 periods (< 0.3).
 *   3. Pattern sustained across at least 3 periods of data.
 *   4. No change despite a prior F1 surfacing (pattern persists after awareness).
 * Returns true only when all four are met.
 */
export function checkF1Conditions(input: DetectionInput): boolean {
  const t = cfg(input, 'F1');
  const periods = t.consecutivePeriods ?? 3;
  const thinkMin = t.thinkingScoreMin ?? 0.6;
  const outMax = t.outputScoreMax ?? 0.3;
  // Condition 3: at least 3 periods of data.
  if (countPeriods(input) < periods) return false;
  // Condition 1: high thinking-language in all last N periods.
  if (!(input.thinkingScore ?? []).slice(-periods).every(s => s > thinkMin)) return false;
  // Condition 2: low output-language in all last N periods.
  if (!(input.outputScore ?? []).slice(-periods).every(s => s < outMax)) return false;
  // Condition 4: F1 was already surfaced before and the pattern persists (no change).
  if (!(input.priorSurfacedCodes ?? []).includes('F1')) return false;
  return true;
}

export function detectF1(input: DetectionInput): boolean {
  return checkF1Conditions(input);
}

export function detectF2(input: DetectionInput): boolean {
  const STRATEGY = ['strategy', 'vision', 'direction', 'positioning', 'roadmap'];
  let count = 0;
  for (const sub of input.submissions) {
    if (hasWords(sub, STRATEGY)) count++;
  }
  return count >= 2 && (input.outputScore ?? []).slice(-2).every(s => s < 0.3);
}

export function detectF3(input: DetectionInput): boolean {
  if (!input.specificityScores || input.specificityScores.length < 3) return false;
  const last3 = input.specificityScores.slice(-3);
  return last3[0] > last3[1] && last3[1] > last3[2];
}

export function detectF4(input: DetectionInput): boolean {
  const RELATIONSHIP = ['relationship with', 'meeting with', 'coffee with', 'intro call', 'connected with'];
  const OUTCOME = ['as a result', 'which led to', 'secured', 'closed', 'partner signed'];
  let rCount = 0;
  let oCount = 0;
  for (const sub of input.submissions) {
    if (hasWords(sub, RELATIONSHIP)) rCount++;
    if (hasWords(sub, OUTCOME)) oCount++;
  }
  return rCount >= 3 && oCount === 0 && countPeriods(input) >= 6;
}

export function detectF5(input: DetectionInput): boolean {
  return detectE4(input) && countPeriods(input) >= 2;
}

// ---------------------------------------------------------------------------
// Master dispatcher
// ---------------------------------------------------------------------------

export const PATTERN_DETECTORS: Record<string, (input: DetectionInput) => boolean> = {
  D1: detectD1, D2: detectD2, D3: detectD3, D4: detectD4,
  D5: detectD5, D6: detectD6, D7: detectD7, D8: detectD8,
  B1: detectB1, B2: detectB2, B3: detectB3, B4: detectB4,
  B5: detectB5, B6: detectB6, B7: detectB7, B8: detectB8,
  B9: detectB9, B10: detectB10, B11: detectB11, B12: detectB12,
  K1: detectK1, K2: detectK2, K3: detectK3, K4: detectK4, K5: detectK5,
  E1: detectE1, E2: detectE2, E3: detectE3, E4: detectE4, E5: detectE5,
  R1: detectR1, R2: detectR2, R3: detectR3, R4: detectR4,
  F1: detectF1, F2: detectF2, F3: detectF3, F4: detectF4, F5: detectF5,
};

export function detectPattern(code: string, input: DetectionInput): boolean {
  const fn = PATTERN_DETECTORS[code];
  return fn ? fn(input) : false;
}
