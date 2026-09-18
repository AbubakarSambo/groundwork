
/**
 * WHETHER THE PATTERN LIBRARY IS DOING ANYTHING, MEASURED RATHER THAN ARGUED ABOUT.
 *
 * Ninety named behavioural patterns are written out in full inside the conversation prompt - about
 * 16,000 of its 113,000 characters, read on every single turn. The case for cutting them is strong
 * on paper: the catalogue tells the conversation that "the same pattern must appear in three
 * consecutive check-in periods before a pattern code fires", which is a longitudinal rule, and the
 * conversation sees one session. Counting periods is `patterns.service`, which has its own prompt
 * and does not use these codes at all.
 *
 * WHY THAT IS NOT ENOUGH TO CUT ON. Hafsah's worry, and it is the right one: the conversation may be
 * using the pattern NAMES to shape a probe in the moment - seeing scope rewriting in what somebody
 * just said and asking about it, with no counting involved. If that is happening it is real value,
 * and it would not show up in a short replay. Nobody can currently tell the difference between "this
 * catalogue does nothing" and "this catalogue quietly shapes every probe".
 *
 * SO THIS COUNTS INSTEAD. One log line per reply that reaches a pattern's own language. A week of
 * real conversations then answers the question, the same way "noted, not removed" is answering what
 * the invention gate was worth.
 *
 * WHAT IT CANNOT TELL US, STATED PLAINLY SO NOBODY OVERREADS THE NUMBER. A reply can be shaped by
 * the catalogue without using its words: the model may probe scope rewriting in plain language and
 * never come near the phrase. So a high count is strong evidence the library is working and a zero
 * count is weak evidence that it is not. It narrows the question; it does not close it. If the count
 * is zero, the next step is to cut the catalogue on a branch and compare conversations, not to
 * declare it dead on this number alone.
 *
 * IT CHANGES NOTHING. No reply is inspected for correctness, scored, edited or re-asked. It reads a
 * string and writes a log line.
 */

/**
 * THE NINETY NAMES, HELD HERE RATHER THAN READ OUT OF THE PROMPT.
 *
 * They were read out of ENGINE_RULES so the two could not drift. Then the catalogue was removed from
 * the prompt on 18 September 2026 - and this went blank, which is the one thing it must not do. The
 * whole question is whether removing it costs anything, and an instrument that disappears with the
 * thing it measures cannot answer that. So the names live here now, and they are the list as it was
 * on the day it left.
 */
