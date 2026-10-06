import { ShowAFew } from './a-long-list-is-not-a-page'
import { PeopleTable, PersonRow, Tag, type TagTone, Note, Stack } from './ui'
import { initialsOf } from '@/pages/org/people-here'

/**
 * THE ONE READ A MANAGER OPENS THE BOARD FOR.
 *
 * "I need to know where each person is and what to do with them." The board answers how the TEAM is
 * doing - what is agreed, where people differ, what is in the way - which is right for four people
 * on one thing and wrong for ten people each carrying their own number.
 *
 * SO THE ORDER IS THE PRODUCT. A manager reads down until it stops mattering and then stops. Top of
 * the list is not the worst person, it is the week with the most in it; somebody quietly hitting
 * their number is last precisely because there is nothing to do about them. Nothing here scores
 * anybody and it never sorts on attainment, which would make it a performance ranking published to
 * a manager - a different product, and not this one.
 *
 * AND EVERY ROW HANDS OVER A THING TO ASK FOR, not a verdict. "Musa is blocked" is a status anybody
 * could read off the board. What a manager can act on is how long something has sat against what
 * has actually been tried, and one move to put to them.
 */
export type Reason = 'has not answered' | 'stuck and not chasing' | 'behind the pace' | 'nothing checkable' | 'waiting on someone' | 'nothing to do' | 'not let in'

export interface Row {
  participantId: string
  who: string
  /** True where `who` is their role standing in for a name nobody has given. */
  nameIsTheirRole?: boolean
  target: number | null
  count: number
  /** What the number counts (the matching objective's own name, e.g. "shops in Westlands") - so
      the count reads as a sentence, not a bare "0 of 4" (re-review, 30 September). */
  targetName?: string | null
  reason: Reason
  /** What happened and what would change it, a full sentence from the server. Shown under the pill in place of a fixed phrase. */
  says: string
  ask: string | null
  /** The product's finding for this person, written from the record. See the-finding-per-person on the API. */
  finding?: string | null
  hasGap?: boolean
  /** What keeps coming up about this person's work, one plain sentence (board-as-lead.txt, "The team today"). */
  keepsComingUp?: string | null
  /**
   * RE-REVIEW, 30 SEPTEMBER: "Nothing to do" beside Amani while the same board tells the reader
   * "Amani Wekesa has been waiting 2 days on you for the price list." `reason` itself is the
   * engine's own classification (board.service.ts), not invented here - but the board already
   * knows, from its own "Waiting on" handoffs, when this person is waiting on the reader, and a
   * tag that contradicts a sentence three sections down is still wrong to show. Only overrides
   * the label when the engine's own reason is "nothing to do"; every other reason stands.
   */
  waitingOnReader?: boolean
  /**
   * REQUEST 85: AN ADMIN DID NOT LET THIS PERSON IN. `reason` is `'not let in'`, sorted last, `ask`
   * is always null, and `says` already carries the row's own sentence ("Faraji Odhiambo was not let
   * in by Juma Mwangi, so there is nobody to ask."). No chasing (there is nothing to ask) and no
   * label (this is not a judgement on the person) - the row draws its sentence alone.
   */
}

/** The tag's label for each reason, sentence case throughout - not just "Nothing checkable". `'not
    let in'` has no label: see the comment on `Row.reason` above - the row's own sentence is enough. */
const LABEL: Record<Reason, string> = {
  'has not answered': 'Has not answered',
  'stuck and not chasing': 'Stuck and not chasing',
  'behind the pace': 'Behind the pace',
  'nothing checkable': 'Nothing checkable',
  /* Engine request 115 (d): somebody waiting on a colleague is no longer sent as "nothing to do". */
  'waiting on someone': 'Waiting on someone',
  'nothing to do': 'Nothing to do',
  'not let in': '',
}

const TONE: Record<Reason, TagTone> = {
  'has not answered': 'concern',
  'stuck and not chasing': 'concern',
  'behind the pace': 'attention',
  'nothing checkable': 'attention',
  'waiting on someone': 'attention',
  'nothing to do': 'plain',
  'not let in': 'plain',
}

/** A trailing "for their own work" / "for his own work" / "for her own work" clause, stripped
    rather than carried into the row's own sentence - see `targetPhrase`'s own comment. Never
    replaced with "he"/"she": the row already has its own way of saying whose target this is. */
