import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AnAdminDecidesWhetherItStarts } from './an-admin-decides-whether-it-starts'
import { howARowReads } from './how-a-row-reads'

/**
 * A CHECK-IN WAITING FOR AN ADMIN, AS THE ADMIN READS IT (U.5 review). Today's "… is waiting for
 * you to approve it" opens the check-in; there the admin can approve it or say no, and is not shown
 * the lead's own banner. On the list the admin's row says "Yours to approve".
 */
vi.mock('@/api/grounds', () => ({ groundsApi: { approve: vi.fn(async () => ({})), declineGround: vi.fn(async () => ({})) } }))
import { groundsApi } from '@/api/grounds'

function open() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter><AnAdminDecidesWhetherItStarts groundId="g-x" setUpBy="Omar Ali" /></MemoryRouter></QueryClientProvider>)
}
beforeEach(() => vi.clearAllMocks())

describe('on the check-in, as the admin', () => {
  it('says who set it up and what happens, with Approve and Not this one', () => {
    open()
    expect(screen.getByRole('heading', { name: 'This check-in is waiting for you to approve it' })).toBeTruthy()
    expect(screen.getByText('Omar Ali set it up. Nobody has been invited to it yet. Nothing goes out until you say so.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Approve' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Not this one' })).toBeTruthy()
  })

  it('Approve makes the same call as the check-ins list', async () => {
    open()
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    await waitFor(() => expect(groundsApi.approve).toHaveBeenCalledWith('g-x'))
  })

  it('Not this one asks why, and declines with the reason', async () => {
    open()
    fireEvent.click(screen.getByRole('button', { name: 'Not this one' }))
    fireEvent.change(screen.getByLabelText('Why not? They will see this.'), { target: { value: 'We have one already.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Decline it' }))
    await waitFor(() => expect(groundsApi.declineGround).toHaveBeenCalledWith('g-x', 'We have one already.'))
  })

  it('the check-in page shows this to an admin who is not its lead, and the lead\'s banner only to everyone else', () => {
    const page = readFileSync(join(__dirname, 'GroundAdminPage.tsx'), 'utf8')
    expect(page).toContain("(ground as any).status === 'AWAITING_APPROVAL' && isOrgAdmin && !isInitiator && (\n          <AnAdminDecidesWhetherItStarts")
    const lead = page.indexOf("(ground as any).status === 'AWAITING_APPROVAL' && !(isOrgAdmin && !isInitiator) && (")
    expect(lead).toBeGreaterThan(-1)
    expect(page.slice(lead, lead + 900)).toContain('Waiting for an admin to accept this check-in')
  })
})

describe('on the list', () => {
  const waiting = { id: 'g-x', label: 'Supplier review', status: 'AWAITING_APPROVAL', initiatorId: 'u-omar', participants: [], checkIns: [] }
  it('the admin reads "Yours to approve"', () => {
    expect(howARowReads(waiting, 'u-grace', new Date(), { isAdmin: true }).needs).toEqual({ text: 'Yours to approve', tone: 'action' })
  })
  it('the person who set it up reads "Waiting for an admin"', () => {
    expect(howARowReads(waiting, 'u-omar', new Date()).needs).toEqual({ text: 'Waiting for an admin', tone: 'plain' })
  })
})
