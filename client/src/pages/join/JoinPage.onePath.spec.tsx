import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join as pjoin } from 'node:path'
import { JoinPage } from './JoinPage'
import { joinApi } from '@/api/entry'

/**
 * ONE-PATH join guard (E): joining a broadcast link signs the person in and
 * lands them in the REAL engine (/checkin/:id), like accepting an invite. The
 * old inline entry-pipeline chat (entryApi.chat) + solo entry report are gone.
 * Email is required (no anonymous join onto the engine). Reintroduce the entry
 * chat, or route somewhere other than /checkin -> this bites.
 */
const mockedNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockedNavigate }
})
vi.mock('@/api/entry', () => ({ joinApi: { preview: vi.fn(), accept: vi.fn() } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ setAuth: vi.fn() }) }))

function renderJoin() {
  return render(
    <MemoryRouter initialEntries={['/join?t=jt-1']}>
      <Routes><Route path="/join" element={<JoinPage />} /></Routes>
    </MemoryRouter>,
  )
}

describe('ONE-PATH: join lands in the real engine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(joinApi.preview as any).mockResolvedValue({ groundId: 'g1', groundLabel: 'Q3 alignment', scenario: 'NEW_PROJECT', initiatorName: 'Sarah' })
    ;(joinApi.accept as any).mockResolvedValue({ groundId: 'g1', checkInId: 'ci-1', accessToken: 'jwt', userId: 'u1', existingAccount: false })
  })

  it('joining routes into /checkin/:id on the right ground', async () => {
    renderJoin()
    await screen.findByText(/invited your check-in/i)
    fireEvent.change(screen.getByPlaceholderText(/you@company.com/i), { target: { value: 'cohort@acme.test' } })
    fireEvent.click(screen.getByRole('button', { name: /Join and start my check-in/i }))
    await waitFor(() => expect(mockedNavigate).toHaveBeenCalled())
    const [path, opts] = mockedNavigate.mock.calls[0]
    expect(path).toBe('/checkin/ci-1')
    expect(opts?.state?.groundId).toBe('g1')
    expect(opts?.state?.sessionNumber).toBe(1)
  })

  it('requires an email (button disabled until a valid email is entered)', async () => {
    renderJoin()
    await screen.findByText(/invited your check-in/i)
    expect((screen.getByRole('button', { name: /Join and start my check-in/i }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('keeps the privacy assurance', async () => {
    renderJoin()
    await screen.findByText(/invited your check-in/i)
    expect(screen.getByText(/Nobody ever reads what you write/i)).toBeTruthy()
  })

  it('source-level: JoinPage no longer runs the entry pipeline', () => {
    const src = readFileSync(pjoin(dirname(fileURLToPath(import.meta.url)), 'JoinPage.tsx'), 'utf8')
    expect(src).not.toMatch(/entryApi/)
    expect(src).not.toMatch(/joinApi\.commit\(/)
  })
})