const PRONOUN_OWN_WORK_SUFFIX = /\s+for (?:their|his|her) own work$/i

/**
 * Splits a trailing "by <date>" clause off the end of a name, so the date can become its own
 * sentence instead of running on into the row's "... yet"/"... so far". `lastIndexOf` rather than a
 * regex match: a name can itself contain the word "by" (`"accounts opened by the regional team"`),
 * and only the FINAL "by" clause is ever the date Groundwork attaches.
 */
function splitOffByDate(name: string): { name: string; date: string | null } {
  const idx = name.toLowerCase().lastIndexOf(' by ')
  if (idx === -1) return { name, date: null }
  const date = name.slice(idx + ' by '.length).trim()
  if (!date) return { name, date: null }
  return { name: name.slice(0, idx), date }
}

/**
 * THE BROKEN SENTENCE (board review, sales piece A, item 3): "Baraka Mwangi has none of their 4
 * Onboard 4 shops in Westlands. yet." happened because `targetName` can arrive as the objective's
 * own full name - a verb, the count, and a trailing full stop ("Onboard 4 shops in Westlands.") -
 * not only the plain noun phrase the row above assumed ("shops in Westlands"). Appending that whole
 * name after the row's own bare `{target}` number said the count twice, and appending words after
 * its trailing stop read as two sentences stapled together.
 *
 * SALES BOARD, ITEM 4: THE SAME BUG FOR "BY <DATE> FOR THEIR OWN WORK". A `targetName` can also
 * carry a deadline and a pronoun clause of its own - "shops in Kilimani by 20 December for their
 * own work" - which read on, un-stripped, as "none of their 3 shops in Kilimani by 20 December for
 * their own work yet.": one sentence with a date clause and a possessive bolted in the middle of it.
 * Both are stripped from the name here; the date is not thrown away, `targetDateClause` below turns
 * it into its own short sentence ("The aim is 3 by 20 December.").
 *
 * This always returns one phrase, with the number said once: the trailing stop is stripped first,
 * then the pronoun clause, then the date clause, and if what is left still contains the target's
 * own number as a whole word, everything up to and including that number is dropped - "Onboard 4
 * shops in Westlands" becomes "shops in Westlands", read exactly the way a plain noun phrase already
 * was. A name with none of this in it (the plain case) is untouched, and no name at all falls back
 * to "target"/"targets".
 */
function cleanedTargetName(target: number, targetName: string | null | undefined): { noun: string; date: string | null } {
  const fallback = `${target} ${target === 1 ? 'target' : 'targets'}`
  const withoutStop = (targetName ?? '').replace(/\.+\s*$/, '').trim()
  if (!withoutStop) return { noun: fallback, date: null }
  const withoutPronoun = withoutStop.replace(PRONOUN_OWN_WORK_SUFFIX, '').trim()
  const { name, date } = splitOffByDate(withoutPronoun)
  if (!name.trim()) return { noun: fallback, date }
  const upToTheNumber = new RegExp(`^.*?\\b${target}\\b\\s*`)
  const noun = upToTheNumber.test(name) ? name.replace(upToTheNumber, '').trim() : name
  return { noun: `${target} ${noun || name}`, date }
}

export function targetPhrase(target: number, targetName: string | null | undefined): string {
  return cleanedTargetName(target, targetName).noun
}

/**
 * THE OTHER BROKEN SENTENCE (onboarding board fix 4): "Tobi Adewale has none of their 1 Manage the
 * renewal process for at least one of the clients yet." A sales `targetName` is a noun phrase with
 * its own number written as a digit ("Onboard 4 shops in Westlands.", "shops in Kilimani by 20
 * December") - `cleanedTargetName` can always find and drop everything up to that digit, leaving a
 * plain noun to slot into "has none of their N ... yet." An onboarding target can instead be the
 * objective's own full sentence, a verb with its own count written as a WORD ("Manage the renewal
 * process for at least one of the clients.") - there is no digit for `cleanedTargetName` to find,
 * so the whole verb phrase was kept and the row said the number twice, once as a figure and once
 * spelled out inside a phrase that was never meant to follow "has none of their 1".
 *
 * Told apart by shape, not by kind of work: a plain noun phrase a count can be slotted in front of
 * reads lower-case ("shops in Westlands"); a full sentence describing what to do does not, and
 * starts with a capital letter the way every other sentence on this board does. Only that
 * combination - capitalised, and with no digit of the target's own number in it - is read as a
 * verb phrase; a clean noun phrase is never mistaken for one.
 */
