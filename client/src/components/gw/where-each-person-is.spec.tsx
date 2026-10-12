import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WhereEachPersonIs, type Row } from './where-each-person-is'

/**
 * RE-REVIEW, 30 SEPTEMBER: two defects on "The team today".
 *
 * (a) A "Nothing to do" tag sat beside Amani and Baraka while the same board told the reader,
 * three sections down, "Amani Wekesa has been waiting 2 days on you for the price list." The
 * `reason` itself is the engine's own classification, not changed here - but a row already flagged
 * `waitingOnReader` (computed on the board from its own "Waiting on" handoffs) now reads "Waiting
 * on you" instead of contradicting that sentence.
 *
 * (b) "0 of 4" stood alone as a bare fragment above "Baraka Mwangi has checked in...". It now reads
 * what the number counts, as a sentence: "Baraka Mwangi has none of their 4 shops in Westlands
 * yet."
 */
const row = (overrides: Partial<Row>): Row => ({
  participantId: 'p-1',
  who: 'Baraka Mwangi',
  target: null,
  count: 0,
  reason: 'nothing to do',
  says: 'Baraka Mwangi has checked in.',
  ask: null,
  ...overrides,
})

describe('WhereEachPersonIs: the tag never contradicts the "Waiting on" section', () => {
  /*
   * PROJECT BOARD REVIEW 1, FIX 4: NO TAG AT ALL FOR "NOTHING TO DO". Updated because this used
   * to assert the engine's own internal reason code ("Nothing to do") printed as a tag on the
   * person - exactly the label-on-a-person CLAUDE.md rules out, and never what the prototype's
   * own "team today" rows show for somebody on pace with nothing needed of the reader (eng.txt:
   * Miriam and Aisha read no tag at all, just their own sentence).
   */
  it('draws no tag when nobody is waiting on the reader - just the row\'s own sentence', () => {
    render(<WhereEachPersonIs rows={[row({})]} />)
    expect(screen.queryByText('Nothing to do')).toBeNull()
    expect(screen.queryByText('Waiting on you')).toBeNull()
    expect(screen.getByText('Baraka Mwangi has checked in.')).toBeTruthy()
  })

  it('reads "Waiting on you" instead, when this person is waiting on the reader for something', () => {
    render(<WhereEachPersonIs rows={[row({ waitingOnReader: true })]} />)
    expect(screen.getByText('Waiting on you')).toBeTruthy()
    expect(screen.queryByText('Nothing to do')).toBeNull()
  })

  it('leaves every other reason exactly as the engine sent it, even if waitingOnReader is somehow true', () => {
    render(<WhereEachPersonIs rows={[row({ reason: 'has not answered', waitingOnReader: true })]} />)
    expect(screen.getByText('Has not answered')).toBeTruthy()
    expect(screen.queryByText('Waiting on you')).toBeNull()
  })
})

describe('WhereEachPersonIs: a count reads as a sentence, not a bare "0 of 4"', () => {
  it('names what the number counts, from the matching objective\'s own name', () => {
    render(<WhereEachPersonIs rows={[row({ target: 4, count: 0, targetName: 'shops in Westlands' })]} />)
    expect(screen.getByText('Baraka Mwangi has none of their 4 shops in Westlands yet.')).toBeTruthy()
    expect(screen.queryByText('0 of 4')).toBeNull()
  })

  it('says "so far", not "yet", once the count is more than zero', () => {
    render(<WhereEachPersonIs rows={[row({ who: 'Aisha Otieno', target: 5, count: 3, targetName: 'shops in Kilimani' })]} />)
    expect(screen.getByText('Aisha Otieno has 3 of the 5 shops in Kilimani so far.')).toBeTruthy()
  })

  it('falls back to a plain "target"/"targets" when no objective name is served', () => {
    render(<WhereEachPersonIs rows={[row({ target: 1, count: 0 })]} />)
    expect(screen.getByText('Baraka Mwangi has none of their 1 target yet.')).toBeTruthy()
  })
})

/**
 * BOARD REVIEW, SALES PIECE A, ITEM 3: THE BROKEN SENTENCE.
 *
 * "Baraka Mwangi has none of their 4 Onboard 4 shops in Westlands. yet." happened when `targetName`
 * arrived as the objective's own full name (a verb, the count, a trailing full stop) rather than the
 * plain noun phrase this row assumed. It must always read as one plain full sentence, the number said
 * once, whatever `targetName` carries - checked here for count 0 and count 2, with a `targetName`
 * ending in a full stop and carrying its own leading verb and number.
 */
