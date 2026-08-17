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

  setPricing: (plan: SubscriptionPlan, amountCents: number) =>
    apiClient.patch<PricingPlanRow[]>(`/admin/pricing/${plan}`, { amountCents }).then(r => r.data),
}
