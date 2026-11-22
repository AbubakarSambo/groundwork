import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UntilTheNextOne } from './UntilTheNextOne'
import { groundsApi } from '@/api/grounds'

vi.mock('@/api/grounds', () => ({ groundsApi: { addMyNote: vi.fn(), checkInYourself: vi.fn(), myNotes: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

/**
 * THE BOX UNDER A FINISHED CHECK-IN, FOR EACH READER (audit of the check-in pages, 15 November 2026, row 9).
 * One placeholder for everyone. Typing only ever adds a note; a lead who wants to check in again uses the plain link, so a check-in
 * never opens as a side effect of typing.
 */
function draw(lead: boolean) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}><MemoryRouter><UntilTheNextOne groundId="g1" myCheckIns={[]} theLeadChecksInWhenSheChooses={lead} /></MemoryRouter></QueryClientProvider>,
  )
}

describe('the box under a finished check-in', () => {
  beforeEach(() => { vi.clearAllMocks(); (groundsApi.myNotes as any).mockResolvedValue([]); (groundsApi.addMyNote as any).mockResolvedValue({}); (groundsApi.checkInYourself as any).mockResolvedValue({ checkInId: 'c2' }) })

  it('says the same thing to a participant and to the lead', () => {
    draw(false)
    expect(screen.getByRole('textbox', { name: 'Write anything you want me to remember' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Check in again' })).toBeNull()
  })

  it('gives the lead the same box, and a plain link to check in again', () => {
    draw(true)
    expect(screen.getByRole('textbox', { name: 'Write anything you want me to remember' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Check in again' })).toBeTruthy()
  })

  it('typing as the lead adds a note and does not open a check-in', async () => {
    draw(true)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Ask Mercy about the school visit' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await waitFor(() => expect(groundsApi.addMyNote).toHaveBeenCalledWith('g1', 'Ask Mercy about the school visit'))
    expect(groundsApi.checkInYourself).not.toHaveBeenCalled()
  })

  it('the link opens a check-in', async () => {
    draw(true)
    fireEvent.click(screen.getByRole('button', { name: 'Check in again' }))
    await waitFor(() => expect(groundsApi.checkInYourself).toHaveBeenCalledWith('g1'))
  })

  /* Release test, 21 November 2026, bug 13: two messages Wairimu typed here read as dropped. What she wrote stays on screen. */
  it('what the lead typed is on screen afterwards, with when it will be asked about', async () => {
    (groundsApi.myNotes as any).mockResolvedValue([
      { id: 'n1', text: 'Baraka offered a second Kilimani run from 1 December', createdAt: '', carriedIntoCheckInId: null },
      { id: 'n2', text: 'An old note already asked about', createdAt: '', carriedIntoCheckInId: 'c1' },
    ])
    draw(true)
    expect(await screen.findByText('I kept what you wrote here, and I will ask you about it when you check in again.')).toBeTruthy()
    expect(screen.getByText('“Baraka offered a second Kilimani run from 1 December”')).toBeTruthy()
    expect(screen.queryByText(/An old note already asked about/)).toBeNull()
  })

  it('a participant reads that the next check-in will ask about it', async () => {
    (groundsApi.myNotes as any).mockResolvedValue([{ id: 'n1', text: 'Kilimani signs Monday', createdAt: '', carriedIntoCheckInId: null }])
    draw(false)
    expect(await screen.findByText('I kept what you wrote here, and your next check-in will ask you about it.')).toBeTruthy()
  })
})
