import { apiClient } from './client'

export type ChatTurn = { role: 'user' | 'assistant'; content: string }

export interface PromptVersion {
  id: string
  key: string
  version: number
  summary: string | null
  isActive: boolean
  isDraft?: boolean
  activatedAt: string | null
  activatedBy?: string | null
  createdAt: string
  content: string
}

/** A percentage with the count it is a percentage of. Null pct when nothing is in the denominator. */
export interface Rate { pct: number | null; of: number; n: number }

/** The one date range the whole platform panel respects. */
export type PanelRange = '7d' | '30d' | '90d' | 'all'
export const PANEL_RANGES: { id: PanelRange; label: string }[] = [
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
  { id: 'all', label: 'Since the beginning' },
]

export interface PlatformDashboardData {
  range: PanelRange
  since: string | null
  orgs: {
    total: number
    withActiveCareFee: number
    createdLast30Days: number
  }
  grounds: {
    total: number
    byStatus: Record<string, number>
    byStatusOf: number
    openedLast7Days: number
    resolvedLast30Days: number
  }
  checkIns: {
    totalCompleted: number
    completedLast7Days: number
    completedLast30Days: number
    session2RateOfThoseDue: Rate
  }
  promptPerformance: {
    id: string
    key: string
    version: number
    isActive: boolean
    activatedAt: string | null
    createdAt: string
    groundsUsingIt: number
    outcomesResolved: number
    fairnessRate: number | null
    feedbackResponses: number
  }[]
  recentActivity: {
    type: 'checkin_completed' | 'ground_created' | 'ground_resolved'
    at: string
    orgSlug: string
    groundLabel: string
    detail?: string
  }[]
}

export interface UsageFunnelData {
  range: PanelRange
  since: string | null
  funnelBySession: { session: number; completed: number; dropOffRate: number | null; of: number | null }[]
  /** avgMinutes is already rounded for its sample size on the server; n is that size. */
  avgSessionMinutes: { session: number; avgMinutes: number | null; n: number }[]
  byScenario: { scenario: string; count: number; pct: number; of: number }[]
  byMoment: { moment: string; count: number }[]
  byStatus: { status: string; count: number; pct: number; of: number }[]
  bothEngaged: number
  oneEngaged: number
  stalledCheckIns: number
  session5Count: number
  avgDaysToFirstCheckin: { value: number | null; n: number }
  /**
   * THE ACTIVATION FUNNEL (docs/answers-from-engine.md, 8 October, "the engagement work", point 1;
   * decision 109). Counts only, never a person or a word anybody said, over customers' check-ins
   * and never our own organisations. `null` when it could not be read - draw nothing, the rest of
   * the tab is unaffected.
   */
  activation: ActivationFunnel | null
}

/** One ordered stage's count, in `activation.reached`. */
export type ActivationStage = 'created' | 'peopleAdded' | 'firstResponse' | 'enoughToReport' | 'firstInsight' | 'leadActed' | 'secondRound'
/** Where a check-in stands now, each check-in counted in one bucket only, in `activation.now`. */
export type ActivationNowBucket = 'test' | 'abandonedBeforeValue' | 'abandonedAfterValue' | 'active'
/** What became of mail Groundwork decided to send, in `activation.emails`. */
export type ActivationEmailOutcome = 'delivered' | 'failed' | 'held' | 'notSentOnPurpose'

export interface ActivationFunnel {
  reached: Record<ActivationStage, number>
  now: Record<ActivationNowBucket, number>
  /** Leads with a second check-in - repeat use. */
  leadsWhoCameBack: number
  emails: Record<ActivationEmailOutcome, number>
  /**
   * THE BACK OFFICE FUNNEL: PEOPLE, NOT ONLY CHECK-INS (docs/answers-from-engine.md, 8 October,
   * point 2). Counts only - no name and no address is served. `undefined` on a server that has not
   * shipped it yet; this whole part of the tab draws nothing then.
   */
  participants?: ParticipantActivation
}

/** One ordered step's count, how far people got, in `participants.reached`. */
export type ParticipantReachedStep = 'added' | 'invited' | 'reached' | 'verified' | 'engaged' | 'inAHabit'
/** Where the people who stopped are standing now, each counted in one bucket only, never overlapping. */
export type ParticipantStuckBucket = 'notInvited' | 'invitedNotVerified' | 'verifiedNeverStarted' | 'startedNotFinished' | 'answeredOnceNotReturned' | 'wentQuiet'

export interface ParticipantActivation {
  reached: Record<ParticipantReachedStep, number>
  stuck: Record<ParticipantStuckBucket, number>
}

export interface OrgListItem {
  id: string
  name: string
  slug: string
  email: string
  billingActive: boolean
  careFeeStatus: string
  /** One of ours. Listed, so it can be found; counted nowhere. */
  isInternal: boolean
  /** Release 1's sales board, switched on for this organisation by staff. Off for every organisation until then. */
  release1SalesBoardOn?: boolean
  /** Release 1B's new check-in tabs, switched on for this organisation by staff. Off for every organisation until then. */
  release1bTabsOn?: boolean
  /** Release 2 (collect what's owed, and the switchboard's Release 2 rows), switched on for this organisation by staff. Off for every organisation until then. */
  release2CollectionsOn?: boolean
  groundCount: number
  userCount: number
  lastActivity: string | null
  createdAt: string
}

