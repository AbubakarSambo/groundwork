import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as SERVED from './__fixtures__/night-run-2-their-record.json'

vi.mock('@/api/grounds', async () => {
  const actual = await vi.importActual<typeof import('@/api/grounds')>('@/api/grounds')
  return { ...actual, groundsApi: { ...actual.groundsApi, myWork: vi.fn(), get: vi.fn().mockResolvedValue({ id: 'g1', checkIns: [] }), getMySpecificity: vi.fn().mockResolvedValue(null) } }
})
vi.mock('@/api/reports', () => ({ reportsApi: { sessionReport: vi.fn(), get: vi.fn().mockResolvedValue({}), startSelfCorrection: vi.fn() } }))
vi.mock('@/api/conversation', () => ({ conversationApi: { artifact: vi.fn().mockResolvedValue(null), disputeEntry: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() } }))

import { groundsApi } from '@/api/grounds'
import { MyWorkPage } from '@/pages/grounds/MyWorkPage'

/**
 * MERCY READS GRACE'S PRAISE ON HER OWN MY WORK (Groundwork does the managing, part 2). The record is what the API serves Mercy on My
 * work after Grace tapped "Praise Mercy" on her board (api board/your-team-person-by-person-as-each-reader-reads-it.spec.ts writes the
 * same line): no message was sent, and the praise is in the record Mercy already reads. Since 24 November 2026 the record is not a
 * section of its own (Hafsah's cuts to My work), so the praise is read under Coaching, in Keep doing. Nothing is drawn where the
 * server sends none.
 */
const S: any = (SERVED as any).default ?? SERVED
const PRAISE = 'On Wednesday 21 October Grace said “Well done on Greenfield Supermarket, with the signed order on file.”'

function myWork(payload: any) {
  vi.mocked(groundsApi.myWork).mockResolvedValue(payload)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter><MyWorkPage groundId="g1" /></MemoryRouter></QueryClientProvider>)
}

describe('Mercy’s own My work', () => {
  it('carries what Grace said about her work, with the day, in Keep doing', async () => {
    const mercy = S.myWork['Mercy as Mercy']
    myWork({ ...mercy, record: { ...mercy.record, fromYourLead: { heading: 'What Grace said about your work', lines: [PRAISE] } } })
    const keep = within((await screen.findByText('Keep doing')).parentElement as HTMLElement)
    expect(keep.getByText(PRAISE)).toBeTruthy()
  })
  it('draws nothing of it where the server sends none', async () => {
    myWork(S.myWork['Mercy as Mercy'])
    await screen.findByText('Keep doing')
    expect(screen.queryByText(/Grace said “Well done/)).toBeNull()
  })
})
