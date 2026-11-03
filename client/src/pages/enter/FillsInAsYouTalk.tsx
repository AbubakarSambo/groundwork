import type React from 'react'
import type { Cadence } from '@/components/gw/when-the-check-ins-land'
import { workingDaysOf } from '@/components/gw/when-the-check-ins-land'
import { HOW_OFTEN } from './TheSetup'
import { Panel, SubHeading, Note, RowList, Row, Stack, Button } from '@/components/gw/ui'
import { IT_IS_SOMETHING_ELSE } from './ThisSoundsLike'

/*
 * THE PANEL THAT FILLS IN AS YOU TALK (U.6, B1): the side of #/new and #/start/chat.
 *
 * Words from docs/prototype/screens/B1-starting-a-check-in/new.txt. It shows only what the setup
 * conversation really holds on this page: the name, the situation it was set up as, the rhythm and
 * the days, the dates once they are set, and the people mentioned or added. Nothing is guessed. A
 * row that is not known yet shows its name with an empty mark and no value.
 *
 * Not here: the prototype's "Change" buttons (the name is changed in the header, and the rest on the
 * save card). See item 17 of docs/morning-report-ui.md.
 *
 * THE TEAM IS GIVEN IN THE CONVERSATION, AND SHOWN HERE (F5, the approved target journey, stage 3; new.txt). The lead pastes names,
 * emails and phone numbers into the one box she always types in; the page reads them into the team (EntryChatPage owns the lines), and
 * this row shows each person with what is known of them, under "Who’s in it, 4 people". The box itself opens only from "Change", so
 * there is one place to type. When setup is ready, the panel ends with what sending does and one button ("Send 4 invitations").
 *
 * Before F5: THE TEAM WENT IN HERE, WHILE THEY TALK (round 6, the law firm lead, 1 November 2026). The prototype's row "Let Daniel share his
 * side / His email, once you’re ready" (start-chat.txt) takes the person during the conversation. Ours only said "You mentioned ...",
 * so the lead said "let me add my team" eleven times, was told it could not be done yet, and started over three times. The page now
 * hands in its one team box (`team`): the same box, the same kept lines, as the save card, so there is still one way to add people.
 *
 * FOR AN ANCHOR DRAFT ONLY, THIS PANEL DRAWS SEVEN ITEMS INSTEAD (plan piece 3,
 * docs/anchor-scenario-plan.md section 5 row 2; docs/anchor-scenario.md section 7, "Understand the
 * lead's world"). The seven headings there, in Hafsah's own words and order, are what Groundwork is
 * finding out from the lead before anything else: what they're responsible for, who they're trying
 * to move, how that group contributes to the economic engine, what they're seeing today, why that
 * bothers them, what they think the team doesn't understand, and what the team would do differently
 * if it did. Every other situation's panel - the four rows above - is unchanged.
 *
 * The engine does not yet mark a draft as an anchor one, or send these seven fields (piece 4 is
 * blocked on Needs Hafsah 12; see docs/requests-to-engine.md, request 144, which also asks how an
 * anchor draft will be told apart). Until then, `anchorItems` is simply never passed, so this panel
 * draws nothing for it and no existing page changes. Once the engine sends it, only the caller needs
 * to start passing `anchorItems` - this component already knows what to do with it.
 *
 * GROUP 3 DRIFT LIST, PIECE 1 (Hafsah, 1 October 2026): the page-only gwui-fit-* classes (4D-4's own
 * sheet, copying new.jpg's pixel values under a page name) are gone. The box is now the shared
 * `Panel`; the name and its "N of 4 set" tag sit in a `gwui-sentence-row` (the same row other pages
 * already use for a heading beside a trailing badge) with a real `Tag`; the situation and the "Fills
 * in as you talk" sentence are each a `Note`; and the four rows are a `RowList` of `Row`s, each
 * still carrying its own ✓/○ mark. The mark and its label/value keep their own small classes
 * (`gwui-setrow-*`), written up in docs/the-parts-against-the-prototype.md, since no existing part
 * draws a ticked two-line row inside one.
 */

