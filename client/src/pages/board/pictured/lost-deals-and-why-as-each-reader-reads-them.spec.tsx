import { it, expect, describe } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EveryDealDayByDay, ReportedAgainstCriteria } from './ThePicturedSalesBoard'

/**
 * LOST DEALS, AND WHY, AS EACH READER READS THEM (Hafsah, 18 October 2026: "Lost deals: add a lost stage"). This was the test of
 * Drop Access run 1, A5, where a dropped deal was one line at the foot of its group; Hafsah replaced that with a Lost stage and the
 * prototype's "Lost deals, and why", so the same sections are read here as the server serves them on gw_sweep_drop10 (api:
 * drop-access-run-1-the-boards-facts.spec.ts): lost deals are not rows in any group, and each is one row under "Lost deals, and
 * why". A rep is served only their own (a-participants-board-is-their-own).
 */
const NOW = new Date('2026-10-26T08:15:00Z')
const wrap = (node: React.ReactNode) => render(<QueryClientProvider client={new QueryClient()}><MemoryRouter>{node}</MemoryRouter></QueryClientProvider>)
const LAVINGTON = { id: 'l', kind: 'deal', name: 'Lavington Spa', stage: 'Contacted', owner: 'Kevin Omondi', ownerParticipantId: 'p-kevin', fields: {}, value: null, mark: 'said', next: null, group: 'possible', contactHistory: [], lastSaidOn: '2026-10-21' }
const KAMAU = { id: 'k', name: 'Kamau Electricals', owner: 'Kevin Omondi', ownerParticipantId: 'p-kevin', on: '2026-10-19', reason: 'They already buy from Aqua Pure.', reasonFrom: 'Kevin said it.', lesson: null, says: 'Kamau Electricals was lost, because they already buy from Aqua Pure.' }
const KIOSK = { id: 't', name: 'the kiosk at Thika Road Mall', owner: 'Joseph Kariuki', ownerParticipantId: 'p-joseph', on: '2026-10-23', reason: 'Brian said they are not interested this year.', reasonFrom: 'Joseph said it.', lesson: null, says: 'The kiosk at Thika Road Mall was lost. Joseph said, “Brian said they are not interested this year.”' }
const UNKNOWN = { id: 'u', name: 'Mama Oliech Butchery', owner: 'Joseph Kariuki', ownerParticipantId: 'p-joseph', on: '2026-10-20', reason: null, reasonFrom: 'No reason given.', lesson: 'Every lost deal needs a reason.', says: 'Mama Oliech Butchery was lost, and no reason was given.' }
const GRACES = {
  section: 'Deal grid',
  rows: [LAVINGTON],
  groups: [{ group: 'possible', heading: 'Possible', reason: 'Each of these is moving.', rowIds: ['l'] }],
  lost: [KAMAU, UNKNOWN, KIOSK],
}
const lostTable = () => screen.getByText('Lost deals, and why').closest('section') ?? document.body

describe('Grace, who runs it', () => {
  it('reads each lost deal once, under Lost deals, and why, never as a row of the open grid', () => {
    wrap(<EveryDealDayByDay b={{ participants: [], canEditFrame: false, releaseOneSalesBoard: true, myParticipantId: 'p-grace' }} section={GRACES} now={NOW} groundId="g1" />)
    expect(screen.getByText('A reason with no source stays unverified. An unknown reason is flagged, because it can’t be learned from.')).toBeTruthy()
    const kamau = screen.getAllByText('Kamau Electricals')
    expect(kamau).toHaveLength(1)
    const row = kamau[0].closest('tr')!
    expect(row.className).toContain('pb-lost-row')
    expect(within(row).getByText('Kevin')).toBeTruthy()
    expect(within(row).getByText('19 Oct')).toBeTruthy()
    expect(within(row).getByText('They already buy from Aqua Pure.')).toBeTruthy()
    expect(within(row).getByText('Kevin said it.')).toBeTruthy()
    expect(within(row).getByText('Nothing on record teaches anything from it yet.')).toBeTruthy()
    /* A reason nobody gave is flagged, with How we work's rule as what it teaches. */
    const unknown = screen.getByText('Mama Oliech Butchery').closest('tr')!
    expect(unknown.className).toContain('pb-lost-unknown')
    expect(within(unknown).getByText('Nobody has said why yet.')).toBeTruthy()
    expect(within(unknown).getByText('No reason given.')).toBeTruthy()
    expect(within(unknown).getByText('Every lost deal needs a reason.')).toBeTruthy()
    /* The open grid holds only the open deal. */
    expect(document.querySelectorAll('tr.pb-deal')).toHaveLength(1)
    expect(lostTable()).toBeTruthy()
  })
})

describe('Kevin, a rep, served only his own', () => {
  it('reads his own lost deal as his, and never Joseph\'s', () => {
    const kevins = { ...GRACES, lost: [{ ...KAMAU, reasonFrom: 'You said it.' }] }
    wrap(<EveryDealDayByDay b={{ participants: [], canEditFrame: false, releaseOneSalesBoard: true, myParticipantId: 'p-kevin' }} section={kevins} now={NOW} groundId="g1" heading="Your deals, day by day" note="Only yours" />)
    const row = screen.getByText('Kamau Electricals').closest('tr')!
    expect(within(row).getByText('You')).toBeTruthy()
    expect(within(row).getByText('You said it.')).toBeTruthy()
    expect(document.body.textContent).not.toContain('Thika Road Mall')
  })
  it('with every deal of his lost, is told none is open, not that none is on record', () => {
    wrap(<EveryDealDayByDay b={{ participants: [], canEditFrame: false, releaseOneSalesBoard: true, myParticipantId: 'p-kevin' }} section={{ section: 'Deal grid', rows: [], groups: [], lost: [KAMAU] }} now={NOW} groundId="g1" />)
    expect(screen.getByText('No deal is open now. The deals that were lost are listed under Lost deals, and why.')).toBeTruthy()
  })
})

describe('Mercy, a rep with no lost deal', () => {
  it('reads no Lost section at all', () => {
    wrap(<EveryDealDayByDay b={{ participants: [], canEditFrame: false, releaseOneSalesBoard: true, myParticipantId: 'p-mercy' }} section={{ ...GRACES, lost: undefined }} now={NOW} groundId="g1" />)
    expect(screen.queryByText('Lost deals, and why')).toBeNull()
  })
})

it('the stage counts show Lost after the open stages, with how many have a reason', () => {
  wrap(<ReportedAgainstCriteria b={{ reportedAgainstCriteria: { state: 'not-known', why: 'x', stages: [
    { stage: 'Contacted', reported: 10, met: 10, withProof: 4, says: '10 deals were reported at Contacted or later, and 10 deals meet what Contacted needs.' },
    { stage: 'Lost', reported: 4, withProof: 0, lost: true, withAReason: 4, says: '4 deals were lost, and each has a reason.' },
  ] } }} />)
  expect(screen.getByText('Lost')).toBeTruthy()
  expect(screen.getByText('4 lost, 4 with a reason')).toBeTruthy()
})
