import { apiClient } from './client'

/**
 * RECOMMENDED CHECK-INS, FOR A CHECK-IN STARTED FROM THE ANCHOR (anchor piece 25; piece 24 on the
 * engine). docs/answers-from-engine.md, "5 October: anchor piece 24, recommended check-ins".
 *
 * Groundwork looks at one check-in's own record and, where the work itself shows it, offers the
 * lead one more check-in. The lead alone reads and answers these - behind the anchor switch, and
 * only for a check-in started from the anchor link. With the switch off, or for anybody who is not
 * the lead, the list is always empty.
 */
export interface AnOfferTheLeadReads {
  id: string
  kind: 'anchor_pair_check_in' | 'anchor_project_check_in' | 'anchor_aim_check_in'
  says: string
  question: string
  yes: string
  no: string
}

/**
 * What a new check-in would start from, once the lead says yes. Nothing is created and nobody is
 * invited by the yes itself - the lead finishes that on the set-up screen.
 */
export interface WhatToSetUp {
  kind: AnOfferTheLeadReads['kind']
  about: string
  aim: string | null
  people: { name: string | null; email: string }[]
}

export const recommendedCheckInsApi = {
  list: (groundId: string): Promise<{ offers: AnOfferTheLeadReads[] }> =>
    apiClient.get(`/grounds/${groundId}/recommended-check-ins`).then(r => r.data),

  yes: (groundId: string, offerId: string): Promise<{ state: 'ACCEPTED'; setUp: WhatToSetUp }> =>
    apiClient.post(`/grounds/${groundId}/recommended-check-ins/${offerId}/yes`, {}).then(r => r.data),

  notNow: (groundId: string, offerId: string): Promise<{ state: 'DECLINED' }> =>
    apiClient.post(`/grounds/${groundId}/recommended-check-ins/${offerId}/not-now`, {}).then(r => r.data),

  /**
   * PIECE 25, "YES, SET IT UP" (docs/answers-from-engine.md, "Request 148 (1)"). Sends back exactly
   * the `setUp` the "Yes, set it up" answer handed over. Creates nothing and invites nobody: it
   * answers the draft the set-up screen opens with. `contributors` are checked against the lead's
   * own organisation server-side, so a person left out carries `why` - shown to the lead as it is,
   * never invented or summarised here.
   */
  draftFromSetUp: (setUp: WhatToSetUp): Promise<WhatTheSetUpScreenOpensWith> =>
    apiClient.post('/entry/draft-from-set-up', { setUp }).then(r => r.data),
}

export interface WhatTheSetUpScreenOpensWith {
  initial: string
  aim: string | null
  contributors: { email: string; displayName?: string }[]
  leftOut: { email: string; why: string }[]
}
