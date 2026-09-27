import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EachPerson } from './EachPerson'

/* The expectation part of a card is ExpectationsPanel, scoped to one person and drawn bare. It talks
   to the server; this spec is about the card's own structure, so it is stubbed. */
vi.mock('./ExpectationsPanel', () => ({
  ExpectationsPanel: ({ parties }: any) => <div>expectation for {parties[0]?.id}</div>,
}))

/**
 * "NOT SURE THE PURPOSE OF PERSON BY PERSON."
 *
 * It rendered one card per EXPECTATION, so a lead read a stack of sentences with names on them and
 * everything else about a person - their targets, what they are down to do, what they were asked to
 * show, their files - was in three other bands. One card each now, collapsed, and it is the only
 * place anything about a person appears.
 */
const people = [
  { id: 'p1', userId: 'u1', roleAsDescribed: 'Senior Account Executive', user: { firstName: 'Amina' }, objective: { all: [{ text: 'Close 4m and 3 expansions', seenBySubject: false }] } },
  { id: 'p2', userId: 'u2', roleAsDescribed: 'Delivery lead', user: { firstName: 'Miriam' }, objective: { all: [] } },
  { id: 'p3', userId: 'u3', managingOnly: true, user: { firstName: 'Hafiz' } },
]
const targets = [
  { id: 't1', name: 'sales', target: 4_000_000, ownerParticipantId: 'p1' },
  { id: 't2', name: 'signed revenue', target: 12_000_000, ownerParticipantId: null },
]
const toDos = [
  { id: 'c1', participantId: 'p1', text: 'Send the Client B proposal', whenSaid: 'this week', explicit: true, status: 'UNKNOWN' },
  { id: 'c2', participantId: null, text: 'Someone senior to call Client C', status: 'UNKNOWN' },
]
const files = [{ id: 'f1', fileName: 'q4-targets.xlsx', participantId: 'p1', visibility: 'OWN' }]
const asks = { p1: [{ id: 'a1', what: 'Send the Client B proposal', askedIn: 'this week' }] }

describe('each person holds everything about them', () => {
  it('one row per person, managing-only left out, and your own row open', () => {
    render(<EachPerson groundId="g1" people={people as any} targets={targets} toDos={toDos} files={files} asks={asks as any} viewerUserId="u1" isLead={false} />)
    expect(screen.getByText('You')).toBeTruthy()
    expect(screen.getByText('Miriam')).toBeTruthy()
    expect(screen.queryByText('Hafiz')).toBeNull()
    /* Yours is open: the expectation, the number, the to-do and the ask are all on it. */
    expect(screen.getByText('expectation for p1')).toBeTruthy()
    expect(screen.getByText('4,000,000')).toBeTruthy()
    expect(screen.getByText('What you said you would show')).toBeTruthy()
  })

  it('a collapsed row says what that person holds, in counts', () => {
    render(<EachPerson groundId="g1" people={people as any} targets={targets} toDos={toDos} files={files} asks={asks as any} viewerUserId="u2" isLead={false} />)
    /* Amina's row is shut for Miriam, and says what is in it. */
    /* U.7 review: joined with commas, not dots. */
    expect(screen.getByText(/1 expectation, 1 target, 1 to-do, 1 thing to show, 1 file/)).toBeTruthy()
  })

  it('only your own to-do offers a state, and the team target is not on anybody\'s card', () => {
    const onSetToDo = vi.fn()
    render(<EachPerson groundId="g1" people={people as any} targets={targets} toDos={toDos} files={files} asks={asks as any} viewerUserId="u1" isLead={false} onSetToDo={onSetToDo} />)
    expect(screen.getByText('Done')).toBeTruthy()
    expect(screen.queryByText('12,000,000')).toBeNull()
  })

  it('and a lead changes what is expected in the conversation, not in a form', () => {
    const onChangeInChat = vi.fn()
    render(<EachPerson groundId="g1" people={people as any} targets={targets} toDos={toDos} files={files} asks={asks as any} viewerUserId="u9" isLead onChangeInChat={onChangeInChat} />)
    /* Nobody's row is open for a lead who is not on the check-in, so nothing is drawn yet. */
    expect(screen.queryByText('Change this in the chat')).toBeNull()
  })

  /*
   * U.7 REVIEW: "Your note" IS SAID ONLY TO THE LEAD WHO WROTE IT. Otieno, an admin not in the
   * check-in, read "Baraka. Your note: ..." about a note Wanjiru wrote. The server no longer sends it
   * to him; the card does not say it to him either, even if a row still carried one.
   */
  it('the lead reads her own note beside the name, and an admin reading the page does not', () => {
    const withNote = [{ id: 'pb', userId: null, nameGiven: 'Baraka', roleAsDescribed: 'Baraka - slow to follow up', objective: { all: [] } }]
    const { unmount } = render(<EachPerson groundId="g1" people={withNote as any} targets={[]} toDos={[]} files={[]} asks={{}} viewerUserId="u-wanjiru" isLead isTheLead />)
    expect(document.body.textContent).toContain('Baraka. Your note: slow to follow up.')
    unmount()
    render(<EachPerson groundId="g1" people={withNote as any} targets={[]} toDos={[]} files={[]} asks={{}} viewerUserId="u-otieno" isLead />)
    expect(document.body.textContent).not.toContain('Your note')
    expect(document.body.textContent).not.toContain('slow to follow up')
  })

  /* U.7 review: said to the reader. Aisha reads "Your numbers" on her own card, and nobody but
     the lead reads "your own check-in" about the lead's. */
  it('Aisha reads her own numbers as hers, and a colleague with none is named', () => {
    render(<EachPerson groundId="g1" people={people as any} targets={targets} toDos={toDos} files={files} asks={asks as any} viewerUserId="u1" isLead={false} leadFirstName="Wanjiru" />)
    expect(screen.getByText('Your numbers')).toBeTruthy()
    expect(screen.queryByText('Their numbers')).toBeNull()
    expect(screen.getByText('Only you can read it.')).toBeTruthy()
  })

  it('with no number of your own, you read it in a sentence about you', () => {
    render(<EachPerson groundId="g1" people={people as any} targets={[]} toDos={[]} files={[]} asks={{}} viewerUserId="u2" isLead={false} leadFirstName="Wanjiru" />)
    expect(screen.getByText('You have no number of your own. Your check-in asks against the team’s.')).toBeTruthy()
    expect(screen.getByText('Nothing yet. It comes from Wanjiru’s own check-in, or from the conversation on this page.')).toBeTruthy()
  })

  it('an admin opening a card reads the lead by name, not "your"', () => {
    render(<EachPerson groundId="g1" people={[people[1]] as any} targets={[]} toDos={[]} files={[]} asks={{}} viewerUserId="u-otieno" isLead leadFirstName="Wanjiru" />)
    fireEvent.click(screen.getByText('Miriam'))
    expect(screen.getByText('Miriam has no number of their own, so their check-in asks against the team’s.')).toBeTruthy()
    expect(screen.getByText('Nothing yet. It comes from Wanjiru’s own check-in, or from the conversation on this page.')).toBeTruthy()
  })
})
