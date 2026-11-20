import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { PageCrash } from '@/components/gw/PageCrash'
import { serveThroughTheClient } from '@/test/serve-through-the-client'
import supportDesk from '../preview/__fixtures__/release-4-support-desk.json'
import operations from '../preview/__fixtures__/release-4-operations.json'
import engineering from '../preview/__fixtures__/release-4-engineering.json'
import salesOrg from '../preview/__fixtures__/release-4-sales-org.json'
import subscriptions from '../preview/__fixtures__/release-4-subscriptions.json'
import leadership from '../preview/__fixtures__/release-4-leadership.json'
import project from '../preview/__fixtures__/release-5-project.json'
import collectionsServed from './pictured/__fixtures__/collections-served.json'
import matterServed from './pictured/__fixtures__/matter-served.json'
import night from './__fixtures__/night-run-2-boards.json'
import { eachKeyTakenAway, whatWentWrong, aPartWasLost, untilDrawn } from '@/test/take-each-key-away'

/**
 * (Widened 15 November 2026, "fix why the page keeps cracking": it took away a hand-written list of 29 names, so a field
 * nobody had thought of was never tried. It now takes away EVERY field the served board carries, in turn, to two levels, and
 * checks the page for the crash card, the one-part line and any code text, through the shared helper in
 * `test/take-each-key-away.ts`.)
 *
 * A BOARD WITH ANY FIELD MISSING IS NEVER A CODE ERROR (Hafsah, 15 November 2026, seen live on the project board:
 * "Cannot read properties of undefined (reading 'includes')"). The cause was the page reading `b.sections.includes` on a board that
 * carried no `sections`. Every board kind is drawn here with the lists it might lack taken away, as the lead reads it, and must
 * draw a page and never the crash card or any code text.
 */
let me = { id: 'u-lead', firstName: 'Wairimu', role: 'LEAD' }
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: me }) }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))
vi.mock('@/components/gw/Suggestions', () => ({ SuggestionsForTheLead: () => null }))
vi.mock('@/api/recommendedCheckIns', () => ({ recommendedCheckInsApi: { list: vi.fn().mockResolvedValue({ offers: [] }), yes: vi.fn(), notNow: vi.fn(), draftFromSetUp: vi.fn() } }))

/* The fee-notes, loans and matter boards ride on a served board (the collections and matter fields of the API's own output), and the sales board is a real model run's. */
const onABoard = (extra: any) => ({ ...(engineering as any), ...extra })
const KINDS: Record<string, any> = {
  supportDesk, operations, engineering, salesOrg, subscriptions, leadership, project,
  feeNotes: onABoard({ collections: (collectionsServed as any).boards.wanjiru }),
  loans: onABoard({ collections: (collectionsServed as any).boards.halima }),
  matter: onABoard({ matter: (matterServed as any).matter.wanjiru }),
  sales: (night as any).grace,
  /* The kinds drawn from the situation's own fields, sparse on purpose: only the kind and the people, nothing else. */
  government: onABoard({ kindOfWork: 'a government programme', whatEachLevelUnderstood: undefined }),
  programme: onABoard({ kindOfWork: 'trader training programme' }),
  founder: onABoard({ kindOfWork: "founder's own check-in" }),
  whereNext: onABoard({ kindOfWork: 'MarketView where next' }),
  assetLoans: onABoard({ kindOfWork: 'asset loans' }),
  lawFirm: onABoard({ kindOfWork: 'a law firm matter' }),
}

/* Served through the real client, so the shapes it fills in (api/shapes.ts) are filled in here as they are in the browser; the page is inside the same crash page the app has, so a crash is read off the screen. */
function draw(payload: any) {
  serveThroughTheClient({
    '/grounds/g1/board': payload,
    '/grounds/g1': { initiatorId: 'u-lead', leadFirstName: 'Wairimu', participants: [], checkIns: [], roundCompletions: [] },
    '/today': { count: 0, line: null, comingUp: [], needs: [] },
  })
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/grounds/g1/board']}>
        <PageCrash><Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes></PageCrash>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('a board with fields missing is never a code error', () => {
  for (const [name, fixture] of Object.entries(KINDS)) {
    it(`${name}: draws with no sections at all`, async () => {
      const { sections: _gone, ...without } = fixture as any
      const { container } = draw({ ...without, groundId: 'g1', renders: true })
      await waitFor(() => expect(container.textContent?.length ?? 0).toBeGreaterThan(40))
      expect(screen.queryByText('Something broke on this page')).toBeNull()
      expect(container.textContent).not.toMatch(/Cannot read properties|undefined|TypeError/)
    })
    it(`${name}: draws with every field taken away in turn, at the top, one level in and in the first row of each list`, async () => {
      const whole = { ...(fixture as any), groundId: 'g1', renders: true }
      const broken: string[] = []
      const partsLost: string[] = []
      {
        const { container, unmount } = draw({ ...(fixture as any), groundId: 'g1', renders: true })
        await untilDrawn()
        const text = container.textContent ?? ''
        const at = text.search(/NaN|undefined/)
        expect(whatWentWrong(container), `${name} whole: ...${text.slice(Math.max(0, at - 60), at + 30)}...`).toBeNull()
        unmount()
      }
      const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
      for (const { path, without } of eachKeyTakenAway(whole)) {
        const { container, unmount } = draw({ ...without, groundId: 'g1', renders: true })
        await untilDrawn()
        const wrong = whatWentWrong(container)
        if (aPartWasLost(container)) partsLost.push(`${name} without ${path}`)
        const why = logged.mock.calls.map((c) => c[1]).find((e) => e instanceof Error) as Error | undefined
        const site = why?.stack?.split('\n').find((l) => /src\/(pages|components)/.test(l))?.replace(/^.*\/(src\/[^)]*).*$/, '$1')
        logged.mockClear()
        if (wrong) broken.push(`${name} without ${path}: ${wrong}${why ? ` (${why.message}, at ${site})` : ''}`)
        unmount()
      }
      logged.mockRestore()
      if (partsLost.length) process.stdout.write(`PARTS LOST ${partsLost.length}: ${partsLost.join(' | ')}\n`)
      expect(broken).toEqual([])
    }, 600000)
  }
})
