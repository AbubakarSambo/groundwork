import { useState } from 'react'
import { whenTheCheckInsLand, type Cadence } from '@/components/gw/when-the-check-ins-land'
import { cadenceLabel } from '@/lib/cadence'
import type { ThePeopleStepRules } from '@/api/anchorShapes'

/*
 * THE SCHEDULE, BEFORE IT IS SAVED (U.6, B1): #/new/setup.
 *
 * Wording from docs/prototype/screens/B1-starting-a-check-in/setup.txt. Every choice here sets
 * something the server really keeps: the start date (`checkInBy`, the ground's startsAt, which is
 * also when the invitations go out), the rhythm, the day it lands on, the days people work, and the
 * end date (`lastCheckInBy`). The prototype's "Opens at" and "Closes at", guests, and "Do you check
 * in too?" are not here: nothing keeps an opening time, guests are not built, and who checks in is
 * already asked in the conversation. See item 17 of docs/morning-report-ui.md.
 */

/**
 * THE PEOPLE STEP'S OWN RULES, FOR AN ANCHOR DRAFT ONLY (plan piece 11; docs/anchor-scenario-plan.md
 * section 5 row 4; docs/answers-from-engine.md, "Request 149 (2 of 6)", `ThePeopleStepRules`).
 *
 * Served now, as `thePeopleStep` on `GET /entry/anchor-start` (api/src/modules/entry/the-anchor-door
 * .ts). This constant is the FALLBACK ONLY, carrying the engine's own words verbatim, used when
 * nothing was served for this draft (an older link, or the call failed) - `EntryChatPage.tsx`'s
 * invite block draws the served `ThePeopleStepRules` carried through the draft's session state when
 * there is one, and falls back to this constant otherwise.
 *
 * `mayAdd` is 19, not 20: the limit is 20 people including the lead (decision 96, item 3), so the
 * lead can add 19 others.
 */
export const ANCHOR_PEOPLE_STEP_RULES: ThePeopleStepRules = {
  limit: 20,
  theLeadCounts: true,
  mayAdd: 19,
  heading: 'Who needs to be part of this?',
  intro: 'Add up to 20 people. They don’t need to report directly to you. They simply need to be part of the work you’re trying to move.',
  contextLabel: 'What do they do / why are they part of this?',
  button: 'Start my Groundwork.',
  limitSentence: 'This one-month Groundwork holds 20 people, and you are one of them, so you can add 19 more.',
}

/**
 * HOW THE SERVED PEOPLE STEP TRAVELS FROM THE LANDING PAGE TO THE ENTRY CHAT.
 *
 * `AnchorLandingPage.tsx` is the one caller of `GET /entry/anchor-start`; its button then opens the
 * ordinary entry chat at `/start?scenario=...`, a fresh page load. `sessionStorage` (not the saved
 * draft itself, which does not exist until the chat has started) is the plain way to carry the
 * served `ThePeopleStepRules` across that one navigation - written here, read once by
 * `EntryChatPage.tsx` on a fresh mount, and folded into the draft's own session state from then on
 * so a reload keeps it.
 */
export const ANCHOR_PEOPLE_STEP_SESSION_KEY = 'gw-anchor-people-step'

export function rememberTheServedPeopleStep(rules: ThePeopleStepRules | undefined) {
  if (!rules) return
  try { sessionStorage.setItem(ANCHOR_PEOPLE_STEP_SESSION_KEY, JSON.stringify(rules)) } catch { /* best effort */ }
}

/** Read once, then forget - the draft's own session state carries it from here on. */
export function takeTheServedPeopleStep(): ThePeopleStepRules | undefined {
  try {
    const raw = sessionStorage.getItem(ANCHOR_PEOPLE_STEP_SESSION_KEY)
    if (!raw) return undefined
    sessionStorage.removeItem(ANCHOR_PEOPLE_STEP_SESSION_KEY)
    return JSON.parse(raw) as ThePeopleStepRules
  } catch {
    return undefined
  }
}

