import { apiClient } from './client'
import type { SubscriptionPlan } from './billing'

export interface WhatsAppToggleState {
  credentialsConfigured: boolean
  adminEnabled: boolean
  live: boolean
}

export interface PricingPlanRow {
  plan: SubscriptionPlan
  /** Null for a contact-sales plan. The panel shows "Contact us" and offers no price editor. */
  amountCents: number | null
  label: string
  /** Null means unlimited. Editable here, because a cap only reachable by SQL is a cap that drifts. */
  memberCap: number | null
  hasStripePrice: boolean
  updatedAt: string
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

export const adminApi = {
  getWhatsAppStatus: () =>
    apiClient.get<WhatsAppToggleState>('/admin/whatsapp').then(r => r.data),

  setWhatsAppEnabled: (enabled: boolean) =>
    apiClient.patch<WhatsAppToggleState>('/admin/whatsapp', { enabled }).then(r => r.data),

  getPricing: () =>
    apiClient.get<PricingPlanRow[]>('/admin/pricing').then(r => r.data),

  getFreeGroundLimit: () =>
    apiClient.get<{ freeGroundLimit: number }>('/admin/pricing/free-ground-limit').then(r => r.data),

  setFreeGroundLimit: (freeGroundLimit: number) =>
    apiClient.patch<{ freeGroundLimit: number }>('/admin/pricing/free-ground-limit', { freeGroundLimit }).then(r => r.data),

  getFreeMemberLimit: () =>
    apiClient.get<{ freeMemberLimit: number }>('/admin/pricing/free-member-limit').then(r => r.data),

  setFreeMemberLimit: (freeMemberLimit: number) =>
    apiClient.patch<{ freeMemberLimit: number }>('/admin/pricing/free-member-limit', { freeMemberLimit }).then(r => r.data),

  /** Either field alone, or both. `memberCap: null` means unlimited, which is a value not an absence. */
  setPlanLimits: (plan: SubscriptionPlan, body: { amountCents?: number; memberCap?: number | null }) =>
    apiClient.patch<PricingPlanRow[]>(`/admin/pricing/${plan}`, body).then(r => r.data),

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
