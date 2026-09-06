import { OpsCompanyStage, OpsCommercialStage, OpsDeploymentStage } from '@prisma/client';

/**
 * How far a company has actually got, from the things that actually happened.
 *
 * A company had its own stage, set by hand, alongside a deal stage and a
 * deployment stage — three fields describing one journey, kept in step by
 * whoever remembered. Meridian Care sat at LINED_UP while its deployment was in
 * ONBOARDING and its deal was at MEETING, and the target list board, which counts by
 * the company field, reported that nothing had moved.
 *
 * Nobody had done anything wrong. Sahar advanced the deployment, which is the
 * record that describes the work, and nothing asked her to also update a
 * summary of it.
 *
 * So the summary is derived. The stage stays a stored field, because a company
 * can legitimately be moved ahead by hand before any deal or deployment exists,
 * and it never goes BACKWARDS: a stage reached is a fact, and losing it because
 * a deployment record was deleted would be worse than any staleness.
 */

const ORDER: OpsCompanyStage[] = [
  'LINED_UP',
  'USE_CASE_CONFIRMED',
  'PRODUCT_READY',
  'ONBOARDED',
  'LIVE',
];

/** What a deal at this stage proves about the company. */
const FROM_SALES: Partial<Record<OpsCommercialStage, OpsCompanyStage>> = {
  QUALIFIED: 'USE_CASE_CONFIRMED',
  DEMO_DISCOVERY: 'USE_CASE_CONFIRMED',
  PROPOSAL: 'USE_CASE_CONFIRMED',
  VERBAL_YES: 'PRODUCT_READY',
  PAYING: 'ONBOARDED',
  RETAINED_3_MONTH: 'LIVE',
  RETAINED_6_MONTH: 'LIVE',
  RETAINED_12_MONTH: 'LIVE',
};

/** And what a deployment proves. These are stronger, because they are later. */
const FROM_DEPLOYMENT: Partial<Record<OpsDeploymentStage, OpsCompanyStage>> = {
  READY_SIGNED: 'PRODUCT_READY',
  SETUP: 'ONBOARDED',
  ONBOARDING: 'ONBOARDED',
  FIRST_USE: 'ONBOARDED',
  LIVE: 'LIVE',
};

export function furthestReached(input: {
  stored: OpsCompanyStage;
  salesStages: OpsCommercialStage[];
  deploymentStages: OpsDeploymentStage[];
}): OpsCompanyStage {
  const candidates: OpsCompanyStage[] = [
    input.stored,
    ...input.salesStages.map((s) => FROM_SALES[s]).filter((s): s is OpsCompanyStage => Boolean(s)),
    ...input.deploymentStages
      .map((s) => FROM_DEPLOYMENT[s])
      .filter((s): s is OpsCompanyStage => Boolean(s)),
  ];

  return candidates.reduce((furthest, next) =>
    ORDER.indexOf(next) > ORDER.indexOf(furthest) ? next : furthest,
  );
}

/**
 * Whether the stored stage is behind what has actually happened.
 *
 * Worth saying out loud on a board rather than silently correcting, so somebody
 * can see that the summary was stale rather than wondering why a number moved.
 */
export function isBehind(stored: OpsCompanyStage, derived: OpsCompanyStage): boolean {
  return ORDER.indexOf(derived) > ORDER.indexOf(stored);
}
