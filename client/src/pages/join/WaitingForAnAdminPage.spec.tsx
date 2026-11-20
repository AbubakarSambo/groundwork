/* 7 November 2026: one voice, "I" (Hafsah's fixed rule; staging check S15), so "We’ve asked" reads "I have asked". */
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
    expect(await screen.findByText('You’re from outside Baridi Appliances, so an admin there has to let you in. I have asked Grace Achieng.')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Almost in' })).toBeTruthy()
    /* U.20 (the invitation's rebuild): the page now uses the shared `Steps`/`Step` part
       (components/gw/ui), whose class is `gwui-steps` rather than the old page-only `gw-steps` -
       the rows and their words are unchanged, only the markup they come from. */
    const steps = [...document.querySelectorAll('.gwui-steps li')].map(li => li.textContent)
    expect(steps[0]).toBe('✓Done. You accepted the invitation')
    /* U.20 seventh round (Hafsah's first review): the prototype's own way of writing a time
       (join-waiting.txt: "yesterday at 4:12pm"), not the 24-hour clock.
       HAFSAH, 30 SEPTEMBER, ITEM 5: FLAKY ON THE HOUR. `whenItWasAsked` drops ":00" (so 1pm exactly
       reads "at 1pm", not "at 1:00pm" - the product's own way of writing a time, the same trick
       `aTime()` uses elsewhere) - this test ran fine every minute except :00, when `AFTER_AN_INVITATION`'s
       fixed hour-ago offset happened to land on the hour and the old regex, which required a
       minute, failed on nothing but the clock. The minutes group is now optional, matching what
       the product actually writes rather than assuming it is always there. */
    expect(steps[1]).toMatch(/^✓Done\. Grace was asked, (yesterday|on \d+ \w+) at \d{1,2}(:\d{2})?(am|pm)$/)
    expect(steps[2]).toBe('○Still to happen. Grace lets you in')
    expect(screen.getByText('I’ll email you the moment Grace does, and your first check-in will be waiting.')).toBeTruthy()
    expect(screen.getByText('You can remind Grace once a day. Wairimu can see you’re waiting too.')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/text you|Usually within a day/)
  })

  /* Hafsah's re-review (U.20 eighth round): dropped, then put back deliberately - a way out for
     whoever this waiting request is not for, since this route has no sidebar while waiting. */
  it('has a quiet way to sign out, for whoever this is not for', async () => {
    ;(authApi.myWaiting as any).mockResolvedValue(AFTER_AN_INVITATION)
    open()
    await screen.findByText('You can remind Grace once a day. Wairimu can see you’re waiting too.')
    expect(screen.getByRole('link', { name: 'Not you? Sign out.' })).toHaveAttribute('href', '/signout')
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

describe('when the true reason is that the plan has no free seat (U.8 re-review)', () => {
  it('says the true reason, not that Faraji is a stranger to his own organisation', async () => {
    ;(authApi.myWaiting as any).mockResolvedValue({ ...AFTER_AN_INVITATION, heldForASeat: true })
    open()
    expect(await screen.findByText('Baridi Appliances has no free seat right now, so an admin there has to make room before you can start. I have asked Grace Achieng.')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/You’re from outside/)
  })
})

describe('after a link shared with many people', () => {
  it('names nobody and offers no reminder', async () => {
    ;(authApi.myWaiting as any).mockResolvedValue({ ...AFTER_AN_INVITATION, admin: null, inviterFirstName: null })
    open()
    expect(await screen.findByText('You’re from outside Baridi Appliances, so an admin there has to let you in. I have asked the admins there.')).toBeTruthy()
    expect(screen.getByText('You asked to join')).toBeTruthy()
    expect(screen.getByText('I’ll email you the moment they do, and your first check-in will be waiting.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Remind/ })).toBeNull()
  })
})

describe('when it was asked, in words', () => {
  /* U.20 seventh round (Hafsah's first review): the prototype's own way of writing a time
     (join-waiting.txt: "yesterday at 4:12pm"), read live as "yesterday at 22:21" - the 24-hour
     clock, not the prototype's 12-hour one. Fixed with the same "hourOfDay" trick
     what-the-end-of-a-check-in-can-say.ts's aTime() already uses. */
  it('today, yesterday, or a date', () => {
    const now = new Date(2026, 8, 26, 12, 0)
    expect(whenItWasAsked(new Date(2026, 8, 26, 9, 5).toISOString(), now)).toBe('today at 9:05am')
    expect(whenItWasAsked(new Date(2026, 8, 25, 16, 12).toISOString(), now)).toBe('yesterday at 4:12pm')
    expect(whenItWasAsked(new Date(2026, 8, 20, 16, 12).toISOString(), now)).toBe('on 20 September at 4:12pm')
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
