import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelpModal } from './HelpModal'
import { useAuthStore } from '@/stores/auth'
import { useHelpStore } from '@/stores/help'

/**
 * WALKTHROUGH PASS 2, ITEM 1: Help said something different from Hafsah's privacy decisions.
 *
 * "Nobody sees anybody else's answers, including you" was not true: what somebody says in a
 * check-in can be shown, word for word, to the other people in that check-in, once the report is
 * ready. This checks the corrected sentence is what is actually on screen, and that the false one
 * is gone for good.
 *
 * It also checks that "Start a check-in" is only offered to somebody the server would actually let
 * start one - telling everybody else points them at a page that refuses them.
 */
function mount(user: Record<string, unknown> | null) {
  useAuthStore.setState({ user, token: user ? 't' : null, isAuthenticated: !!user } as any)
  useHelpStore.setState({ open: true, tab: 0 })
  return render(
    <MemoryRouter>
      <HelpModal />
    </MemoryRouter>,
  )
}

describe('the help window matches what the product actually does with your answers', () => {
  beforeEach(() => useHelpStore.setState({ open: false, tab: 0 }))

  it('never claims nobody sees anybody else\'s answers', () => {
    mount({ id: 'u1', role: 'LEAD', mayOpenCheckIns: true })
    expect(screen.queryByText(/Nobody sees anybody else's answers/)).not.toBeInTheDocument()
    expect(screen.getByText(/What you say can be shown, word for word, to the other people in your check-in/)).toBeInTheDocument()
  })

  it('offers "Start a check-in" to somebody who may start one', () => {
    mount({ id: 'u1', role: 'LEAD', mayOpenCheckIns: true })
    expect(screen.getByText('1. Start a check-in')).toBeInTheDocument()
  })

  it('does not offer "Start a check-in" to somebody who may not', () => {
    mount({ id: 'u2', role: 'MEMBER', mayOpenCheckIns: false })
    expect(screen.queryByText('1. Start a check-in')).not.toBeInTheDocument()
    expect(screen.getByText('Everyone answers on their own')).toBeInTheDocument()
  })

  it('calls it "When to use it", not "Use cases"', () => {
    mount({ id: 'u1', role: 'LEAD', mayOpenCheckIns: true })
    expect(screen.getByText('When to use it')).toBeInTheDocument()
    expect(screen.queryByText('Use cases')).not.toBeInTheDocument()
  })
})
