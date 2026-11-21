import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { APersonsDetails } from './APersonsDetails'

/**
 * A PERSON'S CV AND EMERGENCY CONTACT, AS EACH READER READS THEM (Hafsah, 21 November 2026). The page draws only what the server
 * sends (api/src/modules/users/who-reads-a-persons-details.ts): what each reader is sent is the server's own answer, mocked here as
 * the server's spec proves it.
 */
const CV = { fileName: 'Miriam Wanjiku CV.pdf', size: 120000, uploadedAt: '2026-11-20T09:00:00Z' }
const CONTACT = { name: 'Esther Wanjiku', relationship: 'sister', phone: '+254 712 345 678' }
const AS_SENT: Record<string, any> = {
  miriam: { cv: CV, mayChangeCv: true, emergencyContact: CONTACT, mayChangeEmergencyContact: true },
  grace: { cv: CV, mayChangeCv: true, emergencyContact: CONTACT, mayChangeEmergencyContact: true },
  wairimu: { cv: CV, mayChangeCv: false, mayChangeEmergencyContact: false },
  joseph: { mayChangeCv: false, mayChangeEmergencyContact: false },
}
function asRead(by: string, own = false) {
  vi.spyOn(apiClient, 'get').mockResolvedValue({ data: AS_SENT[by] } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><APersonsDetails userId="u-miriam" own={own} /></QueryClientProvider>)
}
beforeEach(() => { vi.restoreAllMocks() })

describe('Miriam, on her own You page', () => {
  it('reads her CV and her emergency contact, each with a quiet "Change"', async () => {
    asRead('miriam', true)
    expect(await screen.findByRole('heading', { name: 'Your details' })).toBeTruthy()
    expect(screen.getByText('Miriam Wanjiku CV.pdf, added on 20 November 2026.')).toBeTruthy()
    expect(screen.getByText('Esther Wanjiku, your sister, on +254 712 345 678.')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'Change' })).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Download' })).toBeTruthy()
  })

  it('with nothing yet, reads that plainly, with "Add"', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { cv: null, mayChangeCv: true, emergencyContact: null, mayChangeEmergencyContact: true } } as any)
    render(<QueryClientProvider client={new QueryClient()}><APersonsDetails userId="u-miriam" own /></QueryClientProvider>)
    expect(await screen.findByText('You have not added a CV yet. A PDF or a Word file.')).toBeTruthy()
    expect(screen.getByText('You have not added anyone to call in an emergency yet.')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'Add' })).toHaveLength(2)
  })

  it('saving the contact writes the three boxes to her own record', async () => {
    asRead('miriam', true)
    const put = vi.spyOn(apiClient, 'put').mockResolvedValue({ data: AS_SENT.miriam } as any)
    fireEvent.click((await screen.findAllByRole('button', { name: 'Change' }))[1])
    fireEvent.change(screen.getByLabelText('Their phone number, with the country code'), { target: { value: '+254 700 111 222' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(put).toHaveBeenCalledWith('/person-details/u-miriam/emergency-contact', { name: 'Esther Wanjiku', relationship: 'sister', phone: '+254 700 111 222' }))
  })
})

describe('as somebody else reads Miriam', () => {
  it('Grace, an admin, reads both and may change both', async () => {
    asRead('grace')
    expect(await screen.findByRole('heading', { name: 'Their details' })).toBeTruthy()
    expect(screen.getByText('Esther Wanjiku, their sister, on +254 712 345 678.')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'Change' })).toHaveLength(2)
  })

  it('Wairimu, her manager, reads her CV to download, and no emergency contact at all', async () => {
    const { container } = asRead('wairimu')
    expect(await screen.findByText('Miriam Wanjiku CV.pdf, added on 20 November 2026.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Download' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Change' })).toBeNull()
    expect(screen.queryByText('Emergency contact')).toBeNull()
    expect(container.textContent).not.toMatch(/Esther|712/)
  })

  it('Joseph, a colleague, reads nothing of either: the section is not drawn', async () => {
    const { container } = asRead('joseph')
    await waitFor(() => expect(apiClient.get).toHaveBeenCalled())
    expect(screen.queryByRole('heading', { name: 'Their details' })).toBeNull()
    expect(container.textContent).toBe('')
  })
})
