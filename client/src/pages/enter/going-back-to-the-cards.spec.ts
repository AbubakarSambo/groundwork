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

/*
 * Changed 3 November 2026 (plan round 32): "It’s something else" no longer puts the transcript back to the opening question. The law
 * firm lead pressed it because the card gave her no way to accept it, and gave her team three times. Now nothing said is lost: the
 * situation is cleared, the conversation asks what it is, and her next words are read for it.
 */
const somethingElse = SRC.slice(SRC.indexOf('function itIsSomethingElse'), SRC.indexOf('const [showEndConfirm'))

describe('saying it is something else', () => {
  it('exists at all', () => {
    expect(somethingElse.length).toBeGreaterThan(60)
  })

  it('keeps the conversation and asks what it is', () => {
    expect(somethingElse).not.toContain('THE_OPENING_QUESTION')
    expect(somethingElse).toContain("setOnboardingHistory((h) => [...h, { role: 'assistant', content: SAY_WHAT_IT_IS }])")
  })

  it('clears what is about the situation', () => {
    expect(somethingElse).toContain('setPickedSituation(null)')
    expect(somethingElse).toContain('classifiedScenario: undefined')
  })

  it('and keeps everything that is not', () => {
    for (const thrownAway of ['clearEntrySession', 'window.location.reload', 'setOrgName', 'setGroundName', 'setContributors', 'defaultSels', 'setTeamText']) {
      expect(somethingElse, `${thrownAway} must not be part of saying it is something else`).not.toContain(thrownAway)
    }
  })

  it('and the opening question is the same string the chat opens with', () => {
    expect(SRC).toContain("const INTRO = anchorConversationOpensDirectly()\n      ? (anchorOpenerQuery.data?.reply || takeTheServedFirstQuestion() || THE_ANCHOR_FIRST_QUESTION)\n      : THE_OPENING_QUESTION")
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
    expect(SRC).toContain('onSomethingElse={itIsSomethingElse}')
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