/** Three totals for three objects: sessions (CheckIn), check-ins (Ground), reports. Never one word for two. */
export interface UsageStatsData {
  range: PanelRange
  since: string | null
  sessionsLast14Days: { date: string; count: number }[]
  sessionsCompleted: number
  checkInsCreated: number
  reportsReleased: number
  eventTotals: Record<string, number>
}

export interface FeedbackSummaryData {
  total: number
  fairRate: number | null
  recent: { id: string; feltFair: boolean; note: string | null; groundLabel: string; orgSlug: string; createdAt: string }[]
}

export const promptsApi = {
  list: () => apiClient.get<PromptVersion[]>('/prompts').then((r) => (Array.isArray(r.data) ? r.data : [])),
  byKey: (key: string) => apiClient.get<PromptVersion[]>(`/prompts/by-key/${encodeURIComponent(key)}`).then((r) => (Array.isArray(r.data) ? r.data : [])),
  create: (key: string, content: string, summary?: string) =>
    apiClient.post<PromptVersion>('/prompts', { key, content, summary }).then((r) => r.data),
  activate: (id: string) => apiClient.post<PromptVersion>(`/prompts/${id}/activate`).then((r) => r.data),
  platformDashboard: (range: PanelRange = 'all') =>
    apiClient.get<PlatformDashboardData>('/prompts/platform-dashboard', { params: { range } }).then((r) => r.data),
  platformFunnel: (range: PanelRange = 'all') =>
    apiClient.get<UsageFunnelData>('/prompts/platform-funnel', { params: { range } }).then((r) => r.data),
  orgList: () =>
    apiClient.get<OrgListItem[]>('/prompts/org-list').then((r) => (Array.isArray(r.data) ? r.data : [])),

  /**
   * WHO IS REGISTERED IN ONE ORGANISATION. The account list, never their work.
   *
   * The console could say an org had eleven people and not say who any of them were, so support
   * could not answer "did the invitation reach Musa". Names, addresses and phone numbers; no
   * check-in, no record entry, no report.
   */
  peopleIn: (organizationId: string) =>
    apiClient
      .get<{
        org: { id: string; name: string; slug: string }
        people: {
          id: string
          name: string | null
          email: string
          phoneNumber: string | null
          role: string
          isPlatformAdmin: boolean
          isEmailVerified: boolean
          joinedAt: string
        }[]
      }>(`/prompts/org-list/${organizationId}/people`)
      .then((r) => r.data),
  usageStats: (range: PanelRange = 'all') =>
    apiClient.get<UsageStatsData>('/prompts/usage-stats', { params: { range } }).then((r) => r.data),
  feedbackSummary: () =>
    apiClient.get<FeedbackSummaryData>('/prompts/feedback-summary').then((r) => r.data),

  testChat: (systemPrompt: string, messages: { role: 'user' | 'assistant'; content: string }[]) =>
    apiClient.post<{ reply: string }>('/prompts/test-chat', { systemPrompt, messages }).then((r) => r.data),

  testReport: (systemPrompt: string, adminMessages: { role: 'user' | 'assistant'; content: string }[], p1Messages: { role: 'user' | 'assistant'; content: string }[], p2Messages: { role: 'user' | 'assistant'; content: string }[]) =>
    apiClient.post<{ crossReference: string; p1Report: string; p2Report: string }>('/prompts/test-report', { systemPrompt, adminMessages, p1Messages, p2Messages }).then((r) => r.data),

  upsertDraft: (key: string, content: string, summary?: string) =>
    apiClient.post<PromptVersion>('/prompts/draft', { key, content, summary }).then((r) => r.data),

  discardDraft: (key: string) =>
    apiClient.delete<{ ok: boolean }>(`/prompts/draft/${encodeURIComponent(key)}`).then((r) => r.data),

  getDraft: (key: string) =>
    apiClient.get<PromptVersion | null>(`/prompts/draft/${encodeURIComponent(key)}`).then((r) => r.data),
}

/** One detection code's hit rate, as rated by the admins who saw it. */
export interface CodeAccuracy {
  code: string
  /** How many times this code has been surfaced to a lead. */
  surfaced: number
  /** How many of those were rated accurate or not. */
  rated: number
  /** Share of rated detections marked accurate. Null when none rated yet. */
  accuracyRate: number | null
}

/**
 * IS THE DETECTION ANY GOOD?
 *
 * Every pattern code the engine can fire, with how often it fired and how often
 * a human said it was right. This is the feedback loop for the prompt library:
 * a code surfacing often and rating badly is a prompt to fix, and until now
 * there was no way to see that - the endpoint existed and nothing called it, so
 * the ratings admins were already giving went nowhere anyone could read.
 *
 * Platform admin only, and it must stay that way: the summary aggregates
 * detections across every org, so it is internal engineering data and never a
 * customer-facing number.
 */
export const patternAccuracyApi = {
  summary: () => apiClient.get<CodeAccuracy[]>('/patterns/accuracy').then(r => (Array.isArray(r.data) ? r.data : [])),
}
