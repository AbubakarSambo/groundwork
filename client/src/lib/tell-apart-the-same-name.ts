import { whenItWas } from './a-date-reads-the-same-everywhere'

/**
 * WHEN TWO CHECK-INS SHARE ONE NAME, SAY WHAT TELLS THEM APART (walkthrough pass 2, item 1).
 *
 * The sidebar and the "Jump to" panel both list every check-in a reader can see, by its label
 * alone. Nothing stops two of them sharing a label - the walkthrough found "Help a new hire get
 * started, from 27 September" three times over, with nothing to tell a reader which row goes
 * where. This never invents anything: it only reaches for what the list already carries for each
 * check-in (when it started), the same way a person's row already says "In <check-in>" when more
 * than one person shares a name.
 */
export interface HasLabelAndStart {
  id: string
  label: string
  startsAt?: string | null
  createdAt?: string | null
}

/** "started 27 September", or null when there is nothing on record to say it by. */
export function startedOn(g: HasLabelAndStart): string | null {
  const at = g.startsAt ?? g.createdAt
  if (!at) return null
  const said = whenItWas(at, 'dayAndMonthLong')
  return said ? `started ${said}` : null
}

/**
 * A detail string for `g`, only when another check-in in `list` shares its exact label - null
 * otherwise, so a label that is already unique is left alone.
 */
export function whatTellsItApart(list: HasLabelAndStart[], g: HasLabelAndStart): string | null {
  const sameName = list.filter(o => o.label === g.label)
  if (sameName.length < 2) return null
  return startedOn(g)
}