export const FILLS_IN = {
  /* What the panel is, for a screen reader; "Fills in as you talk" is gone from the screen (round 7: "I am typing"). */
  label: 'What is set so far',
  name: 'A name',
  howOften: 'How often',
  whenItRuns: 'When it runs',
  whoIsIn: 'Who’s in it',
  people: (n: number) => (n === 1 ? '1 person' : `${n} people`),
  change: 'Change',
  /* The target journey's line for somebody named with no email yet. */
  noEmailYet: (names: string[], listed: number) => `${listed ? `${names.length} more you mentioned: ${andList(names)}` : `You mentioned ${andList(names)}`}. ${names.length === 1 ? 'Add their email here when you have it.' : 'Add their emails here when you have them.'}`,
  ready: 'Ready to send when you are',
  sends: (n: number, opens: string) => `${n === 1 ? '1 person gets an invitation now' : `${n} people get an invitation now`}. ${opens}`,
  send: (n: number) => (n === 1 ? 'Send 1 invitation' : `Send ${n} invitations`),
  /* The approved journey, stage 5 (Hafsah, 3 November 2026): the invitations stay ready until "Send N invitations" on Today. */
  later: 'Check in on your own first, invite later',
  /* The phone's one line above the answer box (stage 3). */
  /* Hafsah's own form for the phone's one line, 3 November evening: "4 people · Sales team". */
  inOneLine: (n: number, kind: string) => [n ? (n === 1 ? '1 person' : `${n} people`) : null, kind || null].filter(Boolean).join(' · ') || 'What is set so far',
} as const

/**
 * THE SEVEN ITEMS, ANCHOR DRAFT ONLY. One label per heading in docs/anchor-scenario.md section 7,
 * in its order, as a plain sentence. The key is what the engine will send the matching answer under
 * (request 144 asks the engine to confirm or correct these names).
 */
export const ANCHOR_ITEM_LABELS = {
  responsibleFor: 'What you’re responsible for',
  tryingToMove: 'Who you’re trying to move',
  howItContributes: 'How this group helps the organisation keep going',
  seeingToday: 'What you’re seeing today',
  whyItBothersYou: 'Why that bothers you',
  whatTheyDontUnderstand: 'What you think they don’t understand',
  whatTheyWouldDoDifferently: 'What they’d do differently if they understood',
} as const

export type AnchorItemKey = keyof typeof ANCHOR_ITEM_LABELS

/** What the setup conversation has heard for each of the seven items so far, once known. */
export type WhatTheAnchorConversationKnows = Partial<Record<AnchorItemKey, string>>

export function theAnchorRows(k: WhatTheAnchorConversationKnows): { label: string; set: boolean; value: string | null }[] {
  return (Object.keys(ANCHOR_ITEM_LABELS) as AnchorItemKey[]).map((key) => {
    const value = k[key]?.trim() || null
    return { label: ANCHOR_ITEM_LABELS[key], set: !!value, value }
  })
}

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
  /** True when the end is one the lead said or chose, not the situation's usual one (piece 3a). */
  endSaid?: boolean
  /** True when she said it runs until she ends it (piece 3a). */
  runsUntilEnded?: boolean
  /** Everyone the conversation heard named. */
  mentioned: string[]
  /** Everyone actually added, as they are shown. */
  added: string[]
  /**
   * Given only for an anchor draft (request 144 asks the engine how one is marked). When given,
   * the panel draws the seven items of anchor-scenario.md section 7 instead of the four rows below.
   */
  anchorItems?: WhatTheAnchorConversationKnows
  /** What the kind of check-in means, said under its name, and the way to say it is something else. */
  meaning?: string | null
  onSomethingElse?: () => void
  /** The team as the page holds it, one line per person ("Name, email, phone"), from the conversation and the box. */
  people?: string[]
  /** Who was named and has no email yet. */
  noEmailYet?: string[]
  /** The page's one team box, drawn under "Who’s in it" only while the lead is changing the team. */
  team?: React.ReactNode
  /** "Change" under "Who’s in it" opens the box. */
  onChangeTeam?: () => void
  /** When setup is ready: what sending does, and the one button. */
  ready?: { opens: string; onSend: () => void; sending: boolean; why?: string } | null
  /** Once setup is ready, "Change" beside the name, how often and when it runs opens the full setup. */
  onChangeSetup?: () => void
  /** On a phone: one line above the answer box that opens the panel. */
  asOneLine?: boolean
}

