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
    expect(entry).toContain("{saving ? 'Saving…' : 'Save my check-in →'}")
  })
  it('choosing a password returns while a save is pending', () => {
    expect(read('auth/ChoosePasswordPage.tsx')).toMatch(/function submit\(\) \{\s*if \(save\.isPending\) return/)
  })
  it('the upload sheet closes on success, not on press', () => {
    const chat = read('chat/ChatPage.tsx')
    expect(chat).toMatch(/onSuccess: async \(doc, \{ ctx \}\) => \{\s*setDocContextMode\(false\)/)
    expect(chat).not.toMatch(/uploadDoc\.mutate\(\{ file: pendingDoc, ctx: docContext \}\)\s*setDocContextMode\(false\)/)
    expect(chat.match(/uploadDoc\.isPending \? 'Adding…' : 'Add to session'/g)?.length).toBe(2)
  })
  it('the five setup writes go through useMutation and are disabled while pending', () => {
    const admin = read('grounds/GroundAdminPage.tsx')
    expect(admin).not.toMatch(/onClick=\{\(\) => groundsApi\.update\(/)
    expect(admin).not.toMatch(/onClick=\{\(\) => groundsApi\.setPeopleWorkTogether\(/)
    expect(admin.match(/saveSetup\.mutate\(/g)?.length).toBe(4)
    expect(admin).toContain('setWorkTogether.mutate(o.v)')
  })
  it('the add-admin form clears only when the promotion happened', () => {
    const dash = read('admin/AdminDashboardPage.tsx')
    expect(dash).toMatch(/await onConfirm\(otp\.trim\(\)\)\s*onSuccess\?\.\(\)\s*onClose\(\)/)
    expect(dash).toContain("onSuccess={() => setEmail('')}")
    expect(dash).not.toContain("onClose={() => { setShowOtp(false); setEmail(''); admins.refetch() }}")
  })
})
