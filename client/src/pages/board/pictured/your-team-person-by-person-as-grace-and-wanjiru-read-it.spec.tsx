import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/api/board', async (orig) => ({ ...(await orig() as any), boardApi: { actOnAPerson: vi.fn() } }))

import { boardApi } from '@/api/board'
import { YourTeamPersonByPerson } from './YourTeamPersonByPerson'
import SERVED from './__fixtures__/your-team-served.json'

/**
 * YOUR TEAM, PERSON BY PERSON, AS GRACE AND WANJIRU READ IT (Groundwork does the managing, part 2). The payload is what the API serves
 * them on Tuesday 20 October in the morning, from the second night run (api board/your-team-person-by-person-as-each-reader-reads-it.spec.ts
 * reads the same lines). Each person's part says where they stand with the evidence beside it, what they delivered with proof, their
 * record, and four taps that each say what they do before she confirms. A team member is never served `yourTeam`, so nothing is drawn.
 */
const drop = (SERVED as any).drop
const fees = (SERVED as any).fees
const wrap = (ui: any) => render(<QueryClientProvider client={new QueryClient()}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>)
const partOf = (first: string) => {
  const p = (document.querySelectorAll('[data-actions-for]') as any)
  const person = [...drop.people, ...fees.people].find((x: any) => x.name.startsWith(`${first} `))
  return [...p].find((el: any) => el.getAttribute('data-actions-for') === person.participantId).closest('section[aria-label]') ?? document.body
}

describe('Grace reads her team', () => {
  beforeEach(() => vi.mocked(boardApi.actOnAPerson).mockReset())

  it('reads each person by name, where they stand, and the evidence beside it', () => {
    wrap(<YourTeamPersonByPerson groundId={drop.people[0] ? 'g-drop' : ''} team={drop} />)
    expect(screen.getByText('Your team, person by person')).toBeTruthy()
    for (const n of ['Kevin Omondi', 'Mercy Wairimu', 'Joseph Kariuki', 'Peter Njoroge']) expect(screen.getByText(n)).toBeTruthy()
    expect(screen.getByText('Kevin is doing well.')).toBeTruthy()
    expect(screen.getByText('Kevin said four times that something was sold, paid or signed. Three of them have proof on file.')).toBeTruthy()
    expect(screen.getByText('Joseph needs a hard conversation about saying things were done with nothing on file to show it.')).toBeTruthy()
    expect(screen.getByText('Backing what Joseph says with proof has stayed the same since then.')).toBeTruthy()
    expect(screen.getByText('Savannah Cafe is won for 6 units at KES 30,000, and the M-Pesa code RCD8M1LS4W shows it.')).toBeTruthy()
    expect(screen.getByText('Kevin said Roysambu Gym is won for KES 15,000, and nothing on file shows it yet.')).toBeTruthy()
  })

  it('taps "Praise Mercy", reads what it does, and confirms the words offered', async () => {
    vi.mocked(boardApi.actOnAPerson).mockResolvedValue({ says: 'Your words are kept in Mercy’s record. Mercy reads them on My work and in Mercy’s own report.' })
    wrap(<YourTeamPersonByPerson groundId="g-drop" team={drop} />)
    const mercy = within(partOf('Mercy'))
    fireEvent.click(mercy.getByRole('button', { name: 'Praise Mercy' }))
    expect(mercy.getByText('Keeps your words in Mercy’s record, where Mercy reads them on My work and in Mercy’s own report. No message is sent.')).toBeTruthy()
    expect((mercy.getByLabelText('What you want to say') as HTMLTextAreaElement).value).toBe('Well done on the 2 deals you won with proof.')
    fireEvent.click(mercy.getByRole('button', { name: 'Confirm' }))
    expect(await mercy.findByText('Your words are kept in Mercy’s record. Mercy reads them on My work and in Mercy’s own report.')).toBeTruthy()
    const person = drop.people.find((x: any) => x.name.startsWith('Mercy '))
    expect(boardApi.actOnAPerson).toHaveBeenCalledWith('g-drop', person.participantId, { kind: 'praise', text: 'Well done on the 2 deals you won with proof.' })
  })

  it('taps "Reassign leads" on Joseph, chooses the record and who has it now, and reads what it does first', async () => {
    vi.mocked(boardApi.actOnAPerson).mockResolvedValue({ says: 'Mama Pima Stores is Peter’s now, on the board and in Peter’s check-ins.' })
    wrap(<YourTeamPersonByPerson groundId="g-drop" team={drop} />)
    const joseph = within(partOf('Joseph'))
    fireEvent.click(joseph.getByRole('button', { name: 'Reassign leads' }))
    expect(joseph.getByText('Gives one of Joseph’s records to somebody else on the team. From then on it is theirs on the board and in their check-ins. Nothing is sent to either of them.')).toBeTruthy()
    const j = drop.people.find((x: any) => x.name.startsWith('Joseph '))
    const reassign = j.actions.find((a: any) => a.kind === 'reassign')
    const mamaPima = reassign.items.find((i: any) => i.name === 'Mama Pima Stores')
    const peter = reassign.to.find((x: any) => x.name === 'Peter')
    fireEvent.change(joseph.getByLabelText('Which record'), { target: { value: mamaPima.id } })
    fireEvent.change(joseph.getByLabelText('Who has it now'), { target: { value: peter.participantId } })
    fireEvent.click(joseph.getByRole('button', { name: 'Confirm' }))
    expect(await joseph.findByText('Mama Pima Stores is Peter’s now, on the board and in Peter’s check-ins.')).toBeTruthy()
    expect(boardApi.actOnAPerson).toHaveBeenCalledWith('g-drop', j.participantId, { kind: 'reassign', itemId: mamaPima.id, toParticipantId: peter.participantId })
  })

  it('a deadline waits for a day before it can be confirmed', () => {
    wrap(<YourTeamPersonByPerson groundId="g-drop" team={drop} />)
    const joseph = within(partOf('Joseph'))
    fireEvent.click(joseph.getByRole('button', { name: 'Set a deadline' }))
    expect((joseph.getByRole('button', { name: 'Confirm' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(joseph.getByLabelText('The day it is due'), { target: { value: '2026-10-30' } })
    expect((joseph.getByRole('button', { name: 'Confirm' }) as HTMLButtonElement).disabled).toBe(false)
  })
})

describe('Wanjiru reads her fee notes team', () => {
  it('reads each person by their role, Njeri doing well with her bank slip and Aisha needing a hard conversation', () => {
    wrap(<YourTeamPersonByPerson groundId="g-fees" team={fees} />)
    expect(screen.getByText('Accounts')).toBeTruthy()
    expect(screen.getByText('What Njeri recorded as paid, with proof')).toBeTruthy()
    expect(screen.getByText('Njeri is doing well.')).toBeTruthy()
    expect(screen.getByText('Aisha needs a hard conversation about saying things were done with nothing on file to show it.')).toBeTruthy()
    expect(screen.getByText('On Monday 19 October Aisha said “FN-006 for Baraka Hardware has been paid.” Nothing on file shows it yet.')).toBeTruthy()
  })

  it('says no label, score or verdict, and suggests no plan or exit', () => {
    const { container } = wrap(<YourTeamPersonByPerson groundId="g-fees" team={fees} />)
    const text = (container.textContent ?? '').replace(/“[^”]*”/g, '')
    expect(text).not.toMatch(/\b(?:PIP|at risk|exit|underperform\w*|score|grade|rating)\b|\d+\s?%/i)
  })
})
