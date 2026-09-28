import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * "NOTHING IS EVER EXPOSED BEYOND THIS MAC" (Hafsah). `host: true` told the dev server to listen
 * on every network address this machine has, not only itself, so it answered anyone on the same
 * network while it ran. `host: 'localhost'` is this machine alone. Only the dev `server` block is
 * touched here - `build` and `preview` (what a deploy runs) are unaffected.
 *
 * Comments are stripped first: a guard a comment satisfies is not a guard.
 */
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const CONFIG = strip(readFileSync(join(__dirname, 'vite.config.ts'), 'utf8'))

describe('the dev server only listens on this machine', () => {
  it('sets host to localhost, not true (every address)', () => {
    const server = CONFIG.slice(CONFIG.indexOf('server: {'), CONFIG.indexOf('proxy: {'))
    expect(server).toMatch(/host: 'localhost'/)
    expect(server).not.toMatch(/host: true/)
  })

  it('does not touch build or preview settings', () => {
    expect(CONFIG).not.toMatch(/build:\s*\{[^}]*host/)
    expect(CONFIG).not.toMatch(/preview:\s*\{/)
  })
})
