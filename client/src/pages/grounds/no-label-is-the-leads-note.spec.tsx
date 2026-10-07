import type { ReactElement } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundAdminPage } from './GroundAdminPage'
import { GroundParticipantPage } from './GroundParticipantPage'
import { groundsApi } from '@/api/grounds'
import { reportsApi } from '@/api/reports'
import { documentsApi } from '@/api/documents'
import { PRIVATE_NOTE, FRAGMENTS, whereTheNoteIs } from '@/test/the-leads-note-is-never-a-label'
import { whatYouCanJumpTo, matching } from '@/components/gw/what-you-can-jump-to'
import { howARowReads } from './how-a-row-reads'
import { stillToCheckIn } from '@/components/gw/TheReportIsAListOfSessions'

/**
 * THE CHECK-IN'S OWN PAGE NEVER NAMES SOMEBODY WITH THE LEAD'S NOTE. Request 36, 27 September 2026.
 *
 * Three people with no name, each with the lead's private note in `roleAsDescribed`. The label code
 * used to take the part before the dash ("Daniel9k2") as their name, and "a teammate" after that.
 * Rendered as the lead (the check-in's chat, Sessions and Context tabs) and as a participant (their
 * check-in, their record and Context): the names are the engine's plain words, and the note is
 * shown only to the lead, beside the name, as "Your note: ...".
 */
let me: any = { id: 'u-grace', firstName: 'Grace', lastName: 'Obi', email: 'grace@x.test', role: 'MEMBER' }
vi.mock('@/stores/auth', () => {
  const useAuthStore: any = (sel: any) => sel({ user: me, isAuthenticated: true })
  useAuthStore.getState = () => ({ user: me, isAuthenticated: true })
  return { useAuthStore }
})
vi.mock('@/api/grounds', () => ({
  groundsApi: { get: vi.fn(), getMySpecificity: vi.fn(), myTranscript: vi.fn(), myNotes: vi.fn() },
}))
vi.mock('@/api/reports', () => ({ reportsApi: { get: vi.fn() } }))
vi.mock('@/api/documents', () => ({ documentsApi: { list: vi.fn() } }))

const at = (d: number) => new Date(Date.UTC(2026, 8, d)).toISOString()
const person = (id: string, d: number, extra: any = {}) => ({
  id, userId: `u-${id}`, email: null, partyType: 'PARTICIPANT', createdAt: at(d), user: null, nameGiven: null,
  roleAsDescribed: PRIVATE_NOTE, ...extra,
})

/** The ground as the server gives it to this reader: the lead's note goes only to the lead. */
function groundFor(reader: 'lead' | 'participant') {
  const note = reader === 'lead' ? PRIVATE_NOTE : null
  const participants = [
    person('lead', 1, { userId: 'u-grace', partyType: 'INITIATOR', user: { firstName: 'Grace', lastName: 'Obi' }, email: 'grace@x.test', roleAsDescribed: null }),
    person('a', 2, { roleAsDescribed: note, userId: reader === 'participant' ? 'u-me' : 'u-a' }),
    person('b', 3, { roleAsDescribed: note }),
    person('c', 4, { roleAsDescribed: note }),
  ]
  return {
    id: 'g1', label: 'Sales team, Q3', scenario: 'OKR_ALIGNMENT', status: 'ACTIVE', timelineDays: 90, cadence: 'MONTHLY',
    initiatorId: 'u-grace', contextEnabled: true, peersVisibleEffective: true, createdAt: at(1),
    participants: participants.map((p) => ({
      ...p,
      checkIns: [{ id: `c-${p.id}`, participantId: p.id, sessionNumber: 1, status: p.id === 'b' ? 'COMPLETED' : 'NOT_STARTED', completedAt: p.id === 'b' ? at(5) : null }],
      objective: { text: `Close the deals ${p.id} owns.`, all: [{ id: `o-${p.id}`, text: `Close the deals ${p.id} owns.` }] },
    })),
    checkIns: participants.map((p) => ({ id: `c-${p.id}`, participantId: p.id, sessionNumber: 1, status: p.id === 'b' ? 'COMPLETED' : 'NOT_STARTED', completedAt: p.id === 'b' ? at(5) : null, createdAt: at(4) })),
    commitments: [{ id: 'k1', participantId: 'c', text: 'Send the price list.', explicit: true }],
    signals: [],
  }
}

