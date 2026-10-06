import { describe, it, expect } from 'vitest'
import { SCENARIOS } from './CreateGroundPage'
import { SCENARIO_KEYS, SCENARIO_LABELS, type ScenarioKey } from '@/lib/scenario-catalog'

/**
 * EVERY SITUATION THE PRODUCT SUPPORTS MUST BE PICKABLE, AND MUST BE CALLED ONE THING.
 *
 * The scenario enum, the signed-in picker, and the entry chat were three hand-maintained lists.
 * Counting the cards never caught the defects, because the counts looked plausible: eighteen cards
 * for seventeen situations reads like a rounding error rather than one scenario with two cards and
 * one with none.
 *
 * WHAT THE COUNTS HID. `CRISIS_ALIGNMENT` had no card at all. It existed only in the routing map
 * that resolves a `?scenario=` parameter, so "A big decision" was reachable by clicking through
 * from the marketing site and impossible to choose from inside the product. Nothing failed, because
 * nothing was comparing the enum to the cards - the two lists were each internally consistent.
 *
 * WHY THE LABEL CHECK IS HERE TOO, and not in a separate file. A situation being pickable is worth
 * little if the page calls it something the rest of the product does not. `scenario-catalog.ts`
 * exists precisely to be the one name per situation, and it was imported by nothing - the picker
 * kept "Performance improvement plan" while the catalog said "Someone's work is off track", and the
 * admin page kept a third copy. So both halves of "offered, under one name" are asserted together.
 *
 * The label check EXEMPTS scenarios with more than one card: COHORT_CHECK is deliberately offered
 * twice, as the ongoing read and as onboarding a group at once, and neither card can carry the
 * catalog's single name without lying about the other.
 */
describe('the signed-in situation picker', () => {
  it('offers a card for every situation the product supports', () => {
    const offered = new Set(SCENARIOS.map(c => c.scenario))
    const missing = SCENARIO_KEYS.filter(k => !offered.has(k as ScenarioKey))
    expect(
      missing,
      `these situations exist in the enum and cannot be chosen: ${missing.join(', ')}`,
    ).toEqual([])
  })

  it('never offers a scenario the catalog has never heard of', () => {
    const known = new Set<string>(SCENARIO_KEYS)
    for (const c of SCENARIOS) {
      expect(known.has(c.scenario), `card ${c.cardKey} routes to ${c.scenario}, which is not in the catalog`).toBe(true)
    }
  })

  it('shows the catalog name for every situation, on at least one card', () => {
    /**
     * WHY "AT LEAST ONE" AND NOT "EVERY CARD". COHORT_CHECK is deliberately offered twice - as the
     * ongoing read on a group, and as onboarding several people at once - and the second card
     * cannot carry the catalog's single name without describing the wrong thing.
     *
     * THE FIRST VERSION OF THIS EXEMPTED ANY SCENARIO WITH TWO CARDS, WHICH WAS TOO WEAK, and
     * driving the real picker in a browser is what showed it: seventeen of eighteen catalog names
     * were on the page, and the missing one was COHORT_CHECK's. The exemption had let its catalog
     * name appear on no surface at all, so the catalog was naming a situation nothing showed - the
     * exact drift this file exists to prevent, passing its own test.
     *
     * So a scenario may have extra cards with their own wording; what it may not do is fail to
     * show its catalog name anywhere.
     */
    for (const key of SCENARIO_KEYS) {
      const cards = SCENARIOS.filter(c => c.scenario === key)
      if (cards.length === 0) continue // covered by the first test, with a better message
      const expected = SCENARIO_LABELS[key as ScenarioKey]
      expect(
        cards.some(c => c.label === expected),
        `no card shows the catalog name for ${key}: it says "${expected}" and the picker offers ${cards.map(c => `"${c.label}"`).join(', ')}`,
      ).toBe(true)
    }
  })

  it('keeps the word performance out of the picker', () => {
    /**
     * Already decided for participant-facing strings, and quietly broken here: the card for
     * PIP read "Performance improvement plan". The person it is about is invited into it.
     */
    for (const c of SCENARIOS) {
      expect(/performance/i.test(c.label), `card ${c.cardKey} label says "performance"`).toBe(false)
    }
  })
})

