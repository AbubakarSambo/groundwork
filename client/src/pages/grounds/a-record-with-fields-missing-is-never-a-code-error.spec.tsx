import { describe, it, expect, vi } from 'vitest'
import { render, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MyWorkPage } from './MyWorkPage'
import { WhatSuccessLooksLike } from '@/components/gw/WhatSuccessLooksLike'
import { groundsApi } from '@/api/grounds'
import { SERVED_TO_THE_LEAD } from './my-work-served.fixture'

/**
 * THE RECORD PAGE (MY WORK), SPARSE ON PURPOSE (Hafsah, 15 November 2026), like the board's a-board-with-fields-missing spec.
 * "Cannot destructure property 'count' of 'data.spokenTo' as it is undefined" took My work down. Every field the page is served
 * is taken away in turn, and it must draw a page, never the crash card and never any code text. The server always sends
 * `spokenTo` today (reports/where-you-are-against-what-you-named.ts); the page must not depend on that.
 */
vi.mock('@/api/grounds', async () => {
  const actual = await vi.importActual<typeof import('@/api/grounds')>('@/api/grounds')
  return { ...actual, groundsApi: { ...actual.groundsApi, myWork: vi.fn(), myTranscript: vi.fn().mockResolvedValue({ sessions: [] }), myDeliveries: vi.fn().mockResolvedValue([]), planCardsWaiting: vi.fn().mockResolvedValue({ proposals: [] }), readAPlan: vi.fn() } }
})
vi.mock('@/api/documents', () => ({ documentsApi: { list: vi.fn().mockResolvedValue([]), upload: vi.fn() } }))
vi.mock('@/api/reports', () => ({ reportsApi: { againstSuccess: vi.fn().mockResolvedValue(null) } }))
vi.mock('@/api/board', () => ({ boardApi: { updateObjective: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() } }))
vi.mock('@/components/gw/ContextChat', () => ({ ContextChat: () => null }))
vi.mock('@/components/gw/EachPerson', () => ({ EachPerson: () => null }))
vi.mock('@/components/gw/DeliveredPanel', () => ({ DeliveredPanel: () => null }))

const CODE_TEXT = /Cannot read properties|Cannot destructure|is not a function|is not iterable|undefined|TypeError|Something broke/

function draw(payload: any) {
  ;(groundsApi.myWork as any).mockResolvedValue(payload)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter><MyWorkPage groundId="g1" /></MemoryRouter></QueryClientProvider>)
}

describe('My work with fields missing', () => {
  const fields = Object.keys(SERVED_TO_THE_LEAD).filter((k) => k !== 'on')
  for (const field of fields) {
    it(`draws with ${field} taken away, with no code text`, async () => {
      const copy: any = { ...SERVED_TO_THE_LEAD }
      delete copy[field]
      const { container } = draw(copy)
      await waitFor(() => expect(container.textContent).not.toMatch(/Getting My work/))
      expect(container.textContent).not.toMatch(CODE_TEXT)
      cleanup()
    })
  }
})

describe('what success looks like with the count missing', () => {
  it('draws the stated aim and says nothing about a count, instead of failing', () => {
    const { container } = render(<WhatSuccessLooksLike data={{ counting: 'only-yours', stated: 'Reach 120 sales', version: null, conditions: [], definitions: [], sides: 'both', saying: null } as any} />)
    expect(container.textContent).toContain('Reach 120 sales')
    expect(container.textContent).not.toMatch(CODE_TEXT)
  })
})