describe('WhereEachPersonIs: one plain sentence even when targetName carries its own verb, number and full stop', () => {
  it('count 0: strips the trailing stop and never repeats the number', () => {
    render(<WhereEachPersonIs rows={[row({ target: 4, count: 0, targetName: 'Onboard 4 shops in Westlands.' })]} />)
    expect(screen.getByText('Baraka Mwangi has none of their 4 shops in Westlands yet.')).toBeTruthy()
    expect(screen.queryByText(/4 Onboard 4 shops/)).toBeNull()
    expect(screen.queryByText(/Westlands\. yet/)).toBeNull()
  })

  it('count 2: says "so far", the number once, and the trailing stop is gone', () => {
    render(<WhereEachPersonIs rows={[row({ target: 4, count: 2, targetName: 'Onboard 4 shops in Westlands.' })]} />)
    expect(screen.getByText('Baraka Mwangi has 2 of the 4 shops in Westlands so far.')).toBeTruthy()
  })
})

/**
 * SALES BOARD, ITEM 4: "BY <DATE> FOR THEIR OWN WORK" RAN ON INTO THE SAME SENTENCE.
 *
 * A `targetName` sent as "shops in Kilimani by 20 December for their own work" built "Amani Wekesa
 * has none of their 3 shops in Kilimani by 20 December for their own work yet." - a pronoun clause
 * bolted into the middle of the sentence, ahead of the date it was attached to. Both are stripped
 * from the name; the date becomes its own short sentence instead of being dropped. Checked at count
 * 0 and count 2, and against a clean name with neither clause to prove nothing breaks when there is
 * nothing to strip.
 */
describe('WhereEachPersonIs: a deadline and a pronoun clause inside targetName read as plain sentences', () => {
  it('count 0: strips "for their own work" and reads the date as its own sentence', () => {
    render(<WhereEachPersonIs rows={[row({
      who: 'Amani Wekesa', target: 3, count: 0, targetName: 'shops in Kilimani by 20 December for their own work',
    })]} />)
    expect(screen.getByText('Amani Wekesa has none of their 3 shops in Kilimani yet. The aim is 3 by 20 December.')).toBeTruthy()
    expect(screen.queryByText(/for their own work/)).toBeNull()
    expect(screen.queryByText(/by 20 December yet/)).toBeNull()
  })

  it('count 2: says "so far", and the date still reads as its own sentence', () => {
    render(<WhereEachPersonIs rows={[row({
      who: 'Amani Wekesa', target: 3, count: 2, targetName: 'shops in Kilimani by 20 December for their own work',
    })]} />)
    expect(screen.getByText('Amani Wekesa has 2 of the 3 shops in Kilimani so far. The aim is 3 by 20 December.')).toBeTruthy()
  })

  it('strips "for his own work" the same way, with no he/she introduced anywhere', () => {
    render(<WhereEachPersonIs rows={[row({
      who: 'Juma Otieno', target: 2, count: 0, targetName: 'accounts renewed by 1 March for his own work',
    })]} />)
    expect(screen.getByText('Juma Otieno has none of their 2 accounts renewed yet. The aim is 2 by 1 March.')).toBeTruthy()
    expect(screen.queryByText(/\bhe\b/i)).toBeNull()
    expect(screen.queryByText(/\bhis\b/i)).toBeNull()
  })

  it('a clean name with neither clause is read exactly as before, at count 0', () => {
    render(<WhereEachPersonIs rows={[row({
      who: 'Aisha Otieno', target: 5, count: 0, targetName: 'shops in Kilimani',
    })]} />)
    expect(screen.getByText('Aisha Otieno has none of their 5 shops in Kilimani yet.')).toBeTruthy()
  })

  it('a clean name with neither clause is read exactly as before, at count 2', () => {
    render(<WhereEachPersonIs rows={[row({
      who: 'Aisha Otieno', target: 5, count: 2, targetName: 'shops in Kilimani',
    })]} />)
    expect(screen.getByText('Aisha Otieno has 2 of the 5 shops in Kilimani so far.')).toBeTruthy()
  })
})

/**
 * ONBOARDING BOARD FIX 4: A VERB PHRASE IS NOT A NOUN A COUNT CAN SIT IN FRONT OF.
 *
 * "Tobi Adewale has none of their 1 Manage the renewal process for at least one of the clients
 * yet." happened because this `targetName` is the objective's own full sentence - a verb, with its
 * own count written as a WORD ("...at least one...") rather than a digit - so `cleanedTargetName`
 * had no digit of the target's own number to find and strip, and kept the whole sentence where a
 * plain noun was expected. Read live on Engagement Director, first 90 days
 * (e2cfd3d8-f80a-4ac0-a680-e327daed0223).
 */
