import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'
import SERVED from './__fixtures__/night-run-2-boards.json'

/**
 * THE BOARD, SAID DIRECTLY (the direct morning, Hafsah, 20 October 2026). The boards are what the API served Grace Achieng (she runs
 * "Sales team, Q4" at Drop Access) and Kevin Omondi (a rep in it) on Tuesday 20 October in the morning, in the second night run.
 *
 * OFF, every line reads as it did. ON, the notes that explain the board, say who sees what, or defend the product are gone, and
 * "today's team picture" is "today's team report". Nothing new is shown: every line Grace or Kevin reads with it on is a line they
 * read with it off, or one of the plainer lines that replaced one.
 */
let me: any = { id: 'u-grace', firstName: 'Grace', role: 'MEMBER' }
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: me }) }))
vi.mock('@/api/board', async (orig) => { const o: any = await orig(); return { ...o, boardApi: { ...o.boardApi, get: vi.fn() } } })
vi.mock('@/api/grounds', async (orig) => { const o: any = await orig(); return { ...o, groundsApi: { ...o.groundsApi, get: vi.fn().mockResolvedValue({ id: 'g1', label: 'Sales team, Q4', initiatorId: 'u-grace', leadFirstName: 'Grace' }) } } })
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))

/*
 * The fixture is the board as served with the switch off. With it on, the API also serves two things differently (board.service.ts):
 * a rep's share comes with no `whoSees`, and the lead's stall item is the question itself, with no "Groundwork suggests". This makes
 * the same change to the same served board, so the page is read as the API serves it on. api board/the-quality-pass-of-18-october
 * checks the API's side from the record.
 */
function asTheApiServesItOn(b: any): any {
  const out = structuredClone(b)
  if (Array.isArray(out.yourShare)) out.yourShare = out.yourShare.map(({ whoSees: _gone, ...s }: any) => s)
  out.leadActions = (out.leadActions ?? []).map((a: any) => a.id !== 'the-stall-rule' ? a : {
    ...a,
    text: a.decision.asked,
    decision: { ...a.decision, question: a.decision.asked, why: a.decision.why.replace(/^Groundwork suggests dropping a deal after \d+ working days with no answer from the customer\. Until you set a rule, no deal is marked cold or dropped for going quiet\./, 'No deal is marked cold or dropped for going quiet until you set this.') },
  })
  return out
}

async function read(who: 'grace' | 'kevin', on: boolean): Promise<string[]> {
  me = { id: who === 'grace' ? 'u-grace' : 'u-kevin', firstName: who === 'grace' ? 'Grace' : 'Kevin', role: 'MEMBER' }
  ;(boardApi.get as any).mockResolvedValue({ ...(on ? asTheApiServesItOn((SERVED as any)[who]) : (SERVED as any)[who]), directMorning: on })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const r = render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/board']}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  await screen.findAllByText(/Last updated on Tuesday 20 October at 8am\./)
  const lines: string[] = []
  const walk = (n: Element) => {
    for (const c of Array.from(n.children)) {
      const leaf = c.children.length === 0 || (/^(P|H1|H2|H3|LI|TD|TH|BUTTON|A|SPAN)$/.test(c.tagName) && (c.textContent ?? '').length < 400)
      if (leaf) { const t = (c.textContent ?? '').trim(); if (t) lines.push(t) } else walk(c)
    }
  }
  walk(r.container)
  r.unmount()
  return lines
}

