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
  /* Changed 3 November evening (Hafsah: no cards in the conversation; the kind of check-in is part of the one quiet summary):
     "It’s something else" is beside the kind in the summary, offered only during setup and never for an anchor draft. Start over is
     no longer on the setup screen: "Start a check-in" in the sidebar asks to carry on or start a new one, and the save card keeps
     its own Start over. The two tests that pinned the header's Start over are replaced by the one that proves where it went. */
  it('offers It’s something else in the summary, during setup only, never for an anchor draft', () => {
    /* 22 November 2026: the kind is read one way (theKind), and the panel is drawn only during setup. */
    expect(SRC).toContain("onSomethingElse={!isAnchorDraft() && theKind() ? itIsSomethingElse : undefined}")
    expect(SRC).not.toContain("{phase === 'onboarding' && pickedSituation && (")
  })

  /* Changed 22 November 2026: the save card is gone, and its Start over with it. Starting again is "Start a check-in" in the
     sidebar, which asks to carry on or start a new one (the conflict modal's "Start a new one"). */
  it('Start over is not on the setup screen, and starting a new one is still offered', () => {
    expect(SRC).not.toMatch(/'Clear check-in'/)
    expect(SRC).not.toContain('Start over instead')
    expect(SRC).toContain('Start a new one')
  })
})
