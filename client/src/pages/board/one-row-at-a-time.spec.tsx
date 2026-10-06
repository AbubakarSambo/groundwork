import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

/**
 * ONE ROW AT A TIME. One shared isPending disabled every objective row, every plan, every session
 * download and every "Send again" while any one was in flight, and the page could not say which. The
 * pattern is GroundAdminPage's: `isPending && variables === thisRow`.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const read = (rel: string) => strip(readFileSync(path.join(__dirname, '..', rel), 'utf8'))

describe('per-row guards', () => {
  it('objective bumps', () => {
    const board = read('board/BoardPage.tsx')
    expect(board.match(/bumpObjective\.isPending && bumpObjective\.variables\?\.objectiveId === o\.id/g)?.length).toBe(3)
    expect(board).not.toMatch(/disabled=\{bumpObjective\.isPending\}/)
  })
  it('the plan being bought says so; the others keep their word', () => {
    const billing = read('billing/BillingPage.tsx')
    expect(billing).toMatch(/createSubscriptionMut\.isPending && createSubscriptionMut\.variables === plan/)
    expect(billing).not.toContain("? '...' :")
  })
  it('feedback says which answer is recording', () => {
    /*
     * MOVED FROM THE DEAD REPORT BODY (1 October 2026). `OutcomeFeedback.tsx` (now on the board) is
     * the direct move of `ReportBody`'s `OutcomeFeedbackSection` - same two buttons, same guard.
     */
    const feedback = read('../components/gw/OutcomeFeedback.tsx')
    expect(feedback).toContain("submit.isPending && submit.variables === true ? 'Saving…' : 'It felt fair'")
    expect(feedback).toContain("submit.isPending && submit.variables === false ? 'Saving…' : 'It did not'")
  })
  it('and the download button says so while it is working', () => {
    /*
     * "DOWNLOADS GO ONE SESSION AT A TIME" DOES NOT TRANSLATE, AND THAT IS THE IMPROVEMENT.
     *
     * `ReportBody` looped over every one of a party's completed sessions and needed
     * `variables === c.id` to say which row's download was in flight. The download now lives on
     * `SessionReportPage.tsx`, which already IS one session - there is no row to disambiguate, so
     * there is exactly one button and `downloadRecord.isPending` alone says whether it is working.
     */
    const session = read('report/SessionReportPage.tsx')
    expect(session).toContain("downloadRecord.isPending ? 'Downloading…' : 'Download your record'")
  })
  it('"Send again" on a delivery row is guarded per row', () => {
    expect(read('org/IntegrationsPage.tsx')).toContain("disabled={replay.isPending && replay.variables === d.id}")
  })
})
