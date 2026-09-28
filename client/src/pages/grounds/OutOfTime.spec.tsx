import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OutOfTime } from './OutOfTime'
import { groundsApi } from '@/api/grounds'

/**
 * "THIS CHECK-IN REACHED ITS END DATE" (A3, #/join/outoftime), AS A PERSON TAKING PART READS IT.
 */
vi.mock('@/api/grounds', () => ({ groundsApi: { moreTime: vi.fn(), askForMoreTime: vi.fn() } }))

const STANDING = { outOfTime: true, checkInName: 'Sales team, Q3', leadFirstName: 'Wairimu', ranUntil: '2026-09-30T00:00:00.000Z', askedAt: null }

function open(onOpenMyWork = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={qc}><MemoryRouter><OutOfTime groundId="g1" onOpenMyWork={onOpenMyWork} /></MemoryRouter></QueryClientProvider>)
  return onOpenMyWork
}

beforeEach(() => { vi.clearAllMocks() })

describe('out of time', () => {
  it('reads as the prototype\'s card, without the session count', async () => {
    ;(groundsApi.moreTime as any).mockResolvedValue(STANDING)
    open()
    expect(await screen.findByText('It ran until 30 September. Nothing new can be added until Wairimu gives it more time.')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'This check-in reached its end date' })).toBeTruthy()
    /* U.20: the page now has two "Out of time" lines, both from the prototype's own picture -
       the small caption above the mark (join-outoftime.jpg puts it there, same as every other
       narrow arrival screen) and the amber tag - so this looks for both rather than one. */
    expect(screen.getAllByText('Out of time')).toHaveLength(2)
    expect(screen.getByText('Your answers are kept')).toBeTruthy()
    expect(screen.getByText('Your answers and your history stay as they are.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Ask Wairimu for more time' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Open my work' })).toBeTruthy()
    expect(screen.getByText('Wairimu gets your request with one button to extend it.')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/\d+ of your check-ins/)
  })

  it('asking sends once and says the lead has it', async () => {
    ;(groundsApi.moreTime as any).mockResolvedValue(STANDING)
    ;(groundsApi.askForMoreTime as any).mockResolvedValue({ asked: true, askedAt: new Date().toISOString() })
    open()
    fireEvent.click(await screen.findByRole('button', { name: 'Ask Wairimu for more time' }))
    await waitFor(() => expect(groundsApi.askForMoreTime).toHaveBeenCalledWith('g1'))
    expect(await screen.findByText('Wairimu has your request.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Ask Wairimu for more time' })).toBeDisabled()
  })

  it('already asked today: says so and does not offer it again', async () => {
    ;(groundsApi.moreTime as any).mockResolvedValue({ ...STANDING, askedAt: new Date().toISOString() })
    open()
    expect(await screen.findByText('Wairimu has your request.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Ask Wairimu for more time' })).toBeDisabled()
  })

  it('"Open my work" goes on to their own work', async () => {
    ;(groundsApi.moreTime as any).mockResolvedValue(STANDING)
    const onOpen = open()
    fireEvent.click(await screen.findByRole('button', { name: 'Open my work' }))
    expect(onOpen).toHaveBeenCalled()
  })
})
