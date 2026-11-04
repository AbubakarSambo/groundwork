import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ApprovalStepsByAmount } from './ApprovalStepsByAmount'

/**
 * APPROVALS IN STEPS, SET ON THE SPENDING PAGE (Hafsah, 26 October 2026), AND THE ONE PLACE THAT SAYS WHO APPROVES (Hafsah's plan of
 * 2 November, step 0). A new amount starts with the person's manager, never finance: finance is an approver only when a step says so,
 * and its check-and-pay comes after the last approval. Every sentence above the steps is the server's own, so the page never says a
 * route the requests do not follow. A step may name one person, and the receipt rule is set here too.
 */
vi.mock('@/api/suites', () => ({ spendRulesApi: { get: vi.fn(), setThresholds: vi.fn(), setReceiptRule: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
import { spendRulesApi } from '@/api/suites'

const show = () => render(<QueryClientProvider client={new QueryClient()}><ApprovalStepsByAmount currency="KES" /></QueryClientProvider>)
beforeEach(() => vi.clearAllMocks())
const PEOPLE = [{ id: 'u-wanjiru', name: 'Wanjiru Mwangi' }, { id: 'u-njeri', name: 'Njeri Wambui' }]
const ROUTE = [
  'Up to KES 10,000, the person’s manager approves, or else an admin.',
  'Over KES 10,000, Wanjiru approves.',
  'Once it is approved, Njeri in finance checks it, notes the receipt or quote, and records it paid.',
]

describe('who approves, by amount', () => {
  it('Wanjiru reads the whole route in the server’s words, with finance’s part after the last approval', async () => {
    vi.mocked(spendRulesApi.get).mockResolvedValue({ rules: { thresholds: [{ above: 10000, steps: [[{ named: 'u-wanjiru' }]] }] }, said: ROUTE, people: PEOPLE })
    const { container } = show()
    for (const line of ROUTE) expect(await screen.findByText(line)).toBeInTheDocument()
    expect((screen.getByLabelText('Step 1 over KES 10,000') as HTMLSelectElement).value).toBe('named:u-wanjiru')
    expect(container.textContent).not.toContain('No steps are set by amount')
  })

  it('a new amount starts with the person’s manager, and a step can name a person', async () => {
    vi.mocked(spendRulesApi.get).mockResolvedValue({ rules: {}, said: ['For any amount, the person’s manager approves, or else an admin.'], people: PEOPLE })
    vi.mocked(spendRulesApi.setThresholds).mockImplementation(async (t) => ({ rules: { thresholds: t }, said: [], people: PEOPLE }))
    show()
    expect(await screen.findByText('For any amount, the person’s manager approves, or else an admin.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Add an amount' }))
    fireEvent.change(screen.getByLabelText('Amount 1'), { target: { value: '10000' } })
    expect((screen.getByLabelText('Step 1 over KES 10,000') as HTMLSelectElement).value).toBe('manager')
    expect(screen.queryByLabelText('Step 2 over KES 10,000')).toBeNull()
    fireEvent.change(screen.getByLabelText('Step 1 over KES 10,000'), { target: { value: 'named:u-wanjiru' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save the steps' }))
    await waitFor(() => expect(spendRulesApi.setThresholds).toHaveBeenCalledWith([{ above: 10000, steps: [[{ named: 'u-wanjiru' }]] }]))
  })

  it('Grace sets the receipt rule: every request needs a receipt', async () => {
    vi.mocked(spendRulesApi.get).mockResolvedValue({ rules: {}, said: ROUTE, people: PEOPLE })
    vi.mocked(spendRulesApi.setReceiptRule).mockResolvedValue({ rules: { evidence: { what: 'receipt', above: 0 } }, said: [...ROUTE, 'Every request needs a receipt.'], people: PEOPLE })
    show()
    const rule = await screen.findByLabelText('Does a request need a receipt or a quote?')
    expect((rule as HTMLSelectElement).value).toBe('none')
    fireEvent.change(rule, { target: { value: 'receipt' } })
    await waitFor(() => expect(spendRulesApi.setReceiptRule).toHaveBeenCalledWith({ what: 'receipt', above: 0 }))
    expect(await screen.findByText('Every request needs a receipt.')).toBeInTheDocument()
  })

  it('a step set by the policy board is shown, can be changed and taken out', async () => {
    vi.mocked(spendRulesApi.get).mockResolvedValue({ rules: { thresholds: [{ above: 50000, steps: [['budgetOwner'], ['finance'], ['chiefExecutive']] }] }, said: [], people: [] })
    vi.mocked(spendRulesApi.setThresholds).mockImplementation(async (t) => ({ rules: { thresholds: t }, said: [], people: [] }))
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
