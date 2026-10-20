import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MyWorkPage } from './MyWorkPage'
import { groundsApi } from '@/api/grounds'
import { useTheDirectMorning } from '@/lib/the-direct-morning'
import SERVED from './__fixtures__/night-run-2-my-work-people-references.json'

/**
 * MY WORK, SAID DIRECTLY (the direct morning, Hafsah, 20 October 2026). The pages are what the API served Grace Achieng (she runs
 * "Sales team, Q4" and checks in too) and Kevin Omondi (a rep) on Tuesday 20 October in the morning, in the second night run, with the
 * switch off. With it on, the API serves the same page without "Grace sees this page too." and without the library note
 * (api board/my-work-as-each-reader-is-served-it.spec.ts, myWorkSaidDirectly), and says directMorning: true; the page draws what
 * it is served and tells the rest of My work below it.
 */
vi.mock('@/api/grounds', async () => {
  const actual = await vi.importActual<typeof import('@/api/grounds')>('@/api/grounds')
  return { ...actual, groundsApi: { ...actual.groundsApi, myWork: vi.fn() } }
})

const LIBRARY_NOTE = 'What each behaviour means and how to improve come from the behaviour and pattern library, so the words are the same in every check-in.'
const asServedOn = (p: any) => ({
  ...p,
  directMorning: true,
  topLine: String(p.topLine).replace(/ [^.]+ sees this page too\.$/, ''),
  performing: { ...p.performing, libraryNote: '' },
})
function Probe() { return <p>{useTheDirectMorning() ? 'The rest of My work is told it is on.' : 'The rest of My work is told it is off.'}</p> }
const open = (served: any) => {
  vi.mocked(groundsApi.myWork).mockResolvedValue(served)
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><MyWorkPage groundId="g-sales" rest={<Probe />} /></MemoryRouter></QueryClientProvider>)
}

describe('Kevin’s My work', () => {
  it('off: who else sees it, and the library note, as served', async () => {
    open({ ...(SERVED as any).kevin.myWork, directMorning: false })
    expect(await screen.findByRole('heading', { name: 'Kevin’s work' })).toBeTruthy()
    expect(screen.getByText('What you need to do, what you’ve done, and how to get better. Grace sees this page too.')).toBeTruthy()
    expect(screen.getByText(LIBRARY_NOTE)).toBeTruthy()
    expect(screen.getByText('The rest of My work is told it is off.')).toBeTruthy()
  })
  it('on: what the page is for, his numbers, deals and to do, and no note about who sees it', async () => {
    open(asServedOn((SERVED as any).kevin.myWork))
    expect(await screen.findByRole('heading', { name: 'Kevin’s work' })).toBeTruthy()
    expect(screen.getByText('What you need to do, what you’ve done, and how to get better.')).toBeTruthy()
    expect(screen.getByText('Kilele Hotel was won, for KES 200,000.')).toBeTruthy()
    expect(screen.getByText('Ngong Road Minimart')).toBeTruthy()
    expect(screen.queryByText(LIBRARY_NOTE)).toBeNull()
    expect(document.body.textContent).not.toMatch(/sees this page too/)
    expect(screen.getByText('The rest of My work is told it is on.')).toBeTruthy()
  })
})

describe('Grace’s own My work', () => {
  it('as the night run served it, before the fix, her own page told her "Grace sees this page too."; the API now serves her none (my-work.ts, readerRunsIt)', async () => {
    expect((SERVED as any).grace.myWork.topLine).toBe('What you need to do, what you’ve done, and how to get better. Grace sees this page too.')
    open(asServedOn((SERVED as any).grace.myWork))
    expect(await screen.findByText('What you need to do, what you’ve done, and how to get better.')).toBeTruthy()
    expect(screen.getByText('Lavington Business Park')).toBeTruthy()
  })
})
