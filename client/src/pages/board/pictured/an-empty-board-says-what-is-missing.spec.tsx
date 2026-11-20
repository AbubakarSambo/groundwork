import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThePicturedBoard, theBoardHasNothingOnIt } from './ThePicturedBoard'

/**
 * A BOARD WITH NOTHING ON IT SAYS WHAT IS MISSING, AND NEVER SAYS EVERYBODY HAS ANSWERED WHEN NOBODY WAS ASKED (board assessment, 15 November).
 * Read as the lead reads it: nobody asked, people asked and none answered, and one answered.
 */
const board = (rows: any[]) => ({ kindOfWork: 'MarketView where next', checkInGrid: { rows, sessions: [] }, workRecords: [], objectives: [] }) as any
const draw = (b: any) => render(
  <QueryClientProvider client={new QueryClient()}><MemoryRouter>
    <ThePicturedBoard {...({ b, groundId: 'g', order: ['inShort', 'cantTellYou'], navigate: () => {} } as any)} />
  </MemoryRouter></QueryClientProvider>,
)

describe('an empty board', () => {
  it('where nobody was asked, says so and says what would fill it, and does not say everybody has answered', () => {
    draw(board([]))
    expect(screen.getByText('Nobody has checked in yet. Add the people and send the invitations.')).toBeTruthy()
    expect(screen.queryByText(/so there is nothing here to read/)).toBeNull()
    expect(screen.queryByText(/Everybody asked has answered/)).toBeNull()
  })
  it('where people were asked and none has answered, says how many were asked', () => {
    draw(board([{ participantId: 'a', name: 'Amina Yusuf', cells: {} }, { participantId: 'b', name: 'Bayo Ade', cells: {} }]))
    expect(screen.getByText('2 people have been invited and nobody has checked in yet.')).toBeTruthy()
  })
  it('is not empty once somebody has answered', () => {
    expect(theBoardHasNothingOnIt(board([{ participantId: 'a', name: 'Amina', cells: { 1: 'done' } }]))).toBe(false)
  })
  /* Boards pass 4, defect 15: the project board said "Nothing is on this board yet" above its own plan, money and stakeholders. */
  it('is not empty when the board holds a plan, money or stakeholders, even with nobody checked in', () => {
    expect(theBoardHasNothingOnIt({ ...board([]), project: { plan: [{ id: 'm1', title: 'Baseline survey' }] } })).toBe(false)
    expect(theBoardHasNothingOnIt({ ...board([]), project: { money: { months: [{ month: 'October', says: 'Money in is KES 2 million.' }] } } })).toBe(false)
    expect(theBoardHasNothingOnIt({ ...board([]), project: { stakeholders: [{ id: 's1' }] } })).toBe(false)
    expect(theBoardHasNothingOnIt({ ...board([]), project: { comingUp: [{ id: 'c1' }] } })).toBe(false)
    expect(theBoardHasNothingOnIt({ ...board([]), workPlan: [{ id: 'w1' }] })).toBe(false)
    expect(theBoardHasNothingOnIt({ ...board([]), project: { plan: [], stakeholders: [] } })).toBe(true)
  })
  /* Boards pass 4, defect 1: a government programme with nobody's answers drew its title, its tabs and one link and nothing else. */
  it('says what is missing on a government programme where people have checked in but the levels, visits and counties are empty', () => {
    const gov = { ...board([{ participantId: 'a', name: 'Amina', cells: { 1: 'done' } }]), kindOfWork: 'a government programme', whatEachLevelUnderstood: null, theCounties: null }
    expect(theBoardHasNothingOnIt(gov)).toBe(true)
    draw(gov)
    expect(screen.getByText('People have checked in, but nobody has said yet what the aim means to them, what each county has reached or where the visits were. They will appear here when somebody does.')).toBeTruthy()
  })
  it('does not say it where a level has said something', () => {
    expect(theBoardHasNothingOnIt({ ...board([]), kindOfWork: 'a government programme', whatEachLevelUnderstood: { levels: [{ who: 'County team', said: ['x'] }] } })).toBe(false)
  })
})
