import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TheReasonYouMissed } from './TheReasonYouMissed'
import { todayApi } from '@/api/today'

vi.mock('@/api/today', () => ({ todayApi: { giveMissedReason: vi.fn() } }))

/** A reason that could not be saved is said, and what the person wrote stays in the box. */
describe('the reason you missed, when it could not be saved', () => {
  it('says so, and keeps the words', async () => {
    ;(todayApi.giveMissedReason as any).mockRejectedValue(new Error('down'))
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}><TheReasonYouMissed checkInId="ci1" given={null} /></QueryClientProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Tell us why' }))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'I was in court all week.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send your reason' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Your reason was not saved. Please try again.'))
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('I was in court all week.')
  })
})
