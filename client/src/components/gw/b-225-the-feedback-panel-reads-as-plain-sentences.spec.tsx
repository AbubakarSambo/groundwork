import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from './AppShell'
import { useAuthStore } from '@/stores/auth'
import { useFeedbackStore } from '@/stores/feedback'

/**
 * B-225 (REVIEW 4): THE FEEDBACK PANEL USED CLIPPED WORDING.
 *
 * "Build request" is work jargon (docs/morning-report-ui.md already named it and suggested
 * "Something you would like", which this uses); "Email (optional - if you want a reply)" read as
 * a label fragment rather than something a person would actually say. Both tabs that ask for an
 * email now read "Your email, if you'd like a reply".
 */
const USER = { id: 'u1', email: 'aisha@x.test', firstName: 'Aisha', role: 'MEMBER', organizationName: 'Mawe' }

function mount() {
  useAuthStore.setState({ user: USER, token: 't', isAuthenticated: true } as any)
  useFeedbackStore.setState({ open: true })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  qc.setQueryData(['my-waiting'], { waiting: false })
  qc.setQueryData(['grounds'], [])
  qc.setQueryData(['my-organizations'], [])
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/today']}><AppShell><div>page content</div></AppShell></MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the feedback panel reads as plain sentences', () => {
  it('names the middle tab "Something you would like", not "Build request"', () => {
    mount()
    expect(screen.getByRole('button', { name: 'Something you would like' })).toBeTruthy()
    expect(screen.queryByText('Build request')).toBeNull()
  })

  it('asks for an email in a full phrase, on the "something went wrong" tab', () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Something went wrong' }))
    expect(screen.getByPlaceholderText("Your email, if you'd like a reply")).toBeTruthy()
    expect(screen.queryByPlaceholderText('Email (optional - if you want a reply)')).toBeNull()
  })

  it('asks for an email in a full phrase, on the "reaction" tab (the one shown on arrival)', () => {
    mount()
    expect(screen.getByPlaceholderText("Your email, if you'd like a reply")).toBeTruthy()
  })
})
