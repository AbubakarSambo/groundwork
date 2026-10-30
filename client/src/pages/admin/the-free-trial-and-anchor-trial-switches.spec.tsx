import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FreeTrialRow, AnchorTrialRow } from './AdminPage'
import { adminApi } from '@/api/admin'

/**
 * ADMIN -> SYSTEM -> PRICING: THE REGULAR FREE TRIAL AND THE ANCHOR TRIAL, EACH WITH ITS OWN
 * ON/OFF SWITCH. `GET`/`PATCH /admin/pricing/free-trial` (teamsUnder and months come from the
 * server; only `on` is sent from this screen - every free run is one month now, decision 78).
 * `GET`/`PATCH /admin/pricing/anchor-trial` (`on` only - its one month, for up to 20 people with
 * the lead, is fixed, anchor piece 34).
 */
vi.mock('@/api/admin', async () => {
  const actual = await vi.importActual<typeof import('@/api/admin')>('@/api/admin')
  return {
    ...actual,
    adminApi: {
      ...actual.adminApi,
      getFreeTrial: vi.fn(),
      setFreeTrial: vi.fn(),
      getAnchorTrial: vi.fn(),
      setAnchorTrial: vi.fn(),
    },
  }
})

function renderWith(node: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{node}</QueryClientProvider>)
}

beforeEach(() => { vi.clearAllMocks() })

describe('the free trial row', () => {
  it('reads the served state, off', async () => {
    ;(adminApi.getFreeTrial as any).mockResolvedValue({ on: false, teamsUnder: 20, months: 1 })
    renderWith(<FreeTrialRow />)
    expect(await screen.findByText('Teams of fewer than 20 people get 1 month free.')).toBeTruthy()
    expect(screen.getByText('Off')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Turn on the free trial' })).toBeTruthy()
  })

  it('reads the served state, on, with more than one month', async () => {
    ;(adminApi.getFreeTrial as any).mockResolvedValue({ on: true, teamsUnder: 20, months: 2 })
    renderWith(<FreeTrialRow />)
    expect(await screen.findByText('Teams of fewer than 20 people get 2 months free.')).toBeTruthy()
    expect(screen.getByText('On')).toBeTruthy()
  })

  it('switching sends { on: true } and reads it back from the server', async () => {
    ;(adminApi.getFreeTrial as any).mockResolvedValue({ on: false, teamsUnder: 20, months: 1 })
    ;(adminApi.setFreeTrial as any).mockResolvedValue({ on: true, teamsUnder: 20, months: 1 })
    renderWith(<FreeTrialRow />)
    const button = await screen.findByRole('button', { name: 'Turn on the free trial' })
    fireEvent.click(button)
    await waitFor(() => expect(adminApi.setFreeTrial).toHaveBeenCalledWith(true))
    await waitFor(() => expect(screen.getByText('On')).toBeTruthy())
    expect(await screen.findByRole('button', { name: 'Turn off the free trial' })).toBeTruthy()
  })

  it('switching off sends { on: false }', async () => {
    ;(adminApi.getFreeTrial as any).mockResolvedValue({ on: true, teamsUnder: 20, months: 1 })
    ;(adminApi.setFreeTrial as any).mockResolvedValue({ on: false, teamsUnder: 20, months: 1 })
    renderWith(<FreeTrialRow />)
    const button = await screen.findByRole('button', { name: 'Turn off the free trial' })
    fireEvent.click(button)
    await waitFor(() => expect(adminApi.setFreeTrial).toHaveBeenCalledWith(false))
  })

  it('says a failure in a full sentence', async () => {
    ;(adminApi.getFreeTrial as any).mockResolvedValue({ on: false, teamsUnder: 20, months: 1 })
    ;(adminApi.setFreeTrial as any).mockRejectedValue({ response: { data: { message: 'That did not save because the setting is locked.' } } })
    renderWith(<FreeTrialRow />)
    const button = await screen.findByRole('button', { name: 'Turn on the free trial' })
    fireEvent.click(button)
    expect(await screen.findByText('That did not save because the setting is locked.')).toBeTruthy()
  })
})

describe('the anchor trial row', () => {
  it('reads the served state, off, with its fixed sentence', async () => {
    ;(adminApi.getAnchorTrial as any).mockResolvedValue({ on: false, months: 1, people: 20 })
    renderWith(<AnchorTrialRow />)
    expect(await screen.findByText('A check-in started from the anchor link gives the organisation 1 month on the plan for up to 20 people besides the lead.')).toBeTruthy()
    expect(screen.getByText('Off')).toBeTruthy()
  })

  it('switching sends { on: true } and reads it back from the server', async () => {
    ;(adminApi.getAnchorTrial as any).mockResolvedValue({ on: false, months: 1, people: 20 })
    ;(adminApi.setAnchorTrial as any).mockResolvedValue({ on: true, months: 1, people: 20 })
    renderWith(<AnchorTrialRow />)
    const button = await screen.findByRole('button', { name: 'Turn on the anchor trial' })
    fireEvent.click(button)
    await waitFor(() => expect(adminApi.setAnchorTrial).toHaveBeenCalledWith(true))
    await waitFor(() => expect(screen.getByText('On')).toBeTruthy())
  })

  it('switching off sends { on: false }', async () => {
    ;(adminApi.getAnchorTrial as any).mockResolvedValue({ on: true, months: 1, people: 20 })
    ;(adminApi.setAnchorTrial as any).mockResolvedValue({ on: false, months: 1, people: 20 })
    renderWith(<AnchorTrialRow />)
    const button = await screen.findByRole('button', { name: 'Turn off the anchor trial' })
    fireEvent.click(button)
    await waitFor(() => expect(adminApi.setAnchorTrial).toHaveBeenCalledWith(false))
  })

  it('says a failure in a full sentence', async () => {
    ;(adminApi.getAnchorTrial as any).mockResolvedValue({ on: false, months: 1, people: 20 })
    ;(adminApi.setAnchorTrial as any).mockRejectedValue({ response: { data: { message: 'That didn’t save. Try again.' } } })
    renderWith(<AnchorTrialRow />)
    const button = await screen.findByRole('button', { name: 'Turn on the anchor trial' })
    fireEvent.click(button)
    expect(await screen.findByText('That didn’t save. Try again.')).toBeTruthy()
  })
})
