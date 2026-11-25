import { createContext, useContext } from 'react'

/**
 * WHETHER A PART IS ON A REBUILT PAGE (the design system, Hafsah, 23 November 2026).
 *
 * A page rebuilt from the twelve layout rules is drawn with `<Page title=...>`, which says so here.
 * Every building block inside it (Section, Panel as the card, EdgeRow as the row, Table, NumberTiles
 * and Stat, Tabs, Empty, Button) then draws itself with its `ds-` classes from blocks.css, which read
 * only styles/tokens.css. Outside a rebuilt page every part draws exactly as it did, so no page that
 * has not been rebuilt moves by a pixel. When the last journey is rebuilt, the old branch in each part
 * goes, and so does this switch.
 */
export const InTheDesignSystem = createContext(false)
export const useTheDesignSystem = () => useContext(InTheDesignSystem)

/** The one meta line under a figure (rule 7): where it comes from, and when. "From Amani's check-in, 21 November." */
export const metaLine = (from: string, on: string) => `From ${from}, ${on}.`
