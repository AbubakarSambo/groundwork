import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { readFileSync } from 'fs'
import { join } from 'path'
import { TheMorningAtTheTop } from './TheMorningAtTheTop'
import SERVED from './__fixtures__/the-direct-morning-served.json'

/**
 * THE TOP OF GRACE'S BOARD WITH THE DIRECT MORNING ON (Hafsah, 20 October 2026). The payload is what the API serves Grace on Tuesday
 * 20 October in the morning, from the second night run (api engagement/the-direct-morning-as-grace-and-wanjiru-read-it.spec.ts writes
 * the same parts): the four parts in the summary's order, then every deal one tap away with its customer, amount, stage and close date.
 */
const drop = (SERVED as any).drop
const fees = (SERVED as any).fees

describe('the top of the board, as Grace reads it', () => {
  it('the four parts, in the summary’s order, in whole sentences', () => {
    render(<TheMorningAtTheTop m={drop.theMorning} b={{ workRecords: drop.workRecords }} />)
    const parts = [...document.querySelectorAll('[data-part]')].map((x) => x.getAttribute('data-part'))
    expect(parts).toEqual(['target', 'needsYou', 'closing', 'team'])
    expect(screen.getByText('Will we reach 120 units sold by 30 October?')).toBeTruthy()
    expect(screen.getByText('75 of 120 sold, 47 paid.')).toBeTruthy()
    expect(screen.getByText("You're 45 short, and the open deals cover only 40 of them, so the team needs new leads this week.")).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'What needs you today' })).toBeTruthy()
    expect(screen.getByText('Juja Hardware wants 5 units at KES 4,500 instead of 5,000, and Joseph is waiting for a yes or no from Management, so get it for Joseph.')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'About to close' })).toBeTruthy()
    expect(screen.getByText('Ngong Road Minimart pays KES 25,000 for 5 units on delivery tomorrow.')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Your team today' })).toBeTruthy()
    expect(screen.getByText("Kevin's sale to Roysambu Gym has no proof yet, so ask Kevin for the payment record.")).toBeTruthy()
    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/shared picture|a conversation worth having|It's not a verdict|Groundwork does not/i)
  })

  it('every deal is one tap from the top, with its customer, who has it, amount, stage and close date', () => {
    render(<TheMorningAtTheTop m={drop.theMorning} b={{ workRecords: drop.workRecords }} />)
    expect(screen.queryByRole('table')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'See all 11 deals' }))
    const table = screen.getByRole('table')
    expect([...table.querySelectorAll('th')].map((x) => x.textContent)).toEqual(['Customer', 'Who has it', 'Amount', 'Stage', 'Closes'])
    const savannah = within(table).getByText('Savannah Cafe').closest('tr')!
    expect([...savannah.querySelectorAll('td')].map((x) => x.textContent)).toEqual(['Savannah Cafe', 'Kevin', 'KES 15,000 deposit', 'Won', '16 October'])
    const ngong = within(table).getByText('Ngong Road Minimart').closest('tr')!
    expect([...ngong.querySelectorAll('td')].map((x) => x.textContent)).toEqual(['Ngong Road Minimart', 'Kevin', 'KES 25,000', 'Quoted', 'Not said'])
  })

  it('Wanjiru’s fee notes board opens at what is owed, what needs her, who to chase, with no deal list', () => {
    render(<TheMorningAtTheTop m={fees.theMorning} b={{}} />)
    expect(screen.getByText('What is owed, and what is paid')).toBeTruthy()
    expect(screen.getByText('Nyota Logistics disputes FN-008, saying the contract review was billed twice, and Brian follows it up, so decide whether to correct it.')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Who to chase' })).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('the board draws it only where the server served it, and the server serves it only to the lead with the switch on', () => {
    const page = readFileSync(join(__dirname, '..', 'BoardPage.tsx'), 'utf8')
    expect(page).toContain('{!groundId && (b as any).theMorning && <TheMorningAtTheTop m={(b as any).theMorning} b={b} />}')
  })
})
