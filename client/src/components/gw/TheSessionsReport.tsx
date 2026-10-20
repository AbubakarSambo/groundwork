import { useTheDirectMorning } from '@/lib/the-direct-morning'
import { createContext, useContext, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Folded } from './two-accounts-side-by-side'
import { useQuery } from '@tanstack/react-query'
import { reportsApi, type SessionShapedReport } from '@/api/reports'
import { WhatSuccessLooksLike } from './WhatSuccessLooksLike'
import { HowMuchThereIsToGoOn } from './HowMuchThereIsToGoOn'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { WhereToFocus } from './where-to-focus'
import { atTheStart } from '@/lib/a-colleague'
import { Panel, SubHeading, Note, Callout, EdgeList, EdgeRow, FoldedLine, SmallMenu, UpdatedLine } from '@/components/gw/ui'
import { whenTheBoardLastChangedInShort } from '@/pages/board/when-the-board-last-changed'
import { splitAtFieldNames, readableWithoutFieldNames } from '@/lib/no-field-names-on-the-page'

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
 *
 * GROUP 3's DRIFT-LIST REVIEW, PART 1 (Hafsah, 1 October 2026): REBUILT FROM THE SHARED PARTS.
 * About fifty one-off utility classes (`gwui-fs-*`, `gwui-gap-*`, `gwui-ink-*`, `gwui-m*`,
 * `gwui-p*`) and the inline styles sitting beside them are gone. The outer card is now `Panel`
 * (`pad={false}`, since the card needs full-bleed colour bands the finding and the conversation
 * worth having both use); `withheldUntilYouAnswer` and "the conversation worth having now" - the
 * two blue boxes, including the one that once carried its own one-off blue-rule class - are now
 * `Callout`; the
 * loading line is `Note`; and each "still open" topic under "Where things stand" is now an
 * `EdgeList`/`EdgeRow`, its amber accent spur standing in for the hand-drawn dot this file used to
 * paint itself. The local `Row` component keeps its name and its `label`/`n` props exactly -
 * `the-order-comes-from-one-place.spec.ts` reads this file's own source for `<Row ... label=...>`
 * - but draws its label with `SubHeading` now, not a bespoke bold-and-muted span. What is left
 * after that is content this report alone has no other shared part for (the quote-and-citation
 * pairing, the at-a-glance tiles, the amber finding band): each is a named class in `gw-ui.css`
 * (`.gwui-sr-quote`, `.gwui-tile-grid`, and the rest), prefixed `gwui-` like every other shared
 * part. `Section` and `Tag` are not used here: this component has no page-level heading of its
 * own (the page that draws it already supplies one), and nothing on it is the short, unpunctuated
 * fact `Tag` is for - "Shared with the team." is a sentence the prototype prints as plain text
 * (one-session.txt), not a pill. See docs/the-parts-against-the-prototype.md.
 *
 * GROUP 3's DRIFT-LIST REVIEW, PART 2 (Hafsah, 1 October 2026): THE COMPONENT'S OWN STYLE TAG IS GONE.
 * The 46 classes that local stylesheet carried (`.gwui-sr*`, `.gwui-tile*`, `.gwui-find*`) are the
 * same drift as a one-off utility class in another file's inline style, just hidden from both
 * class guards by living inside a component's own style element instead of `gw-ui.css`. Every value is
 * unchanged; only the file they are written in moved, from this component's own `SHEET` constant
 * into `gw-ui.css`, written up in `docs/the-parts-against-the-prototype.md`.
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

/**
 * THE SHARED REPORT, IN THE SHAPE THE MARKETING PAGE PROMISES.
 *
 * The example reports on the marketing site are one card: a header line, the finding in amber with
 * its basis small underneath, the four states in a row, the words people gave as quotes with a
 * small cite, the two sides of a difference side by side, and one boxed thing to settle first. This
 * page had the same facts as eleven headings of prose. Every block below is one of the card's rows;
 * the facts and their sources are unchanged, only the shape is.
 *
 * EVERY CLASS THIS CARD DRAWS FROM LIVES IN `gw-ui.css` NOW, NOT IN A LOCAL STYLE ELEMENT. Each is
 * named for the thing it draws, the way `.gwui-edge-h`/`.gwui-panel-text` are, not for the raw
 * value it happens to carry - the difference between a shared part and the one-off classes this
 * rebuild removed.
 *
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
    <div className="gwui-sr-cite">
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
    <div className="gwui-sr-quotes">
      {items.map((it, i) => (
        <div key={i}>
          <div className="gwui-sr-quote">{it.text}</div>
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
 *
 * GROUP 3's DRIFT-LIST REVIEW (1 October 2026): keeps its name and its `label`/`n` props exactly -
 * `the-order-comes-from-one-place.spec.ts` reads this file's own source for `<Row ... label=...>` -
 * but draws the label with `SubHeading` now, not the bespoke bold-and-muted span this file used to
 * build by hand, and the row itself with the local `.gwui-sr-row` class in place of the five
 * one-off top-rule and padding utilities it used to carry.
 */
