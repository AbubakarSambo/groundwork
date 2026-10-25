import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/* Polish round 1 (25 October): Wanjiru says Muchemi & Co calls its bills fee notes, in Settings. */
vi.mock('@/api/client', () => ({ apiClient: { get: vi.fn(), patch: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
import { apiClient } from '@/api/client'
import { TheWordForABill } from './TheWordForABill'
import { FieldRows } from '@/components/gw/ui'

describe('what your organisation calls a bill', () => {
  it('reads the word, and an admin changes it to "fee note"', async () => {
    ;(apiClient.get as any).mockResolvedValue({ data: { word: 'invoice', setHere: false, says: 'Nobody has said what your organisation calls a bill, so Groundwork says invoice.' } })
    ;(apiClient.patch as any).mockResolvedValue({ data: { word: 'fee note', setHere: true, says: 'Your organisation calls a bill a fee note.' } })
    render(<QueryClientProvider client={new QueryClient()}><FieldRows><TheWordForABill /></FieldRows></QueryClientProvider>)
    expect(await screen.findByText('Invoice')).toBeTruthy()
    fireEvent.click(screen.getByText('Change'))
    fireEvent.change(screen.getByLabelText('What you call a bill'), { target: { value: 'fee note' } })
    fireEvent.click(screen.getByText('Save'))
    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith('/users/organization/word-for-the-bill', { word: 'fee note' }))
    expect(await screen.findByText('Fee note')).toBeTruthy()
  })
})
