import { THE_FIRST_QUESTION } from './the-first-question-for-this-situation';
import { theAnchorInvitation } from './the-anchor-people-step';

/**
 * THE ANCHOR'S CONTENT, LIKE ANY SCENARIO'S (decision 114, 8 October).
 *
 * The anchor is a scenario like the others, and only its content differs: the entry chat's opening text and first question, the
 * invitation's words, and what Groundwork asks. This is the first two and the third's door, in one place, so that the ordinary routes
 * (`POST /entry/opener`, the invitation read) serve them the way they serve any scenario's, and nothing needs an anchor-only screen.
 * The words are Hafsah's, from docs/anchor-scenario.md: the front-door lines (section 5) with "one to one" where the section says
 * "privately" (decision 96, item 1), and the first question (section 6).
 */
export const THE_ANCHOR_SCENARIO_KEY = 'HELP_TEAM_UNDERSTAND';
export const THE_ANCHOR_SCENARIO_LABEL = 'Help my team understand';

export const THE_ANCHOR_OPENING_TEXT = [
  'You know what it takes to keep the work, customers and company moving. Does your team?',
  'For one month, Groundwork will check in with each person one to one, to help everyone understand how their work connects, contribute more, and move in the same direction. You can add up to 20 people besides yourself.',
  `Tell me what you are trying to get across. ${THE_FIRST_QUESTION.HELP_TEAM_UNDERSTAND.ask}`,
].join('\n\n');

/** Whether a scenario name the screen sent, the key or the label, is the anchor's. */
export const isTheAnchorScenario = (name: unknown): boolean => typeof name === 'string' && [THE_ANCHOR_SCENARIO_KEY, THE_ANCHOR_SCENARIO_LABEL].includes(name.trim());

/** The words a person is invited in, for any scenario that has its own. Null for the rest, which use the ordinary invitation. */
export function theInvitationWordsFor(scenario: string | null | undefined, leadFirstName: string | null) {
  return scenario === THE_ANCHOR_SCENARIO_KEY ? theAnchorInvitation(leadFirstName) : null;
}
