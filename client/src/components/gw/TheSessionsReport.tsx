import { useState } from 'react'
import { Folded } from './two-accounts-side-by-side'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api/reports'
import { WhatSuccessLooksLike } from './WhatSuccessLooksLike'
import { HowMuchThereIsToGoOn } from './HowMuchThereIsToGoOn'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { WhereToFocus } from './where-to-focus'
import { atTheStart } from '@/lib/a-colleague'

/**
 * ONE SESSION'S SHARED REPORT.
 *
 * Everything here is assembled server-side from what people actually said, typed at extraction.
 * Nothing on this screen was asked of a model.
 *
 * WHY THIS WAS REBUILT. It printed every quote twice. "What each person said they did" grouped the
 * lines by person and "What people said this session" grouped the same lines by theme, so one
 * party's block and the Progress and priorities block were word for word identical and the page
 * ran to about double the length it needed. Grouping is a view of one set of facts, not two sets,
 * so there is one rendering and a control that changes how it is grouped.
 *
 * The order below is the order somebody reads in: how much there is to go on, who it counts, the
 * four reads, the picture, then what was said, then what it means, then what to do.
 */

/** The themes, in the order the promise makes them. Server omits a section it cannot fill. */
const THEMES = ['Progress and priorities', 'Commitments', 'Risks and concerns', 'Asks']
/**
 * THE TWO SECTIONS THIS PAGE NO LONGER DRAWS, NAMED SO NOTHING DRAWS THEM BY ACCIDENT.
 *
 * "What changed since last session" and "what changed since the beginning" are distances between
 * two points. This is the report for one of them. They are on the board, which is the surface
 * about the whole run. The server still sends them; this page refuses them by name rather than by
 * silence, so a later change to the section list cannot quietly put them back.
 */
const NOT_ON_A_SESSION = ['What changed since last session', 'What changed since the beginning']
/* Was "What this rests on", which is court language for where the report got its information. */
const RESTS_ON = ['What this is built from', 'What this rests on']

/** Body copy is capped so a long quote does not run the full width of the container. */
const PROSE: React.CSSProperties = { maxWidth: '68ch', lineHeight: 1.6 }

/**
 * THE SHARED REPORT, IN THE SHAPE THE MARKETING PAGE PROMISES.
 *
 * The example reports on the marketing site are one card: a header line, the finding in amber with
 * its basis small underneath, the four states in a row, the words people gave as quotes with a
 * small cite, the two sides of a difference side by side, and one boxed thing to settle first. This
 * page had the same facts as eleven headings of prose. Every block below is one of the card's rows;
 * the facts and their sources are unchanged, only the shape is.
 */
const ROW_CLASS = 'gwui-rule-top gwui-pt-16 gwui-pr-20 gwui-pb-16 gwui-pl-20'

/**
 * WHAT A PHONE CHANGES ON THIS PAGE, AND IT IS NOT THE TYPE SIZE OF THE BODY.
 *
 * Two blocks were read back as too big to take in on a phone, and both for the same reason: they
 * are sized for a SHORT string and the real ones are not short.
 *
 * The finding is set at 16.5px semi-bold because on a laptop it is one line that has to be the
 * first thing anybody sees. The finding this board actually produced runs to two sentences - "the
 * role was never clearly defined, so there is no boundary to measure work against. Define what
 * this role owns before reading anything into where work is landing." At display size on a 375px
 * column that is eight lines of heavy type before the reader has reached anything else.
 *
 * At a glance has the same shape of problem: four tiles whose sub-clause is a whole sentence, in a
 * grid that collapses to one column, so a block meant to be glanced at becomes a screen of its
 * own. It keeps its clause - a tile that is a label and a figure is a scoreboard - and loses the
 * padding and the display-size figure.
 *
 * Nothing is cut. A phone gets the same words at a size that lets somebody read them.
 */
const SHEET = `
.gw-sr .gw-find     { font-size: 16.5px; line-height: 1.4; font-weight: 600; }
.gw-sr .gw-find-why { font-size: 13px; line-height: 1.6; }
.gw-sr .gw-tile     { padding: 14px 18px; }
.gw-sr .gw-tile-n   { border-left: 1px solid var(--gw-border); }
/* U.9 THIRD REVIEW: ONE CLASS, FOR ONE SENTENCE, NOT A FIGURE CLASS AND A CAPTION CLASS. Each tile
   used to be a big figure (.gw-tile-v) over a small caption (.gw-tile-s); it is one sentence now,
   set at a size that reads as body text rather than as a scoreboard digit. */
.gw-sr .gw-tile-txt { font-size: 13px; font-weight: 600; line-height: 1.5; }
@media (max-width: 640px) {
  .gw-sr .gw-find     { font-size: 15px; line-height: 1.5; font-weight: 600; }
  .gw-sr .gw-find-why { font-size: 13px; }
  /* Stacked, the divider is the rule ABOVE each tile, not a stripe down its left edge. */
  .gw-sr .gw-tile     { padding: 12px 16px; }
  .gw-sr .gw-tile-n   { border-left: none; border-top: 1px solid var(--gw-border); }
  .gw-sr .gw-tile-txt { font-size: 13.5px; }
}
`
/*
 * U.9 REVIEW FIX 12: A LABEL IS A SHORT SENTENCE, NOT A SHOUTED CAPTION.
 * All caps and letter-spacing turned "This is the top of it" into "THIS IS THE TOP OF IT" and,
 * worse, a person's own name under a quote into "RUKIA OTIENO (YOU)" - a name is never a label.
 * The words underneath were already plain sentences; only the styling shouted them.
 */
const LABEL_CLASS = 'gwui-fs-13 gwui-ink-subd'
const LABEL_STYLE: React.CSSProperties = { fontWeight: 700 }

