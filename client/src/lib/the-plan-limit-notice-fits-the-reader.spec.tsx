import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { planLimitNotice } from './the-plan-limit-notice-fits-the-reader'

/**
 * B-127: a lead reading "Subscribe to open more. ... See plans" followed "See plans" into Plan and
 * billing only to be told "You need admin access to manage billing for your organisation." - a page
 * that refuses them. Only an admin may be offered that link; everyone else is told who can act,
 * with nothing to press that leads nowhere.
 */
describe('the plan-limit notice', () => {
  it('offers "See plans" to an admin', () => {
    render(<div>{planLimitNotice({
      reason: 'Your free plan includes 10 check-ins. Subscribe to open more.',
      isAdmin: true,
      continuation: 'You can still look around here, but this one cannot be created until then.',
      onSeePlans: vi.fn(),
    })}</div>)
    expect(screen.getByText('See plans')).toBeTruthy()
  })

  it('never offers "See plans" to a lead, and says who can act instead', () => {
    render(<div>{planLimitNotice({
      reason: 'Your free plan includes 10 check-ins. Subscribe to open more.',
      isAdmin: false,
      continuation: 'You can still look around here, but this one cannot be created until then.',
      onSeePlans: vi.fn(),
    })}</div>)
    expect(screen.queryByText('See plans')).toBeNull()
    expect(screen.getByText(/Your admin can choose a plan to open more\./)).toBeTruthy()
  })
})
