import { apiClient } from './client'

export const billingApi = {
  status: () => apiClient.get<{ billingReady: boolean }>('/billing/status').then((r) => r.data),
  careFeeCheckout: () =>
    apiClient.post<{ checkoutUrl: string }>('/billing/care-fee/checkout').then((r) => r.data),
}
