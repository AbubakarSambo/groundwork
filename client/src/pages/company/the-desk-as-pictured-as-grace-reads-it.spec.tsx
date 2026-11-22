/**
 * THE DESK, PORTED FROM THE PROTOTYPE'S MARKUP, AS GRACE (AN ADMIN) READS IT (Hafsah, 21 November 2026). The Desk the local copy
 * served Grace that evening, saved as it came. With the design switch on she reads the prototype's Desk (D2-company): the
 * priorities as its cards, where the strategy isn't reaching the work, and then the Desk's own parts, so nothing is removed: the
 * documents with "Add a document", and who works here with each phone number. With it off, none of the port is drawn.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CompanyPage } from './CompanyPage'
import { useAuthStore } from '@/stores/auth'
import served from './__fixtures__/the-desk-as-grace.json'

vi.mock('@/api/company', () => ({ companyApi: { get: vi.fn(), document: vi.fn(), addDocument: vi.fn() } }))
vi.mock('@/api/direction', () => ({ directionApi: { read: vi.fn(async () => ({ on: false })) } }))
vi.mock('@/api/policy', () => ({ policyApi: { board: vi.fn(async () => ({ on: false })) } }))
import { companyApi } from '@/api/company'

function open(designPass: boolean) {
  localStorage.clear()
  if (designPass) localStorage.setItem('gw-design-pass', 'on')
  ;(companyApi.get as any).mockResolvedValue(served)
  useAuthStore.setState({ user: { id: 'u-grace', firstName: 'Grace', role: 'ADMIN', organizationName: 'Msingi Foods' }, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={['/company']}><CompanyPage /></MemoryRouter></QueryClientProvider>)
}

beforeEach(() => vi.clearAllMocks())

describe('the Desk ported from the prototype, as Grace reads it', () => {
  it('with the switch off, none of the port is drawn', async () => {
    const { container } = open(false)
    await screen.findByText('Who works here')
    expect(container.querySelector('.gw-proto')).toBeNull()
  })

  it('with it on, she reads the prototype\'s Desk first, then the documents and who works here, with every phone number', async () => {
    const { container } = open(true)
    await screen.findByText('Who works here')
    expect(container.querySelector('.gw-proto')).not.toBeNull()
    const text = container.textContent ?? ''
    const at = (w: string) => { const i = text.indexOf(w); expect(i, w).toBeGreaterThanOrEqual(0); return i }
    expect(at('Msingi Foods')).toBeLessThan(at('Ask about the whole organisation'))
    expect(at('Is the strategy moving?')).toBeLessThan(at('Priority 1'))
    expect(at('Priority 1')).toBeLessThan(at('Where the strategy isn’t reaching the work'))
    expect(at('Where the strategy isn’t reaching the work')).toBeLessThan(at('Policies, handbook and documents'))
    expect(at('Policies, handbook and documents')).toBeLessThan(at('Who works here'))
    /* One card for each priority, in the prototype's markup. */
    expect(container.querySelectorAll('#strategy > section:first-child > .panel')).toHaveLength((served as any).priorities.length)
    expect(text).toContain('Add a document')
    /* Who works here is ten people a page (Paged, from wip/combined); each phone number on the first page is said in full. */
    for (const p of (served as any).desk.directory.slice(0, 10)) if (p.phone) expect(text).toContain(p.phone)
  })
})
