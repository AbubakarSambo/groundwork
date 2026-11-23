/**
 * THE DESK, PORTED FROM THE PROTOTYPE'S MARKUP, AS GRACE (AN ADMIN) READS IT (Hafsah, 21 November 2026). The Desk the local copy
 * served Grace that evening, saved as it came. With the design switch on she reads the prototype's Desk (D2-company): the
 * priorities as its cards, where the strategy isn't reaching the work, and then the Desk's own parts, so nothing is removed: the
 * documents with "Add a document", and where everyone who works here is. With it off, none of the port is drawn.
 *
 * UPDATED 24 November 2026 (page audit row 3, approved by Hafsah): Grace may open People, which lists everyone with their phone numbers,
 * so the Desk links there instead of a second list; the sections with nothing in them ("Named by more than one team", "What new people
 * keep asking", "History") are not drawn; the upload form is one link; and the goals are not listed a second time under the cards.
 * A member's Desk, who cannot open People, still lists who works here with each phone number.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CompanyPage } from './CompanyPage'
import { useAuthStore } from '@/stores/auth'
import served from './__fixtures__/the-desk-as-grace.json'

vi.mock('@/api/company', () => ({ companyApi: { get: vi.fn(), document: vi.fn(), addDocument: vi.fn() } }))
vi.mock('@/api/direction', () => ({ directionApi: { read: vi.fn(async () => ({ on: false })) } }))
vi.mock('@/api/policy', () => ({ policyApi: { board: vi.fn(async () => ({ on: false })) } }))
import { companyApi } from '@/api/company'

function open(designPass: boolean, role = 'ADMIN') {
  localStorage.clear()
  if (designPass) localStorage.setItem('gw-design-pass', 'on')
  ;(companyApi.get as any).mockResolvedValue(served)
  useAuthStore.setState({ user: { id: 'u-grace', firstName: 'Grace', role, organizationName: 'Msingi Foods' }, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={['/company']}><CompanyPage /></MemoryRouter></QueryClientProvider>)
}

beforeEach(() => vi.clearAllMocks())

describe('the Desk ported from the prototype, as Grace reads it', () => {
  it('with the switch off, none of the port is drawn', async () => {
    const { container } = open(false)
    await screen.findByText('Policies, handbook and documents')
    expect(container.querySelector('.gw-proto')).toBeNull()
  })

  it('with it on, she reads the prototype\'s Desk first, then the documents, then where everyone is, and no empty section', async () => {
    const { container } = open(true)
    await screen.findByText('Policies, handbook and documents')
    expect(container.querySelector('.gw-proto')).not.toBeNull()
    const text = container.textContent ?? ''
    const at = (w: string) => { const i = text.indexOf(w); expect(i, w).toBeGreaterThanOrEqual(0); return i }
    expect(at('Msingi Foods')).toBeLessThan(at('Ask about the whole organisation'))
    expect(at('Is the strategy moving?')).toBeLessThan(at('Priority 1'))
    expect(at('Priority 1')).toBeLessThan(at('Where the strategy isn’t reaching the work'))
    expect(at('Where the strategy isn’t reaching the work')).toBeLessThan(at('Policies, handbook and documents'))
    expect(at('Policies, handbook and documents')).toBeLessThan(at('Everyone who works here, with their phone numbers, is on People.'))
    /* One card for each priority, in the prototype's markup. */
    expect(container.querySelectorAll('#strategy > section:first-child > .panel')).toHaveLength((served as any).priorities.length)
    /* Adding a document is one link; the form opens from it. */
    expect(screen.getByRole('button', { name: 'Add a document' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Its title')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Add a document' }))
    expect(screen.getByLabelText('Its title')).toBeInTheDocument()
    /* No second list of people, no empty section, no privacy note. */
    expect(text).not.toContain('Who works here')
    for (const gone of ['What new people keep asking', 'Only the question is shown', 'People appear here as counts', 'No earlier version of the strategy',
      'Nothing has been named by more than one team yet', 'Your goals, and the check-ins that feed them']) expect(text).not.toContain(gone)
    if (!((served as any).namedByTeams ?? []).length) expect(text).not.toContain('Named by more than one team')
  })

  it('a member, who cannot open People, still reads who works here with every phone number', async () => {
    const { container } = open(true, 'MEMBER')
    await screen.findByText('Who works here')
    const text = container.textContent ?? ''
    for (const p of (served as any).desk.directory.slice(0, 10)) if (p.phone) expect(text).toContain(p.phone)
  })
})
