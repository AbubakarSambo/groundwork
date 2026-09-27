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
}

export type TextBlock = { type: 'text'; body: string }
export type ProposalBlock = { type: 'proposal'; proposalId: string; summary: string }
export type PickerBlock = { type: 'picker'; options: { key: string; label: string }[] }
export type NextStepBlock = { type: 'next_step'; label: string; href: string; kind: string; id?: string }
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
