import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReferencesAndResourcesPage } from './ReferencesAndResources'
import { YourPeopleAndSetup } from './YourPeopleAndSetup'
import { groundsApi } from '@/api/grounds'
import SERVED from './__fixtures__/night-run-2-my-work-people-references.json'

/**
 * REFERENCES AND RESOURCES, AND A TEAM MEMBER'S PEOPLE AND SETUP, SAID DIRECTLY (the direct morning, Hafsah, 20 October 2026). The
 * pages are what the API served Grace Achieng (she runs "Sales team, Q4") and Kevin Omondi (a rep in it) on Tuesday 20 October in the
 * morning, in the second night run, with the switch off. With it on, the API serves Grace's top line as "Your team’s reference for this
 * work." and no "Groundwork wrote this from Grace’s words at setup." (api grounds/references-and-resources.ts, referencesSaidDirectly)
 * and says directMorning: true. Who is served which section is decided by the server before either, the same either way.
 */
vi.mock('@/api/grounds', async () => {
  const actual = await vi.importActual<typeof import('@/api/grounds')>('@/api/grounds')
  return { ...actual, groundsApi: { ...actual.groundsApi, referencesAndResources: vi.fn(), referencesEvidence: vi.fn(async () => null), peopleAndSetup: vi.fn(), baselineHistory: vi.fn(async () => []) } }
})

const S = SERVED as any
const GROUND = { id: 'g-sales', label: 'Sales team, Q4', release1bTabsOn: true, contextEnabled: true, createdAt: '2026-10-12T05:00:00Z' }
const qc = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })
const text = () => document.body.textContent ?? ''
const asServedOn = (r: any) => ({
  ...r, directMorning: true,
  ...(r.topLine === 'Your team’s reference for this work. They can read it, except People. Only you can add to it.' ? { topLine: 'Your team’s reference for this work.' } : {}),
  about: { ...r.about, whose: /^Groundwork wrote this from /.test(r.about?.whose ?? '') ? null : r.about?.whose },
})
const references = (served: any, isTheLead: boolean) => {
  vi.mocked(groundsApi.referencesAndResources).mockResolvedValue(served)
  return render(<QueryClientProvider client={qc()}><MemoryRouter><ReferencesAndResourcesPage groundId="g-sales" ground={GROUND} isTheLead={isTheLead} /></MemoryRouter></QueryClientProvider>)
}
beforeEach(() => { vi.clearAllMocks() })

describe('References and resources, as Grace reads it', () => {
  /* Changed 21 November 2026 (Batch E, N13): "Only you see this. ... They never see them." was a privacy note on a screen, which the standards forbid. It is gone with the switch off too; who may read People is still the backend's rule. */
  it('off: who can read it and who wrote it, and no privacy note on her notes', async () => {
    references({ ...S.grace.references, directMorning: false }, true)
    expect(await screen.findByText('Your team’s reference for this work. They can read it, except People. Only you can add to it.')).toBeTruthy()
    expect(text()).toContain('Groundwork wrote this from Grace’s words at setup.')
    expect(text()).toContain('Your notes on each person. Their check-ins do not use them yet.')
    expect(text()).not.toMatch(/Only you see this|They never see/)
  })
  it('on: what the page is, the purpose, how the team works and her notes on each person, with no privacy note', async () => {
    references(asServedOn(S.grace.references), true)
    expect(await screen.findByText('Your team’s reference for this work.')).toBeTruthy()
    expect(text()).toContain('This check-in is about your sales for water dispensers in Nairobi.')
    expect(text()).toContain('Won: a signed order or a payment, with proof.')
    expect(text()).toContain('Your notes on each person. Their check-ins do not use them yet.')
    expect(text()).not.toMatch(/Only you see this|They never see|They can read it, except People|Groundwork wrote this/)
  })
})

describe('References and resources, as Kevin reads it', () => {
  it('on and off, his top line names who keeps it, and he never reads People either way', async () => {
    const { unmount } = references({ ...S.kevin.references, directMorning: false }, false)
    expect(await screen.findByText('Your team’s reference for this work, kept by Grace.')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'People' })).toBeNull()
    unmount()
    references(asServedOn(S.kevin.references), false)
    expect(await screen.findByText('Your team’s reference for this work, kept by Grace.')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'People' })).toBeNull()
    expect(text()).not.toMatch(/Groundwork wrote this/)
  })
})

describe('People and setup, as Kevin reads it', () => {
  const open = (on: boolean) => {
    vi.mocked(groundsApi.peopleAndSetup).mockResolvedValue({ ...S.kevin.peopleAndSetup, directMorning: on })
    return render(<QueryClientProvider client={qc()}><MemoryRouter><YourPeopleAndSetup groundId="g-sales" /></MemoryRouter></QueryClientProvider>)
  }
  it('off: who sees what, as before', async () => {
    open(false)
    expect(await screen.findByText('5 people answer every weekday, until 30 October, here.')).toBeTruthy()
    expect(screen.getByText('Grace knows who is here. You see the team\'s report once it\'s shared, with names.')).toBeTruthy()
  })
  it('on: how it runs, his role, status and sessions, with no note about who sees what', async () => {
    open(true)
    expect(await screen.findByText('5 people answer every weekday, until 30 October, here.')).toBeTruthy()
    expect(screen.getByText('You have not described your role yet. You can add your job title on your profile.')).toBeTruthy()
    expect(text()).not.toMatch(/knows who is here|once it's shared/)
  })
})
