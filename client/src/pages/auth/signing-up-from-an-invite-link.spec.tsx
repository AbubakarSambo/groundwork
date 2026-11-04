import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthPage } from './AuthPage'
import { authApi } from '@/api/auth'

/**
 * SIGNING UP OR SIGNING IN FROM AN ORGANISATION'S INVITE LINK (U.3 review).
 *
 * "Join Coamana" on /j/coamana-6rr7 goes to /auth?mode=signup&next=/j/coamana-6rr7. The link that
 * arrives by email has no `next`, so the place goes to the server with the request, and comes back
 * when the link is opened.
 */
vi.mock('@/api/auth', () => ({
  authApi: { entrySave: vi.fn(), login: vi.fn(), forgotPassword: vi.fn(), methods: vi.fn(), nameFromAddress: vi.fn() },
}))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ setAuth: vi.fn() }) }))
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

function renderAuth(search: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/auth${search}`]}>
        <Routes><Route path="/auth" element={<AuthPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const FROM_THE_LINK = `?mode=signup&next=${encodeURIComponent('/j/coamana-6rr7')}`

beforeEach(() => {
  vi.clearAllMocks()
  ;(authApi.methods as any).mockResolvedValue({ magicLink: true, google: false })
  ;(authApi.entrySave as any).mockResolvedValue({ message: 'ok', email: 'x' })
  ;(authApi.nameFromAddress as any).mockResolvedValue({ name: 'Coamana' })
})

describe('the place they were going goes with the link', () => {
  it('creating an account from the invite link sends the invite link with it', async () => {
    renderAuth(FROM_THE_LINK)
    fireEvent.change(await screen.findByLabelText('Your name'), { target: { value: 'Ama' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ama@coamana.test' } })
    fireEvent.click(screen.getByRole('button', { name: /^Create account$/ }))
    await waitFor(() => expect(authApi.entrySave).toHaveBeenCalled())
    expect((authApi.entrySave as any).mock.calls[0][4]).toBe('/j/coamana-6rr7')
  })

  it('asking for a sign-in link from the invite link sends it too', async () => {
    renderAuth(`?next=${encodeURIComponent('/j/coamana-6rr7')}`)
    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'ama@coamana.test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Email me a sign-in link instead' }))
    await screen.findByText('Check your email')
    expect(authApi.entrySave).toHaveBeenCalledWith('ama@coamana.test', undefined, '', undefined, '/j/coamana-6rr7')
  })

  it('an outside address in the query string is never sent', async () => {
    renderAuth(`?next=${encodeURIComponent('//evil.test/x')}`)
    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'ama@coamana.test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Email me a sign-in link instead' }))
    await screen.findByText('Check your email')
    expect(authApi.entrySave).toHaveBeenCalledWith('ama@coamana.test', undefined, '')
  })
})

describe('the sign-up reached from an invite link asks for no organisation', () => {
  const readable = (el: HTMLElement) => (el.textContent ?? '').replace(/\s+/g, ' ').trim()

  it('has no organisation box and suggests none, and sends no organisation name', async () => {
    const { container } = renderAuth(FROM_THE_LINK)
    fireEvent.change(await screen.findByLabelText('Your name'), { target: { value: 'Ama' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ama@coamana.test' } })
    expect(screen.queryByLabelText('Your organisation (optional)')).toBeNull()
    expect(readable(container)).not.toMatch(/organisation will be called|suggested this from your email/)
    expect(authApi.nameFromAddress).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /^Create account$/ }))
    await waitFor(() => expect(authApi.entrySave).toHaveBeenCalled())
    expect((authApi.entrySave as any).mock.calls[0][1]).toEqual({ payload: { firstName: 'Ama' } })
  })

  it('a plain sign-up still asks, and suggests the name from the address', async () => {
    renderAuth('?mode=signup')
    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'ama@coamana.test' } })
    await waitFor(() => expect((screen.getByLabelText('Your organisation (optional)') as HTMLInputElement).value).toBe('Coamana'))
    expect(screen.getByText('I suggested this from your email address. You can change it now or later.')).toBeTruthy()
  })
})