/** "Note from Tuskys Kilimani.txt", "team-plan.txt" - a source cited by its own filename, never a
    person's name. Used to decide how the sentence under it reads. */
function looksLikeAFilename(who: string): boolean {
  return /\.[a-z0-9]{2,4}$/i.test(who.trim())
}

/**
 * U.9 THIRD REVIEW: A FILE'S KIND, SAID FOR WHAT IT IS, NOT ALWAYS "A TYPED DOCUMENT".
 * "chandarana-quote.png · a photo" was joined with a dot, and even once that join was fixed the
 * sentence still called every file "a typed document" - a photo is not a typed document. The
 * extension decides which sentence a file gets.
 */
const IMAGE_EXTENSION = /\.(png|jpe?g|gif|webp|heic|heif|bmp)$/i
function kindOfFile(name: string): string {
  return IMAGE_EXTENSION.test(name.trim()) ? 'a photo' : 'a typed document'
}

/**
 * U.9 RE-REVIEW: "WHAT THIS IS BUILT FROM" STILL SHOWED THE SERVER'S OWN "<FILE> · <KIND>" JOIN.
 * `evidence[].text` (reports.service.ts, `rounds()`'s neighbour `sessionReport()`, around line
 * 2928) sends "Note from Tuskys Kilimani.txt · a typed document" and "chandarana-quote.png · a
 * photo" as one already-joined string, drawn verbatim as if it were a quote. A request is written
 * for the server to send this as a sentence, or as two fields, so nothing has to be parsed back
 * apart here; until then this turns the join into "<file> is <kind>." before it is drawn. Only a
 * line shaped exactly "<one piece> · <one piece>" is touched - anything else (a real quote that
 * happens to contain a "·", or a bare filename with no kind) is left exactly as it is.
 */
const MIDDLE_DOT = String.fromCharCode(183)
export function asFileIsKindSentence(text: string): string {
  const parts = text.split(` ${MIDDLE_DOT} `)
  return parts.length === 2 ? `${parts[0]} is ${parts[1]}.` : text
}

/**
 * U.9 RE-REVIEW, ITEM A: A SENTENCE UNDER THE QUOTE, NOT "NAME · FROM A DOCUMENT".
 * "Baraka Mwangi · from memory" and "Note from Tuskys Kilimani.txt · a typed document" each joined
 * a name (or a filename, when the source is a document rather than a person) to a fact with a
 * dot. `who` is sometimes a person who said the line and sometimes the document it came from; each
 * now reads as its own sentence, in the phrasing that fits which one it is.
 *
 * U.9 THIRD REVIEW, ITEM 5: THE READER'S OWN NAME UNDER THEIR OWN QUOTE IS JUST "YOU". "Rukia
 * Otieno (you) said this." named her back to herself before saying "you" - nobody would ever say
 * that to the person they are talking to. `isYou` says this line is the reader's own, and the
 * sentence drops the name entirely rather than repeat it.
 */
function Cite({ who, documented, figureIs, isYou }: { who: string; documented?: boolean; figureIs?: string; isYou?: boolean }) {
  const sentence = isYou
    ? `You said this${figureIs ? ` ${figureIs}` : ''}.${documented && !figureIs ? ' A document backs it.' : ''}`
    : looksLikeAFilename(who)
      ? `${who} is ${kindOfFile(who)}.`
      : `${who} said this${figureIs ? ` ${figureIs}` : ''}.${documented && !figureIs ? ' A document backs it.' : ''}`
  return (
    <div className="gwui-fs-13 gwui-ink-muted gwui-mt-6">
      {sentence}
    </div>
  )
}

/**
 * ONE LINE SOMEBODY SAID, AS A QUOTE WITH A NAME UNDER IT.
 * The reader's own lines used to arrive with no name at all, so the list read as three voices and
 * one anonymous one. A line with no name is the reader's, and says so.
 */
function Quotes({ items, yourName }: { items: { text: string; who?: string | null; documented?: boolean; figureIs?: string }[]; yourName: string | null }) {
  return (
    <div className="gwui-gap-12" style={{ display: 'grid' }}>
      {items.map((it, i) => (
        <div key={i}>
          <div className="gwui-fs-13-5 gwui-ink-text" style={{ fontStyle: 'italic', ...PROSE }}>{it.text}</div>
          <Cite
            who={it.who == null || it.who === yourName ? 'You' : it.who}
            isYou={it.who == null || it.who === yourName}
            documented={it.documented}
            figureIs={it.figureIs}
          />
        </div>
      ))}
    </div>
  )
}

/**
 * ONE BLOCK OF THE SHARED REPORT, NUMBERED AND ANNOTATED LIKE THE TEMPLATE.
 *
 * The template's signature is that every block carries three things on one line: its number, its
 * name, and a short note on the right saying what the block is FOR. The page had only the name, so
 * seven blocks read as seven headings rather than as a report with a shape - and a reader could not
 * tell that "where things stand" is the second of seven rather than something that happened to be
 * next.
 *
 * The number is the block's position in `THE_ORDER` on the server, written here because the page
 * draws them in that order. `note` is the right-hand half and is never decoration: it says what the
 * block is for, which is the thing a first-time reader does not have.
 */
