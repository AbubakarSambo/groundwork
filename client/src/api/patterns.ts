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
}

export const patternsApi = {
  /** The person a pattern is about says what is behind it, in their own words. */
  answer: (id: string, text: string) =>
    apiClient.post<ServedPattern>(`/patterns/${id}/answer`, { text }).then(r => r.data),
}
