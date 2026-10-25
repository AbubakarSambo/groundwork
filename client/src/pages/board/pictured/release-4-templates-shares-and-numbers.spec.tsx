import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import SUPPORT from '@/pages/preview/__fixtures__/release-4-support-desk.json'
import ENG from '@/pages/preview/__fixtures__/release-4-engineering.json'
import LIBRARY from '@/pages/templates/__fixtures__.json'
import { ThePicturedBoard } from './ThePicturedBoard'
import { theRelease4Order } from '../release-4-orders'

vi.mock('@/api/grounds', async (orig) => ({ ...(await orig() as object), groundsApi: { templates: vi.fn(async () => LIBRARY) } }))
import { TemplatesPage } from '@/pages/templates/TemplatesPage'

/* Release 4, hand-written data only (Kijani Helpdesk and Jenga Software, both test organisations): each person's own target beside the
   team's, why the numbers don't match, the team's template on its board, and the template library. */
const draw = (b: any, kind: string) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter><ThePicturedBoard order={theRelease4Order(kind, true)!} b={b} groundId="g"
    sessionRows={[]} renderActions={() => null} overTime={null} recommendations={[]} onAnswerRecommendation={() => undefined}
    recommendationBusy={false} onRecordTheDecision={() => undefined} navigate={() => undefined} /></MemoryRouter></QueryClientProvider>)
}

describe('Release 4: the team\'s targets with each person\'s own', () => {
  it('lists each person\'s own target under the team\'s, by first name', () => {
    draw(SUPPORT, 'support desk')
    const own = screen.getByRole('list', { name: 'Each person\'s own target for Passed to engineering each week' })
    expect(within(own).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Tom3 of at most 2', 'Halima2 of at most 2', 'Otieno1 of at most 1'])
  })

  it('says why the numbers don\'t match, in the same panel, in a full sentence', () => {
    draw(SUPPORT, 'support desk')
    expect(screen.getByRole('heading', { name: 'Why the numbers don’t match' })).toBeTruthy()
    expect(screen.getByText("The team's figure for Passed to engineering each week is 7, and each person's own figures add up to 6. 1 of the team's figure is not in anyone's own figure.")).toBeTruthy()
  })
})

describe('Release 4: the team\'s template', () => {
  it('shows how the team\'s work moves, stage by stage, from the template the lead attached', () => {
    draw(ENG, 'engineering release')
    expect(screen.getByRole('heading', { name: 'How this team’s work moves' })).toBeTruthy()
    const stages = screen.getByRole('list', { name: 'The stages, in order' })
    expect(within(stages).getAllByRole('listitem')[0].textContent).toMatch(/^1\. Planned/)
  })

  it('shows nothing where no template is attached', () => {
    draw(SUPPORT, 'support desk')
    expect(screen.queryByRole('heading', { name: 'How this team’s work moves' })).toBeNull()
  })
})

describe('Release 4: the template library', () => {
  it('lists the thirteen and opens the first in full, as templates.jpg', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={qc}><MemoryRouter><TemplatesPage /></MemoryRouter></QueryClientProvider>)
    const nav = await screen.findByRole('navigation', { name: 'Templates' })
    expect(within(nav).getAllByRole('button')).toHaveLength(13)
    expect(screen.getByRole('heading', { level: 2, name: 'HR, hiring' })).toBeTruthy()
    expect(screen.getByText('Unit of work')).toBeTruthy()
    expect(screen.getByText('A candidate with no new step in 7 days')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'The ladder' })).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/[A-Za-z]:\s*[A-Za-z]{3,}\s*·/)
  })
})
