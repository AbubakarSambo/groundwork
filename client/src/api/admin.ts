import { apiClient } from './client'
import type { SubscriptionPlan } from './billing'

export interface WhatsAppToggleState {
  credentialsConfigured: boolean
  adminEnabled: boolean
  live: boolean
}

export interface CoachingBatch {
  live: boolean
  count: number
  rows: {
    participantId: string
    who: string
    organisation: string | null
    ground: string | null
    scenario: string | null
    roleAsDescribed: string | null
    detectedFunction: string | null
    currentStep: string | null
    lastInput: unknown
    updatedAt: string
  }[]
}

/** Where the daily delivery alert goes: saved here, from the server setting, or nowhere (nothing is sent). */
export interface DeliveryAlert {
  email: string | null
  from: 'here' | 'server' | null
}

/** The daily usage summary: whether it goes, at which hour in Lagos (0 to 23), and the back-office team it goes to. */
export interface DailyUsage {
  on: boolean
  hour: number
  to: string[]
  /** How each hour, 0 to 23, is said ("8 in the morning"), from the API so the page and the email say it the same way. */
  hours: string[]
}

export interface CorrectionWindow {
  days: number
  default: number
  max: number
}

/** The regular free trial: whether it is on, the team size it is for, and how many months (decision 78: always 1 today). */
/** The weeks after a free trial before Groundwork pauses, the timing of their emails, and their words (2 November 2026). */
export interface AdminTrialGrace {
  weeks: number
  dailyForTheLastDays: number
  fromHour: number
  words: Record<string, string>
  onSince?: string
}

export interface AdminFreeTrial {
  on: boolean
  teamsUnder: number
  months: number
}

/** The anchor's own trial (anchor piece 34): whether it is on. Only on or off - its one month, for up to 20 people, is fixed. */
export interface AdminAnchorTrial {
  on: boolean
  months: number
  people: number
}

export interface FreeRunRow {
  id: string
  email: string
  months: number
  plan: string
  note: string | null
  createdAt: string
  /** waiting: promised, nobody has signed up yet. running: in it. finished / withdrawn: over. */
  state: 'waiting' | 'running' | 'finished' | 'withdrawn'
  claimedAt: string | null
  endsAt: string | null
}

export interface PricingPlanRow {
  plan: SubscriptionPlan
  /** Null for a contact-sales plan. The panel shows "Contact us" and offers no price editor. */
  amountCents: number | null
  label: string
  /** Null means unlimited. Editable here, because a cap only reachable by SQL is a cap that drifts. */
  memberCap: number | null
  hasStripePrice: boolean
  /** Fix list item 6: an extra seat a month, and WhatsApp a month for each person who used it. Null where not sold by itself. */
  extraSeatCents?: number | null
  whatsappPersonCents?: number | null
  updatedAt: string
}

export interface CallRequestRow {
  id: string
  about: 'CALL' | 'COACHING' | 'HANDS_ON' | 'INTEGRATION'
  note: string | null
  askedAt: string
  orgName: string
  paying: boolean
  who: string
  email: string | null
}

export interface InboundMessage {
  id: string
  fromAddress: string
  fromName: string | null
  toAddress: string
  subject: string | null
  body: string | null
  receivedAt: string
  readAt: string | null
}

export interface ApiAccessRequest {
  id: string
  organization: { id: string; name: string }
  whatFor: string
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'WITHDRAWN'
  requestedAt: string
  requestedBy: string
  decidedBy: string | null
  decidedAt: string | null
  note: string | null
  acceptedTermsAt: string | null
  termsVersion: string | null
  /** The version accepted is not the version in force. Shown; what to do about it is the terms owner's call. */
  termsOutOfDate: boolean
  /** The last 24 hours of machine calls, when there were any. */
  lastDay: { calls: number; reads: number; writes: number } | null
  /** What the watch noticed and nobody has cleared. See the-api-is-watched.ts. */
  flags: { id: string; kind: string; detail: string; raisedAt: string }[]
}

