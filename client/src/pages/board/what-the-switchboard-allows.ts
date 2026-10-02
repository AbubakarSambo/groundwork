import { SWITCHBOARD_ROW_FOR_SCENARIO, G2_SECTION_TO_BOARD_SECTION, G2_SECTION_NAMES } from './the-switchboard-g2-table'

/**
 * U.10 RE-REVIEW ITEM A: "PICK A SITUATION AND ITS BOARD SHOWS WHAT'S ON, AND NOTHING THAT'S OFF."
 *
 * That is the switchboard's own words for itself (switchboard.txt). The server's own `sections`
 * gate is per FAMILY (board-families.ts), coarser than G2's per-SITUATION grid - a family covers
 * several situations, and G2 turns different sections on for each one of them. This is the finer
 * layer on top: for the 8 sections G2 names that this pass can map to something the board actually
 * serves (`G2_SECTION_TO_BOARD_SECTION`), a served section only draws when G2 says this situation
 * turns it on or makes it optional, and never when G2 marks it off on purpose.
 *
 * A section G2 does not name at all (`whoOwnsWhat`, `checkInGrid`, `contribution`, `coverage`,
 * `decisions`, `poll`, `cascade`, `hiddenContributors` - none of these are one of G2's 30 names) is
 * not this layer's business, and draws under its own existing rule. Same for a scenario this table
 * has no row for (kept working rather than hiding everything, since G2 simply has not been told
 * about it - `scenario-catalog.ts`'s own note on SNAPSHOT/DISCOVERY/etc. lists which are new).
 */
export function switchboardAllows(scenario: string | null | undefined, boardSection: string): boolean {
  const row = scenario ? SWITCHBOARD_ROW_FOR_SCENARIO[scenario] : undefined
  if (!row) return true
  const g2Name = Object.entries(G2_SECTION_TO_BOARD_SECTION).find(([, v]) => v === boardSection)?.[0]
  if (!g2Name) return true
  if (row.offOnPurpose.includes(g2Name)) return false
  return row.sectionsOn.includes(g2Name) || row.optional.includes(g2Name)
}

/**
 * THE SECTIONS TO DRAW, IN G2'S OWN TABLE ORDER - not "on" sections before "optional" ones.
 *
 * U.10 RE-REVIEW ITEM 2 found this the first time: sorting "on" before "optional" put objectives,
 * dependencies and patterns (OKR_ALIGNMENT's "on" list) ahead of startingState, divergence and
 * quickRead (its "optional" list) regardless of where G2's own 30-row table puts them - the table
 * has Targets, then Starting agreement, then Accounts side by side, then Blockers, then Patterns,
 * then Change since last, with "on" and "optional" sections interleaved throughout it. G2's table
 * position is the one order the prototype's own board actually draws in (board-as-lead.txt); "on"
 * vs "optional" is a different question - whether to show a section at all - not a place in the
 * order. So this sorts by `G2_SECTION_NAMES`'s own index, for whichever of the 7 mapped sections
 * this situation turns on or makes optional AND the board actually has data for. `hasData` is the
 * caller's own `shown.*` read, keyed by the same board section name `G2_SECTION_TO_BOARD_SECTION`
 * uses. Patterns never appear while `patternsAreOn` is false, whatever the situation says.
 */
export function orderedSwitchboardSections(
  scenario: string | null | undefined,
  hasData: Record<string, boolean>,
  patternsAreOn: boolean,
): string[] {
  const row = scenario ? SWITCHBOARD_ROW_FOR_SCENARIO[scenario] : undefined
  if (!row) return []
  const named = new Set([...row.sectionsOn, ...row.optional])
  const out: string[] = []
  for (const g2Name of G2_SECTION_NAMES) {
    if (!named.has(g2Name)) continue
    const boardSection = G2_SECTION_TO_BOARD_SECTION[g2Name]
    if (!boardSection) continue
    if (boardSection === 'patterns' && !patternsAreOn) continue
    if (!hasData[boardSection]) continue
    if (!out.includes(boardSection)) out.push(boardSection)
  }
  /*
   * BOARD REVIEW, SALES PIECE A, ITEM 1: "PATTERNS" MOVES TO THE FRONT OF THIS LIST.
   *
   * No prototype screen shows "What was agreed at the start", "Where people differ", "What people
   * are after" or "The quick read" as their own heading on a board - BoardPage.tsx now folds the
   * other six of these seven sections under one "Everything else from this check-in" disclosure,
   * near the foot of the board. CLAUDE.md protects patterns (and coaching, right after it) from
   * ever being folded, hidden or simplified away, so patterns alone stays in the open, ahead of
   * that fold - for every situation, not only the sales one this review was about. The other six
   * keep their own order among themselves, unchanged.
   */
  if (out.includes('patterns')) return ['patterns', ...out.filter((s) => s !== 'patterns')]
  return out
}

/**
 * WHAT THE SWITCHBOARD CANNOT YET DRAW FOR THIS SITUATION: every "on" or "optional" section G2
 * names that has no served counterpart at all (`G2_SECTION_TO_BOARD_SECTION` is `null` for it). For
 * the morning report and the request to the engine, not for rendering.
 */
export function switchboardSectionsNotServed(scenario: string | null | undefined): string[] {
  const row = scenario ? SWITCHBOARD_ROW_FOR_SCENARIO[scenario] : undefined
  if (!row) return []
  return [...row.sectionsOn, ...row.optional].filter((g2Name) => G2_SECTION_TO_BOARD_SECTION[g2Name] === null)
}

/** Re-exported for BoardPage, which needs only this one function most of the time. */
export const whatTheSwitchboardAllows = switchboardAllows
