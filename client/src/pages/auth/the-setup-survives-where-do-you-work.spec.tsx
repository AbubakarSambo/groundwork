import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { MagicVerifyPage } from './MagicVerifyPage'
import { authApi } from '@/api/auth'
import { entryApi } from '@/api/entry'

/**
 * THE SAVE CARD'S PROMISE, KEPT THROUGH "WHERE DO YOU WORK?" (U.6 review).
 *
 * Read live, signed out: the save card said "...opening it saves your check-in and sends the 1
 * invite.", then the link, "Where do you work?", "Choose a password", Today, and no check-in had been
 * saved and nobody was invited. The server answers "Where do you work?" with "go on to Today", and
 * the page treated that as somewhere to go instead of saving. This walks the whole path.
 */
vi.mock('@/api/auth', () => ({ authApi: { verifyEmail: vi.fn() } }))
vi.mock('@/api/entry', () => ({ entryApi: { commit: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { list: vi.fn().mockResolvedValue([]) } }))
const navigated = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigated }
})

const PAYLOAD = {
  groundLabel: 'Daniel, the next six weeks',
  scenario: 'PIP',
  cadence: 'WEEKLY',
  history: [{ role: 'user', content: 'He joined in July.' }],
  contributors: [{ email: 'daniel@x.test' }],
}
let n = 0
function open() {
  n += 1
  return render(
    <MemoryRouter initialEntries={[`/verify-email?token=keep-${n}`]}>
      <Routes><Route path="/verify-email" element={<MagicVerifyPage />} /></Routes>
    </MemoryRouter>,
  )
}
const lead = { id: 'u1', email: 'hafsah@x.test', role: 'ADMIN', jobTitle: null } as any

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  /* What the save card leaves behind before the link is opened. */
  localStorage.setItem('gw_commit_payload', JSON.stringify(PAYLOAD))
  localStorage.setItem('gw_draft_token', 'draft-1')
  vi.mocked(entryApi.commit).mockResolvedValue({ groundId: 'g-daniel', joinToken: 'j', contributors: [{ email: 'daniel@x.test' }], failedInvites: [] } as any)
  vi.mocked(authApi.verifyEmail).mockResolvedValueOnce({ email: 'hafsah@x.test', whereDoYouWork: { byDomain: [{ id: 'o-x', name: 'X Ltd', domain: 'x.test' }] } } as any)
})

async function answerWhereDoYouWork(button: string) {
  expect(await screen.findByRole('heading', { name: 'Your email is confirmed' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  await screen.findByRole('heading', { name: 'Where do you work?' })
  vi.mocked(authApi.verifyEmail).mockResolvedValueOnce({ user: lead, accessToken: 't', justCreated: true, next: '/today', needsPassword: true, passwordSetupToken: 'pw' } as any)
  fireEvent.click(screen.getByRole('button', { name: button }))
}

describe('the setup, after "Where do you work?"', () => {
  it.each([['Create'], ['Join X Ltd']])('"%s" saves the check-in and sends its invitation', async (button) => {
    open()
    await answerWhereDoYouWork(button)
    await waitFor(() => expect(entryApi.commit).toHaveBeenCalledTimes(1))
    expect(vi.mocked(entryApi.commit).mock.calls[0][0]).toMatchObject({ groundLabel: 'Daniel, the next six weeks', contributors: [{ email: 'daniel@x.test' }] })
    /* Group 3, piece 1: the two old separate lines are now one plain sentence, in the shared
       Callout - "Your check-in is set up. Your session is saved and you are signed in." - so this
       matches the sentence it is now part of, rather than the whole node's exact old text. */
    expect(await screen.findByText(/Your check-in is set up\./)).toBeTruthy()
    expect(screen.getByText('daniel@x.test')).toBeTruthy()
    /* And not sent to Today with nothing saved. */
    expect(navigated).not.toHaveBeenCalledWith('/today', expect.anything())
  })

  it('with nothing to save, still goes on to Today by way of choosing a password', async () => {
    localStorage.clear()
    vi.mocked(entryApi.commit).mockRejectedValue({ response: { data: { message: 'NO_ENTRY_SESSION' } } })
    open()
    await answerWhereDoYouWork('Create')
    await waitFor(() => expect(navigated).toHaveBeenCalledWith('/set-password?token=pw&next=%2Ftoday', { replace: true }))
  })
})
