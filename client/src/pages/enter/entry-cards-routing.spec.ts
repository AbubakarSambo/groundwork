import { describe, it, expect } from 'vitest'
import { SCENARIO_LABELS } from '@/lib/scenario-catalog'
import { SITUATION_CARDS } from './EntryChatPage'

/**
 * Entry-card routing tripwire.
 *
 * The /start cards' `message` fields are what actually ROUTE: they are sent to
 * the AI as the person's first turn and drive scenario classification. Labels
 * and details are display-only and may be reframed freely; the messages must
 * never change as part of a copy pass, or routing behaviour silently shifts.
 *
 * These are the exact message strings as they were BEFORE the entry-card voice
 * reframe. If any assertion here fails, a copy change has leaked into routing.
 */
const PINNED_MESSAGES = [
  /* Added with the ROLE_HANDOVER card. Pinned from the day it shipped, like the rest: what this
     file protects is that a display reframe never quietly changes what gets SENT. */
  'Somebody is handing a role over and I want the incoming person to have more than a list of tasks.',
  /* Added with the two contract cards, and pinned from the day they shipped for the same reason.
     These two messages are what tells the classifier which of them somebody means, and "before we
     sign" against "has been running for a while" is the whole of that distinction. */
  'We are about to sign an agreement and I want both sides to say what they think it means before we do.',
  'We have an agreement that has been running for a while and nobody has checked whether what we are doing still matches it.',
  // retained cards - messages byte-identical to the originals (routing untouched)
  'I have a new hire starting and want to make sure we set clear expectations from the beginning.',
  'We are starting a new project and I want to get the team aligned on goals and roles from the beginning.',
  'We have a new working arrangement starting and want to make sure we are set up well.',
  // two new positive cards added in the rebalance
  /*
   * CHANGED ON PURPOSE, WHICH IS THE ONE THING THIS FILE IS SUSPICIOUS OF - so it says why.
   *
   * Not a copy pass. The card's SCOPE changed: "sometimes workplans are attached to goals, and if
   * they exist and who is responsible for what, we need to track it well." A goal with a plan under
   * it is the ordinary case rather than a second situation, so this card covers it - and a card
   * that covers plans with an opening line that only mentions goals gets a conversation about
   * goals, because this sentence IS the first turn.
   *
   * Routing re-checked rather than assumed: it still classifies as OKR_ALIGNMENT, and it avoids the
   * words SOUNDS_LIKE_A_CASCADE looks for, which is why it says "that goes with them" rather than
   * "under those goals". Build a Workplan and Budget keeps its own card and its own message.
   */
  'We are setting shared goals for this period and I want everyone aligned on what matters most, including any workplan that goes with them and who is responsible for which part.',
  /* Added with the second goal card. Its message is the whole reason it is a separate card: the
     scenario is the same engine, and this sentence is what tells the conversation there is
     something above this team rather than a team agreeing among themselves. */
  'We have one overarching goal and separate teams are setting their own goals and targets underneath it. I want to know whether they connect to the main goal and add up together.',
  'We are making a big decision and I want each person\'s honest read before we commit.',
  // retained addressing cards - messages byte-identical
  'A team member is not delivering and I need to address it. I want to make sure I have the full picture before we talk.',
  'A project of mine has drifted from what we originally agreed and I want to realign the team on where things actually stand.',
  'I need to realign with a team member. I think we see the current situation differently and want to get both our accounts on record.',
]