function renderAt(path: string, route: string, el: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes><Route path={route} element={el} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function noNoteAsAName(reader: string) {
  const { elsewhere, asTheirNote } = whereTheNoteIs()
  expect({ reader, elsewhere }).toEqual({ reader, elsewhere: [] })
  for (const n of asTheirNote) expect(n).toContain('You wrote “PRIVATE-DESCRIPTION-9k2 is not meeting targets”.')
  expect(document.body.textContent).not.toMatch(/teammate/i)
  return asTheirNote
}

const tabs = () => screen.queryAllByRole('button').concat(screen.queryAllByRole('tab'))
const openTab = (name: RegExp) => {
  const t = tabs().find((b) => name.test(b.textContent ?? ''))
  if (t) fireEvent.click(t)
  return !!t
}

describe('the check-in’s page never names somebody with the lead’s note', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(reportsApi.get as any).mockResolvedValue(null)
    ;(documentsApi.list as any).mockResolvedValue([])
    ;(groundsApi.getMySpecificity as any).mockResolvedValue(null)
    ;(groundsApi.myTranscript as any).mockResolvedValue({ sessions: [] })
    ;(groundsApi.myNotes as any).mockResolvedValue([])
  })

  it('as the lead, on every tab that lists people', async () => {
    me = { id: 'u-grace', firstName: 'Grace', lastName: 'Obi', email: 'grace@x.test', role: 'MEMBER' }
    ;(groundsApi.get as any).mockResolvedValue(groundFor('lead'))
    renderAt('/grounds/g1', '/grounds/:id', <GroundAdminPage />)
    await waitFor(() => expect(screen.getAllByText(/Sales team, Q3/).length).toBeGreaterThan(0))
    noNoteAsAName('lead, chat')

    /* REVIEW ROUND 3, "YOUR WORK" REBUILD: Report and Sessions are quiet links inside "My work"
       now ("Every session" / "Who has answered"), not sub-tabs - open "My work" first, then the
       link.
       FAULT 3 FIX, 6 Oct 2026: Grace runs this check-in and is also a party to it, so "My work"
       now lands her straight on the roster (matching the board's own "My work" link - see
       `myWorkDefault` in GroundAdminPage.tsx), with no second click through "Who has answered"
       needed. */
    expect(openTab(/^My work$/)).toBe(true)
    await waitFor(() => expect(screen.getAllByText('One colleague').length).toBeGreaterThan(0))
    expect(screen.getAllByText('Another colleague').length).toBeGreaterThan(0)
    expect(screen.getAllByText('A third colleague').length).toBeGreaterThan(0)
    /* The lead reads their own note, beside the name, and says it is theirs. */
    expect(noNoteAsAName('lead, sessions').length).toBeGreaterThan(0)

    /* Renamed "Context" to "Context and resources" so the tab's name says what it now holds. */
    expect(openTab(/^Context and resources$/)).toBe(true)
    await waitFor(() => expect(screen.getAllByText('Send the price list.').length).toBeGreaterThan(0))
    expect(screen.getAllByText('A third colleague').length).toBeGreaterThan(0)
    noNoteAsAName('lead, context')

    /* The Report tab's list of sessions says who it is still waiting on, in a sentence. */
    expect(openTab(/^My work$/)).toBe(true)
    expect(openTab(/^Every session$/)).toBe(true)
    await waitFor(() => expect(document.body.textContent).toMatch(/not checked in yet\./))
    expect(document.body.textContent).toContain('You, one colleague and a third colleague have not checked in yet.')
    noNoteAsAName('lead, report')
  })

  it('as a participant, on every tab that lists people, with no part of the note anywhere', async () => {
    me = { id: 'u-me', firstName: '', lastName: '', email: null, role: 'MEMBER' }
    ;(groundsApi.get as any).mockResolvedValue(groundFor('participant'))
    renderAt('/grounds/g1/p', '/grounds/:id/p', <GroundParticipantPage />)
    await waitFor(() => expect(screen.getAllByText(/Sales team, Q3/).length).toBeGreaterThan(0))
    for (const tab of [null, /^My work$/, /^Context and resources$/]) {
      if (tab) openTab(tab)
      await waitFor(() => expect(document.body.textContent).toBeTruthy())
      expect(whereTheNoteIs()).toEqual({ asTheirNote: [], elsewhere: [] })
      expect(document.body.textContent).not.toMatch(/teammate/i)
    }
    /* Two others with no name, counted without the reader, who is "You". */
    expect(document.body.textContent).toMatch(/One colleague|one colleague/)
    expect(document.body.textContent).toMatch(/Another colleague|another colleague/)
    expect(document.body.textContent).not.toMatch(/a third colleague/i)
    cleanup()
  })
})

describe('and nowhere else that names people from a check-in', () => {
  const ground: any = groundFor('lead')

  it('Jump to lists nobody by the note, and nobody with no name', () => {
    const items = whatYouCanJumpTo([ground], 'u-grace', [])
    const text = JSON.stringify(items)
    for (const f of FRAGMENTS) expect(text).not.toContain(f)
    for (const f of FRAGMENTS) expect(matching(items, f)).toEqual([])
  })

  it('who a session waits on reads as a sentence, with a capital only at its start', () => {
    expect(stillToCheckIn(['a colleague'])).toBe('A colleague has not checked in yet.')
    expect(stillToCheckIn(['you'])).toBe('You have not checked in yet.')
    expect(stillToCheckIn(['one colleague', 'another colleague'])).toBe('One colleague and another colleague have not checked in yet.')
  })

  it('the check-ins list says who it waits on without the note', () => {
    const row = howARowReads(ground, 'u-grace', new Date(at(6)))
    const text = JSON.stringify(row)
    for (const f of FRAGMENTS) expect(text).not.toContain(f)
  })
})
