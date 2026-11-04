import { apiClient } from './client'

export interface GroundBalance {
  groundId: string
  label: string
  startedAt: string | null
  sessionsBalance: number
}

export interface BillingStatus {
  /**
   * The subscription is the ORGANISATION's, and this shape did not carry it. W14-6.
   *
   * `BillingPage` had nowhere to read the plan from and took it off `grounds[0].org`, so an
   * organisation with no open grounds saw "Free · No subscription" and lost Pause, Resume and
   * Cancel - a paying customer locked out of managing what they pay for.
   */
  subscription: {
    plan: SubscriptionPlan | null
    status: string | null
    periodEnd: string | null
    /** Non-null means a cancellation is scheduled: access runs to this date and then stops. */
    endsAt: string | null
    freeExtensionUsed: boolean
  }
  /** `cap: null` means unlimited or no plan - render the count without a ceiling. W14-7. */
  people: { count: number; cap: number | null }
  /** Request 197: "6 people are waiting for a seat because your plan is full. ...", the same sentence People says; null when nobody waits. */
  overThePlanSays?: string | null
  /**
   * Set while a free run we gave them is running: what it covers and the day it ends. A free run
   * nobody can see ends as a surprise, which is the one thing it must not do.
   */
  onTheHouse?: { plan: SubscriptionPlan; until: string; freeTrial?: boolean } | null
  /**
   * Admin only (2 November 2026): the four weeks after the free month, or the pause after them, in the server's one sentence, the
   * same one Today says. Null or absent otherwise.
   */
  afterTheTrial?: string | null
  activeGrounds: GroundBalance[]
  card?: { brand: string; last4: string } | null
  /**
   * U.19: false when nothing covers the organisation and the free plan has stopped for it (the free
   * trial's switch is on and it is new). True, or absent from an older server, means the free plan.
   */
  onTheFreePlan?: boolean
  /** Admin only (U.19): the paid subscription invoices, newest first. */
  invoices?: { paidOn: string; amountCents: number; currency: string }[]
  /** Admin only: counts of what the organisation has done. */
  usage?: { checkIns: number; reportsReleased: number; peopleTakingPart: number }
  /**
   * Admin only: what it began on, when it was set up - a plain sentence, never a figure.
   * "When Baridi Appliances was set up, it had 20 or more people, so it began on a plan."
   */
  startedWith?: { said: 'fewer' | 'more'; line: number; says: string } | null
  /** Admin only (fix list item 6): this month, line by line, each plan for your people, and a cheaper plan. Every sentence is the server's. */
  month?: WhatAMonthSays | null
}

export interface ContributorCode {
  code: string
  sessionsGranted: number
  sessionsUsed: number
  note?: string
  createdAt?: string
}

export interface CanCreateGroundResult {
  allowed: boolean
  reason?: string
  freeReason?: string
  codeId?: string
  groundsUsed?: number
  /** U.19: refused because the organisation has no plan and the free plan has stopped for it. */
  noPlan?: boolean
}

/**
 * The free limits are NOT constants here any more.
 *
 * `FREE_GROUND_LIMIT = 10` lived here while the API read the same number out of
 * `platform_settings`, where a platform admin edits it. Five screens rendered this constant, so
 * changing the limit in the admin panel changed what the API enforced and nothing the user read.
 * Both limits now arrive on `GET /billing/pricing` as `free.groundLimit` and `free.memberLimit`.
 *
 * The defaults below are the pre-load fallback ONLY, the same treatment the prices already get,
 * and they are pinned against the API's own defaults by a guard rather than typed twice.
 */
export const FALLBACK_FREE_LIMITS = { groundLimit: 10, memberLimit: 5 } as const

export type SubscriptionPlan = 'STARTER' | 'SMALL_TEAM' | 'GROWTH' | 'BUSINESS' | 'SCALE' | 'ENTERPRISE'