describe('entry cards: display reframed, routing untouched', () => {
  it('message fields are byte-identical to the pre-reframe originals', () => {
    // Deliberately "the pinned eight are present, unchanged, and still first"
    // rather than "these are the only eight". Nine more cards were added when
    // /start was brought up to the same scenario set as /grounds/new, and a
    // strict toEqual would have forced whoever did that to weaken this check -
    // which is the one thing it exists to prevent. Adding a card is fine.
    // Editing one of these strings is not.
    expect(SITUATION_CARDS.slice(0, PINNED_MESSAGES.length).map(c => c.message)).toEqual(PINNED_MESSAGES)
  })

  it('every card routes on a non-empty sentence of its own', () => {
    const messages = SITUATION_CARDS.map(c => c.message)
    for (const m of messages) expect(m.trim().length).toBeGreaterThan(20)
    // No two cards may route on the same sentence, or one of them is dead.
    expect(new Set(messages).size).toBe(messages.length)
  })

  it('labels carry the reframed voice (old confrontational labels gone)', () => {
    const labels = SITUATION_CARDS.map(c => c.label)
    expect(labels).not.toContain('Team member not delivering')
    expect(labels).not.toContain('Cofounder or partner dispute')
    expect(labels).not.toContain('Running a PIP')
    /*
     * FROM THE CATALOGUE. What this line protects is that the card exists at all under a name that
     * is not the mechanism - the three assertions around it are the actual guard, and they still
     * are. Pinning the string meant a rename had to edit the test, and a test edited to match a
     * rename stops being able to object to one.
     */
    expect(labels).toContain(SCENARIO_LABELS.PIP)
    // PIP and cofounder disagreement were dropped as top-level cards in the
    // rebalance (too negative/narrow); they survive only as e.g. examples.
    expect(labels).not.toContain('Running a performance improvement plan')
    expect(labels).not.toContain('Co-founder or partner disagreement')
  })

  it('stays positive-leaning: more to start with than to fix', () => {
    // This used to pin exact counts (5 positive, 3 negative). The intent was
    // the LEAN, not the arithmetic - a picker whose first impression is
    // "something is wrong here" sets the wrong tone for the whole product. The
    // counts moved when /start was brought up to the full scenario set, so the
    // check now holds the intent instead of the numbers.
    /*
     * The group KEYS are the catalog's now - 'starting' and 'off' rather than this page's own
     * 'positive' and 'negative' - because two surfaces were grouping the same nineteen situations
     * under two different sets of headings. The intent this holds is unchanged: what somebody meets
     * first should lean towards starting something well, not towards something being wrong.
     */
    const positive = SITUATION_CARDS.filter(c => c.group === 'starting').length
    const negative = SITUATION_CARDS.filter(c => c.group === 'off').length
    expect(positive).toBeGreaterThan(negative)
    const labels = SITUATION_CARDS.map(c => c.label)
    /* Renamed for the job rather than the mechanism. What this line protects is that a positive
       card is still offered, not what it happens to be called this month. */
    expect(labels).toContain(SCENARIO_LABELS.OKR_ALIGNMENT)
    expect(labels).toContain(SCENARIO_LABELS.CRISIS_ALIGNMENT)
    expect(labels).toContain(SCENARIO_LABELS.REALIGN_TEAM)
  })

  it('the starting cards carry the plain voice (the last three un-reframed strings)', () => {
    const labels = SITUATION_CARDS.map(c => c.label)
    expect(labels).toContain(SCENARIO_LABELS.NEW_PROJECT)
    expect(labels).toContain(SCENARIO_LABELS.NEW_COFOUNDER)
    expect(labels).not.toContain('New project kickoff')
    expect(labels).not.toContain('New working arrangement')
    // Sharpened for a reader who runs a company: "a new way of working
    // together" was the vaguest label on the page. Display only - the
    // routing sentence beneath it is unchanged.
    expect(labels).not.toContain('A new way of working together')
    /*
     * WAS ONE CARD, IS NOW TWO. "A new partner, cofounder, or manager" stood in for NEW_COFOUNDER
     * and NEW_MANAGER at once, while the catalog, the public use-cases page and the situation
     * configs all treated them separately - so somebody arriving from the site having read
     * "A new manager taking over" found no such card. The rule this held is unchanged and now
     * applies to both: the detail names who is arriving, in the words somebody running a company
     * would use, rather than describing a mood.
     */
    /*
     * THE RULE, NOT THE SENTENCE. This matched /sharing the work/ and /taking over/, which were
     * phrases from the details as they were written then. The details are the catalogue's
     * descriptions now, so the phrases are gone and the rule they stood for is not: each names WHO
     * is arriving rather than describing a mood.
     */
    const cofounder = SITUATION_CARDS.find(c => c.label === SCENARIO_LABELS.NEW_COFOUNDER)!
    expect(cofounder.detail).toMatch(/co-?founder|partner/i)
    const manager = SITUATION_CARDS.find(c => c.label === SCENARIO_LABELS.NEW_MANAGER)!
    expect(manager.detail).toMatch(/manager/i)
    for (const c of SITUATION_CARDS) {
      expect(c.label, `label of "${c.label}"`).not.toMatch(/kickoff|working arrangement/i)
      expect(c.detail, `detail of "${c.label}"`).not.toMatch(/reporting line|clear foundation/i)
    }
  })

  it('details are de-jargoned (no "aligned from day one", no "on record")', () => {
    for (const c of SITUATION_CARDS) {
      expect(c.detail, `detail of "${c.label}"`).not.toMatch(/on record/i)
      expect(c.detail, `detail of "${c.label}"`).not.toMatch(/aligned from day one/i)
    }
  })

  it('every card still carries its recognizer sub-examples', () => {
    for (const c of SITUATION_CARDS) {
      expect(c.examples.length, `examples of "${c.label}"`).toBeGreaterThanOrEqual(2)
    }
  })
})
