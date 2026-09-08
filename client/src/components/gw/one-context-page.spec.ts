import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * THE CONTEXT TAB IS ONE FILE, AND THAT IS THE POINT.
 *
 * It was two: assembled inline in GroundAdminPage for the lead, and again inline in
 * GroundParticipantPage for everybody else. Neither was wrong on its own, and nothing reconciled
 * them - which is the exact failure this product exists to end, reproduced in its own source. What
 * it produced was not subtle: documents third for a lead and sixth for a participant, a stray
 * "Context" heading halfway down one of them, and a "say something about this in the chat" button on
 * a page with no chat, pointing at an anchor that was never rendered.
 *
 * Every one of those was invisible to code review and obvious on the rendered page. So the rule is
 * not "keep the two in sync", which is the instruction that failed. It is that there is only one.
 */
const CONTEXT = readFileSync(join(__dirname, 'ContextPage.tsx'), 'utf8')
const PAGES = [
  '../../pages/grounds/GroundAdminPage.tsx',
  '../../pages/grounds/GroundParticipantPage.tsx',
]

describe('there is one context page', () => {
  for (const page of PAGES) {
    const name = page.split('/').pop()
    const src = readFileSync(join(__dirname, page), 'utf8')

    it(`${name} renders it rather than assembling its own`, () => {
      expect(src).toContain('<ContextPage')
    })

    /**
     * The bands themselves. If one of these reappears in a page file, the tab has started being
     * built in two places again and the drift is already back, whatever the order looks like today.
     */
    it(`${name} builds no band of its own`, () => {
      for (const band of ['<ExpectationsPanel', '<ContextStrength', '<ContextChat', '<DeliveredPanel', '<SharedNote']) {
        expect(src).not.toContain(band)
      }
      expect(src).not.toContain('WHAT_YOU_CAN_UPLOAD')
    })
  }

  /**
   * WHAT DIFFERS BY ROLE IS WHO MAY WRITE, NEVER THE ORDER. The moment a page decides its own
   * order again - by passing bands in, or by rendering the component twice with different children -
   * the two views can differ without anybody choosing that.
   */
  it('takes a role, not a layout', () => {
    /*
     * THREE READERS, NOT TWO. This pinned `'lead' | 'party'`, and the view that runs a check-in
     * passed 'lead' for the lead AND for an admin of the organisation - so an admin got the whole
     * of the lead's authoring surface, including the band headed "Only you see this", which holds
     * the lead's private steers. Found walking a second admin of a real organisation.
     */
    expect(CONTEXT).toMatch(/role: 'lead' \| 'admin' \| 'party'/)
    expect(CONTEXT).not.toMatch(/children/)
  })

  /**
   * AND THE TWO QUESTIONS STAY SEPARATE, because their answers differ for exactly one reader.
   * Who RUNS the check-in decides the brief - the shared description of the work, which an admin
   * may rewrite. WHOSE check-in it is decides the private steers, the running log, the standing
   * note and the context conversation: one person's own framing and one person's own private
   * notes. Collapsing them back into one flag is how an admin gets the steers again.
   */
  it('and asks who runs it separately from whose it is', () => {
    expect(CONTEXT).toMatch(/const isLead = role === 'lead' \|\| role === 'admin'/)
    expect(CONTEXT).toMatch(/const isTheLead = role === 'lead'/)
    /* The band that must never widen: the lead's own private steers. */
    expect(CONTEXT).toMatch(/\{isTheLead && privateSteers\.length > 0 && \(/)
  })

  it('and both pages pass one', () => {
    for (const page of PAGES) {
      const src = readFileSync(join(__dirname, page), 'utf8')
      expect(src).toMatch(/<ContextPage[^>]*role=\{/)
    }
  })
})

describe('the way in is on the page it points at', () => {
  /**
   * The dead button. A participant's expectations carried "say something about this in the chat"
   * and their page has no chat - the context chat is the lead's setup conversation - so the button
   * scrolled to an anchor that did not exist and did nothing at all. Offering a route that goes
   * nowhere is worse than offering none, and the sentence under the list already names the real one.
   */
  it('the chat is only pointed at where the chat is rendered', () => {
    const panel = readFileSync(join(__dirname, 'ExpectationsPanel.tsx'), 'utf8')
    expect(panel).toMatch(/hasChat &&[\s\S]{0,400}gw-context-chat/)
  })

  it('and the page only claims to have one when it does', () => {
    // hasChat is true exactly where ContextChat is rendered: the lead, with context on.
    /* `isTheLead`, not `isLead`: the conversation is the lead's own, and an admin reads the page. */
    expect(CONTEXT).toContain('hasChat={isTheLead && contextEnabled}')
    expect(CONTEXT).toMatch(/\{contextEnabled && isTheLead && <ContextChat/)
  })
})