/**
 * A CHECK-IN IS A RUN AGAINST AN OBJECTIVE, AND THE CARDS HAVE TO SAY SO.
 *
 * Every card once described the same thing in different words: everyone answers separately, and a
 * report shows where the accounts match. That is true of all eighteen situations, which is exactly
 * why it cannot be what a card says - it describes a pulse check, and the product has one of those
 * on purpose. If every card reads as a rhythm, the one that IS a rhythm has nothing to distinguish
 * it, and a lead who reaches for it gets no objective and nothing to measure work against.
 *
 * What actually separates these situations is the two-part arc the engine already runs: an
 * objective agreed and pinned at the start, then a run of check-ins over the scenario's own
 * timeline (14 days for ACUTE_SHOCK, 365 for NEW_ADVISOR) testing what is being done against it.
 *
 * So a description must name the RUN and the thing being run against. There is ONE exception:
 * DESCRIBE_OWN, because the situation is not known yet, which is that scenario's whole reason for
 * existing.
 *
 * PULSE_CHECK IS THE SECOND EXEMPTION, AND THE REASON IS ITS PROMPT PACK, NOT ITS BOARD.
 *
 * This exemption was removed once and had to be put back. The argument for removing it was that the
 * RECURRING board renders an `objectives` section, so the pulse "must" have a target. That is
 * reading the interview off a section list. PULSE_CHECK_PACK says the opposite in its own words: "a
 * lightweight recurring check-in. No setup required", asking one thing going well, one thing stuck,
 * and what changed, and stating "this is a signal, not a deep account". It never asks for a target
 * and never tests work against one. The board section is somewhere a lead MAY record a target; it
 * is not something the conversation establishes.
 *
 * So the exemption stands, and it is anchored to the pack. If the pack ever starts asking for a
 * target, remove PULSE_CHECK from this list and the card will be forced to say so.
 */
const NO_OBJECTIVE_BY_DESIGN = ['DESCRIBE_OWN', 'PULSE_CHECK', 'SNAPSHOT', 'DISCOVERY']

/**
 * THE ONE CARD THAT IS ALLOWED TO DESCRIBE A SINGLE REPORT.
 *
 * Every other situation is an objective agreed at the start and a run of check-ins against it, and
 * the rule below exists because all twenty cards once described the same flat "everyone answers, here
 * is the report" - which is a pulse check whatever the card is called.
 *
 * SNAPSHOT is that shape on purpose: one round, no target, no second session. So it is exempt from
 * naming a run, and the exemption is narrow and named rather than a pattern loosened until it fits.
 * If a second situation ever appears here, that is the signal the flattening is coming back.
 */
/* And the discovery session, which asks a room what they know once: the direction comes from
   reading the accounts against each other, not from asking anybody a second time. */
const SINGLE_ROUND_BY_DESIGN = ['SNAPSHOT', 'DISCOVERY']

