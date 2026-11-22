import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

/**
 * ONE PRESS IS ONE CALL. A double press on the anonymous save fired two drafts and two emails; Enter in
 * the confirm field was not guarded while the button was; five setup writes bypassed useMutation and
 * were disabled only by value equality; the upload sheet closed before the upload had landed.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const read = (rel: string) => strip(readFileSync(path.join(__dirname, rel), 'utf8'))

describe('guarded submits', () => {
  it('the anonymous save has an in-flight flag, and Enter goes through the same form', () => {
    const entry = read('enter/EntryChatPage.tsx')
    expect(entry).toMatch(/async function handleSave\(\) \{\s*if \(saving\) return\s*setSaving\(true\)/)
    /* 4d-3: the save card's own button is a plain sentence now, not an arrow (CLAUDE.md's wording
       rule - "no pieces joined with... arrows"), and the shared Button part reads its own
       disabled/pending state, so the guard only needs the label itself. */
    /* 22 November 2026: start-chat.txt's "Save it", on the one form somebody signed out has. */
    expect(entry).toContain("{saving ? 'Saving…' : isAnchorDraft() ? thePeopleStepRules.button : KEEP_THIS_CONVERSATION.save}")
  })
  it('choosing a password returns while a save is pending', () => {
    expect(read('auth/ChoosePasswordPage.tsx')).toMatch(/function submit\(\) \{\s*if \(save\.isPending\) return/)
  })
  it('the upload sheet closes on success, not on press', () => {
    const chat = read('chat/ChatPage.tsx')
    expect(chat).toMatch(/onSuccess: async \(doc, \{ ctx \}\) => \{\s*setDocContextMode\(false\)/)
    expect(chat).not.toMatch(/uploadDoc\.mutate\(\{ file: pendingDoc, ctx: docContext \}\)\s*setDocContextMode\(false\)/)
    /* One "Add to check-in" now (the document-context sheet); the paste sheet's own button became
       "Add it" in the U.8 review (plainer, and it never claimed to add a whole "session"). */
    expect(chat.match(/uploadDoc\.isPending \? 'Adding…' : 'Add to check-in'/g)?.length).toBe(1)
    expect(chat).toMatch(/uploadDoc\.isPending \? 'Adding…' : 'Add it'/)
  })
  it('the five setup writes go through useMutation and are disabled while pending', () => {
    /*
     * REPOINTED (People and setup rebuild, 29 Sept): these writes moved out of
     * GroundAdminPage.tsx's `tab === 'settings'` branch into CheckInPeopleAndSetup.tsx, which is
     * what this now reads. "Who can corroborate whom" is a shared `SwitchRow` now (`onChange`, with
     * `disabled` wired to `setWorkTogether.isPending`) rather than the old hand-built radio cards'
     * `onClick={() => { if (!x.isPending) x.mutate(o.v) }}`, so the literal `setWorkTogether.mutate(o.v)`
     * this pinned is gone with that markup - the mutation is still one `useMutation`, still called
     * through `.mutate(`, and still disabled while pending, which is what the test's name proves.
     *
     * COUNT DROPPED FROM 4 TO 3 (U.4 review, item 10, 30 Sept): "Situation" no longer offers
     * `saveSetup.mutate({ scenario: ... })` - the update route takes no `scenario` field, so
     * pressing Change and saving used to say "Updated" and silently change nothing. It is a plain
     * row now, until the server can take it (docs/requests-to-engine.md), which removes one call,
     * not the guard this test is about.
     */
    /*
     * REPOINTED (batch 1, group 10, 4 November 2026): People and setup as pictured is the only People and setup page. Its changes
     * are drafted on the page and written by one "Save changes", which makes each write once (saveSetup takes the name, the
     * timeframe and the start together) and is disabled while any of them is on its way.
     */
    const admin = read('grounds/GroundAdminPage.tsx')
    const page = read('grounds/PeopleAndSetupAsPictured.tsx')
    expect(admin).not.toMatch(/onClick=\{\(\) => groundsApi\.update\(/)
    expect(admin).not.toMatch(/onClick=\{\(\) => groundsApi\.setPeopleWorkTogether\(/)
    expect(page.match(/saveSetup\.mutate\(/g)?.length).toBe(1)
    expect(page).toMatch(/props\.setWorkTogether\.mutate\(/)
    expect(page).toMatch(/const saving = \[props\.saveSetup,[\s\S]*props\.setWorkTogether[\s\S]*\]\.some\(\(m\) => m\.isPending\)/)
    expect(page).toContain('disabled={saving} onClick={save}')
  })
  it('the add-admin form clears only when the promotion happened', () => {
    const dash = read('admin/AdminDashboardPage.tsx')
    expect(dash).toMatch(/await onConfirm\(otp\.trim\(\)\)\s*onSuccess\?\.\(\)\s*onClose\(\)/)
    expect(dash).toContain("onSuccess={() => setEmail('')}")
    expect(dash).not.toContain("onClose={() => { setShowOtp(false); setEmail(''); admins.refetch() }}")
  })
})
