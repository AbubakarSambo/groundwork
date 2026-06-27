import { apiClient } from './client'

export interface GroundBalance {
  groundId: string
  label: string
  startedAt: string | null
  sessionsBalance: number
}

export interface BillingStatus {
  activeGrounds: GroundBalance[]
  card?: { brand: string; last4: string } | null
}

export interface ContributorCode {
  code: string
  sessionsGranted: number
  sessionsUsed: number
  note?: string
  createdAt?: string
}

export interface CanCreateGroundResult {
  allowed: boolean
  reason?: string
  freeReason?: string
  codeId?: string
}

export interface CodeShareCard {
  code: string
  expiresAt: string
  daysRemaining: number
  note?: string
  allowCodeCreation: boolean
}

export const billingApi = {
  status: () =>
    apiClient.get<BillingStatus>('/billing/status').then(r => r.data),

  portal: () =>
    apiClient.post<{ portalUrl: string }>('/billing/portal').then(r => r.data),

  cancelSubscription: () =>
    apiClient.delete('/billing/subscription').then(r => r.data),

  applyContributorCode: (code: string) =>
    apiClient.post<{ ok: boolean; message: string }>('/billing/contributor-code', { code }).then(r => r.data),

  purchaseSession: (groundId: string, quantity = 1) =>
    apiClient.post<{ checkoutUrl: string }>('/billing/purchase-session', { groundId, quantity }).then(r => r.data),

  generateContributorCode: (sessionsGranted: number, note?: string) =>
    apiClient.post<{ code: string }>('/billing/contributor-codes', { sessionsGranted, note }).then(r => r.data),

  redeemContributorCode: (code: string, groundId: string) =>
    apiClient.post<{ ok: boolean; message: string; sessionsAdded?: number }>('/billing/contributor-codes/redeem', { code, groundId }).then(r => r.data),

  getContributorCodes: () =>
    apiClient.get<ContributorCode[]>('/billing/contributor-codes').then(r => r.data),

  getContributorCodeShareCard: (codeId: string) =>
    apiClient.get<CodeShareCard>(`/billing/contributor-codes/${codeId}/share-card`).then(r => r.data),

  checkCanCreateGround: (accessCode?: string) =>
    apiClient.get<CanCreateGroundResult>('/billing/can-create-ground', {
      params: accessCode ? { code: accessCode } : undefined,
    }).then(r => r.data),

  getCodeShareCard: (codeId: string) =>
    apiClient.get<CodeShareCard>(`/billing/code-share/${codeId}`).then(r => r.data),
}
