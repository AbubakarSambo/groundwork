import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OnboardingBoardPage } from './OnboardingBoardPage'
import { useAuthStore } from '@/stores/auth'
import type { NewPerson } from '@/api/suites'

/**
 * THE ONBOARDING BOARD (E1, #/suite/onboard), AS EACH PERSON SEES IT. Who is served whom is tested on
 * the server (api/src/modules/suites/the-onboarding-board-as-each-reader-reads-it.spec.ts). Here: what
 * each person reads, in the prototype's words (suite-onboard.txt), and what the board never shows.
 */
vi.mock('@/api/suites', () => ({ onboardingBoardApi: { get: vi.fn() } }))
import { onboardingBoardApi } from '@/api/suites'

const FAITH: NewPerson = {
  id: 'p-faith', name: 'Faith Kerubo', firstName: 'Faith', startedAt: '2026-09-21T08:00:00.000Z', done: 2, of: 4,
  steps: [
    { name: 'Send your ID and tax PIN to Grace', description: null, optional: false, state: 'done', doneAt: '2026-09-22T10:00:00.000Z' },
    { name: 'Collect your laptop and phone from Kamau', description: null, optional: false, state: 'not needed', doneAt: null },
    { name: 'Finish the security training', description: 'About 30 minutes', optional: false, state: 'to do', doneAt: null },
    { name: 'Meet Wairimu about your first 90 days', description: null, optional: true, state: 'to do', doneAt: null },
  ],
}
const OTIENO: NewPerson = { ...FAITH, id: 'p-otieno', name: 'Otieno Ouma', firstName: 'Otieno', startedAt: null, done: 0, of: 1,
  steps: [{ name: 'Show your driving licence to Grace', description: null, optional: false, state: 'to do', doneAt: null }] }

const GRACE = { id: 'u-g', firstName: 'Grace', role: 'ADMIN', organizationName: 'Baridi Appliances' }
const WAIRIMU = { id: 'u-w', firstName: 'Wairimu', role: 'LEAD', organizationName: 'Baridi Appliances' }
const FAITH_USER = { id: 'u-f', firstName: 'Faith', role: 'MEMBER', organizationName: 'Baridi Appliances' }

function open(user: any, served: { people: NewPerson[] } | Error) {
  if (served instanceof Error) (onboardingBoardApi.get as any).mockRejectedValue(served)
  else (onboardingBoardApi.get as any).mockResolvedValue(served)
  useAuthStore.setState({ user, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/suite/onboard']}><OnboardingBoardPage /></MemoryRouter>
    </QueryClientProvider>,
  )
}
const refusal = (status: number, message: string) => Object.assign(new Error(String(status)), { response: { status, data: { message } } })
const text = () => document.body.textContent ?? ''

beforeEach(() => { vi.clearAllMocks() })

describe('Grace, an admin, reads the onboarding board', () => {
  it('reads the way back to the Suites page, and one part for each new person', async () => {
    open(GRACE, { people: [FAITH, OTIENO] })
    expect(await screen.findByRole('heading', { level: 2, name: 'Faith Kerubo is getting set up' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Otieno Ouma is getting set up' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Onboarding' })).toBeInTheDocument()
    /* "Where you are" is the shared PageTitle crumb's own aria-label (group 2, piece 4 rebuild),
       in place of the page's prior "Breadcrumb". */
    expect(screen.getByRole('navigation', { name: 'Where you are' }).textContent).toBe('Suites/Onboarding')
    expect(screen.getByRole('link', { name: 'Suites' })).toHaveAttribute('href', '/settings/suites')
  })

  it('reads what the board is for, that it never judges the person, and their to-do list', async () => {
    open(GRACE, { people: [FAITH] })
    const part = await screen.findByRole('region', { name: 'Faith Kerubo is getting set up' })
    expect(within(part).getByText('Faith started on 21 September. This board is only about getting Faith set up. It is never used to judge Faith’s work.')).toBeInTheDocument()
    expect(within(part).getByRole('heading', { level: 3, name: 'Faith’s to-do list' })).toBeInTheDocument()
    expect(within(part).getByText('2 of 4 done')).toBeInTheDocument()
    expect([...part.querySelectorAll('li')].map(li => li.textContent)).toEqual([
      'Send your ID and tax PIN to GraceDone',
      'Collect your laptop and phone from KamauNot needed',
      'Finish the security trainingAbout 30 minutes',
      'Meet Wairimu about your first 90 daysOptional',
    ])
  })

  it('without a start date, the sentence starts with what the board is for', async () => {
    open(GRACE, { people: [OTIENO] })
    expect(await screen.findByText('This board is only about getting Otieno set up. It is never used to judge Otieno’s work.')).toBeInTheDocument()
  })

  it('offers nothing to tick, and nothing about what nobody has shown them or who helps', async () => {
    open(GRACE, { people: [FAITH] })
    await screen.findByRole('heading', { level: 2, name: 'Faith Kerubo is getting set up' })
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    expect(text()).not.toMatch(/nobody has shown|Who helps|asked Groundwork|at risk|behind|late/i)
  })

  /*
   * FAULT 7A OF THE LIVE WALK (6 October): "Nobody is being set up right now." gave no next step.
   * A new person is actually set up by starting a "Help a new hire get started" check-in (the
   * switchboard's own situation), so the empty state now says so, with a link to it.
   */
  it('says so plainly when nobody is being set up, and how to set someone up', async () => {
    open(GRACE, { people: [] })
    expect(await screen.findByText('Nobody is being set up right now.')).toBeInTheDocument()
    expect(await screen.findByText('Set someone up by starting a “Help a new hire get started” check-in.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Start a check-in' })).toHaveAttribute('href', '/start')
  })

  /* Group 2's review, fault F: while off, this page used to show only "Onboarding / Onboarding" and
     the server's refusal, with nothing saying what the board is for - every other board carries that
     line regardless of whether it loaded. It now reads the same here. */
  it('while the suite is off, still reads what the board is for, above the server’s sentence', async () => {
    open(GRACE, refusal(404, 'The onboarding suite is not switched on.'))
    expect(await screen.findByRole('alert')).toHaveTextContent('The onboarding suite is not switched on.')
    expect(screen.getByText('This board is only about getting new people set up, with their papers, equipment and training, and the people they need to meet. It is never used to judge anyone’s work.')).toBeInTheDocument()
    expect(screen.queryAllByRole('heading', { level: 2 })).toHaveLength(0)
  })
})

describe('Wairimu, a lead, reads only the new people in her team', () => {
  it('reads Faith, as the server gives her', async () => {
    open(WAIRIMU, { people: [FAITH] })
    expect(await screen.findByRole('heading', { level: 2, name: 'Faith Kerubo is getting set up' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1)
  })
})

describe('Faith, the new person, opens the address', () => {
  it('reads the server’s refusal, and nothing else', async () => {
    open(FAITH_USER, refusal(403, 'Only an admin or a lead can open this board.'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Only an admin or a lead can open this board.')
    expect(screen.queryAllByRole('heading', { level: 2 })).toHaveLength(0)
  })

  it('a board that did not load says so, with a way to try again', async () => {
    open(FAITH_USER, new Error('network'))
    expect(await screen.findByText('The board did not load.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
