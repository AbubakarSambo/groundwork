import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

/** Two fixed overlays with no role, no focus move on open, no Escape and no focus restore. Not a modal library, not a general <Modal>: two overlays, on two screens, each made a dialog. */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.join(__dirname, '..', '..')
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')

describe('the paywall', () => {
  const p = strip(readFileSync(path.join(SRC, 'pages/grounds/GroundParticipantPage.tsx'), 'utf8'))
  it('is a dialog, takes focus, closes on Escape and gives focus back', () => {
    expect(p).toContain('role="dialog" aria-modal="true" aria-label="Your session is complete"')
    expect(p).toMatch(/onKeyDown=\{e => \{ if \(e\.key === 'Escape'\) setShowPaywall\(false\) \}\}/)
    expect(p).toMatch(/<div tabIndex=\{-1\} ref=\{el => el\?\.focus\(\)\}/)
    expect(p).toMatch(/if \(showPaywall\) paywallOpener\.current = document\.activeElement/)
    expect(p).toMatch(/else paywallOpener\.current\?\.focus\?\.\(\)/)
  })
})

describe('the OTP modal', () => {
  const d = strip(readFileSync(path.join(SRC, 'pages/admin/AdminDashboardPage.tsx'), 'utf8'))
  it('is a dialog named for what it gates, focuses its first control, closes on Escape and restores focus on unmount', () => {
    expect(d).toContain('role="dialog" aria-modal="true" aria-label={title}')
    expect(d).toMatch(/onKeyDown=\{e => \{ if \(e\.key === 'Escape' && !loading\) onClose\(\) \}\}/)
    expect(d).toMatch(/first\.current\?\.focus\(\)/)
    expect(d).toMatch(/return \(\) => \{ opener\.current\?\.focus\?\.\(\) \}/)
  })
})
