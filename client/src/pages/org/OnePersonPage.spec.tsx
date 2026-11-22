import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { OnePersonPage } from './OnePersonPage'

/** ONE PERSON'S PAGE, AS GRACE (AN ADMIN) READS MIRIAM'S, against A4 one-person.txt. */
const me: any = { id: 'grace', role: 'ADMIN', organizationName: 'Baridi Appliances' }
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel?: any) => (sel ? sel({ user: me }) : { user: me }) }))
let whatsapp = false
vi.mock('@/lib/whatsapp-is-on', () => ({ useWhatsAppIsOn: () => whatsapp }))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))
vi.mock('sonner', () => ({ toast }))

const people = [
  { id: 'grace', email: 'grace@baridi.co.ke', firstName: 'Grace', lastName: 'Achieng', role: 'ADMIN', isEmailVerified: true, state: 'checked in', checkInsOn: 0, checkInsAnswered: 0, level: null, team: null, reportsTo: null, checkIns: [] },
  { id: 'amani', email: 'amani@baridi.co.ke', firstName: 'Amani', lastName: 'Njoroge', role: 'ADMIN', isEmailVerified: true, state: 'checked in', checkInsOn: 1, checkInsAnswered: 1, level: 'Chief executive', team: 'Leadership', reportsTo: null, checkIns: [] },
  { id: 'wairimu', email: 'wairimu@baridi.co.ke', firstName: 'Wairimu', lastName: 'Kamau', role: 'LEAD', isEmailVerified: true, state: 'checked in', checkInsOn: 1, checkInsAnswered: 1, level: 'Sales lead', team: 'Sales', reportsTo: { id: 'amani', name: 'Amani Njoroge' }, checkIns: [] },
  { id: 'neema', email: 'neema@lakeview.test', firstName: 'Neema', lastName: 'Kamau', role: 'MEMBER', isEmailVerified: true, state: 'checked in', checkInsOn: 1, checkInsAnswered: 1, level: null, team: null, reportsTo: null, checkIns: [], alsoIn: ['Lakeview Clinic'] },
  { id: 'miriam', email: 'miriam@baridi.co.ke', firstName: 'Miriam', lastName: 'Wanjiku', role: 'MEMBER', isEmailVerified: true, state: 'checked in', checkInsOn: 1, checkInsAnswered: 1, level: 'Sales rep', team: 'Sales', reportsTo: { id: 'wairimu', name: 'Wairimu Kamau' }, phoneNumber: '+254722118440', checkIns: [{ id: 'sales', label: 'Sales team, Q3', runsIt: false }] },
]