describe('WhereEachPersonIs: a verb-phrase targetName with no digit of its own reads as its own sentence', () => {
  /*
   * SECOND REVIEW: TWO FULL SENTENCES, NOT A NAME JOINED TO A QUOTE BY A COLON. "Tobi Adewale has
   * not yet done this: "..."" was still one clipped phrase stapled to a quote - CLAUDE.md asks for
   * plain, full sentences, never pieces joined with colons. Now "{name}'s target is "..." It is not
   * done yet." (or "It is done." once it is) - two complete sentences.
   */
  it('count 0: "{name}’s target is "…" It is not done yet.", never the broken "none of their 1 ... yet"', () => {
    render(<WhereEachPersonIs rows={[row({
      who: 'Tobi Adewale', target: 1, count: 0,
      targetName: 'Manage the renewal process for at least one of the clients.',
    })]} />)
    expect(screen.getByText('Tobi Adewale’s target is “Manage the renewal process for at least one of the clients.” It is not done yet.')).toBeTruthy()
    expect(screen.queryByText(/none of their 1/)).toBeNull()
    expect(screen.queryByText(/:/)).toBeNull()
  })

  it('count 1: "… It is done.", not "so far"', () => {
    render(<WhereEachPersonIs rows={[row({
      who: 'Tobi Adewale', target: 1, count: 1,
      targetName: 'Manage the renewal process for at least one of the clients.',
    })]} />)
    expect(screen.getByText('Tobi Adewale’s target is “Manage the renewal process for at least one of the clients.” It is done.')).toBeTruthy()
  })

  it('the reader’s own row reads "Your target is …", not their own name', () => {
    render(<WhereEachPersonIs rows={[row({
      who: 'You', target: 1, count: 0,
      targetName: 'Manage the renewal process for at least one of the clients.',
    })]} />)
    expect(screen.getByText('Your target is “Manage the renewal process for at least one of the clients.” It is not done yet.')).toBeTruthy()
  })

  it('a sales targetName with its own digit is never read as a verb phrase', () => {
    render(<WhereEachPersonIs rows={[row({ target: 4, count: 0, targetName: 'Onboard 4 shops in Westlands.' })]} />)
    expect(screen.getByText('Baraka Mwangi has none of their 4 shops in Westlands yet.')).toBeTruthy()
    expect(screen.queryByText(/target is/)).toBeNull()
  })
})

/**
 * REQUEST 85: SOMEONE AN ADMIN DID NOT LET IN. The row's own sentence is enough - no chasing (ask
 * is always null for this reason, so the ask/finding line never appears) and no label (the reason
 * tag is left off entirely, rather than drawing a tag with an empty face).
 */
describe('WhereEachPersonIs: someone an admin did not let in', () => {
  it('shows the row’s own sentence, with no tag and nothing to chase', () => {
    render(<WhereEachPersonIs rows={[row({
      who: 'Faraji Odhiambo',
      reason: 'not let in',
      says: 'Faraji Odhiambo was not let in by Juma Mwangi, so there is nobody to ask.',
      ask: null,
    })]} />)
    expect(screen.getByText('Faraji Odhiambo was not let in by Juma Mwangi, so there is nobody to ask.')).toBeTruthy()
    for (const label of ['Has not answered', 'Stuck and not chasing', 'Behind the pace', 'Nothing checkable', 'Nothing to do', 'Waiting on you']) {
      expect(screen.queryByText(label)).toBeNull()
    }
  })
})

/*
 * WALK OF THE EXISTING CLIENTS' USE CASES (7 October). The finding is the product's own sentence
 * from the record, and drawing it as `<name> said, "…"` put Groundwork's words in the person's mouth
 * ("Neema Achieng said, "Neema Achieng has signed one shop…""). It stands on its own line, in the
 * product's voice, never as a quote.
 */
describe('the finding is never drawn as something the person said', () => {
  it('shows the finding as it is, with no "said" and no quotation marks', () => {
    render(<WhereEachPersonIs rows={[row({ who: 'Neema Achieng', finding: 'Neema Achieng has signed one shop.' })]} />)
    expect(screen.getByText('Neema Achieng has signed one shop.')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/Neema Achieng said/)
    expect(document.body.textContent).not.toMatch(/“Neema Achieng has signed/)
  })
})

/*
 * HAFSAH, 12 OCTOBER (night quality runs 1 and 2): "Stuck and not chasing" sat beside Collins and Amina on the lead's board. No label
 * on a person: the tag says what happened to the work, and the row's own sentence says the rest.
 */
describe('no label beside a person', () => {
  it('Collins and Amina read what happened, never "Stuck and not chasing"', () => {
    render(<WhereEachPersonIs rows={[
      row({ participantId: 'c', who: 'Collins Odhiambo', reason: 'something in the way two weeks', says: 'Collins Odhiambo has had something in the way since Monday 12 October, and so far it has only been asked about. Chasing it, or asking someone else, would move it.' }),
      row({ participantId: 'a', who: 'Amina Otieno', reason: 'something in the way two weeks', says: 'Amina Otieno has had something in the way since Monday 12 October, and so far it has only been asked about. Chasing it, or asking someone else, would move it.' }),
    ]} />)
    expect(document.body.textContent).not.toMatch(/not chasing/i)
    expect(screen.getAllByText('Something in the way for two weeks')).toHaveLength(2)
    expect(screen.getByText(/Collins Odhiambo has had something in the way since Monday 12 October/)).toBeTruthy()
  })
})
