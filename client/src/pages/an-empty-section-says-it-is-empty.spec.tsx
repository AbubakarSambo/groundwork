import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

/** A heading above an empty box reads as the product having lost the answers. Either a sentence, or no heading - never a heading alone. And one status in a header, not three. */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
const read = (rel: string) => strip(readFileSync(path.join(__dirname, rel), 'utf8'))

describe('empty sections', () => {
  it('the session report says the report is still being written instead of showing an empty box', () => {
    /* Batch 2, group 5: SessionReportPage.tsx is gone; your own report is drawn in My work (MyWorkPage.tsx). */
    expect(read('grounds/MyWorkPage.tsx')).toContain('session.says')
  })
  it('the keys list says when there are none, as the deliveries list beside it does', () => {
    /* UPDATED (30 September, the shared-parts rebuild): "Issue" became "Create", the button's own
       word (tools.txt: "Create a key") - the empty line now agrees with the button beside it.
       UPDATED AGAIN (group 1's third review): the semicolon join became a full sentence,
       "it is shown once" became "it is shown only once". */
    expect(read('org/IntegrationsPage.tsx')).toContain('No keys yet. Create one above for the system you are connecting. It is shown only once.')
  })
  /* The "About this check-in" card lived in GroundChat.tsx, deleted on 15 November 2026 because nothing drew it, so its gating test goes with it. */
})

describe('one status, not three', () => {
  /**
   * U.10 PICTURE-CHECK ROUND 7, ITEM 3: THE "2 agreed, nothing still open" CORNER IS GONE, AND
   * THE "No report yet" FALLBACK BESIDE IT WENT WITH IT.
   *
   * Hafsah's instruction was explicit: drop the alignment-read corner (a clipped fragment with no
   * subject or verb) rather than try to make it a true sentence this pass cannot verify. That
   * corner and its "No report yet" fallback were one conditional block - `{tab !== 'report' &&
   * (alignRead ? ... : (reportState === 'no report yet' && attention.kind === 'none') ? "No report
   * yet" : null)}` - so removing the corner removed the fallback with it. The rule this test
   * protected (one status, not three fighting for the same corner) still holds: there is no corner
   * at all now, so nothing there can contradict anything.
   */
  /* Changed in batch 2, group 5 (item 42): the Check-in tab's own attention line ("Your turn.") went with the page in between; the
     sidebar row still reads railAttention. The corner that held "No report yet" stays gone. */
  it('the corner that used to hold "No report yet" is gone entirely, not replaced with a second copy of the fight', () => {
    const admin = read('grounds/GroundAdminPage.tsx')
    expect(admin).not.toContain('railAttention(')
    expect(admin).not.toMatch(/<div[^>]*>No report yet<\/div>/)
    expect(admin).not.toContain('alignRead')
  })
})
