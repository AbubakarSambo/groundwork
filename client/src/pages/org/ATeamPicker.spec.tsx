import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { apiClient } from '@/api/client'
import { ATeamPicker, TheTeamsHere } from './ATeamPicker'

/** A TEAM IS PICKED FROM THE TEAMS HERE, WITH "ADD A NEW TEAM" AT THE END (Hafsah, 21 November 2026). */
const TEAMS = [{ name: 'Operations', people: 2 }, { name: 'Sales', people: 4 }]
beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(apiClient, 'get').mockResolvedValue({ data: TEAMS } as any)
})
const wrap = (ui: any) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>)

function Holder({ start = '' }: { start?: string }) {
  const [v, setV] = useState(start)
  return <><ATeamPicker value={v} onChange={setV} /><output>{v}</output></>
}

describe('the team picker', () => {
  it('offers the teams here and "Add a new team", and keeps the one picked', async () => {
    wrap(<Holder start="Sales" />)
    const select = await screen.findByLabelText('Team') as HTMLSelectElement
    await waitFor(() => expect(Array.from(select.options).map((o) => o.textContent)).toEqual(['No team', 'Operations', 'Sales', 'Add a new team']))
    expect(select.value).toBe('Sales')
    expect(screen.queryByLabelText('The new team’s name')).toBeNull()
  })
  it('"Add a new team" opens one box to type it', async () => {
    wrap(<Holder />)
    const select = await screen.findByLabelText('Team')
    await waitFor(() => expect((select as HTMLSelectElement).options.length).toBe(4))
    fireEvent.change(select, { target: { value: '__new__' } })
    fireEvent.change(screen.getByLabelText('The new team’s name'), { target: { value: 'Finance' } })
    expect(screen.getByText('Finance', { selector: 'output' })).toBeTruthy()
  })
})

describe('Teams on People', () => {
  it('each team, and how many people are on it, in a full sentence', async () => {
    wrap(<TheTeamsHere />)
    expect(await screen.findByText('4 people are on this team.')).toBeTruthy()
    expect(screen.getByText('Operations')).toBeTruthy()
  })
})
