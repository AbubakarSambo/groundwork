import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import { entryRestoreBranch } from './EntryChatPage'

/**
 * A BUTTON THAT SAYS START A CHECK-IN HAS TO START ONE.
 *
 * Pressing it opened somebody's half-finished setup instead of the situation picker, with a message
 * already sent and an answer already back, and nothing on screen saying anything had been brought
 * back. Reported twice: "unless I click go backwards", and then again months later, "I started a
 * check-in and it took me to the page directly instead of the scenario picker".
 *
 * It was fixed the first time, in the right place: `/start?new=1` makes the page ASK rather than
 * silently restore. The fix was real and the button never sent it. The rail in AppShell passed the
 * flag; the three buttons on the check-ins list, which is where somebody actually is when they
 * decide to start one, did not. So the guard existed, worked, and was unreachable from the place it
 * was written for.
 *
 * That is the failure this file exists to stop, so it is pinned at the callers and not at the flag.
 */
describe('starting one means starting one', () => {
  const read = (p: string) => readFileSync(join(__dirname, p), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

  /* Every screen with a deliberate "start a check-in" press. Not the auth callbacks, where a person
     has just arrived and has no saved setup to swallow. */
  const doors = [
    '../grounds/GroundsListPage.tsx',
    '../home/HomePage.tsx',
    '../../components/gw/AppShell.tsx',
  ]

  it.each(doors)('%s opens /start asking for a new one, never bare', (file) => {
    const src = read(file)
    const opens = [...src.matchAll(/(?:navigate\(|to=\{?)[`'"]\/start([^`'"]*)[`'"]/g)].map((m) => m[1])
    expect(opens.length).toBeGreaterThan(0)
    for (const query of opens) expect(query).toContain('new=1')
  })

  it('and the page still restores on a plain reload, which is what the flag is protecting', () => {
    /* No flag, no scenario, a saved setup: this is a refresh mid-setup and the work comes back. */
    expect(entryRestoreBranch({ closed: false }, null)).toBe('restore')
    /* A saved setup plus an incoming situation asks rather than discarding either. */
    expect(entryRestoreBranch({ closed: false }, 'OKR_ALIGNMENT')).toBe('conflict')
    /* Nothing saved: straight to the picker. */
    expect(entryRestoreBranch(null, null)).toBe('fresh')
  })
})
