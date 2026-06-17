import { apiClient } from './client'

export interface BillingStatus {
  careFeeActive: boolean
  activeGrounds: number
  estimatedNextCharge: number | null
  nextBillingDate: string | null
  card?: { brand: string; last4: string } | null
}

export const billingApi = {
  status: () =>
    apiClient.get<BillingStatus>('/billing/status').then(r => r.data),

  createCareFeeCheckout: () =>
    apiClient.post<{ url: string }>('/billing/care-fee/checkout').then(r => r.data),

  cancelCareFee: () =>
    apiClient.post('/billing/care-fee/cancel').then(r => r.data),

  portal: () =>
    apiClient.post<{ url: string }>('/billing/portal').then(r => r.data),

  cancelSubscription: () =>
    apiClient.delete('/billing/subscription').then(r => r.data),

  applyContributorCode: (code: string) =>
    apiClient.post<{ applied: boolean }>('/billing/contributor-code', { code }).then(r => r.data),
}