export const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  STARTER: 'Starter',
  SMALL_TEAM: 'Small Team',
  GROWTH: 'Growth',
  BUSINESS: 'Business',
  SCALE: 'Scale',
  ENTERPRISE: 'Enterprise',
}

/**
 * WHAT WE CHARGE, IN CENTS, AS THE API REPORTS IT.
 *
 * These are the FALLBACKS. The live figures come from `GET /billing/pricing`, which reads the
 * amounts a platform admin has set, so a price change reaches the app without a rebuild.
 *
 * The fallbacks exist because a pricing page must never render blank or say $0 - if the request
 * has not landed yet, or fails, the last-shipped price is a far better answer than nothing. They
 * are cents rather than pre-formatted dollars for one reason: a guard test can compare cents to
 * the cents the API actually charges. It could not compare '$25/mo' to 2500, which is how the
 * charged amount and the advertised amount were free to disagree.
 */
export const FALLBACK_PLAN_PRICES_CENTS: Record<SubscriptionPlan, number | null> = {
  STARTER: 2500,
  SMALL_TEAM: 9000,
  GROWTH: 40000,
  BUSINESS: 90000,
  SCALE: 165000,
  ENTERPRISE: null,
}

/**
 * The pre-load fallback strings, DERIVED from the cents above rather than typed out again.
 *
 * Written by hand they were a fourth copy of the price. Derived, they cannot disagree with the
 * cents the guard pins to the API - and ENTERPRISE has no amount, so it says what it means.
 */
export const PLAN_PRICES: Record<SubscriptionPlan, string> = Object.fromEntries(
  (Object.entries(FALLBACK_PLAN_PRICES_CENTS) as [SubscriptionPlan, number | null][]).map(
    ([plan, cents]) => [plan, cents === null ? 'Contact us' : formatMonthlyPrice(cents)],
  ),
) as Record<SubscriptionPlan, string>

/**
 * WHAT EACH PLAN INCLUDES, IN ONE PLACE.
 *
 * These lived inside PricingPage while the prices, labels and seat caps beside them
 * were already shared - so a plan could be described one way on /pricing and another
 * inside Billing, and there was nothing to notice it.
 *
 * That is not hypothetical. Reviewing this product I read a stale note, concluded the
 * free tier's "unlimited sessions" claim contradicted the billing rules, and had
 * rewritten BOTH pages to advertise "$5 per extra session" before checking
 * `billing.service.ts` - which says free-tier grounds are never metered, deliberately.
 * The copy was right. But two independent copies of a pricing claim is how that kind
 * of mistake ships.
 *
 * The source of truth for what is CHARGED is billing.service.ts on the API. This is
 * the source of truth for how it is DESCRIBED.
 */
export const PLAN_FEATURES: Record<SubscriptionPlan, string[]> = {
  STARTER: ['Unlimited check-ins', 'Unlimited sessions', 'Unlimited reports', 'Admin dashboard'],
  SMALL_TEAM: ['Unlimited check-ins', 'Unlimited sessions', 'Unlimited reports', 'Admin dashboard'],
  GROWTH: ['Unlimited check-ins', 'Unlimited sessions', 'Unlimited reports', 'Admin dashboard'],
  BUSINESS: ['Unlimited check-ins', 'Unlimited sessions', 'Unlimited reports', 'Admin dashboard'],
  SCALE: ['Unlimited check-ins', 'Unlimited sessions', 'Unlimited reports', 'Admin dashboard'],
  ENTERPRISE: ['Unlimited check-ins', 'Unlimited sessions', 'Unlimited reports', 'Dedicated account manager'],
}

/**
 * PLAN_MEMBER_CAPS and PLAN_MEMBER_LIMITS used to be here, hardcoded, alongside a third copy on
 * the API and a fourth inside the plan labels. The caps are now `pricing_plans.memberCap`, and
 * they arrive with the prices on `GET /billing/pricing`.
 *
 * There is deliberately no fallback for a cap. A price must never render blank, because a pricing
 * page with no price is broken - but a seat count that is briefly absent is honest, and a stale
 * fallback cap is exactly the bug this removes: "Up to 1,000 people" surviving a change to 500.
 *
 * `formatMemberCap` turns the live number into the words those maps used to hold.
 */
