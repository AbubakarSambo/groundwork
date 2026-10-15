import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * B-141: an aim stated in lower case still reads as a sentence, and "Stated at the start" uses the
 * check-in's own start date, never whatever date the version-1 row happened to be written on
 * (`effectiveFrom` can trail the real start, the deep page audit found both faults on the same line:
 * "forty more shops in Nairobi order every week by 15 December" in lower case, dated 9 October for a
 * check-in that started 16 September).
 */
const history = vi.hoisted(() => ({ value: [] as any[] }))
vi.mock('@/api/grounds', () => ({
  groundsApi: {
    baselineHistory: vi.fn(async () => history.value),
    stateBaseline: vi.fn(),
  },
}))

import { BaselinePanel } from './BaselinePanel'

function renderPanel(groundStartedAt?: string | null) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <BaselinePanel groundId="g1" canState={false} groundStartedAt={groundStartedAt} />
    </QueryClientProvider>,
  )
}

describe('BaselinePanel: what doing well looks like reads as a sentence, dated from the real start', () => {
  it('capitalises an aim typed in lower case, without rewriting the rest of it', async () => {
    history.value = [{
      version: 1,
      successLooksLike: 'forty more shops in Nairobi order every week by 15 December',
      conditions: [],
      changeReason: null,
      effectiveFrom: '2026-10-09T00:00:00.000Z',
    }]
    renderPanel('2026-09-16T00:00:00.000Z')
    expect(await screen.findByText('Forty more shops in Nairobi order every week by 15 December')).toBeTruthy()
    expect(screen.queryByText('forty more shops in Nairobi order every week by 15 December')).toBeNull()
  })

  it('dates version 1 from the check-in\'s real start, not the version-1 row\'s own effectiveFrom', async () => {
    history.value = [{
      version: 1,
      successLooksLike: 'Forty more shops in Nairobi order every week by 15 December',
      conditions: [],
      changeReason: null,
      effectiveFrom: '2026-10-09T00:00:00.000Z',
    }]
    renderPanel('2026-09-16T00:00:00.000Z')
    expect(await screen.findByText(/Stated at the start, 16 September\./)).toBeTruthy()
    expect(screen.queryByText(/Stated at the start, 9 October\./)).toBeNull()
  })

  it('falls back to effectiveFrom when no real start date is known', async () => {
    history.value = [{
      version: 1,
      successLooksLike: 'Forty more shops in Nairobi order every week by 15 December',
      conditions: [],
      changeReason: null,
      effectiveFrom: '2026-10-09T00:00:00.000Z',
    }]
    renderPanel(null)
    expect(await screen.findByText(/Stated at the start, 9 October\./)).toBeTruthy()
  })

  /*
   * REGRESSION: `GroundAdminPage.tsx`'s own `startsAtOnRecord` is `''`, not `null`, when nothing is
   * set - `(ground as any)?.startsAt ? String(...).slice(0, 10) : ''`. The first wiring of this prop
   * used `??`, which only falls back on `null`/`undefined` and let `''` straight through, so the date
   * disappeared entirely ("Stated at the start, .") rather than falling back to `effectiveFrom` -
   * caught live in the browser as tendai@kijani.test, not by a test, since every test here had used
   * `null` or a real date and never the empty string the live prop actually sends.
   */
  it('falls back to effectiveFrom when the real start date is an empty string, not null', async () => {
    history.value = [{
      version: 1,
      successLooksLike: 'Forty more shops in Nairobi order every week by 15 December',
      conditions: [],
      changeReason: null,
      effectiveFrom: '2026-10-09T00:00:00.000Z',
    }]
    renderPanel('')
    expect(await screen.findByText(/Stated at the start, 9 October\./)).toBeTruthy()
  })

  it('a later version keeps its own effectiveFrom, since it really did change something then', async () => {
    history.value = [
      { version: 1, successLooksLike: 'First aim', conditions: [], changeReason: null, effectiveFrom: '2026-09-16T00:00:00.000Z' },
      { version: 2, successLooksLike: 'Second aim', conditions: [], changeReason: 'the market shifted', effectiveFrom: '2026-10-09T00:00:00.000Z' },
    ]
    renderPanel('2026-09-16T00:00:00.000Z')
    expect(await screen.findByText(/Version 2, from 9 October\./)).toBeTruthy()
  })
})
