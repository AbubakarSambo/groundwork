import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TeamBoardsPage } from './TeamBoardsPage'
import { groundsApi } from '@/api/grounds'

/**
 * B-150. Team boards used to draw the whole check-in page's own chrome under the tab switcher - a
 * second breadcrumb, a second title, and the six tabs Ask/Board/Check-in/Context and
 * resources/My work/People and setup - because `BoardPage` used to carry `TheCheckInHeader`. It no
 * longer does (`TheCheckInHeader` is retired from that page), so this page now shows only the
 * switcher and the board - plus, since that chrome's own link to the check-in went with it, one
 * plain "Open this check-in" link so a reader can still get there.
 */
vi.mock('@/api/grounds', () => ({ groundsApi: { list: vi.fn() } }))
vi.mock('@/pages/board/BoardPage', () => ({ BoardPage: ({ groundId }: { groundId: string }) => <div data-testid="board">board for {groundId}</div> }))

function open() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/boards']}>
        <TeamBoardsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('B-150: Team boards shows only the switcher and the board, with one way to the check-in', () => {
  it('draws no second breadcrumb, title or six-tab bar, and offers "Open this check-in"', async () => {
    ;(groundsApi.list as any).mockResolvedValue([
      { id: 'g1', label: 'Weekly sales push, Nairobi', hasBoard: true, closedAt: null },
      { id: 'g2', label: 'Get a project back on track', hasBoard: true, closedAt: null },
    ])
    open()
    expect(await screen.findByTestId('board')).toHaveTextContent('board for g1')
    expect(screen.getByRole('heading', { name: 'Team boards' })).toBeTruthy()
    expect(screen.queryByText('Check-in / Weekly sales push, Nairobi')).toBeNull()
    expect(screen.queryByRole('tab', { name: 'Context and resources' })).toBeNull()
    expect(screen.queryByRole('tab', { name: 'People and setup' })).toBeNull()
    const link = screen.getByRole('link', { name: 'Open this check-in' })
    expect(link).toHaveAttribute('href', '/grounds/g1')
  })

  it('the link follows the active tab', async () => {
    ;(groundsApi.list as any).mockResolvedValue([
      { id: 'g1', label: 'Weekly sales push, Nairobi', hasBoard: true, closedAt: null },
      { id: 'g2', label: 'Get a project back on track', hasBoard: true, closedAt: null },
    ])
    open()
    await screen.findByTestId('board')
    fireEvent.click(screen.getByRole('tab', { name: /Get a project back on track/ }))
    await waitFor(() => expect(screen.getByTestId('board')).toHaveTextContent('board for g2'))
    expect(screen.getByRole('link', { name: 'Open this check-in' })).toHaveAttribute('href', '/grounds/g2')
  })
})
