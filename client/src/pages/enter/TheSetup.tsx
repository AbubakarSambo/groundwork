import { useRef, useState } from 'react'
import { Choices, FieldLabel, Panel, Select, SetupBlock, SetupBlocks, Stack, Text, TextField } from '@/components/gw/ui'
import { ordinal } from '@/components/gw/AnchorDayPicker'
import { whenTheCheckInsLand, type Cadence } from '@/components/gw/when-the-check-ins-land'
import { cadenceLabel } from '@/lib/cadence'
import { theRhythmInFull } from '@/lib/the-closing-after-your-first-check-in'
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
 * `mayAdd` is 20: the limit is 20 people besides the lead, who is not counted (decision 121, item 4).
 */
export const ANCHOR_PEOPLE_STEP_RULES: ThePeopleStepRules = {
  limit: 20,
  theLeadCounts: false,
  mayAdd: 20,
  heading: 'Who needs to be part of this?',
  intro: 'Add up to 20 people. They don’t need to report directly to you. They simply need to be part of the work you’re trying to move.',
  contextLabel: 'What do they do, and why are they part of this?',
  button: 'Start my Groundwork.',
  limitSentence: 'This one-month Groundwork holds up to 20 people besides you.',
}

/**
 * THE ANCHOR'S FIRST QUESTION, REMEMBERED ACROSS THE ONE RE-RENDER IT TAKES TO ARRIVE (request 163,
 * item 9; decision 114, docs/decisions-merged.md).
 *
 * The plan's own wording (docs/anchor-scenario-plan.md section 6; docs/anchor-scenario.md): "the
 * first psychological trigger: recognition". This is the FALLBACK ONLY. `EntryChatPage.tsx` is now
 * the one caller of `GET /entry/anchor-start` (it used to be a separate page, `AnchorLandingPage
 * .tsx`, handing off to this one on a fresh page load - decision 114 folded that front door into the
 * ordinary entry chat, so there is no second page to hand off to any more). `thePeopleStep` and
 * `groundLabel`, served on the same call, are set directly into this page's own state now that
 * caller and user are the same component; `firstQuestion` still goes through `sessionStorage`
 * because it has to outlive the render in which the call resolves and land in the ONE onboarding
 * turn this page ever seeds - the same reason the confirmation flag below also reads from
 * `sessionStorage` rather than a plain variable.
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
 * THE ANCHOR'S OWN SITUATION NAME (request 144 (2) and (3)): `GET /entry/anchor-start` answers
 * `groundLabel: "Help my team understand"`, which `EntryChatPage.tsx` now sets straight into its own
 * `anchorGroundLabel` state the moment the call resolves (decision 114) - not `SCENARIO_LABELS`' own
 * entry for `HELP_TEAM_UNDERSTAND`, which is missing its "my". That served sentence is what an
 * anchor draft shows wherever it names its own situation (the side panel, and anywhere else
 * `EntryChatPage.tsx` would otherwise have reached for a label map).
 */

/**
 * WHETHER `GET /entry/anchor-start` ACTUALLY SUCCEEDED FOR THIS TAB (plan piece 2; the plan's "do it
 * only when the anchor switch is on").
 *
 * `EntryChatPage.tsx` opens straight onto the anchor's own conversation - no door, no picker - the
 * moment it sees `?scenario=HELP_TEAM_UNDERSTAND`, which is only right while `release.anchorScenario`
 * is really on: a STALE such link, kept from before Hafsah switches it off, must fall back to
 * today's ordinary door rather than open a conversation the engine no longer runs. `anchor-start`
 * answers 404 whenever the switch is off, so whether it succeeded is the plan's own stand-in for the
 * switch, carried the same way the first question is. This is read, not taken: every place that
 * opens the door checks it fresh,
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
  /* B-147 follow-up: this is the prototype's own exact sentence (B1-starting-a-check-in/setup.txt),
     word for word - "check-in" here, not "session", so left as the prototype has it rather than
     swept into the session rename. */
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
  /* Setup page, piece 3a: the rest of the prototype's own words (setup.txt, new.txt). */
  aName: 'A name',
  twoMinutes: 'Each check-in takes about ten minutes.',
  whenIEndIt: 'When I end it',
  untilYouEndIt: 'It keeps going until you end it. There is no last date.',
  whosInIt: 'Who’s in it',
  onWhichDay: 'On which day',
  onWhichDayOfTheMonth: 'On which day of the month',
  theDayItStarts: 'The day of the month it starts',
} as const

