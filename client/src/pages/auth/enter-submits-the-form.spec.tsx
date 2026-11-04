import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

/** Enter in the first field did nothing on the last screen of sign-up; the poll form was not a form; no field told a password manager what it was. */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
const read = (rel: string) => strip(readFileSync(path.join(__dirname, rel), 'utf8'))

describe('forms behave like forms', () => {
  it('choosing a password is a form with a submit button and no per-field Enter handler', () => {
    const p = read('ChoosePasswordPage.tsx')
    expect(p).toMatch(/<form noValidate onSubmit=\{e => \{ e\.preventDefault\(\); submit\(\) \}\}>/)
    /* U.2: the kit's Button, still a submit button, still disabled while saving. */
    expect(p).toContain('<Button type="submit" wide disabled={save.isPending}>')
    expect(p).not.toMatch(/onKeyDown=\{e => e\.key === 'Enter' && submit\(\)\}/)
    expect(p.match(/autoComplete="new-password"/g)?.length).toBe(2)
  })
  it('the poll is a form, and Cancel asks before discarding what was typed', () => {
    const b = read('../board/BoardPage.tsx')
    expect(b).toMatch(/<form noValidate onSubmit=\{\(e\) => \{ e\.preventDefault\(\); if \(pollQ\.trim\(\) && pollOpts\.trim\(\) && !savePoll\.isPending\) savePoll\.mutate\(\) \}\}/)
    expect(b).toContain('saying="Discard the question and times you typed?"')
  })
  it('every auth field tells the password manager what it is, and every label has its field', () => {
    const a = read('AuthPage.tsx')
    for (const ac of ['autoComplete="email"', 'autoComplete="current-password"']) expect(a).toContain(ac)
    expect(a).not.toMatch(/<label className="gw-label">Email<\/label>/)
    /* The fields are AuthField and PasswordField now (auth-kit.tsx), which always tie the label to
       the box by its id. U.2. */
    expect(a).toContain('id="link-email"')
    expect(a).toContain('id="forgot-email"')
    /* Group 3, piece 1: PasswordField moved out of auth-kit.tsx into the shared
       components/gw/ui/PasswordField.tsx (every sign-in screen that asks for a password now draws
       the same one part), so its own `htmlFor={id}` lives there now; AuthField's is still in
       auth-kit.tsx. One each. */
    expect(read('auth-kit.tsx').match(/htmlFor=\{id\}/g)?.length).toBe(1)
    expect(read('../../components/gw/ui/PasswordField.tsx').match(/htmlFor=\{id\}/g)?.length).toBe(1)
    expect(read('../join/JoinPage.tsx')).toContain('autoComplete="email"')
  })
  it('the setup composer is a textarea with the check-in composer\'s rule', () => {
    /*
     * Group 3, piece 4d-1 moved the onboarding composer onto the shared `Composer` part
     * (components/gw/ui/Composer.tsx), which is the check-in composer's own textarea - so the
     * literal `<textarea>` now lives there, not in EntryChatPage.tsx. What this test protects -
     * Enter sends unless Shift is held, never on every Enter regardless - still has to hold, read
     * off the handler EntryChatPage.tsx passes in and the textarea Composer actually renders.
     */
    const e = read('../enter/EntryChatPage.tsx')
    expect(e).not.toMatch(/onKeyDown=\{e => \{ if \(e\.key === 'Enter' && input\.trim\(\)\)/)
    expect(e).toMatch(/onKeyDown=\{e => \{ if \(e\.key === 'Enter' && !e\.shiftKey\) \{ e\.preventDefault\(\); if \(input\.trim\(\)\) sendOnboarding\(input\) \} \}\}/)
    /* Fault 7 (live walk, 6 October 2026): shortened so it is never clipped at 375px - the "+ Doc"
       button beside it already says how to add a document, so "with + Doc" was redundant too. */
    /* Changed 3 November evening: setup uses the check-in's own box and words (Hafsah: the same layout). */
    expect(e).toContain('placeholder="Type your answer"')
    const composer = read('../../components/gw/ui/Composer.tsx')
    expect(composer).toMatch(/<textarea\s/)
    expect(composer).toContain('placeholder={placeholder}')
  })
})
