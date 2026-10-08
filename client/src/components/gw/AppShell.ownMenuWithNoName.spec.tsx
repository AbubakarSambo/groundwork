import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from './AppShell'
import { useAuthStore } from '@/stores/auth'

/**
 * B-066: YOUR OWN ACCOUNT MENU SHOWING YOUR OWN ADDRESS WHERE YOUR NAME GOES.
 *
 * E1 on Riverbank Trading's old data (docs/existing-users-check.md) found a member with no name yet
 * (fo4), signed in as themselves, reading "F" and "fo4@riverbank.test" in their own account menu -
 * the one spot on the whole product that is always about the reader, never about telling them apart
 * from anybody else. Fixed: "You", with "Add your name" underneath, and a plain neutral mark in the
 * avatar circle rather than the first letter of their address.
 */
const NAMELESS = {
  id: 'u-fo4', email: 'fo4@riverbank.test', firstName: '', lastName: '',
  role: 'MEMBER', organizationId: 'o1', organizationName: 'Riverbank Trading',
  organization: { id: 'o1', name: 'Riverbank Trading', email: 'ops@riverbank.test' },
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

beforeEach(() => {
  vi.restoreAllMocks()
  useAuthStore.setState({ user: NAMELESS, token: 't', isAuthenticated: true } as any)
})

describe('the account menu, for somebody who has not given a name yet', () => {
  it('reads "You", with "Add your name" underneath, never the address', () => {
    const { container } = shell('/grounds')
    expect(container.querySelector('.gw-rl-me .gw-rl-org-name')?.textContent).toBe('You')
    expect(screen.getByText('Add your name')).toBeInTheDocument()
    expect(screen.queryByText('fo4@riverbank.test')).toBeNull()
    expect(screen.queryByText('Settings, help, sign out')).toBeNull()
  })

  it('shows a plain neutral mark in the avatar, never the first letter of the address', () => {
    const { container } = shell('/grounds')
    const avatar = container.querySelector('.gw-rl-av')
    expect(avatar?.textContent).toBe('•')
    expect(avatar?.textContent).not.toBe('F')
  })
})
