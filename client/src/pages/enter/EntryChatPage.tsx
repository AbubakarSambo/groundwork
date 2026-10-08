import { useState, useEffect, useRef } from 'react'
import { HOW_A_SITUATION_IS_CHOSEN, WHAT_THAT_SOUNDS_LIKE } from '@/lib/one-way-to-say-what-a-situation-does'
import { SCENARIO_LABELS, SCENARIO_GROUPS, scenarioLabel, SCENARIO_FACTS, CADENCE_VALUE, type ScenarioKey } from '@/lib/scenario-catalog'
/*
 * THE CATALOGUE'S CARDS, IMPORTED FROM THE PAGE THAT OWNS THEM.
 *
 * A page importing a page is not lovely, and the alternative was worse: a third file holding a
 * third copy of twenty-two situations, which is the exact shape of the bug being fixed. SCENARIOS is
 * already exported and already the thing the signed-in picker reads. Moving it into lib/ is the
 * tidier home and is a separate change - doing it here would bury the fix in a file move.
 */
import { groupOfCard } from '@/pages/grounds/CreateGroundPage'
import { useSearchParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { entryApi, entryAnchorApi } from '@/api/entry'
import { billingApi } from '@/api/billing'
import { authApi } from '@/api/auth'
import { PeoplePicker } from '@/components/gw/PeoplePicker'
import { useEntryStore } from '@/stores/entry'
import { useAuthStore } from '@/stores/auth'
import { VennIcon } from '@/components/gw/VennIcon'
import { plannedSessionsFor } from '@/lib/sessionCount'
import { SlowStep, CLOSING_STEPS } from '@/components/gw/SlowStep'
import { toast } from 'sonner'
import AskYourTeamOneThing from './AskYourTeamOneThing'
import { TheDoor } from './TheDoor'
import { TheSetup, theDay, ANCHOR_PEOPLE_STEP_RULES, THE_ANCHOR_FIRST_QUESTION, takeTheServedFirstQuestion, rememberTheServedFirstQuestion, theAnchorStartSucceededForThisTab, rememberTheAnchorStartSucceeded } from './TheSetup'
import type { ThePeopleStepRules } from '@/api/anchorShapes'
import { TheLeadsReveal } from '@/components/gw/TheLeadsReveal'
import { FillsInAsYouTalk, type WhatTheAnchorConversationKnows } from './FillsInAsYouTalk'
import { sentenceCase } from '@/pages/grounds/how-a-row-reads'
import { EverySituation } from './EverySituation'
import { scrollTo } from '@/lib/scroll-to'
import { TheReportYouSawAtTheEnd } from '@/components/gw/TheReportYouSawAtTheEnd'
import { nothingInternalReachesTheBubble } from '@/lib/nothing-internal-reaches-the-bubble'
import { clearEntryHandover, theSetupKey, SETUP_KEY } from '@/pages/auth/entry-handover'
import { rememberWhoWasNotInvited } from '@/pages/grounds/who-was-not-invited'
import { API_ORIGIN } from '@/lib/where-the-api-lives'
import { useTheTrap } from '@/components/gw/a-field-nobody-can-see'
import { looksLikeAnAddress, NOT_AN_ADDRESS } from '@/components/gw/an-address-that-can-receive-mail'
import { copy } from '@/components/gw/copying-can-fail'
import { whatIsSetAndWhatIsNot, whenTheCheckInsLand } from '@/components/gw/when-the-check-ins-land'
import { WhichDaysTheyWork } from '@/components/gw/WhichDaysTheyWork'
import { Button, Callout, Note, TextField, TextArea, Bubble, Composer, PhaseSteps, Modal, Mark } from '@/components/gw/ui'

/*
 * A COLLEAGUE ON THE INVITE LIST, BY ID (U.4). The list of colleagues carries no addresses, so a
 * colleague is queued as "colleague:<id>" and sent as `colleagueId`; the server finds the address.
 * Everybody typed by hand is still their address.
 */
const A_COLLEAGUE = 'colleague:'
/**
 * THE NAME ASKED BESIDE EACH EMAIL, FOR AN ANCHOR DRAFT (section 13, "Name + email"; request 166's
 * `displayName`). Kept apart from `entry` rather than folded into its "email - context" string: an
 * entry is an address first, and the name is looked up by it here, from the map the people step
 * builds as names are typed.
 */
function asSomeoneToInvite(entry: string, displayNames?: Record<string, string>): { email?: string; colleagueId?: string; context?: string; displayName?: string } {
  const dash = entry.indexOf(' - ')
  const head = dash === -1 ? entry : entry.slice(0, dash)
  const context = dash === -1 ? undefined : entry.slice(dash + 3)
  const who = head.startsWith(A_COLLEAGUE) ? { colleagueId: head.slice(A_COLLEAGUE.length) } : { email: head }
  const name = !head.startsWith(A_COLLEAGUE) ? displayNames?.[head.trim().toLowerCase()] : undefined
  return { ...who, ...(context !== undefined ? { context } : {}), ...(name ? { displayName: name } : {}) }
}

/** What a person may say in one message. The API's cap on every door; the same number here so a turn is never refused. */
const A_MESSAGE_MAX = 8000

const STORAGE_KEY = 'gw_entry_session'
/** Where the API lives, for the one place we hand the browser away (Google). */


interface Turn { role: 'user' | 'assistant'; content: string }
interface EntrySession {
  scenario: string
  history: Turn[]
  closed: boolean
  report?: string
  email?: string
  onboardingStep?: number
  onboardingSelections?: OnboardingSelections
  /** The plan the person agreed to (fix plan C11): lost on reload before, so "12 sessions" came back as "1". */
  sessions?: number
  cadence?: string
  cadenceChosen?: boolean
  groundName?: string
  plannedFrom?: { timelineDays: number; cadence: string } | null
  /** The people step's own served rules (item 2), carried across a reload. */
  thePeopleStep?: ThePeopleStepRules
}

interface OnboardingSelections {
  mode: string
  initial: string
  whoInvolved?: string
  /** One entry per individual. "My team" is zero entries, not one. Empty is what drives the warning. */
  peopleNamed?: string[]
  /** An address the lead typed beside a name, kept with that name. */
  peopleEmails?: Record<string, string>
  goals?: string[]
  checkinTiming?: string
  timeframe?: string
  cadence?: string
  decision?: string
  brief?: string
  classifiedScenario?: string
  /**
   * THE ANCHOR'S SEVEN ITEMS, AS THE CONVERSATION HEARS THEM (fault 2; request 144 (2) and (3)).
   * Not served yet - every one of the seven keys is optional, and this is `{}` until the engine
   * sends them. Carried the same way as every other extracted field, so a reload keeps it.
   */
  anchorItems?: WhatTheAnchorConversationKnows
}

/**
 * THE THREE SHAPES THIS PAGE REPEATED, NAMED ONCE.
 *
 * Not a styling exercise. The field label appeared seven times and the card title six, and the six
 * had drifted into two weights for the same job - 700 on the what-to-expect cards, 600 on the
 * person cards - which is the kind of difference nobody decides and everybody sees. Naming the
 * shape is what stops the next copy from drifting again.
 *
 * `weight` stays a prop rather than being flattened to one value: whichever way that drift is
 * settled is a design call, and silently picking one here would be making it by accident.
 */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="gwui-ec-field-label">{children}</div>
}

function CardTitle({ children, weight = 600 }: { children: React.ReactNode; weight?: 600 | 700 }) {
  return <div className={`gwui-ec-card-title${weight === 700 ? ' gwui-ec-card-title-700' : ''}`}>{children}</div>
}

/** The hairline either side of an "or" divider. */
function Rule() {
  return <div className="gwui-ec-rule" />
}

function saveSession(s: EntrySession) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch { /* */ }
}
function loadSession(): EntrySession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw)
    if (p?.history?.length || (p?.onboardingStep && p.onboardingStep > 0)) return p
  } catch { /* */ }
  return null
}
export function clearEntrySession() {
  try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(SETUP_KEY) } catch { /* */ }
}

/** Which branch the load-or-start effect takes. Pure so it can be pinned by
 * tests: a CLOSED saved session must take 'restore' (it holds the locked
 * transcript and report) - it used to fall through to 'fresh', which DELETED
 * an ended-but-unsaved session on reload. A saved session plus an incoming
 * scenario always asks ('conflict'), never silently discards. */
export function entryRestoreBranch(
  saved: { closed?: boolean } | null,
  scenario: string | null | undefined,
): 'restore' | 'conflict' | 'fresh' {
  if (saved && !scenario) return 'restore'
  if (saved && scenario) return 'conflict'
  return 'fresh'
}

/**
 * A SAVED LEAD SESSION WITH NOTHING IN IT IS NOT SAVEABLE.
 *
 * Before everyone did a first check-in, "others give the accounts" closed the session on the spot
 * with an empty history and this reopened the save card after a reload. The card then committed
 * nothing and the server said NO_ENTRY_SESSION - a person blocked on a button that could never
 * work. Seen on 10 Sep 2026 on a session saved under the old rule. Now: a closed lead session with
 * words in it returns to the save card; one with no words returns to its first check-in.
 */
export function leadReturnsToSaveCard(saved: { closed?: boolean; flowPath?: string; history?: unknown[] }): boolean {
  return saved.flowPath === 'lead' && !!saved.closed && (saved.history?.length ?? 0) > 0
}

/** The other half of the same rule: a lead session saved with no words goes into its check-in. */
export function leadNeedsTheirFirstCheckIn(saved: { flowPath?: string; history?: unknown[]; onboardingStep?: number }, steps: number): boolean {
  return saved.flowPath === 'lead' && (saved.history?.length ?? 0) === 0 && (saved.onboardingStep ?? 0) >= steps
}
export function hasPendingEntry(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const p = JSON.parse(raw)
    return !!(p?.history?.length)
  } catch { return false }
}

const ONBOARDING_STEPS = 7

/**
 * ONE DEFINITION OF "THIS SESSION IS OVER".
 *
 * The expression below was written out twice - once in the main chat, once in the correction loop -
 * with the same rule and two different consequences. The consequences are legitimately different
 * (the chat offers to close, a correction regenerates the report), but the RULE is one thing, and
 * two copies of it is how a session comes to end differently depending on which path you were on.
 *
 * The server's own flag is authoritative. The phrase list stays as a backstop for phrasings the
 * server's matcher misses, which is why it is second in the OR rather than the only test.
 */
export function sessionHasClosed(res: { reply: string; sessionComplete?: boolean }): boolean {
  if (res.sessionComplete === true) return true
  const lower = (res.reply ?? '').toLowerCase()
  return SESSION_END_PATTERNS.some(p => lower.includes(p))
}

const SESSION_END_PATTERNS = [
  'your check-in is complete',
  'your session is complete',
  'your contribution is now on record',
  'that is now on record',
  'i have enough to work with',
  'your check-in is recorded',
  // Broadened so the AI inviting a close (however it phrases it) surfaces the prompt,
  // not only the six exact strings above.
  'you can end this session',
  'you can end the session',
  'ready to submit',
  'ready to end',
  'submit your answers',
  'end and see your report',
]

