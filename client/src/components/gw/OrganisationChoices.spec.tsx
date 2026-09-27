import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OrganisationChoices } from './OrganisationChoices'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/api/auth'

/**
 * U.8 REVIEW, HAFSAH'S INSTRUCTION OF 27 SEPTEMBER: NEVER "Your organisation" AS IF IT WERE THE
 * NAME. JoinConfirmPage.tsx can leave a placeholder profile standing (no `organizationName`, role
 * `MEMBER`) before the real one arrives from `authApi.me()`. Before this fix, that placeholder made
 * the organisation switcher read "Your organisation" and "Takes part" as if they were facts about
 * the organisation, rather than showing nothing until the real name is known.
 */
vi.mock('@/api/auth', () => ({
  authApi: { myOrganizations: vi.fn() },
}))

function renderIt() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <OrganisationChoices />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the organisation switcher never shows a name that is not the organisation\'s own', () => {
  it('shows nothing in place of the name on a placeholder profile, before the real one arrives', async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      token: 't',
      user: { id: 'u-neema', email: '', firstName: '', lastName: '', role: 'MEMBER', organizationId: '' } as any,
    })
    ;(authApi.myOrganizations as any).mockResolvedValue([])

    renderIt()
    await waitFor(() => expect(authApi.myOrganizations).toHaveBeenCalled())

    expect(screen.queryByText('Your organisation')).toBeNull()
    expect(screen.queryByText('Takes part')).toBeNull()
  })

  it('shows the real name and role once the profile has actually arrived', async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      token: 't',
      user: {
        id: 'u-neema', email: 'neema.u8@example.test', firstName: 'Neema', lastName: 'Achieng',
        role: 'MEMBER', organizationId: 'org-kilima', organizationName: 'Kilima Traders U8',
      } as any,
    })
    ;(authApi.myOrganizations as any).mockResolvedValue([])

    renderIt()
    expect(await screen.findByText('Kilima Traders U8')).toBeTruthy()
    expect(screen.getByText('Takes part')).toBeTruthy()
  })
})
