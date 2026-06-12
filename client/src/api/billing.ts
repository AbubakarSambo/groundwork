import { apiClient } from './client'

export interface BillingActiveGround {
  groundId: string
  label: string
  scenario: string
  activeSince: string
  monthlyFee: number
}

export interface BillingEvent {
  id: string
  eventType: string
  amount: number
  createdAt: string
}

export interface BillingStatus {
  billingReady: boolean
  activeGrounds?: BillingActiveGround[]
  estimatedMonthlyTotal?: number
  nextBillingDate?: string | null
  cardLast4?: string | null
  history?: BillingEvent[]
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
  toggleSeat: (groundId: string, participantId: string, active: boolean) =>
    apiClient.patch(`/billing/seats`, { groundId, participantId, active }).then((r) => r.data),
}
