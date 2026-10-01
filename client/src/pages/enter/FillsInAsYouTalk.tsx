import type { Cadence } from '@/components/gw/when-the-check-ins-land'
import { workingDaysOf } from '@/components/gw/when-the-check-ins-land'
import { HOW_OFTEN } from './TheSetup'
import '@/components/gw/ui/gw-ui.css'

/*
 * THE PANEL THAT FILLS IN AS YOU TALK (U.6, B1): the side of #/new and #/start/chat.
 *
 * Words from docs/prototype/screens/B1-starting-a-check-in/new.txt. It shows only what the setup
 * conversation really holds on this page: the name, the situation it was set up as, the rhythm and
 * the days, the dates once they are set, and the people mentioned or added. Nothing is guessed. A
 * row that is not known yet shows its name with an empty mark and no value.
 *
 * Not here: the prototype's "Change" buttons (the name is changed in the header, and the rest on the
 * save card) and "Add their emails in the chat" (people's addresses are added on the save card, not
 * in the chat). See item 17 of docs/morning-report-ui.md.
 *
 * 4D-4: every inline style moved to named classes on the shared gw-ui.css (gwui-fit-*), the same
 * sheet every other rebuilt part of this page already draws from - not a new one-off page-local
 * sheet copying the old pixel values, which the task's own rule against restyling this way calls
 * out by name. Its own sizes (10px corners, 16px inside) are a deliberate narrower choice for this
 * sidebar rather than the shared Panel's 12px/20-22px, the same kind of "nearest equivalent, not a
 * literal prototype rule" already recorded for other parts in
 * docs/the-parts-against-the-prototype.md. Every size under 13px (several rows were 12.5px) is now
 * 13px, the house style's own floor.
 */

export const FILLS_IN = {
  howMuch: (set: number) => `${set} of 4 set`,
  help: 'Fills in as you talk. You can start without all of it.',
  name: 'A name',
  howOften: 'How often',
  whenItRuns: 'When it runs',
  whoIsIn: 'Who’s in it',
} as const

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = [1, 2, 3, 4, 5]
const theDate = (s: string) => { const d = new Date(`${s}T00:00:00`); return `${d.getDate()} ${MONTHS[d.getMonth()]}` }
const andList = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)

export type WhatSetupKnows = {
  name: string
  /** The situation it was set up as, in the words people read. Empty until there is one. */
  situation: string
  cadence: Cadence
  cadenceChosen: boolean
  workingDays: number[]
  startsOn: string
  endsOn: string
  /** Everyone the conversation heard named. */
  mentioned: string[]
  /** Everyone actually added, as they are shown. */
  added: string[]
}

/** People mentioned in the conversation who are not on the list yet. */
export function notYetAdded(k: Pick<WhatSetupKnows, 'mentioned' | 'added'>): string[] {
  const added = k.added.map((a) => a.toLowerCase())
  return k.mentioned.filter((m) => {
    const first = m.toLowerCase().trim().split(/\s+/)[0]
    return !!first && !added.some((a) => a.includes(first))
  })
}

export function theRows(k: WhatSetupKnows): { label: string; set: boolean; value: string | null }[] {
  const days = workingDaysOf(k.workingDays)
  const weekdays = days.length === 5 && WEEKDAYS.every((d) => days.includes(d))
  const often = k.cadenceChosen ? (HOW_OFTEN.find(([c]) => c === k.cadence)?.[1] ?? null) : null
  const when = k.startsOn && k.endsOn ? `${theDate(k.startsOn)} to ${theDate(k.endsOn)}` : k.startsOn ? `From ${theDate(k.startsOn)}` : null
  const notYet = notYetAdded(k)
  const total = k.added.length + notYet.length
  const who = k.added.length
    ? `${k.added.length} of ${total} added`
    : notYet.length ? `You mentioned ${andList(notYet)}.` : null
  return [
    { label: FILLS_IN.name, set: !!k.name.trim(), value: k.name.trim() || null },
    { label: FILLS_IN.howOften, set: !!often, value: often ? (weekdays && k.cadence !== 'ONE_TIME' ? `${often}, weekdays` : often) : null },
    { label: FILLS_IN.whenItRuns, set: !!when, value: when },
    { label: FILLS_IN.whoIsIn, set: k.added.length > 0 && notYet.length === 0, value: who },
  ]
}

export function FillsInAsYouTalk(k: WhatSetupKnows) {
  const rows = theRows(k)
  const addedNotYet = k.added.length ? notYetAdded(k) : []
  return (
    <aside aria-label={FILLS_IN.help} className="gwui-fit-aside">
      {k.name.trim() && <div className="gwui-fit-name">{k.name.trim()}</div>}
      {k.situation && <div className="gwui-fit-situation">{k.situation}</div>}
      <div className="gwui-fit-count">{FILLS_IN.howMuch(rows.filter((r) => r.set).length)}</div>
      <p className="gwui-fit-help">{FILLS_IN.help}</p>
      <ul className="gwui-fit-list">
        {rows.map((r) => (
          <li key={r.label} className="gwui-fit-row">
            <span aria-hidden="true" className={`gwui-fit-mark ${r.set ? 'gwui-fit-mark-set' : 'gwui-fit-mark-unset'}`}>{r.set ? '✓' : '○'}</span>
            <span>
              <span className="gwui-fit-label">{r.label}</span>
              {r.value && <span className="gwui-fit-value">{r.value}</span>}
              {r.label === FILLS_IN.whoIsIn && k.added.length > 0 && (
                <>
                  {k.added.map((a) => <span key={a} className="gwui-fit-value gwui-fit-value-name">{a}</span>)}
                  {addedNotYet.length > 0 && (
                    <span className="gwui-fit-value gwui-fit-more">
                      {`${addedNotYet.length} more you mentioned: ${andList(addedNotYet)}.`}
                    </span>
                  )}
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  )
}
