import { apiClient } from './client'

export interface WhatsAppToggleState {
  credentialsConfigured: boolean
  adminEnabled: boolean
  live: boolean
}

export const adminApi = {
  getWhatsAppStatus: () =>
    apiClient.get<WhatsAppToggleState>('/admin/whatsapp').then(r => r.data),

  setWhatsAppEnabled: (enabled: boolean) =>
    apiClient.patch<WhatsAppToggleState>('/admin/whatsapp', { enabled }).then(r => r.data),
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
