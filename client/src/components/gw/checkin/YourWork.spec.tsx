import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { YourWork } from './YourWork'

/**
 * "YOUR WORK" (B3, docs/prototype/screens/B3-the-check-in/my-record.jpg/.txt), REVIEW ROUND 3'S
 * FULL REBUILD: no sub-tabs, the prototype's own sections, each filled from what's served and
 * not drawn when nothing is.
 */
vi.mock('@/api/grounds', () => ({
  groundsApi: {
    myTranscript: vi.fn().mockResolvedValue({ sessions: [] }),
    myDeliveries: vi.fn().mockResolvedValue([]),
    setMySoloReportShared: vi.fn(),
  },
}))
vi.mock('@/api/reports', () => ({ reportsApi: { againstSuccess: vi.fn().mockResolvedValue(null) } }))

function mount(overrides: Partial<Parameters<typeof YourWork>[0]> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const props = {
    groundId: 'g1',
    ground: { label: 'Sales team, Q3', commitments: [] },
    myRecord: { insightsLocked: true, patterns: null },
    mySoloReport: { report: null, shared: false },
    refetchSoloReport: () => {},
    specificity: null,
    report: null,
    totalSessions: 12,
    completedCount: 1,
    myFinishedSessions: [],
    sessionDots: [],
    myParticipant: { id: 'p1', managingOnly: false, objective: { all: [] } },
    otherParties: [],
    aTeamReportComes: false,
    ...overrides,
  }
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><YourWork {...(props as any)} /></MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Your work', () => {
  it('the title and subtitle, without the pattern clause while there is no pattern', async () => {
    mount()
    expect(await screen.findByRole('heading', { name: 'Your work' })).toBeTruthy()
    expect(screen.getByText('Everything you’ve said, and what the proof shows. Only you see this page.')).toBeTruthy()
    expect(screen.queryByText(/apart from the pattern below/)).toBeNull()
  })

  it('the check-ins tile, but not the promises-kept tile while nothing has settled this month', async () => {
    mount()
    expect(await screen.findByText('1 of 12')).toBeTruthy()
    expect(screen.getByText('check-ins of 12')).toBeTruthy()
    expect(screen.queryByText(/promises kept this month/)).toBeNull()
  })

  it('"What you said you’d do", with the prototype’s two-state mark, when there are commitments', async () => {
    mount({
      ground: {
        label: 'Sales team, Q3',
        commitments: [
          { id: 'c1', participantId: 'p1', text: 'Send Green Mart the quote', status: 'DONE' },
          { id: 'c2', participantId: 'p1', text: 'Book a follow-up with Westgate Deli', status: 'UNKNOWN' },
        ],
      },
    })
    expect(await screen.findByText('What you said you’d do')).toBeTruthy()
    expect(screen.getByText('Send Green Mart the quote')).toBeTruthy()
    expect(screen.getByText('Book a follow-up with Westgate Deli')).toBeTruthy()
  })

  it('not drawn when there are no commitments for this reader', async () => {
    mount({ ground: { label: 'Sales team, Q3', commitments: [{ id: 'c1', participantId: 'someone-else', text: 'Not yours', status: 'DONE' }] } })
    await screen.findByRole('heading', { name: 'Your work' })
    expect(screen.queryByText('What you said you’d do')).toBeNull()
  })

  it('promises kept this month, once a commitment has settled this month', async () => {
    const now = new Date()
    mount({
      ground: {
        label: 'Sales team, Q3',
        commitments: [
          { id: 'c1', participantId: 'p1', text: 'a', status: 'DONE', settledAt: now.toISOString() },
          { id: 'c2', participantId: 'p1', text: 'b', status: 'NOT_DONE', settledAt: now.toISOString() },
        ],
      },
    })
    expect(await screen.findByText('1/2')).toBeTruthy()
    expect(screen.getByText('promises kept this month')).toBeTruthy()
  })

  it('"Your reports", one row per finished session, and not drawn when there are none', async () => {
    const { rerender } = mount()
    expect(screen.queryByText('Your reports')).toBeNull()
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    rerender(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <YourWork
            groundId="g1"
            ground={{ label: 'Sales team, Q3', commitments: [] }}
            myRecord={{ insightsLocked: true, patterns: null }}
            mySoloReport={{ report: null, shared: false }}
            refetchSoloReport={() => {}}
            specificity={null}
            report={null}
            totalSessions={12}
            completedCount={1}
            myFinishedSessions={[{ id: 'ci1', sessionNumber: 1 }]}
            sessionDots={[]}
            myParticipant={{ id: 'p1', managingOnly: false, objective: { all: [] } }}
            otherParties={[]}
            aTeamReportComes={false}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(await screen.findByText('Your reports')).toBeTruthy()
    expect(screen.getByText('Session 1, your own')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Read' })).toHaveAttribute('href', '/checkin/ci1/report')
  })

  it('"Every session" and "Who has answered" only for the lead, as quiet links', async () => {
    mount()
    expect(screen.queryByRole('button', { name: 'Every session' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Who has answered' })).toBeNull()
    const onSeeEverySession = vi.fn()
    const onSeeRoster = vi.fn()
    mount({ onSeeEverySession, onSeeRoster })
    const everySession = await screen.findAllByRole('button', { name: 'Every session' })
    everySession[0].click()
    expect(onSeeEverySession).toHaveBeenCalled()
    const roster = screen.getAllByRole('button', { name: 'Who has answered' })
    roster[0].click()
    expect(onSeeRoster).toHaveBeenCalled()
  })
})
