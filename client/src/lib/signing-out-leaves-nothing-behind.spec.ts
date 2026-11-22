import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { takeItAllWithYou, WHAT_STAYS, OURS } from './what-signing-out-takes-with-it'
import { useAuthStore } from '@/stores/auth'

/**
 * SIGNING OUT LEAVES NOTHING BEHIND.
 *
 * Sign-out removed the token and left a live draft bearer token, two payloads carrying colleagues'
 * addresses, an invite token and the magic-link address in storage for the next person on the
 * machine. Two guards: every key the app writes is one the sweep reaches, and signing out actually
 * sweeps.
 */
const SRC = join(__dirname, '..')
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
function every(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...every(p))
    else if (/\.tsx?$/.test(p) && !/\.spec\.tsx?$/.test(p)) out.push(p)
  }
  return out
}

/** Every literal key handed to a storage call, and every constant later handed to one. */
function keysTheAppWrites(): string[] {
  const keys = new Set<string>()
  for (const file of every(SRC)) {
    const code = strip(readFileSync(file, 'utf8'))
    for (const m of code.matchAll(/(?:localStorage|sessionStorage)\.(?:setItem|getItem|removeItem)\(\s*(['"`])([^'"`]+)\1/g)) keys.add(m[2])
    for (const m of code.matchAll(/(?:localStorage|sessionStorage)\.(?:setItem|getItem|removeItem)\(\s*([A-Z_]+)\b/g)) {
      const c = code.match(new RegExp(`const ${m[1]}\\s*=\\s*(['"\`])([^'"\`]+)\\1`))
      if (c) keys.add(c[2])
    }
    if (/(?:localStorage|sessionStorage)\.(?:setItem|getItem|removeItem)\(\s*(?:keyFor|key)\(/.test(code)) {
      const c = code.match(/const (?:keyFor|key) = \([^)]*\) => `([^`]+)`/)
      if (c) keys.add(c[1].replace(/\$\{[^}]+\}/g, 'x'))
    }
  }
  return [...keys].sort()
}

describe('what the app writes to storage', () => {
  it('is all reachable by the sweep: prefixed gw_ or gw-, or the token, or the persisted store', () => {
    const keys = keysTheAppWrites()
    expect(keys.length).toBeGreaterThan(10)
    const unreachable = keys.filter((k) => !OURS.test(k) && k !== 'token' && !k.startsWith('auth-storage'))
    expect(unreachable).toEqual([])
  })

  it('and the keys that stay are each about the browser, not the person', () => {
    expect([...WHAT_STAYS].sort()).toEqual(['gw-design-pass', 'gw-feedback-button-position', 'gw-ob-v2'])
  })
})

/* Enumerated the way the sweep enumerates: by index. Object.keys sees the polyfill, not the keys. */
const keysIn = (storage: Storage) => Array.from({ length: storage.length }, (_, i) => storage.key(i)!).sort()

describe('signing out', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear() })

  it('removes every key of ours from both storages but the ones that stay', () => {
    localStorage.setItem('token', 'jwt')
    localStorage.setItem('gw_draft_token', 'a live bearer credential')
    localStorage.setItem('gw_commit_payload', '{"contributors":["a@b.example"]}')
    localStorage.setItem('gw-new-ground-draft', '{}')
    localStorage.setItem('gw-participant-session', 'invite-token')
    localStorage.setItem('gw_not_invited_g1', '[]')
    localStorage.setItem('gw-feedback-button-position', '{"x":1}')
    localStorage.setItem('gw-ob-v2', '{"step":2}')
    localStorage.setItem('somebody-elses-key', 'left alone')
    sessionStorage.setItem('gw_magic_email', 'a@b.example')
    sessionStorage.setItem('gw-context-chat:g1', '{}')
    sessionStorage.setItem('gw_next', '/grounds/x')

    takeItAllWithYou()

    expect(keysIn(localStorage)).toEqual(['gw-feedback-button-position', 'gw-ob-v2', 'somebody-elses-key'])
    expect(keysIn(sessionStorage)).toEqual([])
  })

  it('is what logout() does', () => {
    localStorage.setItem('gw_draft_token', 'x')
    sessionStorage.setItem('gw_magic_email', 'a@b.example')
    useAuthStore.getState().logout()
    expect(localStorage.getItem('gw_draft_token')).toBeNull()
    expect(sessionStorage.getItem('gw_magic_email')).toBeNull()
  })
})
