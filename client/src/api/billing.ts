import { apiClient } from './client'

export interface BillingActiveGround {
  groundId: string
  label: string
  scenario: string
  activeSince: string
  monthlyFee: number
}

export interface BillingStatus {
  billingReady: boolean
  activeGrounds?: BillingActiveGround[]
  estimatedMonthlyTotal?: number
}

export const billingApi = {
  status: () => apiClient.get<BillingStatus>('/billing/status').then((r) => r.data),
  careFeeCheckout: () =>
    apiClient.post<{ checkoutUrl: string }>('/billing/care-fee/checkout').then((r) => r.data),
  submitFeedback: (groundId: string, data: {
    rating: number
    whatWorked?: string
    whatDidnt?: string
    wouldUseAgain: boolean
  }) => apiClient.post(`/grounds/${groundId}/feedback`, data).then((r) => r.data),
  getFeedback: (groundId: string) =>
    apiClient.get(`/grounds/${groundId}/feedback`).then((r) => r.data).catch(() => null),
}
