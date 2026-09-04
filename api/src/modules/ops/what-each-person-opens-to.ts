import { OpsCapability } from './what-somebody-may-do';

/**
 * The board each person lands on, described as a list of metric keys.
 *
 * A board is a SELECTION, not a computation. Every number on it comes from the
 * registry, so there is no path by which a board displays a figure that cannot
 * be opened onto its rows — and adding a number to somebody's board is a
 * one-line change here rather than a new query written next to a template.
 *
 * Metrics the caller cannot hold are dropped rather than shown empty or shown
 * as an error. A board that says "you cannot see this" in six places is not a
 * board, it is a reminder of what you are not.
 */

export interface BoardDefinition {
  key: string;
  name: string;
  /** Who it is for, in a sentence, so a board can say what it is. */
  answers: string;
  metrics: string[];
  /**
   * Panels that are about the person looking, rather than about the company.
   *
   * A contributor's real number is "where am I against my six", and that is not
   * a metric: a metric is one figure for the whole company, and this one has a
   * different answer for every person. Rather than bending the registry into
   * something per-person, the board names the route that answers it — so the
   * rule that every METRIC opens onto its rows stays exactly as strict, and a
   * board is still just a list of names.
   */
  personalPanels: string[];
  /** Held by anybody who should land here by default. */
  landsFor: OpsCapability[];
}

export const BOARDS: BoardDefinition[] = [
  {
    key: 'ceo',
    name: 'Running the company',
    answers: 'Where is the sprint, what is waiting on me, and what is the money doing?',
    metrics: [
      'sprint.companies_lined_up',
      'sprint.companies_onboarded',
      'product.use_cases_supported',
      'approvals.pending',
      'commitments.blocked',
      'commitments.missed_last_cycle',
      'fundraise.pipeline',
      'fundraise.closed',
      'fundraise.overdue',
      'strategy.opportunities_created',
      'spend.awaiting_decision',
    ],
    personalPanels: ['approvals-waiting-on-you'],
    landsFor: ['ceo:board'],
  },
  {
    key: 'sales',
    name: 'Selling and onboarding',
    answers: 'Who am I talking to, what have I not followed up, and who is stuck getting live?',
    metrics: [
      'sales.new_leads_contacted',
      'sales.meetings_held',
      'sales.conversions',
      'sales.conversion_rate',
      'sales.overdue_follow_ups',
      'sales.no_next_action',
      'marketing.leads_generated',
      'deployment.in_onboarding',
      'deployment.blocked',
      'deployment.days_to_onboard',
    ],
    personalPanels: ['your-commitments'],
    landsFor: ['sales:write'],
  },
  {
    key: 'product',
    name: 'What we build',
    answers: 'What have we shipped, whose use case are we not supporting, and what is blocked?',
    metrics: [
      'product.use_cases_supported',
      'product.roadmap_completed',
      'tech.open_client_blockers',
      'deployment.blocked',
      'sprint.companies_lined_up',
    ],
    personalPanels: ['your-commitments'],
    landsFor: ['product:write'],
  },
  {
    key: 'tech',
    name: 'Technical work',
    answers: 'What is in my way, what have I cleared, and what is holding a client up?',
    metrics: ['tech.open_client_blockers', 'tech.resolved_this_window', 'deployment.blocked'],
    personalPanels: ['your-commitments'],
    landsFor: ['tech:write'],
  },
  {
    key: 'contributor',
    name: 'What I brought',
    answers: 'Where am I against my six, and what is happening to the companies I introduced?',
    metrics: ['sprint.companies_lined_up'],
    /**
     * Nearly all of what a contributor comes here for. Their board carries one
     * company-wide number and their own standing, which is the honest shape:
     * they are not running the company, they are bringing people to it.
     */
    personalPanels: ['your-standing', 'your-todos'],
    landsFor: ['contributor:self'],
  },
];

export const BOARDS_BY_KEY = new Map(BOARDS.map((b) => [b.key, b]));
