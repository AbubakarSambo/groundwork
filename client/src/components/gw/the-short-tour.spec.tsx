import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from './AppShell'
import { useAuthStore } from '@/stores/auth'
import { useTourStore } from '@/stores/tour'
import { TOUR_STEPS, isSomebodyNew, tourOutcome } from './the-short-tour'
import { takeItAllWithYou } from '@/lib/what-signing-out-takes-with-it'

/**
 * A1: THE SHORT TOUR, as somebody new meets it: offered once, started, stepped through, finished or
 * skipped, and remembered. It points only at real parts of the page.
 */
const KAVON = { id: 'u-kavon', email: 'kavon@coamana.test', firstName: 'Kavon', lastName: 'Badie', role: 'MEMBER', organizationName: 'Coamana', mayOpenCheckIns: true }
const ADAM = { ...KAVON, id: 'u-adam', firstName: 'Adam', lastName: 'Grunewald' }
const LIST = [{
  id: 'g1', label: 'Coamana growth, Q3 paying customers', status: 'AWAITING_PARTIES', initiatorId: 'u-lead',
  participants: [{ id: 'pk', userId: 'u-kavon' }, { id: 'pa', userId: 'u-adam' }],
  checkIns: [
    { participantId: 'pk', sessionNumber: 1, status: 'IN_PROGRESS' },
    { participantId: 'pa', sessionNumber: 1, status: 'COMPLETED' },
  ],
}]

/* jsdom lays nothing out, so it reports no boxes; say everything drawn is on the screen. */
const realRects = HTMLElement.prototype.getClientRects
beforeEach(() => {
  window.localStorage.clear()
  useTourStore.setState({ step: null })
  HTMLElement.prototype.getClientRects = function () { return [this.getBoundingClientRect()] as any }
})
afterEach(() => { HTMLElement.prototype.getClientRects = realRects })

function mount(user: any) {
  useAuthStore.setState({ user, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  qc.setQueryData(['grounds'], LIST)
  qc.setQueryData(['my-organizations'], [])
  return render(
    <QueryClientProvider client={qc}><MemoryRouter initialEntries={['/grounds']}><AppShell><div /></AppShell></MemoryRouter></QueryClientProvider>,
  )
}
const card = () => screen.getByRole('dialog', { name: /A short tour, step/ })

describe('who is somebody new', () => {
  it('somebody who has not finished a session and leads nothing', () => {
    expect(isSomebodyNew(LIST, 'u-kavon')).toBe(true)
  })
  it('not somebody who has finished one, nor somebody who leads a check-in', () => {
    expect(isSomebodyNew(LIST, 'u-adam')).toBe(false)
    expect(isSomebodyNew(LIST, 'u-lead')).toBe(false)
  })
})

describe('the offer', () => {
  it('is made to somebody new, and says what it is', () => {
    mount(KAVON)
    const offer = screen.getByRole('region', { name: 'A short tour' })
    expect(offer).toHaveTextContent('New to Groundwork? A short tour shows you where things are. It takes under a minute.')
    expect(within(offer).getByRole('button', { name: 'Start the tour' })).toBeInTheDocument()
    expect(within(offer).getByRole('button', { name: 'Not now' })).toBeInTheDocument()
  })

  it('is not made to somebody who has already finished a session', () => {
    mount(ADAM)
    expect(screen.queryByRole('region', { name: 'A short tour' })).toBeNull()
  })

  it('"Not now" is remembered, so it is not offered again', () => {
    const first = mount(KAVON)
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }))
    expect(screen.queryByRole('region', { name: 'A short tour' })).toBeNull()
    expect(tourOutcome('u-kavon')).toBe('skipped')
    first.unmount()
    mount(KAVON)
    expect(screen.queryByRole('region', { name: 'A short tour' })).toBeNull()
  })
})

describe('the tour', () => {
  it('goes through the real parts of the page, in order, and Finish is remembered', () => {
    mount(KAVON)
    fireEvent.click(screen.getByRole('button', { name: 'Start the tour' }))
    const seen: string[] = []
    for (let i = 0; i < TOUR_STEPS.length; i++) {
      seen.push(card().querySelector('.gw-tour-says')!.textContent!)
      expect(card()).toHaveTextContent(`Step ${i + 1} of ${TOUR_STEPS.length}`)
      if (i < TOUR_STEPS.length - 1) fireEvent.click(within(card()).getByRole('button', { name: 'Next' }))
    }
    expect(seen).toEqual(TOUR_STEPS.map(s => s.says))
    fireEvent.click(within(card()).getByRole('button', { name: 'Finish' }))
    expect(screen.queryByRole('dialog', { name: /A short tour/ })).toBeNull()
    expect(tourOutcome('u-kavon')).toBe('finished')
  })

  it('Back goes back, and "Skip the tour" ends it and is remembered', () => {
    mount(KAVON)
    fireEvent.click(screen.getByRole('button', { name: 'Start the tour' }))
    fireEvent.click(within(card()).getByRole('button', { name: 'Next' }))
    fireEvent.click(within(card()).getByRole('button', { name: 'Back' }))
    expect(card()).toHaveTextContent('Step 1 of')
    fireEvent.click(within(card()).getByRole('button', { name: 'Skip the tour' }))
    expect(screen.queryByRole('dialog', { name: /A short tour/ })).toBeNull()
    expect(tourOutcome('u-kavon')).toBe('skipped')
  })

  it('Esc skips it', () => {
    mount(KAVON)
    fireEvent.click(screen.getByRole('button', { name: 'Start the tour' }))
    act(() => { fireEvent.keyDown(document, { key: 'Escape' }) })
    expect(screen.queryByRole('dialog', { name: /A short tour/ })).toBeNull()
  })

  it('leaves out a step whose part is not on this person\'s screen', () => {
    mount({ ...KAVON, mayOpenCheckIns: false })
    fireEvent.click(screen.getByRole('button', { name: 'Start the tour' }))
    expect(card()).toHaveTextContent(`Step 1 of ${TOUR_STEPS.length - 1}`)
    const says: string[] = []
    for (let i = 0; i < TOUR_STEPS.length - 1; i++) {
      says.push(card().querySelector('.gw-tour-says')!.textContent!)
      if (i < TOUR_STEPS.length - 2) fireEvent.click(within(card()).getByRole('button', { name: 'Next' }))
    }
    expect(says.some(s => s.startsWith('Start a check-in here'))).toBe(false)
  })

  it('can be taken again from the person\'s own menu, by anybody', () => {
    const { container } = mount(ADAM)
    const rail = container.querySelector('.gw-sidebar-desktop') as HTMLElement
    fireEvent.click(within(rail).getByRole('button', { name: /Settings, help, sign out/ }))
    fireEvent.click(within(rail).getByRole('button', { name: 'Take the short tour' }))
    expect(card()).toHaveTextContent('Step 1 of')
  })

  it('never points at sample data: every step points at a part of the page itself', () => {
    for (const s of TOUR_STEPS) {
      for (const t of s.targets) expect(t).toMatch(/^\.gw-(rl|phone-bar)/)
    }
  })

  it('what it remembers goes on signing out, like everything else about a person', () => {
    mount(KAVON).unmount()
    window.localStorage.setItem('gw-tour-u-kavon', 'finished')
    takeItAllWithYou()
    expect(tourOutcome('u-kavon')).toBeNull()
  })
})