/** Inside the light report a part's own label is the folded line's name, so it is not said twice. */
const RowLabelsHidden = createContext(false)

function Row({ label, children, style }: {
  /** Kept on the interface so call sites (and the-order-comes-from-one-place test) are unchanged;
      no longer drawn - see the note below. */
  n?: number
  label?: string
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  const labelsHidden = useContext(RowLabelsHidden)
  return (
    <div className="gwui-sr-row" style={style}>
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
      {label && !labelsHidden && <SubHeading>{label}</SubHeading>}
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
/*
 * HOW IT WAS SHARED, TRULY (pilots, 13 October 2026, E10). Grace read "Shared with the team." on a report she never shared:
 * a session's report reaches the people in it by itself, when the session closes. The sentence says so, the way the
 * prototype says when ("Shared with the team that evening").
 */
export const SHARED_WITH_THE_TEAM = 'Shared with the team when this session closed.'

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

/**
 * RELEASE WALKTHROUGH A, FIX 2: THE SAME PERSON, NAMED TWICE.
 *
 * `{who} said {lowerFirst(view)}` assumed `view` never itself opened with the person's name - but
 * the served view already does: "Amani Wekesa said amani Wekesa stated an aim..." and "You said you
 * stated...". When the view already begins with this reader's displayed name (or "You"), the name
 * is said once, as a plain sentence; otherwise the "{who} said ..." frame stays, unchanged.
 */
function startsWithPerson(view: string, displayWho: string): boolean {
  return view.trim().toLowerCase().startsWith(displayWho.trim().toLowerCase())
}

/**
 * REQUEST 174, ITEM 7: "AMANI WEKESA SAID DESCRIBES THE START DATE AS OCTOBER 1ST…"
 *
 * The served `view` is the judgement model's own prose about where somebody stands
 * (reports.service.ts, `REPORT_SCHEMA.divergences.positions.view`, "how this person described it,
 * in plain language") - nothing in that shape says whether the words are a literal quote of theirs
 * or the product's own sentence about them, so there is no served flag to read. What the text
 * itself shows is whether it already has a subject of its own. "Competitor pricing is the main
 * obstacle." is a complete clause about the topic, not the person - there is nowhere for a name to
 * go without "said" in front of it, and that is the correct, existing case. "describes the start
 * date as October 1st" and "is waiting for budget approval" are the opposite: bare predicates with
 * no subject, written to be read as "{who} describes ..." / "{who} is waiting ...". Joining
 * "{who} said" onto one of these puts a verb where a noun belongs ("Amani Wekesa said describes
 * ...").  Never a literal quote either way - the person's own words are never invented, only the
 * product's existing sentence is placed where its missing subject belongs.
 *
 * THE MODEL ALWAYS WRITES THE THIRD-PERSON FORM (its schema's `participantLabel` is never "you"),
 * so when the reader is reading their own row the verb has to be re-conjugated too, or "is waiting"
 * becomes "You is waiting" - a name swapped in without the grammar following it.
 */
const BARE_VERB_FORMS: Record<string, string> = {
  is: 'are', was: 'were', has: 'have', does: 'do', did: 'did',
  remains: 'remain', stays: 'stay', continues: 'continue', keeps: 'keep',
  describes: 'describe', states: 'state', confirms: 'confirm', believes: 'believe',
  feels: 'feel', thinks: 'think', wants: 'want', needs: 'need', expects: 'expect',
  hopes: 'hope', worries: 'worry', insists: 'insist', maintains: 'maintain',
  argues: 'argue', agrees: 'agree', disagrees: 'disagree', sees: 'see', views: 'view',
  considers: 'consider', regards: 'regard', reports: 'report', notes: 'note',
  claims: 'claim', assumes: 'assume', prefers: 'prefer', intends: 'intend', plans: 'plan',
  counts: 'count', holds: 'hold', says: 'say', wonders: 'wonder', questions: 'question', doubts: 'doubt',
  /*
   * B-059: PAST-TENSE OLD DATA OPENS WITH ITS VERB TOO. E1 on Riverbank Trading's old data
   * (docs/existing-users-check.md) found reports stored by the old engine whose `view` already
   * opened with a past-tense verb - "described success in terms of a three-month outcome.",
   * "stated the rewrite was 'shipped' in session 2." - and `openingBareVerb` only knew the present
   * tense, so the default case ran and glued "said" onto a sentence that already had its own verb:
   * "Ines Barros said described success...", "You said stated...". English past tense does not
   * change with the subject (unlike "is"/"are"), so every one of these maps to itself - the one
   * exception kept exactly as the present-tense table above keeps it, "was" to "were".
   */
  described: 'described', stated: 'stated', confirmed: 'confirmed', believed: 'believed',
  felt: 'felt', thought: 'thought', wanted: 'wanted', needed: 'needed', expected: 'expected',
  hoped: 'hoped', worried: 'worried', insisted: 'insisted', maintained: 'maintained',
  argued: 'argued', agreed: 'agreed', disagreed: 'disagreed', saw: 'saw', viewed: 'viewed',
  considered: 'considered', regarded: 'regarded', reported: 'reported', noted: 'noted',
  claimed: 'claimed', assumed: 'assumed', preferred: 'preferred', intended: 'intended',
  planned: 'planned', counted: 'counted', held: 'held', said: 'said', wondered: 'wondered',
  questioned: 'questioned', doubted: 'doubted', remained: 'remained', stayed: 'stayed',
  continued: 'continued', kept: 'kept', had: 'had', wished: 'wished',
}

/** The bare verb `view` opens with, if it is one of the forms above - null for a view that is a
    complete clause with its own subject, which still needs "{who} said" in front of it. */
function openingBareVerb(view: string): string | null {
  const m = view.trim().match(/^([A-Za-z]+)\b/)
  if (!m) return null
  const w = m[1].toLowerCase()
  return w in BARE_VERB_FORMS ? w : null
}

export function sayWhatTheySaid(who: string, view: string, yourName?: string | null): string {
  const displayWho = (who === yourName || who === 'You') ? 'You' : who
  if (startsWithPerson(view, displayWho)) return capitalize(view.trim())
  const verb = openingBareVerb(view)
  if (verb) {
    const rest = view.trim().slice(verb.length)
    const form = displayWho === 'You' ? BARE_VERB_FORMS[verb] : verb
    return `${displayWho} ${form}${rest}`
  }
  return `${displayWho} said ${lowerFirst(view)}`
}
function withPeriod(s: string): string {
  const t = s.trim()
  if (!t) return t
  return /[.!?]["'”’)\]]*$/.test(t) ? t : `${t}.`
}

/** True once `s` already ends in sentence-ending punctuation, so it is a full sentence on its own
    and never a bare fragment to be joined onto another sentence with a comma. */
function isAFullSentence(s: string): boolean {
  return /[.!?]["'”’)\]]*$/.test(s.trim())
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
    /*
     * BOARD REVIEW, 1 OCTOBER, ITEM 2: NEVER ADD WORDS AFTER A FULL SENTENCE.
     * The server sometimes sends `sub` as a whole sentence of its own (for example "People said
     * different things. There is no shared understanding of the production line's new data
     * structure."), not a bare topic. `generic` above only caught three fixed phrasings; anything
     * else fell through here and had " is seen differently." appended after a sentence that was
     * already complete. Once `sub` already ends in sentence punctuation, it is read as written.
     */
    if (isAFullSentence(sub)) return `${lead} ${withPeriod(capitalize(sub))}`
    const topic = capitalize(sub)
    return endsSeenDifferently(topic) ? `${lead} ${withPeriod(topic)}` : `${lead} ${topic} is seen differently.`
  }
  if (value === 'None') return `Nobody sees anything differently. ${withPeriod(capitalize(sub))}`
  return `There is nothing to compare yet. ${withPeriod(capitalize(sub))}`
}

function movementSentence(value: string, sub: string): string {
  const gained = value.match(/^\+(\d+)$/)
  if (gained) {
    /*
     * BOARD REVIEW, 1 OCTOBER, ITEM 2: "96 TARGETS MOVED" WHEN ONE TARGET MOVED BY 96.
     * The server only sends `value: "+96"` as a numeric movement in this shape when a single
     * target moved (what-this-session-holds.ts: a count over one target sends "N targets" as the
     * value instead, which does not match this pattern at all). Reading the "96" here as a COUNT
     * of targets said something the server never claimed - ninety-six different targets moving,
     * rather than one target moving by ninety-six. This cannot say how many targets moved from
     * this value alone, so it says what it can: the size of the move, not an invented count.
     */
    const n = Number(gained[1])
    return `A target moved by ${n < 10 ? smallWord(n) : n} this session.`
  }
  if (value === 'None' && /no target moved this session/.test(sub)) return 'No target moved this session.'
  /*
   * GROUP 3'S REVIEW, BATCH A FAULT 6: THIS REGEX NEVER MATCHED WHAT THE SERVER ACTUALLY SENDS.
   * `what-this-session-holds.ts` writes "6 targets are set, and no round has closed to measure
   * from." (with "are", and a trailing period) - the pattern here expected "6 targets set, and no
   * round has closed to measure from" (no "are", no period), so it always fell through to the raw
   * fallback below, which is why "no round has closed" (the retired word) reached the screen
   * instead of the session-worded sentence this function already knows how to build.
   */
  const set = sub.match(/^(\d+) targets? (?:is|are )?set, and no round has closed to measure from\.?$/)
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
    /*
     * GROUP 3'S REVIEW, BATCH A FAULT 6: "ONE THING IS BLOCKING WORK, WORK IS HELD UP BY THE
     * DISCOUNT DECISION.." - a bare "." was appended even when `sub` already ended in one, giving
     * two full stops on one sentence. `withPeriod` only adds one when none is already there.
     *
     * BOARD REVIEW, 1 OCTOBER, ITEM 2: TWO SENTENCES, NOT ONE JOINED BY A COMMA. `sub` here is
     * often already a complete sentence of its own from the server (`blockerAsASentence`, "Work is
     * held up by owners with dates."). Joining it onto `lead` with a comma and a lower-cased first
     * letter read as one run-on sentence pretending to be two ("One thing is blocking work, work
     * is held up by owners with dates."). Once `sub` already ends in sentence punctuation, it
     * stays its own sentence, capitalised, after a full stop.
     */
    if (isAFullSentence(sub)) return `${lead}. ${withPeriod(capitalize(sub))}`
    return withPeriod(`${lead}, ${lowerFirst(sub)}`)
  }
  const waiting = value.match(/^(\d+) waiting$/)
  if (waiting) {
    const n2 = Number(waiting[1])
    const lead2 = `${capitalize(smallWord(n2))} ${n2 === 1 ? 'person is' : 'people are'} waiting on somebody else.`
    return `${lead2} ${withPeriod(capitalize(sub))}`
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

export function TheSessionsReport({ groundId, sessionNumber, totalInThisRound, light = false }: {
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
  /**
   * THE LIGHT TEAM REPORT (docs/light-rebuild/sales-first.md, section 2; the light prototype's s60
   * and the share menu in s71), for a sales check-in. Every part is drawn by the same code as below;
   * the lead's one Share button comes first, then "In short" (the finding, the four sentences and
   * where things stand), "One question to answer" (the conversation worth having now), and "More in
   * this report", where every other part folds to one line with the server's fact (`inThisReport`).
   */
  light?: boolean
}) {
  const [byPerson, setByPerson] = useState(false)
  /* The direct morning (lib/the-direct-morning.tsx): "What to do next", and no line that says who sees it or that nothing decides. */
  const direct = useTheDirectMorning()
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
  if (isLoading) return <Note role="status">Reading everybody&apos;s side of this session. It takes a moment.</Note>
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
      <Callout tone="info" title="There is a picture forming, and you have not answered yet">
        {(data as any).saying}
      </Callout>
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
  const glance: NonNullable<SessionShapedReport['inThisReport']> = d.inThisReport ?? {}

  const findingJSX = (
    <>
      {/* ── The finding, first and alone. One sentence the engines stand behind. */}
      {finding && (
        <div className="gwui-sr-finding">
          <div className="gwui-sr-finding-label">The finding</div>
          <p className="gwui-find">{finding.text}</p>
          {finding.basis && (
            <small className="gwui-find-why gwui-find-why-basis">{finding.basis}</small>
          )}
          {/* When it would have come up on its own. Under the finding and nowhere else: alone it is a
              remark about a calendar; here it is why the finding matters now rather than later. */}
          {finding.wouldHaveSurfaced && (
            <small className="gwui-find-why gwui-find-why-also">
              {finding.wouldHaveSurfaced}
            </small>
          )}
        </div>
      )}

    </>
  )
  const directionJSX = (
    <>
      {/* ── Where the room points, on a one-time session: the lists, most-named first, under the finding. */}
      {direction && (
        <Row n={next()} label="What the room named, most-named first">
          <WhereToFocus direction={direction} />
        </Row>
      )}

    </>
  )
  const tilesJSX = (
    <>
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
        <div className="gwui-tile-grid">
          {d.atAGlance.map((r: any, i: number) => (
            <div key={r.label} className={i > 0 ? 'gwui-tile gwui-tile-n' : 'gwui-tile'}>
              <span className="gwui-sr-only">{r.label}</span>
              <div className={`gwui-tile-txt ${r.tone === 'good' ? 'gwui-tile-good' : r.tone === 'watch' ? 'gwui-tile-watch' : ''}`}>
                {tileSentence(r)}
              </div>
            </div>
          ))}
        </div>
      )}

    </>
  )
  const cascadeJSX = (
    <>
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
            <p className="gwui-sr-parent">{d.cascade.parentNamed}</p>
          )}
          <p className="gwui-sr-why">{d.cascade.why}</p>
        </Row>
      )}

    </>
  )
  const successJSX = (
    <>
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
            <div className="gwui-sr-definitions">
              {definitions.map((def, i) => (
                <div key={i}>
                  <div className="gwui-sr-quote">{def.text}</div>
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

    </>
  )
  const standJSX = (
    <>
      {/* ── Where things stand. Still open leads: it is the half somebody can act on. */}
      {(settled.length > 0 || open.length > 0) && (
        <Row n={next()} label="Where things stand">
          {openReasoned.length ? (
            <EdgeList label="What is still open">
              {openReasoned.map((o, i) => (
                <EdgeRow
                  key={i}
                  kind="look"
                  title={splitAtFieldNames(o.topic).head || o.topic}
                  detail={
                    <div>
                      {o.positions.length > 0 && (
                        <div>
                          {o.positions.map((p, j) => (
                            <p key={j} className="gwui-sr-position">
                              {/*
                                GROUP 3'S REVIEW, BATCH A FAULT 6: "BARAKA MWANGI: COMPETITOR PRICING
                                IS..." AND "RUKIA OTIENO: THE MAIN OBSTACLE..." WERE A LABEL GLUED TO
                                A CLAUSE WITH A COLON, NOT A SENTENCE. Each is now its own full
                                sentence, "X said ...", with the reader's own line read as "You said
                                ..." - the same rule `Cite`/`Quotes` already use just above.
                              */}
                              {sayWhatTheySaid(p.who, p.view, yourName)}
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
                      {(o.atStake ?? splitAtFieldNames(o.topic).fields.atStake) && (
                        <div>
                          <p className="gwui-sr-caption-label">Why this matters</p>
                          <p className="gwui-sr-caption-text">{readableWithoutFieldNames(o.atStake ?? splitAtFieldNames(o.topic).fields.atStake)}</p>
                        </div>
                      )}
                      {o.settledBy && (
                        <div>
                          <p className="gwui-sr-caption-label">What would settle it</p>
                          <p className="gwui-sr-caption-text">{o.settledBy}</p>
                        </div>
                      )}
                      {o.restsOn.length > 0 && (
                        <Folded summary="The lines this comes from">
                          <div>
                            {o.restsOn.map((r, j) => (
                              <p key={j} className="gwui-sr-source-line">{r}</p>
                            ))}
                          </div>
                        </Folded>
                      )}
                    </div>
                  }
                />
              ))}
            </EdgeList>
          ) : open.length ? (
            <EdgeList label="What is still open">
              {open.map((t, i) => <EdgeRow key={i} kind="look" title={t} />)}
            </EdgeList>
          ) : (
            <Note>Nothing is open. Everything anybody raised has been settled.</Note>
          )}
          {settled.length > 0 && (
            <div className="gwui-sr-agree-wrap">
              <Folded summary={`What everybody agrees (${settled.length})`}>
                <div>
                  {settled.map((t, i) => <p key={i} className="gwui-sr-statement">{t}</p>)}
                </div>
              </Folded>
            </div>
          )}
        </Row>
      )}

    </>
  )
  const saidJSX = (
    <>
      {/* ── What each person said they did. Folded: long, and their own work only. */}
      {themed.length > 0 && (
        <Row n={next()} label="What people said this session">
          <div className="gwui-sr-toggle-row">
            <span className="gwui-sr-muted-inline">Each person&apos;s own work, in their own words.</span>
            {/*
              HAFSAH'S BUTTON-COUNT REVIEW (1 October 2026): THIS SWITCHES BETWEEN TWO VIEWS OF THE
              SAME LIST, IT DOES NOT GO ANYWHERE OR SEND ANYTHING. A boxed button read as a second
              action on a page whose one real action is "Correct it", so this is the shared quiet
              text link (`.gwui-plain-link`) that names what it switches to, same as every other
              view-only control on a rebuilt page.
            */}
            <button
              type="button"
              onClick={() => setByPerson(v => !v)}
              className="gwui-plain-link"
              style={{ flexShrink: 0 }}
            >
              {byPerson ? 'Group by theme' : 'Group by person'}
            </button>
          </div>
          <Folded summary={byPerson ? `What each of the ${(d.whatEachPersonSaid ?? []).length} said` : `All ${themed.length} groups`}>
            <div className="gwui-sr-grouped">
              {byPerson
                ? (d.whatEachPersonSaid ?? []).map((p: any, i: number) => (
                  <div key={i}>
                    {/* U.9 RE-REVIEW, ITEM A: "a colleague" as a heading is capitalised, like the
                        start of any other sentence or line - `atTheStart` only touches the plain
                        phrases this can fall back to, never a real name. */}
                    <div className="gwui-sr-item-title">
                      {p.isYou ? `${p.who} (you)` : atTheStart(p.who)}
                    </div>
                    {p.saying && <div className="gwui-sr-person-saying">{p.saying}</div>}
                    {/* The product's own finding for this person, from the record: purpose, standing, the lead's number against theirs, the gap. */}
                    {p.finding && <div className="gwui-sr-person-finding" style={{ borderLeftWidth: 3, borderLeftStyle: 'solid', borderLeftColor: p.hasGap ? 'var(--gw-amber-b)' : 'var(--gw-border)' }}>{p.finding}</div>}
                    {p.lines?.length ? (
                      <div className="gwui-sr-lines-gap">
                        {p.lines.map((l: string, j: number) => (
                          <div key={j} className="gwui-sr-quote">{l}</div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))
                : themed.map((sec: any) => (
                  <div key={sec.title}>
                    <div className="gwui-sr-item-title">{sec.title}</div>
                    {sec.items.length > 0
                      ? <Quotes items={sec.items} yourName={yourName} />
                      : <div className="gwui-sr-muted-prose">{sec.saying}</div>}
                    {sec.note && <div className="gwui-sr-section-note">{sec.note}</div>}
                  </div>
                ))}
            </div>
          </Folded>
        </Row>
      )}

    </>
  )
  const pictureJSX = (
    <>
      {/* ── The picture from everybody. The long read of the finding, after the sharp part. */}
      {rest.length > 0 && (
        <Row n={next()} label="The picture from everybody">
          <div className="gwui-sr-picture-list">
            {rest.map((l) => <p key={l.key} className="gwui-sr-statement">{l.text}</p>)}
          </div>
        </Row>
      )}

    </>
  )
  const quietJSX = (
    <>
      {/*
        ── What went quiet. Somebody was waiting on it and nobody has said it is resolved.
        U.9 END-OF-MODULE API SUITE: THE PLAIN HEADING `notRaisedAgain` DECLARES ("Not raised
        again"), not this screen's longer phrasing. "After somebody was waiting on it" is still
        true - it is what the sentence underneath says.
      */}
      {d.whatWentQuiet && (
        <Row n={next()} label="Not raised again">
          <p className="gwui-sr-statement">{d.whatWentQuiet}</p>
        </Row>
      )}

    </>
  )
  const conversationJSX = (
    <>
      {/* ── The one conversation worth having. Boxed, because it is the thing to do next. */}
      {d.theConversationWorthHaving ? (
        <div className="gwui-sr-row">
          {/* U.9 REVIEW FIX 12: no more "06 THE CONVERSATION WORTH HAVING NOW" - a number and a
              shout on a heading that already reads plainly as a sentence in itself. `next()` still
              advances `step`, which the "nothing yet" empty state below reads. */}
          {(() => { next(); return null })()}
          <Callout tone="info" title={direct ? 'What to do next' : 'The conversation worth having now'}>
            {readableWithoutFieldNames(d.theConversationWorthHaving)}
          </Callout>
        </div>
      ) : d.whyNoQuestion ? (
        <Row n={next()} label={direct ? 'What to do next' : 'The conversation worth having now'}>
          <p className="gwui-sr-muted-prose">{d.whyNoQuestion}</p>
        </Row>
      ) : null}

    </>
  )
  const builtJSX = (
    <>
      {/* ── What this rests on. The method, last and folded: a caveat above what it qualifies is
             read as a verdict on it. */}
      <Row n={next()} label="What this is built from">
        <Folded summary="How much there is to go on, and what it is built from">
          <div className="gwui-sr-built-from">
            {d.confidence && <HowMuchThereIsToGoOn read={d.confidence} />}
            {restsOn.map((sec: any) => (
              <div key={sec.title} className="gwui-sr-rests-on-item">
                {sec.items.length > 0
                  ? <Quotes items={sec.items.map((it: any) => ({ ...it, text: asFileIsKindSentence(it.text) }))} yourName={yourName} />
                  : <div className="gwui-sr-muted-prose">{sec.saying}</div>}
              </div>
            ))}
          </div>
        </Folded>
      </Row>

    </>
  )

  return (
    <Panel pad={false} className="gwui-sr">
      {/*
        ── The masthead: where you are in it. No title of its own here any more - every page that
        draws this card already carries its own "Session N" heading above it (SessionReportPage,
        RoundReportPage), so a second one here, falling back to the same words when nobody had set
        an objective, read three times on one screen: the page's own heading, this one, then
        "Session N" again inside the count sentence below. One heading, said once, above the card.
      */}
      <div className="gwui-sr-head">
        <div className="gwui-sr-head-title">
          {sessionAndWhoCheckedIn(d.sessionNumber, d.plannedSessions ?? null, answered, ofPeople)}
        </div>
        {final && (
          <div className="gwui-sr-head-shared">{SHARED_WITH_THE_TEAM}</div>
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
        <div className="gwui-sr-counted">
          {d.counting.map((c: any, i: number) => (
            <span key={i} className={`gwui-sr-counted-item${c.answered ? '' : ' gwui-sr-muted'}`}>
              {hasCheckedIn(c)}
            </span>
          ))}
        </div>
      )}

      {!light && findingJSX}
      {!light && directionJSX}
      {!light && tilesJSX}
      {!light && cascadeJSX}
      {!light && successJSX}
      {!light && standJSX}
      {!light && saidJSX}
      {!light && pictureJSX}
      {!light && quietJSX}
      {!light && conversationJSX}
      {!light && builtJSX}
      {light && (
        <>
          {/* "Updated Wed 23 Sep, 6pm ⓘ" (s71, approved rename), the full sentence behind the ⓘ, in place of the line at the foot. */}
          {!final && lastChangedLine && lastChanged && (
            <div className="gwui-sr-row"><UpdatedLine short={whenTheBoardLastChangedInShort(lastChanged)} full={lastChangedLine} /></div>
          )}
          {d.releaseThisSession && <ShareThisReport groundId={groundId} saying={d.releaseThisSession.saying ?? null} />}
          {directionJSX}
          {/* In short (s60): the finding, the four sentences at a glance, and where things stand (the mapping table: "Where things stand" goes to "In short"). */}
          <section className="gwui-sr-row gwui-light-report-part" aria-labelledby="gwui-sr-in-short">
            <h2 id="gwui-sr-in-short" className="gwui-light-report-h">In short</h2>
            <RowLabelsHidden.Provider value={true}>
              {findingJSX}
              {tilesJSX}
              {standJSX}
            </RowLabelsHidden.Provider>
          </section>
          {/* One question to answer (s60): the conversation worth having now, said as the question it is. */}
          {(d.theConversationWorthHaving || d.whyNoQuestion) && (
            <section className="gwui-sr-row gwui-light-report-part" aria-labelledby="gwui-sr-one-question">
              <h2 id="gwui-sr-one-question" className="gwui-light-report-h">One question to answer</h2>
              <p className={d.theConversationWorthHaving ? 'gwui-sr-statement' : 'gwui-sr-muted-prose'}>
                {d.theConversationWorthHaving ? readableWithoutFieldNames(d.theConversationWorthHaving) : d.whyNoQuestion}
              </p>
            </section>
          )}
          {/* More in this report (s60): every other part folds to one line, its fact from the server. */}
          <section className="gwui-sr-row gwui-light-report-part" aria-labelledby="gwui-sr-more">
            <div className="gwui-light-report-more-h">
              <h2 id="gwui-sr-more" className="gwui-light-report-h">More in this report</h2>
              <span className="gwui-light-report-note">Tap any line to see more</span>
            </div>
            <RowLabelsHidden.Provider value={true}>
              <div className="gwui-folds">
                <FoldedLine name="How much this report can rely on" fact={glance.reliesOn ?? null}>
                  <div className="gwui-sr-built-from">
                    {d.confidence && <HowMuchThereIsToGoOn read={d.confidence} />}
                    {restsOn.map((sec: any) => (
                      <div key={sec.title} className="gwui-sr-rests-on-item">
                        {sec.items.length > 0
                          ? <Quotes items={sec.items.map((it: any) => ({ ...it, text: asFileIsKindSentence(it.text) }))} yourName={yourName} />
                          : <div className="gwui-sr-muted-prose">{sec.saying}</div>}
                      </div>
                    ))}
                  </div>
                </FoldedLine>
                {themed.length > 0 && <FoldedLine name="What each person did" fact={glance.eachPersonDid ?? null}>{saidJSX}</FoldedLine>}
                {rest.length > 0 && <FoldedLine name={direct ? 'What everybody said' : 'The picture from everybody'} fact={glance.picture ?? null}>{pictureJSX}</FoldedLine>}
                {d.whatWentQuiet && <FoldedLine name="Not raised again" fact={glance.notRaisedAgain ?? null}>{quietJSX}</FoldedLine>}
                {d.againstSuccess && (
                  <FoldedLine name="What everybody said good looks like" fact={glance.goodLooksLike ?? null}>
                    {successJSX}
                    {/* The mapping table: what everybody said good looks like lives on Context, with the targets. */}
                    <Link to={`/grounds/${groundId}?tab=context`} className="gwui-plain-link">Open the Context page</Link>
                  </FoldedLine>
                )}
                {/* Its label is a sentence of its own ("Nobody has said what bigger goal this is part of."), so it is kept inside. */}
                {d.cascade && <FoldedLine name="What this sits under" fact={glance.sitsUnder ?? null}><RowLabelsHidden.Provider value={false}>{cascadeJSX}</RowLabelsHidden.Provider></FoldedLine>}
              </div>
            </RowLabelsHidden.Provider>
          </section>
        </>
      )}
      {/* ── The promise, and what state this is in. */}
      <div className="gwui-sr-row gwui-sr-footer">
        {!final && lastChangedLine && !light && (
          <span className="gwui-sr-footer-line">{lastChangedLine}</span>
        )}
        {direct
          ? (!final
            ? 'People are still answering.'
            : amended
              ? `Closed ${d.takenAt ? whenItWas(d.takenAt, 'day') : ''} and updated since, when somebody corrected their own check-in.`
              : `Closed ${d.takenAt ? whenItWas(d.takenAt, 'day') : ''}.`)
          : <>
        {!final
          ? 'People are still answering, so this moves. '
          : amended
            ? `Closed ${d.takenAt ? whenItWas(d.takenAt, 'day') : ''} and updated since, when somebody corrected their own check-in. `
            : `Closed ${d.takenAt ? whenItWas(d.takenAt, 'day') : ''}. This does not change. `}
        {d.showsEverybody
          ? 'Everybody in this check-in reads this same report. Nothing here decides who is right.'
          : 'Until the shared report is out, the words above are your own. The counts are from everybody’s answers. Nobody else’s wording reaches you and yours does not reach them.'}
          </>}
      </div>
    </Panel>
  )
}

/**
 * ONE SHARE BUTTON (the light prototype's s71: "Share", with "Share with the team" and "Share without
 * names" inside). Only for whoever runs the check-in, and only while this session's report is the one
 * waiting to be shared (`releaseThisSession`, which the server sends to the lead alone). Both go through
 * the same call the Report tab's "Send to" uses (`send-to-everyone`), which releases the report and
 * sends each person who answered a link, named or with the names taken out, so anonymous sharing still
 * goes through the one wrapper that does it. The server refuses anybody but the lead.
 */
export function ShareThisReport({ groundId, saying }: { groundId: string; saying: string | null }) {
  const qc = useQueryClient()
  const send = useMutation({
    mutationFn: (as: 'NAMED' | 'ANONYMOUS') => reportsApi.sendToEveryone(groundId, as),
    onSuccess: (r) => {
      toast.success(r.sent === 0 && r.alreadyTold > 0
        ? 'Everybody who asked for it already has it.'
        : `Shared. ${r.sent} ${r.sent === 1 ? 'person was' : 'people were'} sent a link${r.sharedAs === 'ANONYMOUS' ? ', with the names taken out' : ''}.`)
      qc.invalidateQueries({ queryKey: ['ground', groundId] })
      qc.invalidateQueries({ queryKey: ['report', groundId] })
      qc.invalidateQueries({ queryKey: ['session-shaped-report', groundId] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That did not share. Nothing has been sent, so try again.'),
  })
  return (
    <div className="gwui-sr-row gwui-light-report-share">
      {saying && <p className="gwui-sr-muted-prose">{saying}</p>}
      <SmallMenu label="Share" main align="left">
        <button type="button" className="gwui-menu-item" disabled={send.isPending} onClick={() => send.mutate('NAMED')}>Share with the team</button>
        <button type="button" className="gwui-menu-item" disabled={send.isPending} onClick={() => send.mutate('ANONYMOUS')}>Share without names</button>
      </SmallMenu>
    </div>
  )
}

