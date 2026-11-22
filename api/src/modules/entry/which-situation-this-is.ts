import { GroundScenario } from '@prisma/client';
import { THE_SCENARIO_TABLE } from '../conversation/the-scenario-table';
import { THE_KINDS_IN_WORDS, HOW_A_KIND_IS_CHOSEN, oneOfTheKinds, type KindOfWork } from '../board/the-kind-of-work';

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
 * EVERY SCENARIO THE PRODUCT HAS, BY ITS OWN KEY, IN THE WORDS ITS CARD SAYS (release test, 21 November 2026, bug 3). This list had its
 * own description of each situation beside the scenario table's, and the two disagreed: the table calls CRISIS_ALIGNMENT "Work through
 * a big decision", and this list called it a crisis or an outage, so "we have to pick a new supplier by end of month" could never be read
 * as the decision it is and became a new project. Each situation is now said once, by the scenario table, and read here: the name and
 * the line the person reads on its card. Built from the enum, so a scenario cannot exist without being nameable here.
 */
export const THE_SCENARIOS_IN_WORDS: Record<GroundScenario, string> = Object.fromEntries(
  (Object.values(GroundScenario) as GroundScenario[]).map((k) => [k, `${THE_SCENARIO_TABLE[k]?.name ?? k}. ${THE_SCENARIO_TABLE[k]?.description ?? ''}`.trim()]),
) as Record<GroundScenario, string>;

export const SCENARIO_KEYS = (Object.keys(THE_SCENARIOS_IN_WORDS) as GroundScenario[]).map((k) => `${k} - ${THE_SCENARIOS_IN_WORDS[k]}`).join('\n');

/**
 * ONE READING SETS THE SITUATION AND THE KIND OF WORK (release test, 21 November 2026, bugs 3 and 107 to 110). The situation and the kind
 * were two model calls on the same words, each with its own lists, and the kind overrode the situation: "choosing between 3 packaging
 * vendors" was read as a where-next workshop and became "Work out where to focus". One call now reads both from the same words, with the
 * situations as their cards say them and the kinds as the kind's own read says them (board/the-kind-of-work.ts), so the two come from one
 * understanding. The kind's situation is still the switchboard's (entry.service classifyIntent).
 */
export function theClassifierPrompt(description: string, mode?: string): string {
  const modeHint = mode ? `\nBroad category selected by the user: "${mode}"` : '';
  return `You are reading how somebody described a workplace situation they want a check-in for. From the same words, say which situation it is, how sure you are, and what kind of work it is about.

The situations:
${SCENARIO_KEYS}

${PRECEDENCE_RULE}

The kinds of work, one of these fifteen or none:
${THE_KINDS_IN_WORDS}

The situation is why the check-in is set up; the kind is what the work itself is. ${HOW_A_KIND_IS_CHOSEN}
${modeHint}

Description: "${description.slice(0, 400)}"

Confidence is "high" only when one situation clearly fits and the others clearly do not. Say "low" when two or more fit about equally, when the description is too thin to tell (a feeling, a worry, or a team problem with no sign of what the person wants to do about it), or when what the person describes is not any of these. A wrong answer given as "high" is worse than "low", because with "low" the conversation asks the person instead of guessing.

Respond with exactly one JSON object: {"scenario": "<SCENARIO_KEY>", "confidence": "high" | "low", "kind": "<the kind's name exactly as written above, or none>"}`;
}

/** The kind is there only when the reading named one of the fifteen. */
export type Classification = { scenario: GroundScenario | null; confidence: 'high' | 'low'; kind?: KindOfWork };

/** Reads the model's answer. A key that is not a scenario is no answer; low confidence is no scenario. */
export function readTheClassification(raw: string): Classification | null {
  const key = raw.match(/"scenario"\s*:\s*"([A-Z_]+)"/)?.[1];
  if (!key || !Object.values(GroundScenario).includes(key as GroundScenario)) return null;
  const confidence: 'high' | 'low' = /"confidence"\s*:\s*"low"/.test(raw) ? 'low' : 'high';
  const kind = oneOfTheKinds(raw.match(/"kind"\s*:\s*"([^"]*)"/)?.[1]);
  return { scenario: confidence === 'high' ? (key as GroundScenario) : null, confidence, ...(kind ? { kind } : {}) };
}
