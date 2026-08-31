/**
 * THE INTEGRATION API IS A PAID FEATURE.
 *
 * Hafsah's call, and it settles a question that would otherwise have bitten on the first integration
 * test a customer ran: a ground created through the API runs the same billing gate as one created in
 * the product, so an organisation on the free tier would have hit the free-ground limit partway
 * through connecting - failing on a paywall rather than on anything about their integration.
 *
 * Gating the API itself resolves both ends at once. Only a paying organisation can hold a working
 * machine token, and a paying organisation already has unlimited grounds - `canCreateGround` returns
 * allowed immediately for a live subscription - so nothing downstream needs a special case.
 *
 * PAYING IS DEFINED IN ONE PLACE AND IT IS NOT THIS ONE. `common/subscription.ts` exists because six
 * comparisons against a bare string had drifted, and writing 'ACTIVE' instead of 'active' silently
 * downgraded a paying customer to the free tier with nothing thrown and no test failing. My first
 * draft of this file defined its own set of live statuses in upper case - which is that exact bug,
 * reintroduced, three months after somebody wrote a page of prose about it. So this delegates.
 *
 * CHECKED AT THE TOKEN EXCHANGE, not at credential issue. A subscription that lapses after a
 * credential was issued has to stop working, and tokens are short-lived - so a lapse takes effect
 * within one token lifetime rather than waiting for somebody to remember to revoke.
 */
import { isSubscribed } from '../../common/subscription';

export type BillingFacts = { subscriptionPlan: unknown; subscriptionStatus: string | null };

export function mayUseTheApi(org: BillingFacts | null | undefined): boolean {
  if (!org) return false;
  return isSubscribed(org);
}

export const NOT_PAID =
  'The integration API is part of a paid plan, and this organisation does not have an active '
  + 'subscription. Nothing else about the credential is wrong.';
