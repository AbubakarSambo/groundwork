import { SWITCHBOARD_ROW_FOR_SCENARIO, G2_SECTION_TO_BOARD_SECTION } from './the-switchboard-g2-table'

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
 * THE SECTIONS TO DRAW, IN G2'S OWN ORDER, for whichever of the 8 mapped board sections this
 * situation turns on and the board actually has data for. `hasData` is the caller's own `shown.*`
 * read (already gated on `has()` and non-empty data) for the corresponding board section, keyed by
 * the SAME board section name `G2_SECTION_TO_BOARD_SECTION` uses. Patterns never appear while
 * `patternsAreOn` is false, whatever the situation says - see PATTERNS_ARE_SERVED.
 */
export function orderedSwitchboardSections(
  scenario: string | null | undefined,
  hasData: Record<string, boolean>,
  patternsAreOn: boolean,
): string[] {
  const row = scenario ? SWITCHBOARD_ROW_FOR_SCENARIO[scenario] : undefined
  if (!row) return []
  const boardSectionFor = (g2Name: string) => G2_SECTION_TO_BOARD_SECTION[g2Name]
  const out: string[] = []
  for (const g2Name of [...row.sectionsOn, ...row.optional]) {
    const boardSection = boardSectionFor(g2Name)
    if (!boardSection) continue
    if (boardSection === 'patterns' && !patternsAreOn) continue
    if (!hasData[boardSection]) continue
    if (!out.includes(boardSection)) out.push(boardSection)
  }
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
