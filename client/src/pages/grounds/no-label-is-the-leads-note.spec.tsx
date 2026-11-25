import { aServedCount } from '@/lib/a-served-count-for-a-spec'
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
 *
 * 4 November 2026: since Release 1B's switch went, My work is the B7 page for everybody (served by GET /grounds/:id/my-work),
 * References and resources and the party's People and setup are served pages too, and the old Context tab is gone. The
 * lead still reaches the roster from My work, behind "Who has answered", and reads it here as before. References and
 * resources and the party's pages are drawn from what the server sends each reader, and the server specs prove the note
 * never reaches a party there (references-and-resources-as-each-reader-is-served-it: a party is sent no `people` at all;
 * people-and-setup-as-each-reader-is-served-it). Here, every one of those tabs is still opened, as each reader, and must
 * carry no part of the note outside the lead's own labelled note.
 */
let me: any = { id: 'u-grace', firstName: 'Grace', lastName: 'Obi', email: 'grace@x.test', role: 'MEMBER' }
vi.mock('@/stores/auth', () => {
  const useAuthStore: any = (sel: any) => sel({ user: me, isAuthenticated: true })
  useAuthStore.getState = () => ({ user: me, isAuthenticated: true })
  return { useAuthStore }
})
vi.mock('@/api/grounds', async () => {
  const { SERVED_TO_THE_LEAD } = await import('./my-work-served.fixture')
  return { groundsApi: { get: vi.fn(), getMySpecificity: vi.fn(), myTranscript: vi.fn(), myNotes: vi.fn(), myWork: vi.fn().mockResolvedValue(SERVED_TO_THE_LEAD) } }
})
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
    /* As the server counts session 1: the lead did not answer it, so she is not in it. */
    theCount: aServedCount({ 1: { on: ['a', 'b', 'c'], answered: ['b'] } }),
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
  for (const n of asTheirNote) expect(n).toContain('Your note on Daniel9k2')
  for (const n of asTheirNote) expect(n).toContain('PRIVATE-DESCRIPTION-9k2 is not meeting targets.')
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

    /* My work opens the B7 page for a lead too (batch 1, group 10); the roster is behind "Who has answered" inside it. */
    expect(openTab(/^My work$/)).toBe(true)
    fireEvent.click(await screen.findByRole('button', { name: 'Who has answered' }))
    /* "Who has answered" opens People and setup's one list now (page audit, 24 November 2026, row 8), which names somebody with no
       name and no address the way People and setup always has (nameWithoutGuessing); never by the lead's note. */
    await waitFor(() => expect(screen.getAllByText('Somebody invited by email').length).toBe(3))
    /* The lead reads their own note, beside the name, and says it is theirs. */
    expect(noNoteAsAName('lead, check-ins').length).toBeGreaterThan(0)

    /* "References and resources" (it was "Context and resources", drawn on the client from the ground): served now. */
    expect(openTab(/^References and resources$/)).toBe(true)
    await waitFor(() => expect(document.body.textContent).toBeTruthy())
    noNoteAsAName('lead, references')

    /* The Report tab's list of sessions says who it is still waiting on, in a sentence. */
    expect(openTab(/^My work$/)).toBe(true)
    fireEvent.click(await screen.findByRole('button', { name: 'Every check-in' }))
    await waitFor(() => expect(document.body.textContent).toMatch(/not checked in yet\./))
    /* The lead checks in when they choose (change 5, decision 133), so the lead is never listed as not checked in. */
    expect(document.body.textContent).toContain('One colleague and a third colleague have not checked in yet.')
    expect(document.body.textContent).not.toContain('You, one colleague')
    noNoteAsAName('lead, report')
  }, 20_000) /* it opens four tabs of the whole check-in page in turn, which takes about five seconds on one worker */

  it('as a participant, on every tab that lists people, with no part of the note anywhere', async () => {
    me = { id: 'u-me', firstName: '', lastName: '', email: null, role: 'MEMBER' }
    ;(groundsApi.get as any).mockResolvedValue(groundFor('participant'))
    /* From My work, where the tabs are drawn: a check-in that is due is the card alone, with no tab bar, and lists nobody. */
    renderAt('/grounds/g1/p?tab=record', '/grounds/:id/p', <GroundParticipantPage />)
    await waitFor(() => expect(screen.getAllByText(/Sales team, Q3/).length).toBeGreaterThan(0))
    for (const tab of [null, /^My work$/, /^References and resources$/, /^People and setup$/]) {
      if (tab) expect(openTab(tab)).toBe(true)
      await waitFor(() => expect(document.body.textContent).toBeTruthy())
      expect(whereTheNoteIs()).toEqual({ asTheirNote: [], elsewhere: [] })
      expect(document.body.textContent).not.toMatch(/teammate/i)
    }
    /* No tab a party has draws other people from the ground's own payload any more (each is served per reader), so the
       two others are not named here at all, and never as the note or as "a teammate". */
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
