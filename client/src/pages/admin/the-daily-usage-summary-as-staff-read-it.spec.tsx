import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DailyUsageRow } from './AdminPage'
import { adminApi } from '@/api/admin'

/**
 * ADMIN -> SYSTEM -> DELIVERY: THE DAILY USAGE SUMMARY, AS GROUNDWORK'S STAFF READ IT. `GET`/`PATCH /admin/daily-usage`. It goes to the
 * back-office team, the people told about each new sign-up, so the row says who that is and offers only on or off and the hour.
 */
vi.mock('@/api/admin', async () => {
  const actual = await vi.importActual<typeof import('@/api/admin')>('@/api/admin')
  return { ...actual, adminApi: { ...actual.adminApi, getDailyUsage: vi.fn(), setDailyUsage: vi.fn() } }
})

const HOURS = Array.from({ length: 24 }, (_, h) => (h === 0 ? 'midnight' : h === 12 ? 'midday' : h < 12 ? `${h} in the morning` : h < 17 ? `${h - 12} in the afternoon` : `${h - 12} in the evening`))

function renderIt() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><DailyUsageRow /></QueryClientProvider>)
}

beforeEach(() => { vi.clearAllMocks() })

describe('the daily usage summary row', () => {
  it('says when it goes and who it goes to', async () => {
    ;(adminApi.getDailyUsage as any).mockResolvedValue({ on: true, hour: 8, to: ['hjumare@gmail.com'], hours: HOURS })
    renderIt()
    expect(await screen.findByText(/Every day at 8 in the morning, Lagos time, an email lists every organisation that has signed up, with its usage, and the totals\. It holds counts and organisation names only\. It goes to hjumare@gmail\.com, everybody on the back-office team with a connected account, who are also told about each new sign-up\./)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Turn it off' })).toBeTruthy()
  })

  it('changing the hour sends it, and turning it off says it is off', async () => {
    ;(adminApi.getDailyUsage as any).mockResolvedValue({ on: true, hour: 8, to: ['hjumare@gmail.com'], hours: HOURS })
    ;(adminApi.setDailyUsage as any).mockResolvedValue({ on: true, hour: 7, to: ['hjumare@gmail.com'], hours: HOURS })
    renderIt()
    fireEvent.change(await screen.findByLabelText('The hour the daily usage summary goes, Lagos time'), { target: { value: '7' } })
    await waitFor(() => expect(adminApi.setDailyUsage).toHaveBeenCalledWith({ hour: 7 }))
    ;(adminApi.setDailyUsage as any).mockResolvedValue({ on: false, hour: 7, to: ['hjumare@gmail.com'], hours: HOURS })
    fireEvent.click(screen.getByRole('button', { name: 'Turn it off' }))
    await waitFor(() => expect(adminApi.setDailyUsage).toHaveBeenCalledWith({ on: false }))
    expect(await screen.findByText(/It is turned off, so no usage summary is sent\./)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Turn it on' })).toBeTruthy()
  })

  it('says plainly when nobody would receive it', async () => {
    ;(adminApi.getDailyUsage as any).mockResolvedValue({ on: true, hour: 8, to: [], hours: HOURS })
    renderIt()
    expect(await screen.findByText(/Nobody on the back-office team has a connected account yet, so nobody receives it\. Connect an account in the back office, under People\./)).toBeTruthy()
  })
})