/**
 * THE ANCHOR'S FIRST QUESTION, THE SAME WAY THE PEOPLE STEP TRAVELS (request 163, item 9).
 *
 * The plan's own wording (docs/anchor-scenario-plan.md section 6; docs/anchor-scenario.md): "the
 * first psychological trigger: recognition". This is the FALLBACK ONLY - `AnchorLandingPage.tsx`
 * remembers the engine's served `firstQuestion` (`GET /entry/anchor-start`) across the one
 * navigation into `EntryChatPage.tsx`, exactly as it does for `ThePeopleStepRules` above; this
 * constant is drawn only when nothing was served (the engine has not built it yet, an older link,
 * or the call failed).
 */
export const THE_ANCHOR_FIRST_QUESTION =
  "What's happening right now that makes you wish your team saw more of what you see?"

const ANCHOR_FIRST_QUESTION_SESSION_KEY = 'gw-anchor-first-question'

export function rememberTheServedFirstQuestion(question: string | undefined) {
  if (!question) return
  try { sessionStorage.setItem(ANCHOR_FIRST_QUESTION_SESSION_KEY, question) } catch { /* best effort */ }
}

/** Read once, then forget - the draft's own onboarding history carries it from here on. */
export function takeTheServedFirstQuestion(): string | undefined {
  try {
    const raw = sessionStorage.getItem(ANCHOR_FIRST_QUESTION_SESSION_KEY)
    if (!raw) return undefined
    sessionStorage.removeItem(ANCHOR_FIRST_QUESTION_SESSION_KEY)
    return raw
  } catch {
    return undefined
  }
}

/**
 * WHETHER `GET /entry/anchor-start` ACTUALLY SUCCEEDED FOR THIS TAB (plan piece 2; the plan's "do it
 * only when the anchor switch is on").
 *
 * `EntryChatPage.tsx` opens straight onto the anchor's own conversation - no door, no picker - the
 * moment it sees `?scenario=HELP_TEAM_UNDERSTAND`, which is only right while `release.anchorScenario`
 * is really on: a STALE such link, kept from before Hafsah switches it off, must fall back to
 * today's ordinary door rather than open a conversation the engine no longer runs. `anchor-start`
 * answers 404 whenever the switch is off (`AnchorLandingPage.tsx`'s own `isError`), so whether it
 * succeeded is the plan's own stand-in for the switch, carried the same way the people step and the
 * first question are. This is read, not taken: every place that opens the door checks it fresh,
 * rather than consuming it once into component state, so it cannot go stale depending on which of
 * two effects happens to run first on the same mount (`takeTheServedFirstQuestion` above is
 * genuinely single-use - the onboarding history it seeds is itself then kept across reloads - but a
 * yes/no switch reading has nothing to hand off once read, so there is nothing to lose by checking
 * it again). Reading the switch directly from `EntryChatPage.tsx` (`useAnchorScenarioIsOnForAStranger`)
 * was the other option the plan allows, but that is a live network call from an already very large,
 * widely-mocked component, and `@/api/entry` is replaced wholesale (no `entryAnchorApi`) by over a
 * dozen of its own specs - this reads a plain boolean instead and touches none of them.
 */
const ANCHOR_START_CONFIRMED_SESSION_KEY = 'gw-anchor-start-confirmed'

export function rememberTheAnchorStartSucceeded() {
  try { sessionStorage.setItem(ANCHOR_START_CONFIRMED_SESSION_KEY, '1') } catch { /* best effort */ }
}

export function theAnchorStartSucceededForThisTab(): boolean {
  try { return sessionStorage.getItem(ANCHOR_START_CONFIRMED_SESSION_KEY) === '1' } catch { return false }
}

export const THE_SETUP = {
  whenItStarts: 'When it starts',
  opensAtTheStart: 'The first check-in opens at the start time.',
  invitationsWhenItStarts: 'Adding someone sends their invitation when it starts.',
  now: 'Now',
  tomorrow: 'Tomorrow',
  onADate: 'On a date',
  howOften: 'How often',
  /** Names the rhythm it will really run at, the situation's own (U.6 review). */
  notChosen: (howOften: string) => `Not set yet. This will run ${howOften.toLowerCase()} unless you pick one.`,
  whenItEnds: 'When it ends',
  moreTimeLater: 'You can give it more time later.',
} as const

