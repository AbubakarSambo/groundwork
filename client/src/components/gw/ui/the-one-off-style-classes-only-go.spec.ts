import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { ONE_OFF_STYLE_CLASSES_LEFT, ONE_OFF_SHAPE } from './one-off-style-classes'

/**
 * NO NEW ONE-OFF STYLE CLASS (Hafsah, 1 October 2026). See one-off-style-classes.ts. A screen is
 * built from the shared parts; a class that carries one old value is how it drifts from the
 * prototype. This test only lets the list shrink.
 */
const css = readFileSync(join(__dirname, 'gw-ui.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const defined = [...new Set([...css.matchAll(ONE_OFF_SHAPE)].map((m) => m[1]))].sort()

describe('the one-off style classes only go', () => {
  it('gw-ui.css defines no one-off style class that is not already on the list', () => {
    const added = defined.filter((c) => !ONE_OFF_STYLE_CLASSES_LEFT.includes(c))
    expect(added, 'Build this from a shared part instead of a new one-off class').toEqual([])
  })
  it('and the list holds no class gw-ui.css no longer defines, so it keeps getting shorter', () => {
    const gone = ONE_OFF_STYLE_CLASSES_LEFT.filter((c) => !defined.includes(c))
    expect(gone, 'Take these names off the list').toEqual([])
  })
})
