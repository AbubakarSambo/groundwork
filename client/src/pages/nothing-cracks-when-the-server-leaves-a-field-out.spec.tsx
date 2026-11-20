import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { PageCrash } from '@/components/gw/PageCrash'
import { useAuthStore } from '@/stores/auth'
import { serveThroughTheClient } from '@/test/serve-through-the-client'
import { eachKeyTakenAway, whatWentWrong, aPartWasLost, untilDrawn } from '@/test/take-each-key-away'
import { TodayPage } from '@/pages/today/TodayPage'
import { YouPage } from '@/pages/you/YouPage'
import { CompanyPage } from '@/pages/company/CompanyPage'
import { AskPage } from '@/pages/ask/AskPage'
import WeeklyReportPage from '@/pages/report/WeeklyReportPage'
import { ThePersonPage } from '@/pages/board/ThePersonPage'
import { GroundParticipantPage } from '@/pages/grounds/GroundParticipantPage'
import { WhatSuccessLooksLikeFor } from '@/components/gw/WhatSuccessLooksLike'
import { TheSessionsReport } from '@/components/gw/TheSessionsReport'
import { ThePicturedTeamReport } from '@/pages/report/pictured/ThePicturedTeamReport'
import TODAY from '@/pages/today/__fixtures__/night-run-2-today.json'
import YOU from '@/pages/you/__fixtures__/night-run-2-you.json'
import REPORTS from '@/pages/report/__fixtures__/night-run-2-reports.json'
import MYWORK from '@/pages/grounds/__fixtures__/night-run-2-my-work-people-references.json'
import BOARDS from '@/pages/board/__fixtures__/night-run-2-boards.json'

/**
 * NOTHING CRACKS WHEN THE SERVER LEAVES A FIELD OUT (Hafsah, 15 November 2026: "fix why the page keeps cracking").
 *
 * The board's own sweep is in pages/board/a-board-with-fields-missing-is-never-a-code-error.spec.tsx. This is the same sweep for the
 * rest: Today, You, the Company page, Ask, the weekly report, the team's report, one person's page and "What success looks like"
 * (the part of a check-in's record page that crashed on 'spokenTo'). Each is drawn from a payload the server really sent, through
 * the real API client, with every field taken away in turn (at the top, one level in, and in the first row of each list). It must draw
 * a page: never the crash page, never code text on screen. A part that cannot draw says its one plain line and is listed, not failed.
 */
const G = 'g1'
const T: any = TODAY, Y: any = YOU, R: any = REPORTS, B: any = BOARDS
const ME = { id: 'u-grace', firstName: 'Grace', role: 'ADMIN', organizationName: 'Baridi Appliances' }

