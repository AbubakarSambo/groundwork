import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * RELEASE WALKTHROUGH, 5 OCTOBER: TAP AREAS UNDER 40px AT PHONE WIDTH.
 *
 * Measured live (scratchpad captures, walk-A): "Change this" (TargetsBand.tsx, 19px), "Read"
 * (YourWork.tsx, 19px), "← Every session" (RoundReportPage.tsx, 19px), "Attach something" /
 * "Attach it" (EachPerson.tsx's `Small`, 17px), "Share with everyone" (WhatYouAreCarryingForward.tsx,
 * 32px), the attach-a-document button (ContextChat.tsx, 34px square), and the switches on People
 * and setup (Toggle, 28px tall). Same technique `.gwui-plain-link` already uses for "Ask" and
 * friends - `min-height`/`inline-flex` where the control's own look does not need to change, an
 * invisible hit-area extension where it does (the toggle's own 48x28 pill, the attach button's own
 * fixed square).
 */
const CSS = readFileSync(join(__dirname, 'gw-ui.css'), 'utf8')

describe('phone tap targets, release walkthrough 5 October', () => {
  /* 21 October: Hafsah's 44px rule covers everything you can tap, at every width, so the floor is 44px and no longer only on a phone. */
  it('.gwui-tap-44 gives any control a 44px floor without changing its own look', () => {
    expect(CSS).toMatch(/\.gwui-tap-44 \{ min-height: 44px; display: inline-flex; align-items: center; \}/)
  })

  it('.gwui-icon-btn is a 44px square at every width', () => {
    expect(CSS).toMatch(/\.gwui-icon-btn \{[^}]*width: 44px; height: 44px/)
    expect(CSS).not.toMatch(/\.gwui-icon-btn \{ width: 40px; height: 40px; \}/)
  })

  it('.gwui-toggle keeps its own 48x28 pill, with an invisible hit area 44px tall at every width', () => {
    expect(CSS).toMatch(/\.gwui-toggle \{[^}]*width: 48px; height: 28px/)
    const TOKENS = readFileSync(join(__dirname, '../../../index.css'), 'utf8')
    expect(TOKENS).toMatch(/\.gwui-toggle::after,[^{]*\{\s*content: ''; position: absolute; left: 0; right: 0; top: 50%; height: max\(100%, 44px\);/)
  })

  it('each flagged control actually takes the new class', () => {
    const read = (p: string) => readFileSync(join(__dirname, '../../../', p), 'utf8')
    expect(read('components/gw/TargetsBand.tsx')).toMatch(/gwui-fs-13 gwui-ink-sub gwui-p-0 gwui-rule-none gwui-tap-44/)
    expect(read('components/gw/EachPerson.tsx')).toMatch(/function Small[\s\S]*?className="gwui-tap-44"/)
    expect(read('pages/report/RoundReportPage.tsx')).toMatch(/className="gwui-tap-44"[\s\S]*?Every session/)
    expect(read('components/gw/checkin/YourWork.tsx')).toMatch(/className="gwui-tap-44" style=\{\{ fontSize: 12\.5[\s\S]*?\}\}>Read<\/Link>/)
    expect(read('components/gw/WhatYouAreCarryingForward.tsx')).toMatch(/className="gwui-tap-44"[\s\S]*?Share with everyone/)
    expect(read('components/gw/ContextChat.tsx')).toMatch(/className="gwui-icon-btn"/)
  })
})
