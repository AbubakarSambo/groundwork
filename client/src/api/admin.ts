import { apiClient } from './client'
import type { SubscriptionPlan } from './billing'

export interface WhatsAppToggleState {
  credentialsConfigured: boolean
  adminEnabled: boolean
  live: boolean
}

export interface PricingPlanRow {
  plan: SubscriptionPlan
  label: string
  amountCents: number
  hasStripePrice: boolean
  updatedAt: string
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

  setPricing: (plan: SubscriptionPlan, amountCents: number) =>
    apiClient.patch<PricingPlanRow[]>(`/admin/pricing/${plan}`, { amountCents }).then(r => r.data),
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
