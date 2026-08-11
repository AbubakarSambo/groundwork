/**
 * Agent 1 - Intake classification (rule-based, no API call). Ported from the
 * MVP edge-function pipeline (08_final_mvp_gw_chat.html).
 *
 * Runs on every inbound message before context is built. Classifies the
 * contribution type, scores specificity, and distinguishes advisory/thinking
 * language from independent output - so the engine can push for evidence
 * (the independence test) rather than accept managed narrative.
 */

const MOVEMENT_WORDS = ['delivered', 'shipped', 'completed', 'launched', 'built', 'reduced', 'increased', 'closed', 'signed'];
const COORDINATION_WORDS = ['unblocked', 'resolved blocker', 'enabled', 'clarified', 'brought together'];
const ABSORPTION_WORDS = ['covered for', 'picked up', 'had to step in', 'ended up doing', 'took over'];
// #110 - expanded RESCUE detection: original patterns + invisible load + operational-absorption + late-notice
const RESCUE_WORDS = [
  'averted', 'prevented', 'fixed before', 'saved', 'caught', 'intervened',
  // invisible load language
  'nobody noticed', 'quietly', 'without being asked', 'while also', 'on top of', 'in addition to',
  // operational-absorption language
  'kept things running', 'held it together', 'covered for', 'picked up',
  // late-notice response
  'last minute', 'at short notice', 'dropped on me',
];

export const VAGUE_VERBS = [
  'facilitated', 'aligned', 'drove', 'led', 'managed', 'oversaw', 'supported', 'coordinated', 'championed',
  'worked on', 'helped with', 'involved in', 'contributed to', 'focused on', 'engaged with', 'collaborated on',
];
/**
 * "closed" and "resolved" were missing, which is odd company for "shipped" and
 * "delivered" - closing a ticket, a deal or an issue is how a great deal of work
 * is actually reported. Both already count as OUTPUT_VERBS below; leaving them
 * out here meant a sentence like "I closed 22 tickets" produced no factual claim
 * at all.
 */
export const COMPLETION_WORDS = ['complete', 'delivered', 'done', 'shipped', 'finished', 'live', 'launched', 'closed', 'resolved'];
export const PROBLEM_WORDS = ['blocked', 'workaround', 'not working', 'failing', 'not usable', 'broken'];
const STRATEGIC_NOISE = ['strategic', 'synergy', 'momentum', 'ecosystem', 'leverage', 'stakeholder', 'bandwidth', 'circle back', 'touch base', 'low-hanging'];
const THINKING_VERBS = [
  'helped think', 'shared a framework', 'reframed', 'gave perspective', 'walked through', 'challenged assumption',
  'brought clarity', 'explored option', 'advised', 'shaped thinking', 'influenced direction', 'added insight',
  'facilitated', 'synthesised', 'mentored', 'coached', 'guided', 'suggested', 'recommended', 'proposed',
];
const MEETING_VERBS = ['ran a session', 'facilitated a workshop', 'presented to', 'walked the team through', 'reviewed with', 'had a discussion', 'met with', 'had a call', 'checked in with', 'followed up with', 'introduced to'];
const OUTPUT_VERBS = ['built', 'wrote', 'shipped', 'deployed', 'signed', 'closed', 'hired', 'trained', 'documented', 'implemented', 'created', 'established a process', 'produced a document', 'completed'];

export interface IntakeResult {
  types: string[]; // movement | coordination | absorption | rescue | noise
  factualClaims: { claim: string; verifiable: boolean }[];
  specificity: number; // 0..1
  vagueLanguage: string[];
  thinkingScore: number;
  outputScore: number;
  meetingScore: number;
  isAdvisoryOnly: boolean;
  hasIndependentOutput: boolean;
  positiveSignal?: string;
}

/**
 * Number words, so a person who writes "three weeks" is not treated as having
 * given no number. Bounded to whole words: "one" must not fire on "money",
 * "ten" must not fire on "often".
 */