/* The product's one set of names for how often (lib/cadence.ts), in the prototype's order. */
export const HOW_OFTEN: [Cadence, string][] = (['ONE_TIME', 'DAILY', 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'SEQUENTIAL'] as Cadence[])
  .map((c) => [c, cadenceLabel(c as never, null)])

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
  /*
   * SCREEN FAULT 10 (FINAL WALK): "UNTIL 23 DECEMBER: 12 IN ALL" JOINED TWO PIECES WITH A COLON,
   * AND NEVER SAID WHAT WAS BEING COUNTED. "12" on its own, after a colon, reads as a label and a
   * number rather than a sentence - said now as "until 23 December, 12 sessions in all.".
   */
  /* Setup page review, 13 October: the prototype's own word, "check-ins", not "sessions". */
  const sessionsInAll = `${inRange.length} check-in${inRange.length === 1 ? '' : 's'} in all`
  if (inRange.length <= 5) return `Check-ins open on ${list}, ${sessionsInAll}.`
  return `Check-ins open on ${words.join(', ')} and on from there, until ${end.getDate()} ${MONTHS[end.getMonth()]}${end.getFullYear() !== (startsAt ?? a.today ?? new Date()).getFullYear() ? ` ${end.getFullYear()}` : ''}, ${sessionsInAll}.`
}

/*
 * SETUP PAGE, PIECE 3A: REBUILT FROM THE PROTOTYPE'S OWN STRUCTURE (setup.txt, setup.jpg).
 *
 * Each question is a `SetupBlock` - the heading and its one sentence on the left, the controls on the
 * right, a rule between blocks - and the choices are the shared `Choices` (the prototype's `.seg`).
 * It used to be one grey box with every control stacked under small headings. The order is the
 * prototype's: a name, when it starts, how often (with the days and the sentence saying when they
 * open), when it ends, and who is in it. The name and the people are handed in by the page, because
 * the page owns them; when it hands in no people, the sentence about invitations stays under "When it
 * starts", where it always was.
 *
 * Every scheduling choice the product keeps is here: the start (now, tomorrow or a date), how often
 * (once, every day, every week, every 2 weeks, every month, when I choose), the day it lands on, the
 * days people work (weekdays only, any day, or any set of days), and the end (a date, or when I end
 * it). "When I end it" is back: the engine has kept `runsUntilEnded` since request 37 and reads it from
 * the conversation, and the save sends it.
 */
const WEEK_FROM_MONDAY = [1, 2, 3, 4, 5, 6, 0]

/**
 * WHAT THE HEADER SAYS IS PLANNED (setup page review, 13 October). Tendai said "weekly, on Thursdays,
 * with no end"; the summary said there is no last date while the header said "10 sessions planned".
 * With no end there is no count, so the header says the rhythm instead: "Every Thursday, until you
 * end it". Otherwise the count, as before.
 */
export function thePlanInTheHeader(a: { planned: number; cadence: Cadence; runsUntilEnded: boolean; anchorDay: number | null; workingDays: number[]; startsOn: string; today?: Date }): string {
  if (a.runsUntilEnded && a.cadence !== 'ONE_TIME') {
    const today = a.today ?? new Date()
    const startsOn = a.startsOn || iso(today)
    const rhythm = theRhythmInFull({ cadence: a.cadence, cadenceAnchorDay: a.anchorDay, workingDays: a.workingDays, startsAt: startsOn }, { untilEnded: true, stop: false })
    if (rhythm) return rhythm
  }
  /* "check-ins", the summary's own word (setup page review, second round). */
  return `${a.planned} ${a.planned === 1 ? 'check-in planned' : 'check-ins planned'}`
}

/** The weekday a weekly rhythm really lands on while no day is picked: its second landing's day. */
export function theDayItLandsOn(cadence: Cadence, startsOn: string, workingDays: number[], today: Date): number {
  const [first, second] = whenTheCheckInsLand({ cadence, anchorDay: null, startsAt: startsOn ? fromIso(startsOn) : null, workingDays, today, howMany: 2 })
  return (second ?? first ?? today).getDay()
}

