import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/api/board', async (orig) => ({ ...(await orig() as any), boardApi: { nudge: vi.fn() } }))
vi.mock('@/lib/the-direct-morning', () => ({ useTheDirectMorning: () => true }))
vi.mock('@/api/check-in-links', () => ({ checkInLinksApi: { get: vi.fn(async () => ({})) } }))

import { boardApi } from '@/api/board'
import { YourTeamToday } from './TheMorningOnTheBoard'
import { TheTeamToday } from './ThePicturedSalesBoard'
import SERVED from './__fixtures__/the-direct-morning-served.json'

/**
 * "NUDGE JOSEPH", AS GRACE AND KEVIN READ IT (nudges that get answers, 20 October 2026). The payload is what the API serves Grace at half
 * past three on Tuesday 20 October, from the second night run (api engagement/who-has-answered-as-grace-reads-it.spec.ts and
 * the-nudge-buttons-as-each-reader-is-served-them.spec.ts write the same lines and buttons): her team part names who has not checked in
 * today, with a button for each. Kevin is never served `nudges` or a row's `nudge`, so nothing is drawn for him.
 */
const drop = (SERVED as any).drop
const GRACES_TEAM = [
  "Peter hasn't checked in today, and last checked in yesterday.",
  "Kevin hasn't checked in today, and last checked in yesterday.",
  "Joseph hasn't checked in today, and last checked in yesterday.",
  "Mercy hasn't checked in today, and last checked in yesterday.",
]
const NUDGES = [
  { participantId: 'p-peter', firstName: 'Peter', says: 'Nudge Peter', nudgedAt: null },
  { participantId: 'p-kevin', firstName: 'Kevin', says: 'Nudge Kevin', nudgedAt: null },
  { participantId: 'p-joseph', firstName: 'Joseph', says: 'Nudged at 15:30', nudgedAt: '15:30' },
  { participantId: 'p-mercy', firstName: 'Mercy', says: 'Nudge Mercy', nudgedAt: null },
]
const afternoon = { ...drop.theMorning, parts: drop.theMorning.parts.map((p: any) => (p.key === 'team' ? { ...p, lines: GRACES_TEAM } : p)), nudges: NUDGES }
const wrap = (ui: any) => render(<QueryClientProvider client={new QueryClient()}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>)

/*
 * CHANGED 30 OCTOBER (boards audit S1 and C1): the morning is no longer one block above the board. On a sales board each "Nudge" is on
 * the person's row of The team today (below); on the collections and matter boards, which have no row per person, the team's lines and
 * their buttons are under "Your team today" (YourTeamToday). The same served lines and buttons are read here, there.
 */
describe('Grace, under Your team today', () => {
  beforeEach(() => vi.mocked(boardApi.nudge).mockReset())

  it('reads who has not checked in today and the day they last did, with a button for each, and Joseph already nudged', () => {
    wrap(<YourTeamToday b={{ theMorning: afternoon }} />)
    for (const l of GRACES_TEAM) expect(screen.getByText(l)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Nudge Peter' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Nudge Kevin' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Nudge Mercy' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Joseph/ })).toBeNull()
    expect(screen.getByText('Nudged at 15:30')).toBeTruthy()
  })

  it('presses "Nudge Peter" once, and reads what became of it', async () => {
    vi.mocked(boardApi.nudge).mockResolvedValue({ nudged: true, at: '15:31', says: 'Nudged at 15:31', channel: 'whatsapp' })
    wrap(<YourTeamToday b={{ theMorning: afternoon }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Nudge Peter' }))
    expect(await screen.findByText('Nudged at 15:31')).toBeTruthy()
    expect(boardApi.nudge).toHaveBeenCalledWith(drop.theMorning.groundId, 'p-peter')
    expect(screen.queryByRole('button', { name: 'Nudge Peter' })).toBeNull()
  })

  it('where nothing could be sent, reads why and to call instead', async () => {
    vi.mocked(boardApi.nudge).mockResolvedValue({ nudged: false, at: null, says: 'Kevin said STOP on WhatsApp, so no nudge was sent, and you can call Kevin instead.' })
    wrap(<YourTeamToday b={{ theMorning: afternoon }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Nudge Kevin' }))
    expect(await screen.findByText('Kevin said STOP on WhatsApp, so no nudge was sent, and you can call Kevin instead.')).toBeTruthy()
  })
})

describe('on each row of The team today', () => {
  const rows = [
    { participantId: 'p-peter', who: 'Peter Njoroge', line: 'Hasn’t checked in today', checkedInToday: false, nudge: NUDGES[0] },
    { participantId: 'p-kevin', who: 'Kevin Omondi', line: 'Hasn’t checked in today', checkedInToday: false },
  ]
  it('Grace reads the button on the row of the person the server served one for, and on no other', () => {
    wrap(<TheTeamToday b={{ eachPersonToday: rows, eachPerson: [] }} deals={{ rows: [] }} today="2026-10-20" groundId="g1" />)
    expect(screen.getByRole('button', { name: 'Nudge Peter' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Nudge Kevin' })).toBeNull()
  })
  it('Kevin, or Grace with the switch off, is served no nudge, and reads no button', () => {
    wrap(<TheTeamToday b={{ eachPersonToday: rows.map(({ nudge: _n, ...r }: any) => r), eachPerson: [] }} deals={{ rows: [] }} today="2026-10-20" groundId="g1" />)
    expect(screen.queryByRole('button', { name: /^Nudge/ })).toBeNull()
    wrap(<YourTeamToday b={{ theMorning: drop.theMorning }} />)
    expect(screen.queryByRole('button', { name: /^Nudge/ })).toBeNull()
  })
})