const NUMBER_WORDS =
  /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|hundred|dozen|half|twice|first|second|third)\b/i;

export function runIntake(text: string): IntakeResult {
  if (!text) return { types: ['noise'], factualClaims: [], specificity: 0, vagueLanguage: [], thinkingScore: 0, outputScore: 0, meetingScore: 0, isAdvisoryOnly: false, hasIndependentOutput: false };
  const lower = text.toLowerCase();

  const types: string[] = [];
  if (MOVEMENT_WORDS.some((w) => lower.includes(w))) types.push('movement');
  if (COORDINATION_WORDS.some((w) => lower.includes(w))) types.push('coordination');
  if (ABSORPTION_WORDS.some((w) => lower.includes(w))) types.push('absorption');
  if (RESCUE_WORDS.some((w) => lower.includes(w))) types.push('rescue');
  if (!types.length) types.push('noise');

  /**
   * NUMBERS PEOPLE WRITE AS WORDS ARE STILL NUMBERS.
   *
   * This was /\d/, so "three weeks", "by month three" and "at least one client
   * relationship" all counted as no number at all. Measured on a real
   * twelve-session ground, four of six substantive answers scored 0.00 for this
   * reason alone and the whole record came out "low specificity" - on a record
   * containing 22 tickets closed, two client accounts run end to end, and a
   * count that dropped to 18 and then 15.
   *
   * That label sits on a performance conversation. Getting it backwards on
   * somebody's account of their own work is worse than not showing it.
   */
  const hasNumbers = /\d/.test(text) || NUMBER_WORDS.test(text);

  /**
   * Anchored to word boundaries, because the month list matched inside ordinary
   * words: "may" fired on "maybe" and "dismay", "mar" on "market" and "margin",
   * "sep" on "separate". A record about a marketing plan scored as if it were
   * full of dates.
   *
   * Also counts the time references people actually use for work - "each week",
   * "by month three", "last quarter" - which carry as much checkable timing as
   * a calendar date does.
   */
  const hasDate =
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(text) ||
    /\d{1,2}\/\d{1,2}/.test(text) ||
    /\b(?:every|each|per|by|within|since|last|next|this)\s+(?:day|week|fortnight|month|quarter|year)\b/i.test(text) ||
    /\b(?:day|week|fortnight|month|quarter|year)s?\s+(?:one|two|three|four|five|six|seven|eight|nine|ten|\d+)\b/i.test(text) ||
    /\b(?:month|week|quarter|day)\s+(?:one|two|three|four|five|six|seven|eight|nine|ten|\d+)\b/i.test(text) ||
    // The commonest form by far, and the one that was missing: "three weeks",
    // "90 days", "two quarters". Measured on a real record, this alone was the
    // difference between "I closed 22 tickets in my first three weeks" reading
    // as timed and reading as undated.
    /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d+)\s+(?:day|week|fortnight|month|quarter|year)s?\b/i.test(text);
  const vagueCount = VAGUE_VERBS.filter((v) => lower.includes(v)).length;
  const noiseCount = STRATEGIC_NOISE.filter((v) => lower.includes(v)).length;
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 10);
  const verifiableMarkers = [/\d+%/, /\d+ (days|hours|users|contracts)/, /confirmed by/, /measured in/, /signed/i];
  const factualClaims = sentences
    .filter((s) => COMPLETION_WORDS.some((w) => s.toLowerCase().includes(w)) || verifiableMarkers.some((r) => r.test(s)))
    .map((s) => ({ claim: s.trim(), verifiable: verifiableMarkers.some((r) => r.test(s)) }));

  const specificity = Math.max(0, Math.min(1,
    (hasNumbers ? 0.25 : 0) + (hasDate ? 0.15 : 0) + factualClaims.length * 0.1 - vagueCount * 0.1 - noiseCount * 0.08,
  ));
  const vagueLanguage = VAGUE_VERBS.filter((v) => lower.includes(v));
  const thinkingScore = Math.min(1, THINKING_VERBS.filter((v) => lower.includes(v)).length * 0.25);
  const meetingScore = Math.min(1, MEETING_VERBS.filter((v) => lower.includes(v)).length * 0.3);
  const outputScore = Math.min(1, OUTPUT_VERBS.filter((v) => lower.includes(v)).length * 0.2 + factualClaims.filter((c) => c.verifiable).length * 0.15);

  let positiveSignal: string | undefined;
  if (/(completed|shipped|delivered|finished|launched)/.test(lower) && /(i |we )/.test(lower)) positiveSignal = 'M1_PLUS';
  else if (/(ahead of|early|beat the|exceeded)/.test(lower)) positiveSignal = 'M2_PLUS';
  else if (/(enabled .+ and |unblocked both|both teams can now)/.test(lower)) positiveSignal = 'M3_PLUS';
  else if (/(decided|made the call|chose to|committed to)/.test(lower) && /(because|reasoning|given that)/.test(lower)) positiveSignal = 'D1_PLUS';
  else if (/(flagged this before|raised this early|noticed this might)/.test(lower)) positiveSignal = 'D3_PLUS';
  else if (/(told the founder|flagged to leadership|raised this with)/.test(lower)) positiveSignal = 'B1_PLUS';
  else if (/(my part in this|i contributed to this|i should have)/.test(lower)) positiveSignal = 'B8_PLUS';
  else if (/(this is on me|i own this|i will fix this)/.test(lower)) positiveSignal = 'B11_PLUS';

  return {
    types,
    factualClaims,
    specificity,
    vagueLanguage,
    thinkingScore,
    outputScore,
    meetingScore,
    isAdvisoryOnly: thinkingScore > 0.3 && outputScore < 0.2,
    hasIndependentOutput: outputScore > 0.3 && factualClaims.some((c) => c.verifiable),
    positiveSignal,
  };
}

