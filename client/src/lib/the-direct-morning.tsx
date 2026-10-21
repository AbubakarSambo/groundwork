import { createContext, useContext, type ReactNode } from 'react'

/**
 * THE DIRECT MORNING ON THE SCREENS (Hafsah, 20 October 2026; api/src/modules/organisation/the-direct-morning-switch.ts).
 *
 * One switch per organisation, `organizations.direct_morning_on`, off for every organisation until it is set on for one.
 * Every screen a lead or a team member reads is told it as one yes or no, from the payload it already reads:
 *  - `directMorningOn` on `GET /grounds/:id`,
 *  - `directMorning` on the board, My work, the weekly report, You, Today, People and setup, and References and resources.
 *
 * ON, the fixed words on the screen are direct: no explanation of Groundwork, no privacy note, nothing that hedges, and a heading
 * says what it is ("The team's report", "What to do next"). OFF, or not said, every screen reads exactly as it did.
 *
 * WHO CAN SEE WHAT NEVER CHANGES WITH IT. The backend decides that, the same either way. Taking a note about privacy off a screen
 * shows nobody anything new.
 *
 * A page that has the payload says it once with `<TheDirectMorning on={...}>`, and every part inside reads `useTheDirectMorning()`.
 * Nothing said, it reads as off.
 */
const DirectMorning = createContext(false)

export function TheDirectMorning({ on, children }: { on: boolean | null | undefined; children: ReactNode }) {
  return <DirectMorning.Provider value={on === true}>{children}</DirectMorning.Provider>
}

export function useTheDirectMorning(): boolean {
  return useContext(DirectMorning)
}

/** Whether a payload says the direct morning is on: `directMorning` (the screen's own payload) or `directMorningOn` (the ground). */
export function isTheDirectMorningOn(served: unknown): boolean {
  if (!served || typeof served !== 'object') return false
  const s = served as { directMorning?: unknown; directMorningOn?: unknown }
  return s.directMorning === true || s.directMorningOn === true
}
