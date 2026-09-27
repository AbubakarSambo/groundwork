import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WaitingForAnAdminPage, whenItWasAsked } from './WaitingForAnAdminPage'
import { authApi } from '@/api/auth'

/**
 * "ALMOST IN" (A3, #/join/waiting), AS THE PERSON WAITING READS IT. Wording from join-waiting.txt,
 * without "and text", without "Usually within a day", and with the admin's name for "she".
 */
vi.mock('@/api/auth', () => ({ authApi: { myWaiting: vi.fn(), remindAboutMyWaiting: vi.fn() } }))

const HOUR = 3_600_000
const AFTER_AN_INVITATION = {
  waiting: true,
  organisationName: 'Baridi Appliances',
  askedAt: new Date(Date.now() - 30 * HOUR).toISOString(),
  admin: { name: 'Grace Achieng', firstName: 'Grace' },
  inviterFirstName: 'Wairimu',
  canRemindFrom: new Date(Date.now() - HOUR).toISOString(),
}

function open() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter><WaitingForAnAdminPage /></MemoryRouter></QueryClientProvider>)
}

beforeEach(() => { vi.clearAllMocks() })

describe('after a real invitation', () => {
  it('names the admin who was asked, as the prototype does', async () => {
    ;(authApi.myWaiting as any).mockResolvedValue(AFTER_AN_INVITATION)
    open()
    expect(await screen.findByText('You’re from outside Baridi Appliances, so an admin there has to let you in. We’ve asked Grace Achieng.')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Almost in' })).toBeTruthy()
    const steps = [...document.querySelectorAll('.gw-steps li')].map(li => li.textContent)
    expect(steps[0]).toBe('✓Done. You accepted the invitation')
    expect(steps[1]).toMatch(/^✓Done\. Grace was asked, (yesterday|on \d+ \w+) at \d{2}:\d{2}$/)
    expect(steps[2]).toBe('○Still to happen. Grace lets you in')
    expect(screen.getByText('We’ll email you the moment Grace does, and your first check-in will be waiting.')).toBeTruthy()
    expect(screen.getByText('You can remind Grace once a day. Wairimu can see you’re waiting too.')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/text you|Usually within a day/)
  })

  it('"Remind Grace" sends once, and says so', async () => {
    ;(authApi.myWaiting as any).mockResolvedValue(AFTER_AN_INVITATION)
    ;(authApi.remindAboutMyWaiting as any).mockResolvedValue({ reminded: true, canRemindFrom: new Date(Date.now() + 24 * HOUR).toISOString() })
    open()
    fireEvent.click(await screen.findByRole('button', { name: 'Remind Grace' }))
    await waitFor(() => expect(authApi.remindAboutMyWaiting).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('We reminded Grace.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Remind Grace' })).toBeDisabled()
  })

  it('the button waits until a day has passed', async () => {
    ;(authApi.myWaiting as any).mockResolvedValue({ ...AFTER_AN_INVITATION, canRemindFrom: new Date(Date.now() + 5 * HOUR).toISOString() })
    open()
    expect(await screen.findByRole('button', { name: 'Remind Grace' })).toBeDisabled()
  })

  it('the server\'s refusal is said in its own sentence', async () => {
    ;(authApi.myWaiting as any).mockResolvedValue(AFTER_AN_INVITATION)
    ;(authApi.remindAboutMyWaiting as any).mockRejectedValue({ response: { data: { message: 'You can send a reminder once a day. You can send the next one tomorrow.' } } })
    open()
    fireEvent.click(await screen.findByRole('button', { name: 'Remind Grace' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('You can send a reminder once a day. You can send the next one tomorrow.')
  })
})

describe('after a link shared with many people', () => {
  it('names nobody and offers no reminder', async () => {
    ;(authApi.myWaiting as any).mockResolvedValue({ ...AFTER_AN_INVITATION, admin: null, inviterFirstName: null })
    open()
    expect(await screen.findByText('You’re from outside Baridi Appliances, so an admin there has to let you in. We’ve asked the admins there.')).toBeTruthy()
    expect(screen.getByText('You asked to join')).toBeTruthy()
    expect(screen.getByText('We’ll email you the moment they do, and your first check-in will be waiting.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Remind/ })).toBeNull()
  })
})

describe('when it was asked, in words', () => {
  /* In the product's one date format (lib/a-date-reads-the-same-everywhere.ts), so 16:12, not 4:12pm. */
  it('today, yesterday, or a date', () => {
    const now = new Date(2026, 8, 26, 12, 0)
    expect(whenItWasAsked(new Date(2026, 8, 26, 9, 5).toISOString(), now)).toBe('today at 09:05')
    expect(whenItWasAsked(new Date(2026, 8, 25, 16, 12).toISOString(), now)).toBe('yesterday at 16:12')
    expect(whenItWasAsked(new Date(2026, 8, 20, 16, 12).toISOString(), now)).toBe('on 20 September at 16:12')
  })
})

describe('somebody who is not waiting (U.3 review)', () => {
  function openWithToday(qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
    const view = render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/join/waiting']}>
          <Routes>
            <Route path="/join/waiting" element={<WaitingForAnAdminPage />} />
            <Route path="/today" element={<p>Today page</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    return { ...view, qc }
  }

  it('who never waited goes to Today, and never reads "Nobody needs to let you in any more."', async () => {
    ;(authApi.myWaiting as any).mockResolvedValue({ waiting: false })
    openWithToday()
    expect(await screen.findByText('Today page')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/You’re in|Nobody needs to let you in/)
  })

  it('who was waiting here and has since been let in is told so plainly', async () => {
    ;(authApi.myWaiting as any).mockResolvedValueOnce(AFTER_AN_INVITATION)
    const { qc } = openWithToday()
    await screen.findByRole('button', { name: 'Remind Grace' })
    ;(authApi.myWaiting as any).mockResolvedValue({ waiting: false })
    await qc.invalidateQueries({ queryKey: ['my-waiting'] })
    expect(await screen.findByRole('heading', { name: 'You’re in' })).toBeTruthy()
    expect(screen.getByText('An admin has let you in. You can open your check-ins now.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Open my check-ins' })).toBeTruthy()
  })
})
