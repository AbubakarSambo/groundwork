import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

/**
 * A QUESTION ALREADY ANSWERED IS NOT ASKED AGAIN.
 *
 * OBSERVED LIVE. The onboarding model asks, before anything else, whether you are part of the
 * situation or setting it up for other people - deliberately first, because it decides what every
 * word after it IS: a party's words are their own account, a non-party's are context about other
 * people, and the product treats those completely differently. It extracts the answer into a typed
 * field, `yourRole`.
 *
 * The endpoint returned that field. The client's type did not declare it and no code read it. So
 * after somebody typed "I am part of it", the fork asked whether they were part of it, with buttons.
 *
 * THE SHAPE, AGAIN. Two places that must agree, each defensible alone, nothing reconciling them. The
 * model's question is right to come first. The fork's wording is right too - it was chosen because
 * "this is my situation" against "I'm setting this up for my team" made an HR person setting up a
 * record about a new hire choose between two descriptions that both fit. Neither was wrong. Nothing
 * carried the answer from one to the other.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const strip = (t: string) =>
  t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const PAGE = strip(readFileSync(path.join(__dirname, 'EntryChatPage.tsx'), 'utf8'))
const API = strip(readFileSync(path.join(__dirname, '../../api/entry.ts'), 'utf8'))

describe('a question already answered is not asked again', () => {
  it('the client can see the role the model already extracted', () => {
    expect(API).toContain('yourRole')
  })

  it('and actually reads it, rather than declaring it and dropping it', () => {
    expect(PAGE).toContain('res.extracted.yourRole')
    expect(PAGE).toContain('setYourRole')
  })

  it('no longer jumps a non-party to a question that has been removed', () => {
    /*
     * IT USED TO, AND THAT WAS RIGHT WHILE THE QUESTION EXISTED. There were two non-party answers,
     * both handed the check-in to a lead, and "who runs the first check-in?" was a new question -
     * so advancing to it was not skipping anything. The hand-off is gone on her call, there is one
     * non-party answer left, and it needs no follow-up question at all: they write the context and
     * other people check in against it.
     */
    expect(PAGE).not.toMatch(/yourRole !== 'a_party'\)\s*setFlowPath/)
    expect(PAGE).not.toContain('Who runs the first check-in?')
  })

  /**
   * The party case is NOT auto-advanced on purpose: the click starts the check-in, and somebody
   * deserves to know that before it happens. What changes is that it confirms instead of re-asking.
   */
  it('confirms what the party said instead of asking them again', () => {
    expect(PAGE).toContain('You said you are one of the people involved.')
  })

  /**
   * An extraction is a reading of what somebody said, not a fact about them. Removing the way back
   * would trade a repeated question for a trapped one.
   */
  it('leaves a way to correct a wrong reading', () => {
    /* The wording followed the answer it leads to: not "someone else gives the accounts" and gets
       handed the check-in, but "I do not check in, others do" - which is a mode, not a hand-off. */
    expect(PAGE).toContain('Actually, I do not check in. Others do.')
  })

  /**
   * Undefined is a real state - the model may not have got a clear answer. Then the original question
   * must still be asked, or somebody with no role on file reaches the fork with nothing to click.
   */
  it('still asks outright when the model got no clear answer', () => {
    expect(PAGE).toContain('Who gives the accounts on this?')
  })
})