export const adminApi = {
  /** Zero-row detection: which writers have never written. */
  writers: () =>
    apiClient.get<{ checkedAt: string; flaggedCount: number; rows: { table: string; writer: string; count: number | null; lastWrite: string | null; shippedAt: string | null; flagged: boolean; needs?: string; error?: string }[] }>('/admin/writers').then(r => r.data),
  /** Every organisation that has asked for the API — ours among them. */
  getApiAccessRequests: () =>
    apiClient.get<ApiAccessRequest[]>('/admin/api-access').then(r => (Array.isArray(r.data) ? r.data : [])),

  decideApiAccess: (id: string, status: ApiAccessRequest['status'], note?: string) =>
    apiClient.patch(`/admin/api-access/${id}`, { status, note }).then(r => r.data),

  clearApiFlag: (flagId: string) =>
    apiClient.patch(`/admin/api-access/flags/${flagId}/clear`).then(r => r.data),

  getWhatsAppStatus: () =>
    apiClient.get<WhatsAppToggleState>('/admin/whatsapp').then(r => r.data),

  setWhatsAppEnabled: (enabled: boolean) =>
    apiClient.patch<WhatsAppToggleState>('/admin/whatsapp', { enabled }).then(r => r.data),

  /** The coaching batch, read before the switch is thrown, and the switch. */
  getCoaching: () => apiClient.get<CoachingBatch>('/admin/coaching').then(r => r.data),
  setCoachingLive: (live: boolean) =>
    apiClient.patch<{ live: boolean }>('/admin/coaching', { live }).then(r => r.data),

  /** Release 1's sales board, switched on or off for one organisation (staff only). The server says back what changed. */
  setReleaseOneSalesBoard: (organizationId: string, on: boolean) =>
    apiClient.patch<{ id: string; name: string; release1SalesBoardOn: boolean; says: string }>(`/admin/organisations/${organizationId}/release-one-sales-board`, { on }).then(r => r.data),

  setRelease2Collections: (organizationId: string, on: boolean) =>
    apiClient.patch<{ id: string; name: string; release2CollectionsOn: boolean; says: string }>(`/admin/organisations/${organizationId}/release-2-collections`, { on }).then(r => r.data),

  getDailyUsage: () => apiClient.get<DailyUsage>('/admin/daily-usage').then(r => r.data),
  setDailyUsage: (body: { on?: boolean; hour?: number }) =>
    apiClient.patch<DailyUsage>('/admin/daily-usage', body).then(r => r.data),
  getDeliveryAlert: () => apiClient.get<DeliveryAlert>('/admin/delivery-alert').then(r => r.data),
  setDeliveryAlert: (email: string) =>
    apiClient.patch<DeliveryAlert>('/admin/delivery-alert', { email }).then(r => r.data),
  getCorrectionWindow: () => apiClient.get<CorrectionWindow>('/admin/correction-window').then(r => r.data),
  setCorrectionWindow: (days: number) =>
    apiClient.patch<CorrectionWindow>('/admin/correction-window', { days }).then(r => r.data),

  /** Whether this deployment can take money. Never the key itself. */
  getStripeStatus: () =>
    apiClient.get<{ isConfigured: boolean; says: string; badge?: string; keyKind?: 'none' | 'placeholder' | 'test' | 'live' | 'unknown' }>('/admin/stripe').then(r => r.data),

  /**
   * ONE MONTH ON THE HOUSE (decision 78; the route keeps its old name). An address is promised a
   * free run before there is an organisation to give it to; the clock starts when they sign up.
   * See the API's three-months-on-the-house.
   */
  listFreeRuns: () =>
    apiClient.get<FreeRunRow[]>('/admin/free-runs').then(r => (Array.isArray(r.data) ? r.data : [])),

  grantFreeRun: (body: { email: string; months?: number; plan?: string; note?: string }) =>
    apiClient.post<FreeRunRow>('/admin/free-runs', body).then(r => r.data),

  withdrawFreeRun: (id: string) =>
    apiClient.post(`/admin/free-runs/${id}/withdraw`).then(r => r.data),

  getPricing: () =>
    apiClient.get<PricingPlanRow[]>('/admin/pricing').then(r => (Array.isArray(r.data) ? r.data : [])),

  getFreeGroundLimit: () =>
    apiClient.get<{ freeGroundLimit: number }>('/admin/pricing/free-ground-limit').then(r => r.data),

  setFreeGroundLimit: (freeGroundLimit: number) =>
    apiClient.patch<{ freeGroundLimit: number }>('/admin/pricing/free-ground-limit', { freeGroundLimit }).then(r => r.data),

  getFreeMemberLimit: () =>
    apiClient.get<{ freeMemberLimit: number }>('/admin/pricing/free-member-limit').then(r => r.data),

  setFreeMemberLimit: (freeMemberLimit: number) =>
    apiClient.patch<{ freeMemberLimit: number }>('/admin/pricing/free-member-limit', { freeMemberLimit }).then(r => r.data),

  getFreeTrial: () =>
    apiClient.get<AdminFreeTrial>('/admin/pricing/free-trial').then(r => r.data),

  /** Only `on` is switched here - every free run is one month (decision 78), so the months never change from this screen. */
  setFreeTrial: (on: boolean) =>
    apiClient.patch<AdminFreeTrial>('/admin/pricing/free-trial', { on }).then(r => r.data),

  /** Every switch of one organisation (Groundwork staff only; the server refuses anyone else). */
  theSwitchesOf: (organizationId: string) =>
    apiClient.get<{ id: string; name: string; switches: { key: string; name: string; on: boolean }[] }>(`/admin/organisations/${organizationId}/switches`).then(r => r.data),

  setASwitch: (organizationId: string, key: string, on: boolean) =>
    apiClient.patch<{ id: string; name: string; switches: { key: string; name: string; on: boolean }[] }>(`/admin/organisations/${organizationId}/switches/${key}`, { on }).then(r => r.data),

  getTrialGrace: () =>
    apiClient.get<AdminTrialGrace>('/admin/pricing/trial-grace').then(r => r.data),

  setTrialGrace: (change: Partial<Omit<AdminTrialGrace, 'onSince'>>) =>
    apiClient.patch<AdminTrialGrace>('/admin/pricing/trial-grace', change).then(r => r.data),

  getAnchorTrial: () =>
    apiClient.get<AdminAnchorTrial>('/admin/pricing/anchor-trial').then(r => r.data),

  /** Only on or off: the anchor trial's one month, for up to 20 people, is fixed (anchor piece 34). */
  setAnchorTrial: (on: boolean) =>
    apiClient.patch<AdminAnchorTrial>('/admin/pricing/anchor-trial', { on }).then(r => r.data),

  /** Either field alone, or both. `memberCap: null` means unlimited, which is a value not an absence. */
  setPlanLimits: (plan: SubscriptionPlan, body: { amountCents?: number; memberCap?: number | null; extraSeatCents?: number | null; whatsappPersonCents?: number | null }) =>
    apiClient.patch<PricingPlanRow[]>(`/admin/pricing/${plan}`, body).then(r => (Array.isArray(r.data) ? r.data : [])),

  /**
   * `setPricing` USED TO SIT HERE, AND IT WAS `setPlanLimits` WITH ONE FIELD. W-UX-C.
   *
   * Same verb, same route, a strict subset of the same body - so the price and the seat cap, two
   * fields of one row, were written through two different functions. The cap already went through
   * `setPlanLimits`; the price did not, for no reason but the order they were added.
   *
   * This is where "Scale advertised 1,000 people in three places" comes from, and the comment inside
   * `setPlanLimits` already says a cap that drifts is what it exists to prevent.
   */

  /*
   * MAIL SENT TO US. `hello@myground.work` is on the marketing site and arrived in one person's
   * inbox, invisible to anybody else and unanswerable if she were away. See the model note.
   */
  /*
   * EVERY CALL SOMEBODY HAS ASKED FOR. Coaching, setup and integration are the same request with a
   * different subject - one queue, because a second one is a queue nobody opens.
   */
  getCallRequests: () =>
    apiClient.get<{ requests: CallRequestRow[] }>('/admin/call-requests').then(r => r.data),

  markCallAnswered: (id: string) =>
    apiClient.post<{ requests: CallRequestRow[] }>(`/admin/call-requests/${id}/answered`).then(r => r.data),

  getInbox: () =>
    apiClient.get<{ messages: InboundMessage[]; unread: number }>('/admin/inbox').then(r => r.data),

  markInboundRead: (id: string) =>
    apiClient.post<{ messages: InboundMessage[]; unread: number }>(`/admin/inbox/${id}/read`).then(r => r.data),
}

export interface PricingSnapshot {
  planPricesCents: Record<string, number>
  freeGroundLimit: number
  updatedAt: string | null
  updatedBy: string | null
}

/** Platform-admin reads and writes of what we charge. The public read lives in api/billing.ts. */
export const pricingAdminApi = {
  get: () => apiClient.get<PricingSnapshot>('/billing/admin/pricing').then(r => r.data),

  update: (patch: { planPricesCents?: Record<string, number>; freeGroundLimit?: number }) =>
    apiClient.patch<PricingSnapshot>('/billing/admin/pricing', patch).then(r => r.data),

  reset: () => apiClient.post<PricingSnapshot>('/billing/admin/pricing/reset').then(r => r.data),
}