export function TheSetup(p: {
  cadence: Cadence
  cadenceChosen: boolean
  onCadence: (c: Cadence) => void
  anchorDay: number | null
  /** Restored (nothing-removed-screens.md item 2): the day check-ins land on - a weekday for a
      weekly rhythm, a day of the month for a monthly one. Optional on every page that offers it. */
  onAnchorDay?: (day: number | null) => void
  workingDays: number[]
  startsOn: string
  onStartsOn: (s: string) => void
  endsOn: string
  onEndsOn: (s: string) => void
  /** True when it runs until the lead ends it (the prototype's "When I end it"). */
  runsUntilEnded?: boolean
  /** Offered only where the page can send it; without it, "When it ends" is a date alone. */
  onRunsUntilEnded?: (until: boolean) => void
  /** The shared day picker: <WhichDaysTheyWork value={workingDays} onChange={setWorkingDays} />. */
  daysPicker: React.ReactNode
  /** The check-in's name, as a field, drawn as the first block ("A name", new.txt). */
  nameField?: React.ReactNode
  /** Who is in it: the page's own people step, drawn as the last block. */
  people?: React.ReactNode
  /** One sentence above the people step, such as that nobody is added yet. */
  peopleNote?: string
  today?: Date
}) {
  const today = p.today ?? new Date()
  const tomorrow = tomorrowOf(today)
  const [pickingADate, setPickingADate] = useState(!!p.startsOn && p.startsOn !== tomorrow)
  const startMode = !p.startsOn ? 'now' : p.startsOn === tomorrow && !pickingADate ? 'tomorrow' : 'date'
  const untilEnded = !!p.runsUntilEnded && !!p.onRunsUntilEnded
  /* The weekday and the day of the month she chose, each kept across a change of rhythm (setup page
     review: monthly and back to weekly dropped her Thursday). A weekday means nothing to a monthly
     rhythm and a day of the month nothing to a weekly one, so each comes back with its own rhythm. */
  const isWeekly = (c: Cadence) => c === 'WEEKLY' || c === 'FORTNIGHTLY'
  const chosenWeekday = useRef<number | null>(isWeekly(p.cadence) ? p.anchorDay : null)
  const chosenMonthDay = useRef<number | null>(p.cadence === 'MONTHLY' ? p.anchorDay : null)
  const opens = whenTheyOpen({ cadence: p.cadence, anchorDay: p.anchorDay, startsOn: p.startsOn, endsOn: untilEnded ? '' : p.endsOn, workingDays: p.workingDays, today })

  return (
    <SetupBlocks>
      {p.nameField && (
        <SetupBlock heading={THE_SETUP.aName}>{p.nameField}</SetupBlock>
      )}

      <SetupBlock heading={THE_SETUP.whenItStarts} help={THE_SETUP.opensAtTheStart}>
        <Choices
          label={THE_SETUP.whenItStarts}
          options={[{ key: 'now', label: THE_SETUP.now }, { key: 'tomorrow', label: THE_SETUP.tomorrow }, { key: 'date', label: THE_SETUP.onADate }]}
          value={startMode}
          onChange={(k) => {
            if (k === 'now') { setPickingADate(false); p.onStartsOn('') }
            if (k === 'tomorrow') { setPickingADate(false); p.onStartsOn(tomorrow) }
            if (k === 'date') { setPickingADate(true); if (!p.startsOn) p.onStartsOn(tomorrow) }
          }}
        />
        {startMode === 'date' && (
          <TextField type="date" aria-label={THE_SETUP.onADate} value={p.startsOn} min={iso(today)} onChange={(e) => p.onStartsOn(e.target.value)} className="gwui-narrow-field" />
        )}
        {startMode === 'tomorrow' && <Text size="14-5" as="p">{`Tomorrow, ${theDay(fromIso(tomorrow))}.`}</Text>}
        {startMode === 'date' && p.startsOn && <Text size="14-5" as="p">{`${theDay(fromIso(p.startsOn))}.`}</Text>}
        {!p.people && <Text size="14-5" ink="sub" as="p">{THE_SETUP.invitationsWhenItStarts}</Text>}
      </SetupBlock>

      <SetupBlock heading={THE_SETUP.howOften} help={THE_SETUP.twoMinutes}>
        {!p.cadenceChosen && <Text size="14-5" ink="amber" as="p">{THE_SETUP.notChosen(cadenceLabel(p.cadence as never, (p as any).cadenceDays))}</Text>}
        <Choices
          label={THE_SETUP.howOften}
          options={HOW_OFTEN.map(([c, label]) => ({ key: c, label }))}
          value={p.cadenceChosen ? p.cadence : ''}
          onChange={(k) => {
            const c = k as Cadence
            p.onCadence(c)
            /* A day picked for one rhythm means something different, or nothing, in another - a
               day of the month chosen for "Monthly" is meaningless once the choice moves to
               "Weekly". Cleared here, centrally, whenever the rhythm actually changes. */
            if (p.onAnchorDay && c !== p.cadence) {
              p.onAnchorDay(isWeekly(c) ? chosenWeekday.current : c === 'MONTHLY' ? chosenMonthDay.current : null)
            }
          }}
        />
        {/*
          ONE DAY PICKER, FOR THE RHYTHM CHOSEN (setup page review, 13 October). Every week and every
          month showed "Which day of the week should check-ins open? (optional)" and "On which days"
          together, and a click on Thursday in the second turned Thursday off in a Thursday check-in.
          Now a daily rhythm asks on which days, a weekly or two-weekly one asks on which day (the day
          it lands on, `cadenceAnchorDay`, showing the day it really lands on until she picks one), and
          a monthly one asks on which day of the month. The days she said she works still move a date
          that falls on a day off, and the sentence below says exactly where each one lands.
        */}
        {p.cadenceChosen && (p.cadence === 'WEEKLY' || p.cadence === 'FORTNIGHTLY') && p.onAnchorDay && (
          <Stack gap={8}>
            <Text size="14-5" weight={700} as="p">{THE_SETUP.onWhichDay}</Text>
            <Choices
              label={THE_SETUP.onWhichDay}
              options={WEEK_FROM_MONDAY.map((d) => ({ key: String(d), label: DAY_SHORT[d] }))}
              value={String(p.anchorDay ?? theDayItLandsOn(p.cadence, p.startsOn, p.workingDays, today))}
              onChange={(k) => { chosenWeekday.current = Number(k); p.onAnchorDay!(Number(k)) }}
            />
          </Stack>
        )}
        {p.cadenceChosen && p.cadence === 'MONTHLY' && p.onAnchorDay && (
          <Stack gap={8}>
            <FieldLabel htmlFor="setup-day-of-the-month">{THE_SETUP.onWhichDayOfTheMonth}</FieldLabel>
            <Select id="setup-day-of-the-month" value={p.anchorDay ?? ''} onChange={(e) => { const d = e.target.value ? Number(e.target.value) : null; chosenMonthDay.current = d; p.onAnchorDay!(d) }} className="gwui-narrow-field">
              <option value="">{THE_SETUP.theDayItStarts}</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => <option key={day} value={day}>{`The ${ordinal(day)}`}</option>)}
            </Select>
          </Stack>
        )}
        {/* The days are the product's one day picker, WhichDaysTheyWork, handed in by the page, so the
            check-in's own Setup and this screen can never offer two different sets of choices. */}
        {p.cadence === 'DAILY' && p.daysPicker}
        {opens && <Panel><p className="gwui-panel-text">{opens}</p></Panel>}
      </SetupBlock>

      {/*
        "When I end it" is offered again (piece 3a, Hafsah: every scheduling choice the product has).
        It was left out in the U.6 review because every check-in then kept a length; the engine has
        since kept `runsUntilEnded` (no length and no planned last session), so the choice is real.
      */}
      {p.cadence !== 'ONE_TIME' && (
        <SetupBlock heading={THE_SETUP.whenItEnds} help={THE_SETUP.moreTimeLater}>
          {p.onRunsUntilEnded && (
            <Choices
              label={THE_SETUP.whenItEnds}
              options={[{ key: 'date', label: THE_SETUP.onADate }, { key: 'until', label: THE_SETUP.whenIEndIt }]}
              value={untilEnded ? 'until' : 'date'}
              onChange={(k) => p.onRunsUntilEnded!(k === 'until')}
            />
          )}
          {untilEnded
            ? <Text size="14-5" ink="sub" as="p">{THE_SETUP.untilYouEndIt}</Text>
            : <TextField type="date" aria-label={THE_SETUP.whenItEnds} value={p.endsOn} min={p.startsOn || iso(today)} onChange={(e) => p.onEndsOn(e.target.value)} className="gwui-narrow-field" />}
        </SetupBlock>
      )}

      {p.people && (
        <SetupBlock heading={THE_SETUP.whosInIt} help={THE_SETUP.invitationsWhenItStarts}>
          {p.peopleNote && <Text size="14-5" as="p">{p.peopleNote}</Text>}
          {p.people}
        </SetupBlock>
      )}
    </SetupBlocks>
  )
}
