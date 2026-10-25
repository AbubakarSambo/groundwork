import { describe, it, expect, vi } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

const { recommit } = vi.hoisted(() => ({ recommit: vi.fn(async (_: unknown) => ({ outcome: 'stopped', says: 'Stopped. It will not be counted as missed.' })) }))
vi.mock('@/api/direction', async () => { const F = (await import('./__fixtures__.json')).default; return { directionApi: { read: vi.fn(async () => F.read), brief: vi.fn(async () => F.brief), mine: vi.fn(async () => F.mine), recommit, approve: vi.fn(), setBrief: vi.fn(), setNew: vi.fn() } } })
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn(async () => ({ participants: [] })), list: vi.fn(async () => []) } }))
import { DirectionPage } from './DirectionPage'

/* Release 6, hand-written data only: Baridi Appliances (test)'s direction, built by the engine (modules/direction) and read by Wairimu, who leads Sales. */
const open = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><DirectionPage /></MemoryRouter></QueryClientProvider>)

describe('Release 6: the Direction page', () => {
  it('reads the company tab as "Direction: the company": now, what changed, each team, has it realigned', async () => {
    open()
    await screen.findByRole('heading', { name: 'Now' })
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Now', 'What changed', 'What it means for each team', 'Has the organisation actually realigned?'])
    expect(screen.getByText('Keep the customers we have, and get paid on time.', { selector: '.panel p' })).toBeTruthy()
    const teams = screen.getByRole('list', { name: 'What it means for each team' })
    expect(within(teams).getByText('Waiting for Njeri')).toBeTruthy()
    expect(screen.getByText('Operations is waiting for Njeri.')).toBeTruthy()
  })

  it('opens a team\'s tab on its brief, and lets the person stop a goal, which is not counted as missed', async () => {
    open()
    fireEvent.click(await screen.findByRole('tab', { name: 'Sales' }))
    expect(await screen.findByRole('heading', { name: 'Wairimu’s brief' })).toBeTruthy()
    expect(screen.getByText('Chasing 20 new small shops a month (Miriam)')).toBeTruthy()
    expect(screen.getByText('“Which of your customers are at risk of paying late, and what are you doing about it?” replaces “How many new shops did you visit?”')).toBeTruthy()
    const mine = await screen.findByRole('list', { name: 'Your goals' })
    fireEvent.click(within(mine).getByRole('button', { name: 'Stop' }))
    await vi.waitFor(() => expect(recommit).toHaveBeenCalledWith({ objectiveId: 'o-miriam', outcome: 'stop' }))
  })

  it('shows the loop and the revisions', async () => {
    open()
    fireEvent.click(await screen.findByRole('tab', { name: 'The loop' }))
    expect(screen.getByText('Version 2, set on 15 September')).toBeTruthy()
    expect(screen.getByText('Version 1, set on 1 July')).toBeTruthy()
  })
})
