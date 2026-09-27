import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SuggestionsForTheLead, WhereYouStandFromSuggestions, AppealsToDecide } from './Suggestions'
import { suggestionsApi, type SuggestionForTheLead, type SuggestionForThePerson, type AppealForAnAdmin } from '@/api/suggestions'

vi.mock('@/api/suggestions', async (orig) => {
  const real: any = await orig()
  return {
    ...real,
    suggestionsApi: {
      onCheckIn: vi.fn(), appealsToDecide: vi.fn(), decide: vi.fn(), addSide: vi.fn(), appeal: vi.fn(), decideAppeal: vi.fn(),
    },
  }
})

/**
 * A VERDICT, TOLD LIKE A SIGNAL, AS EACH READER SEES IT (C3, U.13; decisions rule 6).
 *
 * The words are the prototype's (docs/prototype/screens/C3-suggestions-and-appeals/*.txt) wherever
 * it has them. Wairimu runs "Daniel, the next six weeks" and "Kwame, first 90 days". Daniel is on
 * the first. Grace is an admin. Each is drawn exactly what the server served them, and nothing on
 * any page puts a label on a person.
 */
const LABELS_ON_PEOPLE = /\b(PIP|at risk|exit|underperform|low performer)\b/i

const daniel: SuggestionForTheLead = {
  id: 's-d', checkIn: { id: 'g-d', label: 'Daniel, the next six weeks' }, aboutName: 'Daniel',
  headline: 'Groundwork suggests a performance plan for Daniel',
  why: 'In the last 4 weeks, Daniel kept 11 of his 20 commitments. That is 55%. Below 6 in 10, Groundwork suggests a plan. Also, 7 of his sales have been stuck for 3 check-ins in a row.',
  whatWouldChangeIt: 'Keeping 8 in 10 of his commitments for the next 4 weeks.',
  theirOwnAnswer: 'Most of my time goes on cleaning the customer records, which I was asked to do.',
  ifYouAgree: 'A 6-week plan, with one hour a week together, and the customer records moved to Brian.',
  otherChoices: ['Extra help, without a plan', 'Keep things as they are'],
  aboutTheEnding: false, decision: null, theirSide: null, appeal: null, appealDecision: null, mayChangeTheDecision: true,
}
const kwame: SuggestionForTheLead = {
  ...daniel, id: 's-k', checkIn: { id: 'g-k', label: 'Kwame, first 90 days' }, aboutName: 'Kwame',
  headline: 'Groundwork suggests keeping Kwame on',
  why: 'He brought in 5 new accounts against a goal of 4, and 4 of them have a proven first order.',
  whatWouldChangeIt: 'If he started raising problems late again.',
  theirOwnAnswer: 'Onboarding stock took three weeks. I couldn’t sell what I couldn’t deliver.',
  aboutTheEnding: true,
}
const danielReads: SuggestionForThePerson = {
  id: 's-d', checkIn: { id: 'g-d', label: 'Daniel, the next six weeks' }, leadName: 'Wairimu',
  facts: 'In the last 4 weeks, you kept 11 of your 20 commitments. When fewer than 6 in 10 are kept, Groundwork suggests extra help to your manager.',
  whatWouldChangeIt: 'Keeping 8 in 10 for the next 4 weeks.',
  decision: null, yourSide: null, yourAppeal: null, appealDecision: null, mayAppeal: false,
}
const graceReads: AppealForAnAdmin = {
  id: 's-d', checkIn: { id: 'g-d', label: 'Daniel, the next six weeks' }, aboutName: 'Daniel', leadName: 'Wairimu',
  headline: daniel.headline, why: daniel.why, whatWouldChangeIt: daniel.whatWouldChangeIt, theirOwnAnswer: daniel.theirOwnAnswer,
  decision: { says: 'A 6-week plan.', reasons: 'Seven sales have been stuck for three check-ins.', at: null },
  theirSide: 'I was asked to clean 480 customer records.',
  appeal: { says: 'The records were the job I was given.', at: null },
  appealDecision: null, mayDecide: true,
}

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<MemoryRouter><QueryClientProvider client={qc}>{ui}</QueryClientProvider></MemoryRouter>)
}
const settle = () => new Promise((r) => setTimeout(r, 30))

beforeEach(() => vi.clearAllMocks())

