import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth'

/**
 * B-199: SIX SWITCHED-OFF SUITES NEVER OFFERED AN ADMIN THE WAY ON.
 *
 * `/suite/onboard`, `/suite/todos`, `/suite/roles`, `/suite/leaving`, `/suite/customers` and
 * `/suite/equipment` each read the server's 403/404 message straight onto the page
 * (`<Note tone="error">{refused.data?.message}</Note>`), with no `SuiteOffMessage` wrapper - unlike
 * `LeaveBoardPage`, `SpendingPage`, `FinancePage`, `QueuePage` and `ReviewsBoardPage`, which already
 * got that treatment for B-122. So an admin reading "The onboarding suite is not switched on. An
 * admin switches it on under Suites." about HERSELF had no link in the sentence itself, only the
 * small "Suites" breadcrumb above the title - exactly the gap B-122 fixed everywhere else.
 *
 * Each of the six now renders its refusal through `SuiteOffMessage`, the same component and the same
 * wording decision as the suites that already had it, so "Suites" in the sentence becomes a working
 * link for an admin and stays plain text for anyone who cannot switch a suite on.
 */
vi.mock('@/api/suites', () => ({
  onboardingBoardApi: { get: vi.fn() },
  todosApi: { get: vi.fn() },
  roleMapApi: { get: vi.fn() },
  leavingApi: { get: vi.fn() },
  customersApi: { get: vi.fn() },
  equipmentApi: { get: vi.fn() },
}))
import { onboardingBoardApi, todosApi, roleMapApi, leavingApi, customersApi, equipmentApi } from '@/api/suites'
import { OnboardingBoardPage } from './OnboardingBoardPage'
import { TodosPage } from './TodosPage'
import { RoleMapPage } from './RoleMapPage'
import { LeavingBoardPage } from './LeavingBoardPage'
import { CustomersPage } from './CustomersPage'
import { EquipmentPage } from './EquipmentPage'

const GRACE = { id: 'u-g', firstName: 'Grace', role: 'ADMIN', organizationName: 'Msingi Foods' }
const refusal = (suite: string) =>
  Object.assign(new Error('403'), { response: { status: 403, data: { message: `The ${suite} suite is not switched on. An admin switches it on under Suites.` } } })

function renderWith(mockFn: any, suite: string, Page: () => any, path: string) {
  mockFn.mockRejectedValue(refusal(suite))
  useAuthStore.setState({ user: GRACE, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}><Page /></MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => { vi.clearAllMocks() })

describe('an admin reads a working "Suites" link in the off-suite sentence itself, on every suite board', () => {
  it('onboarding', async () => {
    renderWith(onboardingBoardApi.get, 'onboarding', OnboardingBoardPage, '/suite/onboard')
    await screen.findByRole('alert')
    expect(screen.getAllByRole('link', { name: 'Suites' }).length).toBe(2)
  })

  it('to-dos', async () => {
    renderWith(todosApi.get, 'to-dos', TodosPage, '/suite/todos')
    await screen.findByRole('alert')
    expect(screen.getAllByRole('link', { name: 'Suites' }).length).toBe(2)
  })

  it('role map', async () => {
    renderWith(roleMapApi.get, 'role map', RoleMapPage, '/suite/roles')
    await screen.findByRole('alert')
    expect(screen.getAllByRole('link', { name: 'Suites' }).length).toBe(2)
  })

  it('when someone leaves', async () => {
    renderWith(leavingApi.get, 'leaving', LeavingBoardPage, '/suite/leaving')
    await screen.findByRole('alert')
    expect(screen.getAllByRole('link', { name: 'Suites' }).length).toBe(2)
  })

  it('customers and deals', async () => {
    renderWith(customersApi.get, 'customers', CustomersPage, '/suite/customers')
    await screen.findByRole('alert')
    expect(screen.getAllByRole('link', { name: 'Suites' }).length).toBe(2)
  })

  it('equipment', async () => {
    renderWith(equipmentApi.get, 'equipment', EquipmentPage, '/suite/equipment')
    await screen.findByRole('alert')
    expect(screen.getAllByRole('link', { name: 'Suites' }).length).toBe(2)
  })
})
