import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth'

/**
 * GROUP 1 REVIEW: SETTINGS, "YOUR DATA" AND OTHER WORDING. The reviewer sent this page back for a
 * jargon word ("grounds"), a count that did not match the list shown beneath it, name help that
 * did not match the prototype's own words, a solid red "Leave" button where the prototype uses a
 * secondary button with red words, and a confirmation sentence that named "contributions" rather
 * than what a person actually reads elsewhere on this page ("what you said").
 */
vi.mock('@/lib/whatsapp-is-on', () => ({ useWhatsAppIsOn: () => false }))
vi.mock('@/api/auth', () => ({
  authApi: {
    updateProfile: vi.fn(async (b: any) => ({ firstName: b.firstName, lastName: b.lastName })),
    renameOrganization: vi.fn(async (name: string) => ({ name })),
    setPhoneNumber: vi.fn(async (v: string | null) => ({ phoneNumber: v })),
    setEmailNotifications: vi.fn(async (v: boolean) => ({ emailNotifications: v })),
    leaveOrg: vi.fn(async () => ({})),
    requestPasswordSetup: vi.fn(async () => ({ token: 't' })),
    setPassword: vi.fn(async () => ({ user: {}, accessToken: 'a' })),
  },
}))
const myData = {
  userId: 'u1', email: 'grace@baridi.co.ke', firstName: 'Grace', lastName: 'Achieng',
  recordEntries: Array.from({ length: 28 }, (_, i) => ({ id: `r${i}`, type: 'answer', text: 'x', createdAt: '2026-09-01T00:00:00Z' })),
  checkIns: Array.from({ length: 13 }, (_, i) => ({ id: `c${i}`, status: 'DONE', sessionNumber: 1, completedAt: null, groundLabel: 'x' })),
  grounds: Array.from({ length: 7 }, (_, i) => ({ id: `g${i}`, label: `Check-in ${i}`, scenario: 'x', status: 'x' })),
}
vi.mock('@/api/my-data', () => ({
  myDataApi: {
    get: vi.fn(async () => myData),
    erase: vi.fn(async () => ({})),
  },
}))
import { SettingsPage } from './SettingsPage'

function open(user: any) {
  useAuthStore.setState({ user, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter><SettingsPage /></MemoryRouter></QueryClientProvider>)
}

beforeEach(() => { vi.clearAllMocks() })

describe('Your name, as the prototype words it', () => {
  it('says a first name is enough, not the old two-sentence help', () => {
    open({ id: 'u1', role: 'MEMBER', organizationName: 'Baridi Appliances', firstName: 'Grace', lastName: 'Achieng', email: 'grace@baridi.co.ke' })
    expect(screen.getByText('This is what your team sees. A first name is enough.')).toBeTruthy()
    expect(screen.queryByText(/Without it we can only show your email address/)).toBeNull()
  })
})

describe('Your data', () => {
  it('is headed "Everything you’ve written", with "Download it" drawn as the prototype’s own outlined button', async () => {
    open({ id: 'u1', role: 'MEMBER', organizationName: 'Baridi Appliances', firstName: 'Grace', lastName: 'Achieng', email: 'grace@baridi.co.ke' })
    expect(screen.getByText('Everything you’ve written')).toBeTruthy()
    const downloadBtn = screen.getByRole('button', { name: 'Download it' })
    expect(downloadBtn).toBeTruthy()
    /* GROUP 1 RE-REVIEW, FAULT E: own-settings.jpg draws this as an outlined secondary button,
       not a quiet text link. */
    expect(downloadBtn.className).toContain('gwui-btn-secondary')
  })

  it('after "Download it", says the file saved and names answers and check-ins, matching the list shown', async () => {
    open({ id: 'u1', role: 'MEMBER', organizationName: 'Baridi Appliances', firstName: 'Grace', lastName: 'Achieng', email: 'grace@baridi.co.ke' })
    await userEvent.click(screen.getByRole('button', { name: 'Download it' }))
    expect(await screen.findByText('Saved. You have written 28 answers, in 7 check-ins.')).toBeTruthy()
    expect(screen.getAllByText(/^Check-in \d$/).length).toBe(7)
    expect(screen.queryByText(/grounds?:/)).toBeNull()
    /* ONE BUTTON, MATCHING THE PROTOTYPE (e2e/the-prototype-count-of-buttons.spec.ts): no second
       "Download all of it" button appears once the record is loaded - "Download it" stays, in
       case somebody wants the file again, but nothing new is added beside it. */
    expect(screen.queryByText('Download all of it')).toBeNull()
    expect(screen.getAllByRole('button', { name: 'Download it' }).length).toBe(1)
  })

  /*
   * "REMOVE YOUR NAME AND EMAIL" IS REACHABLE STRAIGHT AWAY (fault E), as it was before "Download
   * it" started saving a file on press. It is a plain text link, not a second boxed button, which
   * is how it stays off the button-count check without needing `myData` loaded first.
   *
   * RENAMED FROM "Erase it" (group 1's third review): the old label said the opposite of what it
   * does - your answers stay, only your name and email go - so it now says exactly that, with a
   * sentence saying so right beside the link, and the confirmation's own words agree.
   */
  it('"Remove your name and email" is reachable straight away, with no download needed first', async () => {
    open({ id: 'u1', role: 'MEMBER', organizationName: 'Baridi Appliances', firstName: 'Grace', lastName: 'Achieng', email: 'grace@baridi.co.ke' })
    expect(screen.getByText('Your answers stay in the check-ins, without your name.')).toBeTruthy()
    const eraseLink = screen.getByText('Remove your name and email')
    expect(eraseLink.tagName).toBe('BUTTON')
    expect(eraseLink.className).toContain('gwui-plain-link')
    await userEvent.click(eraseLink)
    expect(await screen.findByText(/Your name and email are removed everywhere/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Yes, remove them' })).toBeTruthy()
  })
})

describe('Leaving the organisation', () => {
  it('the "Leave" button is a secondary button with red words, not a solid red one', () => {
    open({ id: 'u1', role: 'MEMBER', organizationName: 'Baridi Appliances', firstName: 'Grace', lastName: 'Achieng', email: 'grace@baridi.co.ke' })
    const leaveBtn = screen.getByRole('button', { name: 'Leave' })
    expect(leaveBtn.className).toContain('gwui-btn-secondary')
    expect(leaveBtn.className).toContain('gwui-btn-red-text')
    expect(leaveBtn.className).not.toContain('gwui-btn-danger')
  })

  it('the confirmation says what you said stays on the record, not "contributions"', async () => {
    open({ id: 'u1', role: 'MEMBER', organizationName: 'Baridi Appliances', firstName: 'Grace', lastName: 'Achieng', email: 'grace@baridi.co.ke' })
    await userEvent.click(screen.getByRole('button', { name: 'Leave' }))
    expect(await screen.findByText(/What you said in your check-ins stays on the record\./)).toBeTruthy()
    expect(screen.queryByText(/Your contributions to existing check-ins/)).toBeNull()
  })
})
