import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import { whyYouCannotSeeThis } from './report/why-you-cannot-see-this'

/**
 * AN ERROR SAYS WHICH ONE. Several causes collapsed into one sentence, or into a toast that vanished:
 * a transient 500 evicted a reader from their own board with a permission-flavoured accusation; the
 * session report called a 404 "not yours"; the probe extracted the server's sentence and threw it away.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const read = (rel: string) => strip(readFileSync(path.join(__dirname, rel), 'utf8'))

describe('the shared rule', () => {
  it('a 500 can be retried and a 403 cannot, and the two say different things', () => {
    const five = whyYouCannotSeeThis({ status: 500 })
    const three = whyYouCannotSeeThis({ status: 403 })
    expect(five.canRetry).toBe(true)
    expect(three.canRetry).toBe(false)
    expect(five.say).not.toBe(three.say)
  })
})

describe('the screens', () => {
  it('the board asks the rule and offers Try again where it can', () => {
    const board = read('board/BoardPage.tsx')
    /* U.20: the call is split in two so a 404 can show the prototype's gone check-in first; the
       board still asks the same rule for every other failure. */
    expect(board).toContain('const what = whatWentWrong(error)')
    expect(board).toContain('const why = whyYouCannotSeeThis(what)')
    /* U.10 (d): the board's own <button> is now the shared Button (UIButton), rebuilt from the
       parts - the offer itself ("Try again", only when `why.canRetry`) is unchanged. */
    expect(board).toMatch(/\{why\.canRetry && <UIButton kind="primary" onClick=\{\(\) => refetch\(\)\}/)
    expect(board).not.toContain('You may not be a party to this check-in, or it may no longer exist.')
  })
  it('the session report tells a 404 from a 403', () => {
    const page = read('report/SessionReportPage.tsx')
    expect(page).toContain("'This session is no longer here'")
    expect(page).not.toMatch(/status === 403 \|\| \(error as any\)\?\.response\?\.status === 404\s*\?\s*'This session is not yours to open'/)
  })
  it('the probe says the sentence it extracted, on the page, not in a toast', () => {
    /*
     * REVIEW ROUND 3, ITEM 2: THE PROBE MOVED to the shared useOpenSession.ts hook, so
     * GroundAdminPage.tsx could open a session the same way - missed updating this test at the
     * time, caught doing the "Your work" rebuild's full-suite pass.
     *
     * B-211 (said why in the commit): this used to also check for an `onError` toast here. That
     * toast repeated the very sentence `openError` already puts on the page, in a form that
     * vanishes on its own - on GroundParticipantPage.tsx it sat over "This is your session 3 of
     * 12" while it lasted. The toast is gone; the hook still extracts the server's own sentence,
     * now only into `openError`, which both pages already render with a working "Try again".
     *
     * B-211 (REVIEW 4, said why in that commit): the probe itself is no longer a `useMutation` -
     * its subscription to the result was torn down and rebuilt by React's development-mode double
     * effect run, which could unsubscribe it from a request still in flight (checked live: one
     * real open, one real 503, and the page still read "Opening…" with the answer sitting unread
     * in the mutation cache). `openError` now comes from plain `useState` instead, which has no
     * subscription to lose - this test's own pin on the source moves with it.
     */
    const hook = read('../hooks/useOpenSession.ts')
    expect(hook).not.toContain('toast.error(e?.message')
    expect(hook).toMatch(/const openError = probeStatus === 'error'/)
    expect(hook).toContain("?? 'Could not start your check-in. Try again.'")
  })
  it('the invite and join pages keep a failure on the page', () => {
    /* U.20 sixth round (Hafsah's first review): the invite page's failure moved from the old
       gw-er class to the shared Note tone="error" - still kept on the page, still role="alert"
       (NoteEmpty.tsx), just from the parts' stylesheet rather than an old class. */
    const invite = read('invite/InvitePage.tsx')
    expect(invite).toMatch(/\{failed && <Note tone="error">\{failed\}<\/Note>\}/)
    expect(invite).not.toContain('gw-er')
    /* Group 3, piece 1: the join page is rebuilt the same way now, so its failure moved to the same
       shared Note tone="error" the invite page already uses - still kept on the page, still an
       alert, no longer the old gw-er class. */
    const join = read('join/JoinPage.tsx')
    expect(join).toMatch(/\{failure && <Note tone="error">\{failure\}<\/Note>\}/)
    expect(join).not.toContain('gw-er')
    expect(join).not.toContain('toast.error(')
  })
  it('the join-confirm page puts the server\'s sentence where the generic one was', () => {
    const confirm = read('join/JoinConfirmPage.tsx')
    expect(confirm).toContain('<LinkProblem kind="join" detail={problem} />')
    expect(confirm).not.toMatch(/<LinkProblem kind="join" \/>\s*<div/)
  })
})