/** People mentioned in the conversation who are not on the list yet. */
export function notYetAdded(k: Pick<WhatSetupKnows, 'mentioned' | 'added'>): string[] {
  const added = k.added.map((a) => a.toLowerCase())
  return k.mentioned.filter((m) => {
    /* The lead is never somebody still to add: "Just David and me" read "You mentioned David Mutua and You." (reviewer, 14 October). */
    if (/^(?:you|me|i|myself|yourself)$/i.test(m.trim())) return false
    const first = m.toLowerCase().trim().split(/\s+/)[0]
    return !!first && !added.some((a) => a.includes(first))
  })
}

export function theRows(k: WhatSetupKnows): { label: string; set: boolean; value: string | null }[] {
  const days = workingDaysOf(k.workingDays)
  const weekdays = days.length === 5 && WEEKDAYS.every((d) => days.includes(d))
  const often = k.cadenceChosen ? (HOW_OFTEN.find(([c]) => c === k.cadence)?.[1] ?? null) : null
  /* Setup page, piece 3a: an end she said ("until 30 December") or "when I end it" fills this row
     too, with no start date said; a start said with no end still reads "From". */
  const when = k.runsUntilEnded
    ? (k.startsOn ? `From ${theDate(k.startsOn)}, until you end it` : 'Until you end it')
    : k.startsOn && k.endsOn ? `${theDate(k.startsOn)} to ${theDate(k.endsOn)}`
    : k.endSaid && k.endsOn ? `Until ${theDate(k.endsOn)}`
    : k.startsOn ? `From ${theDate(k.startsOn)}` : null
  const notYet = notYetAdded(k)
  const total = k.added.length + notYet.length
  /* With the team read from the conversation (F5), the row says how many people, and each is listed under it. */
  const who = k.people
    ? (k.people.length ? FILLS_IN.people(k.people.length) : null)
    : k.added.length
    ? `${k.added.length} of ${total} added`
    : notYet.length ? `You mentioned ${andList(notYet)}.` : null
  const whoIsSet = k.people ? k.people.length > 0 && !(k.noEmailYet ?? []).length : k.added.length > 0 && notYet.length === 0
  return [
    { label: FILLS_IN.name, set: !!k.name.trim(), value: k.name.trim() || null },
    { label: FILLS_IN.howOften, set: !!often, value: often ? (weekdays && k.cadence !== 'ONE_TIME' ? `${often}, weekdays` : often) : null },
    { label: FILLS_IN.whenItRuns, set: !!when, value: when },
    { label: FILLS_IN.whoIsIn, set: whoIsSet, value: who },
  ]
}

/**
 * ONE QUIET SUMMARY OF WHAT HAS BEEN UNDERSTOOD SO FAR (Hafsah, 3 November evening: "the team as named, the kind of check-in, filling
 * in as the lead talks, and at the end one button, 'Send N invitations'"). No count of what is set and no ticks: each line is there
 * once the conversation has given it. The kind of check-in is said here, not on a card in the conversation, with "It’s something else"
 * beside it. On a phone it is one line at the top, "2 people · Keep a read on live work", that opens on tap.
 */
