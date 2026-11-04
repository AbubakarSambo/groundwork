import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

/**
 * JOINING BY A LINK ASKS FOR A PHONE NUMBER (Hafsah, 30 October 2026: "phone numbers are always shown and editable, whether
 * WhatsApp is on or off ... and joining. Label it plainly 'Phone number'"). Nobody is signed in on the join page, so the number is
 * kept beside the address and saved to them through PATCH /auth/me (what Settings uses) once that address signs in.
 */
vi.mock('@/api/entry', () => ({ joinApi: { preview: vi.fn(), accept: vi.fn(), confirm: vi.fn() } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ setAuth: vi.fn() }) }))
vi.mock('@/api/auth', () => ({ authApi: { setPhoneNumber: vi.fn(async () => ({})) } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

import { joinApi } from '@/api/entry'
import { authApi } from '@/api/auth'
import { toast } from 'sonner'
import { JoinPage } from './JoinPage'
import { saveTheNumberTheyGave, keepTheNumberForWhenTheySignIn } from '@/lib/a-number-given-before-signing-in'

const renderJoin = () => render(<MemoryRouter initialEntries={['/join?t=jt-1']}><Routes><Route path="/join" element={<JoinPage />} /></Routes></MemoryRouter>)

describe('the join page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    ;(joinApi.preview as any).mockResolvedValue({ groundId: 'g1', groundLabel: 'Q3 alignment', scenario: 'NEW_PROJECT', initiatorName: 'Sarah' })
    ;(joinApi.accept as any).mockResolvedValue({ to: 'amani@kito.test', says: 'We sent you a link.' })
  })

  it('shows "Phone number", optional, and says nothing about WhatsApp to somebody not signed in', async () => {
    renderJoin()
    const field = await screen.findByLabelText('Phone number') as HTMLInputElement
    expect(field.placeholder).toBe('+254 712 345 678')
    expect(screen.getByText('Optional.')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/WhatsApp/)
  })

  it('keeps a typed number for the address, and saves it through PATCH /auth/me when that address signs in', async () => {
    renderJoin()
    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'amani@kito.test' } })
    fireEvent.change(screen.getByLabelText('Your part in this'), { target: { value: 'I run the clinic' } })
    fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '+254 712 345 678' } })
    fireEvent.click(screen.getByRole('button', { name: 'Email me my link' }))
    await screen.findByText('Check your email')
    /* Somebody else signing in here is never given it. */
    await saveTheNumberTheyGave('someone@else.test')
    expect(authApi.setPhoneNumber).not.toHaveBeenCalled()
    await saveTheNumberTheyGave('Amani@Kito.test')
    expect(authApi.setPhoneNumber).toHaveBeenCalledWith('+254 712 345 678')
    /* Saved once. */
    await saveTheNumberTheyGave('amani@kito.test')
    expect(authApi.setPhoneNumber).toHaveBeenCalledTimes(1)
  })

  it('a number that does not save says so plainly, and they stay signed in', async () => {
    vi.mocked(authApi.setPhoneNumber).mockRejectedValueOnce({})
    keepTheNumberForWhenTheySignIn('amani@kito.test', '0712')
    await saveTheNumberTheyGave('amani@kito.test')
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Your phone number did not save. You can add it in Settings.'))
  })
})