const COMPANY = {
  name: 'Baridi Appliances', line: '2 teams and 5 people work here.', readsTargets: true,
  priorities: [
    { id: 's1', number: 1, title: 'Grow revenue 50%', owner: 'Wairimu Kamau', tag: null, fedBy: 'Fed by Sales team, Q3', staleSays: null, measure: 'Deals', target: '12 this quarter',
      levels: [{ id: 'l1', depth: 1, level: 'Objective', title: 'Reduce delays', changedHere: null, fedBy: null }] },
    { id: 's3', number: 3, title: 'Build a stronger organisation', owner: null, tag: 'Nobody owns it yet', fedBy: 'No team feeds it', staleSays: null, measure: null, target: null },
  ],
  notReaching: [{ id: 'n1', observation: 'Nobody has said anything about delivery.', question: 'Who owns it?', forWhom: 'Operations' }],
  whatWeKeep: { readBy: 'Only leads read this.', items: [{ id: 'k1', kind: 'RULE', says: 'We pay on delivery.', source: 'Picked up from your check-in on 22 September' }] },
}
const CARDS = { cards: [{ key: 'leave', kind: 'HANDBOOK', title: 'Leave', body: '21 days a year.', effectiveFrom: '2026-09-01' }] }
const ASK = {
  canAsk: true, about: [{ id: G, label: 'Sales team, Q4' }], turns: [{ from: 'you', says: 'How is it going?', at: '2026-10-20T08:00:00Z' }, { from: 'groundwork', says: 'It is going well.', at: '2026-10-20T08:01:00Z' }],
  askName: 'Ask Baridi', caption: 'Ask about your work.', addLine: 'Add something.', welcome: 'Hello.', starters: ['What needs me?'], addsContext: true,
}
const SESSION = R.grace.teamReport.data
const PERSON_BOARD = {
  title: 'Sales team, Q3',
  participants: [{ id: 'p-miriam', name: 'Miriam Wanjiku', role: 'Sales' }],
  objectives: [{ id: 'o1', ownerParticipantId: 'p-miriam', target: 5, count: 4 }],
  workRecords: [{ section: 'Deal grid', stages: ['Contacted', 'Won'], rows: [{ id: 'd1', kind: 'deal', name: 'Westgate Deli', stage: 'Won', ownerParticipantId: 'p-miriam', value: 'KES 95,000', mark: 'said', nextSays: 'Nobody has said what happens next.' }] }],
  checkInGrid: { sessions: [1, 2], rows: [{ participantId: 'p-miriam', cells: { 1: 'done', 2: 'missed' } }] },
  patterns: [{ id: 'pt1', participantId: 'p-miriam', heading: 'X', whatHappened: 'Qualified deals without a buying date.', theirWords: 'Waiting for the bank.' }],
  coaching: { eachPerson: [{ participantId: 'p-miriam', probe: ['Which deal has a buying date in writing?'] }] },
}
const AGAINST = { ...SESSION.againstSuccess, conditions: [{ text: 'Close the Kilele deal', state: 'moving', why: 'Sent the quote', who: 'Miriam' }], spokenTo: { count: 1, of: 1 }, stated: 'Units sold by 30 October', definitions: [{ who: 'You', text: 'Deals with proof' }] }

const MY_CHECK_INS = [
  { id: 'c1', participantId: 'p1', sessionNumber: 1, status: 'COMPLETE', completedAt: '2026-10-01T10:00:00Z', availableFrom: '2026-10-01T08:00:00Z' },
  { id: 'c2', participantId: 'p1', sessionNumber: 2, status: 'IN_PROGRESS', completedAt: null, availableFrom: '2026-10-08T08:00:00Z' },
]
const MY_GROUND = {
  id: G, label: 'Sales team, Q4', scenario: 'SALES', status: 'OPEN', timelineDays: 90, cadence: 'WEEKLY', initiatorId: 'u-lead', leadFirstName: 'Wairimu',
  participants: [{ id: 'p1', userId: 'u-grace', email: 'grace@x.test', partyType: 'PARTICIPANT', roleAsDescribed: 'Rep', checkIns: MY_CHECK_INS }],
  checkIns: MY_CHECK_INS, signals: [],
}

const MY_WORK = (MYWORK as any).grace.myWork

