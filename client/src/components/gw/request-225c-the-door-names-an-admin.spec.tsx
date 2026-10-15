import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const get = vi.fn()
vi.mock('@/api/client', () => ({ apiClient: { get: (...a: unknown[]) => get(...a) } }))
import { ADoorYouCannotOpen } from './a-door-you-cannot-open-says-so'

/** Request 225 (c): a member refused People or Plan and billing reads which admin can change it, by name. */
describe('the admin page door names an admin', () => {
  it('People, read by a member', async () => {
    get.mockResolvedValue({ data: { data: { name: 'Wairimu Njoroge' } } })
    render(<MemoryRouter><ADoorYouCannotOpen may={false} what="open People"><p>hidden</p></ADoorYouCannotOpen></MemoryRouter>)
    expect(await screen.findByText('Your role here is not an admin’s. Wairimu Njoroge is an admin here and can change it.')).toBeTruthy()
    expect(get).toHaveBeenCalledWith('/users/an-admin')
  })
  it('Plan and billing, read by a member', async () => {
    get.mockResolvedValue({ data: { data: { name: 'Baraka Mutua' } } })
    render(<MemoryRouter><ADoorYouCannotOpen may={false} what="open Plan and billing"><p>hidden</p></ADoorYouCannotOpen></MemoryRouter>)
    expect(await screen.findByText('Your role here is not an admin’s. Baraka Mutua is an admin here and can change it.')).toBeTruthy()
  })
  it('with no name served, the sentence stays true without one', async () => {
    get.mockResolvedValue({ data: { data: { name: null } } })
    render(<MemoryRouter><ADoorYouCannotOpen may={false} what="open People"><p>hidden</p></ADoorYouCannotOpen></MemoryRouter>)
    expect(await screen.findByText('Your role here is not an admin’s. An admin can change it.')).toBeTruthy()
  })
})
