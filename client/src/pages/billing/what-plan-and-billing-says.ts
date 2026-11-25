import { PLAN_LABELS, formatDollars, type BillingStatus, type LivePricing, type SubscriptionPlan } from '@/api/billing'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'

/**
 * WHAT PLAN AND BILLING SAYS, IN FULL SENTENCES (F2, U.19). The prototype's words, from
 * docs/prototype/screens/F2-billing/settings-billing.txt and upgrade.txt, with every number from the
 * server: the plan and its price from `pricing_plans`, the people from the seat count, the free
 * limits and the trial from the platform settings. Nothing here holds a number of its own.
 */

const PAYING = ['STARTER', 'SMALL_TEAM', 'GROWTH', 'BUSINESS', 'SCALE'] as SubscriptionPlan[]

function nameOf(plan: SubscriptionPlan | string): string {
  return PLAN_LABELS[plan as SubscriptionPlan] ?? String(plan)
}

function priceOf(pricing: LivePricing | undefined, plan: SubscriptionPlan | string): number | null {
  const row = pricing?.plans?.find((p) => p.plan === plan)
  return row?.amountCents ?? null
}

function aMonth(pricing: LivePricing | undefined, plan: SubscriptionPlan | string): string | null {
  const cents = priceOf(pricing, plan)
  return cents === null ? null : `${formatDollars(cents)} a month`
}

function people(count: number, cap: number | null | undefined, includingYou = false): string {
  if (cap == null) return count === 1 ? '1 person.' : `${count} people.`
  return `${count} of ${cap} people${includingYou ? ', including you' : ''}.`
}

export type WhatCovers = 'paid' | 'paused' | 'on the house' | 'no plan'

export function whatCoversThem(status: BillingStatus | undefined): WhatCovers {
  const sub = status?.subscription
  if (sub?.plan && sub.status === 'active') return 'paid'
  if (sub?.plan && sub.status === 'paused') return 'paused'
  if (status?.onTheHouse) return 'on the house'
  /* There is no free plan besides the free trial, which is `onTheHouse` (22 November 2026). */
  return 'no plan'
}

/** "Growth, $400 a month. 27 of 100 people." */
export function thePlanLine(status: BillingStatus | undefined, pricing: LivePricing | undefined): string {
  const count = status?.people?.count ?? 0
  const cap = status?.people?.cap
  const covers = whatCoversThem(status)
  if (covers === 'paid' || covers === 'paused') {
    const plan = status!.subscription.plan as SubscriptionPlan
    const price = aMonth(pricing, plan)
    return `${nameOf(plan)}${price ? `, ${price}` : ''}${covers === 'paused' ? ', paused' : ''}. ${people(count, cap)}`
  }
  if (covers === 'on the house') {
    const free = status!.onTheHouse!
    return `${nameOf(free.plan)}, free until ${whenItWas(free.until, 'full')}. ${people(count, cap)}`
  }
  return 'No plan yet. Choose one below to open check-ins and add people.'
}

/** "1 October, $400, by card ending 4417." Or what happens instead of a payment. */
export function theNextPaymentLine(status: BillingStatus | undefined, pricing: LivePricing | undefined): string {
  const covers = whatCoversThem(status)
  const sub = status?.subscription
  if (covers === 'paused') return 'None while it is paused. Nothing is charged until you resume.'
  if (covers === 'paid') {
    if (sub?.endsAt) return `No more payments. Your plan ends on ${whenItWas(sub.endsAt, 'full')}.`
    const cents = priceOf(pricing, sub!.plan as SubscriptionPlan)
    const on = sub?.periodEnd ? whenItWas(sub.periodEnd, 'dayAndMonthLong') : null
    const card = status?.card?.last4 ? `, by card ending ${status.card.last4}` : ''
    if (on && cents !== null) return `${on}, ${formatDollars(cents)}${card}.`
    if (on) return `${on}${card}.`
    return 'It renews on its own each month.'
  }
  return 'Nothing is charged until you choose a plan.'
}