const BOARD_ONLY_CHANGES = 'Last updated on Tuesday 20 October at 8am. The board only changes when something new comes in, such as a check-in, a report, a decision or a number from another system.'
const GONE_FOR_BOTH = [
  BOARD_ONLY_CHANGES,
  'Something here wrong? Anyone can correct what’s about their own work in their check-in; the change and the original both show here.',
  'A reason with no source stays unverified. An unknown reason is flagged, because it can’t be learned from.',
]
const GONE_FOR_GRACE = [
  'These are about the work. Open anyone to see what they said and what the proof shows.',
  'Named after three check-ins in a row, never after one. Each describes the work',
  'Nothing has come up three check-ins in a row yet. When something does, it shows here, and the person it is about sees it first.',
  'Each person sees what’s about them, and can answer it in their own words.',
  'Each one moving towards a decision. You always choose',
  'No stall rule set yetGroundwork suggests dropping a deal after 3 working days with no answer from the customer. Until you set a rule, no deal is marked cold or dropped for going quiet. Upper Hill Offices has not answered since 13 October, which is more than that.Yes, 3 working daysNot now',
]
const GONE_FOR_KEVIN = [
  'Today’s team picture is shared.',
  'Open today’s team picture.',
  'Only yours',
  'Built from what each person shared in their private check-in. Use it to see what’s going on and guide the conversation. It’s not a verdict.',
  'How to read this board',
  'You have sold 49 of your 30 units so far, 46 paid (Savannah Cafe and Kilele Hotel) and 3 on your word (Roysambu Gym). Only you and Grace see your share.',
]
const NEW_LINES = [
  'Last updated on Tuesday 20 October at 8am.',
  'Open anyone to see what they said and what the proof shows.',
  'Nothing has come up three check-ins in a row yet.',
  'Today’s team report is shared.',
  'Open today’s team report.',
  'Do you want to drop a deal after 3 working days with no answer?No deal is marked cold or dropped for going quiet until you set this. Upper Hill Offices has not answered since 13 October, which is more than that.Yes, 3 working daysNot now',
  'You have sold 49 of your 30 units so far, 46 paid (Savannah Cafe and Kilele Hotel) and 3 on your word (Roysambu Gym).',
]

describe('Grace’s board, as she runs "Sales team, Q4"', () => {
  it('with the direct morning off, every note reads as it did', async () => {
    const off = await read('grace', false)
    for (const l of [...GONE_FOR_BOTH, ...GONE_FOR_GRACE]) expect(off).toContain(l)
  })

  it('with it on, no note explains the board, says who sees what, or defends it, and nothing new is shown', async () => {
    const off = await read('grace', false)
    const on = await read('grace', true)
    for (const l of [...GONE_FOR_BOTH, ...GONE_FOR_GRACE]) expect(on).not.toContain(l)
    expect(on).toContain('Last updated on Tuesday 20 October at 8am.')
    expect(on).toContain('Open anyone to see what they said and what the proof shows.')
    expect(on).toContain('Nothing has come up three check-ins in a row yet.')
    /* The deals, the target and what needs her are all still there. */
    for (const l of ['Will we reach 120 units sold by 30 October?', 'What needs you in this check-in', 'Every deal, day by day', 'Lost deals, and why', 'The team today']) expect(on).toContain(l)
    for (const l of on) expect([...off, ...NEW_LINES]).toContain(l)
  })
})

describe('Kevin’s board, as a rep in "Sales team, Q4"', () => {
  it('with the direct morning off, every note reads as it did', async () => {
    const off = await read('kevin', false)
    for (const l of [...GONE_FOR_BOTH, ...GONE_FOR_KEVIN]) expect(off).toContain(l)
  })

  it('with it on, it is the team’s report, his deals carry no privacy note, and nothing new is shown', async () => {
    const off = await read('kevin', false)
    const on = await read('kevin', true)
    for (const l of [...GONE_FOR_BOTH, ...GONE_FOR_KEVIN]) expect(on).not.toContain(l)
    expect(on).toContain('Today’s team report is shared.')
    expect(on).toContain('Open today’s team report.')
    expect(on).toContain('Your deals, day by day')
    expect(on.join('\n')).not.toMatch(/It’s not a verdict|shared picture|team picture/)
    for (const l of on) expect([...off, ...NEW_LINES]).toContain(l)
  })
})
