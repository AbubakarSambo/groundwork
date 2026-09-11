import { GroundScenario } from '@prisma/client';

/**
 * WHICH SITUATION THIS IS, WITH A RULE FOR THE OVERLAP AND A WAY TO SAY "NOT SURE".
 *
 * The classifier was a single prompt listing sixteen scenario keys one line each, with no tie-break
 * and no confidence. "PIP - performance improvement, formal feedback, or capability concern" and
 * "NEW_HIRE - onboarding a new hire or someone joining a team" both match "a new hire six weeks in
 * who is not settling, inside a six-month probation", and the browser pass got PIP. The scenario key
 * reaches the copy and the invitation, so the wrong key put the words of a performance process
 * around somebody's onboarding (BR-001). It also sent the homepage's own probation example to the
 * one board family that deliberately has no at-a-glance strip - board-families.ts records why
 * EVALUATION does not get one, and that decision stands; classified correctly the example is
 * NEW_HIRE -> ONBOARDING, which renders it. Fix the classifier and nothing else moves.
 *
 * Two things, stated as rules and not hints: a precedence rule for the overlap, and a confidence
 * field. Below the bar the answer is null and the flow keeps what the person chose from the
 * catalogue rather than overriding it with a guess.
 */

export const PRECEDENCE_RULE =
  'RULE, not a hint: a situation that names a new hire, a joiner, onboarding, a first ninety days or a probation is NEW_HIRE, even when it also describes a performance concern. PIP is for somebody established in the role.';

export const SCENARIO_KEYS = `NEW_HIRE - onboarding a new hire or someone joining a team
NEW_PROJECT - starting a new project, workstream, or initiative
PULSE_CHECK - checking in on how something is going mid-flight
DRIFT - a project, plan, or initiative has gone off track or diverged from what was agreed
REALIGN_TEAM - two specific people (or a small team) see the current situation differently and need to close an interpersonal gap, after conflict, change, or confusion
NEW_COFOUNDER - new co-founder, co-lead, or equal partner relationship
NEW_ADVISOR - new board member, advisor, investor, or mentor relationship
NEW_MANAGER - new manager coming into an existing team or role handover
CONTRACT_RENEWAL - renewing, renegotiating, or extending a contract or agreement
OKR_ALIGNMENT - aligning on objectives, goals, or key results across parties
WORKPLAN_BUDGET - aligning on workplan, resourcing, or budget
PIP - performance improvement, formal feedback, or capability concern, for somebody established in their role
BOARD_STRATEGY - board or leadership team aligning on strategy, priorities, or big bets
COHORT_CHECK - many people in the same role or programme checking in against a shared question (e.g. field officers, franchisees, a training cohort)
ACUTE_SHOCK - a sudden jarring event just happened (an incident, a blow-up, sudden bad news) and everyone needs a shared honest picture of what actually happened before any decision
RECOGNITION - someone wants a raise, promotion, equity, or recognition, and the evidence behind the ask needs to be on record before the conversation`;

export function theClassifierPrompt(description: string, mode?: string): string {
  const modeHint = mode ? `\nBroad category selected by the user: "${mode}"` : '';
  return `You are a classifier. Given a brief description of a workplace situation and optionally a broad category, return the single best matching scenario key and how sure you are.

Available scenarios:
${SCENARIO_KEYS}

${PRECEDENCE_RULE}
${modeHint}

Description: "${description.slice(0, 400)}"

Confidence is "high" when one key clearly fits and the others clearly do not; "low" when two or more keys fit about equally, or the description is too thin to tell. Do not guess with "high".

Respond with exactly one JSON object: {"scenario": "<SCENARIO_KEY>", "confidence": "high" | "low"}`;
}

export type Classification = { scenario: GroundScenario | null; confidence: 'high' | 'low' };

/** Reads the model's answer. A key that is not a scenario is no answer; low confidence is no scenario. */
export function readTheClassification(raw: string): Classification | null {
  const key = raw.match(/"scenario"\s*:\s*"([A-Z_]+)"/)?.[1];
  if (!key || !Object.values(GroundScenario).includes(key as GroundScenario)) return null;
  const confidence: 'high' | 'low' = /"confidence"\s*:\s*"low"/.test(raw) ? 'low' : 'high';
  return { scenario: confidence === 'high' ? (key as GroundScenario) : null, confidence };
}
