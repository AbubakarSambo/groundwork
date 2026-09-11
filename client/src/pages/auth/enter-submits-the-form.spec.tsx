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
    expect(p).toContain('<button className="gw-btn" type="submit" disabled={save.isPending}>')
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
    expect(a).toContain('htmlFor="link-email"')
    expect(a).toContain('htmlFor="forgot-email"')
    expect(read('../join/JoinPage.tsx')).toContain('autoComplete="email"')
  })
  it('the setup composer is a textarea with the check-in composer\'s rule', () => {
    const e = read('../enter/EntryChatPage.tsx')
    expect(e).not.toContain('placeholder="Type your response, or add a document with + Doc"\n                      value={input}\n                      onChange={e => setInput(e.target.value)}\n                      onKeyDown={e => { if (e.key === \'Enter\' && input.trim())')
    expect(e).toMatch(/<textarea\s*placeholder="Type your response, or add a document with \+ Doc"/)
  })
})