const THE_NAMED_PATTERNS: [string, string][] = [
  ['A1', 'Coordination Debt Absorber'],
  ['A2', 'Execution Rescuer'],
  ['A3', 'Contributor Suppression'],
  ['B1', 'CEO-Pleasing'],
  ['B1+', 'Honest Upward Reporting'],
  ['B10', 'Meeting Dependency'],
  ['B10+', 'Async Execution'],
  ['B11', 'Blame Shifting'],
  ['B11+', 'Ownership Under Pressure'],
  ['B12', 'Stage Mismatch'],
  ['B12+', 'Stage Awareness'],
  ['B2', 'Confidence Without Delivery'],
  ['B2+', 'Delivery Without Announcement'],
  ['B3', 'Claimed Work Inflation'],
  ['B3+', 'Accurate Attribution'],
  ['B4', 'Founder Backstop Dependency'],
  ['B4+', 'Executive Independence'],
  ['B5', 'Coordination Without Leverage'],
  ['B5+', 'High-Leverage Communication'],
  ['B6', 'Exploration Without Action'],
  ['B6+', 'Research to Decision'],
  ['B7', 'Burn Without Outcomes'],
  ['B7+', 'High-ROI Spend'],
  ['B8', 'Defensive Leadership'],
  ['B8+', 'Non-Defensive Engagement'],
  ['B9', 'Team Without Direction'],
  ['B9+', 'Team Clarity Signal'],
  ['C1', 'Alignment Creator'],
  ['C1+', 'Clarity Creator'],
  ['C2', 'Dependency Manager'],
  ['C2+', 'Dependency Resolved'],
  ['C3', 'Synthesis Contributor'],
  ['C3+', 'Team-Leader Alignment'],
  ['D1', 'False Completion Reporting'],
  ['D1+', 'Evidence-Matched Delivery'],
  ['D2', 'Demo-Ready Shipping'],
  ['D2+', 'Production-Confirmed Delivery'],
  ['D3', 'Scope Rewriting'],
  ['D3+', 'Proactive Scope Alignment'],
  ['D4', 'Strategy Theater'],
  ['D4+', 'Strategy to Execution'],
  ['D5', 'Half-Built Product'],
  ['D5+', 'Full-Stack Delivery'],
  ['D6', 'Dependency Creation'],
  ['D6+', 'Knowledge Distributed'],
  ['D7', 'Complexity Inflation'],
  ['D7+', 'Right-Sized Delivery'],
  ['D8', 'Operational Fragility'],
  ['D8+', 'Stable Delivery'],
  ['E1', 'Equity Without Contribution'],
  ['E1+', 'Equity-Matched Delivery'],
  ['E2', 'Intro Evasion'],
  ['E2+', 'Completed Introduction'],
  ['E3', 'Selective Presence'],
  ['E3+', 'Consistent Presence'],
  ['E4', 'Founder Burden Imbalance'],
  ['E4+', 'Load Distribution'],
  ['E5', 'Extractive Behaviour'],
  ['E5+', 'Reciprocal Contribution'],
  ['F1', 'INSIGHT WITHOUT OPERATION'],
  ['F2', 'VISION EXECUTION GAP'],
  ['F3', 'EQUITY COMFORT'],
  ['F4', 'RELATIONSHIP WITHOUT LEVERAGE'],
  ['F5', 'COFOUNDER BURDEN ASYMMETRY'],
  ['K1', 'Sales Documentation Avoidance'],
  ['K1+', 'Customer Conversation Evidence'],
  ['K2', 'Passive Finance Leadership'],
  ['K2+', 'Active Financial Intervention'],
  ['K3', 'Reporting Without Intervention'],
  ['K3+', 'Escalation to Resolution'],
  ['K4', 'Tactical Busyness'],
  ['K4+', 'Strategic Focus'],
  ['K5', 'Activity Without Outcome Logic'],
  ['K5+', 'Outcome-Linked Activity'],
  ['M1', 'Directional Executor'],
  ['M1+', 'Verified Delivery'],
  ['M2', 'Velocity Multiplier'],
  ['M2+', 'Force Multiplier'],
  ['M3', 'Catalyst'],
  ['M3+', 'High Leverage Catalyst'],
  ['M4', 'Invisible Backbone'],
  ['M4+', 'Invisible Backbone Surfaced'],
  ['N1', 'Strategic Narrator'],
  ['N2', 'Process Generator'],
  ['N3', 'Visibility Optimiser'],
  ['R1', 'Dependency Bottleneck'],
  ['R2', 'Ambiguity Generator'],
  ['R3', 'Trust Anchor'],
  ['R3+', 'Trust Anchor'],
  ['R4', 'Relationship Drift'],
];

function theNamedPatterns(): { code: string; label: string; words: string[] }[] {
  return THE_NAMED_PATTERNS.map(([code, label]) => ({
    code,
    label,
    /* The words that make the label distinctive. Short ones carry no signal and match everything. */
    words: label.toLowerCase().split(/[\s/-]+/).filter((w) => w.length >= 5),
  }));
}

const THE_PATTERNS = theNamedPatterns();

/** How many of a label's distinctive words must appear before it counts as reaching for that pattern. */
const ENOUGH_TO_BE_THAT_PATTERN = 2;

/**
 * Which patterns, if any, this reply reached for. Conservative on purpose: a single shared word is
 * a coincidence, so a one-word label can never match and a two-word label needs both.
 */
export function thePatternsThisReplyReachedFor(reply: string): { code: string; label: string }[] {
  const text = ` ${(reply ?? '').toLowerCase()} `;
  if (!text.trim()) return [];
  const found: { code: string; label: string }[] = [];
  for (const p of THE_PATTERNS) {
    if (p.words.length < ENOUGH_TO_BE_THAT_PATTERN) continue;
    const hits = p.words.filter((w) => text.includes(w)).length;
    if (hits >= Math.min(ENOUGH_TO_BE_THAT_PATTERN, p.words.length) && hits === p.words.length) {
      found.push({ code: p.code, label: p.label });
    }
  }
  return found;
}

/** One greppable line, or nothing at all when a reply reached for none of them - which is the usual case. */
export function thePatternLine(checkInId: string, reply: string): string | null {
  const found = thePatternsThisReplyReachedFor(reply);
  if (!found.length) return null;
  return `pattern-library check-in=${checkInId} reached=${found.map((f) => `${f.code}:${f.label}`).join(', ')}`;
}

/** So a week of logs can be read against a denominator rather than as a bare count. */
export const HOW_MANY_PATTERNS_ARE_IN_THE_PROMPT = THE_PATTERNS.length;
