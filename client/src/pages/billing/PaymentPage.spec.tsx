import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { PaymentPage } from './PaymentPage'

/**
 * B-045: this page used to centre its content vertically in the whole viewport
 * (`minHeight: '100vh'`, `justifyContent: 'center'`), leaving an empty band of roughly 300px
 * above "Back" and its own heading - every other page in the audit starts near the top instead.
 * The column no longer centres vertically; it starts near the top, the same as every other page.
 *
 * UPDATED FOR B-145: the heading used to be "Add sessions to this check-in", which the page's own
 * body then contradicted ("Sessions are not charged for"). The only thing this page actually does
 * once sessions are not free is redeem an access code, so that is what it is called now.
 */
vi.mock('@/api/billing', () => ({ billingApi: { redeemContributorCode: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn().mockResolvedValue({ isFreeGround: false }) } }))

function open() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/billing/checkout?groundId=g1&groundName=Sales%20team']}>
        <PaymentPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the checkout page starts near the top, like every other page (B-045)', () => {
  it('does not centre its content vertically in the viewport', async () => {
    open()
    expect(await screen.findByText('Use an access code')).toBeInTheDocument()
    /* B-126: the "Back" button's label now depends on whether there is real history to go back to
       (plain "Back") or not ("Back to this check-in"/"Back to Today") - matched by role rather than
       the exact word, so this test does not care which one it is. */
    const outer = screen.getByRole('button', { name: /^Back/ }).closest('div')!.parentElement as HTMLElement
    /* The outer column used to read `justifyContent: center` - the one property that pushed
       everything down by roughly half the viewport's height. It must now start the content at
       the top of its own flex column. */
    expect(outer.style.justifyContent).not.toBe('center')
    expect(outer.style.justifyContent).toBe('flex-start')
  })
})

describe('B-145: the title no longer contradicts the page', () => {
  it('is titled for what the page actually does, not "Add sessions"', async () => {
    open()
    expect(await screen.findByText('Use an access code')).toBeInTheDocument()
    expect(screen.queryByText('Add sessions to this check-in')).toBeNull()
    expect(await screen.findByText(/Sessions are not charged for/)).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/tier/i)
    expect(document.body.textContent).not.toMatch(/cap\b/i)
  })
})
