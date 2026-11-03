/**
 * PICKING THE WRONG SITUATION WAS EXPENSIVE, AND NOTHING HAD BEEN SET UP YET.
 *
 * The situation cards render only while the transcript is one turn long, so picking one removed
 * them for good. The only route back was "Start over", which calls `clearEntrySession()` and
 * reloads the page: it discards the organisation name, the check-in name, anybody queued to be
 * invited, and the conversation. Somebody who clicked the wrong card, or realised two questions in
 * that this is a contract rather than a new hire, had to choose between the wrong situation and
 * typing everything again.
 *
 * Worse after a RELOAD: `pickedSituation` is component state and does not survive one, while the
 * transcript does — so a reloaded session had the cards hidden (history longer than one turn) and
 * no flag to offer a way back from either.
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'

const SRC = fs
  .readFileSync(path.join(__dirname, 'EntryChatPage.tsx'), 'utf8')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')

const reset = SRC.slice(SRC.indexOf('function pickADifferentSituation'), SRC.indexOf('const [showEndConfirm'))

describe('going back to the cards', () => {
  it('exists at all', () => {
    expect(reset.length).toBeGreaterThan(60)
  })

  it('puts the transcript back to the one opening question, so the cards render again', () => {
    /* The cards' own condition is `onboardingHistory.length === 1`. */
    expect(reset).toContain('setOnboardingHistory([{ role: \'assistant\', content: THE_OPENING_QUESTION }])')
    expect(SRC).toContain('onboardingHistory.length === 1')
  })

  it('and the opening question is the same string the chat opens with', () => {
    /*
     * Lifted out of the effect that owned it, so going back cannot produce a second wording.
     *
     * Updated for fault 1 (the anchor scenario's own first question, no door): `INTRO` is now
     * conditional on `anchorConversationOpensDirectly()` - true only for an anchor arrival with the
     * switch confirmed on - so the ordinary picker still opens on exactly `THE_OPENING_QUESTION`,
     * the one this test is really guarding, and an anchor arrival opens on the engine's served
     * question or the plan's own fallback instead. Still one definition, not two independent ones.
     *
     * Updated again for decision 114: the anchor's opening now comes from `POST /entry/opener`
     * (`anchorOpenerQuery`), the same route any scenario's opening would, with the session-carried
     * question and the plan's own wording kept underneath it only for when that call itself fails.
     */
    expect(SRC).toContain("const INTRO = anchorConversationOpensDirectly()\n      ? (anchorOpenerQuery.data?.reply || takeTheServedFirstQuestion() || THE_ANCHOR_FIRST_QUESTION)\n      : THE_OPENING_QUESTION")
  })

  it('clears what is about the situation', () => {
    expect(reset).toContain('setPickedSituation(null)')
    expect(reset).toContain('setOnboardingSelections(defaultSels)')
    expect(reset).toContain('setOnboardingReady(false)')
  })

  it('and keeps everything that is not', () => {
    /* The whole point: retrying must be cheaper than starting again. */
    for (const thrownAway of ['clearEntrySession', 'window.location.reload', 'setOrgName', 'setGroundName', 'setContributors']) {
      expect(reset, `${thrownAway} must not be part of picking a different situation`).not.toContain(thrownAway)
    }
  })
})

describe('and it is offered whenever the conversation has begun', () => {
  /*
   * UPDATED FOR FAULT 1 (6 October 2026): an anchor draft's situation is not a guess to confirm or
   * reclassify - it is how the person arrived (`HELP_TEAM_UNDERSTAND`) - so "This sounds like ..."
   * and "It's something else" no longer render for one. The condition below gained
   * `&& !isAnchorDraft()`; every other situation still reaches the same banner the same way, which
   * is what these two assertions actually guard.
   */
  /* Changed in F5 (stage 2): "It’s something else" is on the card under setup's first reply (ThisSoundsLike), drawn from the
     transcript itself, so a reload keeps it; still only during setup, and never for an anchor draft. */
  it('asks about the transcript, not about a flag that a reload loses', () => {
    expect(SRC).toContain("if (i !== firstShown || phase !== 'onboarding' || isAnchorDraft()) return bubble")
    expect(SRC).toContain('onSomethingElse={pickADifferentSituation}')
    /* The version that asked `pickedSituation` left a reloaded session with no route back at all. */
    expect(SRC).not.toContain("{phase === 'onboarding' && pickedSituation && (")
  })

  it('and not once a check-in is running, where the situation is what it is about', () => {
    expect(SRC).toContain("phase !== 'onboarding' || isAnchorDraft()) return bubble")
  })

  it('while Start over still exists, for somebody who really does want to bin it', () => {
    expect(SRC).toMatch(/phase === 'checkin' \? 'Clear check-in' : 'Start over'/)
  })

  it('and it survives the session closing, which is when it used to vanish', () => {
    /*
     * REPORTED FROM THE SCREEN: "should be able to start over even when on the chat, clear or end
     * session". The whole bar was hidden on `!closed`, so the moment a check-in ended there was no
     * way out anywhere on the page - on the one screen a stranger meets first, with the browser
     * back button as the only exit. Hiding it was defensible while closing meant nothing but
     * "answers lock"; it is not, now that closing is followed by a save-and-invite step somebody
     * may not want to take.
     */
    expect(SRC).not.toMatch(/\{!closed && \(\s*<div style=\{\{ padding: '6px 20px'/)
    /* And it confirms first once there is a transcript to lose. */
    expect(SRC).toMatch(/phase === 'checkin' \|\| closed \|\| onboardingHistory\.length > 1\) \? setConfirmClear\(true\)/)
  })
})
