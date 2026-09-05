import { OpsFunctionalRole } from '@prisma/client';

/**
 * Every capability the ops system knows about.
 *
 * A route asks for one of these by name. No route asks what somebody's role is,
 * because a role is a hiring decision and a capability is a permission, and the
 * two stop agreeing the first time one person covers for another.
 */
export const OPS_CAPABILITIES = [
  // Running the company
  'ceo:board',
  /**
   * The sprint board. Held by everybody, including contributors — the point of
   * a sprint is that the whole team is looking at the same companies, and a
   * board half the team cannot open is a status report.
   */
  'sprint:read',
  'periods:write',
  /**
   * Who is on a sprint.
   *
   * Its own grant, not `sales:write`. Deciding which companies get attention
   * between two dates is a different act from editing the pipeline, and the CEO
   * holds the first and has deliberately given away the second — so routing the
   * sprint list through sales:write meant the person who sets the sprint could
   * not say who it was about. Found by clicking it.
   */
  'sprint:curate',
  'people:admin',
  'todos:assign',

  // Commercial
  'sales:read',
  'sales:write',
  'marketing:read',
  'marketing:write',
  'deployment:read',
  'deployment:write',

  // What we build
  'product:read',
  'product:write',
  'tech:read',
  'tech:write',
  'ux:read',
  'ux:write',
  'roadmap:propose',
  'roadmap:approve',

  // Targets and intent
  'objectives:write',
  'commitments:read-all',

  // Contributors
  'contributor:self',
  'contributor:read-all',

  // The CEO's own functions
  'fundraise:read',
  'fundraise:write',
  'strategy:read',
  'strategy:write',

  // Decisions
  /**
   * Somebody's own contribution ledger is theirs; everybody's is a management
   * view. Split for the same reason spend is: a person seeing their own record
   * is normal, and seeing everybody's is an act of management.
   */
  'commercial:read-all',
  'commercial:approve',
  'spend:submit',
  /**
   * Seeing what the company spent, including what the CEO spent.
   *
   * Deliberately NOT the same capability as approving it. Reading and deciding
   * were one grant, which meant the only way to see the CEO's own spend was to
   * hold the power to approve spend — so nobody could, and the person with the
   * most discretion was the one person nobody was watching. Decided 2026-09-05:
   * her spend is visible to the team. Approval stays where it was.
   */
  'spend:read-all',
  'spend:approve',
  'resourcing:approve',

  // The seam out to Groundwork
  /**
   * Split from manage for the same reason every other domain here is split:
   * she holds the read and delegates the write. Without it the CEO could not
   * see whether the connection to Groundwork was even up, which she noticed
   * the first time she tried.
   */
  'integration:read',
  'integration:manage',
] as const;

export type OpsCapability = (typeof OPS_CAPABILITIES)[number];

/**
 * What each role gets on the day somebody joins.
 *
 * These are DEFAULTS, written into `ops_grants` by the seed. They are not
 * consulted at request time: once a person exists, their grants are the whole
 * answer, so revoking one capability does not require arguing with their role.
 *
 * Two of these look generous and are not. Sales and Tech hold `product:read`
 * because whether a company is product-ready is the fact their own work depends
 * on — and neither holds `product:write`.
 */
export const DEFAULT_GRANTS: Record<OpsFunctionalRole, OpsCapability[]> = {
  // The CEO holds nearly everything, but by holding grants — not by being
  // exempt from the check. An exemption is what hides a missing capability.
  // She does not hold the write capabilities she has given away, which is the
  // point of having given them away.
  CEO: [
    'ceo:board',
    'sprint:read',
    'periods:write',
  /**
   * Who is on a sprint.
   *
   * Its own grant, not `sales:write`. Deciding which companies get attention
   * between two dates is a different act from editing the pipeline, and the CEO
   * holds the first and has deliberately given away the second — so routing the
   * sprint list through sales:write meant the person who sets the sprint could
   * not say who it was about. Found by clicking it.
   */
  'sprint:curate',
    'people:admin',
    'todos:assign',
    'sales:read',
    'marketing:read',
    'deployment:read',
    'product:read',
    'tech:read',
    'ux:read',
    'objectives:write',
    'commitments:read-all',
    'contributor:read-all',
    'fundraise:read',
    'fundraise:write',
    'strategy:read',
    'strategy:write',
    'roadmap:approve',
    /**
   * Somebody's own contribution ledger is theirs; everybody's is a management
   * view. Split for the same reason spend is: a person seeing their own record
   * is normal, and seeing everybody's is an act of management.
   */
  'commercial:read-all',
  'commercial:approve',
    'spend:approve',
    'spend:submit',
    'spend:read-all',
    'resourcing:approve',
    'integration:read',
  ],

  SALES_MARKETING: [
    'sprint:read',
    'sprint:curate',
    'sales:read',
    'sales:write',
    'marketing:read',
    'marketing:write',
    'deployment:read',
    'deployment:write',
    'product:read',
    'contributor:self',
    'spend:submit',
    'spend:read-all',
  ],

  PRODUCT_TECH_LEAD: [
    'sprint:read',
    'product:read',
    'product:write',
    'ux:read',
    'ux:write',
    'tech:read',
    'deployment:read',
    'roadmap:propose',
    'todos:assign',
    'contributor:self',
    'spend:submit',
    'spend:read-all',
  ],

  TECH: [
    'sprint:read',
    'tech:read',
    'tech:write',
    'product:read',
    'deployment:read',
    'contributor:self',
    'spend:submit',
    'spend:read-all',
    'integration:read',
    'integration:manage',
  ],

  // A contributor brings companies in and claims their own expenses. They do
  // not see the pipeline, the fundraise, or anybody else's attributions.
  CONTRIBUTOR: ['sprint:read', 'contributor:self', 'spend:submit'],
};

/** Everything a person may do, given the grants they actually hold. */
export function can(heldCapabilities: readonly string[], wanted: OpsCapability): boolean {
  return heldCapabilities.includes(wanted);
}

/** Guards against a typo in a route decorator becoming an open door. */
export function isAKnownCapability(name: string): name is OpsCapability {
  return (OPS_CAPABILITIES as readonly string[]).includes(name);
}
