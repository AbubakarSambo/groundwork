/**
 * YOU, PORTED FROM THE PROTOTYPE'S MARKUP (C2-the-you-board), AS EACH READER READS IT (Hafsah, 21 November 2026).
 *
 * The You the local copy served Wairimu (who runs a check-in), Amani (who takes part) and Grace (an admin in none), saved as they came,
 * and the fuller one from the second night run (goals, what you said you'd do, coaching, everything asked of you). With the design
 * switch on, each reads the prototype's sections in its order, filled from their own record, with none of the prototype's privacy notes;
 * the parts the prototype has no place for (performance history, leave, requests, CV and emergency contact) come after. Off, none of it.
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

const at = (text: string, words: string) => {
  const i = text.indexOf(words)
  expect(i, `"${words}" is on the page`).toBeGreaterThanOrEqual(0)
  return i
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

describe('You ported from the prototype, as each reader reads it', () => {
  it('with the switch off, none of the port is drawn', async () => {
    const { container } = open(wairimu, false)
    await screen.findAllByText(/Sales team, Q4/)
    expect(container.querySelector('.gw-proto')).toBeNull()
  })

  for (const [who, served] of [['Wairimu, who runs a check-in', wairimu], ['Amani, who takes part', amani], ['Grace, in no check-in', grace]] as const) {
    it(`${who} reads the prototype's sections, no privacy note, and the parts it has no place for after them`, async () => {
      const { container } = open(served, true)
      await screen.findByText('Your board')
      /* The next check-in comes from Today's read, once it has come in. */
      await screen.findByText(/Your next check-in opens on/)
      const text = container.textContent ?? ''
      expect(container.querySelector('.gw-proto')).not.toBeNull()
      for (const note of PRIVACY_NOTES) expect(text).not.toContain(note)
      expect(at(text, 'You')).toBeLessThan(at(text, 'Your board'))
      expect(at(text, 'Your to-dos')).toBeLessThan(at(text, 'Everything you’ve written, in every check-in, as one file.'))
      expect(at(text, 'Everything you’ve written, in every check-in, as one file.')).toBeLessThan(at(text, 'Your CV and who to call'))
      expect(text).toContain('Add a to-do')
      expect(text).toContain('Your next check-in opens on Friday 27 November')
      /* Every section the prototype draws, in its order, each with its own sentence where the record is empty. */
      const every = ['Where you stand', 'Worth knowing now', 'Something Groundwork noticed about your work', 'Coaching, followed over time', 'Your goals',
        'Your commitments', 'Your to-dos', 'What you contributed', 'Coaching', 'Everything asked of you this week', 'What you said you’d do',
        'Something that keeps coming up', 'Your own reports', 'Your work in each']
      inOrder(text, every)
    })
  }

  it('the fuller You reads in the prototype\'s order: your board, what is asked of you, what you said you\'d do, your reports and work', async () => {
    const { container } = open((nightRun as any).grace, true)
    await screen.findByText('Your board')
    const text = container.textContent ?? ''
    const order = ['Your board', 'Your goals', 'Your commitments', 'Your to-dos', 'Coaching', 'Everything asked of you this week', 'What you said you’d do', 'Your own reports', 'Your work in each']
    inOrder(text, order)
    for (const note of PRIVACY_NOTES) expect(text).not.toContain(note)
  })
})
