/**
 * A FIELD NOBODY CAN SEE, ON THE FORM PEOPLE ACTUALLY USE.
 *
 * The API has carried a honeypot since sign-up was written, on two endpoints no client form has
 * ever posted to — so nothing was ever caught, and the live sign-up route had a rate limit and
 * nothing else. Rendering it here is the other half: a honeypot the client does not render is a
 * comment about a defence rather than a defence.
 *
 * Hidden the way a bot does not notice and a person never meets: off-screen rather than
 * `display:none` (which some fillers skip), out of the tab order, and told to screen readers to
 * ignore it. `autoComplete="off"` matters most — a browser that helpfully fills it would lock a
 * real person out of signing up, which is worse than the problem.
 */
import { useState, type ReactElement } from 'react'

export const THE_TRAP_FIELD = '_hp'

export function useTheTrap(): { filled: string; field: ReactElement } {
  const [filled, setFilled] = useState('')
  const field = (
    <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
      <label htmlFor={THE_TRAP_FIELD}>Leave this field empty</label>
      <input
        id={THE_TRAP_FIELD}
        name={THE_TRAP_FIELD}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={filled}
        onChange={(e) => setFilled(e.target.value)}
      />
    </div>
  )
  return { filled, field }
}