export function formatMemberCap(cap: number | null | undefined): string {
  if (cap === null) return 'Unlimited'
  if (cap === undefined) return ''
  return `Up to ${cap.toLocaleString('en-US')} people`
}

export interface LivePricingRow {
  plan: SubscriptionPlan
  label: string
  /** Null for a contact-sales plan. Never render "$0" from this. */
  amountCents: number | null
  /** Null means unlimited. Undefined means it has not loaded yet. */
  memberCap: number | null
  hasStripePrice: boolean
  /** Fix list item 6: each seat past `memberCap`, a month ($5), and WhatsApp a month for each person who used it ($4). Null where not sold by itself. */
  extraSeatCents?: number | null
  whatsappPersonCents?: number | null
  updatedAt: string
}

export interface WhatAMonthSays {
  people: number
  plan: SubscriptionPlan | null
  included: string | null
  peopleSays: string
  lines: { says: string; amount: string }[] | null
  total: { says: string; amount: string } | null
  free: string | null
  priceChanges: string
  cheaper: { plan: SubscriptionPlan; says: string; button: string } | null
  plansNote: string | null
  whatsappRate: string | null
  plans: { plan: SubscriptionPlan; name: string; price: string; includes: string; extraSeats: string | null; whatsapp: string | null; forYou: string | null; yours: boolean }[]
  forHowMany: string
  numbers: { whatsappOn: boolean; whatsappUsedIt: number; whatsappFree: boolean; whatsappFlatCents: number | null }
}

export interface LivePricing {
  plans: LivePricingRow[]
  free: { groundLimit: number; memberLimit: number }
  /** The free trial (Hafsah, 26 September). Billing grants it while it is on (U.19); say nothing while off. */
  trial?: { on: boolean; teamsUnder: number; months: number }
}

/**
 * "$25/mo" and "$1,650/mo" from cents. The one formatter: PLAN_PRICES is built from it too.
 *
 * The thousands separator is not cosmetic. Scale went from $400 to $1,650, and this returned
 * "$1650/mo" - the first four-figure price on any surface, so nothing had shown the gap before.
 */
export function formatMonthlyPrice(cents: number): string {
  const dollars = cents / 100
  const body = Number.isInteger(dollars)
    ? dollars.toLocaleString('en-US')
    : dollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `$${body}/mo`
}