export function FillsInAsYouTalk(k: WhatSetupKnows) {
  const isAnchor = !!k.anchorItems
  const rows = isAnchor ? theAnchorRows(k.anchorItems!) : theRows(k)
  /* A line is there once the conversation has given it; who is in it is there too while the box is open or someone still needs an email. */
  const known = rows.filter((r) => r.value || (r.label === FILLS_IN.whoIsIn && (!!k.team || (k.noEmailYet ?? []).length > 0)))
  const fromTheChat = !isAnchor && !!k.people
  const readyToSend = !!k.ready && fromTheChat && k.people!.length > 0
  const addedNotYet = !isAnchor && k.added.length ? notYetAdded(k) : []
  const name = k.name.trim()
  const panel = (
    <aside aria-label={FILLS_IN.label}>
      <Panel>
        <Stack gap={10}>
          {name && <SubHeading>{name}</SubHeading>}
          {k.situation && (
            <div>
              <span className="gwui-setrow-label">{k.situation}</span>
              {k.meaning && <span className="gwui-setrow-value">{k.meaning}</span>}
              {k.onSomethingElse && <button type="button" className="gwui-plain-link" onClick={k.onSomethingElse}>{IT_IS_SOMETHING_ELSE}</button>}
            </div>
          )}
          {/* Once setup has ended, one Change opens the whole setup (the name, how often, when it runs) on the save card. */}
          {fromTheChat && k.onChangeSetup && <button type="button" className="gwui-plain-link" onClick={k.onChangeSetup}>{FILLS_IN.change}</button>}
          {known.length > 0 && (
            <RowList label="What's set so far">
              {known.filter((r) => r.label !== FILLS_IN.name).map((r) => (
                <Row key={r.label} columns="1fr">
                  <span>
                    <span className="gwui-setrow-label">{r.label}</span>
                    {r.value && <span className="gwui-setrow-value">{r.value}</span>}
                    {fromTheChat && r.label === FILLS_IN.whoIsIn && k.people!.map((line) => <span key={line} className="gwui-setrow-value gwui-setrow-value-name">{line}</span>)}
                    {!fromTheChat && !isAnchor && r.label === FILLS_IN.whoIsIn && k.added.map((a) => <span key={a} className="gwui-setrow-value gwui-setrow-value-name">{a}</span>)}
                    {addedNotYet.length > 0 && r.label === FILLS_IN.whoIsIn && (
                      <span className="gwui-setrow-value gwui-setrow-more">{`${addedNotYet.length} more you mentioned: ${andList(addedNotYet)}.`}</span>
                    )}
                    {r.label === FILLS_IN.whoIsIn && fromTheChat && (k.noEmailYet ?? []).length > 0 && <span className="gwui-setrow-value gwui-setrow-more">{FILLS_IN.noEmailYet(k.noEmailYet!, k.people!.length)}</span>}
                    {r.label === FILLS_IN.whoIsIn && (k.team ?? (fromTheChat && k.onChangeTeam && (
                      <button type="button" className="gwui-plain-link" onClick={k.onChangeTeam}>{FILLS_IN.change}</button>
                    )))}
                  </span>
                </Row>
              ))}
            </RowList>
          )}
          {readyToSend && k.ready && <ReadyToSend people={k.people!.length} {...k.ready} />}
        </Stack>
      </Panel>
    </aside>
  )
  if (!k.asOneLine) return panel
  /* Everybody named so far, with an email or still without one. */
  const howMany = k.people ? k.people.length + (k.noEmailYet ?? []).length : k.added.length + notYetAdded(k).length
  return (
    <details className="gwui-ec-panel-line" open={readyToSend || undefined}>
      <summary>{FILLS_IN.inOneLine(howMany, k.situation || name)}</summary>
      {panel}
    </details>
  )
}

export function ReadyToSend({ people, opens, onSend, onLater, sending, why, lines, onChange }: { people: number; opens: string; onSend: () => void; onLater?: () => void; sending: boolean; why?: string; lines?: string[]; onChange?: () => void }) {
  return (
    <section aria-label={FILLS_IN.ready}>
      <Stack gap={6}>
        {lines && lines.length > 0 && (
          <div>
            {lines.map((l) => <span key={l} className="gwui-setrow-value gwui-setrow-value-name">{l}</span>)}
            {onChange && <button type="button" className="gwui-plain-link" onClick={onChange}>{FILLS_IN.change}</button>}
          </div>
        )}
        <Note>{FILLS_IN.sends(people, opens)}</Note>
        <Button kind="primary" wide onClick={onSend} disabled={sending}>
          {sending ? 'Sending…' : FILLS_IN.send(people)}
        </Button>
        {onLater && people > 0 && <button type="button" className="gwui-plain-link" onClick={onLater} disabled={sending}>{FILLS_IN.later}</button>}
        {why && <Note tone="error">{why}</Note>}
      </Stack>
    </section>
  )
}
