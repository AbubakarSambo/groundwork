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
  groundsUsed?: number
}

export const FREE_GROUND_LIMIT = 10

export type SubscriptionPlan = 'STARTER' | 'SMALL_TEAM' | 'GROWTH' | 'BUSINESS' | 'SCALE' | 'ENTERPRISE'

export const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  STARTER: 'Starter',
  SMALL_TEAM: 'Small Team',
  GROWTH: 'Growth',
  BUSINESS: 'Business',
  SCALE: 'Scale',
  ENTERPRISE: 'Enterprise',
}

export const PLAN_PRICES: Record<SubscriptionPlan, string> = {
  STARTER: '$25/mo',
  SMALL_TEAM: '$50/mo',
  GROWTH: '$100/mo',
  BUSINESS: '$200/mo',
  SCALE: '$400/mo',
  ENTERPRISE: 'Contact us',
}

export const PLAN_MEMBER_CAPS: Record<SubscriptionPlan, string> = {
  STARTER: 'Up to 5 people',
  SMALL_TEAM: 'Up to 20 people',
  GROWTH: 'Up to 100 people',
  BUSINESS: 'Up to 250 people',
  SCALE: 'Up to 1,000 people',
  ENTERPRISE: 'Unlimited',
}

export const PLAN_MEMBER_LIMITS: Record<SubscriptionPlan, number | null> = {
  STARTER: 5,
  SMALL_TEAM: 20,
  GROWTH: 100,
  BUSINESS: 250,
  SCALE: 1000,
  ENTERPRISE: null,
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

  claimFreeExtension: (groundId: string) =>
    apiClient.post('/billing/free-extension', { groundId }).then(r => r.data),

  createSubscription: (plan: SubscriptionPlan) =>
    apiClient.post<{ checkoutUrl: string }>('/billing/subscription', { plan }).then(r => r.data),

  cancelSubscription: () =>
    apiClient.delete('/billing/subscription').then(r => r.data),

  pauseSubscription: () =>
    apiClient.patch('/billing/subscription/pause').then(r => r.data),

  resumeSubscription: () =>
    apiClient.patch('/billing/subscription/resume').then(r => r.data),

  applyContributorCode: (code: string) =>
    apiClient.post<{ ok: boolean; message: string }>('/billing/contributor-code', { code }).then(r => r.data),

  purchaseSession: (groundId: string, quantity = 1) =>
    apiClient.post<{ checkoutUrl: string }>('/billing/purchase-session', { groundId, quantity }).then(r => r.data),

  generateContributorCode: (sessionsGranted: number, note?: string) =>
    apiClient.post<{ code: string }>('/billing/contributor-codes', { sessionsGranted, note }).then(r => r.data),

  sendContributorCodeToEmail: (email: string, sessionsGranted: number, note?: string) =>
    apiClient.post<{ code: string; email: string }>('/billing/contributor-codes/send-to-email', { email, sessionsGranted, note }).then(r => r.data),

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
    apiClient.get<CodeShareCard>(`/billing/contributor-codes/${codeId}/share-card`).then(r => r.data),
}