/**
 * "Next payment 1 October, by card ending 4417." (fix list item 6, the light prototype's s73): the day and the card, the
 * amount being the month drawn above it. Null when nothing is paid for.
 */
export function theNextPaymentSentence(status: BillingStatus | undefined, pricing: LivePricing | undefined): string | null {
  const covers = whatCoversThem(status)
  const sub = status?.subscription
  if (covers === 'paid' && !sub?.endsAt && sub?.periodEnd) {
    return `Next payment ${whenItWas(sub.periodEnd, 'dayAndMonthLong')}${status?.card?.last4 ? `, by card ending ${status.card.last4}` : ''}.`
  }
  if (covers === 'paid' || covers === 'paused') return theNextPaymentLine(status, pricing)
  return null
}

/**
 * "Everyone with a Groundwork account at Baridi Appliances counts. Guests without an account do not." (F2), as
 * the server counts a seat: a guest with an account takes one (U.4 re-review, the prototype's rule).
 */
export function whoCounts(orgName: string): string {
  return `Everyone with a Groundwork account at ${orgName || 'your organisation'} counts. Guests without an account do not.`
}

/** The smallest paid plan that holds this many people, from the table. */
export function thePlanThatHolds(count: number, pricing: LivePricing | undefined): SubscriptionPlan | null {
  const rows = (pricing?.plans ?? [])
    .filter((p) => PAYING.includes(p.plan) && p.amountCents !== null && (p.memberCap === null || p.memberCap >= count))
    .sort((a, b) => (a.amountCents as number) - (b.amountCents as number))
  return rows[0]?.plan ?? null
}

export interface ATrialNotice {
  key: 'ending' | 'past the size'
  heading: string
  body: string
  choose: SubscriptionPlan | null
}

/**
 * WHEN THE FREE MONTHS END (upgrade.txt), for the admin, on Plan and billing. Only for an
 * organisation inside the free trial's months (not a free run given by hand), and only while the
 * trial setting is on, so the size and the length are the setting's.
 *
 *   7 days before: "Your free month ends on 14 October", and the plan that keeps it running.
 *   Past the size: "You now have 20 people", and the plan needed after the end date.
 */
export function theTrialNotices(status: BillingStatus | undefined, pricing: LivePricing | undefined, now: Date = new Date()): ATrialNotice[] {
  const free = status?.onTheHouse
  const trial = pricing?.trial
  if (!free?.freeTrial || !trial?.on) return []
  const count = status?.people?.count ?? 0
  /* The light prototype's words (s74): "Your free month ends on 14 October", "The free month is for teams of fewer than 20". */
  const one = trial.months === 1
  const theFree = one ? 'free month' : `free ${trial.months} months`
  const until = new Date(free.until)
  const out: ATrialNotice[] = []
  const plan = thePlanThatHolds(count, pricing)
  const planWords = plan ? `${nameOf(plan)}${aMonth(pricing, plan) ? `, ${aMonth(pricing, plan)}` : ''}` : null

  if (count >= trial.teamsUnder) {
    out.push({
      key: 'past the size',
      heading: `You now have ${count} people`,
      body: `The ${theFree} ${one ? 'is' : 'are'} for teams of fewer than ${trial.teamsUnder}. Your trial carries on until its end date${planWords ? `; after that you’ll need ${planWords}.` : '.'}`,
      choose: null,
    })
  }
  const daysLeft = (until.getTime() - now.getTime()) / (24 * 3600 * 1000)
  if (daysLeft <= 7 && daysLeft > 0) {
    out.push({
      key: 'ending',
      heading: `Your ${theFree} ${one ? 'ends' : 'end'} on ${whenItWas(until, 'dayAndMonthLong')}`,
      body: `${planWords ? `Your team has ${count} ${count === 1 ? 'person' : 'people'}, so ${planWords}, keeps everything running. ` : ''}Nothing is charged until you choose.`,
      choose: plan,
    })
  }
  return out
}
