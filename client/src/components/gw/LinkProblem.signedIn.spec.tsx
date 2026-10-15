import { describe, it, expect, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LinkProblem } from './LinkProblem'
import { useAuthStore } from '@/stores/auth'

/**
 * B-207 / B-209 (review round 2): SOMEBODY ALREADY SIGNED IN IS NOT OFFERED "SIGN IN".
 *
 * LinkProblem's one button used to send a signed-in reader to /auth anyway ("Sign in instead" for
 * `invite`/`join`, "Get a new link" for `sign-in`), as if nothing about them being signed in
 * mattered - read live on /join?t=<broken> and /answer?t=<broken>. Today is where they already
 * belong; /auth would only sign them back into the account they already hold.
 */
describe('LinkProblem, signed in', () => {
  afterEach(() => { useAuthStore.setState({ isAuthenticated: false, user: null, token: null } as any) })

  it('offers "Go to Today" instead of "Sign in instead" for an invite link', () => {
    useAuthStore.setState({ isAuthenticated: true, user: { id: 'u1' }, token: 't' } as any)
    render(<MemoryRouter><LinkProblem kind="invite" /></MemoryRouter>)
    expect(screen.getByRole('button', { name: 'Go to Today' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Sign in instead' })).toBeNull()
  })

  it('offers "Go to Today" instead of "Sign in instead" for a join link', () => {
    useAuthStore.setState({ isAuthenticated: true, user: { id: 'u1' }, token: 't' } as any)
    render(<MemoryRouter><LinkProblem kind="join" /></MemoryRouter>)
    expect(screen.getByRole('button', { name: 'Go to Today' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Sign in instead' })).toBeNull()
  })

  it('offers "Go to Today" instead of "Get a new link" for a sign-in link', () => {
    useAuthStore.setState({ isAuthenticated: true, user: { id: 'u1' }, token: 't' } as any)
    render(<MemoryRouter><LinkProblem kind="sign-in" /></MemoryRouter>)
    expect(screen.getByRole('button', { name: 'Go to Today' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Get a new link' })).toBeNull()
  })

  it('signed out, keeps the original buttons', () => {
    render(<MemoryRouter><LinkProblem kind="invite" /></MemoryRouter>)
    expect(screen.getByRole('button', { name: 'Sign in instead' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Go to Today' })).toBeNull()
  })
})
