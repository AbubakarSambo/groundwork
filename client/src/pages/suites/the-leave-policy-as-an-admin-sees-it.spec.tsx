import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/*
 * THE LEAVE POLICY ON THE SUITES PAGE (Hafsah, 20 November 2026). Grace, the admin, reads the whole policy in the server's own
 * sentences, changes a type of leave, and confirms a public holiday the model drafted. A member is refused by the server, and the
 * page says the server's sentence, never the policy.
 */
vi.mock('@/api/client', () => ({ apiClient: { get: vi.fn(), put: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
import { apiClient } from '@/api/client'
import { TheLeavePolicy } from './TheLeavePolicy'

const RULES = {
  rules: { kinds: [{ key: 'annual', name: 'Annual leave', days: 21 }, { key: 'sick', name: 'Sick leave', days: 10, paid: true, noticeDays: 0 }], country: 'Kenya' },
  said: ['Each person has 21 days of annual leave a year.', 'Each person has 10 days of sick leave a year.', 'Sick leave is paid.', 'Your organisation is in Kenya.'],
  hr: null,
}
const PLACES = {
  offices: [{ id: 'o-1', name: 'Lagos', country: 'Nigeria', people: [{ id: 'u-omar', name: 'Omar Said' }] }],
  holidays: [{ id: 'h-1', office: null, on: '2027-06-01', when: 'Tuesday 1 June', name: 'Madaraka Day', confirmed: false, drafted: true }],
  people: [{ id: 'u-omar', name: 'Omar Said' }, { id: 'u-aisha', name: 'Aisha Otieno' }],
  country: 'Kenya',
  said: ['The Lagos office is in Nigeria. Omar Said works from it, and follows its public holidays.', 'Everybody else follows the public holidays of Kenya.'],
}
const draw = () => render(<QueryClientProvider client={new QueryClient()}><TheLeavePolicy /></QueryClientProvider>)

describe('the leave policy, as Grace the admin sees it', () => {
  it('reads the whole policy in full sentences, and each holiday not yet confirmed says so', async () => {
    ;(apiClient.get as any).mockImplementation(async (url: string) => ({ data: url.endsWith('/places') ? PLACES : RULES }))
    draw()
    for (const line of [...RULES.said, ...PLACES.said]) expect(await screen.findByText(line)).toBeTruthy()
    expect(screen.getByText(/Madaraka Day, on Tuesday 1 June\. It is not confirmed yet, so it does not count\./)).toBeTruthy()
    expect(screen.getByText('The Lagos office is in Nigeria.')).toBeTruthy()
  })

  it('changes sick leave to 12 days a year through the leave rules', async () => {
    ;(apiClient.get as any).mockImplementation(async (url: string) => ({ data: url.endsWith('/places') ? PLACES : RULES }))
    ;(apiClient.put as any).mockResolvedValue({ data: RULES })
    draw()
    const days = await screen.findAllByLabelText('How many days?')
    fireEvent.change(days[1], { target: { value: '12' } })
    fireEvent.click(screen.getByText('Save the types of leave'))
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/suites/leave/rules', { kinds: [RULES.rules.kinds[0], { ...RULES.rules.kinds[1], days: 12 }] }))
  })

  it('confirms the drafted holiday for its year', async () => {
    ;(apiClient.get as any).mockImplementation(async (url: string) => ({ data: url.endsWith('/places') ? PLACES : RULES }))
    ;(apiClient.put as any).mockReset().mockResolvedValue({ data: PLACES })
    draw()
    fireEvent.click(await screen.findByText('Confirm it'))
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/suites/leave/places', {
      holidays: [{ office: null, year: 2027, list: [{ on: '2027-06-01', name: 'Madaraka Day', confirmed: true }] }],
    }))
  })

  it('somebody the server refuses reads its sentence, and nothing of the policy', async () => {
    ;(apiClient.get as any).mockImplementation(async () => { throw { response: { status: 403, data: { message: 'Only an admin or whoever looks after HR can set the leave rules.' } } } })
    draw()
    expect(await screen.findByText('Only an admin or whoever looks after HR can set the leave rules.')).toBeTruthy()
    expect(screen.queryByText('The leave policy')).toBeNull()
  })
})
