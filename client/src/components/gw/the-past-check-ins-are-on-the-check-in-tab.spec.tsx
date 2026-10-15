import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { readFileSync } from 'fs'
import { join } from 'path'
import { TheSessionsSoFar, theSessionsSoFar, whoCheckedIn, WHAT_EACH_PERSON_WROTE } from './TheSessionsSoFar'

/**
 * FIX LIST, ITEM 1 (14 OCTOBER): CONVERSATION HISTORY, AS PRODUCTION HAS IT.
 * Production's Check-in tab shows a person their own past conversations, and a lead or admin who does not answer the
 * check-in its sessions: when, and who checked in, never anybody's words. Our build had dropped both from the tab.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '')
const NAMES: Record<string, string> = { 'p-amani': 'Amani Wekesa', 'p-chidi': 'Chidi Okoro', 'p-zawadi': 'Zawadi Mwangi' }
const CHECK_INS = [
  { sessionNumber: 1, participantId: 'p-amani', status: 'COMPLETED', completedAt: '2026-10-07T09:00:00Z', createdAt: '2026-10-07T05:00:00Z' },
  { sessionNumber: 1, participantId: 'p-chidi', status: 'COMPLETED', completedAt: '2026-10-08T09:00:00Z', createdAt: '2026-10-07T05:00:00Z' },
  { sessionNumber: 1, participantId: 'p-zawadi', status: 'NOT_STARTED', completedAt: null, createdAt: '2026-10-07T05:00:00Z' },
  { sessionNumber: 2, participantId: 'p-amani', status: 'NOT_STARTED', completedAt: null, createdAt: '2026-10-14T05:00:00Z' },
]

describe('the sessions so far, for a lead or an admin who does not answer', () => {
  it('each session with when it happened and who checked in, in full sentences', () => {
    const rows = theSessionsSoFar(CHECK_INS, (id) => (id ? NAMES[id] ?? null : null))
    expect(rows).toEqual([
      { sessionNumber: 1, date: '2026-10-08T09:00:00Z', people: ['Amani Wekesa', 'Chidi Okoro'] },
      { sessionNumber: 2, date: '2026-10-14T05:00:00Z', people: [] },
    ])
    expect(whoCheckedIn(rows[0].people)).toBe('Amani Wekesa and Chidi Okoro checked in.')
    expect(whoCheckedIn([])).toBe('Nobody has checked in yet.')
  })
  it('on screen: the sessions, who checked in, and never anybody\'s words', () => {
    const { container } = render(<TheSessionsSoFar rows={theSessionsSoFar(CHECK_INS, (id) => (id ? NAMES[id] ?? null : null))} />)
    const text = container.textContent ?? ''
    expect(text).toContain('Session 1, on')
    expect(text).toContain('Amani Wekesa and Chidi Okoro checked in.')
    expect(text).toContain(WHAT_EACH_PERSON_WROTE)
    expect(text).toContain('Nobody has checked in yet.')
  })
})

describe('the Check-in tab shows past check-ins again', () => {
  const PARTICIPANT = strip(readFileSync(join(__dirname, '..', '..', 'pages', 'grounds', 'GroundParticipantPage.tsx'), 'utf8'))
  const ADMIN = strip(readFileSync(join(__dirname, '..', '..', 'pages', 'grounds', 'GroundAdminPage.tsx'), 'utf8'))
  it('a person reads their own past conversations under the between-sessions card', () => {
    expect(PARTICIPANT).toMatch(/\{!dueNow && \([\s\S]{0,200}data-testid="your-past-check-ins"[\s\S]{0,120}<Section heading="Your check-ins">[\s\S]{0,60}<MyCheckInSessions groundId=\{id!\} \/>/)
  })
  it('a lead who answers reads hers; one who does not reads the sessions so far', () => {
    expect(ADMIN).toMatch(/data-testid="your-past-check-ins"[\s\S]{0,120}<Section heading="Your check-ins">[\s\S]{0,60}<MyCheckInSessions groundId=\{id!\} \/>/)
    expect(ADMIN).toMatch(/\{!viewerChecksIn && \([\s\S]{0,40}<TheSessionsSoFar rows=\{theSessionsSoFar\(/)
  })
})