function open(who = 'miriam') {
  vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
    if (url.startsWith('/users?')) return { data: { data: people, meta: { total: people.length } } } as any
    if (url === '/users/organization/owner') return { data: { ownerUserId: 'amani' } } as any
    if (url === '/users/organization/teams') return { data: [{ name: 'Leadership', people: 1 }, { name: 'Sales', people: 2 }] } as any
    return { data: {} } as any
  })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/org/members/${who}`]}>
        <Routes>
          <Route path="/org/members/:id" element={<OnePersonPage />} />
          <Route path="/grounds/:id" element={<p>The check-in</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); whatsapp = false })

describe('what Grace reads about Miriam', () => {
  it('where she sits, her role here with what each role does, her team, status, seat and check-ins', async () => {
    const { container } = open()
    expect(await screen.findByRole('heading', { name: 'Miriam Wanjiku' })).toBeTruthy()
    expect(screen.getByText('miriam@baridi.co.ke')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Where they sit' })).toBeTruthy()
    expect(screen.getByText('Sales rep')).toBeTruthy()
    expect(screen.getByText('Wairimu Kamau')).toBeTruthy()
    expect(screen.getByText('This describes the organisation. What Miriam can do still comes only from their role and their access to each check-in.')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Role at Baridi Appliances' })).toBeTruthy()
    expect(screen.getByText('Manages people and billing, and can read every check-in.')).toBeTruthy()
    expect(screen.getByText('Can start check-ins and run them. Takes part in others.')).toBeTruthy()
    expect(screen.getByText('Answers the check-ins they’re invited to.')).toBeTruthy()
    expect(screen.getByRole('radio', { name: /^Takes part/ })).toHaveAttribute('aria-checked', 'true')
    /*
     * ALL FOUR ROLES ARE OFFERED, GUEST INCLUDED (design-audit.md item 6). Replaces the old
     * assertion that Guest only ever showed for somebody who already was one: reading
     * users.service.ts's `update()` found nothing that refuses `PATCH /users/:id { role: 'GUEST' }`
     * for an existing member - `UpdateUserDto` validates against the full `Role` enum, `mayChange`
     * only ever blocks a change to the account holding the organisation, and `setRole` writes
     * whatever it is given with no check against its own `RoleWrite` type. The prototype's four
     * cards match what the server actually does, so this is now offered rather than hidden.
     */
    expect(screen.getByText('Guest')).toBeTruthy()
    expect(screen.getByText('Sees only the check-ins they’re added to, and nothing else here.')).toBeTruthy()
    expect(screen.getByText('Used to add whole teams to a check-in')).toBeTruthy()
    /* The team is picked from the teams here now (Hafsah, 21 November 2026), so it is a choice, not a typed box. */
    expect(await screen.findByDisplayValue('Sales')).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Team' })).toHaveValue('Sales')
    expect(screen.getByText('Checking in')).toBeTruthy()
    expect(screen.getByText('Holds a seat')).toBeTruthy()
    expect(screen.getByText('1 check-in')).toBeTruthy()
    expect(screen.getByText('Sales team, Q3')).toBeTruthy()
    expect(screen.getByText('Checks in')).toBeTruthy()
    /* U.4 review, item 3 (30 Sept): nobody can end a check-in themselves yet - only ask us to. The
       old sentence claimed a control that does not exist.
       FAULT 5, 6 Oct 2026: "change its setup" was never true either - only the lead changes
       setup (the 1 October decision; `mayChangeSetup`). Replaced with the real limit on an
       admin's reach: decision 5 closes a performance plan, a promotion, a renewal or somebody's
       first 90 days unless she is given access. */
    expect(screen.getByText('As an admin you can read every check-in at Baridi Appliances, and ask us to end it. A performance plan, a promotion, a renewal or somebody\'s first 90 days stays closed to you unless you are given access to it. You don’t see anyone’s private notes.')).toBeTruthy()
    /* WhatsApp is off: her phone number is still offered, plainly labelled, and nothing mentions WhatsApp (Hafsah, 30 October
       2026, replacing "not offered while WhatsApp is off"; her rule of 26 September still holds for the WhatsApp wording). No dash. */
    expect(screen.getByRole('button', { name: 'Change phone number' })).toBeTruthy()
    expect(container.textContent).not.toMatch(/WhatsApp/)
    expect(container.textContent).not.toMatch(/ - |\bscore\b|at risk/i)
  })

  it('her phone number, with WhatsApp on and off, behind the same Change the prototype uses', async () => {
    /*
     * REPLACES an assertion that the number sat in an always-editable box, saved on blur. The
     * prototype's own WhatsApp row (one-person.txt: "WhatsApp / +254 722 118 440 / Change") reads
     * like every other field on this page - a value with a "Change" button - not a live text box,
     * so this now matches Level and Reports to instead of being the one field that worked
     * differently (design-audit.md item 9). Since 30 October 2026 (Hafsah) it is labelled
     * "Phone number" and shown whether WhatsApp is on or off.
     */
    for (const on of [true, false]) {
      whatsapp = on
      const { unmount } = open()
      expect(await screen.findByText('+254722118440')).toBeTruthy()
      expect(screen.queryByLabelText('Phone number for Miriam')).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: 'Change phone number' }))
      expect(screen.getByLabelText('Phone number for Miriam')).toHaveValue('+254722118440')
      unmount()
    }
  })

  it('her phone number, saved to her record, with WhatsApp off', async () => {
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({ data: {} } as any)
    open()
    fireEvent.click(await screen.findByRole('button', { name: 'Change phone number' }))
    fireEvent.change(screen.getByLabelText('Phone number for Miriam'), { target: { value: '+254700000000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save phone number' }))
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/users/miriam', { phoneNumber: '+254700000000' }))
  })

  it('who she reports to, from the people here, and a refusal is the server\'s own sentence', async () => {
    vi.spyOn(apiClient, 'patch').mockRejectedValue({ response: { data: { message: 'That would make a loop, because that person already reports to them, directly or through someone else.' } } })
    open()
    fireEvent.click(await screen.findByRole('button', { name: 'Change reports to' }))
    fireEvent.change(screen.getByLabelText('Reports to'), { target: { value: 'amani' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save reports to' }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('That would make a loop, because that person already reports to them, directly or through someone else.'))
  })

  it('her role, straight away', async () => {
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({ data: {} } as any)
    open()
    fireEvent.click(await screen.findByRole('radio', { name: /Can open check-ins/ }))
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/users/miriam', { role: 'LEAD' }))
    /* By name, not "Their role has changed." (U.4 review). */
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Miriam’s role has changed.'))
  })

  it('not the owner\'s role, and the page says why', async () => {
    open('amani')
    expect(await screen.findByText('Amani owns this organisation, so their role cannot be changed here.')).toBeTruthy()
    expect(screen.getByRole('radio', { name: /^Takes part/ })).toBeDisabled()
  })

  it('can turn a member into a guest, since the server accepts it', async () => {
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({ data: {} } as any)
    open()
    fireEvent.click(await screen.findByRole('radio', { name: /^Guest/ }))
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/users/miriam', { role: 'GUEST' }))
  })

  /*
   * B-169. A single press on "Admin" changed a real role on this computer's database during the
   * deep page audit's own click test, with no "are you sure" - every other role change applies
   * straight away, which is right for them, but making somebody an admin is the one choice here
   * that cannot be undone by picking something else: it hands them everyone's data and the power
   * to change anyone else's role in turn.
   */
  it('making somebody an admin asks first, and does nothing on Cancel', async () => {
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({ data: {} } as any)
    open()
    fireEvent.click(await screen.findByRole('radio', { name: /^Admin/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Make Miriam Wanjiku an admin' })
    expect(within(dialog).getByText('Make Miriam Wanjiku an admin of Baridi Appliances?')).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(patch).not.toHaveBeenCalled()
  })

  it('making somebody an admin, confirmed, applies the change', async () => {
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({ data: {} } as any)
    open()
    fireEvent.click(await screen.findByRole('radio', { name: /^Admin/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Make Miriam Wanjiku an admin' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Make an admin' }))
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/users/miriam', { role: 'ADMIN' }))
  })
})

describe('removing somebody from the organisation', () => {
  it('shows the prototype\'s sentence and a Remove button, and sends DELETE on confirmation', async () => {
    const del = vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: {} } as any)
    open()
    expect(await screen.findByRole('heading', { name: 'Remove from Baridi Appliances' })).toBeTruthy()
    expect(screen.getByText('They lose access and their seat is freed. What they shared stays in the check-ins they were part of.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'Remove Miriam Wanjiku' })).getByRole('button', { name: 'Remove' }))
    await waitFor(() => expect(del).toHaveBeenCalledWith('/users/miriam'))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Miriam Wanjiku no longer has access to Baridi Appliances.'))
  })

  it('says plainly that somebody in another organisation keeps their place there (Hafsah, 11 October 2026)', async () => {
    const del = vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: {} } as any)
    open('neema')
    expect(await screen.findByRole('heading', { name: 'Remove from Baridi Appliances' })).toBeTruthy()
    expect(screen.getByText('They lose access to Baridi Appliances and their seat here is freed. Their sign-in and everything in Lakeview Clinic stay as they are. What they shared stays in the check-ins they were part of here.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    const dialog = await screen.findByRole('dialog', { name: 'Remove Neema Kamau' })
    expect(within(dialog).getByText('Remove Neema Kamau from Baridi Appliances? They keep their place in Lakeview Clinic.')).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove' }))
    await waitFor(() => expect(del).toHaveBeenCalledWith('/users/neema'))
  })

  it('names no other organisation for somebody who has only this one', async () => {
    open()
    fireEvent.click(await screen.findByRole('button', { name: 'Remove' }))
    const dialog = await screen.findByRole('dialog', { name: 'Remove Miriam Wanjiku' })
    expect(within(dialog).getByText('Remove Miriam Wanjiku from Baridi Appliances?')).toBeTruthy()
  })

  it('does nothing without confirming first', async () => {
    const del = vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: {} } as any)
    open()
    fireEvent.click(await screen.findByRole('button', { name: 'Remove' }))
    const dialog = await screen.findByRole('dialog', { name: 'Remove Miriam Wanjiku' })
    expect(del).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(del).not.toHaveBeenCalled()
  })

  it('is not offered on your own page', async () => {
    open('grace')
    await screen.findByRole('heading', { name: 'Grace Achieng' })
    expect(screen.queryByRole('heading', { name: /^Remove from/ })).toBeNull()
  })

  it('shows the server\'s refusal in plain words', async () => {
    vi.spyOn(apiClient, 'delete').mockRejectedValue({ response: { data: { message: 'This is the only active admin here - make somebody else an admin first.' } } })
    open()
    fireEvent.click(await screen.findByRole('button', { name: 'Remove' }))
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'Remove Miriam Wanjiku' })).getByRole('button', { name: 'Remove' }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('This is the only active admin here - make somebody else an admin first.'))
  })
})

describe('Across check-ins (D3, U.16): an admin reads only how many', () => {
  it('Grace reads how many check-ins Miriam is in, and that what is asked of her is on her own page', async () => {
    const { container } = open()
    /*
     * "Across check-ins" IS NOT A SECTION HEADING here (a 1440px picture check against
     * one-proto-0.png): the bold line sits inside the white panel, with the sentence under it, and
     * there is no separate heading above the panel - unlike "Where they sit" or "Role at...".
     */
    expect(await screen.findByText('Across check-ins')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Across check-ins' })).toBeNull()
    expect(screen.getByText('1 check-in. What’s asked of them is on their own You page.')).toBeTruthy()
    const text = container.textContent ?? ''
    /* Nothing lets anybody share their load yet, so the page does not promise it. */
    expect(text).not.toContain('they choose who else sees it')
    expect(text).not.toContain('Everything asked of')
  })

  it('says it with the right number for somebody in none', async () => {
    open('wairimu')
    expect(await screen.findByText('0 check-ins. What’s asked of them is on their own You page.')).toBeTruthy()
  })
})
