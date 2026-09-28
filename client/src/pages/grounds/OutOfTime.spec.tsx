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
    expect(screen.getByText('Out of time')).toBeTruthy()
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

/*
 * NOTHING BEHIND THE COVER CAN TAKE FOCUS (Hafsah's re-review). The cover hid the app frame but did
 * not stop Tab reaching it - eight invisible sidebar links were still in the tab order. This proves
 * the mechanism directly: everything already a child of <body> other than this component's own
 * portal container is marked inert while it is mounted, and freed the moment it is not.
 */
describe('the app frame behind the cover', () => {
  it('is made inert while the cover is up, and restored once it is gone', async () => {
    const sidebarLink = document.createElement('a')
    sidebarLink.href = '/today'
    sidebarLink.textContent = 'Today'
    document.body.appendChild(sidebarLink)

    ;(groundsApi.moreTime as any).mockResolvedValue(STANDING)
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const view = render(
      <QueryClientProvider client={qc}>
        <MemoryRouter><OutOfTime groundId="g1" onOpenMyWork={vi.fn()} /></MemoryRouter>
      </QueryClientProvider>,
    )
    await screen.findByRole('heading', { name: 'This check-in reached its end date' })

    expect(sidebarLink.hasAttribute('inert')).toBe(true)

    view.unmount()
    expect(sidebarLink.hasAttribute('inert')).toBe(false)

    document.body.removeChild(sidebarLink)
  })
})