describe('every card describes a run against an objective', () => {
  it('names the run, not a single report', () => {
    /*
     * IT SAYS THE RUN, IN WHATEVER WORDS THE CARD USES FOR IT. This tested for the literal word
     * "check-in", which is the product's name for the thing rather than the only honest way to say
     * it recurs. TEAM_UPDATES is written deliberately in the lead's language - "it comes back every
     * week, or however often you pick" - because its whole pitch is one question rather than a
     * system, and a card that has to say "check-in" to pass a test is a test choosing the copy.
     *
     * What the rule is actually for is unchanged: a card must not read as a single comparison when
     * the situation behind it runs. Saying so in plain words counts.
     */
    const SAYS_IT_RUNS = /check-in|every (week|two weeks|day|month)|however often|each (week|period)|over time|period after period/i
    for (const c of SCENARIOS) {
      if (SINGLE_ROUND_BY_DESIGN.includes(c.cardKey)) continue
      expect(
        SAYS_IT_RUNS.test(c.desc),
        `card ${c.cardKey} never says it runs, so it reads as one comparison rather than a run: "${c.desc}"`,
      ).toBe(true)
    }
  })

  it('names what the work is being tested against', () => {
    // The verbs by which a card states there is a standard: something agreed, set, pinned,
    // committed to, or written down at the start.
    // "decided" belongs here: on CRISIS_ALIGNMENT the bar IS the decision, and the check-ins after
    // it test whether what people are doing matches what was actually decided. Same concept as an
    // objective, different word, and the first version of this regex rejected it.
    /* "writes down" belongs here for the same reason as "decided": the comment above already says
       a standard is something "written down at the start", and the copy pass moved several cards
       from "Agree what is outstanding" to the plainer "Both sides write down what is outstanding".
       Same claim, shorter sentence, and the first version of this regex rejected it. */
    const SETS_A_BAR = /\b(agree[ds]?|sets? (out|down)|write[s]? down|written down|pin(s|ned)? down|commits? to|expectations|objectives?|standard|target|decided|turns on)\b/i
    for (const c of SCENARIOS) {
      if (NO_OBJECTIVE_BY_DESIGN.includes(c.cardKey)) continue
      expect(
        SETS_A_BAR.test(c.desc),
        `card ${c.cardKey} never says what the work is measured against: "${c.desc}"`,
      ).toBe(true)
    }
  })

  it('and the pulse card says it has no target, and sends you elsewhere if you have one', () => {
    /**
     * Both halves matter. Saying it has no target is what stops a lead expecting a measured read
     * from a pack that gives a temperature read. Sending them elsewhere is what stops this becoming
     * the default pick for situations that deserve an objective - which is the failure mode where
     * every situation quietly turns into a pulse check.
     */
    const pulse = SCENARIOS.find(c => c.cardKey === 'PULSE_CHECK')!
    expect(pulse.desc).toMatch(/no target|no objective/i)
    /* The wording moved from "pick that situation instead" to "pick one of the others" in the
       plain-language pass. What the test is about is that it sends you somewhere else at all. */
    expect(pulse.desc).toMatch(/pick (that situation instead|one of the others)/i)
  })
})

/** 21 Sep 2026: the Setup card's scenario select listed nine situations, so a discovery check-in read "New hire". */
describe('the Setup card offers every situation', () => {
  /*
   * REPOINTED (People and setup rebuild, 29 Sept), THEN UPDATED (U.4 review, item 10, 30 Sept):
   * "What it is" (name and situation) moved from GroundAdminPage.tsx's settings tab to
   * CheckInPeopleAndSetup.tsx, unchanged at first - still not in the prototype, kept as its own row.
   *
   * The review then found the "Change" control on Situation never actually saved: the update route
   * takes no `scenario` field, so pressing it and saving said "Updated" and changed nothing. There
   * is no select to read from the catalogue any more - Situation is a plain row until the server
   * can take the change (docs/requests-to-engine.md) - so this now checks the row still reads its
   * label from the one catalogue instead of a list of its own, which is the drift this file exists
   * to catch.
   */
  it('reads its label from the catalogue, not a list of its own', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, 'CheckInPeopleAndSetup.tsx'), 'utf8');
    const i = src.indexOf('label="Situation"');
    const around = src.slice(Math.max(0, i - 200), i + 400);
    expect(around).toMatch(/SCENARIO_LABELS\[ground\.scenario/);
    expect(around).not.toMatch(/\['NEW_HIRE', 'New hire'\]/);
    expect(src).not.toMatch(/Save situation/);
  });
});