type APage = { name: string; routes: Record<string, unknown>; swept: string; mount: () => ReactNode; at?: string; path?: string; shows?: string }
const PAGES: APage[] = [
  { name: 'Today', swept: '/today', routes: { '/today': T.grace }, mount: () => <TodayPage /> },
  { name: 'You (Grace)', swept: '/you', routes: { '/you': Y.grace }, mount: () => <YouPage /> },
  { name: 'You (Kevin)', swept: '/you', routes: { '/you': Y.kevin }, mount: () => <YouPage /> },
  { name: 'Company', swept: '/company', routes: { '/company': COMPANY, '/org/how-we-do-it': CARDS }, mount: () => <CompanyPage /> },
  { name: 'Ask', swept: '/ask', routes: { '/ask': ASK }, mount: () => <AskPage /> },
  { name: 'The weekly report', swept: `/grounds/${G}/report/week`, routes: { [`/grounds/${G}/report/week`]: R.grace.weekly, [`/grounds/${G}`]: { initiatorId: 'u-grace', participants: [], checkIns: [] } }, mount: () => <WeeklyReportPage />, at: `/grounds/${G}/report/week`, path: '/grounds/:id/report/week' },
  { name: "The team's report", swept: `/grounds/${G}/report/session/1`, routes: { [`/grounds/${G}/report/session/1`]: SESSION, [`/grounds/${G}/board`]: B.grace }, mount: () => <ThePicturedTeamReport groundId={G} sessionNumber={1} ground={{ label: 'Sales team, Q4', checkIns: [], participants: [] }} /> },
  { name: "A team member's report", swept: `/grounds/${G}/report/session/1`, routes: { [`/grounds/${G}/report/session/1`]: R.kevin.teamReport.data }, mount: () => <TheSessionsReport groundId={G} sessionNumber={1} light /> },
  { name: 'One person', swept: `/grounds/${G}/board`, routes: { [`/grounds/${G}/board`]: PERSON_BOARD, [`/grounds/${G}`]: { initiatorId: 'u-grace', participants: [{ id: 'p-miriam', createdAt: '2026-07-01T10:00:00Z' }], contextItems: [] } }, mount: () => <ThePersonPage />, at: `/grounds/${G}/person/p-miriam`, path: '/grounds/:id/person/:participantId' },
  { name: 'A check-in, the record tab', swept: `/grounds/${G}`, routes: { [`/grounds/${G}`]: MY_GROUND, [`/grounds/${G}/report/against-success`]: AGAINST, [`/grounds/${G}/my-work`]: MY_WORK }, mount: () => <GroundParticipantPage />, at: `/grounds/${G}/p?tab=record`, path: '/grounds/:id/p', shows: 'What success looks like' },
  { name: "A check-in, the record tab (My work)", swept: `/grounds/${G}/my-work`, routes: { [`/grounds/${G}`]: MY_GROUND, [`/grounds/${G}/report/against-success`]: AGAINST, [`/grounds/${G}/my-work`]: MY_WORK }, mount: () => <GroundParticipantPage />, at: `/grounds/${G}/p?tab=record`, path: '/grounds/:id/p', shows: 'What success looks like' },
  { name: 'A check-in, the check-in tab', swept: `/grounds/${G}`, routes: { [`/grounds/${G}`]: MY_GROUND, [`/grounds/${G}/report/against-success`]: AGAINST }, mount: () => <GroundParticipantPage />, at: `/grounds/${G}/p?tab=checkin`, path: '/grounds/:id/p' },
  { name: 'What success looks like (the record tab)', swept: `/grounds/${G}/report/against-success`, routes: { [`/grounds/${G}/report/against-success`]: AGAINST }, mount: () => <WhatSuccessLooksLikeFor groundId={G} />, shows: 'What success looks like' },
]

function draw(page: APage, served: unknown) {
  serveThroughTheClient({ ...page.routes, [page.swept]: served })
  useAuthStore.setState({ user: ME, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[page.at ?? '/']}>
        <PageCrash>{page.path ? <Routes><Route path={page.path} element={page.mount()} /></Routes> : page.mount()}</PageCrash>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => cleanup())

describe('a page the server leaves a field out of is still a page', () => {
  for (const page of PAGES) {
    it(`${page.name}: drawn whole, then with every field taken away in turn`, async () => {
      const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
      const whole = page.routes[page.swept]
      const broken: string[] = []
      const partsLost: string[] = []
      const tries = [{ path: '(nothing taken away)', without: whole }, ...eachKeyTakenAway(whole)]
      for (const { path, without } of tries) {
        const { container, unmount } = draw(page, without)
        await untilDrawn()
        if (page.shows && path.startsWith('(nothing')) expect(container.textContent, `${page.name} drawn whole: ${container.textContent?.slice(0, 700)}`).toContain(page.shows)
        const wrong = whatWentWrong(container)
        const why = logged.mock.calls.map((c) => c[1]).find((e) => e instanceof Error) as Error | undefined
        const site = why?.stack?.split('\n').find((l) => /src\/(pages|components)/.test(l))?.replace(/^.*\/(src\/[^)]*).*$/, '$1')
        logged.mockClear()
        if (aPartWasLost(container)) partsLost.push(path)
        if (wrong) broken.push(`${page.name} without ${path}: ${wrong}${why ? ` (${why.message}, at ${site})` : ''}`)
        unmount()
      }
      logged.mockRestore()
      if (partsLost.length) process.stdout.write(`PARTS LOST ${page.name} ${partsLost.length}: ${partsLost.join(' | ')}\n`)
      process.stdout.write(`SWEPT ${page.name}: ${tries.length - 1} fields\n`)
      expect(broken).toEqual([])
    }, 600000)
  }
})
