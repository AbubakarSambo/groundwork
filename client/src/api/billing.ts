import { apiClient } from './client'

export interface BillingStatus {
  careFeeActive: boolean
  activeGrounds: number
  estimatedNextCharge: number | null
  nextBillingDate: string | null
  card?: { brand: string; last4: string } | null
  activeParticipants?: { email: string; name?: string }[]
  participantsAtThreshold?: { email: string; name?: string; sessionNumber?: number }[]
}

export interface ContributorCode {
  code: string
  sessionsGranted: number
  sessionsUsed: number
  note?: string
  createdAt?: string
}

export const billingApi = {
  status: () =>
    apiClient.get<BillingStatus>('/billing/status').then(r => r.data),

  createCareFeeCheckout: (groundId?: string) =>
    apiClient.post<{ url: string; checkoutUrl?: string }>('/billing/care-fee/checkout', groundId ? { groundId } : {}).then(r => {
      const url = r.data.url ?? r.data.checkoutUrl
      if (!url) throw new Error('No checkout URL returned from server.')
      return url
    }),

  cancelCareFee: () =>
    apiClient.post('/billing/care-fee/cancel').then(r => r.data),

  portal: () =>
    apiClient.post<{ url: string }>('/billing/portal').then(r => r.data),

  cancelSubscription: () =>
    apiClient.delete('/billing/subscription').then(r => r.data),

  applyContributorCode: (code: string) =>
    apiClient.post<{ ok: boolean; message: string }>('/billing/contributor-code', { code }).then(r => r.data),

  purchaseSession: (groundId: string) =>
    apiClient.post<{ checkoutUrl: string }>('/billing/purchase-session', { groundId }).then(r => r.data),

  generateContributorCode: (sessionsGranted: number, note?: string) =>
    apiClient.post<{ code: string }>('/billing/contributor-codes', { sessionsGranted, note }).then(r => r.data),

  redeemContributorCode: (code: string, groundId: string) =>
    apiClient.post<{ ok: boolean; message: string; sessionsAdded?: number }>('/billing/contributor-codes/redeem', { code, groundId }).then(r => r.data),

  getContributorCodes: () =>
    apiClient.get<ContributorCode[]>('/billing/contributor-codes').then(r => r.data),
}
