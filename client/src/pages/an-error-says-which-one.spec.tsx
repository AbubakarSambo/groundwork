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
    expect(board).toContain('whyYouCannotSeeThis(whatWentWrong(error))')
    expect(board).toMatch(/\{why\.canRetry && <button onClick=\{\(\) => refetch\(\)\}/)
    expect(board).not.toContain('You may not be a party to this check-in, or it may no longer exist.')
  })
  it('the session report tells a 404 from a 403', () => {
    const page = read('report/SessionReportPage.tsx')
    expect(page).toContain("'This session is no longer here'")
    expect(page).not.toMatch(/status === 403 \|\| \(error as any\)\?\.response\?\.status === 404\s*\?\s*'This session is not yours to open'/)
  })
  it('the probe says the sentence it extracted', () => {
    expect(read('grounds/GroundParticipantPage.tsx')).toMatch(/onError: \(e: any\) => toast\.error\(e\?\.message \?\? 'Could not start session\. Try again\.'\)/)
  })
  it('the invite and join pages keep a failure on the page', () => {
    const invite = read('invite/InvitePage.tsx')
    expect(invite).toMatch(/\{failed && <div className="gw-er" role="alert"/)
    const join = read('join/JoinPage.tsx')
    expect(join).toMatch(/\{failure && <div className="gw-er" role="alert">\{failure\}<\/div>\}/)
    expect(join).not.toContain('toast.error(')
  })
  it('the join-confirm page puts the server\'s sentence where the generic one was', () => {
    const confirm = read('join/JoinConfirmPage.tsx')
    expect(confirm).toContain('<LinkProblem kind="join" detail={problem} />')
    expect(confirm).not.toMatch(/<LinkProblem kind="join" \/>\s*<div/)
  })
})
