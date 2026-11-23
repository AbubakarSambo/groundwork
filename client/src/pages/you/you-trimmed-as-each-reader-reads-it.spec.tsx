/**
 * YOU, TRIMMED (page audit row 4, Hafsah, 24 November 2026), AS EACH READER READS IT.
 *
 * Rewritten from the spec of the prototype port (it checked that every empty box was drawn, with its sentence saying it was empty, which
 * row 4 removes). The You the local copy served Wairimu (who runs a check-in), Amani (who takes part) and Grace (an admin in none), and
 * the fuller one from the second night run. Each reads only the parts the record has something for, no box saying there is nothing,
 * one commitments list ("Send the update" once), one reports list, one coaching section, no privacy note; and with nothing at all,
 * one line. The parts the prototype has no place for (leave, requests, CV and emergency contact) still come after.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { YouPage } from './YouPage'
import { useAuthStore } from '@/stores/auth'
import wairimu from './__fixtures__/you-as-wairimu.json'
import amani from './__fixtures__/you-as-amani.json'
import grace from './__fixtures__/you-as-grace.json'
import nightRun from './__fixtures__/night-run-2-you.json'

vi.mock('@/api/you', () => ({ youApi: { get: vi.fn() } }))
vi.mock('@/api/my-data', () => ({ myDataApi: { get: vi.fn(), erase: vi.fn() } }))
vi.mock('@/api/patterns', () => ({ patternsApi: { answer: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { list: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/suites', () => ({ suitesApi: { mine: vi.fn().mockResolvedValue({ leave: false, spend: false, time: false, reviews: false }) }, yourRequestsApi: {}, reviewsApi: { mineQuietly: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ needs: [], count: 0, line: null, comingUp: [{ at: '2026-11-27T05:00:00.000Z', what: 'Your fourth check-in for “Sales team, Q4” opens.', to: '/grounds/g-1' }] }) } }))
vi.mock('@/pages/org/APersonsDetails', () => ({ APersonsDetails: () => <section><h2>Your CV and who to call</h2></section> }))
import { youApi } from '@/api/you'

const PRIVACY_NOTES = ['Only you see this page.', 'Only you see this unless you share it', 'Only you, and the people who run your check-ins, see it.']

function open(served: any, designPass: boolean) {
  localStorage.clear()
  if (designPass) localStorage.setItem('gw-design-pass', 'on')
  ;(youApi.get as any).mockResolvedValue(served)
  useAuthStore.setState({ user: { id: 'u-1', firstName: 'Wairimu', role: 'LEAD', organizationName: 'Msingi Foods' }, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={['/you']}><YouPage /></MemoryRouter></QueryClientProvider>)
}

/** Each heading found after the one before it, so a heading that is the start of another ("Coaching") is found in its own place. */
function inOrder(text: string, headings: string[]) {
  let from = 0
  for (const h of headings) {
    const i = text.indexOf(h, from)
    expect(i, `"${h}" comes after the one before it`).toBeGreaterThanOrEqual(0)
    from = i + h.length
  }
}

beforeEach(() => vi.clearAllMocks())

const EMPTY_BOXES = ['Nothing is worth knowing about your work right now.', 'Groundwork has not noticed anything about your work yet.',
  'No coaching has been followed over time yet.', 'No goal has been set for you yet.', 'Nothing you contributed is on record yet.',
  'There is no coaching for you this week yet.', 'Nobody has asked anything of you this week.', 'Nothing has come up about your part',
  'Nothing is on your to-do list.', 'You have not made a commitment on record yet.', 'Nothing needs deciding about your work right now.']

describe('You, trimmed, as each reader reads it', () => {
  it('with the switch off, the trimmed page is not drawn', async () => {
    const { container } = open(wairimu, false)
    await screen.findAllByText(/Sales team, Q4/)
    expect(container.querySelector('.ds-page')).toBeNull()
  })

  for (const [who, served] of [['Wairimu, who runs a check-in', wairimu], ['Amani, who takes part', amani]] as const) {
    it(`${who} reads only the parts with something in them, then the parts the prototype has no place for`, async () => {
      const { container } = open(served, true)
      await screen.findByText('Your work in each')
      await screen.findByText(/Your next check-in opens on Friday 27 November/)
      const text = container.textContent ?? ''
      for (const note of PRIVACY_NOTES) expect(text).not.toContain(note)
      for (const box of EMPTY_BOXES) expect(text, box).not.toContain(box)
      expect(text).not.toContain('Your board')
      expect(text).not.toContain('Your performance history')
      inOrder(text, ['You', 'Your next check-in opens on', 'Your own reports', 'Your work in each', 'Everything you’ve written, in every check-in, as one file.', 'Your CV and who to call'])
    })
  }

  it('Grace, with nothing about her own work on record, reads one line, then her data and details', async () => {
    const { container } = open(grace, true)
    await screen.findByText('Nothing needs you about your own work yet.')
    const text = container.textContent ?? ''
    for (const box of EMPTY_BOXES) expect(text, box).not.toContain(box)
    inOrder(text, ['Nothing needs you about your own work yet.', 'Everything you’ve written, in every check-in, as one file.', 'Your CV and who to call'])
  })

  it('the fuller You: one commitments list, one reports list, one coaching section, in the prototype\'s order', async () => {
    const served = (nightRun as any).grace
    const { container } = open(served, true)
    await screen.findByText('What you said you’d do')
    const text = container.textContent ?? ''
    inOrder(text, ['Your board', 'Your goals', 'Coaching', 'Everything asked of you this week', 'What you said you’d do', 'Your own reports', 'Your work in each'])
    expect(text).not.toContain('Your commitments')
    expect(text).not.toContain('Coaching, followed over time')
    expect(screen.getAllByRole('heading', { name: 'Coaching' })).toHaveLength(1)
    expect(screen.getAllByRole('heading', { name: 'Your own reports' })).toHaveLength(1)
    /* Each thing said once: every commitment is one row of the one list. */
    for (const s of served.saidYoudDo) expect(text.split(s.text).length - 1, s.text).toBe(1)
    for (const note of PRIVACY_NOTES) expect(text).not.toContain(note)
  })
})
