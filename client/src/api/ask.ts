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
  /**
   * CONTEXT AND RESOURCES IN ASK: ONE FLAG THE SCREENS CAN READ (request 169, decision 65). True
   * only while the engine's switch is on and the reader may confirm setup on at least one check-in.
   * Shows "Add context with Ask <organisation name>" on a check-in's own Context and resources
   * page. Absent today, so that button stays hidden everywhere until the engine serves it.
   */
  addsContext?: boolean
  /**
   * THE OLD CONTEXT CHAT IS OPEN (8 October, answers-from-engine.md, "what the anchor's final check needs", item 6). False means the check-in
   * page's own context chat is switched off on the server (its routes answer with a sentence that sends the person to Ask), so the page must
   * not draw it. Absent from an older server, which still has it.
   */
  oldContextChatIsOpen?: boolean
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
  /**
   * `openedFrom: 'check_in_setup'` is sent only when Ask Groundwork was opened from that check-in's
   * own Context and resources page or setup (decision 65) - never on an ordinary question. `message`
   * may be empty for the very first message of that opening; Ask reads it as "start".
   */
  ask: (message: string, groundId?: string, openedFrom?: 'check_in_setup'): Promise<AskReply> =>
    apiClient
      .post<AskReply>('/ask', { message, ...(groundId ? { groundId } : {}), ...(openedFrom ? { openedFrom } : {}) })
      .then(r => r.data),
  /**
   * AN ADMIN'S DOCUMENT FOR THE WHOLE ORGANISATION (fix list, item 3). The server reads it and says back what is in it,
   * with a yes and a no; nothing is added until the yes. Refused on the server to anybody who is not an admin.
   */
  addADocumentForTheOrganisation: (file: File): Promise<AskReply> => {
    const form = new FormData()
    form.append('file', file)
    return apiClient.post<AskReply>('/ask/document', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
  },
  /** Yes or no to the one request Ask Groundwork said back. Nothing is done without a yes. */
  answer: (proposalId: string, answer: 'yes' | 'no'): Promise<AskReply> =>
    apiClient.post<AskReply>('/ask/answer', { proposalId, answer }).then(r => r.data),
}
