import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OpsDeploymentPage } from './OpsSellingPages'
import { opsApi } from '@/api/ops'

/**
 * A DELIVERY LOG SAT UNDER A CONVERSATION.
 *
 * "Callbacks from Groundwork to this back office / Nothing has arrived. Either nothing has
 * happened, or nobody has registered where to send it" was rendered inside the assistant panel,
 * directly beneath the chat. Her words: confusing as fuck on the chat. Two things were wrong with
 * it there - it read as something the assistant had said, and its empty state read as the
 * assistant having failed at something.
 *
 * It is on Deployment now, the page somebody opens to find out whether an integration is wired.
 * KEPT rather than dropped, because that empty sentence is the only signal anywhere that our own
 * callbacks are not arriving, and it separates the two reasons - nothing has happened is a
 * different problem from nobody has registered where to send it.
 *
 * RENDERED rather than grepped. The commit that moved this said in its own message that the
 * Deployment half was checked by source and suite only, because ops pages need an ops identity and
 * the browser session had expired. This is that half, done properly.
 */
vi.mock('@/api/ops', () => ({
  opsApi: {
    deployments: vi.fn(),
    groundworkEvents: vi.fn(),
    startDeployment: vi.fn(),
  },
}))

function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <OpsDeploymentPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(opsApi.deployments as any).mockResolvedValue([])
})

describe('the callback log, on the page it belongs to', () => {
  it('is on Deployment, with the two reasons kept apart', async () => {
    ;(opsApi.groundworkEvents as any).mockResolvedValue({
      events: [],
      says: 'Nothing has arrived. Either nothing has happened, or nobody has registered where to send it — and those are different problems.',
    })
    show()
    expect(await screen.findByText(/Callbacks from Groundwork to this back office/)).toBeTruthy()
    expect(await screen.findByText(/nobody has registered where to send it/)).toBeTruthy()
  })

  it('names an unverified delivery as unverified, rather than showing it as a dot', async () => {
    /* A signature that did not check out is the one worth seeing, so it is said in words. */
    ;(opsApi.groundworkEvents as any).mockResolvedValue({
      events: [
        { kind: 'report.released', verified: true, receivedAt: new Date().toISOString(), says: 'A report was released' },
        { kind: 'check-in.completed', verified: false, receivedAt: new Date().toISOString(), says: null },
      ],
      says: '2 received, some of which did not verify.',
    })
    show()
    expect(await screen.findByText(/A report was released/)).toBeTruthy()
    expect(await screen.findByText(/the signature did not check out/)).toBeTruthy()
  })

  it('says nothing at all while the call has not answered', async () => {
    /* Not an empty panel claiming nothing has arrived when nothing has been asked yet - that is
       the same fault as the assistant appearing to have failed. */
    ;(opsApi.groundworkEvents as any).mockReturnValue(new Promise(() => {}))
    show()
    await waitFor(() => expect(screen.queryByText(/Callbacks from Groundwork/)).toBeNull())
  })
})

describe('and no longer on the chat', () => {
  it('the assistant panel does not render it', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, 'TheAssistantAsACustomerSeesIt.tsx'), 'utf8',
    ).replace(/\/\*[\s\S]*?\*\/|\{\/\*[\s\S]*?\*\/\}|\/\/[^\n]*/g, '')
    expect(src).not.toMatch(/Callbacks from Groundwork/)
    expect(src).not.toMatch(/groundworkEvents/)
  })

  it('and offers what a panel can actually do instead', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, 'TheAssistantAsACustomerSeesIt.tsx'), 'utf8',
    )
    /*
     * THIS USED TO ASSERT THE OPPOSITE, and it was right at the time: the panel offered one thing
     * and EXPLAINED that starting a check-in and adding a person were machine-side. They are panel
     * routes now - POST check-ins and POST people - so the panel does them instead of describing
     * them, and an assertion that the explanation is still there would be pinning a limitation
     * that has been removed.
     */
    expect(src).toMatch(/Start a check-in/)
    expect(src).toMatch(/Add someone/)
    expect(src).toMatch(/Set an objective/)
    /* And the safety sentence stays with the act it belongs to: adding somebody is not letting
       them in. */
    expect(src).toMatch(/do not become a member of your organisation/)
  })
})
