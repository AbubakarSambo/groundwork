import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

/** "Team also complained about not knowing when the next sessions will start" (Hafsah, 22 Sep 2026). */
let status: any
vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: status }) }))
vi.mock('@/api/grounds', () => ({ groundsApi: { getMyCheckinStatus: vi.fn() } }))
import { YourNextCheckIn } from './YourNextCheckIn'

describe('when the next one opens, said where a person has just finished', () => {
  it('names the day, and that an email comes that day, with no session number', () => {
    const inTenDays = new Date(Date.now() + 10 * 86_400_000).toISOString()
    status = { checkIns: [{ id: 'a', sessionNumber: 1, status: 'COMPLETED', completedAt: 'x' }, { id: 'b', sessionNumber: 2, status: 'NOT_STARTED', completedAt: null, availableFrom: inTenDays }] }
    render(<YourNextCheckIn groundId="g1" />)
    expect(screen.getByText(/Your next check-in opens on/)).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/session/i)
    expect(screen.getByText(/You will get an email that day/)).toBeTruthy()
  })

  it('says when there is no next one', () => {
    status = { checkIns: [{ id: 'a', sessionNumber: 3, status: 'COMPLETED', completedAt: 'x' }] }
    render(<YourNextCheckIn groundId="g1" />)
    expect(screen.getByText('That was the last check-in planned.')).toBeTruthy()
  })

  it('and the finished screen and the one-line end both carry it', async () => {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    expect(readFileSync(join(__dirname, 'TheReportIsComing.tsx'), 'utf8')).toContain('<YourNextCheckIn groundId={groundId} />')
  })
})
