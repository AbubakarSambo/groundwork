import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OutcomeFeedback } from './OutcomeFeedback'

vi.mock('@/api/feedback', () => ({ outcomeFeedbackApi: { mine: vi.fn().mockResolvedValue({ feltFair: true, note: null }), submit: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

/** WHAT THE PERSON READS ON THE FEEDBACK PANEL OF AN ENDED CHECK-IN (audit of the check-in pages, 15 November 2026, row 25). */
describe('the fairness question on an ended check-in', () => {
  it('asks "Did this feel fair?" with the two answers and an optional note, and nothing about process, grounding, closing or who sees it', async () => {
    render(<QueryClientProvider client={new QueryClient()}><OutcomeFeedback groundId="g1" /></QueryClientProvider>)
    expect(screen.getByText('Did this feel fair?')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'It felt fair' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'It did not' })).toBeTruthy()
    expect(screen.getByPlaceholderText('Anything to add?')).toBeTruthy()
    expect(await screen.findByText(/You said this felt fair\./)).toBeTruthy()
    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/process|grounded|has closed|not shown to the other parties/i)
  })
})
