import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from './AppShell'
import { useAuthStore } from '@/stores/auth'

/**
 * REVIEW ROUND 3, ITEM 7: NO APP BOTTOM BAR ON THE CONVERSATION, AND THE FEEDBACK TRIGGER DOES
 * NOT SIT ON THE COMPOSER THERE.
 *
 * The prototype's own rule (app.css, `body.focus .tabbar{display:none}`): a check-in's own card is
 * the whole screen once you are inside it. Measured in the review's own capture at 375px: the
 * Feedback pill sat directly over the composer's "+" and Send. Both are gone from the conversation
 * route specifically - present everywhere else, unchanged.
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

describe('no app chrome on the conversation', () => {
  it('the app\'s bottom bar (Today, Check-ins, Start, Chat, More) does not render on /checkin/:id', () => {
    const { container } = mount('/checkin/ci1')
    expect(container.querySelector('nav[aria-label="Main"]')).toBeNull()
  })

  it('the bottom bar is still there on every other page', () => {
    const { container } = mount('/grounds')
    expect(container.querySelector('nav[aria-label="Main"]')).toBeTruthy()
  })

  it('the Feedback trigger does not render on the conversation', () => {
    const { container } = mount('/checkin/ci1')
    expect(container.querySelector('.gw-feedback-btn')).toBeNull()
  })

  it('the Feedback trigger is still offered elsewhere', () => {
    const { container } = mount('/grounds')
    expect(container.querySelector('.gw-feedback-btn')).toBeTruthy()
  })

  it('<main> carries the room-giving-back class only on the conversation', () => {
    const conv = mount('/checkin/ci1').container.querySelector('main')
    expect(conv?.className).toContain('gw-focus')
    const other = mount('/grounds').container.querySelector('main')
    expect(other?.className).not.toContain('gw-focus')
  })
})
