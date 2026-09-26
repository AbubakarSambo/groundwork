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
    expect(screen.getByLabelText('Email')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Send me a fresh link' })).toBeTruthy()
    expect(screen.getByText('If this isn’t the address Wairimu invited, ask them to add the right one. We don’t show who invited an address we don’t recognise.')).toBeTruthy()
  })

  it('sends what was typed with the token, and shows the server\'s one reply', async () => {
    ;(participantsApi.preview as any).mockResolvedValue({ expired: true, leadFirstName: 'Wairimu' })
    ;(participantsApi.freshLink as any).mockResolvedValue({ says: 'If that is the address the invitation went to, a fresh link is on its way. Open it from your email.' })
    open()
    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: ' Peter@Ouma-Agencies.test ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send me a fresh link' }))
    await waitFor(() => expect(participantsApi.freshLink).toHaveBeenCalledWith('tok', 'peter@ouma-agencies.test'))
    expect(await screen.findByText('If that is the address the invitation went to, a fresh link is on its way. Open it from your email.')).toBeTruthy()
  })

  it('an address that does not look right is said, and nothing is sent', async () => {
    ;(participantsApi.preview as any).mockResolvedValue({ expired: true, leadFirstName: null })
    open()
    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'peter@' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send me a fresh link' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('That address does not look right.')
    expect(participantsApi.freshLink).not.toHaveBeenCalled()
    expect(screen.getByText(/If this isn’t the address you were invited at, ask the person who invited you/)).toBeTruthy()
  })
})

describe('a link we do not recognise', () => {
  it('says what to do once, not twice', async () => {
    ;(participantsApi.preview as any).mockRejectedValue({ response: { status: 404 } })
    open()
    expect(await screen.findByText('This invite link did not work')).toBeTruthy()
    const body = document.body.textContent ?? ''
    expect(body).toContain('ask whoever added you to send a new invite.')
    expect(body).not.toContain('Ask whoever invited you to send a new one')
  })
})
