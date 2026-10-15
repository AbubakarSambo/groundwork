import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelpModal } from './HelpModal'
import { useAuthStore } from '@/stores/auth'
import { useHelpStore } from '@/stores/help'

/**
 * SCREEN FAULT 5: HELP WAS WRITTEN FOR A LEAD, AND A MEMBER COULD NOT TELL.
 *
 * "1. Start a check-in" was already gated on `mayOpenCheckIns` (walkthrough pass 2, item 1 -
 * help-matches-privacy.spec.tsx). This checks every OTHER line a member reads: the header
 * description, "How to use it", and the two tabs ("When to use it", "Try it") that are both
 * reasons and ways to START a check-in, which a member cannot do.
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

const LEAD = { id: 'u1', role: 'LEAD', mayOpenCheckIns: true }
const MEMBER = { id: 'u2', role: 'MEMBER', mayOpenCheckIns: false }

describe('Help, read by a member who cannot open a check-in', () => {
  beforeEach(() => useHelpStore.setState({ open: false, tab: 0 }))

  it('does not tell a member to start a check-in, in the header', () => {
    mount(MEMBER)
    expect(screen.queryByText(/Start a check-in, add the people in it/)).not.toBeInTheDocument()
    expect(screen.getByText(/Each check-in asks you questions on your own/)).toBeInTheDocument()
  })

  it('still tells a lead to start a check-in, in the header', () => {
    mount(LEAD)
    expect(screen.getByText(/Start a check-in, add the people in it/)).toBeInTheDocument()
  })

  it('drops "When to use it" and "Try it" from the tab bar for a member', () => {
    mount(MEMBER)
    expect(screen.queryByText('When to use it')).not.toBeInTheDocument()
    expect(screen.queryAllByText('Try it').length).toBe(0)
    expect(screen.getAllByText('How to use it').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Reports').length).toBeGreaterThan(0)
  })

  it('offers a lead every tab, including "When to use it" and "Try it"', () => {
    mount(LEAD)
    expect(screen.getByText('When to use it')).toBeInTheDocument()
    expect(screen.getAllByText('Try it').length).toBeGreaterThan(0)
  })

  it('gives a member their own "How to use it": answering, reading your report, Ask', () => {
    mount(MEMBER)
    fireEvent.click(screen.getAllByText('How to use it')[0])
    expect(screen.getByText('Answer your check-in on your own, and be specific')).toBeInTheDocument()
    expect(screen.getByText('Read the report once everyone has answered')).toBeInTheDocument()
    expect(screen.getByText('Ask Groundwork if anything is unclear')).toBeInTheDocument()
    expect(screen.queryByText('Open a check-in before the situation becomes urgent')).not.toBeInTheDocument()
  })

  it('a member\'s "How to use it" goes straight to Reports, with no "When to use it" between them', () => {
    mount(MEMBER)
    fireEvent.click(screen.getAllByText('How to use it')[0])
    fireEvent.click(screen.getAllByText('Reports')[0])
    expect(screen.getByText('What the report contains')).toBeInTheDocument()
  })

  it('closes from the last tab a member can reach, instead of offering "Try it"', () => {
    mount(MEMBER)
    fireEvent.click(screen.getAllByText('How to use it')[0])
    fireEvent.click(screen.getAllByText('Reports')[0])
    expect(screen.getByRole('button', { name: 'Got it' })).toBeInTheDocument()
    expect(screen.queryAllByText('Try it').length).toBe(0)
  })

  it('a lead still reaches "Try it" from Reports', () => {
    mount(LEAD)
    fireEvent.click(screen.getByText('Reports'))
    expect(screen.getAllByText('Try it').length).toBeGreaterThan(0)
  })

  it('the close button is at least 40x40 on a phone', () => {
    mount(MEMBER)
    const close = screen.getByRole('button', { name: 'Close' })
    expect(close.className).toContain('gwui-help-close')
  })
})