/** "$400" and "$1,650", for a sentence: "Growth, $400 a month." The prototype's words. */
export function formatDollars(cents: number): string {
  const dollars = cents / 100
  return `$${Number.isInteger(dollars)
    ? dollars.toLocaleString('en-US')
    : dollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export interface CodeShareCard {
  code: string
  expiresAt: string
  daysRemaining: number
  note?: string
  allowCodeCreation: boolean
}

/**
 * WHATSAPP, THE PAID ADD-ON (decision 78, 2 October). `GET /billing/whatsapp` serves one of two
 * shapes, and the server decides which, not the screen: an admin, while `release.planAndBillingNewParts`
 * is on, reads `WhatsAppBillingAdmin`; everybody else, and an admin while that switch is off, reads
 * only `WhatsAppBillingMinimal`. Nothing here holds a price, a limit or a number of its own - every
 * sentence in `says` is built by the server and shown exactly as it comes.
 */
export interface WhatsAppBillingMinimal {
  /**
   * Whether the organisation's WhatsApp add-on is on (5 October, evening: every reader is served
   * this now, not only an admin). Still never a price or a limit - those stay admin only.
   */
  on: boolean
  sending: boolean
  says: string | null
}

export interface WhatsAppBillingAdmin {
  on: boolean
  /** On for the organisation: the add-on, or its free WhatsApp month. The fact `says.onOrOff` says (15 October). */
  onForTheOrganisation?: boolean
  plan: SubscriptionPlan | null
  price: { amountCents: number; currency: 'USD' } | null
  charged: boolean
  freeTrial: { months: number; endsOn: string } | null
  /** The end of the free WhatsApp month every organisation gets, while it lasts (13 October, evening). */
  freeUntil?: string | null
  onTheFreePlan: boolean
  use: { month: string; sent: number; limit: number | null; startsAgainOn: string }
  sending: boolean
  heldBecause: 'not turned on' | 'not on a paid plan' | 'at the limit' | null
  says: {
    onOrOff: string
    /** "WhatsApp is free until 13 November 2026. To keep it after that, add it to your subscription with the switch above." */
    freeMonth?: string | null
    price: string | null
    /** Fix list item 6, s73's WhatsApp card. */
    whoIsCharged?: string | null
    whoIsChargedMore?: string | null
    people?: string | null
    charge: string
    use: string
    atTheLimit: string | null
    reachedTheLimit: string | null
    held: string | null
  }
}

export type WhatsAppBilling = WhatsAppBillingMinimal | WhatsAppBillingAdmin

/**
 * True only for the full admin shape. `on` is served to every reader now (5 October, evening), so
 * it can no longer tell the two shapes apart - `says` still can: a plain sentence (or null) for
 * everybody else, an object of sentences for an admin.
 */
export function isWhatsAppBillingAdmin(w: WhatsAppBilling | undefined): w is WhatsAppBillingAdmin {
  return !!w && typeof (w as WhatsAppBillingAdmin).says === 'object' && (w as WhatsAppBillingAdmin).says !== null
}

export const billingApi = {
  /**
   * Live prices - what a checkout actually charges (Admin -> System -> Pricing).
   * PLAN_PRICES above is a static fallback for while this is loading/unreachable,
   * not a second source of truth: prefer this everywhere a real price is shown.
   */
  /** Whether a free run is waiting for this address. Public: asked at the sign-up screen. */
  whatIsWaitingFor: (email: string) =>
    apiClient.get<{ months: number; plan: string | null }>('/billing/on-the-house', { params: { email } }).then(r => r.data),

  getPricing: () =>
    apiClient.get<LivePricing>('/billing/pricing').then(r => r.data),

  status: () =>
    apiClient.get<BillingStatus>('/billing/status').then(r => r.data),

  portal: () =>
    apiClient.post<{ portalUrl: string }>('/billing/portal').then(r => r.data),

  claimFreeExtension: (groundId: string) =>
    apiClient.post('/billing/free-extension', { groundId }).then(r => r.data),

  /* Quiet on a server error: the billing page says what happened in one sentence of its own
     ("Paying is not set up yet. Nothing was charged."), and the shared pop-up said the opposite
     beside it (recheck, 7 October). */
  createSubscription: (plan: SubscriptionPlan) =>
    apiClient.post<{ checkoutUrl: string }>('/billing/subscription', { plan }, { skipServerErrorToast: true } as any).then(r => r.data),

  changeSubscriptionPlan: (plan: SubscriptionPlan) =>
    apiClient.patch<{ plan: SubscriptionPlan; periodEnd: string | null }>('/billing/subscription/plan', { plan }).then(r => r.data),

  /** Schedules the end of the paid period; access continues until then. Returns when. */
  cancelSubscription: () =>
    apiClient.delete<{ endsAt: string | null }>('/billing/subscription').then(r => r.data),

  /** Undo a scheduled cancellation before the date. */
  keepSubscription: () =>
    apiClient.post('/billing/subscription/keep').then(r => r.data),

  pauseSubscription: () =>
    apiClient.patch('/billing/subscription/pause').then(r => r.data),

  resumeSubscription: () =>
    apiClient.patch('/billing/subscription/resume').then(r => r.data),

  applyContributorCode: (code: string) =>
    apiClient.post<{ ok: boolean; message: string }>('/billing/contributor-code', { code }).then(r => r.data),

  /**
   * `purchaseSession` USED TO SIT HERE, AND THE SERVER ALREADY SAYS IT IS DEAD. W-UX-C.
   *
   * Its own `@ApiOperation` reads: "LEGACY - per-session purchase. Sessions are not sold; no
   * user-facing surface calls this. Retained only because live Stripe records may reference it."
   *
   * So the route is deliberately kept and the CLIENT method was just the leftover - and it was the
   * thing the removed "Unlock insights" upsells used to call, which is how a per-session checkout
   * came to be offered for a product that has no per-session billing.
   *
   * The server route stays, per the standing rule and its own stated reason.
   */

  generateContributorCode: (sessionsGranted: number, note?: string) =>
    apiClient.post<{ code: string }>('/billing/contributor-codes', { sessionsGranted, note }).then(r => r.data),

  sendContributorCodeToEmail: (email: string, sessionsGranted: number, note?: string) =>
    apiClient.post<{ code: string; email: string }>('/billing/contributor-codes/send-to-email', { email, sessionsGranted, note }).then(r => r.data),

  redeemContributorCode: (code: string, groundId: string) =>
    apiClient.post<{ ok: boolean; message: string; sessionsAdded?: number }>('/billing/contributor-codes/redeem', { code, groundId }).then(r => r.data),

  getContributorCodes: () =>
    apiClient.get<ContributorCode[]>('/billing/contributor-codes').then(r => (Array.isArray(r.data) ? r.data : [])),

  getContributorCodeShareCard: (codeId: string) =>
    apiClient.get<CodeShareCard>(`/billing/contributor-codes/${codeId}/share-card`).then(r => r.data),

  /** WhatsApp, the paid add-on (decision 78). The server decides the shape; see `WhatsAppBilling` above. */
  /** Fix list item 6: whether the next invitation adds a paid seat, and "This adds a seat: +$5 a month" when it does. */
  nextSeat: () =>
    apiClient.get<{ addsASeat: boolean; says: string | null }>('/billing/next-seat', { skipServerErrorToast: true } as any).then(r => r.data),

  getWhatsApp: () =>
    apiClient.get<WhatsAppBilling>('/billing/whatsapp').then(r => r.data),

  /** An admin only; a lead or member is refused by the server. */
  setWhatsApp: (on: boolean) =>
    apiClient.patch<WhatsAppBilling>('/billing/whatsapp', { on }, { skipServerErrorToast: true } as any).then(r => r.data),

  /**
   * "Remind them", on a check-in paused until the team subscribes (upgrade.txt). An admin, a lead
   * or a member may press it, at most once a day; a guest is refused by the server.
   */
  remindTheAdmins: (groundId: string) =>
    apiClient.post<{ reminded: boolean; says: string }>('/billing/remind-the-admins', { groundId }).then(r => r.data),

  checkCanCreateGround: (accessCode?: string) =>
    apiClient.get<CanCreateGroundResult>('/billing/can-create-ground', {
      params: accessCode ? { code: accessCode } : undefined,
    }).then(r => r.data),

  /**
   * `getCodeShareCard` USED TO SIT HERE, AND IT WAS THE SAME FUNCTION TWICE. W-UX-C.
   *
   * It pointed at `/billing/code-share/:id`, a route that never existed, which #21 found. The fix
   * then was to repoint it at the real share-card route - the one `getContributorCodeShareCard`
   * fifteen lines above was already calling correctly - and to write a test locking BOTH functions
   * to that route.
   *
   * So the outcome was two identical methods for one endpoint, held together by a guard. That is the
   * shape this whole pass keeps finding: two places that must agree, each defensible alone. Nothing
   * ever called this one, so it is gone and the guard now checks there is only one.
   */
}
