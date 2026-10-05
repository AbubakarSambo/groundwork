import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OrgNewPage } from './OrgNewPage'
import { authApi } from '@/api/auth'
import { billingApi } from '@/api/billing'

/**
 * "CREATE AN ORGANISATION" (A3, #/org-new), AS THE PERSON READS IT.
 *
 * The words are org-new.txt's. The size question only while the free trial is on, with the one
 * shared sentence. The button is never greyed out for an empty optional field, which is the bug the
 * old /org/setup page had: it waited for the "optional" contact email.
 */
vi.mock('@/api/auth', () => ({
  authApi: {
    myOrganizations: vi.fn(),
    createOrganisation: vi.fn(),
    renameOrganization: vi.fn(),
  },
}))
vi.mock('@/api/billing', () => ({ billingApi: { getPricing: vi.fn() } }))
const setAuth = vi.fn()
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ setAuth }) }))

/* Served months changed from 3 to 1 (decision 78, 5 October: every free run is one month). */
const pricing = (on: boolean) => ({ plans: [], free: { groundLimit: 10, memberLimit: 5 }, trial: { on, teamsUnder: 20, months: 1 } })

function open(path = '/org-new') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/org-new" element={<OrgNewPage />} />
          <Route path="/start" element={<p>Start a check-in</p>} />
          <Route path="/grounds" element={<p>Your check-ins</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const assign = vi.fn()
beforeEach(() => {
  vi.clearAllMocks()
  ;(billingApi.getPricing as any).mockResolvedValue(pricing(false))
  ;(authApi.myOrganizations as any).mockResolvedValue([{ id: 'o1', name: 'Coamana', slug: 'c', role: 'MEMBER', active: true }])
  Object.defineProperty(window, 'location', { value: { ...window.location, assign }, writable: true })
})

describe('what the person reads', () => {
  it('the prototype\'s heading, sentence, fields and buttons', async () => {
    open()
    expect(await screen.findByRole('heading', { name: 'Create an organisation' })).toBeTruthy()
    expect(screen.getByText('Its check-ins, people and plan are separate from any other organisation you’re in. You’ll be its owner.')).toBeTruthy()
    expect(screen.getByLabelText('Organisation name')).toHaveAttribute('placeholder', 'For example, Baridi Foundation')
    expect(screen.getByLabelText('A billing email (optional)')).toHaveAttribute('placeholder', 'finance@yourcompany.com')
    expect(screen.getByText('Not shown to your team. You can add it later.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Create it' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy()
  })

  it('with the free trial off, no size question and nothing about a trial', async () => {
    open()
    await waitFor(() => expect(billingApi.getPricing).toHaveBeenCalled())
    await screen.findByLabelText('Organisation name')
    expect(screen.queryByLabelText('How many people will use it?')).toBeNull()
    expect(screen.queryByText(/free/)).toBeNull()
  })

  it('with the free trial on, the size question and the one shared sentence', async () => {
    ;(billingApi.getPricing as any).mockResolvedValue(pricing(true))
    open()
    const size = await screen.findByLabelText('How many people will use it?')
    expect([...(size as HTMLSelectElement).options].map(o => o.textContent)).toEqual(['Fewer than 20', '20 or more'])
    expect(screen.getByText('Teams of fewer than 20 people get 1 month free. No card needed.')).toBeTruthy()
  })
})

describe('creating it', () => {
  it('with no billing email: the button works, and it is made with the name alone', async () => {
    ;(authApi.createOrganisation as any).mockResolvedValue({ accessToken: 'new-token', user: { id: 'u1' }, organization: { id: 'o9' } })
    open()
    fireEvent.change(await screen.findByLabelText('Organisation name'), { target: { value: ' Nyali Foods ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create it' }))
    await waitFor(() => expect(authApi.createOrganisation).toHaveBeenCalledWith({ name: 'Nyali Foods', billingEmail: undefined, teamSize: undefined }))
    /* (user, token), the order setAuth takes. It was once stored the wrong way round. */
    await waitFor(() => expect(setAuth).toHaveBeenCalledWith({ id: 'u1' }, 'new-token'))
    expect(assign).toHaveBeenCalledWith('/today')
  })

  it('sends the size they chose, with the line they were shown, while the trial is on', async () => {
    ;(billingApi.getPricing as any).mockResolvedValue(pricing(true))
    ;(authApi.createOrganisation as any).mockResolvedValue({ accessToken: 't', user: {}, organization: {} })
    open()
    fireEvent.change(await screen.findByLabelText('Organisation name'), { target: { value: 'Nyali Foods' } })
    fireEvent.change(await screen.findByLabelText('How many people will use it?'), { target: { value: 'more' } })
    fireEvent.change(screen.getByLabelText('A billing email (optional)'), { target: { value: 'finance@nyali.test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create it' }))
    await waitFor(() => expect(authApi.createOrganisation).toHaveBeenCalledWith({ name: 'Nyali Foods', billingEmail: 'finance@nyali.test', teamSize: { said: 'more', line: 20 } }))
  })

  it('an empty name is said in a sentence, and nothing is sent', async () => {
    open()
    fireEvent.click(await screen.findByRole('button', { name: 'Create it' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Give the organisation a name of at least two letters.')
    expect(authApi.createOrganisation).not.toHaveBeenCalled()
  })

  it('a billing email that does not look right is said in a sentence', async () => {
    open()
    fireEvent.change(await screen.findByLabelText('Organisation name'), { target: { value: 'Nyali Foods' } })
    fireEvent.change(screen.getByLabelText('A billing email (optional)'), { target: { value: 'finance@' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create it' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('That billing email does not look right. Check it, or leave it empty.')
    expect(authApi.createOrganisation).not.toHaveBeenCalled()
  })

  it('the server\'s own sentence when it refuses', async () => {
    ;(authApi.createOrganisation as any).mockRejectedValue({ response: { data: { message: 'Give the organisation a name of at least two letters.' } } })
    open()
    fireEvent.change(await screen.findByLabelText('Organisation name'), { target: { value: 'Nyali Foods' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create it' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Give the organisation a name of at least two letters.')
  })
})

/* Was "somebody who already has an organisation of their own is told before they type anything".
   Hafsah, 26 September: a person can create more than one, so they get the form like anybody else. */
describe('somebody who already has an organisation of their own', () => {
  it('can create another', async () => {
    ;(authApi.myOrganizations as any).mockResolvedValue([{ id: 'o1', name: 'Coamana', slug: 'c', role: 'ADMIN', active: true }])
    ;(authApi.createOrganisation as any).mockResolvedValue({ accessToken: 't', user: {}, organization: {} })
    open()
    fireEvent.change(await screen.findByLabelText('Organisation name'), { target: { value: 'Nyali Foods' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create it' }))
    await waitFor(() => expect(authApi.createOrganisation).toHaveBeenCalled())
    expect(screen.queryByText(/already have an organisation/)).toBeNull()
  })
})

describe('naming the organisation a first Google sign-in made', () => {
  it('names it rather than making a second one, and goes on to start a check-in', async () => {
    ;(authApi.renameOrganization as any).mockResolvedValue({ id: 'o1', name: 'Nyali Foods' })
    open('/org-new?naming=1')
    fireEvent.change(await screen.findByLabelText('Organisation name'), { target: { value: 'Nyali Foods' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create it' }))
    await waitFor(() => expect(authApi.renameOrganization).toHaveBeenCalledWith('Nyali Foods', { billingEmail: undefined, teamSize: undefined }))
    expect(authApi.createOrganisation).not.toHaveBeenCalled()
    expect(await screen.findByText('Start a check-in')).toBeTruthy()
  })

  it('Cancel keeps the name it was given and carries on', async () => {
    open('/org-new?naming=1')
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }))
    expect(await screen.findByText('Start a check-in')).toBeTruthy()
    expect(authApi.renameOrganization).not.toHaveBeenCalled()
  })
})
