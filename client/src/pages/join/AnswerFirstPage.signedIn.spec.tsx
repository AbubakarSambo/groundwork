import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AnswerFirstPage } from './AnswerFirstPage'
import { useAuthStore } from '@/stores/auth'

/**
 * B-207 (review round 2): A BROKEN /answer LINK, SIGNED IN, DOES NOT OFFER "SIGN IN".
 *
 * "Sign in, or go to the Groundwork home page." used to be shown even to somebody already signed
 * in, both of which lead away from the product they are already using. Today is where they belong.
 */
vi.mock('@/api/entry', () => ({ openLinkApi: { whatThisIs: vi.fn(), start: vi.fn(), say: vi.fn(), finish: vi.fn() } }))

function open(path: string) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes><Route path="/answer" element={<AnswerFirstPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => { useAuthStore.setState({ isAuthenticated: false, user: null, token: null } as any) })

describe('a link with no code at all, signed in', () => {
  it('offers "Go to Today" instead of "Sign in" or the marketing page', async () => {
    useAuthStore.setState({ isAuthenticated: true, user: { id: 'u1' }, token: 't' } as any)
    open('/answer')
    await waitFor(() => expect(screen.getByText('That link is missing its code.')).toBeTruthy())
    expect(screen.getByRole('button', { name: 'Go to Today' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Sign in' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'go to the Groundwork home page' })).toBeNull()
  })
})
