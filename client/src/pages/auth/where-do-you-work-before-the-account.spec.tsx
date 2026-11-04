import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { MagicVerifyPage } from './MagicVerifyPage'
import { authApi } from '@/api/auth'
import { entryApi } from '@/api/entry'

/**
 * "WHERE DO YOU WORK?" WHEN THE EMAIL IS CONFIRMED, BEFORE ANY ACCOUNT EXISTS (U.3 review).
 *
 * When an organisation lets the confirmed address's domain join, or the invite link they came from
 * could not take them, the server makes nothing and asks first. What the person reads, and what
 * each button sends.
 */
vi.mock('@/api/auth', () => ({ authApi: { verifyEmail: vi.fn() } }))
vi.mock('@/api/entry', () => ({ entryApi: { commit: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { list: vi.fn().mockResolvedValue([]) } }))
const navigated = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigated }
})

let n = 0
function open() {
  n += 1
  const token = `choose-${n}`
  const view = render(
    <MemoryRouter initialEntries={[`/verify-email?token=${token}`]}>
      <Routes><Route path="/verify-email" element={<MagicVerifyPage />} /></Routes>
    </MemoryRouter>,
  )
  return { ...view, token }
}
const readable = (el: HTMLElement) => (el.textContent ?? '').replace(/\s+/g, ' ').trim()
const user = { id: 'u1', email: 'ama@coamana.test', role: 'MEMBER', jobTitle: null } as any

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  vi.mocked(entryApi.commit).mockRejectedValue({ response: { data: { message: 'NO_ENTRY_SESSION' } } })
})

/* "Your email is confirmed" comes first, then "Where do you work?" (the natural order). */
async function pastTheConfirmation() {
  expect(await screen.findByRole('heading', { name: 'Your email is confirmed' })).toBeTruthy()
  expect(screen.getByText(/sign-in links and reports to/).textContent).toBe('I’ll send sign-in links and reports to ama@coamana.test.')
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  await screen.findByRole('heading', { name: 'Where do you work?' })
}

describe('an organisation lets their domain join', () => {
  beforeEach(() => {
    vi.mocked(authApi.verifyEmail).mockResolvedValueOnce({ email: 'ama@coamana.test', whereDoYouWork: { byDomain: [{ id: 'o-c', name: 'Coamana', domain: 'coamana.test' }] } } as any)
  })

  it('reads as the prototype\'s "Where do you work?", with no head count, after "Your email is confirmed"', async () => {
    const { container } = open()
    await pastTheConfirmation()
    expect(readable(container)).toBe([
      'Groundwork',
      'Where do you work?',
      'Join an organisation you belong to, or create a new one. You can be in more than one and switch between them.',
      'CO', 'Coamana', 'Anyone with an @coamana.test email can join.', 'Join',
      '+', 'Create a new organisation', 'For a team that isn’t on Groundwork yet.', 'Create',
    ].join(''))
  })

  it('"Join" sends the same link with that organisation, then goes on, without confirming twice', async () => {
    const { token } = open()
    await pastTheConfirmation()
    vi.mocked(authApi.verifyEmail).mockResolvedValueOnce({ user, accessToken: 't', justCreated: true, next: '/today' } as any)
    fireEvent.click(screen.getByRole('button', { name: 'Join Coamana' }))
    await waitFor(() => expect(navigated).toHaveBeenCalledWith('/today', { replace: true }))
    expect(authApi.verifyEmail).toHaveBeenLastCalledWith(token, { joinOrganizationId: 'o-c' })
    expect(screen.queryByRole('heading', { name: 'Your email is confirmed' })).toBeNull()
  })

  it('"Create" sends the same link asking for their own organisation, and lands on its Today (U.3 re-review)', async () => {
    const { token } = open()
    await pastTheConfirmation()
    vi.mocked(authApi.verifyEmail).mockResolvedValueOnce({ user: { ...user, role: 'ADMIN' }, accessToken: 't', justCreated: true, next: '/today' } as any)
    sessionStorage.setItem('gw-just-signed-in', '1')
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    await waitFor(() => expect(navigated).toHaveBeenCalledWith('/today', { replace: true }))
    expect(authApi.verifyEmail).toHaveBeenLastCalledWith(token, { createMyOwn: true })
    /* Not sent round to "Where do you work?" again by the first page after signing in. */
    expect(sessionStorage.getItem('gw-just-signed-in')).toBeNull()
    expect(navigated).not.toHaveBeenCalledWith('/welcome', expect.anything())
  })

  it('a refusal is said on the card, which stays', async () => {
    open()
    await pastTheConfirmation()
    vi.mocked(authApi.verifyEmail).mockRejectedValueOnce({ response: { data: { message: 'Coamana has no room for another person on its plan right now. Ask an admin there to make room, or to invite you when there is.' } } })
    fireEvent.click(await screen.findByRole('button', { name: 'Join Coamana' }))
    expect(await screen.findByText('Coamana has no room for another person on its plan right now. Ask an admin there to make room, or to invite you when there is.')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Where do you work?' })).toBeTruthy()
  })
})

describe('the invite link they came from was turned off', () => {
  it('says so, and offers only "Create a new organisation"', async () => {
    vi.mocked(authApi.verifyEmail).mockResolvedValueOnce({ email: 'ama@coamana.test', whereDoYouWork: { byDomain: [], problem: 'That invite link is not open any more. Ask whoever sent it for the new one.' } } as any)
    const { container } = open()
    await pastTheConfirmation()
    expect(readable(container)).toContain('That invite link is not open any more. Ask whoever sent it for the new one.')
    expect(screen.queryByRole('button', { name: /^Join/ })).toBeNull()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Create' })).toBeTruthy())
  })
})
