import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/* Polish round 1 (26 October): Wanjiru makes Njeri the finance person on the Suites page; a lead is offered nothing. */
let role = 'ADMIN'
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: { role } }) }))
vi.mock('@/api/client', () => ({ apiClient: { get: vi.fn(), put: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
import { apiClient } from '@/api/client'
import { WhoLooksAfterWhat } from './WhoLooksAfterWhat'

const DUTIES = { organisation: [{ key: 'finance', ask: 'Who looks after finance?', holder: null }], people: [{ id: 'u-njeri', name: 'Njeri Wambui' }], said: [] }
const draw = () => render(<QueryClientProvider client={new QueryClient()}><WhoLooksAfterWhat /></QueryClientProvider>)

describe('who looks after what', () => {
  it('an admin names Njeri as the finance person', async () => {
    role = 'ADMIN'
    ;(apiClient.get as any).mockResolvedValue({ data: DUTIES })
    ;(apiClient.put as any).mockResolvedValue({ data: { ...DUTIES, organisation: [{ ...DUTIES.organisation[0], holder: { id: 'u-njeri', name: 'Njeri Wambui' } }] } })
    draw()
    fireEvent.change(await screen.findByLabelText('Who looks after finance?'), { target: { value: 'u-njeri' } })
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/suites/duties', { finance: 'u-njeri' }))
  })

  it('a lead is shown nothing, and nothing is asked of the server', async () => {
    role = 'LEAD'
    ;(apiClient.get as any).mockClear()
    draw()
    expect(screen.queryByText('Who looks after what')).toBeNull()
    expect(apiClient.get).not.toHaveBeenCalled()
  })
})
