import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ContextChat } from './ContextChat'
import { groundsApi } from '@/api/grounds'

vi.mock('@/api/documents', () => ({ documentsApi: { list: vi.fn(), upload: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { contextChat: vi.fn(), confirmContext: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() } }))

/*
 * A red "That did not go through. Try again." showed on the Context tab after the lead's yes, although
 * the target had been saved. The yes succeeded; the page then asked the chat once more for the next
 * question, and that second request failed. The lead read a success as a failure.
 */
describe('the lead says yes and the target is saved', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); vi.clearAllMocks() })

  it('is not told it failed when only the follow-up question failed', async () => {
    const chat = groundsApi.contextChat as any
    chat
      .mockResolvedValueOnce({ reply: 'What should Amani reach?', gaps: [], done: false, proposal: null })
      .mockResolvedValueOnce({ reply: 'I will set Amani to 4.5 million. Yes?', gaps: [], done: false, proposal: { gap: 'target', say: 'Set Amani to 4.5 million' } })
      .mockRejectedValueOnce(new Error('timeout'))
    ;(groundsApi.confirmContext as any).mockResolvedValue({ say: 'I will set Amani to 4.5 million.' })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={qc}><ContextChat groundId="g1" /></QueryClientProvider>)
    await screen.findByText('What should Amani reach?')
    fireEvent.change(document.querySelector('[data-gw-context-chat-input]') as HTMLInputElement, { target: { value: 'Amani 4.5 million' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Yes, set it' }))
    await waitFor(() => expect(chat).toHaveBeenCalledTimes(3))
    await waitFor(() => expect(toast.success).toHaveBeenCalled())
    await new Promise((r) => setTimeout(r, 50))
    expect(toast.error).not.toHaveBeenCalled()
  })
})
