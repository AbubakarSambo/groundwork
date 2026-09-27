import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AnswerFirstPage } from './AnswerFirstPage'

/* THE OPEN LINK'S FIRST SCREEN, AS ANYONE WITH THE LINK READS IT (U.6 review). It showed the lead's
   setup description, reworded. It shows what the invitation shows now: the name and when it runs. */
const whatThisIs = vi.fn()
vi.mock('@/api/entry', () => ({ openLinkApi: { whatThisIs: (...a: unknown[]) => whatThisIs(...a), start: vi.fn(), say: vi.fn(), finish: vi.fn() } }))

function open() {
  return render(<MemoryRouter initialEntries={['/answer?t=j']}><AnswerFirstPage /></MemoryRouter>)
}

describe('the open link', () => {
  it('says who invited you to what, and when it runs', async () => {
    whatThisIs.mockResolvedValue({ groundLabel: 'Help a new hire get started', theQuestion: null, askedBy: 'Hafsah', scenario: 'NEW_HIRE', schedule: 'A short check-in each week.' })
    open()
    expect(await screen.findByRole('heading', { level: 1, name: 'Hafsah invited you to “Help a new hire get started”' })).toBeTruthy()
    expect(screen.getByText('A short check-in each week.')).toBeTruthy()
    expect(document.body.textContent).not.toContain('HAFSAH ASKED')
  })
  it('and the question itself where the lead wrote it to be asked', async () => {
    whatThisIs.mockResolvedValue({ groundLabel: 'Get updates from your team', theQuestion: 'What shipped this week?', askedBy: 'Hafsah', scenario: 'TEAM_UPDATES', schedule: null })
    open()
    expect(await screen.findByRole('heading', { level: 1, name: 'What shipped this week?' })).toBeTruthy()
  })
})
