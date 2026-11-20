import { describe, it, expect } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { EveryTicketAndWhatShowsIt } from './TheTicketsBoard'

/**
 * THE ENGINEERING BOARD'S DETAIL OF ONE TASK (eng.jpg: "Payment integration. Change. Test. Deploy. Next."). The first task is open at the
 * start, selecting another opens its own, a detail nobody said reads "Not said yet", and the card says how the task is known.
 * The same card draws for a support ticket (queue, cause) and an incident (impact, fix, prevention).
 */
const section = { section: 'Deal grid', stages: ['Worked on', 'Written', 'Merged', 'Tested', 'Deployed', 'Used'], rows: [
  { id: 'a', kind: 'task', name: 'Payment integration', stage: 'Tested', owner: 'Aisha Bello', mark: 'said', saidBy: 'Aisha Bello', fields: { Change: 'Callback fix and the main payment flows', Test: 'Described, not linked', Deploy: 'Production test on 24 September', 'Next step': 'Link the test run, then the production deploy' } },
  { id: 'b', kind: 'task', name: 'Login fix', stage: 'Tested', owner: 'Miriam Wanjiru', mark: 'proven', fields: { Change: 'Check-in timeout' } },
] }
const draw = (kind: string, sec: any) => render(<MemoryRouter><EveryTicketAndWhatShowsIt section={sec} kindOfWork={kind} groundId="g-1" me={null} /></MemoryRouter>)

describe('the engineering board’s detail of one task', () => {
  it('opens the first task with what was changed, tested and deployed, and what happens next', () => {
    draw('engineering release', section)
    const card = screen.getByLabelText('The detail of Payment integration')
    const text = card.textContent ?? ''
    for (const t of ['Change', 'Callback fix and the main payment flows', 'Test', 'Described, not linked', 'Deploy', 'Production test on 24 September', 'Next, link the test run, then the production deploy.', 'Aisha said this, and no document backs it yet.']) expect(text).toContain(t)
  })
  it('opens another task when it is selected, says what nobody said, and says a document backs it', () => {
    draw('engineering release', section)
    fireEvent.click(within(screen.getByRole('table')).getByRole('button', { name: 'Login fix' }))
    const text = screen.getByLabelText('The detail of Login fix').textContent ?? ''
    expect(text).toContain('Check-in timeout')
    expect(text).toContain('Not said yet')
    expect(text).toContain('A document backs this record.')
    expect(text).toContain('What happens next has not been said yet.')
  })
  it('draws the queue and the cause for a support ticket, and the impact and the fix for an incident', () => {
    draw('support desk', { section: 'Deal grid', rows: [{ id: 't', kind: 'ticket', name: '#4812', owner: 'Grace Wambui', fields: { Queue: 'Billing', Cause: 'A billing bug after a plan change' } }] })
    expect(screen.getByLabelText('The detail of #4812').textContent).toContain('A billing bug after a plan change')
  })
})
