import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RequestOffer, OpenTheRequest } from './RequestOffer'
import type { TheRequestOfferInTheCheckIn, TheRequestToOpen } from '@/api/anchorShapes'

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

describe('OpenTheRequest, anchor pieces 26 and 27', () => {
  it('draws nothing when there is nothing to open', () => {
    const { container } = render(<OpenTheRequest open={undefined} onOpenAsk={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('draws nothing when it is explicitly null', () => {
    const { container } = render(<OpenTheRequest open={null} onOpenAsk={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('with the suite on, shows the sentence and a button that opens Ask', () => {
    const onOpenAsk = vi.fn()
    render(<OpenTheRequest open={leaveOpenOn} onOpenAsk={onOpenAsk} />)
    expect(screen.getByText(leaveOpenOn.says)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Request leave' }))
    expect(onOpenAsk).toHaveBeenCalledTimes(1)
  })

  it('with the suite off, shows only the sentence, no button', () => {
    render(<OpenTheRequest open={spendingOpenOff} onOpenAsk={() => {}} />)
    expect(screen.getByText(spendingOpenOff.says)).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })
})
