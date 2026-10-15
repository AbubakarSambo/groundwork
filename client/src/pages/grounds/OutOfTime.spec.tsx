import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { readFileSync } from 'fs'
import { join } from 'path'
import { OutOfTime, theirAnswersAreKept } from './OutOfTime'
import { groundsApi } from '@/api/grounds'

/**
 * "THIS CHECK-IN REACHED ITS END DATE" (A3, #/join/outoftime), AS A PERSON TAKING PART READS IT.
 */
vi.mock('@/api/grounds', () => ({ groundsApi: { moreTime: vi.fn(), askForMoreTime: vi.fn() } }))

const STANDING = { outOfTime: true, checkInName: 'Sales team, Q3', leadFirstName: 'Wairimu', ranUntil: '2026-09-30T00:00:00.000Z', askedAt: null, checkInsCount: 38 }

function open(onOpenMyWork = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={qc}><MemoryRouter><OutOfTime groundId="g1" onOpenMyWork={onOpenMyWork} /></MemoryRouter></QueryClientProvider>)
  return onOpenMyWork
}

beforeEach(() => { vi.clearAllMocks() })

describe('out of time', () => {
  /* B-233: this used to read "All 38 of your check-ins and your history stay as they are," the
     server's own count of check-ins (Grounds) this person has ever been part of - but this screen
     is for ONE check-in that ran out of time, and that sentence reads as if every one of the
     person's check-ins had run out, which is not true for someone like Dov with several others
     still running. Updated to say only what is true for this one check-in - see
     theirAnswersAreKept below. */
  it('reads as the prototype\'s card', async () => {
    ;(groundsApi.moreTime as any).mockResolvedValue(STANDING)
    open()
    expect(await screen.findByText('It ran until 30 September. Nothing new can be added until Wairimu gives it more time.')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'This check-in reached its end date' })).toBeTruthy()
    expect(screen.getByText('Out of time')).toBeTruthy()
    expect(screen.getByText('Your answers are kept')).toBeTruthy()
    expect(screen.getByText('What you have said in this check-in stays as it is.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Ask Wairimu for more time' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Open my work' })).toBeTruthy()
    expect(screen.getByText('Wairimu gets your request with one button to extend it.')).toBeTruthy()
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

/*
 * THE FLOATING FEEDBACK BUTTON DOES NOT JUST STOP WORKING, IT GOES AWAY (Hafsah's last check).
 * `inert` alone left it visible, sitting on top of the cover (its zIndex is 100, the cover's is
 * 40) and doing nothing when pressed - worse than gone, since it looked like a live control. The
 * prototype's bare page has none, so `<body>` carries `.gwui-cover-open` for exactly as long as
 * the cover is mounted, and gw-ui.css hides `.gw-feedback-btn` (the button's own class, AppShell.tsx)
 * while that is on.
 */
describe('the floating feedback button', () => {
  it('body carries .gwui-cover-open only while the cover is mounted', async () => {
    ;(groundsApi.moreTime as any).mockResolvedValue(STANDING)
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    expect(document.body.classList.contains('gwui-cover-open')).toBe(false)

    const view = render(
      <QueryClientProvider client={qc}>
        <MemoryRouter><OutOfTime groundId="g1" onOpenMyWork={vi.fn()} /></MemoryRouter>
      </QueryClientProvider>,
    )
    await screen.findByRole('heading', { name: 'This check-in reached its end date' })
    expect(document.body.classList.contains('gwui-cover-open')).toBe(true)

    view.unmount()
    expect(document.body.classList.contains('gwui-cover-open')).toBe(false)
  })

  it('gw-ui.css hides the feedback button while the cover is open', () => {
    const css = readFileSync(join(__dirname, '..', '..', 'components', 'gw', 'ui', 'gw-ui.css'), 'utf8')
    expect(css).toMatch(/body\.gwui-cover-open \.gw-feedback-btn \{[^}]*display: none/)
  })
})

describe('B-233: says only what is true for this one check-in, not every check-in the person has', () => {
  it('always reads the same, true, sentence', () => {
    expect(theirAnswersAreKept()).toBe('What you have said in this check-in stays as it is.')
  })
})
