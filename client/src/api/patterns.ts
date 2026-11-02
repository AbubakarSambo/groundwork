import { apiClient } from './client'

/**
 * A PATTERN, IN THE SHAPE THE SERVER SERVES IT (api/src/modules/patterns/who-reads-a-pattern.ts,
 * `AServedPattern`). Every place that shows a pattern - the board's section, "Your work", and the
 * You board - reads this same shape. There is no `label`, `code`, `text`, `periods` or `type`: a
 * pattern is a sentence about the work, with the person it is about carried as an id for the page
 * to place, never a string joined to a name.
 */
export interface ServedPattern {
  id: string
  /** Whose work it is about. Never joined to a name here; the page resolves who that is. */
  participantId: string
  /** True when the reader is the person it is about. */
  yours: boolean
  /** Good news, somebody carrying something, or worth the lead's attention. */
  kind: 'good' | 'carrying' | 'attention'
  /** The plain name: what the record shows happening. */
  heading: string
  /** The engine's own sentence about the work, when it holds no internal name or code. */
  whatHappened: string | null
  /** How often, as a sentence. */
  howOften: string
  /** For whoever runs the check-in: the question to put to the person. Null for the person themselves. */
  askThem: string | null
  /** What the person said is behind it, in their own words. */
  theirWords: string | null
  /** Only the person it is about can answer it. */
  canAnswer: boolean
  /** Who else reads it, and when, as a sentence for this reader. */
  whoSeesIt: string
  /**
   * WHICH PART OF "WHAT KEEPS COMING UP" IT BELONGS IN (request 82, decision 67): `'the work'` for
   * "About each person's work", `'what is said against what happened'` for "How what people say
   * can run ahead of what happened". The same for every reader.
   */
  about?: 'the work' | 'what is said against what happened'
  /** The sessions it came up in, in order (request 70, "Pattern history"). */
  sessions?: number[]
  /** After talking it through: the lead's own mark. Always null for the person it is about, and for a colleague. */
  leadMark?: 'RIGHT' | 'WRONG' | 'NOT_SURE' | null
  /** Whether whoever runs the check-in has said they talked this through with the person. */
  talkedAbout?: boolean
}

export const patternsApi = {
  /** The person a pattern is about says what is behind it, in their own words. */
  answer: (id: string, text: string) =>
    apiClient.post<ServedPattern>(`/patterns/${id}/answer`, { text }).then(r => r.data),
  /**
   * WHOEVER RUNS THE CHECK-IN marks what they made of a pattern, after talking it through (decision
   * 57, item 2). 403 for anybody else, including the person it is about.
   */
  mark: (id: string, mark: 'RIGHT' | 'WRONG' | 'NOT_SURE') =>
    apiClient.post<ServedPattern>(`/patterns/${id}/mark`, { mark }).then(r => r.data),
  /**
   * WHOEVER RUNS THE CHECK-IN says they talked a pattern through with the person (decision 57, item
   * 3). A second press is a no-op on the server, not an error.
   */
  talkedAbout: (id: string) =>
    apiClient.post<ServedPattern>(`/patterns/${id}/talked-about`, {}).then(r => r.data),
}
