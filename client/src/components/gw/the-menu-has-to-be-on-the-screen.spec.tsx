import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from './AppShell'
import { useAuthStore } from '@/stores/auth'

/**
 * THE MENU IS NOT THERE AT ANY WIDTH.
 *
 * Said three times before anybody measured it, and every previous answer was about widths and
 * breakpoints, which was wrong. The rail is behind `showSidebar`, and every previous test of it
 * read the SOURCE rather than mounting the thing - so the whole question of whether a signed-in
 * admin on /grounds actually gets a rail had never once been asked of the running component.
 *
 * This mounts it. If an admin lands on their check-ins and cannot see People, Connect, Billing and
 * Settings, this fails, whatever the reason turns out to be.
 */
const ADMIN = {
  id: 'u1', email: 'admin@test.test', firstName: 'Ada', lastName: '',
  role: 'ADMIN', organizationId: 'o1', organizationName: 'Test Org',
  organization: { id: 'o1', name: 'Test Org', email: 'ops@test.test' },
} as any

function shell(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <AppShell><div>page body</div></AppShell>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/*
 * SIGNED IN BEFORE EVERY TEST IN THIS FILE, not just the first block.
 *
 * A `beforeEach` inside one describe does not run for the next one, so the signed-out test left the
 * store empty and the navigation test below it rendered a shell for somebody who was not signed in.
 * It failed about one run in three, which reads as flakiness and is really ordering.
 */
beforeEach(() => {
  vi.restoreAllMocks()
  useAuthStore.setState({ user: ADMIN, token: 't', isAuthenticated: true } as any)
})

describe('the menu has to be on the screen', () => {

  it('an admin on their check-ins can see the menu', () => {
    const { container } = shell('/grounds')
    /* The rail's own element, so this cannot pass on a link that happens to be somewhere else. */
    expect(container.querySelector('.gw-sidebar-desktop')).not.toBeNull()
  })

  it('and every admin destination is in it, by name', () => {
    shell('/grounds')
    for (const label of ['All check-ins', 'People', 'Connect', 'Billing', 'Settings']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    }
  })

  it('is not there on the pages that are deliberately bare', () => {
    /* Those carry their own header - see a-page-with-no-way-out. Being bare there is the design. */
    const { container } = shell('/org/setup')
    expect(container.querySelector('.gw-sidebar-desktop')).toBeNull()
  })

  it('is not there for somebody who is not signed in', () => {
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false } as any)
    const { container } = shell('/grounds')
    expect(container.querySelector('.gw-sidebar-desktop')).toBeNull()
  })
})

/**
 * THE SEQUENCE THAT BROKE IT, RATHER THAN THE DESTINATION.
 *
 * Every test above mounts straight onto a page, and a fresh mount always got this right - which is
 * why nothing caught it. The bug only appears when the route CHANGES under a shell that is already
 * mounted, because that is the moment AppShell was not being told anything.
 */
describe('and it appears when you move, not only when you arrive', () => {
  it('shows the menu after signing in and going to the check-ins', async () => {
    /*
     * THE STORE FROM THE TOP OF THIS FILE, NOT A DYNAMIC RE-IMPORT.
     *
     * `await import('@/stores/auth')` can resolve to a different module instance from the one
     * AppShell closed over, so `setState` wrote to a store the component was not reading and the
     * shell rendered signed-out. It passed most runs and failed about one in three - which is the
     * worst kind of test, because the next red is assumed to be noise.
     */
    useAuthStore.setState({ user: ADMIN, token: 't', isAuthenticated: true } as any)

    function GoToGrounds() {
      const navigate = useNavigate()
      return <button onClick={() => navigate('/grounds')}>go</button>
    }

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    /*
       Scoped to this render's own container rather than `document`. Querying the document passes
       alone and fails in the full run, because another suite's leftover markup is still in it -
       which is a test that reports on whatever ran before it. */
    const { container } = render(
      <QueryClientProvider client={qc}>
        {/* Starts on a deliberately bare page, exactly as somebody signing in does. */}
        <MemoryRouter initialEntries={['/auth']}>
          <AppShell>
            <Routes>
              <Route path="/auth" element={<GoToGrounds />} />
              <Route path="/grounds" element={<div>check-ins</div>} />
            </Routes>
          </AppShell>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(container.querySelector('.gw-sidebar-desktop')).toBeNull()
    /* fireEvent, not a raw .click(). A raw DOM click happens outside React's act(), so the state
       update it causes may not be flushed before the assertion runs - which is the remaining one-run-
       in-five failure after the ordering fix, and is a property of the test rather than the product. */
    fireEvent.click(screen.getByText('go'))
    await screen.findByText('check-ins')

    /*
     * WAITED FOR, NOT ASSERTED ONCE. The route content and the shell's own re-render are not
     * guaranteed to land in the same commit, so a bare expect here passed alone and failed in the
     * full suite - a flake, and a flake in the test guarding the bug it was written for is worse
     * than no test, because the next person to see it red will assume it is noise.
     */
    await waitFor(() => expect(container.querySelector('.gw-sidebar-desktop')).not.toBeNull())
  })
})
