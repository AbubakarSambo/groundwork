import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ApprovalStepsByAmount } from './ApprovalStepsByAmount'

/**
 * APPROVALS IN STEPS, SET ON THE SPENDING PAGE (Hafsah, 26 October 2026). Grace sets "over KES 20,000, finance first, then their manager"
 * without Ask: each step shown, changed or taken out, and saved into the one setting Ask and the policy board also write.
 */
vi.mock('@/api/suites', () => ({ spendRulesApi: { get: vi.fn(), setThresholds: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
import { spendRulesApi } from '@/api/suites'

const show = () => render(<QueryClientProvider client={new QueryClient()}><ApprovalStepsByAmount currency="KES" /></QueryClientProvider>)
beforeEach(() => vi.clearAllMocks())

describe('who approves, by amount', () => {
  it('Grace adds an amount: finance first, then their manager, and it saves in that order', async () => {
    vi.mocked(spendRulesApi.get).mockResolvedValue({ rules: {}, said: ['There are no categories set, so a request to spend is kept in the person’s own words.'] })
    vi.mocked(spendRulesApi.setThresholds).mockResolvedValue({ rules: { thresholds: [{ above: 20000, steps: [['finance'], ['manager']] }] }, said: ['A request to spend over KES 20,000 goes first to whoever looks after finance, and then to the person’s manager.'] })
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Add an amount' }))
    fireEvent.change(screen.getByLabelText('Amount 1'), { target: { value: '20000' } })
    expect((screen.getByLabelText('Step 1 over KES 20,000') as HTMLSelectElement).value).toBe('finance')
    expect((screen.getByLabelText('Step 2 over KES 20,000') as HTMLSelectElement).value).toBe('manager')
    fireEvent.click(screen.getByRole('button', { name: 'Save the steps' }))
    await waitFor(() => expect(spendRulesApi.setThresholds).toHaveBeenCalledWith([{ above: 20000, steps: [['finance'], ['manager']] }]))
    expect(await screen.findByText('A request to spend over KES 20,000 goes first to whoever looks after finance, and then to the person’s manager.')).toBeInTheDocument()
  })

  it('a step set by the policy board is shown, can be changed and taken out', async () => {
    vi.mocked(spendRulesApi.get).mockResolvedValue({ rules: { thresholds: [{ above: 50000, steps: [['budgetOwner'], ['finance'], ['chiefExecutive']] }] }, said: [] })
    vi.mocked(spendRulesApi.setThresholds).mockImplementation(async (t) => ({ rules: { thresholds: t }, said: [] }))
    show()
    const second = await screen.findByLabelText('Step 2 over KES 50,000')
    fireEvent.change(second, { target: { value: 'hr' } })
    fireEvent.click(screen.getByRole('button', { name: 'Take out step 3' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save the steps' }))
    await waitFor(() => expect(spendRulesApi.setThresholds).toHaveBeenCalledWith([{ above: 50000, steps: [['budgetOwner'], ['hr']] }]))
  })

  it('nothing is shown to somebody the rules are not served to', async () => {
    vi.mocked(spendRulesApi.get).mockRejectedValue(Object.assign(new Error('no'), { response: { status: 403 } }))
    const { container } = show()
    await waitFor(() => expect(spendRulesApi.get).toHaveBeenCalled())
    expect(container.textContent).toBe('')
  })
})