describe('Wairimu, who runs the check-in', () => {
  it('reads Daniel’s suggestion on the board, in the prototype’s words', async () => {
    ;(suggestionsApi.onCheckIn as any).mockResolvedValue({ suggestions: [daniel, kwame] })
    const { container } = wrap(<SuggestionsForTheLead groundId="g-d" where="board" />)
    expect(await screen.findByText('Groundwork suggests a performance plan for Daniel')).toBeTruthy()
    const text = container.textContent!
    expect(text).toContain(`Why: ${daniel.why}`)
    expect(text).toContain('What would change this: Keeping 8 in 10 of his commitments for the next 4 weeks.')
    expect(text).toContain('Daniel’s own answer.')
    expect(text).toContain('“Most of my time goes on cleaning the customer records, which I was asked to do.”')
    expect(text).toContain('Your decision')
    expect(text).toContain('This is only a suggestion. You decide, and Daniel sees your reasons.')
    expect(screen.getByText('Agree')).toBeTruthy()
    expect(screen.getByText('Choose something else')).toBeTruthy()
    /* The ending's suggestion belongs on the ending page, not the board. */
    expect(text).not.toContain('Groundwork suggests keeping Kwame on')
    expect(text).not.toMatch(LABELS_ON_PEOPLE)
  })

  it('reads Kwame’s suggestion on the ending page, and only that one', async () => {
    ;(suggestionsApi.onCheckIn as any).mockResolvedValue({ suggestions: [daniel, kwame] })
    const { container } = wrap(<SuggestionsForTheLead groundId="g-k" where="ending" />)
    expect(await screen.findByText('Groundwork suggests keeping Kwame on')).toBeTruthy()
    expect(container.textContent).toContain('Kwame’s own answer.')
    expect(container.textContent).toContain('This is only a suggestion. You decide, and Kwame sees your reasons.')
    expect(container.textContent).not.toContain('performance plan')
  })

  it('agrees, with the suggested decision to change and her reasons, and cannot save without reasons', async () => {
    ;(suggestionsApi.onCheckIn as any).mockResolvedValue({ suggestions: [daniel] })
    ;(suggestionsApi.decide as any).mockResolvedValue({ suggestions: [] })
    wrap(<SuggestionsForTheLead groundId="g-d" where="board" />)
    fireEvent.click(await screen.findByText('Agree'))
    const decision = screen.getByLabelText('Your decision') as HTMLInputElement
    expect(decision.value).toBe(daniel.ifYouAgree)
    const save = screen.getByText('Save my decision').closest('button')!
    expect(save.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Your reasons, in a sentence or two'), { target: { value: 'The records go to Brian, and we meet weekly.' } })
    expect(save.disabled).toBe(false)
    fireEvent.click(save)
    await waitFor(() => expect(suggestionsApi.decide).toHaveBeenCalledWith('s-d', {
      decision: daniel.ifYouAgree, reasons: 'The records go to Brian, and we meet weekly.',
    }))
  })

  it('when saving fails, says so and keeps what she wrote', async () => {
    ;(suggestionsApi.onCheckIn as any).mockResolvedValue({ suggestions: [daniel] })
    ;(suggestionsApi.decide as any).mockRejectedValue(new Error('offline'))
    wrap(<SuggestionsForTheLead groundId="g-d" where="board" />)
    fireEvent.click(await screen.findByText('Agree'))
    fireEvent.change(screen.getByLabelText('Your reasons, in a sentence or two'), { target: { value: 'My reasons.' } })
    fireEvent.click(screen.getByText('Save my decision'))
    expect(await screen.findByText('That did not save. What you wrote is still here, so you can try again.')).toBeTruthy()
    expect((screen.getByLabelText('Your reasons, in a sentence or two') as HTMLTextAreaElement).value).toBe('My reasons.')
  })

  it('chooses something else from the choices', async () => {
    ;(suggestionsApi.onCheckIn as any).mockResolvedValue({ suggestions: [daniel] })
    ;(suggestionsApi.decide as any).mockResolvedValue({ suggestions: [] })
    wrap(<SuggestionsForTheLead groundId="g-d" where="board" />)
    fireEvent.click(await screen.findByText('Choose something else'))
    fireEvent.click(screen.getByLabelText('Keep things as they are'))
    fireEvent.change(screen.getByLabelText('Your reasons, in a sentence or two'), { target: { value: 'The records explain it.' } })
    fireEvent.click(screen.getByText('Save my decision'))
    await waitFor(() => expect(suggestionsApi.decide).toHaveBeenCalledWith('s-d', { decision: 'Keep things as they are', reasons: 'The records explain it.' }))
  })

  it('after deciding, reads her decision, Daniel’s side, his appeal, and then the admin’s answer', async () => {
    const decided = { ...daniel, decision: { says: 'A 6-week plan.', reasons: 'Seven sales have been stuck.', at: null } }
    ;(suggestionsApi.onCheckIn as any).mockResolvedValue({ suggestions: [decided] })
    const first = wrap(<SuggestionsForTheLead groundId="g-d" where="board" />)
    await screen.findByText('Your reasons')
    expect(first.container.textContent).toContain('Daniel sees your decision and your reasons, and can appeal.')
    expect(screen.getByText('Change my decision')).toBeTruthy()
    expect(screen.queryByText('Agree')).toBeNull()
    first.unmount()

    ;(suggestionsApi.onCheckIn as any).mockResolvedValue({ suggestions: [{
      ...decided, theirSide: 'I was asked to clean 480 customer records.',
      appeal: { says: 'The records were the job I was given.', at: null }, mayChangeTheDecision: false,
    }] })
    const second = wrap(<SuggestionsForTheLead groundId="g-d" where="board" />)
    await screen.findByText('Daniel has appealed')
    expect(second.container.textContent).toContain('Daniel’s side')
    expect(second.container.textContent).toContain('“I was asked to clean 480 customer records.”')
    expect(second.container.textContent).toContain('An admin decides the appeal.')
    expect(screen.queryByText('Change my decision')).toBeNull()
    second.unmount()

    ;(suggestionsApi.onCheckIn as any).mockResolvedValue({ suggestions: [{
      ...decided, appeal: { says: 'x', at: null }, mayChangeTheDecision: false,
      appealDecision: { outcome: 'changed', says: 'The decision is changed.', reasons: 'The records were his assigned work.', by: 'Grace', at: null },
    }] })
    const third = wrap(<SuggestionsForTheLead groundId="g-d" where="board" />)
    await screen.findByText('Grace’s reasons')
    expect(third.container.textContent).toContain('Grace decided the appeal. The decision is changed.')
  })

  it('draws nothing when there is no suggestion, or when the server refuses', async () => {
    ;(suggestionsApi.onCheckIn as any).mockResolvedValue({ suggestions: [] })
    const a = wrap(<SuggestionsForTheLead groundId="g-d" where="board" />)
    await settle()
    expect(a.container.textContent).toBe('')
    a.unmount()
    ;(suggestionsApi.onCheckIn as any).mockRejectedValue(new Error('403'))
    const b = wrap(<SuggestionsForTheLead groundId="g-d" where="board" />)
    await settle()
    expect(b.container.textContent).toBe('')
  })

  it('a person’s own shape, served on a check-in, is never drawn as a lead’s card', async () => {
    ;(suggestionsApi.onCheckIn as any).mockResolvedValue({ suggestions: [danielReads] })
    const { container } = wrap(<SuggestionsForTheLead groundId="g-d" where="board" />)
    await settle()
    expect(container.textContent).toBe('')
  })
})

describe('Daniel, on his own You board', () => {
  it('reads where he stands, in the prototype’s words, before Wairimu decides', () => {
    const { container } = wrap(<WhereYouStandFromSuggestions items={[danielReads]} />)
    const text = container.textContent!
    expect(text).toContain('Where you stand')
    expect(text).toContain('About your work in Daniel, the next six weeks.')
    expect(text).toContain(danielReads.facts)
    expect(text).toContain('What would change this: Keeping 8 in 10 for the next 4 weeks.')
    expect(text).toContain('Wairimu has not decided anything yet. You will see the decision and the reasons here.')
    expect(screen.getByText('Add my side')).toBeTruthy()
    expect(screen.queryByText('Appeal this decision')).toBeNull()
    for (const never of ['performance plan', 'Groundwork suggests a', 'Below 6 in 10', 'Agree', 'Choose something else']) {
      expect(text).not.toContain(never)
    }
    expect(text).not.toMatch(LABELS_ON_PEOPLE)
  })

  it('adds his side', async () => {
    ;(suggestionsApi.addSide as any).mockResolvedValue(danielReads)
    wrap(<WhereYouStandFromSuggestions items={[danielReads]} />)
    fireEvent.click(screen.getByText('Add my side'))
    expect(screen.getByText('Wairimu sees this next to the facts.')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Your side'), { target: { value: 'I was asked to clean 480 customer records.' } })
    fireEvent.click(screen.getByText('Save'))
    await waitFor(() => expect(suggestionsApi.addSide).toHaveBeenCalledWith('s-d', 'I was asked to clean 480 customer records.'))
  })

  it('reads the decision with its reasons, and appeals it', async () => {
    ;(suggestionsApi.appeal as any).mockResolvedValue(danielReads)
    const decided = { ...danielReads, decision: { says: 'A 6-week plan.', reasons: 'Seven sales have been stuck.', at: null }, yourSide: 'My side.', mayAppeal: true }
    const { container } = wrap(<WhereYouStandFromSuggestions items={[decided]} />)
    expect(container.textContent).toContain('Wairimu’s decision')
    expect(container.textContent).toContain('A 6-week plan.')
    expect(container.textContent).toContain('Wairimu’s reasons')
    expect(container.textContent).toContain('Seven sales have been stuck.')
    expect(container.textContent).toContain('Your side')
    expect(screen.getByText('Change my side')).toBeTruthy()
    fireEvent.click(screen.getByText('Appeal this decision'))
    expect(screen.getByText('An admin looks at the decision, the facts and your reasons, and decides. Wairimu sees that you appealed.')).toBeTruthy()
    const send = screen.getByText('Send my appeal').closest('button')!
    expect(send.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Why do you disagree?'), { target: { value: 'The records were the job I was given.' } })
    fireEvent.click(send)
    await waitFor(() => expect(suggestionsApi.appeal).toHaveBeenCalledWith('s-d', 'The records were the job I was given.'))
  })

  it('after appealing, is told an admin decides, and then reads the answer', () => {
    const appealed = { ...danielReads, decision: { says: 'A 6-week plan.', reasons: 'r', at: null }, yourAppeal: { says: 'x', at: null } }
    const a = wrap(<WhereYouStandFromSuggestions items={[appealed]} />)
    expect(a.container.textContent).toContain('You appealed. An admin decides. You will see the answer here.')
    expect(screen.queryByText('Appeal this decision')).toBeNull()
    a.unmount()
    const b = wrap(<WhereYouStandFromSuggestions items={[{ ...appealed, appealDecision: { outcome: 'stands', says: 'The decision stays.', reasons: 'It was fair.', by: 'Grace', at: null } }]} />)
    expect(b.container.textContent).toContain('Grace decided your appeal. The decision stays.')
    expect(b.container.textContent).toContain('Grace’s reasons')
    expect(b.container.textContent).toContain('It was fair.')
  })
})

describe('Grace, an admin, on Today', () => {
  it('reads each appeal with what she needs, and decides it with reasons', async () => {
    ;(suggestionsApi.appealsToDecide as any).mockResolvedValue({ appeals: [graceReads] })
    ;(suggestionsApi.decideAppeal as any).mockResolvedValue({ appeals: [] })
    const { container } = wrap(<AppealsToDecide />)
    expect(await screen.findByText('Appeals to decide')).toBeTruthy()
    const text = container.textContent!
    expect(text).toContain('Daniel appealed Wairimu’s decision')
    expect(text).toContain('In Daniel, the next six weeks.')
    expect(text).toContain('Wairimu’s decision')
    expect(text).toContain('Wairimu’s reasons')
    expect(text).toContain('Daniel’s side')
    expect(text).toContain('Daniel’s appeal')
    expect(text).toContain('“The records were the job I was given.”')
    expect(text).not.toMatch(LABELS_ON_PEOPLE)
    fireEvent.click(screen.getByText('Change the decision'))
    expect(screen.getByText('Daniel and Wairimu both read your reasons.')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Your reasons'), { target: { value: 'The records were his assigned work.' } })
    fireEvent.click(screen.getByText('Save'))
    await waitFor(() => expect(suggestionsApi.decideAppeal).toHaveBeenCalledWith('s-d', { outcome: 'changed', reasons: 'The records were his assigned work.' }))
  })

  it('is told somebody else decides an appeal against her own decision, with no buttons', async () => {
    ;(suggestionsApi.appealsToDecide as any).mockResolvedValue({ appeals: [{ ...graceReads, mayDecide: false }] })
    wrap(<AppealsToDecide />)
    expect(await screen.findByText('You made this decision, so another admin decides the appeal.')).toBeTruthy()
    expect(screen.queryByText('Keep the decision')).toBeNull()
  })

  it('draws nothing with no appeals, or when the server refuses', async () => {
    ;(suggestionsApi.appealsToDecide as any).mockResolvedValue({ appeals: [] })
    const a = wrap(<AppealsToDecide />)
    await settle()
    expect(a.container.textContent).toBe('')
    a.unmount()
    ;(suggestionsApi.appealsToDecide as any).mockRejectedValue(new Error('403'))
    const b = wrap(<AppealsToDecide />)
    await settle()
    expect(b.container.textContent).toBe('')
  })
})