/* The product's one set of names for how often (lib/cadence.ts), in the prototype's order. */
export const HOW_OFTEN: [Cadence, string][] = (['ONE_TIME', 'DAILY', 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'SEQUENTIAL'] as Cadence[])
  .map((c) => [c, cadenceLabel(c as never)])

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const fromIso = (s: string) => new Date(`${s}T00:00:00`)
function tomorrowOf(today: Date): string { const d = new Date(today); d.setDate(d.getDate() + 1); return iso(d) }

/** "Wednesday 1 July" */
export function theDay(d: Date): string {
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

/**
 * "Check-ins open on Wed 1 July, Thu 2, Fri 3, Mon 6, Tue 7 and on from there, until 30 September: 65 in all."
 * Without an end date the count is unknown, so the sentence stops at "and on from there". One check-in
 * says the one day. "When I choose" has no dates, so it says nothing.
 */
export function whenTheyOpen(a: { cadence: Cadence; anchorDay: number | null; startsOn: string; endsOn: string; workingDays: number[]; today?: Date }): string | null {
  if (a.cadence === 'SEQUENTIAL') return null
  const startsAt = a.startsOn ? fromIso(a.startsOn) : null
  if (a.cadence === 'ONE_TIME') {
    const [only] = whenTheCheckInsLand({ cadence: 'ONE_TIME', anchorDay: null, startsAt, workingDays: a.workingDays, today: a.today })
    return `The check-in opens on ${theDay(only)}.`
  }
  const end = a.endsOn ? fromIso(a.endsOn) : null
  const all = whenTheCheckInsLand({ cadence: a.cadence, anchorDay: a.anchorDay, startsAt, workingDays: a.workingDays, today: a.today, howMany: end ? 400 : 5 })
  /* Compared as days, never as times: see whenTheCheckInsLand. */
  const inRange = a.endsOn ? all.filter((d) => iso(d) <= a.endsOn) : all
  if (!inRange.length) return null
  const shown = inRange.slice(0, 5)
  const words = shown.map((d, i) => {
    const sameMonth = i > 0 && d.getMonth() === shown[i - 1].getMonth()
    return sameMonth ? `${DAY_SHORT[d.getDay()]} ${d.getDate()}` : `${DAY_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
  })
  const list = words.length === 1 ? words[0] : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`
  if (!end) return `Check-ins open on ${words.join(', ')} and on from there.`
  if (inRange.length <= 5) return `Check-ins open on ${list}: ${inRange.length} in all.`
  return `Check-ins open on ${words.join(', ')} and on from there, until ${end.getDate()} ${MONTHS[end.getMonth()]}: ${inRange.length} in all.`
}

function Choice({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      style={{
        padding: '7px 13px', borderRadius: 999, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', fontWeight: 600,
        border: `1px solid ${on ? 'var(--gw-navy)' : 'var(--gw-border)'}`,
        background: on ? 'var(--gw-navy)' : 'white', color: on ? 'white' : 'var(--gw-text)',
      }}
    >
      {children}
    </button>
  )
}

function Section({ title, help, children }: { title: string; help?: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-text)', margin: '0 0 3px' }}>{title}</h3>
      {help && <p style={{ fontSize: 12.5, color: 'var(--gw-sub)', margin: '0 0 8px', lineHeight: 1.5 }}>{help}</p>}
      {children}
    </section>
  )
}

const row = { display: 'flex', gap: 6, flexWrap: 'wrap' as const }
const note = { fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.5, margin: '8px 0 0' }
const dateInput = { padding: '7px 10px', borderRadius: 8, border: '1px solid var(--gw-border)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }

export function TheSetup(p: {
  cadence: Cadence
  cadenceChosen: boolean
  onCadence: (c: Cadence) => void
  anchorDay: number | null
  workingDays: number[]
  startsOn: string
  onStartsOn: (s: string) => void
  endsOn: string
  onEndsOn: (s: string) => void
  /** The shared day picker: <WhichDaysTheyWork value={workingDays} onChange={setWorkingDays} />. */
  daysPicker: React.ReactNode
  today?: Date
}) {
  const today = p.today ?? new Date()
  const tomorrow = tomorrowOf(today)
  const [pickingADate, setPickingADate] = useState(!!p.startsOn && p.startsOn !== tomorrow)
  const startMode = !p.startsOn ? 'now' : p.startsOn === tomorrow && !pickingADate ? 'tomorrow' : 'date'
  const opens = whenTheyOpen({ cadence: p.cadence, anchorDay: p.anchorDay, startsOn: p.startsOn, endsOn: p.endsOn, workingDays: p.workingDays, today })

  return (
    <div style={{ background: 'var(--gw-paper-2)', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
      <Section title={THE_SETUP.whenItStarts} help={THE_SETUP.opensAtTheStart}>
        <div style={row}>
          <Choice on={startMode === 'now'} onClick={() => { setPickingADate(false); p.onStartsOn('') }}>{THE_SETUP.now}</Choice>
          <Choice on={startMode === 'tomorrow'} onClick={() => { setPickingADate(false); p.onStartsOn(tomorrow) }}>{THE_SETUP.tomorrow}</Choice>
          <Choice on={startMode === 'date'} onClick={() => { setPickingADate(true); if (!p.startsOn) p.onStartsOn(tomorrow) }}>{THE_SETUP.onADate}</Choice>
        </div>
        {startMode === 'date' && (
          <input type="date" aria-label={THE_SETUP.onADate} value={p.startsOn} min={iso(today)} onChange={(e) => p.onStartsOn(e.target.value)} style={{ ...dateInput, marginTop: 8 }} />
        )}
        {startMode === 'tomorrow' && <p style={note}>{`Tomorrow, ${theDay(fromIso(tomorrow))}.`}</p>}
        {startMode === 'date' && p.startsOn && <p style={note}>{`${theDay(fromIso(p.startsOn))}.`}</p>}
        <p style={note}>{THE_SETUP.invitationsWhenItStarts}</p>
      </Section>

      <Section title={THE_SETUP.howOften}>
        {!p.cadenceChosen && <p style={{ ...note, margin: '0 0 8px', color: 'var(--gw-amber-t)' }}>{THE_SETUP.notChosen(cadenceLabel(p.cadence as never))}</p>}
        <div style={row}>
          {HOW_OFTEN.map(([c, label]) => (
            <Choice key={c} on={p.cadenceChosen && p.cadence === c} onClick={() => p.onCadence(c)}>{label}</Choice>
          ))}
        </div>
        {/* One day picker only (U.6 review): a second "On which day?" for a weekly rhythm could say
            Saturday while the days said weekdays only, and the two together turned weekly into
            fortnightly. The start date sets the weekday, as on the check-in's own Setup. */}
      </Section>

      {/* The days are the product's one day picker, WhichDaysTheyWork, handed in by the page, so the
          check-in's own Setup and this screen can never offer two different sets of choices. */}
      {p.cadence !== 'ONE_TIME' && p.cadence !== 'SEQUENTIAL' && p.daysPicker}

      {opens && <p style={{ ...note, margin: '0 0 16px', color: 'var(--gw-text)' }}>{opens}</p>}

      {/*
        U.6 review: one choice, a date, set to when it will really end. The prototype's "When I end it"
        is left out: every check-in ends (it keeps a length), so a check-in with no end would have been
        saved as ending on the situation's usual day while the screen said it did not end.
      */}
      {p.cadence !== 'ONE_TIME' && (
        <Section title={THE_SETUP.whenItEnds} help={THE_SETUP.moreTimeLater}>
          <input type="date" aria-label={THE_SETUP.whenItEnds} value={p.endsOn} min={p.startsOn || iso(today)} onChange={(e) => p.onEndsOn(e.target.value)} style={dateInput} />
        </Section>
      )}
    </div>
  )
}
