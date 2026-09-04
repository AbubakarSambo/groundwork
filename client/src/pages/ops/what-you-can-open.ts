/**
 * The pages of the back office, and what you must hold to see each.
 *
 * Navigation is GENERATED from this. The alternative — a fixed list of
 * seventeen items with locks on the ones you cannot use — tells a contributor
 * that the system is mostly not for him, every time he opens it. His interface
 * should feel deliberately small rather than mostly forbidden.
 *
 * One list, so the nav and the router cannot disagree about what exists.
 */

export interface OpsPage {
  path: string
  name: string
  /** Held to see it at all. Null means everybody on the team. */
  capability: string | null
  /** Grouped in the nav, in this order. */
  group: 'Work' | 'Selling' | 'Building' | 'Company'
}

export const OPS_PAGES: OpsPage[] = [
  { path: '/ops', name: 'My board', capability: null, group: 'Work' },
  { path: '/ops/sprint', name: 'The sprint', capability: 'sprint:read', group: 'Work' },
  { path: '/ops/commitments', name: 'Commitments', capability: null, group: 'Work' },
  { path: '/ops/spend', name: 'Spend', capability: 'spend:submit', group: 'Work' },

  /*
   * ONE PIPELINE. The old `/ops/sales` ran beside this one - same companies,
   * same stages, no record of who created anything - and two pipelines is how a
   * company ends up with two answers to "how much are we selling".
   */
  { path: '/ops/overview', name: 'Overview', capability: 'sales:read', group: 'Selling' },
  { path: '/ops/pipeline', name: 'Pipeline', capability: 'sales:read', group: 'Selling' },
  { path: '/ops/contribution', name: 'Contribution', capability: 'sales:read', group: 'Selling' },
  { path: '/ops/positioning', name: 'Market access', capability: 'sales:read', group: 'Selling' },
  { path: '/ops/attribution', name: 'Attribution review', capability: 'commercial:approve', group: 'Selling' },
  { path: '/ops/marketing', name: 'Marketing', capability: 'marketing:read', group: 'Selling' },
  { path: '/ops/deployment', name: 'Deployment', capability: 'deployment:read', group: 'Selling' },

  { path: '/ops/roadmap', name: 'Roadmap', capability: 'product:read', group: 'Building' },
  { path: '/ops/moat', name: 'The moat', capability: 'product:read', group: 'Building' },
  { path: '/ops/readiness', name: 'Readiness', capability: 'product:read', group: 'Building' },
  { path: '/ops/tech', name: 'Tech', capability: 'tech:read', group: 'Building' },
  { path: '/ops/ux', name: 'UX', capability: 'ux:read', group: 'Building' },

  { path: '/ops/quarter', name: 'Objectives', capability: null, group: 'Company' },
  /*
   * Gated on being able to DECIDE, not on being able to ask.
   *
   * The page shows the decisions you owe, so for a contributor it is
   * permanently empty - and a menu item that is always empty is the same
   * failure as a locked one, wearing a friendlier face. Somebody who has asked
   * for something reaches it through the record they are waiting on.
   */
  { path: '/ops/approvals', name: 'Approvals', capability: 'ceo:board', group: 'Company' },
  { path: '/ops/fundraise', name: 'Fundraise', capability: 'fundraise:read', group: 'Company' },
  { path: '/ops/strategy', name: 'Strategy', capability: 'strategy:read', group: 'Company' },
  { path: '/ops/people', name: 'The team', capability: 'people:admin', group: 'Company' },
  { path: '/ops/integration', name: 'Groundwork', capability: 'integration:read', group: 'Company' },
]

export const GROUPS: OpsPage['group'][] = ['Work', 'Selling', 'Building', 'Company']

/**
 * Routes that exist and are deliberately NOT in the menu.
 *
 * A company page is about one company, so it is reached by clicking that
 * company's name — never from a list of sixteen destinations. Declared here
 * rather than left to be caught, because "not in the menu" and "forgotten" look
 * identical from outside, and the whole point of the register is that they
 * cannot.
 */
export const REACHED_BY_CLICKING: Array<{ path: string; from: string }> = [
  { path: '/ops/companies/:key', from: 'a company name on the sprint or the pipeline' },
  /*
   * The old pipeline's address. Redirected rather than deleted: it is in
   * people's history and a silent 404 on a page somebody used daily reads as an
   * outage rather than as a move.
   */
  { path: '/ops/sales', from: 'a bookmark or an old link, and it redirects to /ops/pipeline' },
]

export function pagesFor(capabilities: readonly string[]): OpsPage[] {
  return OPS_PAGES.filter((p) => p.capability === null || capabilities.includes(p.capability))
}
