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
  'commercial:approve',
  'spend:submit',
  'spend:approve',
  'resourcing:approve',

  // The seam out to Groundwork
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
    'commercial:approve',
    'spend:approve',
    'spend:submit',
    'resourcing:approve',
  ],

  SALES_MARKETING: [
    'sprint:read',
    'sales:read',
    'sales:write',
    'marketing:read',
    'marketing:write',
    'deployment:read',
    'deployment:write',
    'product:read',
    'contributor:self',
    'spend:submit',
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
  ],

  TECH: [
    'sprint:read',
    'tech:read',
    'tech:write',
    'product:read',
    'deployment:read',
    'contributor:self',
    'spend:submit',
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
