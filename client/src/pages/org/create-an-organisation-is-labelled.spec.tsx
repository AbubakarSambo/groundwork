import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OrgNewPage } from './OrgNewPage'

/**
 * "CREATE AN ORGANISATION" (A3, #/org-new): each box is named by its label, not by its placeholder
 * (U.3 review). The placeholders are the prototype's examples ("For example, Baridi Foundation"), and a
 * screen reader must say "Organisation name", which is what the box is for.
 */
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ setAuth: vi.fn(), user: { id: 'u1' } }) }))
vi.mock('@/api/billing', () => ({ billingApi: { getPricing: vi.fn().mockResolvedValue({}) } }))

describe('the boxes on "Create an organisation"', () => {
  it('are named by their labels', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={qc}><MemoryRouter><OrgNewPage /></MemoryRouter></QueryClientProvider>)
    const name = screen.getByRole('textbox', { name: 'Organisation name' })
    expect(name.getAttribute('placeholder')).toBe('For example, Baridi Foundation')
    expect(screen.getByRole('textbox', { name: 'A billing email (optional)' })).toBeTruthy()
    expect(screen.queryByRole('textbox', { name: 'For example, Baridi Foundation' })).toBeNull()
  })
})