function isAVerbPhraseWithNoNumber(target: number, targetName: string | null | undefined): boolean {
  const withoutStop = (targetName ?? '').replace(/\.+\s*$/, '').trim()
  if (!withoutStop) return false
  const hasTheNumber = new RegExp(`\\b${target}\\b`).test(withoutStop)
  if (hasTheNumber) return false
  return /^[A-Z]/.test(withoutStop)
}

/** The verb-phrase sentence itself, the stop restored: "Manage the renewal process for at least
    one of the clients." */
function verbPhraseSentence(targetName: string | null | undefined): string {
  const withoutStop = (targetName ?? '').replace(/\.+\s*$/, '').trim()
  return `${withoutStop}.`
}

/** "The aim is 3 by 20 December." when `targetName` carries a deadline, otherwise nothing to add. */
export function targetDateClause(target: number, targetName: string | null | undefined): string | null {
  const { date } = cleanedTargetName(target, targetName)
  return date ? `The aim is ${target} by ${date}.` : null
}

export type Square = { key: number; state: 'done' | 'empty' | 'upcoming' }

/**
 * U.10 (c1): "THE TEAM TODAY", REBUILT FROM THE SHARED PARTS - a `PeopleTable` of `PersonRow`s
 * (components/gw/ui), replacing the hand-rolled white card and divider rows this drew before.
 *
 * Name, a one-line summary, a reason tag, then ten small navy squares for the last ten check-ins.
 * The prototype's rightmost column - "what keeps coming up" ("Same leads, 3 check-ins running") -
 * is `keepsComingUp`, one quiet line under the summary; it is left off a row with nothing to add,
 * and there is nothing there at all while patterns are off.
 *
 * PICTURE-CHECK ROUND 6, ITEM C: ONE COMPACT ROW, NOT A STACKED CARD. The first pass drew each
 * person as a tall card (name, pill, says, squares, ask, a quoted finding, each on its own line) -
 * the prototype draws one table row: name | summary | tag | squares. `ask` and `finding` are not
 * in the prototype's table at all, so rather than drop them (the whole point of a row - the one
 * thing a lead can act on) they sit as a single quiet second line under the summary, smaller and
 * greyer than `says`, instead of each getting a card-sized block of their own.
 */
