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

  { path: '/ops/sales', name: 'Pipeline', capability: 'sales:read', group: 'Selling' },
  { path: '/ops/marketing', name: 'Marketing', capability: 'marketing:read', group: 'Selling' },
  { path: '/ops/deployment', name: 'Deployment', capability: 'deployment:read', group: 'Selling' },

  { path: '/ops/roadmap', name: 'Roadmap', capability: 'product:read', group: 'Building' },
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
  { path: '/ops/integration', name: 'Groundwork', capability: 'integration:read', group: 'Company' },
]

export const GROUPS: OpsPage['group'][] = ['Work', 'Selling', 'Building', 'Company']

export function pagesFor(capabilities: readonly string[]): OpsPage[] {
  return OPS_PAGES.filter((p) => p.capability === null || capabilities.includes(p.capability))
}
