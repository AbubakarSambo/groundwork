import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SetPasswordPage } from './SetPasswordPage'
import { authApi } from '@/api/auth'

/**
 * WHERE THE PASSWORD PAGE SENDS PEOPLE NEXT.
 *
 * The lead invite email says "review the ground I set up for you". Setting the
 * password then dropped the lead on the whole grounds list, because `next` was
 * read by this page and passed by nobody. `grounds.service.ts` now sends
 * `next=/grounds/{id}`.
 *
 * The same query parameter is the reason for the second half of this file. It
 * comes off a URL, so anyone can put anything in it, and this page is one we
 * email to people who are about to type a password.
 */

vi.mock('@/api/auth', () => ({ authApi: { setPassword: vi.fn() } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ setAuth: vi.fn() }) }))

const mockedNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockedNavigate }
})

async function setPasswordWith(next: string) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
    <MemoryRouter initialEntries={[`/set-password?token=tok123${next ? `&next=${encodeURIComponent(next)}` : ''}`]}>
      <Routes>
        <Route path="/set-password" element={<SetPasswordPage />} />
      </Routes>
    </MemoryRouter>
    </QueryClientProvider>,
  )
  const [pw, confirm] = screen.getAllByPlaceholderText(/characters|Same as above/i)
  fireEvent.change(pw, { target: { value: 'Passw0rdish' } })
  fireEvent.change(confirm, { target: { value: 'Passw0rdish' } })
  fireEvent.click(screen.getByRole('button', { name: /Set password/i }))
  await waitFor(() => expect(mockedNavigate).toHaveBeenCalled())
  return mockedNavigate.mock.calls[0][0]
}

beforeEach(() => {
  mockedNavigate.mockReset()
  ;(authApi.setPassword as any).mockResolvedValue({ user: { id: 'u1' }, accessToken: 'a' })
})

describe('the lead lands on the ground they were invited to', () => {
  it('follows next when it is a path in this app', async () => {
    expect(await setPasswordWith('/grounds/g-123')).toBe('/grounds/g-123')
  })

  it('and still has a sensible default when nothing asked for one', async () => {
    expect(await setPasswordWith('')).toBe('/grounds?welcome=1')
  })
})

describe('next cannot send anybody off the product', () => {
  it('ignores an absolute URL', async () => {
    expect(await setPasswordWith('https://evil.example/steal')).toBe('/grounds?welcome=1')
  })

  it('ignores a protocol-relative one, which is the easy miss', async () => {
    // "//evil.example" starts with a slash. A naive startsWith('/') check passes
    // it, and the browser treats it as another origin.
    expect(await setPasswordWith('//evil.example')).toBe('/grounds?welcome=1')
  })
})
