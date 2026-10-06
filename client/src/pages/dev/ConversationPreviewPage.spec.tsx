import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ConversationPreviewPage from './ConversationPreviewPage'
import { conversationApi, streamMessage } from '@/api/conversation'
import { groundsApi } from '@/api/grounds'
import { documentsApi } from '@/api/documents'

/**
 * THE PREVIEW PAGE MAKES NO NETWORK CALL AT ALL.
 *
 * `/dev/conversation` exists so the live conversation's look can be held up against the
 * prototype's B3 screens without a real check-in session - every word on it is a constant in
 * ConversationPreviewPage.tsx. This proves that by making every way the real ChatPage.tsx would
 * reach the network throw if touched (fetch itself, and the three API modules ChatPage.tsx
 * calls), then rendering the preview page and checking nothing fired.
 */

function throwIfCalled(name: string) {
  return vi.fn(() => { throw new Error(`${name} should never be called by the preview page`) })
}

vi.mock('@/api/conversation', () => ({
  conversationApi: {
    transcript: throwIfCalled('conversationApi.transcript'),
    open: throwIfCalled('conversationApi.open'),
    complete: throwIfCalled('conversationApi.complete'),
    decline: throwIfCalled('conversationApi.decline'),
    send: throwIfCalled('conversationApi.send'),
    documentReceived: throwIfCalled('conversationApi.documentReceived'),
  },
  streamMessage: throwIfCalled('streamMessage'),
}))
vi.mock('@/api/grounds', () => ({
  groundsApi: {
    get: throwIfCalled('groundsApi.get'),
    getMyCheckinStatus: throwIfCalled('groundsApi.getMyCheckinStatus'),
  },
}))
vi.mock('@/api/documents', () => ({
  documentsApi: { upload: throwIfCalled('documentsApi.upload'), correctAssessment: throwIfCalled('documentsApi.correctAssessment') },
}))

describe('the conversation preview page calls nothing', () => {
  let originalFetch: typeof fetch

  beforeEach(() => {
    originalFetch = global.fetch
    global.fetch = vi.fn(() => { throw new Error('fetch should never be called by the preview page') }) as unknown as typeof fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.clearAllMocks()
  })

  it('renders all three states from fixed words, and never touches the network', () => {
    render(<MemoryRouter><ConversationPreviewPage /></MemoryRouter>)

    // The opening question and its two suggested answers, word for word. Shown three times
    // (the start state, the phone-width state of the same screen, and again as the first turn
    // of the end card's full conversation) - the question only once each as a suggestion.
    expect(screen.getAllByText(/Good news first: last week you said Lakeside/).length).toBe(3)
    expect(screen.getAllByText('Not yet').length).toBe(2)
    expect(screen.getAllByText('Sent it. They liked it but want to wait until after December.').length).toBeGreaterThan(0)

    // The end card: its three parts and both buttons.
    expect(screen.getByText('1. What is now in your record')).toBeTruthy()
    expect(screen.getByText('2. Why answering matters')).toBeTruthy()
    expect(screen.getByText('3. What happens next')).toBeTruthy()
    expect(screen.getByText('That’s right, finish')).toBeTruthy()
    expect(screen.getByText('Change something')).toBeTruthy()

    // GROUP 3 REVIEW, BATCH B: check-in-end-card.jpg keeps "Pause" in the header, so it shows
    // in all three states drawn on this page, not only the two still in conversation.
    expect(screen.getAllByText('Pause').length).toBe(3)

    // The three headings, one per state.
    expect(screen.getByText(/As it opens/)).toBeTruthy()
    expect(screen.getByText(/Part-way through, with suggested answers/)).toBeTruthy()
    expect(screen.getByText(/The end card/)).toBeTruthy()

    // Nothing reached the network.
    expect(global.fetch).not.toHaveBeenCalled()
    expect(conversationApi.transcript).not.toHaveBeenCalled()
    expect(conversationApi.open).not.toHaveBeenCalled()
    expect(conversationApi.complete).not.toHaveBeenCalled()
    expect(conversationApi.decline).not.toHaveBeenCalled()
    expect(conversationApi.send).not.toHaveBeenCalled()
    expect(streamMessage).not.toHaveBeenCalled()
    expect(groundsApi.get).not.toHaveBeenCalled()
    expect(groundsApi.getMyCheckinStatus).not.toHaveBeenCalled()
    expect(documentsApi.upload).not.toHaveBeenCalled()
  })
})
