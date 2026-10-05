import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from './AppShell'
import { useAuthStore } from '@/stores/auth'

/**
 * RELEASE WALKTHROUGH, 5 OCTOBER: THE FLOATING FEEDBACK PILL COVERED THE ASK BOX'S SEND BUTTON ON
 * THE BOARD AT 1440, AND THE CHAT'S SUGGESTION CHIPS AT 375.
 *
 * The board's own "Ask about this board" bar (`AskTheBoard`, BoardPage.tsx) and the ground page's
 * default check-in tab (the same suggestion-chip conversation `/chat/:id` and `/checkin/:id`
 * already get a different rest position for) both sit at the trigger's own default bottom-right
 * corner. See AppShell.tsx's `FeedbackWidget` for the fix: `isGroundsBoard` raises the resting
 * `bottom` offset on `/grounds/:id/board`, and `onGroundCheckInTab` folds the ground page's bare
 * `/grounds/:id` (no `tab=`, or `tab=chat`) into the same top-of-page treatment `/chat/:id` and
 * `/start` already have.
 */
const USER = { id: 'u1', email: 'aisha@x.test', firstName: 'Aisha', role: 'MEMBER', organizationName: 'Mawe' }

function mount(path: string) {
  useAuthStore.setState({ user: USER, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  qc.setQueryData(['grounds'], [])
  qc.setQueryData(['my-organizations'], [])
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}><AppShell><div>page content</div></AppShell></MemoryRouter>
    </QueryClientProvider>,
  )
}

function trigger(container: HTMLElement) {
  return container.querySelector('.gw-feedback-btn') as HTMLElement | null
}

describe('the feedback pill clears the ask box and the chat', () => {
  it('rests higher, clear of "Ask", on the board', () => {
    const btn = trigger(mount('/grounds/g1/board').container)
    expect(btn).toBeTruthy()
    expect(btn!.style.bottom).toBe('84px')
  })

  it('keeps its plain bottom-right rest position everywhere else', () => {
    const btn = trigger(mount('/grounds').container)
    expect(btn!.style.bottom).toBe('20px')
  })

  it('takes the chat page\'s top position on the ground page\'s own bare check-in tab (no ?tab=)', () => {
    const btn = trigger(mount('/grounds/g1').container)
    expect(btn!.style.top).toBe('12px')
    expect(btn!.style.bottom).toBe('')
  })

  it('takes the same top position on ?tab=chat, the Check-in tab\'s own query key', () => {
    const btn = trigger(mount('/grounds/g1?tab=chat').container)
    expect(btn!.style.top).toBe('12px')
  })

  it('does not take the chat treatment on the ground page\'s other tabs', () => {
    const btn = trigger(mount('/grounds/g1?tab=context').container)
    expect(btn!.style.bottom).toBe('20px')
    expect(btn!.style.top).toBe('')
  })
})