function Row({ label, children, style }: {
  /** Kept on the interface so call sites (and the-order-comes-from-one-place test) are unchanged;
      no longer drawn - see the note below. */
  n?: number
  label?: string
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div className={ROW_CLASS} style={style}>
      {/*
        U.9 REVIEW FIX 7 AND 12, AND THE RE-REVIEW: ONE PLAIN LABEL, NOTHING UNDER IT.
        "01 What this sits under" numbered every block, which is what produced "Session 1 /
        Session 1 / Session 1" once the masthead above also carried a number and a title; a
        second, lower-case line under the label ("what the objective serves") then read as a
        second fact stacked on the heading rather than one sentence. `n` still says where a block
        sits in THE_ORDER, for the order-comes-from-one-place test, but nothing about a report
        needs a person to count blocks to read it, and each label below now says everything it
        needs to in one line.
      */}
      {label && <div className={`${LABEL_CLASS} gwui-mb-10`} style={LABEL_STYLE}>{label}</div>}
      {children}
    </div>
  )
}
/**
 * REBUILT TO THE TEMPLATE, rather than adjusted toward it.
 *
 * The previous version was the old page with its order changed and its labels annotated, and it
 * still did not read like the thing it was meant to be. Told so twice. The difference is not a
 * list of tweaks: the template is a CARD with a finding at the top, four states in a row, numbered
 * blocks with a note each, and the long material folded away until somebody asks for it. The old
 * page was eleven open sections of prose with headings.
 *
 * EVERY RULE THE OLD ONE HELD IS HELD HERE, and they are the reason this is a rebuild of the
 * rendering rather than of the product: no grade on any named person, no run read on a page about
 * one session, the two sections that belong to the board refused by name, nothing reading the
 * parties array, and the state word on a forming report so nobody thinks they are reading a final
 * one.
 *
 * WHAT IS FOLDED, AND WHY THOSE. What everybody agrees, what each person said, and what this rests
 * on. Each is long, each is the part nobody needs twice, and each is still every word it was - a
 * fold is not a deletion, and the summary line says how much is behind it.
 */
/**
 * THE MASTHEAD AND WHO IS COUNTED, AS SENTENCES (U.9, one-session.txt).
 *
 * The masthead read "4 PEOPLE · CHECK-IN 3 OF 12 · STILL FORMING · 2 OF 4 ANSWERED", in capitals
 * and joined by dots, and each person read "Miriam (you) · Answered". The prototype says "Session
 * 37. 6 of 6 people checked in." and, once it is out, "Shared with the team". Each person is now a
 * sentence: "You have checked in.", "Aisha has checked in.", "Omar has not checked in yet."
 */
export const SHARED_WITH_THE_TEAM = 'Shared with the team.'

export function sessionAndWhoCheckedIn(n: number, planned: number | null, answered: number, of: number): string {
  const session = planned ? `Session ${n} of ${planned}.` : `Session ${n}.`
  if (!of) return session
  return `${session} ${answered} of ${of} ${of === 1 ? 'person' : 'people'} checked in.`
}

export function hasCheckedIn(c: { who: string; isYou: boolean; answered: boolean }): string {
  if (c.isYou) return c.answered ? 'You have checked in.' : 'You have not checked in yet.'
  return c.answered ? `${c.who} has checked in.` : `${c.who} has not checked in yet.`
}

/** "6pm", "6:30pm": the time as the prototype writes it. */
function atTime(d: Date | string): string {
  return whenItWas(d, 'hourOfDay').replace(':00', '').replace(/\s+/g, '').toLowerCase()
}

/**
 * "Last updated on Wednesday 23 September at 6pm. It only changes when something new comes in,
 * such as a check-in, a document or a number from another system." (team-report.txt). The
 * prototype adds who checked in ("when Miriam checked in"); nothing served says what the change
 * was, so that part waits for the engine (request 9).
 *
 * DRAWS NOTHING WHEN THE DATE ISN'T A REAL DATE. The server can send `{}` for `updatedAt` (an
 * engine bug that turns a `Date` into an empty object on its way through `applyNames`, requested
 * as engine request 53). Before this guard, that produced "Last updated on  at . It only changes
 * ..." - two blank spots either side of "at", read as a broken sentence rather than as nothing.
 * `whenItWas` already returns '' for a date it cannot parse, so an empty weekday or time means the
 * date was never real, and the whole line is withheld rather than shown half-empty.
 */
export function lastUpdated(at: Date | string): string | null {
  const weekday = whenItWas(at, 'weekdayAndDay')
  const time = atTime(at)
  if (!weekday || !time) return null
  return `Last updated on ${weekday} at ${time}. It only changes when something new comes in, such as a check-in, a document or a number from another system.`
}

/**
 * U.9 THIRD REVIEW, ITEM 2: A TILE IS A SENTENCE, NOT A LABEL, A FIGURE AND A FRAGMENT STACKED ON
 * TOP OF EACH OTHER.
 *
 * "Differences / 1. / still open, as the written report reads it" read as three disconnected
 * pieces rather than one thing to read - the label was hidden from sight but the figure and the
 * clause under it were still two separate lines with no sentence joining them. Each tile now says
 * its count and what it is a count of in one or two full sentences, built from the same `label`,
 * `value` and `sub` the server already sends (`atAGlanceTiles`, what-this-session-holds.ts) -
 * nothing here is invented, only composed.
 *
 * Small counts are said as words, the way the rest of the product does ("Two targets are set"),
 * and larger ones stay as figures ("15 of every 100").
 */
