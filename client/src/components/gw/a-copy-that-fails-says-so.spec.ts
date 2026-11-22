import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import { copy } from './copying-can-fail'

/** `clipboard?.writeText(x).then(...)` threw where copy is unsupported, so the good failure message could never run. */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.join(__dirname, '..', '..')
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('copy()', () => {
  const original = navigator.clipboard
  afterEach(() => { Object.defineProperty(navigator, 'clipboard', { value: original, configurable: true }) })
  it('resolves false where the API is absent, and does not throw', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
    await expect(copy('x')).resolves.toBe(false)
  })
  it('resolves true when the browser copied', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn(async () => undefined) }, configurable: true })
    await expect(copy('x')).resolves.toBe(true)
  })
  it('and no page calls the clipboard directly any more', () => {
    const direct: string[] = []
    for (const rel of ['pages/billing/BillingPage.tsx', 'pages/grounds/GroundAdminPage.tsx', 'pages/enter/EntryChatPage.tsx', 'pages/org/IntegrationsPage.tsx', 'pages/auth/MagicVerifyPage.tsx', 'components/CodeShareCard.tsx']) {
      if (/navigator\.clipboard/.test(strip(readFileSync(path.join(SRC, rel), 'utf8')))) direct.push(rel)
    }
    expect(direct).toEqual([])
  })
})
