import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { END_STATES } from './end-states'

/**
 * MIRROR TRIPWIRE: client end-states must match the server's
 * api/src/modules/resolution/end-states.ts verbatim (values AND labels).
 * The server file is the source of truth - if it changes, this test names
 * exactly which scenario drifted.
 */
const SERVER_FILE = resolve(__dirname, '../../../api/src/modules/resolution/end-states.ts')

function parseServerEndStates(src: string): Record<string, { value: string; label: string }[]> {
  const out: Record<string, { value: string; label: string }[]> = {}
  // Match "  SCENARIO: [ ...entries... ]," blocks
  const blockRe = /^\s{2}([A-Z_]+): \[([\s\S]*?)^\s{2}\],$/gm
  let m: RegExpExecArray | null
  while ((m = blockRe.exec(src))) {
    const [, scenario, body] = m
    const entries: { value: string; label: string }[] = []
    const entryRe = /value: '([^']+)', label: '((?:[^'\\]|\\.)*)'/g
    let e: RegExpExecArray | null
    while ((e = entryRe.exec(body))) {
      entries.push({ value: e[1], label: e[2].replace(/\\'/g, "'") })
    }
    out[scenario] = entries
  }
  return out
}

describe('end-state mirror: client === server, verbatim', () => {
  const server = parseServerEndStates(readFileSync(SERVER_FILE, 'utf8'))

  it('covers every server scenario and no extras', () => {
    expect(Object.keys(END_STATES).sort()).toEqual(Object.keys(server).sort())
  })

  it('every scenario has identical values and labels, in order', () => {
    for (const [scenario, serverStates] of Object.entries(server)) {
      const clientStates = (END_STATES[scenario] ?? []).map(o => ({ value: o.value, label: o.label }))
      expect(clientStates, `scenario ${scenario}`).toEqual(serverStates)
    }
  })

  it('sanity: the parse found the real file, not an empty match', () => {
    expect(Object.keys(server).length).toBeGreaterThanOrEqual(16)
    expect(server.NEW_HIRE?.map(o => o.label)).toContain('Keep the hire')
  })
})
