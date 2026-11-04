import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { theSetupKey, clearEntryHandover } from './entry-handover'
import { clearEntrySession } from '@/pages/enter/EntryChatPage'

/* ONE KEY PER SETUP (U.6 review): the same while a setup is saved and retried, a new one for the next. */
describe('the setup key', () => {
  beforeEach(() => localStorage.clear())
  it('is the same when the same save is retried', () => {
    expect(theSetupKey()).toBe(theSetupKey())
  })
  it('is new once the check-in exists, and after starting over', () => {
    const first = theSetupKey()
    clearEntryHandover()
    const second = theSetupKey()
    expect(second).not.toBe(first)
    clearEntrySession()
    expect(theSetupKey()).not.toBe(second)
  })
  it('goes with the save', () => {
    const src = readFileSync(join(__dirname, '..', 'enter', 'EntryChatPage.tsx'), 'utf8')
    /* The save now takes the team box (d46100679), so the payload builder has a parameter; the key still goes first. */
    expect(src).toMatch(/function buildCommitPayload\([^)]*\) \{\n    return \{\n[^\n]*\n        setupKey: theSetupKey\(\),/)
  })
})