// #11 - Added DECLINING_ENGAGEMENT as a 5th trust state.
// Triggered when check-in attendance rate (completed / invited) drops below 0.5
// across the last 3 periods, regardless of specificity score.
export type TrustLevel = 'high' | 'declining' | 'low' | 'building' | 'declining_engagement';
export interface TrustState { level: TrustLevel; tone: string }

/**
 * Trust calibration from the rolling specificity history (ported from the MVP).
 *
 * #11 - attendanceRateHistory: optional array of (completed/invited) ratios for the
 * last N periods. When the last 3 values are all below 0.5 the trust state becomes
 * DECLINING_ENGAGEMENT regardless of specificity.
 */
export function trustFrom(
  specificityHistory: number[],
  checkInNum: number,
  attendanceRateHistory?: number[],
): TrustState {
  // #11 - DECLINING_ENGAGEMENT check: last 3 attendance rates all below 0.5
  if (attendanceRateHistory && attendanceRateHistory.length >= 3) {
    const last3 = attendanceRateHistory.slice(-3);
    if (last3.every((r) => r < 0.5)) {
      return { level: 'declining_engagement', tone: 'warm_concerned' };
    }
  }

  const h = specificityHistory.slice(-5);
  const latest = h[h.length - 1] ?? 0;
  const trend = h.length > 2 ? (h.slice(-2).reduce((a, b) => a + b, 0) / 2) - (h.slice(0, 2).reduce((a, b) => a + b, 0) / 2) : 0;

  const level: TrustLevel =
    checkInNum >= 3 && h.length >= 3 && h.every((s) => s > 0.5) ? 'high'
    : trend < -0.15 ? 'declining'
    : latest < 0.2 && checkInNum > 2 ? 'low'
    : 'building';

  const tone =
    level === 'high' ? 'direct'
    : level === 'declining' ? 'warm_concerned'
    : level === 'low' ? 'warm_open'
    : 'affirming';

  return { level, tone };
}
