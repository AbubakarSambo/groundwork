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
import { reportsApi } from '@/api/reports'

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

  it('the sessions tile, but not the promises-kept tile while nothing has settled this month', async () => {
    mount()
    expect(await screen.findByText('1 of 12')).toBeTruthy()
    /* Changed from "check-ins of 12" (re-review): it repeated the number already shown above it -
       "1 of 12" over "check-ins of 12" - and read as a clipped fragment. "sessions so far" says
       what the tile counts without saying the number twice.
       UPDATED FOR B-147: "check-ins so far" was itself the one-check-ins-mean-sessions mistake the
       audit found repeated across the product - this tile counts SESSIONS of the one check-in,
       not separate check-ins, so "session" (the product's one word for that) replaces it. */
    expect(screen.getByText('sessions so far')).toBeTruthy()
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

  /*
   * RE-REVIEW BUG: "…on Wednesday 30 September to show them the fridges (on Wednesday 30
   * September)" repeated the commitment's own date, because `whenSaid` was always appended in
   * brackets whatever the text already said. And "send them the price list (the same day)" was a
   * bracket, not a sentence, with no capital letter. Both are fixed together: the timing is only
   * added when the line does not already say it, and it reads as its own capitalised sentence.
   */
  it('does not repeat a date the commitment already states', async () => {
    mount({
      ground: {
        label: 'Sales team, Q3',
        commitments: [
          { id: 'c1', participantId: 'p1', text: 'Meet Baridi on Wednesday 30 September to show them the fridges', status: 'DONE', whenSaid: 'on Wednesday 30 September' },
        ],
      },
    })
    await screen.findByText('What you said you’d do')
    expect(screen.getByText('Meet Baridi on Wednesday 30 September to show them the fridges')).toBeTruthy()
    expect(screen.queryByText('(on Wednesday 30 September)')).toBeNull()
    expect(screen.queryByText('On Wednesday 30 September.')).toBeNull()
  })

  it('gives the timing its own capitalised sentence when the line does not already say it', async () => {
    mount({
      ground: {
        label: 'Sales team, Q3',
        commitments: [
          { id: 'c1', participantId: 'p1', text: 'send them the price list', status: 'UNKNOWN', whenSaid: 'the same day' },
        ],
      },
    })
    await screen.findByText('What you said you’d do')
    expect(screen.getByText('Send them the price list')).toBeTruthy()
    expect(screen.getByText('The same day.')).toBeTruthy()
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

  /*
   * GROUP 3'S REVIEW, BATCH A FAULT 6: "AMANI WEKESA SAID, 'I AM AIMING...'" ABOUT HIMSELF.
   * `WhatSuccessLooksLikeFor` (inside "What success looks like") says "You" only where a row's
   * `who` equals the `yourName` it is passed - YourWork used to pass the literal string "You",
   * which a real name never equals, so the reader always read their own name back at themselves.
   */
  it('reads "You said" on the reader\'s own row, not their own name back at them', async () => {
    vi.mocked(reportsApi.againstSuccess).mockResolvedValue({
      sides: 'everyone',
      spokenTo: { count: 0, of: 0 },
      conditions: [],
      stated: null,
      saying: 'Nobody has said what good looks like yet.',
      definitions: [{ who: 'Amani Wekesa', text: 'I am aiming for 3 shops in Kilimani' }],
    } as any)
    mount({ myName: 'Amani Wekesa', leadFirstName: 'Rukia' })
    await screen.findByText(/I am aiming for 3 shops in Kilimani/)
    const row = screen.getByText(/I am aiming for 3 shops in Kilimani/).closest('div')
    expect(row?.textContent).toBe('You said, “I am aiming for 3 shops in Kilimani”')
  })
})

/**
 * B-080: A LEAD WHO ONLY MANAGES IS NOT GIVEN A SESSION COUNT OF HER OWN. Grace runs her check-in
 * and never checks in, so "0 of 4" would never move and "This appears once you finish your first
 * check-in." would never stop being true. She reads what she does instead.
 */
describe('a lead who only manages', () => {
  it('reads what she does, never a session count of her own', async () => {
    mount({ myParticipant: { id: 'p1', managingOnly: true, objective: { all: [] } }, totalSessions: 4, completedCount: 0 })
    expect(await screen.findByText('You run this check-in and do not check in yourself.')).toBeTruthy()
    expect(screen.queryByText('0 of 4')).toBeNull()
    expect(screen.queryByText('check-ins so far')).toBeNull()
    expect(screen.queryByText('This appears once you finish your first check-in.')).toBeNull()
  })

  it('a lead who does check in still reads her own count', async () => {
    mount({ myParticipant: { id: 'p1', managingOnly: false, objective: { all: [] } }, totalSessions: 4, completedCount: 0 })
    expect(await screen.findByText('0 of 4')).toBeTruthy()
  })
})
