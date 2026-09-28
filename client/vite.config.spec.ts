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

/**
 * THE PROXY MUST REACH THE API ON THE SAME ADDRESS THE API ACTUALLY BINDS. The API binds
 * '127.0.0.1' in development (api/src/main.ts, the same review). The proxy's default target used
 * to say 'localhost', which Node can resolve to '::1' first - nothing is listening there - so the
 * two could miss each other. Fixed by naming '127.0.0.1' directly.
 */
describe('the dev proxy targets the address the API actually binds', () => {
  it('defaults to 127.0.0.1, not localhost', () => {
    const proxy = CONFIG.slice(CONFIG.indexOf('proxy: {'))
    expect(proxy).toMatch(/target: process\.env\.VITE_PROXY_TARGET \?\? 'http:\/\/127\.0\.0\.1:3000'/)
    expect(proxy).not.toMatch(/\?\? 'http:\/\/localhost:3000'/)
  })
})
