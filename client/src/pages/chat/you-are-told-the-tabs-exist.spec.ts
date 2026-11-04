import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * A TAB NOBODY IS TOLD ABOUT IS A TAB NOBODY USES.
 *
 * Reported twice, the second time with "I told you to fix this and you havent":
 *
 *   "the chat also didnt ask me who is involve or tell me i can set context or add people later"
 *   "if someone else is checkin in and then others checkin in against it, the place to set context
 *    is not very good and you are not told you can set context on a tab"
 *
 * Both things exist. The check-in has a Context tab and a Setup tab, and neither was mentioned
 * anywhere in the conversation - so somebody sitting in the chat, realising the context is thin or
 * that the people who should be answering are not on it, had no way of knowing either was a click
 * away. The product was complete and silent, which for the person using it is the same as missing.
 *
 * IN THE PRIVACY STRIP, NOT IN THE MODEL'S MOUTH. An instruction to mention the tabs would fire
 * whenever the model judged it relevant, which is exactly the kind of rule this codebase has watched
 * fail before. This is true on every turn of every session, so it is always on screen - and it goes
 * to the tab rather than describing where it is.
 */
const PAGE = readFileSync(join(__dirname, 'ChatPage.tsx'), 'utf8')
const ADMIN = readFileSync(join(__dirname, '..', 'grounds', 'GroundAdminPage.tsx'), 'utf8')

/*
 * CHANGED 3 NOVEMBER EVENING (Hafsah: the check-in screen keeps only the conversation, one box and End session). "Set the context"
 * and "Add people" are no longer links above the box; they are the check-in's own tabs, "Context and resources" and "People and setup",
 * one tap back from the conversation ("← <the check-in's name>"). The tests that read the links on the conversation are replaced by one
 * that proves they are gone; the tab keys are still checked, because the page's tabs still use them.
 */
describe('you are told the tabs exist', () => {
  it('the conversation itself carries no links to the tabs', () => {
    expect(PAGE).not.toContain('Set the context')
    expect(PAGE).not.toMatch(/\?tab=context|\?tab=settings/)
  })

  it('uses tab keys the ground page actually accepts', () => {
    /*
     * THE FAILURE THIS PREVENTS, and it is easy to walk into: the tab a person READS is "Context"
     * and its key is `context`; the tab labelled "Setup" has the key `settings`. A link written
     * from the labels lands on the default tab and silently does nothing, which is worse than no
     * link at all - it teaches somebody the control is broken.
     */
    expect(ADMIN).toMatch(/context: 'docs'/)
    expect(ADMIN).toMatch(/settings: 'settings'/)
  })

})
