import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { render, screen } from '@testing-library/react'
import { Stack } from './Stack'

/**
 * STACK'S GAP ALWAYS WINS (Hafsah's first review, U.20 seventh round: pictured live, "Almost in"
 * read with the ticked list touching the line above it - no 18px gap at all).
 *
 * The cause: `.gwui-stack-18 > * + * { margin-top: 18px }` and `.gwui-steps { margin: 0; ... }`
 * have the SAME specificity (one class each), and `.gwui-steps` is written later in the
 * stylesheet, so it won the cascade and cancelled the gap. A Stack wraps things precisely so it
 * can set the space between them - a child's own margin reset must never be able to override
 * that. Fixed by doubling the class in the Stack rules (`.gwui-stack-18.gwui-stack-18`), which
 * raises their specificity above any plain single-class reset.
 */
const CSS = readFileSync(join(__dirname, 'gw-ui.css'), 'utf8')

describe('Stack', () => {
  it('renders its children in one wrapper, class named after the gap', () => {
    render(<Stack gap={18}><p>One</p><p>Two</p></Stack>)
    expect(screen.getByText('One').parentElement).toHaveClass('gwui-stack-18')
  })

  it('sets margin-top between its own direct children, for every gap it supports', () => {
    for (const gap of [10, 12, 18, 19]) {
      expect(CSS).toMatch(new RegExp(`\\.gwui-stack-${gap}[^{]*> \\* \\+ \\* \\{ margin-top: ${gap}px`))
    }
    /* gap={0}: two things with no space at all, e.g. the invitation's heading flush against the
       tinted line under it (Hafsah's re-review, U.20 eighth round). */
    expect(CSS).toMatch(/\.gwui-stack-0[^{]*> \* \+ \* \{ margin-top: 0/)
  })

  it('the gap rule outranks a plain single-class reset written later in the file (the regression)', () => {
    /*
     * The exact shape of the bug: a rule with the same specificity as the Stack's own, appearing
     * LATER in the cascade, must not be able to zero out the gap. Doubling the class
     * (".gwui-stack-18.gwui-stack-18") is one class-selector higher than any single-class rule,
     * so it wins regardless of source order.
     */
    for (const gap of [0, 10, 12, 18, 19]) {
      expect(CSS).toMatch(new RegExp(`\\.gwui-stack-${gap}\\.gwui-stack-${gap} > \\* \\+ \\* \\{ margin-top: ${gap}`))
    }
    /* And the specific collision that was found live: Steps' own margin reset. */
    expect(CSS).toMatch(/\.gwui-steps \{[^}]*margin: 0/)
  })
})
