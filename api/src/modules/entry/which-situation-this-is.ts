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

/**
 * EVERY SCENARIO THE PRODUCT HAS, BY ITS OWN KEY. This list is built from the enum, so a scenario cannot exist without being
 * nameable here (the spec fails if one is missing). Before, it named sixteen of the twenty-six, so eight situations could not be
 * reached by typing at all and were read as the nearest other one, always with "high" confidence (board assessment, 15 November).
 * COLLECTIONS is named too: whether it is offered at all is the organisation's Release 2 switch, which is not the classifier's business.
 */
export const THE_SCENARIOS_IN_WORDS: Record<GroundScenario, string> = {
  NEW_HIRE: 'onboarding a new hire or someone joining a team',
  NEW_PROJECT: 'starting a new project, workstream, or initiative',
  PULSE_CHECK: 'a regular read on live work, week after week, against what each person owns',
  DRIFT: 'a project, plan, or initiative has gone off track or diverged from what was agreed',
  REALIGN_TEAM: 'two specific people (or a small team) see the current situation differently and need to close an interpersonal gap, after conflict, change, or confusion',
  NEW_COFOUNDER: 'new co-founder, co-lead, or equal partner relationship',
  NEW_ADVISOR: 'new board member, advisor, investor, or mentor relationship',
  NEW_MANAGER: 'a new manager coming into an existing team',
  ROLE_HANDOVER: 'a role changing hands: the person leaving writes down what is in their head and the person taking over says what they think they are inheriting',
  CONTRACT_RENEWAL: 'renewing, renegotiating, or extending a contract or agreement',
  CONTRACT_REVIEW: 'before signing an agreement: each side says independently what it thinks the agreement means, or what we are entitled to under it',
  IMPLEMENTATION_TRACKING: 'after signing or after a rollout: quiet, recurring checks that what was agreed or installed is actually live and in use',
  OKR_ALIGNMENT: 'aligning on objectives, goals, or key results across parties, or keeping a team of any kind (selling, supporting customers, building software, running operations or deliveries) on its targets and on the work it has in progress',
  WORKPLAN_BUDGET: 'aligning on workplan, resourcing, or budget',
  PIP: 'performance improvement, formal feedback, or capability concern, for somebody established in their role',
  BOARD_STRATEGY: 'board or leadership team aligning on strategy, priorities, or big bets',
  COHORT_CHECK: 'many people in the same role or programme checking in against a shared question (e.g. field officers, franchisees, a training cohort)',
  ACUTE_SHOCK: 'a sudden jarring event just happened (an incident, a blow-up, sudden bad news) and everyone needs a shared honest picture of what actually happened before any decision',
  CRISIS_ALIGNMENT: 'a crisis or outage is over or ongoing and each person gives their own separate account of what they knew and when, before a post-mortem or a decision',
  RECOGNITION: 'someone wants a raise, promotion, equity, or recognition, and the evidence behind the ask needs to be on record before the conversation',
  OPEN_READ: 'no agenda: how people feel it actually is at the moment, in their own words, with nothing framed in advance',
  SNAPSHOT: 'one honest picture of where everything stands as of today, taken once, not a recurring check',
  TEAM_UPDATES: 'the normal weekly or daily update round: what you did, what is next, what is in your way',
  DISCOVERY: 'finding out what a group or our own side knows before choosing a direction or building a proposal: what people are trying to do, what stops them, where to focus',
  HELP_TEAM_UNDERSTAND: 'a lead brings a team of up to twenty to say, each on their own, what they understand of a plan or change, so the lead can see where understanding differs',
  COLLECTIONS: 'following up what people owe the organisation: invoices or fee notes staff chase, or loan repayments',
};

export const SCENARIO_KEYS = (Object.keys(THE_SCENARIOS_IN_WORDS) as GroundScenario[]).map((k) => `${k} - ${THE_SCENARIOS_IN_WORDS[k]}`).join('\n');

export function theClassifierPrompt(description: string, mode?: string): string {
  const modeHint = mode ? `\nBroad category selected by the user: "${mode}"` : '';
  return `You are a classifier. Given a brief description of a workplace situation and optionally a broad category, return the single best matching scenario key and how sure you are.

Available scenarios:
${SCENARIO_KEYS}

${PRECEDENCE_RULE}
${modeHint}

Description: "${description.slice(0, 400)}"

Confidence is "high" only when one key clearly fits and the others clearly do not. Say "low" when two or more keys fit about equally, when the description is too thin to tell (a feeling, a worry, or a team problem with no sign of what the person wants to do about it), or when what the person describes is not any of these. A wrong answer given as "high" is worse than "low", because with "low" the conversation asks the person instead of guessing.

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