// Explicit end-intent FROM THE USER. Completion was only ever detected from the AI's
// reply, so when a person said "yes I want to submit my answers" the AI just affirmed and
// nothing ended - they could not finish even by asking. If the user clearly signals they
// are done, we surface the end control immediately instead of sending another turn the AI
// only affirms. Kept specific to avoid false positives on mid-conversation "submit"
// (e.g. "I submitted a proposal to the board").
const END_INTENT_PATTERNS: RegExp[] = [
  /\b(submit|send in|record|save)\s+(my\s+)?(answer|answers|response|responses|record|record now)\b/,
  /\bi\s*('?m| am)?\s*(done|finished)\b/,
  /\bi('?m| am)?\s*ready to (submit|finish|end|wrap|be done)\b/,
  /\b(end|finish|close|wrap up|complete)\s+(the\s+|this\s+)?(session|check.?in|conversation|chat)\b/,
  /\bi (want|would like|'?d like)\s+to\s+(submit|finish|end|be done|wrap up)\b/,
  /^\s*(yes|yep|yeah|yup|ok|okay|sure)\b.*\b(submit|finish|done|end|wrap)\b/,
  /\bthat('?s| is) (all|everything|it)\b/,
]
export function isEndIntent(text: string): boolean {
  const t = text.toLowerCase().trim()
  return END_INTENT_PATTERNS.some((re) => re.test(t))
}

// Onboarding wrap-up safety net.
//
// The /onboard endpoint computes `ready` from extracted fields in a SEPARATE AI
// call from the one that writes `reply`, so it can return ready:true on a turn
// whose reply still asks a question. When that happens the UI would show the
// wrap-up card and hide the input, stranding a question the user cannot answer.
// The prompt is told not to do this, but prompts do not always hold - so when
// ready fires on a reply that still contains a question, we replace that reply
// with a clean no-question closer. The user then sees only the closer plus the
// wrap-up card (which has its own buttons), never a dead-end question.
export function replyHasQuestion(text: string): boolean {
  return /\?/.test(text ?? '')
}
/**
 * IT MUST NOT CLAIM TO HAVE WHAT IT NEEDS, BECAUSE THE CARD UNDERNEATH SAYS WHAT IT HAS.
 *
 * This constant used to read "Thank you. That gives me what I need to set this up for you." and it
 * was printed above a summary listing everything still missing - so the product contradicted itself
 * in adjacent sentences, and the more confident of the two was the wrong one.
 *
 * WORTH KNOWING WHERE IT ACTUALLY CAME FROM. That sentence is quoted and forbidden IN THE ONBOARDING
 * PROMPT, twice, and it kept appearing verbatim. It was never the model saying it: it is substituted
 * here, client-side, whenever the wrap-up turn still contains a question. Three prompt fixes could
 * never have worked, because the prompt was not the author.
 *
 * What replaces it points at the derived summary rather than competing with it.
 */
export const ONBOARD_READY_CLOSER =
  /*
   * FAULT 3 (live walk, 6 October 2026): ONE VOICE, NOT "I" MIXED WITH "US". The closer spoke of
   * "us" ("told us so far") while the card under it, drawn by the same product in the same
   * breath, speaks of Groundwork in the third person ("What I've got so far", the model's "I").
   * Said now the way the rest of the product speaks of itself: "you" for the reader, "Groundwork"
   * for the product, never "I" or "us" standing in for it.
   */
  /*
   * FAULT F (reviewer, third round): "EVERYTHING GROUNDWORK NEEDS" SAT BESIDE "1 of 4 set".
   * `FillsInAsYouTalk`'s side panel counts a name, a confirmed rhythm, a confirmed start, and
   * everybody mentioned actually added - none of which this closer is talking about, and none of
   * which a conversation alone can finish: picking a rhythm, confirming a date and adding people
   * are the lead's own next actions, not something to say in words. "Everything... needs" read as
   * a claim that nothing else was left, flatly contradicted two inches away. Said instead as what
   * is actually true: there is enough from the conversation itself to move on.
   */
  'Groundwork has enough from the conversation to set this up. Here is what you said.'
// The reply to actually display: when the endpoint signals ready but the reply
// still asks a question, show the clean closer instead so no question is
// stranded. Otherwise show the reply verbatim.
export function onboardDisplayReply(reply: string, ready: boolean): string {
  return ready && replyHasQuestion(reply) ? ONBOARD_READY_CLOSER : reply
}

// --- Anonymous correction (ISSUE-17 safe) -----------------------------------
// A non-logged-in user can correct the report's read of their situation. The
// correction is sent through the SAME stateless /entry/chat endpoint the live
// check-in uses - not a one-shot instruction the model is told to comply with.
// This means a vague or contradictory correction gets the same engine
// skepticism (ENGINE_RULES) as any other claim, instead of a free pass: the
// model can push back or ask a follow-up before the correction is treated as
// settled. Only once that exchange reaches the existing natural-close signal
// does the report REGENERATE from the corrected transcript via the same
// stateless /entry/report path. Report fields are never patched directly - a
// report the transcript does not support is exactly the dishonesty the product
// exists to prevent. Nothing touches the server's state: the corrected
// transcript lives in React state + localStorage until the user commits with an
// email. Corrections accumulate (each stays in the transcript), and if the user
// later commits, the corrected account is what gets persisted.
export const CORRECTION_PREFIX = 'Correction from me:'

// Deliberately neutral - does NOT instruct the model to accept/update its read.
// An instruction to comply would defeat the point of routing this through the
// engine at all.
export function buildCorrectionTurn(text: string): { role: 'user'; content: string } {
  return {
    role: 'user',
    content: `${CORRECTION_PREFIX} ${text.trim()}`,
  }
}

// Returns a NEW array: the original history untouched plus exactly one appended
// correction turn. The transcript that regenerates the report is the transcript
// that would later commit - never mutated, never truncated.
export function withCorrection<T extends { role: string; content: string }>(history: T[], text: string): T[] {
  return [...history, buildCorrectionTurn(text) as unknown as T]
}

export function isCorrectionTurn(t: { role: string; content: string }): boolean {
  return t.role === 'user' && t.content.startsWith(CORRECTION_PREFIX)
}

// Composes the coordinator's onboarding context into the ground brief for the
// lead path. The coordinator has no session transcript, so the brief is the
// only context the lead inherits - it must carry everything the onboarding
// gathered, honestly labelled as the coordinator's framing.
/**
 * ONE SENTENCE, THEN THE REST - NOT A LABELLED DUMP WITH DOUBLE FULL STOPS.
 *
 * Two things were wrong with this, and both were only visible on the rendered page.
 *
 * It joined with `'. '` over fragments that mostly already end in a full stop, so a real brief read
 * "...before she gets buried in it.. Who is part of this: ...run their own check-ins separately..
 * Why now: ..." - two doubled stops in one paragraph.
 *
 * And it opened with "What this check-in is for:", printed directly underneath a band heading
 * reading WHAT THIS CHECK-IN IS FOR. The label was said twice and the person's own first sentence
 * was buried behind it.
 *
 * The situation now leads, unlabelled and in their words, because that is what a brief is. The rest
 * still travels - on the coordinator path this is the only context a lead inherits, and dropping it
 * would lose the handover - but as sentences rather than a form, and punctuated once.
 */
/**
 * WHAT THE PERSON TYPED IN SETUP, AND NOTHING ELSE (U.7 re-check). Their own turns, without the
 * sentence a situation card posts for them, and without a document folded into the chat.
 */
export function theirOwnSetupWords(history: { role: string; content: string }[]): string[] {
  const cards = new Set(SITUATION_CARDS.map((c) => c.message))
  return history
    .filter((t) => t.role === 'user')
    .map((t) => (t.content ?? '').trim())
    .filter((t) => t && !cards.has(t) && !t.startsWith('[Document:') && !t.startsWith('[Situation picked'))
}

export function composeLeadBrief(
  sels: { initial?: string; whoInvolved?: string; decision?: string; goals?: string[]; brief?: string },
): string {
  /* Ends every fragment exactly once, whatever the person typed. */
  const sentence = (t?: string) => {
    const trimmed = (t ?? '').trim()
    if (!trimmed) return ''
    return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`
  }
  /*
   * EACH ANSWER, AS GROUNDWORK UNDERSTOOD IT, AFTER THE QUESTION IT ANSWERED (U.7 third review).
   *
   * These answers are what setup drew out of the conversation, not anybody's exact words. So there
   * are no quotation marks (the U.7 re-check quoted them as "Wanjiru said", which put words in her
   * mouth), no name, and no fixed opening to glue them onto ("It matters now because whether to
   * confirm him."). The question comes first, in a sentence that says what follows is a reading of
   * the answer, and the answer stands as its own sentence: a clause, a noun, a single word or a
   * question all read the same way. Nothing on the server reads these openings back out; the
   * server cuts them off before anything is shown to the people in the check-in
   * (what-someone-who-does-not-run-it-reads.ts).
   */
  const itsOwnSentence = (t?: string) => {
    const b = (t ?? '').trim().replace(/^["“”']+|["“”']+$/g, '').trim()
    if (!b) return ''
    return sentence(b[0].toUpperCase() + b.slice(1))
  }
  const afterTheQuestion = (question: string, answer?: string) => {
    const a = itsOwnSentence(answer)
    return a ? `When asked ${question}, the answer was taken to mean this. ${a}` : ''
  }
  const goals = (sels.goals ?? []).map(itsOwnSentence).filter(Boolean)
  const goalLine = goals.length === 0
    ? ''
    : goals.length === 1
      ? `When asked what this is aiming at, the answer was taken to mean this. ${goals[0]}`
      : `When asked what this is aiming at, the answer was taken to mean these ${goals.length} things. ${goals.join(' ')}`
  return [
    /* Unlabelled and first: the band above it already says what this is. */
    sentence(sels.initial),
    afterTheQuestion('who is part of this', sels.whoInvolved),
    afterTheQuestion('why this matters now', sels.decision),
    goalLine,
    afterTheQuestion('what the questions should focus on', sels.brief),
  ].filter(Boolean).join(' ')
}


/**
 * THE SENTENCE THE PRODUCT WROTE IS NOBODY'S ACCOUNT - AND REMOVING IT LEFT NOTHING TO ANSWER.
 *
 * Setup opens with a first-person sentence lifted from whichever situation card was clicked - "I want
 * one honest read from everyone on my team this week..." - which nobody typed. The extractor was
 * lifting goals out of it as though they had said them: driven against the live endpoint, somebody
 * who said only "I am the ops admin, I do not really know the details" came back with one goal, the
 * canned sentence almost verbatim. An instruction not to do that was tried first and did not hold -
 * the model stopped taking `initial` and `decision` from it and kept taking `goals` - so the sentence
 * was cut from what the extractor sees. It cannot lift what it cannot see.
 *
 * THEN CUTTING IT ENTIRELY BROKE THE FIRST TURN, AND THAT IS WHY THIS REPLACES RATHER THAN REMOVES.
 *
 * The cut was conditional on `yourRole` while it existed. Setup stopped asking the role, so the cut
 * became unconditional - and on the first turn after a click that sentence is the ONLY user message.
 * Removing it left the model a lone assistant greeting and nothing to reply to, so it wrote a user
 * line for itself and answered that: somebody who clicked "a quick recurring check-in with my team"
 * was answered with "I want one honest read from everyone on my team this week. Who is on the team?"
 * - a different card's sentence, spoken back to them as though they had said it. Photographed twice.
 *
 * So the turn stays and its CONTENT changes: a flat third-person note saying which card was clicked.
 * The model knows what happened; there is no first-person sentence to mistake for an account; and
 * `initial`, `decision` and `goals` still have to come from something the person actually typed.
 *
 * ONLY WHAT IS SENT. The transcript on screen is untouched - a person still sees the sentence their
 * click posted, because that is what it looked like when they clicked it.
 */
export function withoutPickedOpener(
  history: { role: string; content: string }[],
): { role: string; content: string }[] {
  const first = history.findIndex((t) => t.role === 'user');
  if (first === -1) return history;
  const card = SITUATION_CARDS.find((c) => c.message === history[first].content);
  if (!card) return history;
  return history.map((t, i) =>
    i === first ? { ...t, content: `[Situation picked from the list: ${card.label}]` } : t,
  );
}


/**
 * WHAT SETUP ACTUALLY HAS, AND WHAT IT DOES NOT - DERIVED, NOT NARRATED.
 *
 * The closing line used to be the model's own prose, and it overstated. Observed live: after a single
 * sentence it said "Thank you. That gives me what I need to set this up for you." while holding no
 * roster, no goals and a `whoInvolved` of "My team".
 *
 * AN INSTRUCTION WAS ALREADY THERE AND ALREADY FAILING. The prompt names that exact sentence and
 * forbids it, in those words. The model produced it verbatim anyway. So the account of what setup
 * holds is computed from the fields themselves, where it cannot flatter: a thing is on the record if
 * the field is populated, and listed as missing if it is not.
 *
 * ROLE-AWARE, because the two people owe different things. A coordinator is not shown a list of gaps
 * for a situation that was never theirs to describe - their part is the lead, and the step after this
 * collects it. Listing "why now" as missing for somebody who was told to set this up would be
 * inventing a debt.
 */
/**
 * PLAIN WORDS IN FULL, NOT ONE-WORD LABELS (fault 3, live walk, 6 October 2026).
 *
 * This used to clip each label to one word - "About", "People", "Why", "Aim", "Sessions" - reasoning
 * that a card somebody scans to catch a mistake before clicking has no room for a sentence down its
 * left edge. Read live, that reasoning did not survive contact with a reader: a clipped label asks
 * the reader to supply the rest of the sentence themselves, which is exactly the clipped-phrase,
 * work-jargon reading CLAUDE.md's wording rule exists to rule out. `FillsInAsYouTalk.tsx`'s own
 * panel, right beside this card, already says the same four things in full sentences ("A name",
 * "How often", "When it runs", "Who's in it") and nobody has found those too long to read at a
 * glance - a label is not shortened by its neighbours' width, it is shortened by what a person can
 * read without stalling, and a full short phrase reads faster than a single ambiguous word.
 *
 * Kept as a lookup rather than renamed at source: `summariseSetup` is read by other screens and by
 * its own specs, and the long labels are right where there is room for them.
 */
export function shortLabel(label: string): string {
  switch (label) {
    case 'What this is about': return 'What it is about'
    case 'People you mentioned': return 'Who is in it'
    case 'Why now': return 'Why now'
    case 'What you want from it': return 'What you are aiming for'
    case 'Sessions': return 'How many sessions'
    default: return label
  }
}

/**
 * Several items read as one sentence, joined with "and" - never with a semicolon (fault 3): two
 * items read "A and B", three or more read "A, B and C".
 *
 * `lowerCaseJoins`, when true, lower-cases the first letter of every item after the first, so a
 * list of aims reads as one sentence ("Know where the project is stuck and understand what each
 * person needs") rather than two capitals stitched together. Off by default, because names must
 * keep their own capitals ("Daniel and Grace", not "Daniel and grace").
 *
 * The rule, read live: lower-case an item only when its own second letter is already lower-case.
 * That keeps acronyms ("ROI") and single letters ("I") untouched, while still catching the
 * ordinary case of a second sentence-cased clause.
 */
function joinedWithAnd(xs: string[], lowerCaseJoins = false): string {
  const items = lowerCaseJoins
    ? xs.map((x, i) => {
        if (i === 0 || x.length < 2) return x
        const second = x.charAt(1)
        if (second !== second.toLowerCase() || second === second.toUpperCase()) return x
        return x.charAt(0).toLowerCase() + x.slice(1)
      })
    : xs
  return items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

export function summariseSetup(
  sels: { initial?: string; whoInvolved?: string; peopleNamed?: string[]; decision?: string; goals?: string[] },
  /**
   * KEPT, THOUGH NOTHING BRANCHES ON IT ANY MORE, and this is the note explaining why rather than
   * an oversight. It used to excuse every gap for a non-party, because a lead was going to be
   * invited to write the context. That hand-off is gone and everybody here writes their own, so the
   * gaps are the same for both answers. The parameter stays because the caller has the value and
   * the day this list needs to differ again it must differ HERE, not in the caller.
   */
  role: 'a_party' | 'setting_up_for_others' | null,
  sessions: number,
  /**
   * THE SERVER DECIDES THIS, NOT A SECOND COPY OF THE RULE HERE.
   *
   * The first version worked it out again from `peopleNamed`, next to a server that had already
   * worked it out - two places holding the same rule, each defensible alone, nothing keeping them
   * in step. That is the shape of nearly every defect found in this codebase, so it is not one to
   * introduce on purpose.
   */
  needsPeople: boolean,
): { have: { label: string; value: string }[]; missing: string[] } {
  const have: { label: string; value: string }[] = []
  const missing: string[] = []

  if (sels.initial?.trim()) have.push({ label: 'What this is about', value: sels.initial.trim() })
  /*
   * NAMED, NOT ADDED - AND THE LABEL USED TO SAY OTHERWISE.
   *
   * `peopleNamed` is every person the extraction heard in the conversation. Nobody is on the
   * check-in until they are added on the report below, which is opt-in per person and deliberately
   * so. Labelled "Who is in it", this asserted membership for all of them.
   *
   * Read on a real setup: the lead said "Just Nadia and me for this one. My two managers, Tunde and
   * Priya, will run their own check-ins separately", the assistant answered "Perfect, so this one
   * is just between you and Nadia", and the summary two turns later read "Who is in it: Nadia,
   * Tunde, Priya". Contradicting its own confirmation, about the one thing the lead had been
   * explicit about.
   */
  const people = sels.peopleNamed?.filter((p) => p.trim()) ?? []
  if (people.length) have.push({ label: 'People you mentioned', value: joinedWithAnd(people) })
  /*
   * "WHY NOW" IS NOT "WHAT THIS IS ABOUT", SAID AGAIN.
   *
   * Read off the card twice in one evening: About said "Setting goals for 40 shops in Kano stocking
   * tea by end of Q4" and Why now said "setting goals for the next quarter". The same fact, in the
   * next row down, wearing a different label - so the card looks full and says one thing.
   *
   * The extraction is told to leave it out when nobody gave a reason, and it fills it anyway. So
   * the card decides what it shows: a "why" that is mostly words already sitting in "about" is not
   * a reason, and an honest gap reads better than a duplicate. Word overlap rather than an exact
   * match, because the paraphrase is never identical.
   */
  const aReasonRatherThanAnEcho = (why: string, about: string): boolean => {
    const words = (t: string) => new Set((t.toLowerCase().match(/[a-z]{4,}/g) ?? []));
    const mine = [...words(why)];
    if (!mine.length) return true;
    const theirs = words(about);
    /* Read live at 0.6 and still let "setting goals for the next quarter" through against "Setting
       goals for 40 shops in Kano stocking tea by end of Q4": two words of four. A real reason shares
       almost nothing with the subject - "the client is unhappy about the delay" shares one word in
       four with "a client meeting on Thursday" - so the line sits between them. */
    return mine.filter((w) => theirs.has(w)).length / mine.length < 0.4;
  };
  if (sels.decision?.trim() && aReasonRatherThanAnEcho(sels.decision, sels.initial ?? '')) {
    have.push({ label: 'Why now', value: sels.decision.trim() })
  }
  /* The goal is a clause the model lifted mid-sentence ("take the on-call escalations off me"). It is
     the person's words, so nothing is added to them; it is capitalised because it now opens a line. */
  /*
   * FAULT 3 (live walk, 6 October 2026): SEVERAL AIMS JOINED WITH SEMICOLONS READ AS A LIST OF
   * FRAGMENTS, NOT A SENTENCE. "Learn our bread recipes; Run the morning bake" is two clipped
   * phrases stitched together with punctuation a reader has to parse as a joiner - the wording
   * rule says plain full sentences, never pieces joined by a colon, dash or semicolon. Joined with
   * "and" instead, the way anyone would say it aloud.
   */
  if (sels.goals?.length) have.push({ label: 'What you want from it', value: joinedWithAnd(sels.goals.map((g: string) => g.charAt(0).toUpperCase() + g.slice(1)), true) })
  have.push({ label: 'Sessions', value: sessions === 1 ? 'One' : `${sessions}` })

  /*
   * EVERYBODY HERE OWES THE SAME THINGS NOW, AND THIS USED TO EXCUSE HALF OF THEM.
   *
   * It returned no gaps for anyone who was not a party, because the non-party answers handed the
   * check-in to a lead and the situation was the lead's to describe. That hand-off is gone: the
   * remaining non-party answer is "I write what this is about, other people check in against it",
   * so the context is theirs and a missing "why now" is a real gap, not an invented debt.
   *
   * Only the roster is still forgiven, and only because the server says so via `needsPeople` -
   * somebody setting this up for a team may genuinely not have the names yet, and the screen says
   * they can add them afterwards.
   */

  /**
   * Said ONCE, and with the consequence attached. It was printed twice - a terse line here and a
   * fuller paragraph under the fork - which is two amber blocks saying one thing.
   */
  /*
   * AND NOT WHILE THE CARD IS SHOWING THEIR NAMES. Read live: "People: Sahar, Amina" with "Not said
   * yet: who is in it, by name" directly underneath it. The server's `needsPeople` is about the
   * structured roster, which the extraction left empty while putting both names in the free-text
   * field above - so the card said it had them and did not have them, three lines apart, and
   * whoever reads that stops believing the card.
   *
   * The names ARE what is missing when nothing is showing. When something is showing, what is
   * actually missing is a way to reach them, and the next screen asks for exactly that.
   */
  if (needsPeople && !people.length) {
    missing.push('who is in it, by name - until they are on the record there is nobody to check in with, and nothing can be expected of anyone by name')
  }
  if (!sels.goals?.length) missing.push('what you want out of it')
  void role
  return { have, missing }
}

/* The ladder's display labels moved with the report screen that reads them. Re-exported here
   because this page was where anything else importing them found them. */
export { STATUS_DISPLAY } from '@/components/gw/TheReportYouSawAtTheEnd'


// Recognizer sub-examples ("e.g. ...") sit under each card's description so
// people can self-select from concrete situations, not abstract labels.
//
// CRITICAL: the `message` field is what actually routes (it is sent to the AI
// and drives classification) - labels and details are DISPLAY ONLY and can be
// reframed freely; message fields must never change as part of a copy pass.
// Pinned verbatim by entry-cards-routing.spec.ts.
export const SITUATION_CARDS = [
  {
    group: 'starting',
    scenario: 'ROLE_HANDOVER',
    label: SCENARIO_LABELS.ROLE_HANDOVER,
    detail: 'Help someone take over a role without losing important context or work.',
    message: 'Somebody is handing a role over and I want the incoming person to have more than a list of tasks.',
    examples: [
      'Someone is leaving in four weeks and their replacement has already started.',
      'A role is moving between two people and nobody has written down what the first one was carrying.',
    ],
  },
  {
    group: 'starting',
    scenario: 'CONTRACT_REVIEW',
    label: SCENARIO_LABELS.CONTRACT_REVIEW,
    detail: 'Make sure the people involved understand and are comfortable with an agreement.',
    message: 'We are about to sign an agreement and I want both sides to say what they think it means before we do.',
    examples: [
      'A revenue share where both sides are sure what the percentage applies to, and have never said it out loud.',
      'A partnership you are about to sign with somebody you would rather not fall out with.',
    ],
  },
  {
    /* A monthly read on an agreement already signed and running is a read, not a plan. */
    group: 'reading',
    scenario: 'IMPLEMENTATION_TRACKING',
    label: SCENARIO_LABELS.IMPLEMENTATION_TRACKING,
    detail: 'Understand how an agreement is working in practice.',
    message: 'We have an agreement that has been running for a while and nobody has checked whether what we are doing still matches it.',
    examples: [
      'A revenue share where the reported figure and the filed figure have never been put side by side.',
      'A relationship that is fine, where you would like to be able to prove it was fine.',
    ],
  },
  {
    group: 'starting',
    scenario: 'NEW_HIRE',
    label: SCENARIO_LABELS.NEW_HIRE,
    detail: 'Help a new team member settle in, understand their role, and surface what they need.',
    message: 'I have a new hire starting and want to make sure we set clear expectations from the beginning.',
    examples: [
      'Someone starts Monday and you want to be sure you both mean the same thing by "doing well."',
      'A new joiner and their manager each writing what success looks like in the first 90 days.',
    ],
  },
  {
    group: 'starting',
    scenario: 'NEW_PROJECT',
    label: SCENARIO_LABELS.NEW_PROJECT,
    detail: 'Get everyone clear on the work, their role, and what needs to happen.',
    message: 'We are starting a new project and I want to get the team aligned on goals and roles from the beginning.',
    examples: [
      'Kicking off a build and you want scope and "done" agreed before anyone starts.',
      'A cross-team project where each team quietly assumes a different owner.',
    ],
  },
  /**
   * TWO CARDS, BECAUSE THEY ARE TWO SCENARIOS.
   *
   * This was one card reading "A new partner, cofounder, or manager", covering NEW_COFOUNDER and
   * NEW_MANAGER at once - and the catalog, the public use-cases page and the situation configs all
   * treat them separately, with different cadences and different questions. Somebody arriving from
   * the site having read "A new manager taking over" found no such card here.
   */
  {
    group: 'starting',
    scenario: 'NEW_COFOUNDER',
    label: SCENARIO_LABELS.NEW_COFOUNDER,
    detail: 'Build a shared understanding of a new co-founder or partner relationship.',
    /*
      THE ORIGINAL ROUTING SENTENCE, KEPT WORD FOR WORD.

      `entry-cards-routing` pins every pre-reframe message byte-for-byte, because `message` is what
      the entry chat routes on and the label is only display. Splitting this into two cards is a
      display change; giving the surviving half a new sentence would have been a routing change in a
      display change's clothes, and the guard caught exactly that.
    */
    message: 'We have a new working arrangement starting and want to make sure we are set up well.',
    examples: [
      'A new equal partner joining and you want the assumptions said out loud first.',
      'Two founders dividing scope, each writing what they think the other owns.',
    ],
  },
  {
    group: 'planning',
    scenario: 'OKR_ALIGNMENT',
    label: SCENARIO_LABELS.OKR_ALIGNMENT,
    detail: 'Set goals, targets or OKRs for your team. Your team can get coaching and share updates on their progress, while you can see what is on track and where you need to support them.',
    /* The sentence that routes and becomes the first turn, so the workplan has to be IN it - a
       card that covers plans and an opening line that only mentions goals gets a conversation
       about goals. "If they exist": the plan is asked about, never assumed.

       "that goes with them" RATHER THAN "under those goals", deliberately. This same sentence is
       read by SOUNDS_LIKE_A_CASCADE to tell the two goal cards apart, and while "under" does not
       match it today ("sits under" and "underneath it" do), writing the word one edit away from
       that pattern is how this card ends up labelled Connect Goals Across the Team. */
    message: 'We are setting shared goals for this period and I want everyone aligned on what matters most, including any workplan that goes with them and who is responsible for which part.',
    examples: [
      'A team agreeing on the two or three priorities that matter most before the quarter starts.',
      'Several people who each quietly think something different is the top priority right now.',
    ],
  },
  {
    /*
     * THE SECOND GOAL CARD, AND THE ONE PEOPLE ACTUALLY DESCRIBE MOST.
     *
     * "People are setting an overarching target and then having their teams - separate teams - set
     * their KRs to align with that objective, and checking if teams align across them. This seems
     * to be the main thing people want and they track it across departments and across quarters."
     *
     * It runs on OKR_ALIGNMENT because a cascade is detected from what people say rather than
     * declared at setup - the scenario opens the shape, the record confirms it. What is different
     * here is the MESSAGE, which is what routes and what the first question is built from: this one
     * says there is something above, so the conversation asks what each team's goal sits under
     * instead of asking a team to agree on priorities among themselves.
     */
    group: 'planning',
    scenario: 'OKR_ALIGNMENT',
    label: 'Connect Goals Across the Team',
    detail: 'Set a main goal, then have team leads and partners set their own goals and targets. Make sure their goals connect to the main goal and make sense together.',
    message: 'We have one overarching goal and separate teams are setting their own goals and targets underneath it. I want to know whether they connect to the main goal and add up together.',
    examples: [
      'A company target with three departments each writing their own results under it.',
      'Team goals that each look sensible on their own and may not add up to the thing at the top.',
    ],
  },
  {
    group: 'planning',
    scenario: 'CRISIS_ALIGNMENT',
    label: SCENARIO_LABELS.CRISIS_ALIGNMENT,
    detail: 'Bring different views together around an important decision.',
    message: 'We are making a big decision and I want each person\'s honest read before we commit.',
    examples: [
      'A hiring, budget, or direction call where you want each person\'s real view before the group settles.',
      'A choice everyone will nod along to in the meeting - you want the honest reads first.',
    ],
  },
  {
    /*
     * 'person', NOT 'off', AND THE TWO PICKERS DISAGREED ABOUT IT.
     *
     * This list filed PIP under "Something is off"; the catalogue files it under "A decision about
     * one person", and the signed-in picker reads the catalogue. So the same situation sat in a
     * different place depending on which door you came through, and somebody who found it once
     * could not find it again.
     *
     * The catalogue wins because it is the one both surfaces can read, and because its answer is
     * the better one: "Something is off" is about a gap - against an agreement, between two people,
     * after an event - and a PIP is not a gap, it is a decision being made about a named person
     * who is entitled to give their own account of it. That is the group's whole heading.
     */
    group: 'person',
    scenario: 'PIP',
    label: SCENARIO_LABELS.PIP,
    detail: "Understand what is getting in the way when someone's work is off track.",
    message: 'A team member is not delivering and I need to address it. I want to make sure I have the full picture before we talk.',
    examples: [
      "A senior hire's delivery is slipping and you both want the real picture before the conversation.",
      'Deadlines keep slipping and you want the specific gap named before the conversation.',
      'You are putting someone on a formal improvement plan and want both sides on the concern and what good looks like.',
    ],
  },
  /**
   * THE ONE THE PICKER NEVER OFFERED.
   *
   * PIP is in the enum, in the catalog as "Someone's work is off track", on the public use-cases
   * page, and has its own cadence and ninety-day shape. It was not among the seventeen cards here,
   * so the single situation somebody is most likely to arrive having read about was the one they
   * could not choose.
   *
   * Participant-facing copy does not carry "performance" - the card list's own wording, and the
   * reason the label reads this way rather than "performance improvement plan".
   */
  {
    group: 'off',
    scenario: 'DRIFT',
    label: SCENARIO_LABELS.DRIFT,
    detail: 'Understand why a project is off track and what needs to change.',
    message: 'A project of mine has drifted from what we originally agreed and I want to realign the team on where things actually stand.',
    examples: [
      'A project blew up or is badly behind and everyone has a different story about why.',
      'What was agreed and what exists no longer match, and you want the gap named.',
    ],
  },
  {
    group: 'off',
    scenario: 'REALIGN_TEAM',
    label: SCENARIO_LABELS.REALIGN_TEAM,
    detail: "Understand different views when people don't see a situation the same way.",
    message: 'I need to realign with a team member. I think we see the current situation differently and want to get both our accounts on record.',
    examples: [
      'Priorities shifted and you two are working off different ideas of what matters now.',
      "You and your cofounder are quietly at odds over who's carrying more, and neither of you has said it.",
    ],
  },
  {
    group: 'starting',
    scenario: 'NEW_MANAGER',
    label: SCENARIO_LABELS.NEW_MANAGER,
    detail: 'Help a new manager understand the team and how the work is going.',
    message: 'A new manager is taking over and I want to make sure the handover is clear.',
    examples: [
      'An interim leader stepping into an existing team and scope needs pinning down.',
      'A handover where the outgoing and incoming manager each describe what is being passed on.',
    ],
  },

  // ------------------------------------------------------------------
  // The situations that were reachable only AFTER signing in.
  //
  // /grounds/new has carried all eighteen scenario cards for a while; this
  // picker carried eight. Ten situations - including both cohort cards - were
  // invisible to a first-time visitor, who is exactly the person with no
  // account and no other way in. The two lists are maintained by hand in two
  // files, which is how they drifted; entry-cards-parity.spec.ts now fails if
  // they drift again.
  //
  // `message` is what ROUTES - it is sent to the model as the person's first
  // turn. Write it as the person would say it, and never touch it in a copy
  // pass.
  // ------------------------------------------------------------------
  {
    group: 'starting',
    scenario: 'NEW_ADVISOR',
    label: SCENARIO_LABELS.NEW_ADVISOR,
    detail: 'Build a shared understanding of the role, expectations, and contribution.',
    message: 'We are bringing on a new advisor or board member and I want to pin down what they will actually contribute and on what terms.',
    examples: [
      'An advisor joined months ago and you still could not say what they have contributed.',
      'A board member you want to agree concrete terms with before the next quarter.',
    ],
  },
  {
    group: 'starting',
    scenario: 'COHORT_ONBOARDING',
    label: 'Onboarding several people at once',
    detail: 'Several people starting the same role at once. Each answers on their own, so you see who is on track and who is stuck.',
    message: 'We are onboarding a group of people into the same role at the same time and I want to see how each of them is doing without them swaying each other.',
    examples: [
      // Visible slot first. A new starter opening this should not meet the word
      // "probation"; the leader running one still finds the card, and the
      // example below still names it.
      'Several people starting the same role and you want to see how each is settling in.',
      'A cohort of managers hired to run clinics, on a three-month probation.',
    ],
  },
  {
    group: 'planning',
    scenario: 'WORKPLAN_BUDGET',
    label: SCENARIO_LABELS.WORKPLAN_BUDGET,
    detail: "Bring people's plans together so the work and budget line up.",
    message: 'We are setting a workplan and budget and I want each person to build their own and check it holds up against the resources we have.',
    examples: [
      'A quarter where every team submits a plan and the numbers have to add up together.',
      'You suspect two teams have budgeted for the same thing.',
    ],
  },
  {
    group: 'planning',
    scenario: 'BOARD_STRATEGY',
    label: SCENARIO_LABELS.BOARD_STRATEGY,
    detail: 'Understand how leaders see the direction and where their views differ.',
    message: 'Our leadership team needs to align on strategy and I want each person to give their own read before the room debates it.',
    examples: [
      'An offsite where you want the real positions before the discussion converges.',
      'A leadership team that nods in the room and disagrees afterwards.',
    ],
  },
  {
    group: 'reading',
    scenario: 'PULSE_CHECK',
    label: SCENARIO_LABELS.PULSE_CHECK,
    detail: 'Regularly understand how work is going while it is happening.',
    /* "QUICK" AND NO LENGTH AT ALL. It read as a one-off favour rather than the thing you run over a
       team for as long as you are managing them - "I have a sales team and I want to monitor them for
       a year, this should be the one, but it is not from the entry chat." Each check-in is quick; the
       run is not, and only one of those belongs in the sentence. */
    message: 'I want an ongoing read from my team on what is moving, what is stuck and what has changed, for as long as this runs.',
    examples: [
      'A weekly pulse across a delivery team instead of a status meeting.',
      'You want the same few questions answered honestly every week.',
    ],
  },
  /*
   * ASK ONE QUESTION, GET ONE REPORT. The lightest card in the product, and the only one whose
   * question belongs to the lead rather than to us. The word doing the work is "one": one line, one
   * link, one report - the cadence and the links are how it works rather than what it is.
   */
  {
    group: 'reading',
    scenario: 'TEAM_UPDATES',
    label: SCENARIO_LABELS.TEAM_UPDATES,
    detail: 'Ask one question, everyone answers on their own link, you get one report.',
    message: 'I want to ask my team one question and get one report back. Weekly, or however often I pick. Nothing to set up and no target to agree.',
    examples: [
      'Can you share an update on how sales is going for you this quarter, or if you have any blockers?',
      'What shipped this week, and what slipped?',
      'What are your three priorities this quarter, and what is blocking you?',
    ],
  },
  /**
   * INTERROGATE A GROUP ONCE, TO TURN WHAT THEY KNOW INTO A DIRECTION. Not a read on how work is
   * going: the people answering are not being checked on, they are being asked what they know.
   */
  {
    group: 'reading',
    scenario: 'DISCOVERY',
    label: SCENARIO_LABELS.DISCOVERY,
    detail: 'Ask a group what they know, once, and turn the answers into a direction.',
    message: 'I want to ask a group of people what they are trying to grow and what is stopping them, once, so I can work out where we should focus next.',
    examples: [
      'Where should we expand next, and what data would we need to do it?',
      'What is stopping our customers from growing, and where would they go if it stopped?',
    ],
  },
  {
    group: 'reading',
    scenario: 'SNAPSHOT',
    label: SCENARIO_LABELS.SNAPSHOT,
    detail: 'Get a quick picture of how people are experiencing the work right now.',
    /* "This week" was doing the work of "once" and doing it badly: it reads as a deadline rather than
       as the whole extent of the thing, and it is the phrase that made this card and the recurring
       one hard to tell apart. */
    message: 'I want one honest read from everyone on my team about what is going well and what is stuck. Once only, not on a schedule.',
    examples: [
      'You want to know how people are actually doing this week, without booking a meeting.',
      'Something feels off and you want a read before deciding whether it needs watching over time.',
    ],
  },
  {
    group: 'reading',
    scenario: 'COHORT_CHECK',
    label: SCENARIO_LABELS.COHORT_CHECK,
    detail: 'Understand how people doing similar work are experiencing it.',
    message: 'I have a group of people in the same role and I want an ongoing read from each of them separately so I can see the pattern of who is on track and who is stuck.',
    examples: [
      'Eight field officers doing the same job in different places.',
      'A cohort where you need to know who is struggling before it shows in the numbers.',
    ],
  },
  {
    group: 'person',
    scenario: 'RECOGNITION',
    label: SCENARIO_LABELS.RECOGNITION,
    detail: "Understand someone's contribution and experience before making a recognition decision.",
    message: 'Someone is asking for a raise or promotion and I want us both working from the same evidence before the conversation.',
    examples: [
      'Someone has asked for a raise and you want their case in writing first.',
      'You are deciding a promotion and want the record, not just your impression.',
    ],
  },
  {
    group: 'person',
    scenario: 'CONTRACT_RENEWAL',
    label: SCENARIO_LABELS.CONTRACT_RENEWAL,
    detail: 'Understand how a working relationship is going before deciding what happens next.',
    message: 'A contract is coming up for renewal and I want both sides to say honestly how the term went before we agree the next one.',
    examples: [
      'A contractor whose term is ending and both of you want an honest read of how it went.',
      'A renewal where you and they would describe the last year differently.',
    ],
  },
  {
    group: 'off',
    scenario: 'ACUTE_SHOCK',
    label: SCENARIO_LABELS.ACUTE_SHOCK,
    detail: 'Give people a private way to explain what happened and what needs attention.',
    message: 'Something has just happened that we did not expect and I want everyone\'s honest read of where things actually stand before we decide anything.',
    examples: [
      'A client pulled out overnight and everyone has a different version of why.',
      'A sudden departure or loss where you need the real picture fast.',
    ],
  },
]

/** The picker's groups, in display order. */
/**
 * THE CATALOG'S GROUPS, NOT A SECOND SET.
 *
 * This page kept its own five - "Goals, plans and decisions", "Keeping a regular read",
 * "When something needs addressing" - while /grounds/new used the catalog's "Setting the target",
 * "A read on live work", "Something is off". Same five ideas, five different headings, and a person
 * who saw one surface then the other had to work out they were the same list.
 *
 * The labels above are now `SCENARIO_LABELS[key]` for the same reason: this page hardcoded its own
 * and was the only surface that still carried the retired names months after the rename.
 */
/**
 * The first thing the entry chat says, and the thing it says again if somebody goes back to the
 * cards. Lifted out of the effect that used to own it so that "pick a different situation" can
 * restore the same opening rather than a second wording of it.
 */
/**
 * WHAT CLICKING A CARD SAYS, AND WHY IT IS A LOOKUP RATHER THAN A FIELD ON THE CARD.
 *
 * The two pickers route differently on purpose: `/grounds/new` sends a scenario KEY, `/start` sends a
 * SENTENCE that opens the conversation. So the entry chat needs one thing the catalogue does not
 * carry, and exactly one - which is a lookup, not a second copy of the list. It used to be a second
 * copy of the list, and that is how this picker fell eight cards behind the other one.
 *
 * Keyed by label because that is what both lists already agree on, and a guard holds the agreement:
 * every card the catalogue offers has a sentence here, or the click does nothing.
 */
export function whatThisCardSays(label: string): string | undefined {
  return SITUATION_CARDS.find((c) => c.label === label)?.message
}

/**
 * WHICH GROUP A CARD BELONGS TO, THROUGH THE PICKER'S OWN FUNCTION.
 *
 * The first version read `SCENARIO_FACTS[scenario].group` directly, which is right for twenty-one of
 * the twenty-two and wrong for the one that matters: COHORT_CHECK is offered TWICE, as an ongoing
 * read and as onboarding a group, and the two cards share a scenario. The per-card override lives in
 * `cardsInGroup`, so reading the facts directly filed both under the same heading and the onboarding
 * card vanished - "Starting something (8)" became "(7)" and nobody would have known which card had
 * gone. Caught by looking at the screen, not by a test.
 */
export function groupOf(card: { cardKey: string; scenario: string }): string {
  return groupOfCard(card)
}

export const THE_OPENING_QUESTION =
  /* The words followed the picker. "Scroll for the full list" and "describe your own at the bottom"
     were both true of a long scrolling list with the catch-all last, and both wrong the moment it
     became one group at a time with describing your own at the top.
  
     Then they followed the job. "Pick the situation that fits" asked somebody to classify
     themselves, which is a question about us, and left them guessing what picking one would do.
     What a situation actually does is set the context for what the people they invite will be
     asked about - so the sentence says that, and the choice becomes a means rather than a label. */
  /*
   * AND IT NO LONGER ASKS A QUESTION, BECAUSE THE PAGE ALREADY ASKS ONE.
   *
   * Three asks were stacked on one screen: the header's "Tell us what is going on", this line's
   * "What brings you here?", and then the card's "What are you trying to achieve with this
   * check-in?" - which is the one that means something, because what somebody writes there becomes
   * the purpose every conversation is held against. The other two were warm-up.
   *
   * So this says what the two routes ARE. The question is asked once, on the card that takes the
   * answer.
   */
  /*
   * AND ONE WORKED EXAMPLE, BECAUSE AN EMPTY BOX WITH AN INSTRUCTION IN IT IS THE HARDEST QUESTION
   * IN THE PRODUCT.
   *
   * "Describe it in your own words" tells somebody nothing about how much to write, how specific to
   * be, or whether a number belongs in it. One sentence showing all three costs a line and removes
   * the stall. See WHAT_THAT_SOUNDS_LIKE, which is deliberately about buying chickens: this is used
   * to procure livestock and to sell tea as often as it is used to ship software.
   */
  `${HOW_A_SITUATION_IS_CHOSEN} ${WHAT_THAT_SOUNDS_LIKE}`

/*
 * THE GROUPS SOMEBODY PICKS BETWEEN, which is not all of them.
 *
 * 'open' holds the describe-your-own card, and that card is the first thing on the picker now
 * rather than a group of its own - so leaving it in the dropdown gives a heading with nothing
 * under it. It was the DEFAULT selection, so the picker opened showing "Not sure yet (0)" and no
 * cards at all: a list of situations that appeared to have none. Caught by looking at it.
 */
export const SITUATION_GROUPS: { key: string; heading: string }[] = SCENARIO_GROUPS.filter(
  (g) => g.key !== 'open',
).map(
  (g) => ({ key: g.key, heading: g.heading }),
)

// Quick actions shown after the check-in starts
const QUICK_ACTIONS = [
  { label: 'Check in', msg: 'I want to keep going with my check-in.' },
  { label: 'My report', msg: 'Give me a summary of what my record shows so far.' },
  { label: 'What am I missing?', msg: 'What is missing from my record that would make it stronger?' },
  { label: 'Review my goals', msg: 'Review the goals I set at the start of this check-in and tell me where I stand against each one.' },
]

/**
 * A ground's name when nobody typed one.
 *
 * The fallback used to be the literal string "My first ground". That is not an
 * internal placeholder: it becomes the subject line the lead receives - "Sahar
 * asked you to lead a ground: My first ground" - which tells them nothing about
 * what they are being asked to lead. Every second ground would carry the same
 * name, so two invitations are indistinguishable in an inbox. GW-010.
 *
 * Everything needed for a real name was already said in the conversation, so we
 * use it: the classified scenario if the engine reached one, otherwise the first
 * thing the person typed, trimmed to something an inbox can show.
 */
/**
 * WHETHER THE ASSISTANT HAS JUST ASKED SOMETHING.
 *
 * The close prompt fires on the backend's completion signal, and that signal can arrive on a turn
 * that also asks a question. Read on a real setup, in one reply:
 *
 *   "...You've said you'll handle that. What is the first thing you will do towards that, and when?"
 *   [ This session has reached a natural close. Would you like to end and see your report? ]
 *
 * Answer it and the banner is stale; end the session and the question goes unanswered - and it was
 * the commitment question, the one the record most needs. A session where something has just been
 * asked has not reached a natural close: answering is the close.
 *
 * Only the LAST sentence counts. A turn that gives examples mid-paragraph and lands on a statement
 * is finished; one that ends on a question is waiting.
 */
export function itIsStillAskingSomething(reply: string): boolean {
  const said = (reply ?? '').trim()
  if (!said) return false
  const lastSentence = said.split(/(?<=[.!?])\s+/).filter(Boolean).pop() ?? said
  return lastSentence.trim().endsWith('?')
}

/*
 * THE NAME WHEN THE LEAD GAVE NONE: THE TOPIC, IN PLAIN WORDS, NEVER HER OWN WORDS (U.6 review).
 *
 * A check-in's label is the subject line of the invitation email ("{lead} would like your take on
 * {label}"), so it names the topic and never the person: see a-label-is-a-subject-line.spec.ts. And an
 * invitation never carries the lead's private words, not even reworded (Hafsah, 27 September): this
 * used to fall back to the first thing she typed, so "Daniel isn't hitting his targets" would have gone
 * to Daniel as the subject of his own invitation. Her words are never used now.
 *
 * In order: the situation she picked, or else the one the conversation settled on, said in its plain
 * card words from the catalogue ("Get a project back on track", never "DRIFT"); an unknown key is
 * turned into words rather than printed; else "A check-in", with the organisation when it is known.
 */
/**
 * WHAT OPENING THE EMAILED LINK DOES, AS THE SAVE CARD SAYS IT (U.6 review), in full sentences. Only
 * what it always does. An invitation can wait (the check-in starts later, there is no seat for the
 * person, an admin has to accept the check-in first) or fail (an address that cannot be invited), so
 * this never says the link sends them. The page that opens shows who was invited and who has to wait
 * (MagicVerifyPage); when the start is later, the one thing that is certain is said as well.
 */
export function whatOpeningTheLinkDoes(people: number, startsOnLater: string | null): string {
  if (people === 0) return 'Opening it saves your check-in.'
  const later = startsOnLater ? ` Nobody is invited before ${theDay(new Date(`${startsOnLater}T00:00:00`))}.` : ''
  return `Opening it saves your check-in. Then you see who was invited and who has to wait.${later}`
}

/* U.6 review: a sentence, not pieces joined with dashes: "daniel@x.test (Daniel). You wrote “He is
   the subject of this check-in." Shown on the lead's own page only; nothing of it reaches the person.
   SCREEN FAULT 6(b): "Your note" was a label naming the thing that follows ("note:"), not a sentence
   - "You wrote" says who said it, the way the rest of this function already reads as plain speech. */
export function anEntryAsASentence(entry: string, shownAs: (head: string) => string = (h) => h): string {
  const [who, ...rest] = entry.split(' - ')
  const address = shownAs(who)
  if (!rest.length) return `${address}.`
  const [name, ...note] = rest.length > 1 ? rest : ['', ...rest]
  const said = note.join(' - ').trim()
  return `${address}${name ? ` (${name.trim()})` : ''}.${said ? ` You wrote “${said.replace(/[.?!]+$/, '')}”.` : ''}`
}

/* "daniel@x.test is waiting to be invited." or "a@x.test and b@x.test are waiting to be invited." */
export function whoIsWaitingSentence(who: string[]): string {
  const list = who.length <= 1 ? who.join('') : `${who.slice(0, -1).join(', ')} and ${who[who.length - 1]}`
  return `${list} ${who.length === 1 ? 'is' : 'are'} waiting to be invited.`
}

export function fallbackGroundName(situation?: string, where?: string): string {
  const known = situation ? (SCENARIO_LABELS as Record<string, string>)[situation] : undefined
  if (known) return sentenceCase(known)
  const fromScenario = (situation ?? '')
    .trim()
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase())
  if (fromScenario) return fromScenario
  const at = (where ?? '').trim()
  return at ? `A check-in at ${at}` : 'A check-in'
}

/**
 * THE LENGTH OF TIME A NEW HIRE'S CHECK-IN IS NAMED AFTER (fault 6, live walk, 6 October 2026).
 * 90 days unless the lead said a different number of days somewhere in the conversation
 * ("first 60 days", "a 60-day start" and the like) - never guessed beyond what was actually said.
 */
export function newHireDays(saidSoFar: string): number {
  const m = saidSoFar.match(/(\d{1,3})\s*-?\s*day/i)
  const n = m ? parseInt(m[1], 10) : NaN
  return Number.isFinite(n) && n > 0 ? n : 90
}

/**
 * THE NEW-HIRE DEFAULT NAMES THE PERSON, NOT THE SITUATION (faults 4 and 6, live walk, 6 October
 * 2026).
 *
 * Read live: a lead who set up a new hire's first 90 days, and never typed a name of her own,
 * saved a check-in called "Help a new hire get started" - the situation's own label, repeated as
 * though it were a title. The prototype's own check-ins read a person's name instead ("Faith,
 * first 90 days", B1-starting-a-check-in/new.txt's sidebar). This is the one situation where the
 * conversation already knows a person's name before anybody has typed a name for the check-in
 * itself, so the fallback uses it; every other situation keeps naming itself after the situation,
 * because there is no one person it is about.
 */
export function newHireGroundNameFallback(peopleNamed: string[] | undefined, days: number): string | undefined {
  const first = (peopleNamed ?? []).map((p) => p.trim()).filter(Boolean)[0]
  if (!first) return undefined
  const firstName = first.split(/\s+/)[0]
  return `${firstName}, first ${days} days`
}

/**
 * THE KIND OF CHECK-IN A SITUATION IS, FOR A PLAIN DEFAULT NAME (fault 15, coordinator, second
 * round). Not every situation needs its own word here - "Daniel's check-in" is already plain and
 * clear - but a project one is worth naming as a project, the way "Get a new project off to a
 * good start" and "Get a project back on track" both already say what they are about.
 */
function kindOfCheckIn(situation: string | undefined): string {
  switch (situation) {
    case 'NEW_PROJECT':
    case 'DRIFT':
    case 'WORKPLAN_BUDGET':
      return 'project check-in'
    default:
      return 'check-in'
  }
}

/**
 * THE LEAD'S OWN NAME, NOT THE SITUATION'S LABEL (fault 15, coordinator, second round).
 *
 * Read live: with no name typed, a check-in that was not for a new hire took the situation's own
 * label as its name ("Get a new project off to a good start"), repeated as though it were a
 * title - the same defect the new-hire default (above) already exists to avoid for that one
 * situation. Every check-in a lead runs would otherwise read the same handful of situation labels
 * back at her rather than anything that tells them apart as HERS. `undefined` when there is no
 * lead name to use yet (nobody signed in, nothing typed) - a guess is worse than the plain label.
 */
export function leadNameGroundNameFallback(leadFirstName: string | undefined, situation: string | undefined): string | undefined {
  const name = (leadFirstName ?? '').trim()
  if (!name) return undefined
  return `${name}'s ${kindOfCheckIn(situation)}`
}

/**
 * THE NAME A CHECK-IN GETS WHEN THE LEAD LEAVES THE FIELD BLANK, SITUATION-AWARE. The new hire's
 * default is the person it is about, when the conversation has already named them (faults 4 and
 * 6). Every other situation defaults to the lead's own name and the kind of check-in, when one is
 * available (fault 15); `fallbackGroundName`'s own situation label is the last resort, for
 * whichever of the two above has nothing to work with yet.
 */
export function effectiveFallbackGroundName(
  situation: string | undefined,
  peopleNamed: string[] | undefined,
  saidSoFar: string,
  where?: string,
  leadFirstName?: string,
): string {
  if (situation === 'NEW_HIRE') {
    const named = newHireGroundNameFallback(peopleNamed, newHireDays(saidSoFar))
    if (named) return named
  } else if (situation) {
    const named = leadNameGroundNameFallback(leadFirstName, situation)
    if (named) return named
  }
  return fallbackGroundName(situation, where)
}

/**
 * What the closing report is doing, while it does it.
 *
 * No percentage and no estimate: the work is a model call whose length nobody can
 * predict, and a bar that stalls at 90% is worse than a sentence that is true. The
 * steps advance on a timer because they describe stages of one request, and the
 * last one stays until the report arrives however long that takes.
 */
/*
 * PRIMARY-BUTTONS-NEVER-TOGETHER: this page's own `kind="primary"` Buttons never render at once.
 * - "Start my check-in" (showAdminBriefing) is an early `return` - it replaces this component's
 *   whole output, so nothing else in this file renders alongside it.
 * - "Save this" (signed in), "Save my check-in" (anonymous) and "Done" (once the email is sent)
 *   come from one three-way ternary keyed on `user` and `emailSent` - exactly one branch mounts.
 * - "Invite and finish" renders only from the closed-bar's own `closed && !showSave` branch, the
 *   alternative of which is the check-in composer (never a primary button).
 * - "Add to session" (the doc-context dialog) only mounts while `docContextMode && uploadedDoc`,
 *   and is a full-screen Modal in front of anything else, so even granting it could in principle
 *   coexist with the save card's own hidden primary (see the-entry-chats-own-test-helpers.ts for
 *   why that one is hidden from a person regardless), nobody ever sees two navy buttons at once.
 */
export function EntryChatPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const scenario = params.get('scenario') ?? ''
  const urlMode = params.get('mode') ?? ''
  /**
   * THE ANCHOR'S OWN FRONT DOOR, NOW FOLDED INTO THE ORDINARY ENTRY CHAT (decision 114,
   * docs/decisions-merged.md; docs/answers-from-engine.md, "8 October: decision 114, the anchor
   * changes no screen"). `AnchorLandingPage.tsx` is gone: `/start/team` is only a redirect to
   * `/start?scenario=HELP_TEAM_UNDERSTAND` (App.tsx), so this is now the one place that calls
   * `GET /entry/anchor-start` - on a fresh arrival with the anchor's own scenario key in the
   * address, the same call the landing page used to make before handing over to this page.
   *
   * `enabled` is false once `theAnchorStartSucceededForThisTab()` already reads true, so this
   * calls the engine once per tab, not once per mount - the same "read, not taken" rule the
   * confirmation flag always followed (TheSetup.tsx). `GET /entry/anchor-available` is no longer
   * called from the client at all: a 404 here already means the switch is off, which is exactly
   * what that call used to decide, and there is no longer a separate screen that needs to know
   * the answer before anything else has been asked for.
   */
  const anchorStartQuery = useQuery({
    queryKey: ['anchor-start-inline', params.get('source')],
    queryFn: () => entryAnchorApi.start(params.get('source')),
    enabled: scenario === 'HELP_TEAM_UNDERSTAND' && !theAnchorStartSucceededForThisTab(),
    retry: false,
  })
  /**
   * WHILE THAT CALL IS STILL OUT, THE DOOR WAITS. `AnchorLandingPage.tsx` used to draw nothing at
   * all until the switch answered (never a half-answered page); this page cannot draw nothing,
   * since it is also the ordinary door for every other situation, so instead it simply does not
   * seed the first onboarding turn (below) until this settles one way or the other. The door and
   * the picker only ever show once `onboardingHistory` has a turn in it, so this is the same
   * "nothing yet" as the old page, just inside the shared screen rather than a page of its own.
   */
  const anchorStartPending = scenario === 'HELP_TEAM_UNDERSTAND'
    && !theAnchorStartSucceededForThisTab()
    && !anchorStartQuery.isFetched
  /**
   * PIECE 25, "YES, SET IT UP" OPENS HERE PREFILLED (plan piece 25, docs/anchor-scenario-plan.md
   * section 5 row 9; docs/answers-from-engine.md, "Request 148 (1)"). BoardPage.tsx's "Groundwork
   * recommends" calls `POST /entry/draft-from-set-up` and navigates here with the answer as router
   * state - never a query param, since `people` carries real addresses (never put personal data in
   * a URL). `anchorSetUp.initial` joins the ordinary `?initial=` below, so everything that already
   * seeds the first message from a URL (the restore branch, the auto-send effect) works for this
   * path too without being duplicated. `aim` and `people` are seeded separately, just below,
   * because nothing else carries those today.
   */
  const anchorSetUp = (location.state as { anchorSetUp?: { initial?: string; aim?: string | null; people?: { email: string; displayName?: string }[] } } | null)?.anchorSetUp
  const urlInitial = params.get('initial') ?? anchorSetUp?.initial ?? ''
  /* The rail's Start a check-in. A saved setup used to swallow it: the page restored the old one and
     the picker never showed, "unless I click go backwards". Now it asks. */
  const wantsANewOne = params.get('new') === '1'

  const user = useAuthStore(s => s.user)
  const queryClient = useQueryClient()
  const { groundName, setGroundName, sessions, setSessions } = useEntryStore()
  const [renamingGround, setRenamingGround] = useState(false)
  const [renameInput, setRenameInput] = useState('')
  const [editingSessions, setEditingSessions] = useState(false)
  const [sessionsInput, setSessionsInput] = useState('1')
  const [showSessionsUpgrade, setShowSessionsUpgrade] = useState(false)
  const groundRenameRef = useRef<HTMLInputElement>(null)

  // Situation cards shown before user types first message
  const [pickedSituation, setPickedSituation] = useState<string | null>(null)
  /* U.6: the first screen shows one box; "See every situation" swaps it for the whole list. */
  const [seeingEverySituation, setSeeingEverySituation] = useState(false)
  /**
   * THE CARD'S SCENARIO KEY, WHICH IS NOT THE SAME THING AS ITS LABEL.
   *
   * `pickedSituation` holds the label, for deciding whether the grid is still on screen. What setup
   * needs is the key - NEW_HIRE, DRIFT - because that is what selects the situation's own first
   * question on the server. Without it every card opened with the same generic question, which is
   * the whole complaint: "new hire does not ask you about the new hire".
   */
  const [pickedScenario, setPickedScenario] = useState<string | null>(null)

  /**
   * THE REFUSAL COMES BEFORE THE WORK, WHICH IS WHERE IT USED TO BE AND WHERE I MOVED IT FROM.
   *
   * The set-up wizard checked the plan on its FIRST screen, with a comment saying exactly why: "the
   * API refuses an eleventh ground correctly, but it refused it at submit - so the admin picked a
   * card, named the ground, set the timeline and the people, and only then was told she could not.
   * The block was right; the timing made it feel like a trick."
   *
   * Then the wizard became a picker that hands over to this conversation, and the check stayed
   * behind on a screen almost nobody now sees. So a signed-in person on a used-up free plan could
   * be handed here, spend ten minutes setting up and giving their whole account, and be refused at
   * the save with all of it gone - the same bug, reintroduced by moving its neighbour.
   *
   * Only for somebody signed in: a stranger has no organisation to have used anything up, and
   * asking the billing endpoint on their behalf would answer about nobody.
   */
  const whetherTheyMayOpenOne = useQuery({
    queryKey: ['can-create-ground'],
    queryFn: () => billingApi.checkCanCreateGround(),
    enabled: !!user,
    retry: false,
  })
  const refusedByThePlan =
    !!user && whetherTheyMayOpenOne.data && !whetherTheyMayOpenOne.data.allowed
      ? (whetherTheyMayOpenOne.data.reason ?? 'Subscribe to open more.')
      : null
  /**
   * WHICH GROUP THE PICKER IS SHOWING.
   *
   * The set-up wizard was rebuilt to her instruction - describe-your-own first, then a dropdown,
   * cards changing as you pick - and this picker was left on the old scrolling list. Two doors into
   * the same twenty-two situations, behaving differently. Reported as a regression, and it is one
   * in the sense that matters: the two screens agreed yesterday and do not today.
   */
  // Once the user dismisses the natural-close banner, never re-show it
  const [endPromptDismissed, setEndPromptDismissed] = useState(false)

  // Onboarding state
  const defaultSels: OnboardingSelections = { mode: urlMode || 'new', initial: urlInitial || '' }
  const [onboardingStep, setOnboardingStep] = useState(1)
  const [onboardingSelections, setOnboardingSelections] = useState<OnboardingSelections>(defaultSels)
  /**
   * THE PEOPLE STEP'S OWN RULES, DRAWN FROM WHAT THE LANDING PAGE WAS SERVED (item 2;
   * docs/answers-from-engine.md, "Request 149 (2 of 6)"). `ANCHOR_PEOPLE_STEP_RULES` is the fallback
   * only, used until a served `ThePeopleStepRules` is picked up below - from `sessionStorage` on a
   * fresh arrival from the anchor landing page, or from the saved draft on a reload.
   */
  const [thePeopleStepRules, setThePeopleStepRules] = useState<ThePeopleStepRules>(ANCHOR_PEOPLE_STEP_RULES)
  /**
   * THE ANCHOR'S OWN SITUATION NAME, DRAWN FROM WHAT THE LANDING PAGE WAS SERVED (request 144 (2)
   * and (3)) - the exact same pattern as `thePeopleStepRules` above. `'Help my team understand'` is
   * the fallback only, used until the served `groundLabel` is picked up below; it is also the
   * engine's own served value, word for word, so nothing changes visually before it arrives. This is
   * read instead of `SCENARIO_LABELS`, whose own entry for `HELP_TEAM_UNDERSTAND` is missing its "my".
   */
  const [anchorGroundLabel, setAnchorGroundLabel] = useState<string>('Help my team understand')
  const [onboardingHistory, setOnboardingHistory] = useState<Turn[]>([])
  const [onboardingReady, setOnboardingReady] = useState(false)
  const [onboardingLoading, setOnboardingLoading] = useState(false)
  /** What the model has said so far on the turn in flight. Empty until the first sentence lands. */
  const [onboardingDraft, setOnboardingDraft] = useState('')
  // Doc-add during onboarding: paste or upload a text document + context, so the
  // AI reads it and reports what it gathered (instead of the person typing it out).
  const [showDocPanel, setShowDocPanel] = useState(false)
  const [docTab, setDocTab] = useState<'paste' | 'upload'>('paste')
  const [docPasteText, setDocPasteText] = useState('')
  const [docLabel, setDocLabel] = useState('')
  const [docContextNote, setDocContextNote] = useState('')

  // Check-in chat state (phase 2)
  const [history, setHistory] = useState<Turn[]>([])
  const [displayedHistory, setDisplayedHistory] = useState<Turn[]>([])
  const [streamingIdx, setStreamingIdx] = useState<number | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [closed, setClosed] = useState(false)
  const [phase, setPhase] = useState<'onboarding' | 'checkin'>('onboarding')
  const [showEndPrompt, setShowEndPrompt] = useState(false)

  const [confirmClear, setConfirmClear] = useState(false)
  const [showAdminBriefing, setShowAdminBriefing] = useState(false)
  const [showNewScenarioConflict, setShowNewScenarioConflict] = useState(false)
  const [pendingNewScenario, setPendingNewScenario] = useState<{ sels: OnboardingSelections } | null>(null)

  function handleClearSession() {
    clearEntrySession()
    window.location.reload()
  }


  /**
   * A WAY BACK FOR THE LEAD. Clears the read and puts the conversation back to the opening question,
   * where the situation cards show again, so they can pick another one or describe it differently.
   */
  function pickADifferentSituation() {
    setPickedSituation(null)
    setSeeingEverySituation(false)
    /* Or the next situation is set up with the last one's first question. */
    setPickedScenario(null)
    setOnboardingHistory([{ role: 'assistant', content: THE_OPENING_QUESTION }])
    setOnboardingSelections(defaultSels)
    setOnboardingReady(false)
    setInput('')
  }

  const [showEndConfirm, setShowEndConfirm] = useState(false)

  // Save card
  const [showSave, setShowSave] = useState(false)
  /* The save card's own confirm: the page's Start over is under the card and cannot be reached. */
  const [confirmClearInCard, setConfirmClearInCard] = useState(false)
  // Token authorizing pre-auth updates to the server-side draft (issued at
  // entry-save). Survives reloads so post-email edits keep syncing.
  const [draftToken, setDraftToken] = useState<string | null>(() => {
    try { return localStorage.getItem('gw_draft_token') } catch { return null }
  })
  const [sessionReport, setSessionReport] = useState<import('@/api/entry').EntryReport | null>(null)
  const [generatingReport, setGeneratingReport] = useState(false)
  // Recommended additions / mentioned people (#1a): the viewer here is always
  // the ground's future initiator (this page only ever runs pre-ground, and
  // whoever commits becomes initiatorId - see entry.service.ts commitInner),
  // so these get a real "Add them" affordance rather than a passive list.
  // No ground exists yet at this point, so "adding" means queuing them into
  // the same inviteAdded contributor queue used below - they go out for real
  // once the ground is created at save time.
  const [addingContributorFor, setAddingContributorFor] = useState<string | null>(null)
  /*
   * THE PEOPLE ALREADY HERE. A lead had to type every colleague's address in full, for people the
   * organisation already knows. Read once when signed in; empty for a stranger, who has nobody yet.
   */
  /* Id, name, role and team, never an address (U.4). A colleague is queued as "colleague:<id>" and
     the server looks the address up when the check-in is made. */
  const [colleagues, setColleagues] = useState<{ id: string; name: string; role: string; team: string | null }[]>([])
  useEffect(() => {
    if (!user) return
    authApi.colleagues().then(setColleagues).catch(() => setColleagues([]))
  }, [user])
  /** A colleague whose name is the one mentioned, when exactly one matches. Never a guess between two. */
  /**
   * A queued entry as a person reads it: a colleague by name, anybody else by the address typed -
   * and, when the people step's own Name field (section 13, "Name + email") was used, "Name
   * (address)" rather than the address alone.
   *
   * FAULT 3: NAMES ARE DROPPED AFTER THE PEOPLE STEP. The Name field only ever reached
   * `displayNames`, read when building the commit payload (`asSomeoneToInvite`) - never here, so
   * the added list showed "✓ musa@anchor.test" and the confirmation said "...waiting to be
   * invited" with the address alone, though a name had been typed for them.
   */
  function shownAs(head: string): string {
    if (head.startsWith(A_COLLEAGUE)) {
      return colleagues.find((c) => c.id === head.slice(A_COLLEAGUE.length))?.name ?? 'A colleague'
    }
    const name = displayNames[head.trim().toLowerCase()]
    return name ? `${name} (${head})` : head
  }
  function shownEntry(entry: string): string { return anEntryAsASentence(entry, shownAs) }
  function whoIsWaiting(): string { return whoIsWaitingSentence(inviteAdded.map((e) => shownAs(e.split(' - ')[0]))) }
  /**
   * B-011: "PASTE MULTIPLE EMAILS" AND "ADD ALL" QUEUE EVERY PERSON THROUGH THE PER-PERSON FOCUS
   * STEP ONE AT A TIME, AND ONLY `inviteAdded` IS EVER SAVED.
   *
   * Two people were pasted and "Add all" was pressed; while the first person's focus note was still
   * being answered, the check-in was saved and the page moved on to the new check-in's own page.
   * Neither person had been added yet - the one being asked about is only in `inviteContextFor`, and
   * the other is still waiting, untouched, in `bulkQueue` - so both were silently dropped, with no
   * error or warning shown.
   *
   * Everyone already named through "Add" or "Add all" belongs on the check-in regardless of whether
   * their own focus note was ever filled in, so a save includes `inviteAdded` plus whoever is still
   * mid-step or still queued behind them, the same as if each had been "Skip"ped through in turn.
   */
  function everyoneNamedSoFar(): string[] {
    const already = (e: string) => inviteAdded.some((x) => x === e || x.startsWith(`${e} - `))
    const stillPending = inviteContextFor && !already(inviteContextFor) ? [inviteContextFor] : []
    const stillQueued = bulkQueue.filter((e) => !already(e) && e !== inviteContextFor)
    return [...inviteAdded, ...stillPending, ...stillQueued]
  }
  function colleagueNamed(label: string): { id: string; name: string; team: string | null } | null {
    const name = label.split(' - ')[0].trim().toLowerCase()
    if (name.length < 2) return null
    const hits = colleagues.filter(c => {
      const full = (c.name ?? '').toLowerCase()
      const first = full.split(' ')[0]
      return full && (full === name || first === name || full.startsWith(name + ' ') || name.startsWith(full))
    })
    return hits.length === 1 ? hits[0] : null
  }
  /**
   * WHETHER THIS DRAFT IS AN ANCHOR ONE (plan piece 11, the people step; docs/anchor-scenario-plan
   * .md section 5 row 4). `HELP_TEAM_UNDERSTAND` (the anchor scenario's own situation key, request
   * 144 (2) and (3)) can only ever arrive as `onboardingSelections.classifiedScenario`, the URL's
   * own `?scenario=` (the anchor landing page's button, item 2), or `pickedSituation` - never as
   * `onboardingSelections.mode`, which is always a mode key ('new', 'look_back', ...) and never a
   * situation. So, unlike the invite block's own `s` just below (which falls back through mode
   * first, for its existing sensitive-situation check), this checks each place on its own rather
   * than taking the first truthy one in a chain - `mode` is always set to something once onboarding
   * starts, and would otherwise mask a real `?scenario=HELP_TEAM_UNDERSTAND` before it was ever
   * classified. Every other situation's people step keeps its ordinary wording and has no limit of
   * its own.
   */
  function isAnchorDraft(): boolean {
    return onboardingSelections.classifiedScenario === 'HELP_TEAM_UNDERSTAND'
      || scenario === 'HELP_TEAM_UNDERSTAND'
      || pickedSituation === 'HELP_TEAM_UNDERSTAND'
  }

  /**
   * FAULT 1: OPEN THE ANCHOR'S CONVERSATION DIRECTLY ONLY WHILE THE SWITCH IS REALLY ON.
   *
   * `isAnchorDraft()` alone is just the URL's `?scenario=HELP_TEAM_UNDERSTAND` (or its classified
   * equivalent), which survives in a bookmark or a forwarded link long after Hafsah might switch
   * `release.anchorScenario` back off - and the engine then no longer runs the anchor conversation
   * for that key. Skipping the door and the situation picker is only right while the switch is
   * genuinely on, so this also checks `theAnchorStartSucceededForThisTab()` (TheSetup.tsx): whether
   * `GET /entry/anchor-start` actually answered, for this browser tab, which `AnchorLandingPage.tsx`
   * only ever reaches once the switch has said yes. A stale link with the switch off never gets that
   * confirmation, so this reads false and the page falls back to today's ordinary door - exactly the
   * plan's own rule ("Do it only when the anchor switch is on... a stale link... keeps today's
   * behaviour"). Every OTHER anchor-only behaviour on this page (the people step, the reveal, the
   * invite wording) still reads the plain `isAnchorDraft()` above, unchanged - it is only the door
   * itself, and the question that replaces it, this one extra check guards.
   */
  function anchorConversationOpensDirectly(): boolean {
    return isAnchorDraft() && theAnchorStartSucceededForThisTab()
  }

  /**
   * THE 19-PERSON LIMIT (the lead plus 19 is 20, decision 96 item 3; `thePeopleStepRules.mayAdd`,
   * served or else `ANCHOR_PEOPLE_STEP_RULES`), for an anchor draft only. `true` means the add
   * actually happened; every place that adds a contributor checks this first and shows the engine's
   * own limit sentence instead when it does not.
   */
  function mayAddOneMorePerson(): boolean {
    if (!isAnchorDraft()) return true
    if (inviteAdded.length >= thePeopleStepRules.mayAdd) {
      toast.error(thePeopleStepRules.limitSentence)
      return false
    }
    return true
  }

  function queueColleague(c: { id: string; name: string }, note?: string, key?: string) {
    if (!mayAddOneMorePerson()) return
    const head = `${A_COLLEAGUE}${c.id}`
    const entry = note ? `${head} - ${note}` : head
    setInviteAdded(prev => (prev.some(e => e === head || e.startsWith(`${head} - `)) ? prev : [...prev, entry]))
    if (key) setQueuedFromSuggestion(prev => new Set(prev).add(key))
  }
  /* The note that travels with a queued address, remembered when the field opens so Save can
     queue it too. `renderAdd` hands the label to the button, not to the save handler. */
  const [addingContributorLabel, setAddingContributorLabel] = useState('')
  /* Why it refused, beside the field. A silent return read as success. */
  const [addingContributorError, setAddingContributorError] = useState('')
  const [addingContributorEmail, setAddingContributorEmail] = useState('')
  const [queuedFromSuggestion, setQueuedFromSuggestion] = useState<Set<string>>(new Set())
  // Anonymous correction: inline "what did we get wrong?" box on the report.
  const [showCorrection, setShowCorrection] = useState(false)
  const [correctionText, setCorrectionText] = useState('')
  const [correctionLoading, setCorrectionLoading] = useState(false)
  // Index into `history` where the current correction exchange began - lets the
  // UI render just the correction sub-conversation (question/answer bubbles)
  // without re-showing the whole original check-in transcript. Null = no
  // correction in progress.
  const [correctionStartIndex, setCorrectionStartIndex] = useState<number | null>(null)
  // Flow fork after onboarding: 'self' = this is my situation, I give my
  // account now (the check-in). 'lead' = I am setting this up for my team and
  // someone else runs the first check-in (the coordinator path - no check-in,
  // no report for me; the lead is invited to confirm and becomes the initiator).
  const [flowPath, setFlowPath] = useState<'self' | 'lead' | null>(null)
  /**
   * WHAT THEY ALREADY TOLD US ABOUT THEIR OWN ROLE, SO WE DO NOT ASK IT TWICE.
   *
   * The model asks this FIRST - before anything about the situation - because it decides what every
   * word after it IS: a party's words are their own account, a non-party's are context about other
   * people, and the product treats those completely differently. It extracts the answer into a typed
   * field, `yourRole`.
   *
   * That field was returned by the endpoint and read by nobody, so the fork below asked the same
   * question again with buttons. Someone who had just typed "I am part of it" got asked whether they
   * were part of it, which reads as not having been heard - and it is, because the first answer was
   * being discarded.
   *
   * Undefined is a real state, not a failure: the model may not have got a clear answer. Then the
   * fork asks, exactly as it did before.
   */
  const [yourRole, setYourRole] = useState<'a_party' | 'setting_up_for_others' | null>(null)
  /**
   * SETUP FINISHED WITHOUT ANYBODY NAMED. Hafsah's call: let them through, tell them, they add the
   * people afterwards.
   *
   * Requiring a roster would guarantee one and would also be one more field somebody fills with a
   * guess to get past it - which is how "My team" became an answer to who is involved. Saying it
   * plainly costs nothing and is true; a silent pass is what let a check-in reach the per-person
   * questions with no people in it.
   */
  const [needsPeople, setNeedsPeople] = useState(false)
  const [orgName, setOrgName] = useState('')
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState('')

  /* The honeypot the API has always accepted and no form has ever rendered. */
  const trap = useTheTrap()
  const [inviteEmail, setInviteEmail] = useState('')
  /**
   * "Name + email" (section 13), anchor draft only. Asked first, beside the email, in the one row
   * that adds a person by hand - optional, kept by email address until that person is actually
   * added, then sent on commit as `displayName`.
   */
  const [inviteDisplayName, setInviteDisplayName] = useState('')
  const [pendingDisplayName, setPendingDisplayName] = useState('')
  const [displayNames, setDisplayNames] = useState<Record<string, string>>({})
  const [inviteNote, setInviteNote] = useState('')
  const [inviteAdded, setInviteAdded] = useState<string[]>([])
  const [inviteContextFor, setInviteContextFor] = useState<string | null>(null)
  const [inviteContext, setInviteContext] = useState('')
  const [copiedLink, setCopiedLink] = useState(false)
  // True on the coordinator/lead path: the committer skipped the check-in
  // because someone else (the lead) runs it. Drives the honest save-card copy.
  const skippedCheckin = flowPath === 'lead'
  const [checkInBy, setCheckInBy] = useState('')
  const [lastCheckInBy, setLastCheckInBy] = useState('')
  const [cadence, setCadence] = useState<'DAILY' | 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ONE_TIME' | 'SEQUENTIAL'>('FORTNIGHTLY')
  /* Where the planned session count came from, so the chip can say so instead of presenting it as fact. */
  const [plannedFrom, setPlannedFrom] = useState<{ timelineDays: number; cadence: string } | null>(null)
  /*
   * FAULT B (reviewer, third round): TYPING 5 DID NOT STICK WHEN AN END DATE WAS ALSO SET.
   * `plannedNow` (below) checked `lastCheckInBy` before `sessions`, so a lead who typed 5 into the
   * open control still read "12 sessions planned" and saved "Session 1 of 12" if an end date
   * happened to derive 12 from the rhythm. Clearing `plannedFrom` (already done on a manual edit)
   * only beat the TIMELINE-DERIVED branch, never the END-DATE-DERIVED one - this flag beats both,
   * and every other branch besides, the moment she types a number. Reset whenever the conversation
   * itself hands over a fresh plan (`setPlannedFrom` below), so a later extraction is not blocked
   * by an earlier, now-stale manual edit.
   */
  const [sessionsTypedByLead, setSessionsTypedByLead] = useState(false)
  /**
   * Did anyone actually choose this rhythm?
   *
   * The picker showed FORTNIGHTLY already selected whether or not the person had
   * ever mentioned a cadence, so a value nobody had chosen was indistinguishable
   * from one they had. It decides the length of the whole ground - ninety days
   * weekly is twelve check-ins, fortnightly is six - and it was being settled by
   * a useState default that read as a decision.
   *
   * This does not change what the ground gets if they say nothing. It changes
   * whether the screen claims they picked it.
   */
  const [cadenceChosen, setCadenceChosen] = useState(false)

  /**
   * Does this deployment have Google credentials? Only the server knows, and a
   * button shown without them sends people to Google's own error page.
   */
  const { data: authMethods } = useQuery({
    queryKey: ['auth-methods'],
    queryFn: () => authApi.methods(),
    staleTime: 5 * 60 * 1000,
  })
  /* 0=Sun..6=Sat for "every Monday", or a day of the month for "on the 15th". RESTORED
     (nothing-removed-screens.md item 2): live let the lead choose this ("On which day?" /
     "On which day of the month?"); this was fixed at null with no setter until `TheSetup`'s own
     picker was restored below. */
  const [cadenceAnchorDay, setCadenceAnchorDay] = useState<number | null>(null)
  /* Which days this team works. Empty means nobody said, which is not the same as every day - and
     it is never pre-set to Monday-Friday, because that is one region's office week rather than a
     fact about anybody's. */
  const [workingDays, setWorkingDays] = useState<number[]>([])
  const [bulkInviteMode, setBulkInviteMode] = useState(false)
  const [bulkInviteText, setBulkInviteText] = useState('')
  const [bulkQueue, setBulkQueue] = useState<string[]>([])

  // Stable invite token - generated once and stored in entryStorage
  const [inviteToken] = useState<string>(() => {
    const session = loadSession()
    if ((session as any)?.inviteToken) return (session as any).inviteToken
    const arr = new Uint8Array(24)
    crypto.getRandomValues(arr)
    return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('')
  })

  // Doc upload
  const [uploadedDoc, setUploadedDoc] = useState<{ name: string; content: string } | null>(null)
  const [docContextMode, setDocContextMode] = useState(false)
  const [docContext, setDocContext] = useState('')

  const msgsRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  /*
   * SEED THE NAME FROM THE SITUATION'S NAME, NOT FROM ITS KEY.
   *
   * This did `scenario.replace(/\+/g, ' ')`, which turns "A+new+hire" from an old marketing link
   * into something readable and turns "NEW_HIRE" into "NEW_HIRE". That was tolerable while the
   * parameter only arrived from those links; it is not now that /grounds/new hands over with the
   * scenario key in the query string, and it was the first thing on screen: NEW_HIRE in the rail,
   * NEW_HIRE on the header, on the ordinary signed-in path.
   *
   * The catalogue already has the name a person reads. An unrecognised value falls back to the old
   * behaviour, which is right for a link we did not write.
   */
  useEffect(() => {
    /* U.6 review: a situation is not a name, so arriving with ?scenario= no longer names the check-in
       after its type. It stays unnamed until the lead names it, or aNameForIt does at the save. */
    setGroundName('')
    setSessions(1)
  }, [])

  /*
   * WHAT THE SETUP SHOWS IS WHAT IS SAVED (U.6 review). Read live: the setup said "Not set yet. This
   * will run every 2 weeks unless you pick one." and listed fortnightly dates, and the check-in was
   * saved weekly for 90 days ("Session 1 of 12", "Ends 3 Jan 2027"). An unpicked rhythm is not sent as
   * a choice, so the server takes the situation's own rhythm and length; the page showed its own
   * default instead. It shows the server's now: the situation the save will carry (the same expression
   * as the payload), its recommended rhythm while none is picked, and its usual end while none is set,
   * which then goes with the save as the end, so the dates listed are the dates used.
   */
  const theSituationSaved = (onboardingSelections.classifiedScenario || onboardingSelections.mode || scenario || '') as ScenarioKey
  const [endChosen, setEndChosen] = useState(false)
  useEffect(() => {
    /*
     * FAULT 2: THE ANCHOR IS ONE MONTH, WEEKLY (section 20). `HELP_TEAM_UNDERSTAND` is not in
     * SCENARIO_FACTS at all (it is the anchor's own situation key, not a picker card), so without
     * this the lookup below found nothing, the cadence stayed the component's bare 'FORTNIGHTLY'
     * default and no end date was ever set - the save card showed "every 2 weeks" with no end, and
     * the saved check-in carried `ends_at: null`. The lead can still change either.
     */
    if (isAnchorDraft()) {
      /*
       * SCREEN FAULT 3: WEEKLY HAS TO BE SENT AS A CHOICE, OR THE SERVER NEVER HEARS IT.
       *
       * `cadenceChosen` is what `buildCommitPayload` sends and what the service reads
       * (`entry.service.ts`: `dto.cadenceChosen === true && dto.cadence ...`) - an unmarked cadence
       * is read as nobody having picked one, so the server fell back to its own default
       * (FORTNIGHTLY) regardless of what this screen showed. The anchor's weekly rhythm is not the
       * page's bare default here, the same way its one-month end date just below is not left to
       * `endChosen` either - both are this situation's own settled answer, so both are marked chosen.
       */
      if (!cadenceChosen) { setCadence('WEEKLY'); setCadenceChosen(true) }
      if (!endChosen) {
        const from = checkInBy ? new Date(`${checkInBy}T00:00:00`) : new Date()
        const end = new Date(from.getFullYear(), from.getMonth() + 1, from.getDate())
        setLastCheckInBy(`${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`)
      }
      return
    }
    const facts = SCENARIO_FACTS[theSituationSaved]
    if (!facts) return
    if (!cadenceChosen) setCadence(CADENCE_VALUE[facts.cadence] as typeof cadence)
    if (!endChosen && facts.cadence !== 'One time') {
      const from = checkInBy ? new Date(`${checkInBy}T00:00:00`) : new Date()
      /* The length said in the conversation first ("six weeks"), else the situation's usual one. */
      const days = plannedFrom?.timelineDays ?? facts.timelineDays
      /* The end is the day of the last check-in, as many as that length holds at this rhythm. */
      const gap = ({ DAILY: 1, WEEKLY: 7, FORTNIGHTLY: 14, MONTHLY: 30 } as Record<string, number>)[cadenceChosen ? cadence : CADENCE_VALUE[facts.cadence]] ?? 1
      const n = Math.max(1, Math.floor(days / gap))
      const end = gap === 30
        ? new Date(from.getFullYear(), from.getMonth() + (n - 1), from.getDate())
        : new Date(from.getFullYear(), from.getMonth(), from.getDate() + gap * (n - 1))
      setLastCheckInBy(`${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`)
    }
  }, [theSituationSaved, cadenceChosen, cadence, endChosen, checkInBy, plannedFrom?.timelineDays, onboardingSelections.classifiedScenario, scenario, pickedSituation])

  /*
   * PUTS BACK THE SETUP THIS DEVICE KEPT.
   *
   * It used to live only inside the mount effect below, so the one other way in - "Carry on with
   * this one" on the in-progress card - closed the card and left the empty first screen behind it.
   * The setup only came back after reloading /start. Both ways in now use this.
   */
  function restoreTheSavedSetup(saved: EntrySession) {
      setHistory(saved.history)
      if (saved.report) { try { setSessionReport(JSON.parse(saved.report)) } catch { /* legacy plain text - discard */ } }
      /* "Others check in, I read what comes back" survives a reload. There are no lead details to
         restore any more - a saved session from before that answer was removed still carries them,
         and they are simply not read: the ground it commits to has no lead to invite. */
      if ((saved as any).flowPath === 'lead') setFlowPath('lead')
      if (saved.email) setEmail(saved.email)
      /* Whole state or none: the plan comes back with the conversation. */
      if (typeof saved.sessions === 'number' && saved.sessions > 0) setSessions(saved.sessions)
      if (saved.cadence) { setCadence(saved.cadence as typeof cadence); setCadenceChosen(!!saved.cadenceChosen) }
      if (saved.groundName) setGroundName(saved.groundName)
      if (saved.plannedFrom) setPlannedFrom(saved.plannedFrom)
      if (saved.onboardingSelections) {
        setOnboardingSelections(saved.onboardingSelections)
      }
      if (saved.thePeopleStep) {
        setThePeopleStepRules(saved.thePeopleStep)
      }
      if ((saved as any).anchorGroundLabel) {
        setAnchorGroundLabel((saved as any).anchorGroundLabel)
      }
      // A closed session stays closed across reloads - "this session's answers
      // then lock" must survive a refresh. (closed was saved but never restored,
      // so ended sessions reopened editable.)
      if (saved.closed) setClosed(true)
      const step = saved.onboardingStep ?? 0
      // The lead path legitimately has an empty history (the coordinator has no
      // check-in), so it must not fall back into onboarding on reload.
      if (step >= ONBOARDING_STEPS && (saved.history.length > 0 || (saved as any).flowPath === 'lead')) {
        setPhase('checkin')
        setOnboardingStep(ONBOARDING_STEPS)
        // Reload between hand-off and save: reopen the save card so the
        // coordinator lands back where they left off - only when there is something to save.
        if (leadReturnsToSaveCard(saved as any)) setShowSave(true)
        /* Nothing said yet: the session was closed under the old rule. Everyone does a first
           check-in, so it opens here rather than on a card that cannot save. */
        if (leadNeedsTheirFirstCheckIn(saved as any, ONBOARDING_STEPS)) {
          setClosed(false)
          startCheckin.mutate()
        }
      } else if (step > 0) {
        setPhase('onboarding')
        setOnboardingStep(step)
        // Restore onboarding history from session if present
        if ((saved as any).onboardingHistory) {
          setOnboardingHistory((saved as any).onboardingHistory)
          setOnboardingReady((saved as any).onboardingReady ?? false)
        }
      }
  }

  // Load or start session
  useEffect(() => {
    const saved = loadSession()
    const branch = saved ? (wantsANewOne ? 'conflict' : entryRestoreBranch(saved, scenario)) : 'fresh'
    // Closed-but-unsaved sessions MUST restore too: they hold the report and
    // the locked transcript. Excluding them made the fallback below DELETE an
    // ended session on reload, right when it is most valuable.
    if (saved && branch === 'restore') {
      restoreTheSavedSetup(saved)
    } else if (saved && branch === 'conflict') {
      // Arriving with a new scenario while ANY session exists (open or closed):
      // ask, never silently discard. Show inline conflict modal instead of
      // window.confirm.
      const sels: OnboardingSelections = { mode: urlMode || 'new', initial: urlInitial || scenario || '' }
      setPendingNewScenario({ sels })
      setShowNewScenarioConflict(true)
    } else {
      clearEntrySession()
      /*
       * THE SCENARIO KEY IS NOT A DESCRIPTION OF ANYTHING.
       *
       * `initial` is what this check-in is about, in the person's words, and it is what the check-in
       * gets NAMED from. Seeding it with the raw parameter put "NEW_HIRE" in the rail and on the
       * header - photographed the moment /grounds/new started handing over with the scenario in the
       * query string, which is now the ordinary signed-in path rather than a rare marketing link.
       *
       * Only a description somebody actually wrote is seeded. A bare scenario says which situation
       * it is and nothing about theirs, and the conversation is about to ask.
       */
      if (urlInitial) {
        const sels: OnboardingSelections = { mode: urlMode || 'new', initial: urlInitial }
        setOnboardingSelections(sels)
        persistOnboarding([], sels, 1)
      }
      /*
       * ARRIVING WITH THE SITUATION ALREADY PICKED, WHICH IS HOW THE SIGNED-IN DOOR NOW WORKS.
       *
       * `/grounds/new` is the picker and nothing else: pick a card there and it hands the rest to
       * this conversation. Without this the person would be shown the picker a second time and
       * asked to choose the thing they had just chosen - which is the "click went nowhere" bug in
       * its most literal form.
       *
       * Only when the scenario names a real card. A `?scenario=` from an old marketing link that
       * matches nothing still lands on the picker, which is the right place for somebody whose
       * situation we do not know.
       */
      const already = SITUATION_CARDS.find((c) => c.scenario === scenario)
      if (already) {
        setPickedSituation(already.label)
        setPickedScenario(already.scenario)
        theyArrivedHavingPicked.current = already.message
      }
    }
  }, [])

  /**
   * SENT ONCE, AFTER THE FIRST PAINT, RATHER THAN INSIDE THE EFFECT ABOVE.
   *
   * `sendOnboarding` reads state the mount effect is still setting, so calling it from in there
   * posts a history that does not yet contain what was just chosen. A ref carries the message out
   * and this fires it on the next tick, when the picked situation is actually in state.
   */
  const theyArrivedHavingPicked = useRef<string | null>(null)
  useEffect(() => {
    const said = theyArrivedHavingPicked.current
    if (!said) return
    theyArrivedHavingPicked.current = null
    sendOnboarding(said)
  }, [pickedScenario])

  /* WHOLE STATE OR NONE. The conversation, the situation and the step survived a reload; the session count,
     the cadence and the name lived in a plain zustand store and did not, so "12 sessions planned" came back
     as "1 session planned" - the number the person agreed to, replaced. */
  function persistOnboarding(h: Turn[], sels: OnboardingSelections, step: number, obHistory?: Turn[], obReady?: boolean) {
    saveSession({ scenario, history: h, closed: false, onboardingStep: step, onboardingSelections: sels, sessions, cadence, cadenceChosen, groundName, plannedFrom, thePeopleStep: thePeopleStepRules, anchorGroundLabel, ...(obHistory !== undefined ? { onboardingHistory: obHistory, onboardingReady: obReady ?? false } : {}) } as any)
  }

  /*
   * AND THE SAME WHOLE STATE HERE, WHICH IS WHERE IT WAS LOST.
   *
   * The comment above says whole state or none, and this sibling dropped the four fields it names.
   * `saveSession` writes the record rather than merging into it, so the first persist after the
   * check-in starts erased the plan somebody had just agreed to. Seen live: "6 sessions planned"
   * came back as "1 session planned" after a reload, with the conversation intact above it.
   */
  function persistCheckin(h: Turn[], cl = false, rep = '') {
    saveSession({ scenario, history: h, closed: cl, report: rep, onboardingStep: ONBOARDING_STEPS, onboardingSelections, sessions, cadence, cadenceChosen, groundName, plannedFrom, thePeopleStep: thePeopleStepRules, anchorGroundLabel } as any)
  }

  /*
   * THE STREAM IS THE ANIMATION. A typewriter used to redraw each reply over about a second after
   * it had arrived whole. Replies arrive a sentence at a time now (entryApi.chatStream), so the
   * words appear as the model says them and nothing is redrawn. The typewriter also broke on a real
   * stream: every delta restarted it, and the final reply could match the last delta and skip the
   * redraw with a half-drawn line still on screen.
   */
  useEffect(() => {
    if (phase !== 'checkin') return
    setDisplayedHistory(history)
    const lastIdx = history.length - 1
    const last = history[lastIdx]
    setStreamingIdx(loading && last?.role === 'assistant' && last.content !== '…' ? lastIdx : null)
  }, [history, phase, loading])

  /**
   * SCROLL TO THE NEWEST MESSAGE - IN BOTH CHATS, NOT ONE OF THEM.
   *
   * One ref serves two conversations: the setup chat and the check-in. The dependency list only
   * carried the check-in's history, so in setup nothing ever scrolled. Every answer was appended
   * below the fold of a list that did not move, and the composer - painted after it - covered it.
   * Read back as "the message I type goes behind the chat input field", which is exactly what it
   * looked like: the message was there, underneath, and nothing had scrolled down to it.
   *
   * `onboardingLoading` is in here too, because the typing indicator appears and disappears as its
   * own row and changes the height of the list without changing the history.
   */
  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight
  }, [displayedHistory, onboardingHistory, loading, onboardingLoading, onboardingStep, phase])

  // Start first check-in question (AI-generated) after onboarding
  const startCheckin = useMutation({
    mutationFn: () => {
      /* One composer, one shape - see composeLeadBrief. This built the same string a second way,
         with the same doubled full stops and the same duplicated label. */
      const ctx = composeLeadBrief(onboardingSelections)

      return entryApi.chat([{
        role: 'user',
        content: `I have completed the onboarding. Here is my context. ${ctx}. Please ask me your first specific check-in question based on what I told you. Reference my situation and what I said I need. Do not open generically. Do not ask what my role is. Ask one direct specific question drawn from what I have shared.`,
      /*
       * THE SITUATION THEY PICKED, NOT ONLY A URL PARAMETER.
       *
       * This sent `scenario`, which is `params.get('scenario')` - set when somebody arrives from a
       * marketing link and empty for everybody who lands on /start and picks a card. So the CHECK-IN
       * fell to the server's default of NEW_PROJECT for the ordinary path: a person who had just
       * spent four turns setting up a new hire was interviewed as though they were starting a
       * project. All the work making SETUP situation-aware stopped at the setup.
       */
      }], isAnchorDraft() ? 'HELP_TEAM_UNDERSTAND' : (onboardingSelections.classifiedScenario || pickedScenario || scenario || undefined), groundName || undefined)
    },
    onSuccess: (res) => {
      const transition: Turn = { role: 'assistant', content: 'Good, I have what I need. Now let me ask you how it is actually going.' }
      const h: Turn[] = [transition, { role: 'assistant', content: res.reply }]
      setHistory(h)
      setDisplayedHistory(h)
      setPhase('checkin')
      persistCheckin(h)
    },
    onError: () => toast.error('Could not start check-in. Please try again.'),
  })

  const sendMut = useMutation({
    /* Same situation for every turn after the first, and for the same reason - a check-in that
       opens on the right question and continues on a generic one is the same bug, one turn later. */
    mutationFn: (msgs: Turn[]) => {
      /* The '…' placeholder send() appended becomes the reply as the sentences arrive. */
      let shown = ''
      return entryApi.chatStream(
        msgs,
        isAnchorDraft() ? 'HELP_TEAM_UNDERSTAND' : (onboardingSelections.classifiedScenario || pickedScenario || scenario || undefined),
        groundName || undefined,
        (text) => {
          shown += text
          const live = shown
          setHistory(prev => {
            const last = prev[prev.length - 1]
            if (!last || last.role !== 'assistant') return prev
            return [...prev.slice(0, -1), { role: 'assistant', content: live }]
          })
        },
        /* Everybody setup heard named. The check-in asked "who else is involved" after being told
           three times, and the block that stops that needs the names to state. */
        onboardingSelections.peopleNamed,
        /* AND EVERY WORD THEY TYPED IN SETUP. The invention gate reads the current phase only, so
           "Kano" and "Amina" - both in her first sentence - were deleted from check-in replies as
           names nobody had said. Their own vocabulary crosses the phase boundary with them. */
        [
          ...onboardingHistory.filter((t) => t.role === 'user').map((t) => t.content),
          onboardingSelections.initial ?? '',
          onboardingSelections.whoInvolved ?? '',
          onboardingSelections.decision ?? '',
          ...(onboardingSelections.goals ?? []),
        ].filter(Boolean),
      )
    },
    onSuccess: (res, msgs) => {
      const newTurn: Turn = { role: 'assistant', content: res.reply }
      const updated = [...msgs, newTurn]
      setHistory(updated)
      setLoading(false)
      // Consume the backend's completion signal (previously ignored: the client
      // re-derived its own phrase-match and threw res.sessionComplete away). The reply
      // phrase-match stays as a backstop for phrasings the backend's own matcher misses.
      /* Not while it is still asking. See itIsStillAskingSomething: the completion signal can
         arrive on a turn that ends in a question, and offering to close over the top of one loses
         the answer. The signal comes again on the next turn. */
      if (sessionHasClosed(res) && !closed && !endPromptDismissed && !itIsStillAskingSomething(res.reply)) {
        setShowEndPrompt(true)
      }
      persistCheckin(updated)
    },
    onError: (_err, msgs) => {
      setLoading(false)
      /* B-052: `msgs` is `[...history, userTurn]`, so the turn that failed stays on screen as a
         sent message rather than vanishing - and `send()` already called `persistCheckin` with it
         before this mutation ran, so it survives a reload too. The toast used to say only "Message
         failed. Try again.", a clipped label that never told the reader their words were safe (the
         prototype's own "Not saved" state, states.txt, always pairs the failure with that). Said
         plainly and truthfully here, the same way ChatPage's own failed-send toast already does. */
      setHistory(msgs)
      toast.error('That did not send. What you wrote is still here, try again.')
    },
  })

  const [reportTurnsForRetry, setReportTurnsForRetry] = useState<Turn[] | null>(null)

  /**
   * ONE NAME FOR THE FAILURE STATE.
   *
   * The condition was written out at the retry banner and nowhere else, so the report header had
   * no way to know the report had failed and kept rendering its quality meter above the apology.
   * Named once, both places agree by construction.
   */
  const reportFailed = !generatingReport && !sessionReport && closed && !!reportTurnsForRetry

  async function generateSessionReport(turns: Turn[]) {
    setGeneratingReport(true)
    setReportTurnsForRetry(turns)
    try {
      /* The anchor's seven items go with the report too (request 166), so the lead's reveal says
         what she said rather than "not written down yet". Every other draft sends nothing here. */
      const res = await entryApi.report(turns, scenario || undefined, groundName || undefined, onboardingSelections.peopleNamed, isAnchorDraft() ? onboardingSelections.anchorItems : undefined)
      setSessionReport(res.report)
      setReportTurnsForRetry(null)
      persistCheckin(turns, true, res.report ? JSON.stringify(res.report) : '')
    } catch {
      setSessionReport(null)
      persistCheckin(turns, true, '')
      toast.error('We could not generate your session report. Your responses are saved.')
    } finally {
      setGeneratingReport(false)
    }
  }

  function handleEndSession() {
    setShowEndPrompt(false)
    setClosed(true)
    setShowSave(true)
    generateSessionReport(history)
  }

  // Anonymous correction: each message the user sends here goes through the
  // real conversation engine (/entry/chat), same as the original check-in -
  // not a one-shot patch. The engine can push back or ask a follow-up; the
  // report only regenerates once the exchange reaches the same natural-close
  // signal the original check-in already uses (res.sessionComplete or
  // SESSION_END_PATTERNS). If regeneration fails, this degrades to the
  // existing retry card, which retries with the corrected turns, so nothing
  // in the exchange is lost.
  async function submitReportCorrection() {
    const text = correctionText.trim()
    if (!text || correctionLoading || generatingReport) return
    const startIdx = correctionStartIndex ?? history.length
    if (correctionStartIndex === null) setCorrectionStartIndex(startIdx)
    const turn: Turn = correctionStartIndex === null ? buildCorrectionTurn(text) : { role: 'user', content: text }
    const withTurn = [...history, turn]
    setHistory(withTurn)
    setCorrectionText('')
    setCorrectionLoading(true)
    try {
      const res = await entryApi.chat(withTurn, scenario || undefined, groundName || undefined)
      const withReply: Turn[] = [...withTurn, { role: 'assistant', content: res.reply }]
      setHistory(withReply)
      if (sessionHasClosed(res)) {
        setShowCorrection(false)
        setCorrectionStartIndex(null)
        await generateSessionReport(withReply)
      }
    } catch {
      /* Same defect, same shape: the textarea was cleared before the call and the message said
         otherwise. The turn stays in the history — the server may have taken it — and the words go
         back where they were typed. */
      setCorrectionText(text)
      toast.error('That did not send - what you wrote is back in the box. Try again.')
    } finally {
      setCorrectionLoading(false)
    }
  }
  // Manual escape hatch: mirrors handleEndSession - if the engine never emits
  // a natural-close signal, the user can still close out the correction
  // exchange and regenerate the report from whatever was said so far.
  function finishCorrection() {
    if (correctionLoading || generatingReport) return
    setShowCorrection(false)
    setCorrectionStartIndex(null)
    generateSessionReport(history)
  }
  const reportWasCorrected = history.some(isCorrectionTurn)
  const correctionExchange = correctionStartIndex !== null ? history.slice(correctionStartIndex) : []

  // Self path: this is the person's own situation - straight into the check-in
  // (no interstitial page). The "~10 min" estimate and the two-report framing
  // live at the top of the check-in itself.
  function startSelfPath() {
    setFlowPath('self')
    setOnboardingStep(ONBOARDING_STEPS + 1)
    persistOnboarding([], { ...onboardingSelections }, ONBOARDING_STEPS)
    startCheckin.mutate()
  }

  // Coordinator/lead path: the person is setting this up for someone else to
  // run. NO fake transcript and NO phantom check-in - the coordinator did not
  // have a session, so nothing pretends they did. The lead (captured below)
  // is invited at commit time via the for-lead machinery and becomes the
  // initiator once they confirm.
  /**
   * THEY WRITE THE CONTEXT, OTHER PEOPLE CHECK IN AGAINST IT.
   *
   * This was `submitLeadCapture`, and it took a lead's email so that person could be invited to
   * confirm a context they had not written. What is left is the honest half of it: nothing pretends
   * this person had a session, because they did not, and the next screen is the one that invites
   * the people who will actually give the accounts.
   */
  /**
   * EVERYONE DOES A FIRST CHECK-IN. This answer used to skip it: the session closed on the spot with
   * an empty history, and the save then failed with NO_ENTRY_SESSION because there was nothing to
   * save. Now it goes into the same first check-in as the other answer. What it changes is later: a
   * managing-only lead is given no second session, only the people they invite are.
   */
  function othersGiveTheAccounts() {
    setFlowPath('lead')
    setOnboardingStep(ONBOARDING_STEPS + 1)
    persistOnboarding([], { ...onboardingSelections }, ONBOARDING_STEPS)
    startCheckin.mutate()
  }

  // AI-driven onboarding send
  /*
   * `scenarioNow` is the situation this very turn starts from. Setting state and sending in the same
   * click left the send reading the old state, so a card's first turn went out with no situation
   * and its own first question was never asked. Passed straight through, it cannot be stale.
   */
  async function sendOnboarding(text: string, scenarioNow?: string | null) {
    if (!text.trim() || onboardingLoading) return
    const userTurn: Turn = { role: 'user', content: text.trim() }
    const newHistory = [...onboardingHistory, userTurn]
    setOnboardingHistory(newHistory)
    setInput('')
    setOnboardingLoading(true)
    /*
     * B-041: REFRESHING WHILE GROUNDWORK WAS STILL COMPOSING ITS REPLY RETURNED TO THE VERY FIRST
     * BLANK "SET UP A CHECK-IN" SCREEN, WITH WHAT WAS TYPED GONE AND NO HISTORY.
     *
     * `persistOnboarding` only ever ran after `entryApi.onboardStream` resolved, so the message
     * just sent - for a first message, the only thing said so far - existed only in React state
     * until the reply came back. Saved here too, the moment it is sent, the same fix as `send()`'s
     * own `persistCheckin` a little further down this file.
     */
    persistOnboarding([], onboardingSelections, onboardingStep, newHistory, onboardingReady)
    try {
      /*
       * THE SITUATION GOES WITH THE MESSAGES NOW.
       *
       * `classifiedScenario` is preferred over the card because it is later evidence: somebody who
       * clicked "A new project starting" and then described a contract renewal has been reclassified
       * from what they typed, and the question should follow what they said rather than what they
       * first guessed. The card is the fallback, and it is what carries the very first turn - before
       * the classifier has anything to run on.
       *
       * The MOMENT is only ever sent when they have actually said which it is. One card reads it
       * (onboarding a group is a different question from an ongoing read of one), and guessing it
       * would ask the wrong one of the two with complete confidence.
       */
      setOnboardingDraft('')
      let draft = ''
      const res = await entryApi.onboardStream(
        withoutPickedOpener(newHistory) as Turn[],
        isAnchorDraft() ? 'HELP_TEAM_UNDERSTAND' : (onboardingSelections.classifiedScenario || (scenarioNow === undefined ? pickedScenario : scenarioNow) || scenario || undefined),
        onboardingSelections.mode === 'something_new' ? 'STARTING' : undefined,
        (text) => { draft += text; setOnboardingDraft(draft) },
        /*
         * WHAT THE LAST TURN ALREADY WORKED OUT, HANDED BACK.
         *
         * This screen has held the read of the conversation all along - it is what the summary card
         * renders - and setup was throwing it away and re-deriving the whole situation from the
         * transcript on every turn. Live, that dropped a named team, never asked why now, and moved
         * the planned session count three times while the person answered about something else. See
         * what-setup-already-knows-travels-with-it on the API side.
         */
        {
          ...onboardingSelections,
          ...(yourRole ? { yourRole } : {}),
          ...(cadenceChosen ? { cadence } : {}),
          ...(plannedFrom?.timelineDays ? { timelineDays: plannedFrom.timelineDays } : {}),
        },
      )
      setOnboardingDraft('')
      // Safety net: if the endpoint says we are ready to wrap up but the reply
      // still asks a question, showing the wrap-up card would strand that
      // question (the input hides). Swap the question-reply for a clean closer
      // so the user never sees a question they cannot answer.
      const assistantTurn: Turn = { role: 'assistant', content: onboardDisplayReply(res.reply, res.ready) }
      const updatedHistory = [...newHistory, assistantTurn]
      setOnboardingHistory(updatedHistory)
      // Merge extracted fields into selections
      if (res.extracted) {
        setOnboardingSelections(prev => ({
          ...prev,
          ...(res.extracted.mode ? { mode: res.extracted.mode! } : {}),
          ...(res.extracted.initial ? { initial: res.extracted.initial! } : {}),
          ...(res.extracted.whoInvolved ? { whoInvolved: res.extracted.whoInvolved! } : {}),
          ...(res.extracted.peopleNamed?.length ? { peopleNamed: res.extracted.peopleNamed! } : {}),
          ...(res.extracted.peopleEmails ? { peopleEmails: res.extracted.peopleEmails } : {}),
          ...(res.extracted.decision ? { decision: res.extracted.decision! } : {}),
          ...(res.extracted.goals ? { goals: res.extracted.goals! } : {}),
          ...(res.extracted.brief !== undefined ? { brief: res.extracted.brief! } : {}),
          /*
           * FAULT 2: THE ANCHOR'S SEVEN ITEMS, WHICHEVER OF THEM THE ENGINE HAS SENT SO FAR.
           * Not served yet, so this is a no-op today - every key below is `undefined` and the
           * spread adds nothing. The moment the engine starts sending them, they merge here the
           * same way every other extracted field does, and the panel already knows how to draw
           * them (FillsInAsYouTalk.tsx's `theAnchorRows`).
           */
          ...((
            res.extracted.responsibleFor !== undefined ||
            res.extracted.tryingToMove !== undefined ||
            res.extracted.howItContributes !== undefined ||
            res.extracted.seeingToday !== undefined ||
            res.extracted.whyItBothersYou !== undefined ||
            res.extracted.whatTheyDontUnderstand !== undefined ||
            res.extracted.whatTheyWouldDoDifferently !== undefined
          ) ? {
            anchorItems: {
              ...prev.anchorItems,
              ...(res.extracted.responsibleFor !== undefined ? { responsibleFor: res.extracted.responsibleFor } : {}),
              ...(res.extracted.tryingToMove !== undefined ? { tryingToMove: res.extracted.tryingToMove } : {}),
              ...(res.extracted.howItContributes !== undefined ? { howItContributes: res.extracted.howItContributes } : {}),
              ...(res.extracted.seeingToday !== undefined ? { seeingToday: res.extracted.seeingToday } : {}),
              ...(res.extracted.whyItBothersYou !== undefined ? { whyItBothersYou: res.extracted.whyItBothersYou } : {}),
              ...(res.extracted.whatTheyDontUnderstand !== undefined ? { whatTheyDontUnderstand: res.extracted.whatTheyDontUnderstand } : {}),
              ...(res.extracted.whatTheyWouldDoDifferently !== undefined ? { whatTheyWouldDoDifferently: res.extracted.whatTheyWouldDoDifferently } : {}),
            },
          } : {}),
        }))

        /**
         * Use the rhythm and length they actually said.
         *
         * `cadence` was a useState('FORTNIGHTLY') that nothing ever updated, so
         * someone who said "90 days, weekly check-ins" got a FORTNIGHTLY ground -
         * about six sessions instead of twelve. Their words were captured
         * correctly in the brief and then dropped on the way to the enum, which
         * made it a mapping failure rather than a comprehension one. GW-017.
         *
         * Only applied when the extraction actually found something: the prompt
         * is told never to guess, so an absent field means they did not say, and
         * the existing default stands rather than being overwritten with a
         * fabricated one.
         *
         * This also gives the header a real number to show instead of the
         * placeholder that read "1/1 sessions" (GW-005).
         */
        setNeedsPeople(!!res.needsPeople)
        if (res.extracted.yourRole) {
          setYourRole(res.extracted.yourRole)
          /*
           * THIS USED TO JUMP STRAIGHT TO "WHO RUNS THE FIRST CHECK-IN?", AND THAT QUESTION IS GONE.
           *
           * There were two non-party answers and both handed the check-in to a lead, who was then
           * emailed to confirm a context they had not written and could not read until they
           * accepted. Her call: "I think we should remove the whole org admin setting a context and
           * handing it over to a lead. It seems like it is confusing."
           *
           * There is one non-party answer left and it does not hand anything over: you write what
           * this is about, other people check in against it, and you read what comes back. That
           * needs no extra question, so nothing is auto-advanced - the fork below says back what
           * they said and the click starts it.
           */
        }
        /* The name they gave in so many words ("Call it ..."), unless they have already typed one in the header (user journeys, F-3). */
        if (res.extracted.name && (!groundName.trim() || groundName === 'Entry session')) setGroundName(res.extracted.name)
        if (res.extracted.cadence) { setCadence(res.extracted.cadence); setCadenceChosen(true) }
        if (res.extracted.timelineDays && res.extracted.timelineDays > 0) {
          /**
           * THE SAME ARITHMETIC AS THE SERVER, NOT A FOURTH COPY OF IT. W8-4.
           *
           * This had its own switch and rounded to nearest, while the server and
           * every other screen round down. Twenty days of weekly check-ins is
           * two whole weeks with six days left over: this page promised three
           * and the server then created two, so the first thing the ground did
           * was contradict the number the person had just agreed to.
           */
          const planned = plannedSessionsFor(res.extracted.timelineDays, res.extracted.cadence ?? cadence)
          if (planned != null) { setSessions(planned); setPlannedFrom({ timelineDays: res.extracted.timelineDays, cadence: res.extracted.cadence ?? cadence }); setSessionsTypedByLead(false) }
        }
        // Background classify intent when we have initial
        if (res.extracted.initial && !isAnchorDraft()) {
          /*
           * FAULT 1(a): AN ANCHOR DRAFT IS NEVER RECLASSIFIED.
           *
           * The classifier is a guess from free text, and an anchor draft's situation
           * (`HELP_TEAM_UNDERSTAND`) is not a guess - it is how the person arrived. Calling the
           * classifier for an anchor draft used to let a confident wrong guess (e.g. "DRIFT")
           * overwrite `classifiedScenario`, which then leaked into the "This sounds like ..."
           * banner and into every later entry call and the commit's situation field. Skipping the
           * call entirely for an anchor draft is simpler than calling it and discarding the
           * answer, and it saves the request.
           */
          entryApi.classifyIntent(res.extracted.initial, res.extracted.mode).then(r => {
            /* A low-confidence answer comes back as null and the card they picked stands. */
            const sure = r.scenario
            if (sure) setOnboardingSelections(prev => ({ ...prev, classifiedScenario: sure }))
          }).catch(() => { /* non-critical */ })
        }
      }
      setOnboardingReady(res.ready)
      persistOnboarding([], onboardingSelections, onboardingStep, updatedHistory, res.ready)
      /*
       * THE ANCHOR HAS NO FORK AND NO SECOND CONVERSATION (request 165, "the rest of the anchor's
       * walk"). Every other situation reaches `ready` and then asks who does the check-ins - "I set
       * this up and check in myself" against "I check in once...", each of which opens an ordinary
       * first check-in that asks her opening question again. The spec for the anchor has neither: her
       * set-up conversation IS the one conversation, so once it is ready, this conversation's own
       * transcript becomes the session's record straight away, and the next thing she sees is the
       * reveal and the people step.
       */
      if (res.ready && isAnchorDraft()) {
        setHistory(updatedHistory)
        setClosed(true)
        setShowSave(true)
        generateSessionReport(updatedHistory)
      }
      setTimeout(() => {
        if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight
      }, 50)
    } catch {
      /**
       * IT SAID THE MESSAGE WAS STILL HERE AND PUT IT NOWHERE.
       *
       * The composer was cleared on the way in and the turn was reverted out of the history on the
       * way out, so the text existed in neither place — and the toast said the opposite, which is
       * worse than saying nothing: somebody who is told their words are safe does not retype them.
       *
       * Put it back where they wrote it. The turn still comes out of the history, because a turn
       * the server never took is not part of the conversation.
       */
      setOnboardingHistory(onboardingHistory)
      setInput(text.trim())
      toast.error('That did not send - your message is back in the box. Try again.')
    } finally {
      setOnboardingLoading(false)
    }
  }

  // Read a text-based file client-side (no ground exists yet during onboarding).
  async function readDocFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(String(r.result || ''))
      r.onerror = () => reject(new Error('read failed'))
      r.readAsText(file)
    })
  }

  async function handleDocFileUpload(file: File) {
    try {
      const text = await readDocFile(file)
      if (!text.trim()) { toast.error('That file looks empty or is not plain text. Try pasting the content instead.'); return }
      setDocLabel(file.name)
      setDocPasteText(text)
      setDocTab('paste') // show what was read so they can add context and confirm
    } catch {
      toast.error('Could not read that file. Paste the text instead.')
    }
  }

  // Inject the document into the conversation so the AI reads it and reports back
  // what it gathered. Reuses sendOnboarding, which appends the turn and re-asks.
  function submitOnboardingDoc() {
    const content = docPasteText.trim()
    if (!content) return
    const label = docLabel.trim() || 'a document'
    const note = docContextNote.trim()
    const composed =
      `I am adding a document to my record: "${label}".` +
      (note ? ` Context: ${note}.` : '') +
      ` Please read it and tell me what you gathered from it that I have not already said, then continue.\n\n--- DOCUMENT START ---\n${content}\n--- DOCUMENT END ---`
    setShowDocPanel(false)
    setDocPasteText(''); setDocLabel(''); setDocContextNote('')
    sendOnboarding(composed)
  }

  /**
   * Kick off the onboarding with the intro - WITHOUT clobbering a restored one.
   *
   * This effect depends on `phase`, and the restore path sets `phase` to
   * 'onboarding'. So on a refresh it fired with a stale `onboardingHistory.length`
   * of 0, from the render before the restore applied, and overwrote the restored
   * conversation with the single intro turn.
   *
   * The visible result was the bug in GW-003: refresh mid-conversation and the
   * seventeen-card picker comes back (it renders when the history has exactly one
   * turn), the conversation is gone from the screen, and there is no input to
   * continue in - while all the turns are still sitting in localStorage. Someone
   * who refreshes, or returns to the tab, starts over.
   *
   * The functional update is the fix: it reads the CURRENT history rather than the
   * one captured when the effect was created, so it cannot overwrite anything that
   * is already there. The early return above is kept as a cheap first check, but it
   * is no longer what makes this safe.
   */
  /**
   * THE REST OF "YES, SET IT UP": `aim` AND `people`. `aim` is the engine's own sentence for what
   * the new check-in is working towards, kept as this draft's name - the same field the admin
   * section lets the lead rename. `people` are taken in exactly as commit takes them elsewhere on
   * this page (a plain email, the same shape typing one by hand produces), each shown as
   * `leftOut[].why` already told the lead on the board, not repeated here. Seeded once, the same
   * guard as the initial message just below, so a restored session is never overwritten.
   */
  useEffect(() => {
    if (phase !== 'onboarding' || !anchorSetUp) return
    /* `groundName` defaults to 'Entry session' (the store's own default, never a name anybody
       chose), so the check is against that default rather than emptiness. */
    if (anchorSetUp.aim && (!groundName || groundName === 'Entry session')) setGroundName(anchorSetUp.aim)
    if (anchorSetUp.people?.length) {
      setInviteAdded(prev => (prev.length ? prev : anchorSetUp.people!.map(c => c.email)))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  /**
   * WHAT `GET /entry/anchor-start` ANSWERED, FOLDED STRAIGHT INTO THIS DRAFT'S OWN STATE (decision
   * 114). This used to be `AnchorLandingPage.tsx` writing `sessionStorage` for this page to read on
   * its next, separate mount; now it is this page's own call settling, so the served values are set
   * directly. `rememberTheAnchorStartSucceeded` and `rememberTheServedFirstQuestion` still go
   * through `TheSetup.tsx`'s sessionStorage helpers - `theAnchorStartSucceededForThisTab()` is read
   * from several places below, and `takeTheServedFirstQuestion()` is what the intro turn, just
   * below, still reads - so neither needed to change shape, only who calls them.
   */
  useEffect(() => {
    const started = anchorStartQuery.data
    if (!started) return
    rememberTheAnchorStartSucceeded()
    if (started.thePeopleStep) setThePeopleStepRules(started.thePeopleStep)
    if (started.groundLabel) setAnchorGroundLabel(started.groundLabel)
    rememberTheServedFirstQuestion(started.firstQuestion)
  }, [anchorStartQuery.data])

  useEffect(() => {
    if (phase !== 'onboarding' || anchorStartPending) return
    /*
     * FAULT 1 (the anchor's own first question, no door). An anchor arrival (`?scenario=
     * HELP_TEAM_UNDERSTAND`, with the switch confirmed on - `anchorConversationOpensDirectly()`,
     * above) opens on the engine's own opening line, never the ordinary picker's
     * `THE_OPENING_QUESTION`. `takeTheServedFirstQuestion()` reads what the `anchor-start` effect
     * just above remembered (request 163 item 9); until the engine serves it, `THE_ANCHOR_FIRST_
     * QUESTION` is the plan's own wording (docs/anchor-scenario-plan.md section 6). This is the ONLY
     * assistant turn ever placed in this draft's history for an anchor arrival - nothing below sends
     * a word on the lead's behalf; she types the first answer herself, into the ordinary composer,
     * which carries `scenario` (this page's own URL-derived constant) straight through
     * `sendOnboarding` to `entryApi.onboardStream`'s `scenario` field (see `atTheDoor`, below, for
     * where the door itself is skipped). `anchorStartPending` (above) holds this off until the
     * engine's own call has settled one way or the other, so a fresh anchor arrival never seeds
     * `THE_OPENING_QUESTION` for a moment and then has to replace it.
     */
    const INTRO = anchorConversationOpensDirectly() ? (takeTheServedFirstQuestion() ?? THE_ANCHOR_FIRST_QUESTION) : THE_OPENING_QUESTION
    // If URL params pre-populate, inject as first user message
    if (urlInitial) {
      setOnboardingHistory(prev => {
        if (prev.length > 0) return prev
        sendOnboarding(urlInitial)
        return [
          { role: 'assistant', content: INTRO },
          { role: 'user', content: urlInitial },
        ]
      })
    } else {
      setOnboardingHistory(prev => (prev.length > 0 ? prev : [{ role: 'assistant', content: INTRO }]))
    }
  }, [phase, anchorStartPending])

// Check-in send
  function send(text?: string) {
    const content = (text ?? input).trim()
    if (!content || loading || closed) return
    setInput('')
    if (taRef.current) taRef.current.style.height = '38px'
    const userTurn: Turn = { role: 'user', content }
    // Explicit end-intent: the person is telling us they are done. Show their message,
    // then surface the end control immediately rather than sending another turn the AI
    // only affirms ("you can submit whenever") while they repeat themselves. They still
    // confirm on the prompt, so a false positive costs one dismissable banner, never a
    // silent end. Only once there is something to end (>=1 prior exchange).
    if (isEndIntent(content) && history.length >= 1) {
      const updated = [...history, userTurn]
      setHistory(updated)
      setUploadedDoc(null)
      setEndPromptDismissed(false)
      setShowEndPrompt(true)
      persistCheckin(updated)
      return
    }
    setLoading(true)
    setUploadedDoc(null)
    setHistory(prev => [...prev, userTurn, { role: 'assistant', content: '…' }])
    /*
     * B-041: REFRESHING WHILE GROUNDWORK WAS STILL "THINKING…" LOST WHAT WAS JUST TYPED.
     *
     * `persistCheckin` only ever ran in `sendMut`'s `onSuccess`, so the message just sent (and,
     * for a first message, the WHOLE conversation so far) existed only in React state until a
     * reply came back - a refresh mid-reply returned to the blank "Set up a check-in" screen with
     * nothing to restore. Saved here too, the moment it is sent, so only the still-composing
     * reply itself is ever lost to a refresh, never what the lead already said.
     */
    persistCheckin([...history, userTurn])
    sendMut.mutate([...history, userTurn])
  }

  function handleCheckinKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = (ev.target?.result as string) ?? ''
      if (content.length > A_MESSAGE_MAX) {
        toast.warning(`${file.name} is large - only the first portion will be used in this session.`)
      }
      setUploadedDoc({ name: file.name, content: content.slice(0, A_MESSAGE_MAX) })
    }
    reader.onerror = () => toast.error('Could not read file.')
    if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.csv') || file.name.endsWith('.md')) {
      reader.readAsText(file)
    } else {
      setUploadedDoc({ name: file.name, content: `[Binary file: ${file.name}]` })
    }
    e.currentTarget.value = ''
    setDocContext('')
    setDocContextMode(true)
  }

  function submitDocContext() {
    const ctx = docContext.trim()
    setDocContextMode(false)
    if (!uploadedDoc) return
    /* The whole turn has to fit a message (8,000 characters, the same cap every door has), so the
       document part gives way to the wrapper and the context rather than the server refusing it. */
    const head = `[Document: "${uploadedDoc.name}"]\n`
    const tail = `\n\nContext from me: ${ctx || 'See attached document.'}`
    const content = `${head}${uploadedDoc.content.slice(0, Math.max(0, A_MESSAGE_MAX - head.length - tail.length))}${tail}`
    setUploadedDoc(null)
    setDocContext('')
    setLoading(true)
    const userTurn: Turn = { role: 'user', content }
    setHistory(prev => [...prev, userTurn, { role: 'assistant', content: '…' }])
    /* B-041, same fix as send() above: saved the moment it is sent, not only once the reply arrives. */
    persistCheckin([...history, userTurn])
    sendMut.mutate([...history, userTurn])
  }

  /**
   * The ground, as it will be created - built once and used by both ways out.
   *
   * There are two now: the emailed link, and Google. Google skips the email
   * round trip entirely (the address is already verified by Google), so the same
   * payload has to be reachable from a click that leaves the page immediately.
   * Duplicating it would guarantee the two paths drift.
   */
  function buildCommitPayload() {
    return {
        /* Which setup this is, so a retried save is the same check-in and a new setup is a new one (U.6 review). */
        setupKey: theSetupKey(),
        /*
         * SCREEN FAULT 2: THE NAME, FOR AN ANCHOR DRAFT, IS THE SERVED `groundLabel` ITSELF.
         *
         * Everywhere else, `groundName` (what the lead typed, or the aim the conversation drew out)
         * is the ground's name, and a blank one falls back to "A check-in at <organisation>". An
         * anchor draft never reaches that fallback and never shows the aim here either: the title,
         * sidebar, invitation and Today all read the one served sentence ("Help my team
         * understand") - `anchorGroundLabel`, set from `/entry/anchor-start`'s own `groundLabel`
         * the moment that call resolves (the `anchor-start` effect, above).
         */
        groundLabel: isAnchorDraft()
          ? anchorGroundLabel
          /* FAULTS 4 AND 6: THE NEW HIRE'S DEFAULT NAMES THE PERSON, NOT THE SITUATION. */
          : (groundName.trim() || theDefaultGroundName()),
        orgName: orgName.trim() || undefined,
        /*
         * FAULT 1(b): AN ANCHOR DRAFT'S SITUATION NEVER LOSES TO `onboardingSelections.mode`.
         *
         * `mode` (e.g. "already_underway") is a question answered INSIDE the anchor conversation,
         * not a different situation - but it used to be read ahead of the anchor key here, so the
         * commit's `scenario` field said "already_underway" instead of `HELP_TEAM_UNDERSTAND`. For
         * an anchor draft the anchor key always wins; every other draft keeps today's order
         * (classified scenario, then mode, then the URL param).
         */
        scenario: isAnchorDraft()
          ? 'HELP_TEAM_UNDERSTAND'
          : (onboardingSelections.classifiedScenario || onboardingSelections.mode || scenario || undefined),
        cadence,
        /* The page's default is not a choice; the server records only a confirmed pick as one. */
        cadenceChosen,
        cadenceAnchorDay: (cadence === 'WEEKLY' || cadence === 'FORTNIGHTLY' || cadence === 'MONTHLY') && cadenceAnchorDay != null ? cadenceAnchorDay : undefined,
        workingDays: workingDays.length ? workingDays : undefined,
        checkInBy: checkInBy.trim() || undefined,
        lastCheckInBy: lastCheckInBy.trim() || undefined,
        /* The WHOLE report they read, not two fields of it: what is sent here is what CheckIn.sessionReport keeps. */
        reportSummary: sessionReport ?? undefined,
        // The setter's own part in this, as the interview extracted it. Lands on their participant row.
        roleAsDescribed: sessionReport?.yourRole?.trim() || undefined,
        inviteNote: inviteNote.trim() || undefined,
        // Each contributor gets its own token - the server generates one per participant.
        // Do NOT pass a shared inviteToken here; it would cause unique constraint failures
        // on the second contributor and silently drop them.
        contributors: everyoneNamedSoFar().map(e => asSomeoneToInvite(e, displayNames)),
        /**
         * THE DOCUMENT SURVIVES AS A DOCUMENT, not just as words in the chat.
         *
         * "+ Doc" folds the file into the conversation as
         * `[Document: "name"] <text> Context from me: ...`, which is right for the
         * conversation and was the ONLY thing that happened to it. No record was
         * created, so a contract attached at the moment the product asks for
         * evidence never reached the Documents list, carried no visibility, got no
         * assessment, and did not count toward the document-backed share of the
         * record - a figure the report shows to both parties.
         */
        documents: uploadedDoc ? [{ fileName: uploadedDoc.name, content: uploadedDoc.content }] : undefined,
        /*
         * NOBODY IS HANDED THIS ANY MORE, so no `lead` goes with it. What still travels is the
         * BRIEF: this person wrote the context and gave no account of their own, so the onboarding
         * is the only thing the people who do check in have to work from. Sending it was always the
         * useful half of the coordinator path; inviting somebody to confirm a context they had not
         * written was the half she removed.
         */
        /*
         * "THEY DO. I READ WHAT COMES BACK." - and until now that answer went nowhere.
         *
         * `flowPath === 'lead'` is set by exactly one control: the second answer on the fork at the
         * end of setup. The person has said they are not one of the people checking in. Without
         * `managingOnly` they were recorded as a party anyway, given a session 1 of their own, and
         * chased for an account they had just said was not theirs to give.
         *
         * The BRIEF travels for the same reason it always did: they gave no account, so the
         * onboarding is the only context the people who do check in have to work from.
         */
        /*
         * AND THE BRIEF TRAVELS ON BOTH PATHS NOW, WHICH IS THE FIX FOR "THE BRIEF IS WRONG".
         *
         * It used to be sent only when the person was NOT checking in themselves. On every other
         * commit the server filled the brief with the report's own observation instead - the AI's
         * read of what this person had just said, in the second person:
         *
         *   "You have two standards for Zainab's first quarter. One you told her in week one; the
         *    other you have never written down and doubt she knows about."
         *
         * That is a finding about them, published to their team under a heading that says "the
         * lead's own words about the situation". Two things wrong at once: it is not a brief, and
         * it takes a read of somebody's private account and shares it without them choosing to.
         *
         * `composeLeadBrief` is their own answers, in their own words, and it always was - it was
         * simply not being sent unless they had opted out of checking in.
         */
        ...(composeLeadBrief(onboardingSelections)
          ? { brief: composeLeadBrief(onboardingSelections) }
          : {}),
        /*
         * WHAT THEY TYPED IN SETUP, THEIR OWN MESSAGES (U.7 re-check). The brief above is put together
         * from their answers; these are the words themselves, kept for the Context page's "What you
         * wrote" and shown to nobody else. A picked situation card and a folded-in document are not
         * things they typed.
         */
        leadsOwnWords: theirOwnSetupWords(onboardingHistory),
        ...(flowPath === 'lead' ? { managingOnly: true } : {}),
      }
  }


  /**
   * Hand the browser to Google, carrying the ground with it.
   *
   * The payload and transcript go into localStorage first because the page is
   * about to be replaced by Google's. Coming back, GoogleCallbackPage finds them
   * and commits - same browser, so nothing needs to survive on the server, and
   * nothing is persisted anywhere until the person has actually signed in.
   */
  function continueWithGoogle() {
    try {
      localStorage.setItem('gw_entry_pending_commit', JSON.stringify({
        payload: buildCommitPayload(),
        history,
      }))
    } catch {
      /**
       * STORAGE REFUSING USED TO COST THEM THE CONVERSATION, SILENTLY.
       *
       * The comment said "the ground is re-creatable", and then it navigated away regardless — so
       * in a private window, with a full quota, or in a browser told to block site data, somebody
       * pressed a button and their whole conversation was gone with no warning. Re-creatable is
       * true and is not the same as re-created: nobody types twenty minutes of it again.
       *
       * We cannot carry it past this page without storage, so the honest thing is to say so and
       * stay put. The email route works in every one of those browsers, and it is right there.
       */
      toast.error(
        'Nothing has been lost. This browser will not let us hold your conversation while you sign '
        + 'in with Google - use the email option below and it will be waiting for you.',
      )
      return
    }
    window.location.href = `${API_ORIGIN}/api/v1/auth/google`
  }

  /**
   * SAVING WHEN THERE IS ALREADY AN ACCOUNT.
   *
   * `/entry/commit` has always taken the signed-in user off the token and created the ground under
   * their organisation - it is the endpoint the magic link lands on. Nothing needed building; the page
   * simply never asked whether it was talking to somebody who had already signed in.
   */
  const [savingAsUser, setSavingAsUser] = useState(false)
  const [saving, setSaving] = useState(false)
  /**
   * WHO DID NOT GET A MAIL, AND WHY - CARRIED OVER FROM THE SCREEN THAT USED TO DO IT.
   *
   * The set-up wizard reported both of these and has since become a picker that hands over here, so
   * this is now the only place a check-in is created and the rules have to live here or nowhere.
   *
   * REFUSED INVITES ARE WRITTEN DOWN, not only toasted. A toast does not survive the navigation on
   * the next line, let alone a reload: an admin's list of five silently became three and the
   * destination page recorded none of it. Each carries the API's own sentence, because "the invite
   * did not send" is not actionable and "that address is already on this check-in" is.
   *
   * WAITING INVITES ARE COUNTED AND SAID ONCE. An invitation waits when the check-in starts in the
   * future - the row is written uninvited and the cron sends on the day - and saying nothing
   * produced "all participants i added didnt get an email". Once, with a number: five toasts saying
   * one thing is how a real message gets dismissed as noise.
   */
  function sayWhoWasNotInvited(res: {
    groundId: string
    contributors?: { email: string; waiting?: boolean }[]
    whyInvitesFailed?: { email: string; because: string }[]
    failedInvites?: string[]
  }) {
    const refused =
      res.whyInvitesFailed?.length
        ? res.whyInvitesFailed
        : (res.failedInvites ?? []).map((email) => ({ email, because: 'The invite did not send.' }))
    if (refused.length) {
      for (const f of refused) toast.warning(`${f.email}: ${f.because}`)
      rememberWhoWasNotInvited(res.groundId, refused)
    }
    const waiting = (res.contributors ?? []).filter((c) => c.waiting).length
    if (waiting > 0) {
      toast.info(
        waiting === 1
          ? 'One person is on the check-in and will be invited on the start date.'
          : `${waiting} people are on the check-in and will be invited on the start date.`,
      )
    }
  }

  async function saveAsSignedInUser() {
    /* The server refuses an empty session (NO_ENTRY_SESSION). Rather than show that code, go and do the check-in. */
    if (history.length === 0) {
      setShowSave(false)
      setClosed(false)
      toast.info('Nothing is on record yet. Your first check-in opens now; save when it closes.')
      startCheckin.mutate()
      return
    }
    setSavingAsUser(true)
    try {
      const res = await entryApi.commit({ ...buildCommitPayload(), history })
      /** The rail caches the grounds list, so it has to be told the ground exists. GW-019. */
      queryClient.invalidateQueries({ queryKey: ['grounds'] })
      clearEntryHandover()
      sayWhoWasNotInvited(res)
      navigate(`/grounds/${res.groundId}`, { replace: true })
      /*
       * WHERE THE PANEL THAT JUST VANISHED WENT.
       *
       * The save-and-invite card is the last thing a lead sees: their report, and the controls for
       * cadence, dates and who is on this. It commits and is gone, and nothing has ever said where
       * any of it went - reported as "that pop up where you set the team or cadence, no longer able
       * to be seen".
       *
       * All of it still exists. The report is on Report under Your sessions; the settings are on
       * Setup, which now names them. This is the sentence saying so, at the one moment somebody is
       * looking for them, and it is fired AFTER the navigate so it lands on the page it describes.
       */
      toast.info('Cadence, dates and who is on this are on Setup. Your report is on Report, under Your sessions.')
    } catch (err: any) {
      setSavingAsUser(false)
      /*
       * THE SERVER'S OWN SENTENCE, AND ONLY WHERE IT IS FOR A PERSON.
       *
       * This showed `data.message` for anything at all. Every refusal here is written for somebody
       * to act on - the plan limit, the seat limit, "you have not been named as able to open
       * check-ins" - and printing "try again" over those sends them round a loop the product knows
       * they cannot leave. But a 500 carries an internal message that is nobody's business, and
       * "try again" is the honest answer to one.
       *
       * Carried over from the set-up wizard, whose own screens made this distinction and which is a
       * picker now. This is the only place a check-in is created, so the rule lives here or nowhere.
       */
      const status = err?.response?.status
      const said = err?.response?.data?.message
      toast.error(
        status >= 400 && status < 500 && typeof said === 'string' && said
          ? said
          : 'Could not save this. Try again.',
      )
    }
  }

  /*
   * ONE PRESS IS ONE CALL. A double press fired two entrySave calls - two drafts, two emails, and the
   * second draftToken overwrote the first in localStorage, so the earlier mail's link pointed at a
   * draft this browser would no longer patch. Same guard the signed-in save (savingAsUser) has had.
   */
  async function handleSave() {
    if (saving) return
    setSaving(true)
    try { await handleSaveInner() } finally { setSaving(false) }
  }

  async function handleSaveInner() {
    /*
     * WHATEVER IS STILL IN THE OPEN "ADD THEM" FIELD COUNTS AS ADDED.
     *
     * Somebody who has typed a colleague's address into the box beside that colleague's name and
     * then pressed the big Save button has said what they want. Requiring a second, smaller press
     * first is a rule the screen never states, and the cost of getting it wrong is an invitation
     * that silently never happens. So Save queues it, and a bad address stops the save with the
     * reason next to the field rather than being thrown away.
     */
    if (addingContributorFor && addingContributorEmail.trim()) {
      if (!queueSuggestedContributor(addingContributorFor, addingContributorLabel)) return
    }
    const trimmed = email.trim()
    if (!looksLikeAnAddress(trimmed)) { setEmailError(NOT_AN_ADDRESS); return }
    // NOTE: a hard "set a date first" gate used to live here, but the date
    // field only renders AFTER the email is sent (the admin section below is
    // emailSent-gated) - so the gate deadlocked every anonymous save. The
    // start date is optional at commit (dto.checkInBy is optional) and can be
    // set in the admin section once it appears.
    setEmailError('')
    // Build the commit payload BEFORE calling entry-save: the same request
    // that registers the email also stores a SERVER-SIDE DRAFT of the session
    // (this payload + the transcript). Giving the email is the ISSUE-17
    // consent moment - nothing is persisted server-side before it. The draft
    // is what makes the post-verification commit work no matter which browser
    // opens the magic link; the localStorage copies below are only the
    // same-browser mirror (and the legacy path for old links).
    const commitPayload = buildCommitPayload()
      try {
      const res = await authApi.entrySave(trimmed, { payload: commitPayload, history }, trap.filled)
      setEmailSent(true)
      if (res.draftToken) {
        setDraftToken(res.draftToken)
        try { localStorage.setItem('gw_draft_token', res.draftToken) } catch { /* */ }
      } else {
        /* No token: nothing was stored for this request. (Since the U.2 review an address that already
           has an account gets a token too, of the same shape and stored nowhere, so the reply does not
           say which addresses have accounts; patching with it changes nothing, and the edits travel in
           localStorage with the same-browser commit, as before.) A token left over from an earlier
           session must not be used to patch a draft this address no longer has. */
        setDraftToken(null)
        try { localStorage.removeItem('gw_draft_token') } catch { /* */ }
      }
      try { localStorage.setItem('gw_commit_payload', JSON.stringify(commitPayload)) } catch { /* */ }
    } catch (err: any) {
      setEmailError(err?.response?.data?.message ?? 'Could not send link. Please try again.')
    }
  }

  // Post-email edits (org name, ground name, cadence, dates, contributors)
  // sync to the server-side draft, best-effort and debounced. Before this they
  // lived only in localStorage and were lost when the magic link was opened in
  // a different browser. localStorage stays as the same-browser mirror.
  useEffect(() => {
    if (!emailSent || !draftToken) return
    const t = setTimeout(() => {
      const patch = {
        /* SCREEN FAULT 2: same rule as `buildCommitPayload` above - the served label, not the aim. */
        groundLabel: isAnchorDraft()
          ? anchorGroundLabel
          /* FAULTS 4 AND 6: THE NEW HIRE'S DEFAULT NAMES THE PERSON, NOT THE SITUATION. */
          : (groundName.trim() || theDefaultGroundName()),
        orgName: orgName.trim() || undefined,
        cadence,
        /* The page's default is not a choice; the server records only a confirmed pick as one. */
        cadenceChosen,
        cadenceAnchorDay: (cadence === 'WEEKLY' || cadence === 'FORTNIGHTLY' || cadence === 'MONTHLY') && cadenceAnchorDay != null ? cadenceAnchorDay : undefined,
        workingDays: workingDays.length ? workingDays : undefined,
        checkInBy: checkInBy.trim() || undefined,
        lastCheckInBy: lastCheckInBy.trim() || undefined,
        inviteNote: inviteNote.trim() || undefined,
        contributors: everyoneNamedSoFar().map(e => asSomeoneToInvite(e, displayNames)),
      }
      entryApi.patchDraft(draftToken, patch).catch(() => { /* best-effort: localStorage still mirrors this */ })
      // Keep the local commit body (gw_commit_payload) in sync with these
      // post-email setup edits too. The server overlay lets a non-empty body
      // field override the (fresher) draft, so a stale body groundLabel would
      // otherwise revert the ground name to "My first ground" at commit.
      try {
        const raw = localStorage.getItem('gw_commit_payload')
        if (raw) {
          const payload = JSON.parse(raw)
          payload.groundLabel = patch.groundLabel
          if (patch.orgName !== undefined) payload.orgName = patch.orgName
          if (patch.cadence !== undefined) payload.cadence = patch.cadence
          if (patch.cadenceAnchorDay !== undefined) payload.cadenceAnchorDay = patch.cadenceAnchorDay
          if (patch.workingDays !== undefined) payload.workingDays = patch.workingDays
          if (patch.checkInBy !== undefined) payload.checkInBy = patch.checkInBy
          if (patch.lastCheckInBy !== undefined) payload.lastCheckInBy = patch.lastCheckInBy
          localStorage.setItem('gw_commit_payload', JSON.stringify(payload))
        }
      } catch { /* */ }
    }, 800)
    return () => clearTimeout(t)
  }, [emailSent, draftToken, groundName, orgName, cadence, cadenceAnchorDay, workingDays, checkInBy, lastCheckInBy, inviteNote, inviteAdded, inviteContextFor, bulkQueue, displayNames])

  async function copyInviteLink() {
    const link = `${window.location.origin}/invite?token=${inviteToken}`
    if (await copy(link)) {
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } else {
      toast.error('Copying is not available here. Select the link and copy it yourself.')
    }
  }

  function addInviteEmail() {
    const e = inviteEmail.trim()
    if (!looksLikeAnAddress(e)) return
    setInviteEmail('')
    /* The name typed beside this email (anchor draft only) travels with it into the context step,
       so it is still there to keep once the person is actually added - Skip included. */
    setPendingDisplayName(inviteDisplayName.trim())
    setInviteDisplayName('')
    setInviteContextFor(e)
    setInviteContext('')
  }

  /** Keeps `pendingDisplayName` against this email, once the person is actually added. A no-op off the anchor path (nothing was ever typed there). */
  function keepPendingDisplayName(email: string) {
    const name = pendingDisplayName.trim()
    if (name) setDisplayNames(prev => ({ ...prev, [email.trim().toLowerCase()]: name }))
    setPendingDisplayName('')
  }

  // Queues a recommended addition / mentioned person straight into the
  // contributor list, carrying their role/reason or name/context as the note -
  // the same shape addInviteEmail/submitInviteContext build by hand.
  /**
   * A HALF-TYPED ADDRESS IS NOT A DECISION TO INVITE NOBODY.
   *
   * Walked as a real lead. Zainab was named in the conversation, "+ Add them" was pressed, her
   * address was typed into the field beside her name, and then Save was pressed. The panel
   * answered "No one added yet. You can invite people whenever you're ready." and the board said
   * one participant. The address was accepted, nothing was said, and the invitation was gone.
   *
   * Two faults, both here. Queueing needed a separate press of Add that Save knew nothing about,
   * and a refusal was a silent `return` - so a typo produced exactly the same nothing as success.
   */
  function queueSuggestedContributor(key: string, note: string): boolean {
    const email = addingContributorEmail.trim()
    if (!looksLikeAnAddress(email)) {
      setAddingContributorError(email ? NOT_AN_ADDRESS : 'Add their email address, or close this to leave them out.')
      return false
    }
    setAddingContributorError('')
    const entry = note ? `${email} - ${note}` : email
    setInviteAdded(prev => (prev.some(e => e === email || e.startsWith(`${email} - `)) ? prev : [...prev, entry]))
    setQueuedFromSuggestion(prev => new Set(prev).add(key))
    /*
     * FAULT 9 (live review): SOMEBODY ADDED FROM A NAMED "PEOPLE MENTIONED" ROW GOT NO NAME FIELD,
     * AND THE RESULT READ "wanjiru@suites.test IS WAITING FOR A SEAT" - with no name, though the
     * name was right there on the row she was added from. `TheReportYouSawAtTheEnd.tsx` keys that
     * row `men-<i>-<name>` and passes `"<name> - <context>"` as this `note`; a suggested-party row
     * (`sug-<i>-<role>`) passes only a reason, with no name to carry. Only the first is a name, so
     * only `men-` keys feed it to `displayNames` - the same map `shownAs` already reads for the
     * "Add Daniel Park" colleague path and the people step's own Name field, so every path a name
     * reaches this list through ends up in the same place.
     */
    if (key.startsWith('men-')) {
      const name = note.split(' - ')[0].trim()
      if (name) setDisplayNames(prev => ({ ...prev, [email.toLowerCase()]: name }))
    }
    setAddingContributorFor(null)
    setAddingContributorEmail('')
    return true
  }

  function submitInviteContext() {
    if (!inviteContextFor) return
    if (!inviteAdded.includes(inviteContextFor) && !mayAddOneMorePerson()) return
    const entry = inviteContextFor + (inviteContext.trim() ? ` - ${inviteContext.trim()}` : '')
    const newAdded = inviteAdded.includes(inviteContextFor) ? inviteAdded : [...inviteAdded, entry]
    setInviteAdded(newAdded)
    /* Built synchronously, not read back from state: `setDisplayNames` below has not re-rendered
       yet when the localStorage sync just underneath needs the name that was just typed. */
    const name = pendingDisplayName.trim()
    const newNames = name ? { ...displayNames, [inviteContextFor.trim().toLowerCase()]: name } : displayNames
    if (name) setDisplayNames(newNames)
    setPendingDisplayName('')
    setInviteContext('')
    // Drain bulk queue: advance to next email if one is waiting
    const [next, ...rest] = bulkQueue
    if (next) {
      setBulkQueue(rest)
      setInviteContextFor(next)
    } else {
      setInviteContextFor(null)
    }
    // Keep commit payload in sync if account already created
    try {
      const raw = localStorage.getItem('gw_commit_payload')
      if (raw) {
        const payload = JSON.parse(raw)
        payload.contributors = newAdded.map(e => asSomeoneToInvite(e, newNames))
        localStorage.setItem('gw_commit_payload', JSON.stringify(payload))
      }
    } catch { /* */ }
  }

  /*
   * AT THE DOOR: nothing has been said and nothing picked. The prototype's first screen has no name,
   * no plan and no steps on it, because there is nothing yet to name, plan or step through.
   */
  /*
   * HOW MANY ARE PLANNED, FROM WHAT IS SET NOW (U.6 review). The header said "1 session planned" while
   * "How often" said every week: the number was the conversation's first guess and never followed a
   * later choice. It follows the rhythm and the chosen end now, the way the server will count them.
   */
  const plannedNow = (() => {
    if (sessionsTypedByLead) return sessions
    if (cadence === 'ONE_TIME') return 1
    if (cadence === 'SEQUENTIAL') return sessions
    if (lastCheckInBy) {
      const all = whenTheCheckInsLand({ cadence, anchorDay: cadenceAnchorDay, startsAt: checkInBy ? new Date(`${checkInBy}T00:00:00`) : null, workingDays, howMany: 400 })
      const n = all.filter((d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` <= lastCheckInBy).length
      return Math.max(1, n)
    }
    const days = plannedFrom?.timelineDays
    const gap = ({ DAILY: 1, WEEKLY: 7, FORTNIGHTLY: 14, MONTHLY: 30 } as Record<string, number>)[cadence]
    return days && gap ? Math.max(1, Math.floor(days / gap)) : sessions
  })()
  /*
   * THE SITUATION THE LEAD PICKED, not the one the classifier moved it to (U.6 review): the card she
   * pressed, found again from its sentence after a reload, or a known ?scenario= she arrived with.
   * Nothing when she described it herself; then the situation the conversation settled on is used.
   */
  function theSituationTheLeadPicked(): string | undefined {
    /* The card's own name where there is one, so "Connect goals across the team" is not named after
       the situation it shares. fallbackGroundName says it in sentence case. */
    if (pickedSituation && pickedSituation !== 'other') return pickedSituation
    const card = SITUATION_CARDS.find((c) => onboardingHistory.some((m) => m.role === 'user' && m.content === c.message))
    if (card) return card.label
    return scenario && (SCENARIO_LABELS as Record<string, string>)[scenario] ? scenario : undefined
  }
  /**
   * THE NAME A CHECK-IN GETS WHEN THE LEAD LEAVES THE FIELD BLANK (faults 4 and 6, live walk,
   * 6 October 2026). One place, used both when the ground is actually committed and to preview
   * the same name in the side panel before then, so the two can never disagree about what a blank
   * field will become.
   */
  function theDefaultGroundName(): string {
    return effectiveFallbackGroundName(
      theSituationTheLeadPicked() ?? onboardingSelections.classifiedScenario,
      onboardingSelections.peopleNamed,
      `${onboardingSelections.initial ?? ''} ${onboardingSelections.brief ?? ''}`,
      orgName.trim() || user?.organization?.name || undefined,
      /* FAULT 15 (coordinator, second round): only available once she is signed in - nothing
         typed before then names her, and a guess at her name would be worse than the situation's
         own label. */
      user?.firstName,
    )
  }
  /* Whether the start is after today, which is the one case where nobody is invited on saving, for certain. */
  const startsLater = (() => {
    if (!checkInBy) return false
    const t = new Date(); const today = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
    return checkInBy > today
  })()
  /*
   * FAULT 1: AN ANCHOR ARRIVAL IS NEVER AT THE DOOR. `isAnchorDraft()` is true from the first
   * render (`?scenario=HELP_TEAM_UNDERSTAND`), before anything has been picked or sent, so without
   * this the door and its five examples showed underneath the anchor's own opening line (the
   * `history.length === 1 && !pickedSituation` condition was true for every fresh arrival, anchor
   * or not). The plan says the landing "enters the scenario at once" - no door, no situation
   * picker, straight onto the conversation.
   */
  const atTheDoor = phase === 'onboarding' && onboardingHistory.length === 1 && !onboardingLoading && !pickedSituation && !anchorConversationOpensDirectly()
  /** Words typed at the door, or on the list, open the conversation as describing it yourself. */
  function describeItInYourOwnWords(text: string) {
    setSeeingEverySituation(false)
    setPickedSituation('other')
    setPickedScenario(null)
    sendOnboarding(text, null)
  }

  /* Seemingly unreachable, the same finding the previous commit made about CreateGroundPage's own
     render: nothing in this file calls `setShowAdminBriefing(true)`, only this block's own
     `setShowAdminBriefing(false)`. Documented rather than deleted, same as that finding - a page
     losing a screen is a bigger decision than a rendering rebuild, so this still gets the same
     shared-parts treatment as everything else, in case something upstream starts reaching it. */
  if (showAdminBriefing) {
    return (
      <div className="gwui-ec-briefing">
        <div className="gwui-ec-briefing-inner">
          <div className="gwui-ec-briefing-brand">
            <span className="gwui-ec-briefing-wordmark">Groundwork</span>
          </div>
          <h1 className="gwui-ec-briefing-title">You're up first.</h1>
          <p className="gwui-ec-briefing-sub">
            Yours is the first one in. Here is what to expect.
          </p>
          <div className="gwui-ec-briefing-list">
            <div className="gwui-ec-briefing-card">
              <span className="gwui-ec-briefing-icon">⏱</span>
              <div>
                <CardTitle weight={700}>About 10 minutes</CardTitle>
                <div className="gwui-ec-briefing-card-body">Answer in your own words. The questions are based on what you just described. There are no right answers.</div>
              </div>
            </div>
            <div className="gwui-ec-briefing-card">
              <span className="gwui-ec-briefing-icon">📨</span>
              <div>
                <CardTitle weight={700}>Invite links come after</CardTitle>
                <div className="gwui-ec-briefing-card-body">Once you finish, you will get invite links to send to the other people involved. They check in independently.</div>
              </div>
            </div>
            <div className="gwui-ec-briefing-card">
              <span className="gwui-ec-briefing-icon">📄</span>
              <div>
                <CardTitle weight={700}>The shared report</CardTitle>
                <div className="gwui-ec-briefing-card-body">When everyone is in, the report shows where the team agrees, where it differs, and what to do next.</div>
              </div>
            </div>
          </div>
          <Button kind="primary" wide onClick={() => { setShowAdminBriefing(false); startCheckin.mutate() }}>
            Start my check-in
          </Button>
        </div>
      </div>
    )
  }

  /**
   * THE ONE CARD THAT IS NOT A CONVERSATION.
   *
   * "Get updates from your team" promises a two-minute setup, and an interview cannot be two
   * minutes. Four fields - who, what you want to know, how often, send - and nothing to work out,
   * because there is no aim to agree and nobody's part to establish. See ask-your-team-one-thing.
   *
   * It sits here rather than on a route of its own so the card, the picker and the back link all
   * keep working the way every other card does: the only thing that changes is what the page renders
   * once somebody has picked.
   */
  if ((pickedScenario ?? scenario) === 'TEAM_UPDATES') {
    return <AskYourTeamOneThing onBack={() => { setPickedScenario(null); navigate('/start?new=1', { replace: true }) }} />
  }

  /**
   * FAULT 3: THE PEOPLE STEP, AS ITS OWN FUNCTION, SO IT CAN RENDER IN TWO PLACES.
   *
   * For every situation but the anchor one, this is unchanged: it still renders once, after the
   * email is sent, exactly where it always has. For an anchor draft it renders BEFORE the
   * confirmation email instead (see the two call sites below) - the plan's own order, "people
   * before the email" - and its content is identical either way: nothing about WHAT it draws
   * changes, only WHERE.
   */
  function renderPeopleStep() {
    const s = onboardingSelections.classifiedScenario || onboardingSelections.mode || scenario || pickedSituation || ''
    // Matches scenario keys AND card labels (pickedSituation stores the
    // label). New reframed labels first; the old labels stay so a
    // session saved before the reframe still restores correctly.
    const isSensitive = [
      'PIP', 'DRIFT', 'REALIGN_TEAM',
      "Someone's work is off track", 'Running a performance improvement plan', 'Co-founder or partner disagreement', 'A project is off track', 'You and a team member see it differently',
      'Running a PIP', 'Team member not delivering', 'Cofounder or partner dispute',
    ].some(k => s.includes(k))
    /*
     * THE PEOPLE STEP, FOR AN ANCHOR DRAFT (plan piece 11; `HELP_TEAM_UNDERSTAND`, request
     * 149 (2 of 6)): the engine's own served heading and intro (`thePeopleStepRules`,
     * carried from `GET /entry/anchor-start`, or `ANCHOR_PEOPLE_STEP_RULES` if nothing was
     * served) replace the ordinary ones, with the 19-person limit enforced wherever a
     * contributor is actually added (`mayAddOneMorePerson`). Every other situation's
     * wording here is unchanged.
     */
    const isAnchor = isAnchorDraft()
    /**
     * FAULT 8 (live walk, 6 October 2026): A PASSING TOAST WAS THE ONLY SIGN THE LIMIT WAS
     * REACHED, AND "ADD PERSON" COULD THEN SILENTLY DO NOTHING.
     *
     * A pasted 20th email was dropped with only a toast (gone in a few seconds), and once that
     * left a 21st, already-typed email sitting in the context step, pressing "Add person" there
     * called `submitInviteContext`, which checks the same limit and simply returns - no toast, no
     * disabled control, nothing on screen to say why. `thePeopleStepRules.mayAdd` is the served
     * limit (decision 96 item 3); this is the same check `mayAddOneMorePerson` already makes,
     * read here too so the add row itself can show a lasting Note and disable its own buttons.
     */
    const peopleLimitReached = isAnchor && inviteAdded.length >= thePeopleStepRules.mayAdd
    const inviteHeading = isAnchor ? thePeopleStepRules.heading : isSensitive ? 'Let them share their side' : 'Invite people'
    const inviteSubtext = isAnchor
      ? thePeopleStepRules.intro
      : isSensitive
      ? 'Send them a link so they can give their own version of the same work. When both sides are in, the report shows where you agree and where the conversation still needs to happen. It does not score anyone.'
      : 'Each person gives their own version of the shared work, including their own part in it. When everyone has answered, the report shows where people agree, where they differ, and what the gap means for the work.'
    return (
    <div className="gwui-ec-savecard-invite-block">
      <FieldLabel>{inviteHeading}</FieldLabel>
      <div className="gwui-ec-savecard-invite-subtext">
        {inviteSubtext}
      </div>
      <div className="gwui-ec-savecard-invite-banner">
        Add them here now. Anyone you added from the report above is already on this list. Nobody is invited before you save this check-in and confirm your email.
        {!isAnchor && (
          <>
            {' '}
            {/*
              * HOW MANY PEOPLE CAN BE ON THIS, SAID WHERE PEOPLE ARE ADDED.
              *
              * A check-in has no size of its own - the limit is the plan's seats. The set-up
              * wizard's people screen said so, and that screen is gone: /grounds/new is a picker
              * that hands over here, so this is where people are added and this is where the
              * sentence has to be. Without it the next person to guess writes "up to 20 per
              * check-in" again, which is the defect this rule exists for and which was invented
              * once already.
              *
              * FOR AN ANCHOR DRAFT, THIS DOES NOT APPLY (fault 3): the limit there is the
              * draft's own fixed 20 people (`thePeopleStepRules`, already said in the heading
              * and intro above), not the organisation's plan - saying "depends on your plan"
              * would be wrong for this draft.
              */}
            How many people you can add depends on your plan, not on the check-in.
          </>
        )}
      </div>
      {/* THERE IS A LATER, AND IT SHOULD SAY SO.
          Adding people has always been optional - the commit defaults
          contributors to an empty list and the ground page has its own
          "+ Add someone" - but nothing here said that, and "Add them
          here now" reads as an instruction.
          It matters most for exactly the people most likely to want a
          night to think: someone opening a PIP or a co-founder dispute
          is being asked to name the other party at the moment they are
          least sure, and silence about a later made that feel final. */}
      <div className="gwui-ec-savecard-invite-later">
        Not ready? You can add people any time from the check-in itself. Nothing goes out until you do.
      </div>
      {(() => {
        const s = onboardingSelections.classifiedScenario || onboardingSelections.mode || scenario
        const notices: Record<string, string> = {
          PIP: 'Performance improvement check-ins document a process. They do not replace formal HR procedures, employment policy, or legal obligation. Ensure your organisation\'s HR process is followed in parallel.',
          DRIFT: 'This check-in was opened on a situation that has already moved off course. Inviting people now means what they write will reflect the current state, not the original agreement. Make sure that is what you want on record.',
          REALIGN_TEAM: 'Realignment check-ins surface disagreement directly. The other participants will answer independently, and may differ significantly from yours. The report will show those gaps without filtering them.',
        }
        const notice = notices[s ?? '']
        return notice ? (
          <div className="gwui-ec-savecard-invite-notice">
            {notice}
          </div>
        ) : null
      })()}

      {inviteAdded.length > 0 && (
        <div className="gwui-ec-savecard-invite-list">
          {inviteAdded.map(e => (
            <div key={e} className="gwui-ec-savecard-invite-chip">✓ {shownEntry(e)}</div>
          ))}
        </div>
      )}

      {/* Colleagues, picked the way a group chat picks them: search, tick, one button. Each goes on the list without a note; notes can be added on Setup. */}
      {!inviteContextFor && !bulkInviteMode && (
        <PeoplePicker
          people={colleagues.filter((c) => c.id !== user?.id)}
          alreadyIn={inviteAdded.map((e) => e.split(' - ')[0]).filter((h) => h.startsWith(A_COLLEAGUE)).map((h) => h.slice(A_COLLEAGUE.length))}
          onAdd={(picked) => {
            /* A multi-select can ask for several at once, so the limit is checked against
               how many are really left, not once per item against a count that has not
               yet updated (queueColleague's own check is still right for every other
               path, which adds one at a time). */
            const room = isAnchorDraft() ? Math.max(0, thePeopleStepRules.mayAdd - inviteAdded.length) : picked.length
            const fit = picked.slice(0, room)
            for (const c of fit) queueColleague(c)
            if (fit.length < picked.length) toast.error(thePeopleStepRules.limitSentence)
            if (fit.length) toast.success(fit.length === 1 ? `${fit[0].name} is on the list.` : `${fit.length} people are on the list. Invites go out when you save.`)
          }}
        />
      )}

      {inviteContextFor ? (
        <div className="gwui-ec-savecard-invite-context">
          <div className="gwui-ec-savecard-invite-context-head">
            {/* SCREEN FAULT 6(a): THE NAME GIVEN, NOT THE EMAIL, WHEN ONE WAS GIVEN.
                `pendingDisplayName` is this one person's name, typed beside their email a step
                earlier and not yet kept to `displayNames` (that happens on Add/Skip, below). */}
            <div className="gwui-ec-savecard-invite-context-name">{pendingDisplayName.trim() || inviteContextFor}</div>
            {bulkQueue.length > 0 && (
              <div className="gwui-ec-savecard-invite-context-more">{bulkQueue.length} more after this</div>
            )}
          </div>
          <div className="gwui-ec-savecard-invite-context-ask">{isAnchorDraft() ? thePeopleStepRules.contextLabel : 'What do you want them to focus on or cover?'}</div>
          <TextArea autoFocus placeholder="e.g. They are the other side of this. They own the delivery timeline."
            value={inviteContext} onChange={e => setInviteContext(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitInviteContext() } }}
            className="gwui-ec-savecard-field"
          />
          <div className="gwui-ec-savecard-row-gap8 gwui-ec-savecard-row-gap8-grow-last">
            <Button kind="secondary" size="small" onClick={() => {
              // Add without context, then advance queue
              if (inviteAdded.includes(inviteContextFor) || mayAddOneMorePerson()) {
                const newAdded = inviteAdded.includes(inviteContextFor) ? inviteAdded : [...inviteAdded, inviteContextFor]
                setInviteAdded(newAdded)
                keepPendingDisplayName(inviteContextFor)
              } else {
                setPendingDisplayName('')
              }
              setInviteContext('')
              const [next, ...rest] = bulkQueue
              if (next) { setBulkQueue(rest); setInviteContextFor(next) } else { setInviteContextFor(null) }
            }}>Skip</Button>
            <Button
              kind="secondary" size="small" onClick={submitInviteContext}
              disabled={peopleLimitReached && !inviteAdded.includes(inviteContextFor)}
            >
              Add person
            </Button>
          </div>
          {/* FAULT 8: a lasting Note, not a toast that is gone in a few seconds, and "Add person"
              above is disabled rather than silently doing nothing once the limit is reached. */}
          {peopleLimitReached && !inviteAdded.includes(inviteContextFor) && (
            <Note tone="muted">{thePeopleStepRules.limitSentence}</Note>
          )}
        </div>
      ) : bulkInviteMode ? (
        <div>
          <TextArea
            autoFocus
            placeholder="Paste emails separated by commas or line breaks&#10;e.g. alice@co.com, bob@co.com"
            value={bulkInviteText}
            onChange={e => setBulkInviteText(e.target.value)}
            className="gwui-ec-savecard-field"
          />
          <div className="gwui-ec-savecard-row-gap8 gwui-ec-savecard-row-gap8-grow-last">
            <Button kind="secondary" size="small" onClick={() => { setBulkInviteMode(false); setBulkInviteText('') }}>Cancel</Button>
            <Button
              kind="secondary" size="small"
              onClick={() => {
                const allEmails = bulkInviteText
                  .split(/[\n,]+/)
                  .map(e => e.trim().toLowerCase())
                  /* Not validation: this filters model-extracted mentions down to the ones that are addresses at all. Kept as is. */
                  .filter(e => e.includes('@') && !inviteAdded.some(a => a.startsWith(e)))
                const room = isAnchorDraft() ? Math.max(0, thePeopleStepRules.mayAdd - inviteAdded.length) : allEmails.length
                const emails = allEmails.slice(0, room)
                if (allEmails.length > emails.length) toast.error(thePeopleStepRules.limitSentence)
                if (emails.length === 0) return
                setBulkInviteText('')
                setBulkInviteMode(false)
                // Queue all emails through the per-contributor context prompt
                const [first, ...rest] = emails
                setBulkQueue(rest)
                setInviteContextFor(first)
                setInviteContext('')
              }}
            >
              Add all
            </Button>
          </div>
          {/* FAULT 8: the toast above still says so the moment a paste goes over - this is the
              lasting version, here whenever the limit was already reached before pasting at all. */}
          {peopleLimitReached && <Note tone="muted">{thePeopleStepRules.limitSentence}</Note>}
        </div>
      ) : (
        <>
          {/*
            "Name + email" (section 13): the name is asked first, beside the email, before the
            optional "What do they do" context that follows once Add is pressed.
            FAULT 5(a) (live walk, 6 October 2026): THIS USED TO BE ANCHOR-DRAFT ONLY, SO AN
            ORDINARY SETUP HAD NO WAY TO GIVE A NAME WHEN ADDING SOMEBODY BY EMAIL - even when the
            conversation already had one. Walked live, setting up a new hire: Imani Wekesa was
            named in the chat, then added by her address alone, and the roster read
            "imani@walk2.test has not checked in…" with no name anywhere, although Groundwork knew
            it. `displayNames`/`asSomeoneToInvite` already carry a typed name through to the
            commit's `displayName` for every situation, not only an anchor draft - only the field to
            type one into was gated. Opened to every situation now; nothing here is anchor-specific.
          */}
          <TextField type="text" aria-label="Name" placeholder="Name (optional)" value={inviteDisplayName}
            onChange={e => setInviteDisplayName(e.target.value)}
            className="gwui-ec-savecard-field"
          />
          <div className="gwui-ec-savecard-invite-add-row">
            <TextField type="email" placeholder="name@company.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addInviteEmail()}
            />
            <Button kind="secondary" size="small" onClick={addInviteEmail}>Add</Button>
          </div>
          {/*
           * FAULT 8 (live walk, 6 October 2026): A LASTING NOTE UNDER THE ADD ROW, NOT A PASSING
           * TOAST, ONCE THE LIMIT IS REACHED.
           *
           * The row itself still opens the context step either way (asking what somebody does is
           * not itself adding them, the same design the limit test above already pins) - it is
           * "Add person" there that actually adds somebody, and that is where it is now disabled.
           * This Note means the lead already knows why, instead of finding out only once they
           * reach that further step.
           */}
          {peopleLimitReached && <Note tone="muted">{thePeopleStepRules.limitSentence}</Note>}
          <button type="button" className="gwui-plain-link" onClick={() => setBulkInviteMode(true)}>
            Paste multiple emails
          </button>
          <div className="gwui-ec-savecard-link-row">
            <div className="gwui-ec-savecard-link-box">
              {window.location.origin}/invite?token={inviteToken}
            </div>
            <Button kind="secondary" size="small" onClick={copyInviteLink}>
              {copiedLink ? 'Copied!' : 'Copy link'}
            </Button>
          </div>
          <TextField type="text" placeholder="Add a note to send with your link (optional)" value={inviteNote} onChange={e => setInviteNote(e.target.value)}
            className="gwui-ec-savecard-field"
          />
        </>
      )}
    </div>
    )
  }

  return (
    /* The viewport less the nav strip pinned over it, and dvh so a phone's address bar sliding away
       does not leave the composer under the fold. See --gw-bottom-nav in AppShell. */
    <div className="gwui-ec-frame">

      {/*
        GROUP 3 REVIEW, BATCH B: A SIGNED-OUT READER HAS NO SIDEBAR HERE NOW (AppShell.tsx's
        `showSidebar`, start.jpg draws none) - so this is the only mark and the only way to sign
        in this reader has on /start. Not shown once there is a session header below (a stranger
        partway into onboarding still has no account, but by then they are mid-conversation, not
        at the door, and the session header already carries its own way out).

        `anchorConversationOpensDirectly() && phase === 'onboarding'` (fault 1) is kept alongside
        `atTheDoor` on purpose: an anchor arrival is never "at the door", but it is still a
        stranger's very first
        screen, with nothing below it yet either - so it needs the same mark and the same way to
        sign in, from her first render, not only once `atTheDoor` happened to be true. The `phase`
        check keeps it from reappearing beside the session header once the check-in itself starts.
      */}
      {/*
        FAULT 5 (live walk, 6 October 2026): the mark and "Sign in" here sit directly inside
        `.gwui-ec-frame`, which pads nothing, so at 375 they ran flush to the screen edges while the
        body text below (inside `.gwui-ec-messages`, padded 20px either side) did not. The gutter
        comes from gw-ui.css's `.gwui-ec-frame > .gwui-mark-row` rule - the same shared mark row,
        given the body's own gutter only where no `Page` frame already gives it one.
      */}
      {!user && (atTheDoor || (anchorConversationOpensDirectly() && phase === 'onboarding')) && (
        <div className="gwui-mark-row">
          <Mark />
          <Link to="/auth" className="gwui-plain-link">Sign in</Link>
        </div>
      )}

      {/* Session header */}
      {/* U.6 review: not on the setup conversation, which start-chat.txt draws without a name, a plan or steps. */}
      {!atTheDoor && phase !== 'onboarding' && (
      <div className="gwui-ec-session-header">
        {user && (
          <button type="button" onClick={() => navigate('/grounds')} className="gwui-plain-link gwui-ec-session-back">← Check-ins</button>
        )}
        <div className="gwui-ec-session-name-row">
          {renamingGround ? (
            <TextField
              ref={groundRenameRef}
              value={renameInput}
              onChange={e => setRenameInput(e.target.value)}
              onBlur={() => { setGroundName(renameInput.trim() || groundName); setRenamingGround(false) }}
              onKeyDown={e => { if (e.key === 'Enter') { setGroundName(renameInput.trim() || groundName); setRenamingGround(false) } if (e.key === 'Escape') setRenamingGround(false) }}
              autoFocus
            />
          ) : (
            <div className="gwui-ec-picked-row">
              {/*
                * FAULT 8 (live review): "WANJIRU, FIRST 90 DAYS" - THE SAME DEFAULT NAME
                * `theDefaultGroundName()` ALREADY WORKS OUT TO SAVE - SHOWED NOWHERE AT 390px,
                * BECAUSE THE ONLY PLACE IT WAS PREVIEWED (`FillsInAsYouTalk`'s side panel,
                * `.gw-fills-in`) IS `display: none` BELOW 1000px. Once set-up finishes, this is
                * the one place left that can show it: the default name itself, not a placeholder
                * that calls it unnamed, still editable with the same control as a name the lead
                * typed herself.
                */}
              {groundName || theDefaultGroundName() ? (
                <>
                  <span className="gwui-ec-session-name">{groundName || theDefaultGroundName()}</span>
                  <button type="button" onClick={() => { setRenameInput(groundName); setRenamingGround(true) }} className="gwui-plain-link" title="Rename">✎</button>
                </>
              ) : (
                <button type="button" onClick={() => { setRenameInput(''); setRenamingGround(true) }} className="gwui-plain-link">
                  {/* "Name this ground" used the product's own word for a thing
                      the reader has not met yet - on the first screen a stranger
                      sees, before anything explains what a ground is. Judged
                      against the weakest reader, as briefed. GW-007. */}
                  Give this a name ✎
                </button>
              )}
            </div>
          )}
          <div className="gwui-ec-session-status">
            {phase === 'checkin' ? (
              <>
                <span className="gwui-ec-live-dot" />
                Session 1 in progress
              </>
            ) : 'Getting started, and this session is about 10 minutes.'}
          </div>
        </div>

        {/* Sessions counter */}
        <div className="gwui-ec-sessions-count">
          {editingSessions ? (
            <>
              {/*
                FAULT 2 (live walk, 6 October 2026): A BARE "sessions:" WAS THE ONLY LABEL. Once
                opened, the only way to change how many sessions a check-in runs read as a label
                for a filing field, not a sentence a person could read - and nothing said what the
                number was for. A plain label and a sentence of help, the same shape every other
                field on this page already uses.
              */}
              <span className="gwui-invite-link-row">
                <label htmlFor="gwui-ec-sessions-input" className="gwui-fine">How many sessions</label>
                <TextField
                  id="gwui-ec-sessions-input"
                  className="gwui-ec-sessions-input"
                  type="number" min={1}
                  value={sessionsInput}
                  onChange={e => setSessionsInput(e.target.value)}
                  onBlur={() => {
                    const n = Math.max(1, parseInt(sessionsInput) || 1)
                    setSessions(n)
                    setSessionsInput(String(n))
                    setEditingSessions(false)
                    if (n > 1) setShowSessionsUpgrade(true)
                    /*
                     * FAULT 3, then FAULT B (reviewer, third round): typing 5 and pressing Enter
                     * still left "8 sessions planned", then "12 sessions planned" once an end date
                     * was also set - `plannedNow` recomputed the count from `plannedFrom` or from
                     * `lastCheckInBy`'s own schedule and never looked at the number just typed.
                     * Once the lead has typed a number here, that is the plan, everywhere: the
                     * label, and what gets saved.
                     */
                    setPlannedFrom(null)
                    setSessionsTypedByLead(true)
                    /*
                     * FAULT B, PART 2: THE LABEL AGREEING IS NOT ENOUGH - THE SAVED CHECK-IN STILL
                     * SAID "Session 1 of 12". `buildCommitPayload` never sends a session count at
                     * all for a date-driven cadence (not ONE_TIME or SEQUENTIAL, which already use
                     * `sessions` as the literal count): the server works the real schedule out from
                     * `checkInBy`..`lastCheckInBy`, so the end date has to move to the one that
                     * actually produces N sessions, or the date range still disagrees with what she
                     * just typed.
                     */
                    if (cadence !== 'ONE_TIME' && cadence !== 'SEQUENTIAL') {
                      const landings = whenTheCheckInsLand({
                        cadence, anchorDay: cadenceAnchorDay,
                        startsAt: checkInBy ? new Date(`${checkInBy}T00:00:00`) : null,
                        workingDays, howMany: n,
                      })
                      const last = landings[n - 1]
                      if (last) {
                        setLastCheckInBy(`${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`)
                        setEndChosen(true)
                      }
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                    if (e.key === 'Escape') setEditingSessions(false)
                  }}
                  autoFocus
                />
              </span>
              <Note>This is your plan for how many check-ins to run. You can change it at any time.</Note>
            </>
          ) : (
            <Button
              kind="secondary"
              size="small"
              onClick={() => { setSessionsInput(String(sessions)); setEditingSessions(true) }}
              aria-label={plannedFrom ? `${sessions} ${sessions === 1 ? 'session' : 'sessions'}, planned from ${plannedFrom.timelineDays} days, ${plannedFrom.cadence.toLowerCase()}. Click to change.` : 'Edit number of sessions'}
            >
              {/*
                This read "1/{sessions}" - so during setup, before anyone has
                checked in, it said "1/1 sessions". A user who had just told the
                engine "90 day period, weekly check-ins" saw a header claiming
                one. Two separate problems in one label: the "1/" prefix implies
                a session in progress when none has happened, and the total is
                whatever this control was last set to rather than anything the
                conversation said. GW-005.

                The prefix is gone and the number is labelled as the plan, which
                is what it actually is - an editable estimate, derived from the
                timeline and cadence the engine extracted (see onboard, above)
                and traceable to them in the button's title.
              */}
              {plannedNow} {plannedNow === 1 ? 'session planned' : 'sessions planned'}
            </Button>
          )}
        </div>
      </div>
      )}

      {/* Phase stepper: makes which phase you are in legible at a glance.
          1 Describe the situation -> 2 Your check-in (or Hand-off) -> 3 Save and invite. */}
      {!atTheDoor && phase !== 'onboarding' && (() => {
        /* Both answers at the fork lead into the same first check-in, so the step bar is the same for both. */
        const step = closed || showSave ? 3 : 2
        /* "Hand-off to your lead" named a step that no longer exists - handing the context to
           somebody else was removed on 7 September. Somebody who picks "I set this check-in up only"
           was being promised a hand-off screen they would never reach.
           SCREEN FAULT 10 (FINAL WALK): "Save & invite" became "Save and invite" - "&" is a symbol
           standing in for a word, and the wording rule is plain full sentences. */
        const labels = ['What is going on', 'Your check-in', 'Save and invite']
        const hints = [
          "You are telling us what is going on. Nothing is saved yet.",
          "You're saying how you see it.",
          'Save this and invite the people involved.',
        ]
        return (
          <div className="gwui-ec-phase-bar">
            <PhaseSteps labels={labels} hints={hints} current={step} />
          </div>
        )
      })()}

      {/* Start over / clear check-in - hidden once session is closed */}
      {/*
        * THE WAY OUT DOES NOT DISAPPEAR WHEN THE SESSION CLOSES.
        *
        * This whole bar was hidden on `!closed`, so once the check-in ended there was no "start
        * over" and no "clear" anywhere on the page - reported as exactly that: "should be able to
        * start over even when on the chat, clear or end session". A closed session with no exit is
        * a dead end on the one screen a stranger meets first, and their only way out is the browser
        * back button or a reload that restores the same finished session.
        *
        * Hiding it was defensible while closing meant "your answers lock" and nothing else. It is
        * not defensible now that closing is followed by a save-and-invite step somebody may not
        * want to take. The confirmation still stands in front of it, so nothing is thrown away by
        * a stray click.
        */}
      {!atTheDoor && (
        <div className={`gwui-ec-bar${phase === 'onboarding' ? ' gwui-ec-bar-onboarding' : ''}`}>
          {/* U.6 review: the setup conversation's title, from start-chat.txt and new.txt. */}
          {phase === 'onboarding' && (
            <h1 className="gwui-ec-onboarding-title">Set up a check-in</h1>
          )}
          {confirmClear ? (
            <span className="gwui-ec-confirm-clear">
              {closed
                ? 'This will throw away this session and everything in it. Are you sure?'
                : phase === 'checkin' ? 'This will clear your check-in. Are you sure?' : 'This will start over. Are you sure?'}
              <button type="button" onClick={handleClearSession} className="gwui-plain-link">Yes, clear</button>
              <button type="button" onClick={() => setConfirmClear(false)} className="gwui-plain-link">Cancel</button>
            </span>
          ) : (
            <span className="gwui-ec-which-row">
              {/*
                * PICK A DIFFERENT SITUATION, which is the thing somebody actually wants.
                *
                * "Start over" throws away the organisation name, the check-in name, anybody queued
                * to be invited and the conversation. Somebody who clicked the wrong card had to
                * choose between the wrong situation and typing everything again - and nothing has
                * been set up yet, so retrying should be the cheap option. Offered only while still
                * choosing: once a check-in is running, the situation is what it is about.
                */}
              {/*
                * THE CONDITION IS "THE CONVERSATION HAS BEGUN", NOT "A CARD WAS CLICKED".
                *
                * `pickedSituation` is component state and does not survive a reload, while the
                * transcript does - so somebody who reloaded was in the worst state of all: the
                * cards hidden because the history is longer than one turn, and no way back
                * because the flag they had set was gone. Asking about the transcript covers the
                * click and the reload with one question.
                */}
              {/*
                * SAY WHICH SITUATION IT PICKED, BECAUSE IT PICKS ONE AND NEVER SAID SO.
                *
                * Read live. She described tea shops in Kano and the engine classified it, changed
                * the plan to six sessions and put "Pick a different situation" on the screen - and
                * nowhere did it say which situation it had chosen. The header still read "Describe
                * it in your own words, or choose a situation". So the product made a decision that
                * shapes every question she will be asked, and kept it to itself.
                *
                * Beside the way out, because the two belong together: this is what it chose, and
                * here is how to change it.
                */}
              {/*
                * FAULT 1: NO "THIS SOUNDS LIKE ..." FOR AN ANCHOR DRAFT.
                *
                * The situation is not a guess here - it is how the person arrived
                * (`HELP_TEAM_UNDERSTAND`), so there is nothing to confirm or reclassify, and
                * "It's something else" would offer to pick a different situation that does not
                * exist for this door.
                */}
              {phase === 'onboarding' && onboardingHistory.length > 1 && !isAnchorDraft() && (() => {
                const chosen = onboardingSelections.classifiedScenario || pickedScenario || scenario
                const label = chosen ? sentenceCase(scenarioLabel(chosen, onboardingSelections.brief)) : null
                return (
                  <span className="gwui-ec-picked-row">
                    {/* U.6 review: start-chat.txt's words, "This sounds like" and "It’s something else". */}
                    {label && (
                      <span className="gwui-panel-text-muted">
                        This sounds like <b>{label}</b>.
                      </span>
                    )}
                    <button type="button" onClick={pickADifferentSituation} className="gwui-plain-link">
                      It’s something else
                    </button>
                  </span>
                )
              })()}
              {/* CONFIRMED ONCE THE CONVERSATION EXISTS. Clearing throws away the transcript, the
                  organisation name and anybody queued to be invited - cheap to confirm, expensive
                  to undo. On the picker with nothing said yet there is nothing to lose, so it goes
                  straight through. Once a session has CLOSED it always confirms: that is the state
                  where somebody has the most written down and the least expectation of losing it. */}
              <button
                type="button"
                onClick={() => (phase === 'checkin' || closed || onboardingHistory.length > 1) ? setConfirmClear(true) : handleClearSession()}
                className="gwui-plain-link"
              >
                {closed ? 'Start over' : phase === 'checkin' ? 'Clear check-in' : 'Start over'}
              </button>
            </span>
          )}
        </div>
      )}

      {/* Sessions upgrade prompt */}
      {showSessionsUpgrade && (
        <Callout tone="info" role="status">
          {/* There is no per-session billing. The old copy told a brand-new
              person "additional sessions are $5 each" at the moment they were
              deciding whether to start - and it was not even true: their
              first ground is free with unlimited sessions. */}
          {/*
            FAULT 1 (live walk, 6 October 2026): "MEANS SIGNING IN" WAS SAID TO SOMEBODY ALREADY
            SIGNED IN. An admin who was already signed in read "6 sessions means signing in, and
            it is free", then, on the save card below it, "Saving to her@company.com. No
            confirmation needed, you are already signed in." - two sentences on the same screen
            disagreeing about whether signing in was still ahead of her. Said only to a stranger,
            for whom it is true; a signed-in reader is told only what is still true for them.
          */}
          {/*
            FAULT 4 (live review): A SIGNED-IN LEAD STILL READ "SAVE YOUR SESSION BELOW TO GET SET
            UP", WITH "SAVE AND SET UP" FOR A BUTTON - and then, on the save card right below it,
            "you are already signed in". Nothing was left to set up or sign into; the save card's
            own words for a signed-in reader ("Save this", `saveAsSignedInUser`, line 4623) are
            used here too, so the two lines on screen at once agree with each other.
          */}
          {/*
            FAULT (b) (coordinator, second round): "SAVE THIS BELOW" FOLLOWED BY A "SAVE THIS"
            BUTTON READ ODDLY - one short sentence, then a button repeating almost the same two
            words, saying nothing about what pressing it actually does. One plain sentence instead,
            naming the two things saving does here (opens the check-in, invites the people named so
            far) - no prototype screen covers a signed-in lead at this exact moment (the closest,
            setup.txt, has her press "Start it and invite N people" directly, with no separate save
            step at all), so this follows the coordinator's own wording rather than guessing.
          */}
          {user ? (
            <>
              Save this to set up the check-in and invite the people you named.{' '}
              <button type="button" className="gwui-plain-link" onClick={() => { setShowSessionsUpgrade(false); setShowSave(true) }}>
                Save and set up
              </button>
            </>
          ) : (
            <>
              <b>{sessions} sessions</b> means signing in, and it is free. Save your session below to get set up.{' '}
              <button type="button" className="gwui-plain-link" onClick={() => { setShowSessionsUpgrade(false); setShowSave(true) }}>
                Save and set up
              </button>
            </>
          )}
          {' '}
          <button type="button" className="gwui-plain-link" onClick={() => setShowSessionsUpgrade(false)}>Not now</button>
        </Callout>
      )}

      {/* Main content area */}
      <div className="gwui-ec-main">

        {/* PHASE: ONBOARDING (AI-driven) */}
        {phase === 'onboarding' && (
          <div className="gwui-ec-onboarding">
          <div className="gwui-ec-onboarding-col">
            {/*
              * SAID BEFORE THE SETUP WORK, NOT AFTER IT.
              *
              * The wizard checked this on its first screen and said why: refusing at submit means
              * somebody picked, named, planned and rostered before being told no, and "the block
              * was right; the timing made it feel like a trick". The wizard is a picker now and
              * hands over here, so the check has to be here or it is nowhere.
              *
              * They are not stopped from looking or from talking - the conversation still runs and
              * everything stays on this device. What they are not allowed to do is find out at the
              * save, after giving their whole account.
              */}
            {refusedByThePlan && (
              <div className="gwui-ec-refusal-band">
                <Callout tone="warning" title={whetherTheyMayOpenOne.data?.noPlan ? 'No plan yet' : 'You have used all of your free check-ins'}>
                  {refusedByThePlan} You can still set this one up and it stays on this device, but it cannot be saved to your account until then.{' '}
                  <button type="button" className="gwui-plain-link" onClick={() => navigate('/billing')}>See plans</button>
                </Callout>
              </div>
            )}

            {/*
              THE BLUE BLOCK IS GONE, AND IT WAS THE LAST OF THE THREE ASKS.
              "Tell us what is going on" sat in a tinted full-width band above a step row that
              already says "What is going on", above a card that asks what you are trying to achieve
              - three headings for one question, the top one in the loudest treatment on the page.
              What it added beyond the asking was the promise underneath: something for you now, a
              shared picture once everybody has checked in. That is worth saying and it is said on
              the step row and in the card, which is where somebody is looking when they act.
            */}
            <div
              ref={msgsRef}
              aria-live="polite"
              // The picker needs the width for a multi-column grid so all 8
              // cards sit above the fold at laptop heights; conversation
              // bubbles keep the narrow reading column. An anchor arrival has no picker to be wide
              // for (fault 1): it goes straight to the narrow, conversational column.
              className={`gwui-ec-messages ${onboardingHistory.length === 1 && !pickedSituation && !anchorConversationOpensDirectly() && phase === 'onboarding' ? 'gwui-ec-messages-wide' : 'gwui-ec-messages-narrow'}`}
            >
              {onboardingHistory.map((m, i) => {
                /*
                 * THE OPENER IS NOT DRAWN WHILE THE PICKER IS, because the picker says it better.
                 *
                 * It read "Describe it in your own words, or choose a situation to set the context
                 * for what you want people to check in on or provide updates about" - directly
                 * above a card that asks what you are trying to achieve and a line that offers to
                 * pick one that already fits. The same two routes, said twice, the first time in a
                 * bubble that looks like somebody talking.
                 *
                 * It stays in the HISTORY rather than going: the picker is shown when the history
                 * holds exactly one turn, and it is also the model's first turn once the
                 * conversation starts. Only the bubble goes, and only while the picker is up.
                 */
                if (i === 0 && m.role === 'assistant' && phase === 'onboarding' && m.content === THE_OPENING_QUESTION) return null /* U.6 review: start-chat.txt opens on the lead's own words; the opener still goes to the model. */
                /* A CARD IS A PICK, NOT SOMETHING THEY SAID. The card's message travels as the first
                   user turn so the model has a situation; drawing it as a navy bubble put words in
                   their mouth ("I have a new hire starting and want to..."). It is drawn as a pick. */
                const picked = m.role === 'user' && SITUATION_CARDS.find((c) => c.message === m.content)
                if (picked) {
                  return (
                    <div key={i} className="gwui-ec-picked-chip">
                      You picked <b>{picked.label}</b>
                    </div>
                  )
                }
                return (
                  <Bubble key={i} mine={m.role === 'user'}>
                    {/* THE LAST PLACE BEFORE A READER'S EYES. `[[SESSION_COMPLETE]]` was photographed
                        in a bubble in production, with its markdown asterisks intact. Stripped on the
                        server too - this is a net, not the fix. */}
                    {nothingInternalReachesTheBubble(m.content)}
                  </Bubble>
                )
              })}

              {/*
                * THE WAY IN (U.6, B1). The prototype's first screen: one box, five examples and a
                * link to every situation (TheDoor), or the list itself (EverySituation). Sending
                * words from either is describing it in your own words, which clears any situation
                * a card had set; starting from a card sends that card's own sentence, as the old
                * grid did.
                */}
              {atTheDoor && (
                <div className="gwui-ec-door-slot">
                  {seeingEverySituation ? (
                    <EverySituation
                      signedIn={!!user}
                      openerFor={(card) => whatThisCardSays(card.label)}
                      onSend={describeItInYourOwnWords}
                      onDescribe={() => setSeeingEverySituation(false) /* back to the one box: describing it is the first screen (U.6 review) */}
                      onStart={(card, opener) => {
                        setPickedSituation(card.label)
                        setPickedScenario(card.scenario)
                        sendOnboarding(opener, card.scenario)
                      }}
                    />
                  ) : (
                    <TheDoor signedIn={!!user} onSend={describeItInYourOwnWords} onSeeEverySituation={() => setSeeingEverySituation(true)} />
                  )}
                </div>
              )}

              {onboardingLoading && (
                <Bubble mine={false}>
                  {onboardingDraft ? onboardingDraft : (
                    <span className="gwui-ci-dots">
                      <span className="gwui-ec-thinking">Thinking</span>
                      {[0, 1, 2].map(i => (
                        <span key={i} className="gwui-ci-dot" style={{ animationDelay: `${i * 0.2}s` }} />
                      ))}
                    </span>
                  )}
                </Bubble>
              )}

              {/* The fork, shown when the AI signals ready. Replaces the old
                  "are you involved?" question (which drove nothing but
                  check-in-vs-skip; ownership was never derived from it).
                  NOT FOR THE ANCHOR (request 165): her set-up conversation is the whole
                  conversation, so by the time this page would draw the fork, `onboardingReady`
                  handling above has already moved her straight to the reveal. */}
              {onboardingReady && !onboardingLoading && flowPath !== 'lead' && !isAnchorDraft() && (
                <div className="gwui-ec-fork">
                  <Bubble mine={false}>
                    {/*
                      * IT IS ONE QUESTION, AND IT IS ABOUT WHO ANSWERS THE QUESTIONS. W15-3.
                      *
                      * "How do you want to run this?" with "This is my situation" against "I'm
                      * setting this up for my team" made people choose between two descriptions of
                      * themselves, when the only thing that actually differs is who sits down and
                      * gives the first account. Somebody in HR setting up a record about a new hire
                      * is BOTH: it is their situation and their team. Both options fit, so the
                      * choice stalls.
                      *
                      * Asked as who does the check-ins, the answer is obvious to everybody in about
                      * a second, and it is the thing the product actually branches on.
                      *
                      * "One more thing" is gone too. It followed a closer that had just said the
                      * setup was finished, so it read as the product changing its mind - which is
                      * the abruptness, not the question itself.
                    */}
                    {/*
                      * WHAT IS ACTUALLY ON THE RECORD, BEFORE IT BECOMES THE RECORD.
                      *
                      * Derived from the fields, not from the model's closing sentence - which named
                      * this exact failure in the prompt and then committed it anyway, saying "that
                      * gives me what I need" while holding no roster and no goals.
                      *
                      * Shown here because this is the last moment before the check-in opens, and
                      * because somebody who can see what was taken down can correct it. The same
                      * reason expectations are in plain view rather than in a report.
                      */}
                    {(() => {
                      const sum = summariseSetup(onboardingSelections, yourRole, sessions, needsPeople)
                      return (
                        <div className="gwui-ec-sofar">
                          {/*
                            A CHECK, NOT A DOCUMENT.

                            "WHAT I HAVE" in capitals, then five rows of full-sentence labels, the
                            first of which held the whole paragraph the extraction wrote about the
                            situation - four lines of the model's prose, directly above the two
                            buttons a person is trying to choose between. Read at a live demo: too
                            much to get through to make a two-word decision.

                            Its job is to let somebody catch a mistake before it becomes the record.
                            That needs the fields legible at a glance, not readable in full: the
                            paragraph is the model's own writing and is in the chat three inches
                            above. So one-word labels, and every value clipped to two lines.
                          */}
                          {/*
                            FAULT 3 (live walk, 6 October 2026): "WHAT I'VE GOT SO FAR" SPOKE AS
                            "I", WHILE THE PANEL BESIDE IT AND THE CLOSER ABOVE IT SPEAK OF
                            GROUNDWORK, NOT THEMSELVES. One voice throughout the product: the
                            reader is "you", the product is "Groundwork".
                          */}
                          <div className="gwui-ec-sofar-heading">
                            What Groundwork has so far
                          </div>
                          {sum.have.map((h) => (
                            <div key={h.label} className="gwui-ec-sofar-row">
                              <span className="gwui-ec-sofar-label">{shortLabel(h.label)}</span>
                              <span className="gwui-ec-sofar-value">{h.value}</span>
                            </div>
                          ))}
                          {sum.missing.length > 0 && (
                            <div className="gwui-ec-sofar-missing">
                              <b>Not said yet: </b>
                              {sum.missing.join(', ')}. You can add it in your check-in.
                            </div>
                          )}
                        </div>
                      )
                    })()}
                    {/*
                      THE EXPLANATION IS GONE, AND THE OPTIONS SAY IT INSTEAD.

                      It asked "Who gives the accounts on this?" over two lines explaining what an
                      account was, and offered "I am one of the people involved. Start my check-in
                      now." against "They do. I read what comes back." Watched at a live demo and
                      called confusing for everyone, which it was, for four separate reasons:

                        - the two answers were not parallel. One was about me, the other about them,
                          so neither could be read without re-reading the other.
                        - "they" had no antecedent, on a card that names Bob James and Hafsah
                          Abubakar two inches above.
                        - one was an answer and the other was a command ("Start my check-in now").
                        - the question was not the real branch. Everybody answers questions. The only
                          thing being decided is whether the person setting it up does too.

                      Her wording, and it needs nothing under it: both options open on the same three
                      words, so the only thing to read is how they end. A choice screen that needs a
                      paragraph explaining it has the wrong options on it.

                      And the word "account" is gone rather than reworded. It is the login word to
                      everybody outside this codebase, and it was carrying the whole explanation.
                    */}
                    {/* `yourRole` is EXTRACTED from what they typed, not something they said in so many
                        words. "You said" put a sentence in their mouth; this attributes it to their text,
                        and the button beside it is how they change it. */}
                    {yourRole === 'a_party' ? (
                      <div className="gwui-ec-fork-note">From what you wrote, you are one of the people involved.</div>
                    ) : null}
                  </Bubble>
                  {/* Two equal, parallel choices - neither is this screen's one primary action, so
                      both stay secondary (white, bordered), matching the prototype's own weight for
                      a choice between two options rather than a single way forward. */}
                  <Button kind="secondary" wide onClick={startSelfPath}>
                    I set this up and check in myself
                  </Button>
                  <Button kind="secondary" wide onClick={othersGiveTheAccounts}>
                    I check in once to set the context, then only they check in
                  </Button>
                </div>
              )}

              {/*
                * THE LEAD-CAPTURE PANEL WAS HERE, and it is gone with the answer that reached it.
                * It asked for a name, an email and a note, then invited that person to confirm a
                * situation somebody else had written. Whoever knows what a check-in is about is the
                * person who should set it up; anybody who only needs to watch is added as oversight
                * in the check-in's own settings, once it exists.
                *
                * WRITTEN AS A BARE /* *\/ FIRST, WHICH JSX RENDERS AS TEXT. It shipped, and this
                * whole paragraph appeared on the entry chat under the conversation, in front of
                * anybody who opened it. Inside JSX children a comment needs the braces; without
                * them it is a string, and nothing in the build says so.
                */}
              {startCheckin.isPending && (
                <p className="gwui-fine gwui-fine-centre">
                  Starting your session…
                </p>
              )}
            </div>

            {/* Text input for onboarding - hidden once ready, loading checkin, or cards not yet dismissed.
                An anchor arrival has no cards to dismiss (fault 1): the composer is there from the
                first render, open on the engine's own opening line, so the lead can only ever type
                her own first answer - never a word she did not write. */}
            {!startCheckin.isPending && !onboardingReady && !(onboardingHistory.length === 1 && !pickedSituation && !anchorConversationOpensDirectly()) && (
              <div className="gwui-ec-composer-wrap">
                {/* Doc-add panel: paste or upload a document + context; the AI reads it. */}
                {showDocPanel && (
                  <div className="gwui-ec-doc-panel">
                    <div className="gwui-ec-doc-panel-inner">
                      <div className="gwui-ec-doc-panel-tabs">
                        {(['paste', 'upload'] as const).map(t => (
                          <Button key={t} kind={docTab === t ? 'primary' : 'secondary'} size="small" onClick={() => setDocTab(t)}>
                            {t === 'paste' ? 'Paste text' : 'Upload file'}
                          </Button>
                        ))}
                        <span className="gwui-ec-doc-panel-spacer" />
                        <button type="button" onClick={() => setShowDocPanel(false)} className="gwui-plain-link">Cancel</button>
                      </div>
                      {docTab === 'upload' && (
                        <label className="gwui-ec-doc-upload-label">
                          📎 Choose a text file (.txt, .md, .csv). For PDF or Word, paste the text instead.
                          <input type="file" accept=".txt,.md,.csv,.json,.log" className="gwui-sr-only"
                            onChange={e => { const f = e.target.files?.[0]; if (f) handleDocFileUpload(f) }} />
                        </label>
                      )}
                      {/* U.8 review, found on the way: this field had a placeholder and nothing a screen
                          reader announces as its name - a placeholder disappears the moment somebody
                          types, and is not read as a label to begin with. */}
                      <TextField type="text" aria-label="What is it?" placeholder="What is this? e.g. the onboarding guide I shared" value={docLabel}
                        onChange={e => setDocLabel(e.target.value)} />
                      <TextArea placeholder={docTab === 'upload' ? 'File contents will appear here once read. You can edit before sending.' : 'Paste the document text here…'}
                        value={docPasteText} onChange={e => setDocPasteText(e.target.value)} rows={5} />
                      <TextField type="text" placeholder="Anything to note about it? (optional)" value={docContextNote}
                        onChange={e => setDocContextNote(e.target.value)} />
                      <Button kind="secondary" onClick={submitOnboardingDoc} disabled={!docPasteText.trim() || onboardingLoading}>
                        Add document and let Groundwork read it
                      </Button>
                    </div>
                  </div>
                )}
                {/* The composer keeps its own stacking context so a floating control can never take
                    a click meant for Send. It happened: the feedback button's mobile position put it
                    exactly on top of Send at 375px. See gw-fb-trigger-chat-mobile-safe. */}
                <div className="gwui-ec-composer-inner">
                  <div className="gwui-ec-messages-narrow">
                    {/* A textarea, like the check-in composer two screens later: Enter sends, Shift+Enter breaks a
                        line, and a multi-line setup answer keeps its shape. Same position, same handler. */}
                    <Composer
                      value={input}
                      onChange={setInput}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (input.trim()) sendOnboarding(input) } }}
                      onSend={() => { if (input.trim()) sendOnboarding(input) }}
                      onPlus={() => setShowDocPanel(v => !v)}
                      plusGlyph="+ Doc"
                      plusLabel="Add a document (paste or upload) instead of typing it out"
                      plusDisabled={onboardingLoading}
                      disabled={onboardingLoading}
                      sendDisabled={!input.trim()}
                      sendText="Send"
                      sendLabel="Send message"
                      /*
                       * FAULT 7 (live walk, 6 October 2026): SHORTENED, AND TWO ROWS TALL, SO IT IS
                       * NEVER CLIPPED AT 375px. The "+ Doc" button beside this already says how to
                       * add a document, so repeating "with + Doc" in the placeholder was redundant
                       * as well as too long to fit one line next to it and "Send" at a phone width -
                       * `rows={2}` gives the wrapped text somewhere to go instead of being cut off.
                       */
                      placeholder="Type your response, or add a document."
                      rows={2}
                      autoFocus
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* U.6: the panel that fills in as you talk (new.txt), beside the conversation on a wide
              screen. Built only from what this page already holds from the conversation. */}
          {!atTheDoor && (
            <div className="gw-fills-in gwui-ec-fills-in">
              <FillsInAsYouTalk
                /*
                 * FAULT 4 (live walk, 6 October 2026): "A NAME" STAYED UNTICKED THOUGH THE PERSON
                 * HAD ALREADY BEEN NAMED. For a new hire, the conversation knows a name before the
                 * lead has typed anything into "Name this situation" - the same name faults 4 and
                 * 6 use to default the saved check-in's own name. Offered here too, so the row
                 * ticks the moment Groundwork has a name to offer, not only once the lead has
                 * retyped it herself. Every other situation is unaffected: with no new-hire name to
                 * offer, this is simply `groundName` as before, and the row stays unset until the
                 * lead gives one.
                 */
                name={groundName.trim() || (
                  (theSituationTheLeadPicked() ?? onboardingSelections.classifiedScenario) === 'NEW_HIRE'
                    ? newHireGroundNameFallback(
                        onboardingSelections.peopleNamed,
                        newHireDays(`${onboardingSelections.initial ?? ''} ${onboardingSelections.brief ?? ''}`),
                      ) ?? ''
                    : ''
                )}
                situation={(() => {
                  /*
                   * FAULT 2: THE PANEL'S SITUATION LINE, FOR AN ANCHOR DRAFT, IS THE ENGINE'S OWN
                   * `groundLabel` ("Help my team understand") - not `SCENARIO_LABELS`' entry for
                   * `HELP_TEAM_UNDERSTAND`, which is missing its "my".
                   */
                  if (isAnchorDraft()) return anchorGroundLabel
                  const chosen = onboardingSelections.classifiedScenario || pickedScenario || scenario
                  return chosen ? sentenceCase(scenarioLabel(chosen, onboardingSelections.brief)) : ''
                })()}
                cadence={cadence}
                cadenceChosen={cadenceChosen}
                workingDays={workingDays}
                startsOn={checkInBy}
                endsOn={lastCheckInBy}
                mentioned={onboardingSelections.peopleNamed ?? []}
                added={inviteAdded.map((e) => shownAs(e.split(' - ')[0]))}
                /*
                 * FAULT 2: THE ANCHOR'S SEVEN ITEMS, NOT THE USUAL FOUR.
                 *
                 * Not served yet (docs/answers-from-engine.md, "Request 144 (2) and (3)"), so this is
                 * `{}` for now - FillsInAsYouTalk already draws all seven headings, "0 of 7 set", the
                 * moment it is handed an (even empty) `anchorItems` object, rather than the usual four.
                 */
                anchorItems={isAnchorDraft() ? (onboardingSelections.anchorItems ?? {}) : undefined}
              />
            </div>
          )}
          </div>
        )}

        {/* PHASE: CHECK-IN (AI-driven, message 15+) */}
        {phase === 'checkin' && (
          <div className="gwui-ec-checkin">
            {/* Not-signed-up reminder: the entry user has no account until they save. */}
            {!user && (
              <div className="gwui-ec-checkin-notice">
                <div className="gwui-ec-checkin-notice-inner">
                  You are not signed up yet. Your answers are saved to this device as you go, but save your email at the end to keep this record.
                </div>
              </div>
            )}
            <div
              ref={msgsRef}
              aria-live="polite"
              className="gwui-ec-checkin-messages"
            >
              {startCheckin.isPending && (
                <div className="gwui-ec-checkin-starting">Starting your session…</div>
              )}
              {/*
                W1. THE SEAM BETWEEN SETUP AND THE CHECK-IN.
                Her run went "Thank you. That gives me what I need." then "How do
                you want to run this?" then straight into a question of a
                completely different kind - one that goes on her private record.
                Nothing said the setup was finished, nothing said a check-in had
                started, and nothing said this half is the private half. After
                five setup questions, a person cannot tell that the sixth is a
                different sort of question unless something says so.
              */}
              {/*
                U.8 REVIEW: "Setup done · your check-in starts here", in capitals, joined with a
                dot. CLAUDE.md's wording rule is the same one everywhere else on the product: plain,
                full sentences, no pieces joined with dots, no work-label capitals. This is the same
                seam the comment above it explains, said as a sentence a person would actually read.
              */}
              {!startCheckin.isPending && displayedHistory.length <= 2 && (
                <div className="gwui-ec-checkin-seam">
                  <Rule />
                  <span className="gwui-ec-checkin-seam-text">
                    Setup is done. Your check-in starts here.
                  </span>
                  <Rule />
                </div>
              )}
              {!startCheckin.isPending && displayedHistory.length <= 2 && (
                <div className="gwui-ec-checkin-note">
                  What you say from here is yours, and it goes on your private record. About 10 minutes, a few exchanges (around 3 answers), then you can end the session to get your report.
                </div>
              )}
              {!startCheckin.isPending && displayedHistory.length <= 2 && (
                <div className="gwui-ec-checkin-note gwui-ec-checkin-note-row">
                  <VennIcon size={22} />
                  <span>Your individual report is private. The shared report shows where everyone agrees and where they differ.</span>
                </div>
              )}
              {/*
                AND WHERE THE REST OF THE CONTEXT GOES, WHICH NOTHING HAS EVER SAID.
                
                A lead finishes setup believing this conversation was the only chance to explain the
                situation. There is a Context tab that takes documents, notes and anything else the
                check-ins should be held against, and no screen in the flow mentions it - so the
                brief, the plan and the spreadsheet somebody already has never arrive, and every
                session afterwards runs on memory alone.
              */}
              {!startCheckin.isPending && displayedHistory.length <= 2 && (
                <div className="gwui-ec-checkin-note">
                  Anything else the check-ins should be held against, such as a plan, a brief or a spreadsheet, goes on the Context and resources tab once this is saved. You can add it any time.
                </div>
              )}
              {displayedHistory.map((m, i) => {
                const typing = m.content === '…'
                return (
                  <Bubble key={i} mine={m.role === 'user'} opacity={typing ? 0.45 : 1}>
                    {typing ? (
                      <span className="gwui-ci-dots">
                        {[0, 1, 2].map(i2 => (
                          <span key={i2} className="gwui-ci-dot" style={{ animationDelay: `${i2 * 0.2}s` }} />
                        ))}
                      </span>
                    ) : nothingInternalReachesTheBubble(m.content)}
                    {streamingIdx === i && <span className="gwui-ci-caret" />}
                  </Bubble>
                )
              })}
            </div>

            {/* Natural close prompt */}
            {showEndPrompt && !closed && (
              <div className="gwui-ec-natural-close">
                <Callout tone="info">
                  This session has reached a natural close. Would you like to end and see your report?
                </Callout>
                <div className="gwui-ec-natural-close-actions">
                  <Button kind="secondary" size="small" onClick={() => { setShowEndPrompt(false); setEndPromptDismissed(true) }}>
                    Keep going
                  </Button>
                  <Button kind="secondary" redText size="small" onClick={() => setShowEndConfirm(true)}>
                    End session
                  </Button>
                </div>
              </div>
            )}

            {/* Quick action chips */}
            {!closed && displayedHistory.length >= 1 && (
              <div className="gwui-ec-quick-actions">
                {QUICK_ACTIONS.map(a => (
                  <button key={a.label} type="button" className="gwui-ec-quick-action" onClick={() => send(a.msg)} disabled={loading}>
                    {a.label}
                  </button>
                ))}
                <button type="button" className="gwui-ec-quick-action" onClick={() => send('What patterns are you noticing in what I have shared so far?')} disabled={loading}>
                  Patterns
                </button>
                <label htmlFor="entry-doc-upload-chip" title="Upload a document" className="gwui-ec-quick-action gwui-ec-quick-action-attach">
                  Attach a document
                </label>
                <input ref={fileRef} type="file" id="entry-doc-upload-chip" accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.png,.jpg,.jpeg,.md" className="gwui-sr-only" onChange={handleFileChange} />
                <div className="gwui-ec-quick-actions-end">
                  {/* No arrow (U.8 review): a button says what it does, and the other "End session"
                      button on this same screen (the natural-close prompt above) already says it
                      without one. */}
                  <button type="button" className="gwui-ec-quick-action gwui-ec-quick-action-navy" onClick={() => setShowEndConfirm(true)} disabled={loading}>
                    End session
                  </button>
                </div>
              </div>
            )}

            {/* Attached doc pill */}
            {uploadedDoc && (
              <div className="gwui-ec-doc-pill">
                <span className="gwui-ec-doc-pill-name">📎 {uploadedDoc.name}</span>
                <button type="button" className="gwui-plain-link" onClick={() => setUploadedDoc(null)}>Remove</button>
              </div>
            )}

            {/* Input bar / save CTA */}
            {closed && !showSave ? (
              <div className="gwui-ec-invite-bar">
                <div className="gwui-ec-invite-bar-text">
                  <div className="gwui-ec-invite-bar-title">{'What you said is on record.'}</div>
                  {/* FAULT 10 (live review): "RELEASES WHEN ALL PARTIES ARE IN" WAS THE PRODUCT'S OWN
                      JARGON FOR ITSELF, NOT A SENTENCE A LEAD WOULD SAY. Said plainly: everybody gets
                      the shared report once everyone involved has checked in. */}
                  <div className="gwui-ec-invite-bar-sub">{skippedCheckin ? 'After this one, only the people you invite check in. You read what comes back.' : 'Invite others to check in. Everyone gets the shared report once all of you have checked in.'}</div>
                </div>
                <Button kind="primary" onClick={() => setShowSave(true)}>
                  Invite and finish
                </Button>
              </div>
            ) : !closed && (
              <div className="gwui-ec-checkin-composer-wrap">
                <Composer
                  value={input}
                  onChange={setInput}
                  onKeyDown={handleCheckinKey}
                  onSend={() => send()}
                  disabled={loading}
                  sendDisabled={loading || !input.trim()}
                  sendLabel="Send message"
                  placeholder="Type your response."
                  inputRef={taRef}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Doc context overlay */}
      {docContextMode && uploadedDoc && (
        <Modal title={`📎 ${uploadedDoc.name}`} onClose={() => { setDocContextMode(false); setUploadedDoc(null) }}>
          <Note>
            What context does this document support from what you have shared so far?
          </Note>
          <TextArea
            autoFocus
            placeholder="e.g. This is the brief I referenced when I mentioned the project scope…"
            value={docContext}
            onChange={e => setDocContext(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitDocContext() } }}
          />
          <div className="gwui-ec-modal-actions">
            <Button kind="secondary" onClick={() => { setDocContextMode(false); setUploadedDoc(null) }}>Cancel</Button>
            <Button kind="primary" onClick={submitDocContext}>Add to session</Button>
          </div>
        </Modal>
      )}

      {/*
        * Save card.
        *
        * ABOVE THE RAIL, WHICH IS 40. This sat at 30, so the navigation drew on top of it: at a
        * viewport narrower than about 1120 the 640px card is centred far enough left that the rail
        * covers its edge, and the panel where somebody types their email was clipped. Wider
        * screens hid it, which is why it lasted - measured at 953px, where the card starts at 156
        * and the rail is 240 wide.
        *
        * 50 is this page's own number for a full-screen modal: the document panel a few lines up
        * already uses it. Two overlays on one screen at two different heights is the bug itself.
        */}
      <div className={`gwui-ec-savecard-overlay ${showSave ? 'gwui-ec-savecard-overlay-shown' : 'gwui-ec-savecard-overlay-hidden'}`}>
        {/* visibility (in the hidden class) keeps the hidden card out of the accessibility tree
            and tab order - opacity alone leaves "Your account is on record" readable by screen
            readers on step 1, before anything is on record. */}
        <div className="gwui-ec-savecard">

          {/*
            * SCREEN FAULT 1: NO ORDINARY SESSION-1 HEADER FOR AN ANCHOR DRAFT.
            *
            * This header ("This is session 1. It is your private report." and the venn sentence
            * about a later shared report) describes the ordinary multi-party check-in, where other
            * people answer their own session 1 and a shared report follows. The anchor has neither:
            * one conversation, no fork, straight to the reveal (see `isAnchorDraft()`'s own
            * commentary above). For an anchor draft the reveal below is the whole header - nothing
            * from the ordinary path announces it first.
            */}
          {!isAnchorDraft() && (() => {
            /*
             * FAULT E, PART 2 (reviewer, third round): "THIS IS SESSION 1. IT IS YOUR PRIVATE
             * REPORT. WHAT YOU SAID IS ON RECORD." BEFORE SHE HAD SAID ANYTHING. Opening the save
             * card with no answer given yet (set up, then straight to Save, with nothing in the
             * conversation) still claimed a report and a record that do not exist yet - both
             * written for after the first session, not before it has started.
             */
            const hasAnswered = history.some(m => m.role === 'user')
            return (
          <div className="gwui-ec-savecard-header">
            {/* Full sentence, no dot, no capitals label (U.8 review): CLAUDE.md's wording rule
                applies here the same as everywhere else a person reads. */}
            <div className="gwui-ec-savecard-eyebrow">
              {skippedCheckin
                ? 'This is session 1. You set the context here.'
                : hasAnswered ? 'This is session 1. It is your private report.' : 'This will be session 1. It will be your private report.'}
            </div>
            <div className="gwui-ec-savecard-title">{groundName || (hasAnswered ? 'What you said is on record.' : 'Nothing is on record yet.')}</div>
            <div className="gwui-ec-savecard-venn-row">
              <div className="gwui-ec-savecard-venn-icon"><VennIcon size={22} /></div>
              <div className="gwui-ec-savecard-venn-text">
                {skippedCheckin
                  ? <>You did the first check-in; after this one, only the people you invite check in. Once everyone has checked in, a <b>shared report</b> shows where they agree and where they differ.</>
                  : <>This individual report is private to you. Once everyone has checked in, a separate <b>shared report</b> shows where everyone agrees and where they differ.</>}
              </div>
            </div>
            {history.filter(m => m.role === 'user').length > 0 && !reportFailed && (() => {
              /**
               * NOT WHEN THE REPORT FAILED.
               *
               * The meter is honest about what it measures - it counts the person's own turns, so
               * it describes how much they said, not the report. But rendering "Specificity:
               * Moderate, a solid start" directly above "We could not generate your report" reads
               * as a page arguing with itself, which is the same defect as "Reports ready 0" over
               * a finished report. The number was never wrong; the place was.
               */
              /*
               * AND NOT A MEASUREMENT IT IS NOT. This was a five-dot bar and a grade word ("Thin",
               * "Moderate", "Strong") under a tooltip claiming it measured how concrete the answers
               * were. It was a turn count. The real specificity read is server-side and not on the
               * anonymous entry report, so nothing is invented: the number is labelled as what it
               * counts, and the bar out of five - which specificity-shows-as-what-it-is-made-of.spec
               * records as decided may not come back - is gone with the grade word.
               */
              const turns = history.filter(m => m.role === 'user').length
              /* A full sentence, not a label ("Depth:") joined to a clause with a dot (U.8 review). */
              const said = `You gave ${turns} ${turns === 1 ? 'answer' : 'answers'}.`
              const more = turns < 4 ? ' More answers make the report stronger.' : ''
              return (
                <div className="gwui-ec-savecard-stat-row">
                  <span className="gwui-ec-savecard-stat">{said}{more}</span>
                </div>
              )
            })()}
          </div>
            )
          })()}

          <div className="gwui-ec-savecard-body">

            {/*
              Generating state.

              THIS IS THE LONGEST WAIT IN THE PRODUCT and it said one line for all
              of it. Measured against the booted API: a setup turn is 4.4s, a
              check-in turn 5.3 to 6.6s, and the closing report about 35s. Hafsah
              read that as the whole product being slow ("the chat load time is too
              long, it is taking like 20 seconds") when the conversation is not
              where the time goes.

              Thirty-five seconds of an unchanging sentence reads as a hang. So it
              says what is actually happening, in the order it happens, and it
              never claims to be nearly done - the steps are honest names for real
              work, not a progress bar pretending to know.
            */}
            {generatingReport && !sessionReport && (
              <div className="gwui-ec-savecard-status" role="status" aria-live="polite">
                <SlowStep steps={CLOSING_STEPS} note="This one takes about half a minute. It is the only slow step." />
              </div>
            )}

            {/* ISSUE 15: report failed - show retry option */}
            {reportFailed && (
              <div className="gwui-ec-savecard-retry">
                <div className="gwui-ec-savecard-retry-text">
                  We could not generate your report. Your responses are saved.
                </div>
                <Button kind="secondary" size="small" onClick={() => generateSessionReport(reportTurnsForRetry)}>
                  Retry
                </Button>
              </div>
            )}

            {/* Structured report */}
            {sessionReport && (
              <TheReportYouSawAtTheEnd
                report={sessionReport}
                correctedNote={reportWasCorrected && !generatingReport}
                /* U.6 review: no "One thing this check-in still needs" here. It asked "When does this
                   start?" and said no start date was set after the lead had chosen "Now". The setup
                   right below (TheSetup) asks when it starts and how often, once. */
                onRecordLine={
                  uploadedDoc
                    ? `Built from what you said today, and ${uploadedDoc.name}. Nobody else has attached anything yet.`
                    : 'Built from what you said today. Nothing attached yet.'
                }
                renderAdd={(key, label) =>
                  queuedFromSuggestion.has(key) ? (
                    <div className="gwui-ec-savecard-add-pending">✓ Added to invite list</div>
                  ) : addingContributorFor === key ? (
                    <>
                      <div className="gwui-ec-savecard-add-row">
                        <TextField
                          type="email" autoFocus placeholder="their@email.com"
                          value={addingContributorEmail} onChange={e => { setAddingContributorEmail(e.target.value); setAddingContributorError('') }}
                          onKeyDown={e => e.key === 'Enter' && queueSuggestedContributor(key, label)}
                        />
                        <Button kind="secondary" size="small" onClick={() => queueSuggestedContributor(key, label)}>Add</Button>
                      </div>
                      {addingContributorError && (
                        <div className="gwui-ec-savecard-add-error">{addingContributorError}</div>
                      )}
                    </>
                  ) : colleagueNamed(label) ? (
                    /* Already in the organisation: one click, no address to type. */
                    <button type="button" className="gwui-plain-link" onClick={() => queueColleague(colleagueNamed(label)!, label, key)}>
                      Add {colleagueNamed(label)!.name}{colleagueNamed(label)!.team ? ` (${colleagueNamed(label)!.team})` : ''}
                    </button>
                  ) : (
                    <button
                      type="button" className="gwui-plain-link"
                      onClick={() => { setAddingContributorFor(key); setAddingContributorEmail(onboardingSelections.peopleEmails?.[label.split(' - ')[0].trim()] ?? ''); setAddingContributorLabel(label); setAddingContributorError('') }}
                    >
                      Add them
                    </button>
                  )
                }
                /* Every open item can say it is wrong, from where it is wrong. It opens the same
                   correction conversation as the summary does; nothing separate to maintain. */
                renderCorrect={(about) => (!showCorrection ? (
                  <button
                    type="button" className="gwui-plain-link"
                    onClick={() => { setCorrectionText(`"${about}" is not right: `); setShowCorrection(true) }}
                    disabled={generatingReport}
                  >
                    This isn't right, correct it
                  </button>
                ) : null)}
                correctionSlot={
                  <>
                          {/* Anonymous correction: routed through the live engine (/entry/chat),
                              not a one-shot patch. See the comment block above buildCorrectionTurn. */}
                          {/*
                            FAULT 6 (LIVE RE-WALK): DARK BLUE ON NAVY. `gwui-plain-link`'s default
                            ink is `var(--gw-navy)`, right for every other quiet link in this
                            product - but this one sits inside TheReportYouSawAtTheEnd's own dark
                            summary card (`.gw-head`, `background: var(--gw-dark)`), the one place
                            that ink is unreadable against its own ground. Fixed in the shared
                            stylesheet both reports already draw from (CLOSE_SHEET, `.gw-close
                            .gw-head .gwui-plain-link`), not here - a rebuilt page like this one may
                            carry no inline colour and no new one-off class, and the colour only
                            ever needs to differ inside that one dark card.
                          */}
                          {!showCorrection ? (
                            <button
                              type="button" className="gwui-plain-link"
                              onClick={() => setShowCorrection(true)}
                              disabled={generatingReport}
                            >
                              This isn't right, correct it
                            </button>
                          ) : (
                            <div>
                              <div className="gwui-ec-correction-intro">
                                {/*
                                  W8. "We may ask a follow-up" reads like a warning that
                                  something might go wrong, and next to a button marked
                                  "Send correction" it reads as one-shot - which is what
                                  it looked like to Hafsah, on a flow where the follow-up
                                  loop is in fact wired. Saying plainly that this is a
                                  conversation is the difference between "the deadline is
                                  wrong" and a correction the record can act on.
                                */}
                                What did we get wrong? Say it plainly. This is a conversation, not a form, and we will usually ask one thing back before the report changes, because "the deadline is wrong" does not say what the deadline is.
                              </div>
                              {correctionExchange.length > 0 && (
                                <div className="gwui-ec-correction-thread">
                                  {correctionExchange.map((m, i) => (
                                    <div
                                      key={i}
                                      className={`gwui-ec-correction-bubble ${m.role === 'user' ? 'gwui-ec-correction-bubble-user' : 'gwui-ec-correction-bubble-assistant'}`}
                                    >
                                      {m.role === 'user' && m.content.startsWith(CORRECTION_PREFIX)
                                        ? m.content.slice(CORRECTION_PREFIX.length).trim()
                                        : nothingInternalReachesTheBubble(m.content)}
                                    </div>
                                  ))}
                                </div>
                              )}
                              <textarea
                                autoFocus
                                value={correctionText}
                                onChange={e => setCorrectionText(e.target.value)}
                                placeholder="e.g. The deadline is not May - it is March 1."
                                className="gwui-ec-correction-field"
                              />
                              <div className="gwui-ec-correction-actions">
                                <Button
                                  kind="secondary" size="small"
                                  onClick={submitReportCorrection}
                                  disabled={!correctionText.trim() || correctionLoading || generatingReport}
                                >
                                  {generatingReport ? 'Redoing your report...' : correctionLoading ? 'Sending...' : correctionExchange.length > 0 ? 'Send' : 'Start'}
                                </Button>
                                {correctionExchange.length > 0 && (
                                  <Button
                                    kind="secondary" size="small"
                                    onClick={finishCorrection}
                                    disabled={correctionLoading || generatingReport}
                                  >
                                    I'm done, redo my report
                                  </Button>
                                )}
                                <button
                                  type="button" className="gwui-plain-link"
                                  onClick={() => { setShowCorrection(false); setCorrectionText(''); setCorrectionStartIndex(null) }}
                                  disabled={correctionLoading || generatingReport}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                  </>
                }
              />
            )}

            {/* What happens next - shown after report is ready, before signup */}
            {(sessionReport || (!generatingReport && closed)) && !emailSent && (
              <>
              {/*
                SENDING NOW WAS THE ONLY OPTION, AND SAVING WAS THE TRIGGER.
                
                Pressing Save mailed everybody named, immediately, and the only way to stop that was
                to know that a future start date holds invites until the morning of the day - which
                is true, the 6am job sends them, and nothing on this screen said so. A lead setting
                up the night before a client meeting had no way to save her work without the whole
                list being mailed there and then.
                
                So the choice is a choice, and it is the same mechanism underneath: hold means a
                start date, and the date is what the invites wait for.

                AND THE SECOND OPTION SAID "ON THE DAY IT STARTS", WHICH WAS TRUE AND UNREADABLE.
                No start date is set by default, so a lead reading those two buttons saw a choice
                between "now" and a day nobody had named - which for her meant the same thing twice.
                It always did set a date; the label just never said so. It says so now, and the date
                field it opens is the answer to the question the button asks.
              */}
              {/*
                PIECE 9: THE LEAD'S REVEAL, "Help my team understand" (plan section 5, row 3;
                docs/answers-from-engine.md, "Request 149 (1 of 6)"). Served now, on `/entry/report`,
                for an anchor draft's own report - no other situation's report carries a `leadsReveal`
                key at all. DECISION 114 (docs/decisions-merged.md; "the anchor changes no screen"):
                this is drawn whenever the engine sends one, for any scenario, exactly like
                `IdeaOffer`/`RequestOffer` on the check-in page - `TheLeadsReveal` itself draws
                nothing when `reveal` is undefined (see its own file), so the `isAnchorDraft()` gate
                this used to carry was a UI branch doing the same job the data already does, and is
                gone. Placed as the set-up screen's own last step, right before the schedule and the
                people step, following the plan's "if unclear, show it on the set-up screen's last
                step for an anchor draft".
              */}
              <TheLeadsReveal reveal={sessionReport?.leadsReveal} />

              {/* U.6: the prototype's setup (setup.txt). The start date is still what the invitations wait for. */}
              <TheSetup
                cadence={cadence}
                cadenceChosen={cadenceChosen}
                onCadence={(c) => { setCadence(c); setCadenceChosen(true) }}
                anchorDay={cadenceAnchorDay}
                onAnchorDay={setCadenceAnchorDay}
                workingDays={workingDays}
                daysPicker={<WhichDaysTheyWork value={workingDays} onChange={setWorkingDays} />}
                startsOn={checkInBy}
                onStartsOn={setCheckInBy}
                endsOn={lastCheckInBy}
                onEndsOn={(d) => { setEndChosen(true); setLastCheckInBy(d) }}
              />

              {/*
                * FAULT 3: THE PEOPLE STEP, BEFORE THE EMAIL, FOR AN ANCHOR DRAFT ONLY.
                *
                * Every other situation still asks for people AFTER the confirmation email is sent
                * (unchanged, see the later `!isAnchorDraft() && renderPeopleStep()` call). For an
                * anchor draft, the plan's own order is "people before the email" - this is the exact
                * same block (`renderPeopleStep`), only moved earlier for this one situation. The
                * email form's own button already reads `thePeopleStepRules.button`
                * ("Start my Groundwork.") for an anchor draft, and already sends whatever is in
                * `inviteAdded` by the time it is pressed (`buildCommitPayload`'s `contributors`), so
                * no new button or new save path is needed - only where this renders changes.
                */}
              {isAnchorDraft() && renderPeopleStep()}

              <div className="gwui-ec-savecard-whatnext">
                <div className="gwui-ec-savecard-whatnext-title">What happens next</div>
                <div className="gwui-ec-savecard-whatnext-list">
                  {(user
                    ? [
                      startsLater ? `Save this. Nobody is invited before ${theDay(new Date(`${checkInBy}T00:00:00`))}.` : 'Save this. You then see who was invited and who has to wait.',
                      /* SCREEN FAULT 1: no shared report, no round, for an anchor draft - each
                         person reads their own account, not a report that releases once everyone
                         has checked in (docs/anchor-scenario.md). */
                      ...(isAnchorDraft() ? [] : ['Once they check in, everyone gets the shared report. It shows where you agree and where the conversation still needs to happen.']),
                    ]
                    : [
                      'Save your email below to keep access to this report.',
                      'Open the confirmation link we email you. That saves it, then shows who was invited and who has to wait.',
                      ...(isAnchorDraft() ? [] : ['Once they check in, everyone gets the shared report. It shows where you agree and where the conversation still needs to happen.']),
                    ]).map((step, i) => (
                    <div key={i} className="gwui-ec-savecard-whatnext-row">
                      <div className="gwui-ec-savecard-whatnext-num">{i + 1}</div>
                      <div className="gwui-ec-savecard-whatnext-text">{step}</div>
                    </div>
                  ))}
                </div>
              </div>
              </>
            )}

            {/**
              * ALREADY SIGNED IN. The page read `user` from the auth store and never used it, so
              * somebody with an account walked the whole anonymous funnel and was then asked for
              * their email to create the account they were signed into - with their own name at the
              * bottom of the rail two inches to the left.
              *
              * For them there is nothing to confirm and no email to send: the ground commits
              * straight to their account.
              */}
            {user && !emailSent ? (
              <div className="gwui-ec-savecard-section">
                <Button kind="primary" wide onClick={saveAsSignedInUser} disabled={savingAsUser || (generatingReport && !sessionReport)}>
                  {savingAsUser ? 'Saving…' : 'Save this'}
                </Button>
                <div className="gwui-ec-savecard-helper">
                  {/* FAULT E (reviewer, third round): "Saving to amina@suites.test. No confirmation
                      needed, you are already signed in." read like a log line, not a sentence a
                      person would read - "saving to" an address is what a form does, not what a
                      person says. Said as what it actually is: the account this goes to. */}
                  We save this to your account, {user.email}.
                </div>
                {/* A WAY OUT OF THE CARD. It covers the whole page, including the page's own Start over,
                    so a card that cannot save (an old empty lead session) was a screen with one button
                    that failed. Seen 10 Sep 2026. Confirmed, like the page's own control. */}
                <div className="gwui-ec-savecard-clear-row">
                  {confirmClearInCard ? (
                    <span className="gwui-ec-savecard-clear-confirm">
                      This throws away this session and everything in it.
                      <button type="button" className="gwui-plain-link gwui-ec-savecard-clear-danger" onClick={handleClearSession}>Start over</button>
                      <button type="button" className="gwui-plain-link" onClick={() => setConfirmClearInCard(false)}>Keep it</button>
                    </span>
                  ) : (
                    <button type="button" className="gwui-plain-link" onClick={() => setConfirmClearInCard(true)}>
                      Start over instead
                    </button>
                  )}
                </div>
              </div>
            ) : !emailSent ? (
              <div className="gwui-ec-savecard-section">
                {/*
                  * THE ORGANISATION'S NAME, ASKED BEFORE EITHER DOOR.
                  *
                  * It used to live on the panel that appears after the email is sent, which meant
                  * only the email path ever saw it. Somebody signing up with Google left with
                  * "Ada's Workspace" and was never offered anything else - the callback returns
                  * before its own name step, deliberately, because interrupting between "signed
                  * in" and "here is your check-in" to ask something already offered is the worst
                  * moment for it. It just had not actually been offered on that path.
                  *
                  * So it is asked here, one step earlier, where both doors pass. Optional, and
                  * above the email rather than below it: it is about the account being made, and
                  * the email is the thing that makes it.
                  */}
                <TextField
                  type="text" placeholder="Organisation name (optional)" value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                  className="gwui-ec-savecard-field"
                />
                {trap.field}
                {/* A form, so Enter and the button are one path and the page's own message is the only channel (noValidate). */}
                <form noValidate onSubmit={e => { e.preventDefault(); handleSave() }}>
                <TextField type="email" placeholder="your@email.com" value={email} onChange={e => { setEmail(e.target.value); setEmailError('') }}
                  className={`gwui-ec-savecard-field ${emailError ? 'gwui-ec-savecard-field-error' : ''}`}
                />
                {emailError && <div className="gwui-ec-savecard-error">{emailError}</div>}
                <Button kind="primary" wide type="submit" disabled={saving || (generatingReport && !sessionReport)}>
                  {/* The anchor label replaces the ordinary one; "Saving…" is shared either way. */}
                  {isAnchorDraft() ? <>{saving ? 'Saving…' : thePeopleStepRules.button}</> : null}
                  {!isAnchorDraft() && <>{saving ? 'Saving…' : 'Save my check-in'}</>}
                </Button>
                </form>
                <div className="gwui-ec-savecard-helper">
                  {/* U.6 review: it promised the invites went out on opening the link, which a later start (or a
                      seat, or an admin who must accept it) makes untrue. The same sentences as after saving. */}
                  {`We'll email you a confirmation link. ${whatOpeningTheLinkDoes(inviteAdded.length, startsLater ? checkInBy : null)}`}
                </div>

                {/* SIGNING UP WITH GOOGLE, AT THE MOMENT SIGNING UP HAPPENS.
                    Sign-up in this flow is the last step, not the first - the
                    whole conversation happens before anyone is asked who they
                    are. So this belongs beside the email box, not at the top of
                    the page.
                    Google has already verified the address, so this path skips
                    the emailed confirmation entirely: the ground is created on
                    the way back. Only shown where the deployment actually has
                    Google configured - the button is otherwise a link to
                    Google's own error page. */}
                {authMethods?.google && (
                  <>
                    <div className="gwui-ec-savecard-or-row">
                      <Rule />
                      <span className="gwui-ec-savecard-or-text">or</span>
                      <Rule />
                    </div>
                    <Button kind="secondary" wide onClick={continueWithGoogle}>
                      Continue with Google
                    </Button>
                    <div className="gwui-ec-savecard-helper">
                      No confirmation email needed. Your check-in is created as soon as you come back.
                    </div>
                  </>
                )}
                {/* The only way out of a full-screen save card, and a keyboard user inside it could not dismiss it. */}
                <button type="button" className="gwui-plain-link" onClick={() => setShowSave(false)}>
                  Not now
                </button>
              </div>
            ) : (
              /**
               * SCROLLED TO, BECAUSE NOBODY EVER SAW IT.
               *
               * This confirmation renders about 1678px down a panel whose viewport
               * is 720px tall, and nothing moved the view. Pressing "Save my
               * ground" left the top of the screen unchanged, so the only feedback
               * that anything had happened was a thousand pixels below the fold.
               *
               * Hafsah: "When i added my email when i got to report page, i didnt
               * know where it went, i forgot i had put my email." That is not a
               * cosmetic miss. Forgetting you gave an address is how the ground was
               * lost: the link went unopened, and a later sign-in request wiped the
               * saved session (the entrySave bug, now fixed). This is the other
               * half of that failure.
               */
              /*
                AND IT IS PINNED, NOT JUST SCROLLED TO. W8-3.
                
                Scrolling into view fixed the moment it appeared. It did not fix the
                next moment: this panel sits about 1678px down a 720px viewport, so
                one flick of the wheel and the only confirmation that anything
                happened is gone again, with no way to get it back. Her report was
                "I didn't know where it went, I forgot I had put my email" - and
                forgetting you gave an address is how a ground was lost.
                
                Sticky at the top of the scrolling column, so it stays until the
                person acts on it.
              */
              <div
                ref={(el) => {
                  // Optional-call because jsdom has no scrollIntoView: an
                  // unguarded call throws inside the ref, React unmounts the
                  // subtree, and four unrelated specs went red on a scroll.
                  if (el) scrollTo(el)
                }}
                className="gwui-ec-savecard-confirm-box"
              >
                <div className="gwui-ec-savecard-confirm-title">Check your email</div>
                <div className="gwui-ec-savecard-confirm-body">We sent a link to <strong>{email}</strong>. Click it to finish setting up and get your invite link.</div>
                {inviteAdded.length > 0 ? (
                  <div className="gwui-ec-savecard-confirm-sub">
                    {whoIsWaiting()} Nobody is invited before you confirm your email.
                  </div>
                ) : (
                  /* Saying nothing here read as "you have left something
                     undone". Nobody added is a perfectly good place to stop. */
                  <div className="gwui-ec-savecard-confirm-sub">
                    No one added yet. You can invite people whenever you're ready.
                  </div>
                )}
              </div>
            )}

            {/*
              * FAULT A (reviewer, third round): THE FIRST SAVE INVITED NOBODY. This whole block -
              * naming the check-in and, inside `renderPeopleStep()`, the colleague picker and the
              * "Name + email" add row - was gated on `emailSent`, a flag only the ANONYMOUS path
              * (`handleSaveInner`, above) ever sets. A signed-in lead's save
              * (`saveAsSignedInUser`) never touches `emailSent`, so this never rendered for her at
              * all: she had no colleague picker and no add-by-address row, only the report's own
              * suggestions (renderAdd) - and anyone she meant to queue through the section built
              * for exactly that was silently never on the list `buildCommitPayload` sent. Shown
              * now whenever either path has reached this point: the email is sent, or she is
              * already signed in.
              */}
            {(emailSent || !!user) && (
            <div>
            <div className="gwui-ec-savecard-divider" />

            {/*
              * SCREEN FAULT 2: NOTHING LEFT TO NAME, FOR AN ANCHOR DRAFT.
              *
              * Its name is already set - the served `groundLabel` ("Help my team understand"), sent
              * on commit above - so "Name this situation" asks for something already answered, and
              * "Still to set: a name and a rhythm" (whatIsSetAndWhatIsNot, below) says a name is
              * still missing when it never was. Both describe the ordinary path, where the lead
              * picks her own name and rhythm; the anchor picks neither.
              */}
            {!isAnchorDraft() && (
            <div className="gwui-ec-savecard-name-block">
              <div className="gwui-ec-savecard-name-label">Name this situation</div>
              <TextField
                type="text" placeholder="e.g. Kwame, first 90 days" value={groundName}
                onChange={e => setGroundName(e.target.value)}
                className="gwui-ec-savecard-field"
              />
              {/* Asked one step earlier now, where both the email and Google paths pass. */}

              {/* U.6: the schedule is set before saving now, in TheSetup. What is still missing stays said here. */}
              <div className="gwui-ec-savecard-name-hint">
                {whatIsSetAndWhatIsNot({
                  name: groundName,
                  cadenceChosen,
                  /* "Now" is a start: today. Only a start nobody could have chosen is missing, and
                     the setup always has one. */
                  startsAt: checkInBy ? new Date(`${checkInBy}T00:00:00`) : new Date(),
                  workingDays,
                  peopleAdded: inviteAdded.length,
                })}
              </div>
            </div>
            )}

            {/*
              * FAULT 3: FOR AN ANCHOR DRAFT, THE PEOPLE STEP RENDERS EARLIER (see the call to
              * `renderPeopleStep()` placed above the email form, before the "What happens next"
              * section), so it is skipped here - rendering it twice would show it after email too.
              * Every other situation keeps rendering it in exactly this place, exactly as before.
              */}
            {!isAnchorDraft() && renderPeopleStep()}

            </div>
            )}

            {/*
              "Done" is only offered once the email has actually been sent.

              It used to render whenever the session had closed, which meant a
              user who had not yet saved saw THREE controls at once: "Save my
              ground →", "Not now", and a second primary-styled "Done" beneath it.
              Two of those dismiss the panel and one saves, and the dismiss action
              carried the visual weight of the finishing action - so the obvious
              way to press "I have finished" was the way to leave without saving.
              GW-006.

              With the email sent, "Done" is honest: the ground is saved and this
              just closes the panel.
            */}
            {closed && emailSent ? (
              <div className="gwui-ec-savecard-done">
                {/*
                  AND IT THREW AWAY THE PERSON SHE HAD JUST TYPED IN.
                  Adding somebody takes two clicks: the email opens a note box,
                  and "Add person" commits it to the list. Closing the panel with
                  that box still open dropped them silently - no invite, no
                  warning, and the closing line above cheerfully reported the
                  invites it was about to send while omitting this one.

                  Found in the overnight run's own screenshot: an email filled in,
                  a note reading "On the build", "Add person" never pressed, and
                  three failures downstream - no queue shown, no "Invited (1)", no
                  invite email. It read as a broken invite queue. The queue was
                  fine; the person never reached it.

                  Somebody who typed an address and a note has told us who they
                  mean, so "Done" now commits them rather than discarding them. The
                  second click is a convenience for adding several people, not a
                  consent gate - the consent was typing the address.
                */}
                <Button kind="primary" onClick={() => { if (inviteContextFor) submitInviteContext(); setShowSave(false) }}>
                  Done
                </Button>
                {/*
                  W7. "DONE" CLOSED THE PANEL AND SAID NOTHING ABOUT THE EMAIL.
                  She pressed it and was left on the report with no sign that
                  anything had been sent, on a flow whose whole next step happens
                  in her inbox. The panel closing is the only feedback there was,
                  and a panel closing is what "Cancel" looks like.
                */}
                <div className="gwui-ec-savecard-done-text">
                  {/*
                    Counts the person still sitting in the note box, because "Done"
                    now commits them. Reading inviteAdded alone made this sentence
                    quietly wrong by one: it promised to send 1 invite while two
                    people had been named.
                  */}
                  Nothing else to do here. The link is in your inbox at <strong>{email}</strong>. {(() => {
                    const pending = inviteContextFor && !inviteAdded.some(e => e === inviteContextFor || e.startsWith(`${inviteContextFor} - `)) ? 1 : 0
                    const n = inviteAdded.length + pending
                    return whatOpeningTheLinkDoes(n, startsLater ? checkInBy : null)
                  })()} You can reopen this any time from the bar below.
                </div>
              </div>
            ) : closed ? null : (
              <button type="button" className="gwui-plain-link" onClick={() => setShowSave(false)}>
                Later
              </button>
            )}
          </div>
        </div>
      </div>

      {/* New scenario conflict modal */}
      {showNewScenarioConflict && (
        <div className="gwui-ec-confirm-overlay">
          <div className="gwui-ec-confirm-box">
            <div className="gwui-ec-confirm-title">You have a check-in in progress</div>
            <div className="gwui-ec-confirm-body">
              Starting a new one clears the one you were setting up, and nothing you said in it is kept. Carry on with it to pick up where you left off.
            </div>
            <div className="gwui-ec-confirm-actions">
              <Button
                kind="secondary"
                onClick={() => {
                  setShowNewScenarioConflict(false); setPendingNewScenario(null)
                  /*
                   * Carrying on means the kept setup is on the screen now, not after a reload. The
                   * address goes back to plain /start as well, so a reload restores it too rather
                   * than asking again.
                   */
                  const saved = loadSession()
                  if (saved) restoreTheSavedSetup(saved)
                  if (wantsANewOne || scenario || urlInitial) navigate('/start', { replace: true })
                }}
              >
                {/* U.6 review: plain words, where it said "Keep current session" / "Start new scenario". */}
                Carry on with this one
              </Button>
              <Button
                kind="danger"
                onClick={() => {
                  if (pendingNewScenario) {
                    clearEntrySession()
                    setOnboardingSelections(pendingNewScenario.sels)
                    /*
                     * THE OPENER, WHICH THIS SET TO AN EMPTY LIST AND LEFT THERE.
                     *
                     * `setOnboardingHistory([])` cleared the conversation and put nothing back, and
                     * the picker only renders while the history is exactly one turn long. So
                     * "Start new scenario" produced a blank screen: no question, no cards, no way
                     * forward except reloading. Seen by driving it - the wizard hands over, the
                     * session from an earlier attempt triggers this modal, and the way through it
                     * is a dead end.
                     */
                    setOnboardingHistory([{ role: 'assistant', content: THE_OPENING_QUESTION }])
                    setOnboardingReady(false)
                    setPickedSituation(null)
                    setPickedScenario(null)
                    persistOnboarding([], pendingNewScenario.sels, 1)
                    /*
                     * AND IF THEY ARRIVED HAVING ALREADY PICKED, honour that here as well. Coming
                     * from /grounds/new the situation is chosen and in the URL; showing them the
                     * picker again after they have just used one is the "click went nowhere" bug
                     * with an extra modal in front of it.
                     */
                    const already = SITUATION_CARDS.find((c) => c.scenario === scenario)
                    if (already) {
                      setPickedSituation(already.label)
                      setPickedScenario(already.scenario)
                      theyArrivedHavingPicked.current = already.message
                    }
                  }
                  setShowNewScenarioConflict(false)
                  setPendingNewScenario(null)
                }}
              >
                Start a new one
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* End session confirmation modal */}
      {showEndConfirm && (
        <Modal title="End this session?" onClose={() => setShowEndConfirm(false)}>
          <Note>
            {/*
              SCREEN FAULT 10 (FINAL WALK): "YOUR ANSWERS ARE SAVED ON THIS DEVICE" TOLD A SIGNED-IN
              LEAD SOMETHING FALSE. That sentence describes the anonymous draft kept in this
              browser before anybody has an account - once signed in, the answers are saved on the
              server against their account, not this device, and closing this tab loses nothing.
            */}
            {user
              ? "Ending this session generates your report, and this session's answers then lock."
              : "Your answers are saved on this device. Ending this session generates your report, and this session's answers then lock."}
          </Note>
          <Note>
            Once you save the record below, you can revisit and correct it any time from your report. The team’s report is shared with everyone in the check-in when you choose to share it.
          </Note>
          <div className="gwui-ec-modal-actions">
            <Button kind="secondary" onClick={() => setShowEndConfirm(false)}>Keep going</Button>
            <Button kind="danger" onClick={() => { setShowEndConfirm(false); handleEndSession() }}>End session</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
