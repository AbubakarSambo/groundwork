import { apiClient } from './client'
import type { GroundStatus } from '@/types'

export interface AlignmentFeedItem {
  groundId: string
  label: string
  status: GroundStatus
  currentPeriod: number
  completeness: {
    checkedInCount: number
    totalCount: number
    checkedIn: string[]
    awaiting: string[]
  }
  stalled: boolean
  patternSignals: { observation: string; lastSeenAt: string }[]
}

export interface AlignmentNarrative {
  summary: string
  activeGrounds: number
  surfacedPatterns: number
}

export const alignmentApi = {
  feed: () => apiClient.get<AlignmentFeedItem[]>('/alignment-feed').then((r) => r.data),
  narrative: () => apiClient.get<AlignmentNarrative>('/alignment/narrative').then((r) => r.data),
}
