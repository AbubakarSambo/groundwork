import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InvitePage } from './InvitePage'

/**
 * AN EXPIRED INVITATION (A3, #/join/expired), AS THE PERSON WHO OPENS IT READS IT. Wording from
 * join-expired.txt, with "14 days" (Hafsah, 26 September).
 */
const participantsApi = vi.hoisted(() => ({ preview: vi.fn(), accept: vi.fn(), freshLink: vi.fn() }))
vi.mock('@/api', () => ({ participantsApi }))
vi.mock('@/api/participants', () => ({ participantsApi }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ setAuth: vi.fn() }) }))

function open() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/invite?token=tok']}>
        <Routes><Route path="/invite" element={<InvitePage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => { vi.clearAllMocks() })

describe('an expired invitation', () => {
  it('reads as the prototype\'s card, naming only the lead', async () => {
    ;(participantsApi.preview as any).mockResolvedValue({ expired: true, leadFirstName: 'Wairimu' })
    open()
    expect(await screen.findByRole('heading', { name: 'This link has expired' })).toBeTruthy()
    expect(screen.getByText('Invitation links last 14 days. You don’t need a new invitation, just a fresh link.')).toBeTruthy()
    expect(screen.getByLabelText('Your email')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Send me a fresh link' })).toBeTruthy()
    expect(screen.getByText('If this isn’t the address Wairimu invited, ask them to add the right one. We don’t show who invited an address we don’t recognise.')).toBeTruthy()
  })

  it('sends what was typed with the token, and shows the server\'s one reply', async () => {
    ;(participantsApi.preview as any).mockResolvedValue({ expired: true, leadFirstName: 'Wairimu' })
    ;(participantsApi.freshLink as any).mockResolvedValue({ says: 'If that is the address the invitation went to, a fresh link is on its way. Open it from your email.' })
    open()
    fireEvent.change(await screen.findByLabelText('Your email'), { target: { value: ' Peter@Ouma-Agencies.test ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send me a fresh link' }))
    await waitFor(() => expect(participantsApi.freshLink).toHaveBeenCalledWith('tok', 'peter@ouma-agencies.test'))
    expect(await screen.findByText('If that is the address the invitation went to, a fresh link is on its way. Open it from your email.')).toBeTruthy()
  })

  it('an address that does not look right is said, and nothing is sent', async () => {
    ;(participantsApi.preview as any).mockResolvedValue({ expired: true, leadFirstName: null })
    open()
    fireEvent.change(await screen.findByLabelText('Your email'), { target: { value: 'peter@' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send me a fresh link' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('That address does not look right.')
    expect(participantsApi.freshLink).not.toHaveBeenCalled()
    expect(screen.getByText(/If this isn’t the address you were invited at, ask the person who invited you/)).toBeTruthy()
  })
})

/*
 * WALKTHROUGH PASS 2, ITEM 4: "This invite link is missing its token." described the bug in the
 * engineer's own terms, not plain words a person reads. Plain facts and a way through, same as
 * every other broken link in this family.
 */
describe('a link with nothing after /invite', () => {
  it('says plainly that the link is not complete, and offers a way through', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/invite']}>
          <Routes><Route path="/invite" element={<InvitePage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(await screen.findByText('This invitation link is not complete. Open the link from your email again.')).toBeTruthy()
    expect(screen.queryByText(/token/i)).toBeNull()
    expect(screen.getByRole('button', { name: 'Sign in instead' })).toBeTruthy()
  })
})

describe('a link we do not recognise', () => {
  /* UPDATED FOR B-158: the heading is now "That link didn't work" everywhere a link does not
     work (LinkProblem.tsx), the prototype's own wording (F4-small-states/badlink.txt) - it used
     to be "This invite link did not work" here and four other, different headings elsewhere for
     the same state. */
  it('says what to do once, not twice', async () => {
    ;(participantsApi.preview as any).mockRejectedValue({ response: { status: 404 } })
    open()
    expect(await screen.findByText('That link didn’t work')).toBeTruthy()
    const body = document.body.textContent ?? ''
    /* U.20 sixth round (Hafsah's first review): the page's own sentence changed - "sign in with
       your email - and if you have not, ask whoever added you to send a new invite." is now two
       full sentences, "If you have already joined, sign in with your email. If you have not, ask
       the person who added you for a new invitation." Still said once, not twice. */
    expect(body).toContain('ask the person who added you for a new invitation.')
    expect(body).not.toContain('Ask whoever invited you to send a new one')
  })
})