function smallWord(n: number): string {
  const words = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']
  return n >= 0 && n < words.length ? words[n] : String(n)
}
function capitalize(s: string): string {
  const t = s.trim()
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t
}
function lowerFirst(s: string): string {
  const t = s.trim()
  return t ? t.charAt(0).toLowerCase() + t.slice(1) : t
}
function withPeriod(s: string): string {
  const t = s.trim()
  if (!t) return t
  return /[.!?]["'”’)\]]*$/.test(t) ? t : `${t}.`
}

/*
 * U.9 RE-REVIEW: "IS SEEN DIFFERENTLY" ONLY WHEN THE TOPIC DOES NOT ALREADY SAY SO.
 * `differencesSentence` used to append "is seen differently" to the topic unconditionally, so a
 * topic the report already worded as its own claim of difference ("The main obstacle to signing
 * new shops is seen differently") came out doubled: "…is seen differently is seen differently."
 * `endsSeenDifferently` checks case-insensitively, and ignores a final full stop, so both the
 * worded and the unworded shape of the same topic are handled.
 */
function endsSeenDifferently(s: string): boolean {
  return /is seen differently\.?$/i.test(s.trim())
}

function differencesSentence(value: string, sub: string): string {
  const n = /^\d+$/.test(value) ? Number(value) : null
  if (n != null) {
    const lead = `People see ${smallWord(n)} thing${n === 1 ? '' : 's'} differently.`
    const generic = /as the written report reads it|still to answer|no agreement and no gap yet/.test(sub)
    if (generic) return `${lead} ${withPeriod(capitalize(sub))}`
    const more = sub.match(/^(.+), and (\d+) more$/)
    if (more) {
      const extra = Number(more[2])
      const topic = capitalize(more[1])
      const topicSentence = endsSeenDifferently(topic) ? withPeriod(topic) : `${topic} is seen differently.`
      return `${lead} ${topicSentence.replace(/\.$/, '')}, and ${smallWord(extra)} more thing${extra === 1 ? '' : 's'} ${extra === 1 ? 'is' : 'are'} too.`
    }
    const topic = capitalize(sub)
    return endsSeenDifferently(topic) ? `${lead} ${withPeriod(topic)}` : `${lead} ${topic} is seen differently.`
  }
  if (value === 'None') return `Nobody sees anything differently. ${withPeriod(capitalize(sub))}`
  return `There is nothing to compare yet. ${withPeriod(capitalize(sub))}`
}

function movementSentence(value: string, sub: string): string {
  const gained = value.match(/^\+(\d+)$/)
  if (gained) {
    const n = Number(gained[1])
    return `${capitalize(smallWord(n))} target${n === 1 ? '' : 's'} moved this session.`
  }
  if (value === 'None' && /no target moved this session/.test(sub)) return 'No target moved this session.'
  const set = sub.match(/^(\d+) targets? set, and no round has closed to measure from$/)
  if (set) {
    const n = Number(set[1])
    return `Nothing has moved yet. ${capitalize(smallWord(n))} target${n === 1 ? '' : 's'} ${n === 1 ? 'is' : 'are'} set, and no session has closed to measure ${n === 1 ? 'it' : 'them'} against.`
  }
  return `Nothing has moved yet. ${withPeriod(capitalize(sub))}`
}

function blockersSentence(value: string, sub: string): string {
  const n = /^\d+$/.test(value) ? Number(value) : null
  if (n != null) {
    const lead = `${capitalize(smallWord(n))} thing${n === 1 ? '' : 's'} ${n === 1 ? 'is' : 'are'} blocking work`
    if (sub === 'named as holding work up') return `${lead}.`
    const more = sub.match(/^(.+), and (\d+) more$/)
    if (more) {
      const extra = Number(more[2])
      return `${lead}, ${lowerFirst(more[1])}, and ${smallWord(extra)} more thing${extra === 1 ? '' : 's'} ${extra === 1 ? 'is' : 'are'} blocking work too.`
    }
    return `${lead}, ${lowerFirst(sub)}.`
  }
  const waiting = value.match(/^(\d+) waiting$/)
  if (waiting) {
    const n2 = Number(waiting[1])
    return `${capitalize(smallWord(n2))} ${n2 === 1 ? 'person is' : 'people are'} waiting on somebody else, ${lowerFirst(sub)}.`
  }
  const worry = value.match(/^(\d+) worr(?:y|ies)$/)
  if (worry) return withPeriod(capitalize(sub))
  return `Nothing is blocking work. ${withPeriod(capitalize(sub))}`
}

function howMuchWasSaidSentence(value: string): string {
  const pct = value.match(/^(\d+)% documented$/)
  if (pct) return `${pct[1]} of every 100 things people said have a document behind them.`
  if (value === 'All from memory') return 'Nothing said this session was anchored to a document. It is all from memory.'
  return 'There is nothing on record yet, so there is nothing to check against a document.'
}

export function tileSentence(r: { label: string; value: string; sub: string }): string {
  const value = (r.value ?? '').trim()
  const sub = (r.sub ?? '').trim()
  switch (r.label) {
    case 'Differences': return differencesSentence(value, sub)
    case 'Movement': return movementSentence(value, sub)
    case 'Blockers': return blockersSentence(value, sub)
    case 'How much was said': return howMuchWasSaidSentence(value)
    default: return sub ? `${withPeriod(capitalize(value))} ${withPeriod(capitalize(sub))}` : withPeriod(capitalize(value))
  }
}

export function TheSessionsReport({ groundId, sessionNumber, totalInThisRound }: {
  groundId: string
  sessionNumber: number
  /**
   * U.9 REVIEW FIX 6: THE SAME COUNT AS THE CHECK-IN HEADER.
   *
   * Engine request 56: this session's own `counting` can leave somebody out of the total (walked
   * live: "4 of 5" here beside "4 of 6" on the check-in's own header, because the session report's
   * count and the rest of the product count differently). That is the server's read to fix; on
   * this screen, when the host page already knows the true total (the same figure the check-in's
   * header uses, via `whoIsInRound`), it is passed in here and used instead of `counting.length`
   * whenever the two disagree, so a reader is never shown two different totals for one check-in.
   */
  totalInThisRound?: number | null
}) {
  const [byPerson, setByPerson] = useState(false)
  const { data, isLoading, isError } = useQuery({
    queryKey: ['session-shaped-report', groundId, sessionNumber],
    queryFn: () => reportsApi.sessionReport(groundId, sessionNumber),
    enabled: !!groundId && !!sessionNumber,
  })
  /*
   * WHEN IT LAST CHANGED, WHILE IT IS STILL CHANGING (U.9, team-report.txt).
   *
   * A report that is still forming is the check-in's current report, which is rebuilt only when
   * something new comes in. The prototype says when that last happened. The session's own read
   * carries no time until the round closes, so the time comes from the check-in's report, under
   * the key every other page already uses for it: one request, and nothing is rebuilt by asking.
   */
  const { data: current } = useQuery({
    queryKey: ['report', groundId],
    queryFn: () => reportsApi.get(groundId),
    enabled: !!groundId && !!data && (data as any).state !== 'final',
    retry: false,
  })
  const lastChanged: string | null = (current as any)?.updatedAt ?? (current as any)?.createdAt ?? null
  const lastChangedLine = lastChanged ? lastUpdated(lastChanged) : null
  /* The read is computed when asked for and takes ten to twenty seconds. Say so, or it looks stuck. */
  if (isLoading) return <div className="gwui-fs-13 gwui-ink-muted">Reading everybody&apos;s side of this session. It takes a moment.</div>
  if (isError || !data) return null

  /**
   * ANSWERS FROM THE ENGINE, 51: WITHHELD UNTIL YOU ANSWER.
   *
   * Before the report is released, a participant who has not answered THIS session gets only
   * `{ sessionNumber, withheldUntilYouAnswer: true, saying }` - none of the detail below, which is
   * exactly what reading somebody else's account before writing your own would be. Shown the same
   * way SharedReportForAParty.tsx already shows the round-level version of this.
   */
  if ((data as any).withheldUntilYouAnswer) {
    return (
      <div className="gwui-rule-blue gwui-pt-14 gwui-pr-16 gwui-pb-14 gwui-pl-16" style={{ background: 'var(--gw-blue-bg)', borderRadius: 10 }}>
        <div className="gwui-fs-13 gwui-ink-navy gwui-mb-4" style={{ fontWeight: 700 }}>
          There is a picture forming, and you have not answered yet
        </div>
        <div className="gwui-fs-13 gwui-ink-blue" style={{ lineHeight: 1.6 }}>
          {(data as any).saying}
        </div>
      </div>
    )
  }

  const d = data as any

  const final = d.state === 'final'
  const amended = !!d.amendedAt
  const yourName: string | null = d.counting?.find((c: any) => c.isYou)?.who ?? null
  const answered = (d.counting ?? []).filter((c: any) => c.answered).length
  const countedTotal = (d.counting ?? []).length
  const ofPeople = totalInThisRound != null && totalInThisRound > countedTotal ? totalInThisRound : countedTotal

  /* The board's two sections, refused by name rather than by silence: a later change to the section
     list cannot quietly put a run read back onto the page about one session. */
  const themed = (d.sections ?? [])
    .filter((x: any) => THEMES.includes(x.title) && !NOT_ON_A_SESSION.includes(x.title))
  const restsOn = (d.sections ?? []).filter((x: any) => RESTS_ON.includes(x.title))

  const settled: string[] = d.whereThingsStand?.settled ?? []
  const open: string[] = d.whereThingsStand?.open ?? []
  /*
   * AND WHY EACH OPEN ONE IS OPEN.
   *
   * This section rendered the titles and nothing else: a live three-person report showed "Where
   * things stand" holding the single line "The definition of success". Her verdict was that the
   * report had no reasoning in it at all, and she was right - the reasoning was in the data and
   * this drew the headline.
   *
   * Falls back to the plain strings, so a report generated before the reasoning existed still
   * renders exactly as it did.
   */
  const openReasoned: {
    topic: string
    positions: { who: string; view: string }[]
    restsOn: string[]
    atStake: string | null
    settledBy: string | null
  }[] = d.whereThingsStand?.openWithReasons ?? []
  const definitions: { who: string | null; text: string }[] = d.againstSuccess?.definitions ?? []
  /*
   * A ONE-TIME LISTENING SESSION LEADS WITH WHERE THE ROOM POINTS. The server sends `direction` for a
   * discovery ground and drafts the finding from it; the lists are drawn under the finding, so the
   * finding itself is the one line that says what the room named, not the eight lists in a paragraph.
   */
  const direction = d.direction ?? null
  const rawFinding: { key: string; text: string; basis: string | null; wouldHaveSurfaced?: string | null } | null = d.finding ?? null
  const finding = rawFinding && direction && rawFinding.key === 'direction'
    ? { ...rawFinding, text: rawFinding.text.split(/(?<=[.!?])\s+/)[0] }
    : rawFinding
  const picture: { key: string; text: string }[] = d.picture ?? (d.pictureLines ?? []).map((t: string, i: number) => ({ key: `l${i}`, text: t }))
  const rest = picture.filter((l) => l.key !== 'basis' && l.key !== 'reads' && l.key !== 'written' && l.key !== 'direction' && l.key !== finding?.key)

  /* Numbered by what is DRAWN. Fixed numbers skip when a block has nothing, and 02 · 04 · 05 reads
     as pieces missing rather than as a report with four blocks. */
  let step = 0
  const next = () => (step += 1)

  return (
    <div className="gw-sr gwui-rule" style={{ background: 'white', borderRadius: 12, overflow: 'hidden' }}>
      <style>{SHEET}</style>

      {/*
        ── The masthead: where you are in it. No title of its own here any more - every page that
        draws this card already carries its own "Session N" heading above it (SessionReportPage,
        RoundReportPage), so a second one here, falling back to the same words when nobody had set
        an objective, read three times on one screen: the page's own heading, this one, then
        "Session N" again inside the count sentence below. One heading, said once, above the card.
      */}
      <div className="gwui-pt-16 gwui-pr-20 gwui-pb-16 gwui-pl-20">
        <div className="gwui-fs-14 gwui-ink-text" style={{ lineHeight: 1.5 }}>
          {sessionAndWhoCheckedIn(d.sessionNumber, d.plannedSessions ?? null, answered, ofPeople)}
        </div>
        {final && (
          <div className="gwui-fs-13-5 gwui-ink-sub gwui-mt-2">{SHARED_WITH_THE_TEAM}</div>
        )}
      </div>

      {/*
        WHO IS COUNTED, AND WHICH OF THEM IS YOU.
        
        Part of the masthead rather than a numbered block: the header says how many people, and
        this says whose. It names people rather than printing a number, says which one the reader
        is, and never counts somebody who was never going to answer - all three are the rule this
        row exists for, and I dropped the whole row in the rebuild before a spec caught it.
      */}
      {(d.counting ?? []).length > 0 && (
        <div className="gwui-rule-top gwui-pt-12 gwui-pr-20 gwui-pb-12 gwui-pl-20 gwui-gap-6-20" style={{ display: 'flex', flexWrap: 'wrap' }}>
          {d.counting.map((c: any, i: number) => (
            <span key={i} className={`gwui-fs-13 ${c.answered ? 'gwui-ink-text' : 'gwui-ink-sub'}`}>
              {hasCheckedIn(c)}
            </span>
          ))}
        </div>
      )}

      {/* ── The finding, first and alone. One sentence the engines stand behind. */}
      {finding && (
        <div className="gwui-rule-top gwui-pt-16 gwui-pr-20 gwui-pb-16 gwui-pl-20" style={{ background: 'var(--gw-amber-bg)' }}>
          <div className={`${LABEL_CLASS} gwui-ink-amber gwui-mb-8`} style={LABEL_STYLE}>The finding</div>
          <p className="gw-find gwui-m-0 gwui-ink-text" style={{ maxWidth: '58ch' }}>{finding.text}</p>
          {finding.basis && (
            <small className="gw-find-why gwui-ink-amber gwui-mt-8" style={{ display: 'block' }}>{finding.basis}</small>
          )}
          {/* When it would have come up on its own. Under the finding and nowhere else: alone it is a
              remark about a calendar; here it is why the finding matters now rather than later. */}
          {finding.wouldHaveSurfaced && (
            <small className="gw-find-why gwui-ink-amber gwui-mt-6" style={{ display: 'block', opacity: .85 }}>
              {finding.wouldHaveSurfaced}
            </small>
          )}
        </div>
      )}

      {/* ── Where the room points, on a one-time session: the lists, most-named first, under the finding. */}
      {direction && (
        <Row n={next()} label="What the room named, most-named first">
          <WhereToFocus direction={direction} />
        </Row>
      )}

      {/*
        ── At a glance. Four states in a row, each said as one or two full sentences.
        U.9 THIRD REVIEW, ITEM 2: EACH TILE WAS STILL A LABEL, A FIGURE AND A FRAGMENT, STACKED.
        "Differences / 1. / still open, as the written report reads it" read as three disconnected
        pieces, not one thing to read, even once the label was moved off-screen for sight. Each
        tile now reads as `tileSentence` composes it - "People see one thing differently. The main
        obstacle to signing new shops is seen differently." - from the same `label`, `value` and
        `sub` the server sends. The label stays for anybody using a screen reader, without being
        shown as a heading of its own.
      */}
      {(d.atAGlance ?? []).length > 0 && (
        <div className="gwui-rule-top" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
          {d.atAGlance.map((r: any, i: number) => (
            <div key={r.label} className={i > 0 ? 'gw-tile gw-tile-n' : 'gw-tile'}>
              <span className="gw-sr-only">{r.label}</span>
              <div className={`gw-tile-txt ${r.tone === 'good' ? 'gwui-ink-green' : r.tone === 'watch' ? 'gwui-ink-amber' : 'gwui-ink-text'}`}>
                {tileSentence(r)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/*
        ── 01 · what this sits under, where anything does. It qualifies the objective, so it leads.

        PLAIN WORDS FOR THE THREE HEADINGS SHE COULD NOT READ.

        "Nothing above this", "Against what good looks like" and "What this rests on" are the
        product describing its own structure to itself. Somebody opening their report reads a
        heading to find out what is under it, and none of these three said.

        What each one actually holds: whether this objective sits under a bigger one; the objective
        set against each person's version of it; and where the report got what it knows. The new
        headings say those.
      */}
      {/*
        U.9 THIRD REVIEW, ITEM 3: STILL THE PRODUCT DESCRIBING ITS OWN STRUCTURE. "This is the top
        of it; nothing sits above it" and "What this sits under, and what the objective serves" are
        both about "it" without ever saying what "it" is - a heading joined with a semicolon on top
        of that. Said plainly instead: whether this objective is part of a bigger one, or nobody has
        said so yet.
      */}
      {d.cascade && (
        <Row n={next()} label={d.cascade.isCascade ? 'This is part of a bigger goal.' : 'Nobody has said what bigger goal this is part of.'}>
          {d.cascade.parentNamed && (
            <p className="gwui-m-0 gwui-mb-6 gwui-fs-15 gwui-ink-text" style={{ fontWeight: 600, lineHeight: 1.35 }}>{d.cascade.parentNamed}</p>
          )}
          <p className="gwui-m-0 gwui-fs-13-5 gwui-ink-sub" style={PROSE}>{d.cascade.why}</p>
        </Row>
      )}

      {/*
        ── What this is for. The full band: the stated objective and each person's own version.
        U.9 END-OF-MODULE API SUITE: THE LABEL IS THE ONE `the-four-reports.ts` DECLARES.
        `the-order-is-the-order-on-screen.spec.ts` checks this block against
        `WHAT_THE_BLOCK_IS_CALLED.againstWhatGoodLooksLike`, the engine's own plain heading "What
        everybody said good looks like" - not this screen's longer phrasing. "Each person's own
        version of it" is still true and still on the page, in the definitions drawn underneath;
        it belongs there, not appended to the one string both sides have to agree on byte for byte.
      */}
      {d.againstSuccess && (
        <Row n={next()} label="What everybody said good looks like">
          <WhatSuccessLooksLike data={{ ...d.againstSuccess, definitions: [] }} yourName={yourName} headingIsTheCallers />
          {definitions.length > 0 && (
            <div className="gwui-gap-10 gwui-mt-12" style={{ display: 'grid' }}>
              {definitions.map((def, i) => (
                <div key={i}>
                  <div className="gwui-fs-13-5 gwui-ink-text" style={{ fontStyle: 'italic', ...PROSE }}>{def.text}</div>
                  <Cite
                    who={def.who === null || (yourName && def.who === yourName) ? 'You' : def.who!}
                    isYou={def.who === null || (yourName && def.who === yourName) || false}
                  />
                </div>
              ))}
            </div>
          )}
        </Row>
      )}

      {/* ── Where things stand. Still open leads: it is the half somebody can act on. */}
      {(settled.length > 0 || open.length > 0) && (
        <Row n={next()} label="Where things stand">
          <div className="gwui-gap-8" style={{ display: 'grid' }}>
            {openReasoned.length
              ? openReasoned.map((o, i) => (
                <div key={i} className="gwui-gap-10" style={{ display: 'grid', gridTemplateColumns: '10px 1fr', alignItems: 'start' }}>
                  <span aria-hidden className="gwui-mt-6" style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--gw-amber-b)' }} />
                  <div className="gwui-gap-6" style={{ display: 'grid' }}>
                    <p className="gwui-m-0 gwui-fs-13-5 gwui-ink-text" style={{ fontWeight: 600, ...PROSE }}>{o.topic}</p>
                    {o.positions.length > 0 && (
                      <div className="gwui-gap-3" style={{ display: 'grid' }}>
                        {o.positions.map((p, j) => (
                          <p key={j} className="gwui-m-0 gwui-fs-13 gwui-ink-text" style={PROSE}>
                            <span className="gwui-ink-sub">{p.who}: </span>{p.view}
                          </p>
                        ))}
                      </div>
                    )}
                    {/*
                      U.9 REVIEW FIX 12: A CAPTION ABOVE ITS OWN PARAGRAPH, NOT A LABEL AND A COLON.
                      "Why it matters: {atStake}" and "What settles it: {settledBy}" joined a label
                      to a sentence with a colon, which reads as a table row. Each is now a small
                      caption above its own full sentence, the same pattern the block's own note
                      already uses.
                    */}
                    {o.atStake && (
                      <div className="gwui-mt-2">
                        <p className="gwui-m-0 gwui-mb-2 gwui-fs-13 gwui-ink-sub">Why this matters</p>
                        <p className="gwui-m-0 gwui-fs-13 gwui-ink-text" style={PROSE}>{o.atStake}</p>
                      </div>
                    )}
                    {o.settledBy && (
                      <div className="gwui-mt-2">
                        <p className="gwui-m-0 gwui-mb-2 gwui-fs-13 gwui-ink-sub">What would settle it</p>
                        <p className="gwui-m-0 gwui-fs-13 gwui-ink-text" style={PROSE}>{o.settledBy}</p>
                      </div>
                    )}
                    {o.restsOn.length > 0 && (
                      <Folded summary="The lines this comes from">
                        <div className="gwui-gap-4 gwui-mt-6" style={{ display: 'grid' }}>
                          {o.restsOn.map((r, j) => (
                            <p key={j} className="gwui-m-0 gwui-fs-13 gwui-ink-sub" style={{ fontStyle: 'italic', ...PROSE }}>{r}</p>
                          ))}
                        </div>
                      </Folded>
                    )}
                  </div>
                </div>
              ))
              : open.length
                ? open.map((t, i) => (
                  <div key={i} className="gwui-gap-10" style={{ display: 'grid', gridTemplateColumns: '10px 1fr', alignItems: 'start' }}>
                    <span aria-hidden className="gwui-mt-6" style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--gw-amber-b)' }} />
                    <p className="gwui-m-0 gwui-fs-13-5 gwui-ink-text" style={PROSE}>{t}</p>
                  </div>
                ))
                : <p className="gwui-m-0 gwui-fs-13 gwui-ink-sub">Nothing is open. Everything anybody raised has been settled.</p>}
          </div>
          {settled.length > 0 && (
            <div className="gwui-mt-12">
              <Folded summary={`What everybody agrees (${settled.length})`}>
                <div className="gwui-gap-8 gwui-mt-8" style={{ display: 'grid' }}>
                  {settled.map((t, i) => <p key={i} className="gwui-m-0 gwui-fs-13-5 gwui-ink-text" style={PROSE}>{t}</p>)}
                </div>
              </Folded>
            </div>
          )}
        </Row>
      )}

      {/* ── What each person said they did. Folded: long, and their own work only. */}
      {themed.length > 0 && (
        <Row n={next()} label="What people said this session">
          <div className="gwui-gap-10 gwui-mb-8" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span className="gwui-fs-13 gwui-ink-sub">Each person&apos;s own work, in their own words.</span>
            <button
              onClick={() => setByPerson(v => !v)}
              className="gwui-p-0 gwui-rule-none gwui-fs-13 gwui-ink-navy" style={{ background: 'none', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', flexShrink: 0 }}
            >
              {byPerson ? 'Group by theme' : 'Group by person'}
            </button>
          </div>
          <Folded summary={byPerson ? `What each of the ${(d.whatEachPersonSaid ?? []).length} said` : `All ${themed.length} groups`}>
            <div className="gwui-gap-16 gwui-mt-10" style={{ display: 'grid' }}>
              {byPerson
                ? (d.whatEachPersonSaid ?? []).map((p: any, i: number) => (
                  <div key={i}>
                    {/* U.9 RE-REVIEW, ITEM A: "a colleague" as a heading is capitalised, like the
                        start of any other sentence or line - `atTheStart` only touches the plain
                        phrases this can fall back to, never a real name. */}
                    <div className="gwui-fs-13 gwui-ink-text gwui-mb-6" style={{ fontWeight: 700 }}>
                      {p.isYou ? `${p.who} (you)` : atTheStart(p.who)}
                    </div>
                    {p.saying && <div className="gwui-fs-13 gwui-ink-sub" style={PROSE}>{p.saying}</div>}
                    {/* The product's own finding for this person, from the record: purpose, standing, the lead's number against theirs, the gap. */}
                    {p.finding && <div className="gwui-fs-13 gwui-ink-text gwui-mt-6 gwui-pt-8 gwui-pr-10 gwui-pb-8 gwui-pl-10" style={{ borderLeftWidth: 3, borderLeftStyle: 'solid', borderLeftColor: p.hasGap ? 'var(--gw-amber-b)' : 'var(--gw-border)', ...PROSE }}>{p.finding}</div>}
                    {p.lines?.length ? (
                      <div className="gwui-gap-8" style={{ display: 'grid' }}>
                        {p.lines.map((l: string, j: number) => (
                          <div key={j} className="gwui-fs-13-5 gwui-ink-text" style={{ fontStyle: 'italic', ...PROSE }}>{l}</div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))
                : themed.map((sec: any) => (
                  <div key={sec.title}>
                    <div className="gwui-fs-13 gwui-ink-text gwui-mb-8" style={{ fontWeight: 700 }}>{sec.title}</div>
                    {sec.items.length > 0
                      ? <Quotes items={sec.items} yourName={yourName} />
                      : <div className="gwui-fs-13 gwui-ink-sub" style={PROSE}>{sec.saying}</div>}
                    {sec.note && <div className="gwui-fs-13 gwui-ink-sub gwui-mt-8" style={PROSE}>{sec.note}</div>}
                  </div>
                ))}
            </div>
          </Folded>
        </Row>
      )}

      {/* ── The picture from everybody. The long read of the finding, after the sharp part. */}
      {rest.length > 0 && (
        <Row n={next()} label="The picture from everybody">
          <div className="gwui-gap-10" style={{ display: 'grid' }}>
            {rest.map((l) => <p key={l.key} className="gwui-m-0 gwui-fs-13-5 gwui-ink-text" style={PROSE}>{l.text}</p>)}
          </div>
        </Row>
      )}

      {/*
        ── What went quiet. Somebody was waiting on it and nobody has said it is resolved.
        U.9 END-OF-MODULE API SUITE: THE PLAIN HEADING `notRaisedAgain` DECLARES ("Not raised
        again"), not this screen's longer phrasing. "After somebody was waiting on it" is still
        true - it is what the sentence underneath says.
      */}
      {d.whatWentQuiet && (
        <Row n={next()} label="Not raised again">
          <p className="gwui-m-0 gwui-fs-13-5 gwui-ink-text" style={PROSE}>{d.whatWentQuiet}</p>
        </Row>
      )}

      {/* ── The one conversation worth having. Boxed, because it is the thing to do next. */}
      {d.theConversationWorthHaving ? (
        <div className="gwui-rule-top gwui-pt-18 gwui-pr-20 gwui-pb-18 gwui-pl-20" style={{ background: 'var(--gw-blue-bg)' }}>
          {/* U.9 REVIEW FIX 12: no more "06 THE CONVERSATION WORTH HAVING NOW" - a number and a
              shout on a heading that already reads plainly as a sentence in itself. `next()` still
              advances `step`, which the "nothing yet" empty state below reads. */}
          {(() => { next(); return null })()}
          <div className={`${LABEL_CLASS} gwui-ink-navy gwui-mb-6`} style={LABEL_STYLE}>
            The conversation worth having now
          </div>
          <p className="gwui-m-0 gwui-fs-16 gwui-ink-text" style={{ lineHeight: 1.45, fontWeight: 600, maxWidth: '58ch' }}>{d.theConversationWorthHaving}</p>
        </div>
      ) : d.whyNoQuestion ? (
        <Row n={next()} label="The conversation worth having now">
          <p className="gwui-m-0 gwui-fs-13 gwui-ink-sub" style={PROSE}>{d.whyNoQuestion}</p>
        </Row>
      ) : null}

      {/* ── What this rests on. The method, last and folded: a caveat above what it qualifies is
             read as a verdict on it. */}
      <Row n={next()} label="What this is built from">
        <Folded summary="How much there is to go on, and what it is built from">
          <div className="gwui-mt-10">
            {d.confidence && <HowMuchThereIsToGoOn read={d.confidence} />}
            {restsOn.map((sec: any) => (
              <div key={sec.title} className="gwui-mt-12">
                {sec.items.length > 0
                  ? <Quotes items={sec.items.map((it: any) => ({ ...it, text: asFileIsKindSentence(it.text) }))} yourName={yourName} />
                  : <div className="gwui-fs-13 gwui-ink-sub" style={PROSE}>{sec.saying}</div>}
              </div>
            ))}
          </div>
        </Folded>
      </Row>

      {/* ── The promise, and what state this is in. */}
      <div className={`${ROW_CLASS} gwui-fs-13 gwui-ink-sub`} style={{ lineHeight: 1.6 }}>
        {!final && lastChangedLine && (
          <span className="gwui-mb-4" style={{ display: 'block' }}>{lastChangedLine}</span>
        )}
        {!final
          ? 'People are still answering, so this moves. '
          : amended
            ? `Closed ${d.takenAt ? whenItWas(d.takenAt, 'day') : ''} and updated since, when somebody corrected their own check-in. `
            : `Closed ${d.takenAt ? whenItWas(d.takenAt, 'day') : ''}. This does not change. `}
        {d.showsEverybody
          ? 'Everybody in this check-in reads this same report. Nothing here decides who is right.'
          : 'Until the shared report is out, the words above are your own. The counts are from everybody’s answers. Nobody else’s wording reaches you and yours does not reach them.'}
      </div>
    </div>
  )
}
