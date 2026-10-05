import { apiClient } from './client'

/**
 * ASK GROUNDWORK (D1, U.14). Your questions and the answers are yours alone: the server serves them
 * to the person who asked and refuses anybody else. The answers are the assistant's own words, as
 * typed blocks; the screen draws them and adds nothing to what they say.
 */
export interface AskTurn { from: 'you' | 'groundwork'; says: string; at: string }

export interface AskPage {
  canAsk: boolean
  /** Why it cannot answer you yet, in the server's words, when `canAsk` is false. */
  why?: string
  /** The check-ins your questions may be about: ones you run or take part in. */
  about: { id: string; label: string }[]
  /** Your own earlier questions and answers, oldest first. */
  turns: AskTurn[]
  /**
   * ASK IS NAMED FOR THE ORGANISATION (decision 100, 5 October). The whole string, printed as it
   * arrives ("Ask Baridi"), never "Ask Groundwork" plus a name stitched on. "Ask Groundwork" only
   * where there is no organisation yet (docs/answers-from-engine.md, "Request 153: the name").
   */
  askName: string
  /** The caption under the name, and the composer's own placeholder: served, fixed. */
  caption: string
  /** The one line under the caption, about adding context or documents to a check-in. */
  addLine: string
  /**
   * What Ask says the first time somebody opens it - served once; `null` once they have asked
   * their first question (docs/answers-from-engine.md, "Request 153, part two").
   */
  welcome: string | null
  /**
   * The starter questions under the opening line, general rather than one set per situation
   * (decision 101). Six when there is a check-in to ask about; two - "What are the company's
   * priorities right now?" and "Ask for leave, or to spend money." - when there is none.
   */
  starters: string[]
}

export type TextBlock = { type: 'text'; body: string }
export type ProposalBlock = { type: 'proposal'; proposalId: string; summary: string }
export type PickerBlock = { type: 'picker'; options: { key: string; label: string }[] }
/**
 * `kind: 'upload_a_document'` is not a page to open: it is the file picker, on the check-in named by
 * `id`, with `context.groundId` for the "I've uploaded it." message that follows (decision 50).
 */
export type NextStepBlock = { type: 'next_step'; label: string; href: string; kind: string; id?: string; context?: Record<string, string> }
/** A claim and how it is known (proven, confirmed, someone's word, memory). Not served yet: request 16. */
export type ClaimBlock = { type: 'claim'; says: string; mark: string }
/** Any block, as it arrives. The screen checks the shape before drawing it. */
export type AskBlock = { type: string } & Record<string, unknown>

export interface AskReply { blocks: AskBlock[]; composedBy: 'model' | 'rules'; lane: string }

export const askApi = {
  mine: (): Promise<AskPage> => apiClient.get<AskPage>('/ask').then(r => r.data),
  ask: (message: string, groundId?: string): Promise<AskReply> =>
    apiClient.post<AskReply>('/ask', { message, ...(groundId ? { groundId } : {}) }).then(r => r.data),
  /** Yes or no to the one request Ask Groundwork said back. Nothing is done without a yes. */
  answer: (proposalId: string, answer: 'yes' | 'no'): Promise<AskReply> =>
    apiClient.post<AskReply>('/ask/answer', { proposalId, answer }).then(r => r.data),
}