export function WhereEachPersonIs({ rows, squaresFor }: { rows: Row[]; squaresFor?: (participantId: string) => Square[] }) {
  if (!rows.length) return null
  return (
    <PeopleTable>
      {/*
        A HUNDRED OF THESE IS NOT A GLANCE. The rows are ordered by what needs the lead first, so
        the few at the top are the ones this section exists for - and on a check-in run across a
        network the rest is a hundred identical lines saying somebody has not answered yet. See
        a-long-list-is-not-a-page.
      */}
      <ShowAFew rows={rows} few={10} what="people">
      {(r: Row) => (
        <PersonRow
          key={r.participantId}
          extraColumns="1fr auto 170px"
          person={{ initials: initialsOf(r.who), name: r.who, level: r.nameIsTheirRole ? 'Has not given a name' : undefined }}
        >
          <div style={{ minWidth: 0 }}>
            <Stack gap={2}>
              {/* The number, where they have one. A person with no target of their own still has a
                  row: what to do about them does not depend on somebody having set them a figure.
                  RE-REVIEW, 30 SEPTEMBER: a bare "0 of 4" read as a stray fragment - it is what the
                  number counts, said as a sentence, using the matching objective's own name where
                  the server sent one. */}
              {r.target != null && (
                isAVerbPhraseWithNoNumber(r.target, r.targetName) ? (
                  /*
                   * ONBOARDING BOARD FIX 4 (SECOND REVIEW): TWO FULL SENTENCES, NOT ONE JOINED ON
                   * A COLON. "Tobi Adewale has not yet done this: "..."" still joined a name to a
                   * quote with a colon - CLAUDE.md asks for plain, full sentences, never pieces
                   * joined with colons. Now "{name}'s target is "{the objective, word for word}."
                   * It is not done yet." - or "It is done." once it is - two sentences, each
                   * complete on its own. The reader's own row reads "Your target is ...", the same
                   * way every other first-person row on this board already says "you" rather than
                   * their own name.
                   */
                  <Note>
                    {r.who === 'You' ? 'Your' : `${r.who}’s`} target is &ldquo;{verbPhraseSentence(r.targetName)}&rdquo; It is {r.count === 0 ? 'not done yet' : 'done'}.
                  </Note>
                ) : (
                  <Note>
                    {r.who} has {r.count === 0 ? 'none' : r.count} of {r.count === 0 ? 'their' : 'the'} {targetPhrase(r.target, r.targetName)}{r.count === 0 ? ' yet' : ' so far'}.
                    {/* SALES BOARD, ITEM 4: a deadline carried inside `targetName` ("...by 20
                        December...") used to run on into this same sentence, after "for their own
                        work" had already been bolted in ahead of it. It is now its own short
                        sentence, read once the date has been split off the name above. */}
                    {targetDateClause(r.target, r.targetName) && ` ${targetDateClause(r.target, r.targetName)}`}
                  </Note>
                )
              )}
              <Stack gap={4}>
                <div className="gwui-fs-15 gwui-ink-sub">{r.says}</div>
                {/*
                  `ask` AND `finding` ARE NOT THE SAME VOICE (real-user walk, Kijani Foods, fault 3).
                  `ask` is the coaching line, in the product's own words; `finding` is what the record
                  holds against that, which can be the person's own words carried over verbatim (see
                  the-facts-about-a-person.ts). Joined with a bare space, "Ask Fatou Diallo for a
                  number or a date for what moved this round. The month-end reconciliation runs off a
                  spreadsheet on my own drive." ran Fatou's own words on from the coaching sentence as
                  if the product had said them, with no quote marks and no name to say whose they are.
                  Now the coaching line stands as its own line, and the finding follows attributed to
                  the person it is about, on its own line, in quotes.
                */}
                {r.ask && <Note tone={r.hasGap ? 'amber' : 'muted'}>{r.ask}</Note>}
                {r.finding && (
                  <Note tone={r.hasGap ? 'amber' : 'muted'}>
                    {r.who} said, &ldquo;{r.finding}&rdquo;
                  </Note>
                )}
                {r.keepsComingUp && <Note tone="muted">{r.keepsComingUp}</Note>}
              </Stack>
            </Stack>
          </div>
          {r.reason === 'not let in'
            ? <span />
            : r.reason === 'nothing to do' && r.waitingOnReader
              ? <Tag tone="attention">Waiting on you</Tag>
              /*
               * PROJECT BOARD REVIEW 1, FIX 4: NO TAG FOR "NOTHING TO DO". The prototype's own
               * "team today" rows (eng.txt: David "Nothing checkable", Samuel "Stuck on a
               * dependency", Brian "Behind the pace") carry a tag only where there is something
               * to flag; a person on pace, with nothing needed of the reader, reads no tag at all
               * - `says` already carries the sentence ("...has checked in, and nothing here needs
               * you this week."). Printing the engine's own internal reason code ("Nothing to
               * do") as if it were a label on the person is exactly what CLAUDE.md's "no labels on
               * people" rules out - so this draws nothing here, and `says` speaks for itself.
               */
              : r.reason === 'nothing to do'
                ? <span />
                : <Tag tone={TONE[r.reason]}>{LABEL[r.reason]}</Tag>}
          {/* The last-10 squares, the same mark and the same data "Who checked in" draws, in their
              own fixed-width column so they line up across every row. */}
          {squaresFor ? (
            <div className="gwui-gap-5" style={{ display: 'flex', width: 170, justifyContent: 'flex-end', flexShrink: 0 }}>
              {squaresFor(r.participantId).map((sq) => (
                <span
                  key={sq.key}
                  aria-label={sq.state === 'upcoming' ? 'Not open yet' : sq.state === 'done' ? 'Checked in' : 'Missed'}
                  title={sq.state === 'upcoming' ? 'Not open yet' : sq.state === 'done' ? 'Checked in' : 'Missed'}
                  className={sq.state === 'empty' ? 'gwui-rule-square' : undefined}
                  style={{
                    display: 'inline-block', width: 12, height: 12, borderRadius: 3, flexShrink: 0,
                    background: sq.state === 'done' ? 'var(--gw-navy)' : 'transparent',
                  }}
                />
              ))}
            </div>
          ) : <span />}
        </PersonRow>
      )}
      </ShowAFew>
    </PeopleTable>
  )
}
