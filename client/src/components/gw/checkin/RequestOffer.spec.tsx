import type { ReactElement } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { RequestOffer, OpenTheRequest } from './RequestOffer'
import type { TheRequestOfferInTheCheckIn, TheRequestToOpen } from '@/api/anchorShapes'

/** Stands in for the suite's own request form, so a test can read what `OpenTheRequest`'s button
    actually navigated to and with what prefill, without rendering the real form pages. */
function DestinationStub() {
  const location = useLocation()
  return <div>Arrived at {location.pathname}, prefill {JSON.stringify((location.state as any)?.prefill ?? null)}</div>
}

function renderWithRouter(ui: ReactElement) {
  return render(
    <MemoryRouter initialEntries={['/checkin/ci1']}>
      <Routes>
        <Route path="/checkin/ci1" element={ui} />
        <Route path="/suite/leave/new" element={<DestinationStub />} />
        <Route path="/suite/spend/new" element={<DestinationStub />} />
      </Routes>
    </MemoryRouter>,
  )
}

/**
 * ANCHOR PIECES 26 AND 27 (docs/answers-from-engine.md, "Anchor pieces 26 and 27, a request
 * offered in the check-in, are built"; section 22). The fixtures are the spec's own words.
 */
const leaveOffer: TheRequestOfferInTheCheckIn = {
  kind: 'leave',
  question: 'Shall I treat this as a leave request?',
  yes: 'Yes',
  no: 'No',
}

const leaveOpenOn: TheRequestToOpen = {
  kind: 'leave',
  suiteIsOn: true,
  says: "You can submit that through Leave here and it'll appear on your manager's board.",
  button: 'Request leave',
}

const spendingOpenOff: TheRequestToOpen = {
  kind: 'spending',
  suiteIsOn: false,
  says: 'Your organisation also has the option to manage spending requests through Groundwork.',
  button: null,
}

describe('RequestOffer, anchor pieces 26 and 27', () => {
  it('draws nothing when there is no offer', () => {
    const { container } = render(<RequestOffer offer={undefined} onPick={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('draws nothing when the offer is explicitly null', () => {
    const { container } = render(<RequestOffer offer={null} onPick={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the served question and both answers', () => {
    render(<RequestOffer offer={leaveOffer} onPick={() => {}} />)
    expect(screen.getByText(leaveOffer.question)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Yes' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'No' })).toBeTruthy()
  })

  it('sends exactly the served "Yes", never a paraphrase', () => {
    const onPick = vi.fn()
    render(<RequestOffer offer={leaveOffer} onPick={onPick} />)
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
    expect(onPick).toHaveBeenCalledWith('Yes')
  })
})

/*
 * CHANGED (Hafsah, 6 October, request 165): the button no longer opens Ask. "Request leave" and
 * "Create request" open the suite's own request form - Leave or Payment Requests - filled in with
 * what the person said, never Ask. These tests used to assert an `onOpenAsk` callback; they now
 * render through a router and assert the real destination and the prefill carried to it.
 */
describe('OpenTheRequest, anchor pieces 26 and 27', () => {
  it('draws nothing when there is nothing to open', () => {
    const { container } = renderWithRouter(<OpenTheRequest open={undefined} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('draws nothing when it is explicitly null', () => {
    const { container } = renderWithRouter(<OpenTheRequest open={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('with the suite on, shows the sentence and a button that opens the leave form, not Ask', () => {
    renderWithRouter(<OpenTheRequest open={leaveOpenOn} />)
    expect(screen.getByText(leaveOpenOn.says)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Request leave' }))
    expect(screen.getByText(/Arrived at \/suite\/leave\/new/)).toBeTruthy()
  })

  it('carries the prefill to the form, exactly as served', () => {
    const withPrefill: TheRequestToOpen = { ...leaveOpenOn, prefill: { startsOn: '2026-10-10', endsOn: '2026-10-12' } }
    renderWithRouter(<OpenTheRequest open={withPrefill} />)
    fireEvent.click(screen.getByRole('button', { name: 'Request leave' }))
    expect(screen.getByText(/prefill \{"startsOn":"2026-10-10","endsOn":"2026-10-12"\}/)).toBeTruthy()
  })

  it('a spending request opens the spend form', () => {
    const spendingOpenOn: TheRequestToOpen = {
      kind: 'spending', suiteIsOn: true,
      says: 'I can turn that into a payment request so it appears on the appropriate board.',
      button: 'Create request',
    }
    renderWithRouter(<OpenTheRequest open={spendingOpenOn} />)
    fireEvent.click(screen.getByRole('button', { name: 'Create request' }))
    expect(screen.getByText(/Arrived at \/suite\/spend\/new/)).toBeTruthy()
  })

  it('with the suite off, shows only the sentence, no button', () => {
    renderWithRouter(<OpenTheRequest open={spendingOpenOff} />)
    expect(screen.getByText(spendingOpenOff.says)).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })

  /*
   * FAULT 7 (LIVE RE-WALK): "YOU CAN SUBMIT THAT THROUGH LEAVE HERE..." TWICE - once as the
   * assistant's own chat bubble (passed in as `replyText`), once again in this card, when the
   * model's reply already said the spec's sentence word for word.
   */
  it('draws only the button, not the sentence again, when the reply already said it', () => {
    renderWithRouter(<OpenTheRequest open={leaveOpenOn} replyText={`Got it. ${leaveOpenOn.says} Anything else?`} />)
    expect(screen.queryByText(leaveOpenOn.says)).toBeNull()
    expect(screen.getByRole('button', { name: 'Request leave' })).toBeTruthy()
  })

  it('draws the sentence when the reply did not already say it', () => {
    renderWithRouter(<OpenTheRequest open={leaveOpenOn} replyText="Got it, I've noted that." />)
    expect(screen.getByText(leaveOpenOn.says)).toBeTruthy()
  })

  it('draws the sentence as before when no reply text is given at all', () => {
    renderWithRouter(<OpenTheRequest open={leaveOpenOn} />)
    expect(screen.getByText(leaveOpenOn.says)).toBeTruthy()
  })
})
