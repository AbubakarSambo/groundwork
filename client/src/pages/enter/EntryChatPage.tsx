import { useState, useEffect, useRef } from 'react'
import { HOW_A_SITUATION_IS_CHOSEN, OR_PICK_ONE_THAT_FITS } from '@/lib/one-way-to-say-what-a-situation-does'
import { SCENARIO_LABELS, SCENARIO_GROUPS } from '@/lib/scenario-catalog'
/*
 * THE CATALOGUE'S CARDS, IMPORTED FROM THE PAGE THAT OWNS THEM.
 *
 * A page importing a page is not lovely, and the alternative was worse: a third file holding a
 * third copy of twenty-two situations, which is the exact shape of the bug being fixed. SCENARIOS is
 * already exported and already the thing the signed-in picker reads. Moving it into lib/ is the
 * tidier home and is a separate change - doing it here would bury the fix in a file move.
 */
import { SCENARIOS, groupOfCard } from '@/pages/grounds/CreateGroundPage'
import { theWordsForPickingASituation } from '@/pages/grounds/whose-situation-is-it'

/* One pair of sentences for the freeform card, shared with the setup step. */
const THE_WORDS = theWordsForPickingASituation()
import { SituationCard } from '@/components/gw/SituationCard'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { entryApi } from '@/api/entry'
import { billingApi } from '@/api/billing'
import { authApi } from '@/api/auth'
import { PeoplePicker } from '@/components/gw/PeoplePicker'
import { useEntryStore } from '@/stores/entry'
import { useAuthStore } from '@/stores/auth'
import { VennIcon } from '@/components/gw/VennIcon'
import { plannedSessionsFor } from '@/lib/sessionCount'
import { SlowStep, CLOSING_STEPS } from '@/components/gw/SlowStep'
import { toast } from 'sonner'
import { scrollTo } from '@/lib/scroll-to'
import { TheReportYouSawAtTheEnd } from '@/components/gw/TheReportYouSawAtTheEnd'
import { WhatThisCheckInStillNeeds } from '@/components/gw/WhatThisCheckInStillNeeds'
import { nothingInternalReachesTheBubble } from '@/lib/nothing-internal-reaches-the-bubble'
import { clearEntryHandover } from '@/pages/auth/entry-handover'
import { rememberWhoWasNotInvited } from '@/pages/grounds/who-was-not-invited'
import { API_ORIGIN } from '@/lib/where-the-api-lives'
import { useTheTrap } from '@/components/gw/a-field-nobody-can-see'
import { looksLikeAnAddress, NOT_AN_ADDRESS } from '@/components/gw/an-address-that-can-receive-mail'
import { copy } from '@/components/gw/copying-can-fail'
import { whenTheCheckInsLand, sayTheDate, whatIsSetAndWhatIsNot, WEEKDAYS, type Cadence as CadenceName } from '@/components/gw/when-the-check-ins-land'

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
}

interface OnboardingSelections {
  mode: string
  initial: string
  whoInvolved?: string
  /** One entry per individual. "My team" is zero entries, not one. Empty is what drives the warning. */
  peopleNamed?: string[]
  goals?: string[]
  checkinTiming?: string
  timeframe?: string
  cadence?: string
  decision?: string
  brief?: string
  classifiedScenario?: string
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
  return <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-sub)', marginBottom: 4 }}>{children}</div>
}

function CardTitle({ children, weight = 600 }: { children: React.ReactNode; weight?: 600 | 700 }) {
  return <div style={{ fontSize: 13, fontWeight: weight, color: 'var(--gw-text)', marginBottom: 2 }}>{children}</div>
}

/** The hairline either side of an "or" divider. */
function Rule() {
  return <div style={{ flex: 1, height: 1, background: 'var(--gw-border)' }} />
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
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* */ }
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
  'That is the setup questions done. Here is what you have told us so far.'
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
export function composeLeadBrief(sels: { initial?: string; whoInvolved?: string; decision?: string; goals?: string[]; brief?: string }): string {
  /* Ends every fragment exactly once, whatever the person typed. */
  const sentence = (t?: string) => {
    const trimmed = (t ?? '').trim()
    if (!trimmed) return ''
    return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`
  }
  return [
    /* Unlabelled and first: the band above it already says what this is. */
    sentence(sels.initial),
    sels.whoInvolved ? sentence(`Who is part of this: ${sels.whoInvolved}`) : '',
    sels.decision ? sentence(`Why now: ${sels.decision}`) : '',
    sels.goals?.length ? sentence(`What it is aiming at: ${sels.goals.join(', ')}`) : '',
    sels.brief ? sentence(`Focus: ${sels.brief}`) : '',
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
 * ONE WORD WHERE ONE WORD WILL DO.
 *
 * The summary card's labels are sentences - "What this is about", "People you mentioned", "What you
 * want from it" - which is fine in a report and wrong on a card somebody is scanning to catch a
 * mistake before clicking. Five sentence-labels down the left edge is five things to read before
 * reaching the values, which are the point.
 *
 * Kept as a lookup rather than renamed at source: `summariseSetup` is read by other screens and by
 * its own specs, and the long labels are right where there is room for them.
 */
function shortLabel(label: string): string {
  switch (label) {
    case 'What this is about': return 'About'
    case 'People you mentioned': return 'People'
    /* One word, like the rest: at the label column's width "Why now" wraps onto two lines and the
       row it labels goes out of line with every other row. */
    case 'Why now': return 'Why'
    /* "Want" beside a bare clause read as a sentence: "Want take the on-call escalations off me".
       "Aim" is a noun and frames the clause as the thing being aimed at. */
    case 'What you want from it': return 'Aim'
    case 'Sessions': return 'Sessions'
    default: return label
  }
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
  if (people.length) have.push({ label: 'People you mentioned', value: people.join(', ') })
  if (sels.decision?.trim()) have.push({ label: 'Why now', value: sels.decision.trim() })
  /* The goal is a clause the model lifted mid-sentence ("take the on-call escalations off me"). It is
     the person's words, so nothing is added to them; it is capitalised because it now opens a line. */
  if (sels.goals?.length) have.push({ label: 'What you want from it', value: sels.goals.map((g: string) => g.charAt(0).toUpperCase() + g.slice(1)).join('; ') })
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
  if (needsPeople) {
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
    message: 'We are setting shared goals for this period and I want everyone aligned on what matters most.',
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
      'A hiring, budget, or direction call where you want each person\'s real view before the room converges.',
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
  HOW_A_SITUATION_IS_CHOSEN

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

export function fallbackGroundName(classifiedScenario?: string, firstDescription?: string): string {
  const fromScenario = (classifiedScenario ?? '')
    .trim()
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase())
  if (fromScenario) return fromScenario

  const said = (firstDescription ?? '').trim().replace(/\s+/g, ' ')
  if (said) {
    const clipped = said.length > 60 ? said.slice(0, 57).trimEnd() + '...' : said
    return clipped.replace(/^\w/, (c) => c.toUpperCase())
  }
  return 'Untitled'
}

/**
 * What the closing report is doing, while it does it.
 *
 * No percentage and no estimate: the work is a model call whose length nobody can
 * predict, and a bar that stalls at 90% is worse than a sentence that is true. The
 * steps advance on a timer because they describe stages of one request, and the
 * last one stays until the report arrives however long that takes.
 */
export function EntryChatPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const scenario = params.get('scenario') ?? ''
  const urlMode = params.get('mode') ?? ''
  const urlInitial = params.get('initial') ?? ''
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
  const [situationGroup, setSituationGroup] = useState<string>(SITUATION_GROUPS[0]?.key ?? '')
  /** Which card has its examples open. One at a time, so the grid never doubles in height. */
  const [openCardInfo, setOpenCardInfo] = useState<string | null>(null)
  // Once the user dismisses the natural-close banner, never re-show it
  const [endPromptDismissed, setEndPromptDismissed] = useState(false)

  // Onboarding state
  const defaultSels: OnboardingSelections = { mode: urlMode || 'new', initial: urlInitial || '' }
  const [onboardingStep, setOnboardingStep] = useState(1)
  const [onboardingSelections, setOnboardingSelections] = useState<OnboardingSelections>(defaultSels)
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
  const [colleagues, setColleagues] = useState<{ email: string; name: string | null }[]>([])
  useEffect(() => {
    if (!user) return
    authApi.colleagues().then(setColleagues).catch(() => setColleagues([]))
  }, [user])
  /** A colleague whose name is the one mentioned, when exactly one matches. Never a guess between two. */
  function colleagueNamed(label: string): { email: string; name: string | null } | null {
    const name = label.split(' - ')[0].trim().toLowerCase()
    if (name.length < 2) return null
    const hits = colleagues.filter(c => {
      const full = (c.name ?? '').toLowerCase()
      const first = full.split(' ')[0]
      return full && (full === name || first === name || full.startsWith(name + ' ') || name.startsWith(full))
    })
    return hits.length === 1 ? hits[0] : null
  }
  function queueColleague(c: { email: string; name: string | null }, note?: string, key?: string) {
    const entry = note ? `${c.email} - ${note}` : c.email
    setInviteAdded(prev => (prev.some(e => e === c.email || e.startsWith(`${c.email} - `)) ? prev : [...prev, entry]))
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
  const [cadenceAnchorDay, setCadenceAnchorDay] = useState<number | null>(null) // 0=Sun..6=Sat for "every Monday"
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
    const known = SITUATION_CARDS.find((c) => c.scenario === scenario)
    setGroundName(known ? known.label : scenario ? scenario.replace(/\+/g, ' ') : '')
    setSessions(1)
  }, [])

  // Load or start session
  useEffect(() => {
    const saved = loadSession()
    const branch = saved ? (wantsANewOne ? 'conflict' : entryRestoreBranch(saved, scenario)) : 'fresh'
    // Closed-but-unsaved sessions MUST restore too: they hold the report and
    // the locked transcript. Excluding them made the fallback below DELETE an
    // ended session on reload, right when it is most valuable.
    if (saved && branch === 'restore') {
      // Restore existing session
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
    saveSession({ scenario, history: h, closed: false, onboardingStep: step, onboardingSelections: sels, sessions, cadence, cadenceChosen, groundName, plannedFrom, ...(obHistory !== undefined ? { onboardingHistory: obHistory, onboardingReady: obReady ?? false } : {}) } as any)
  }

  function persistCheckin(h: Turn[], cl = false, rep = '') {
    saveSession({ scenario, history: h, closed: cl, report: rep, onboardingStep: ONBOARDING_STEPS, onboardingSelections })
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
      }], onboardingSelections.classifiedScenario || pickedScenario || scenario || undefined, groundName || undefined)
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
        onboardingSelections.classifiedScenario || pickedScenario || scenario || undefined,
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
      setHistory(msgs)
      toast.error('Message failed. Try again.')
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
      const res = await entryApi.report(turns, scenario || undefined, groundName || undefined)
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
      toast.error('That did not send — what you wrote is back in the box. Try again.')
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
  async function sendOnboarding(text: string) {
    if (!text.trim() || onboardingLoading) return
    const userTurn: Turn = { role: 'user', content: text.trim() }
    const newHistory = [...onboardingHistory, userTurn]
    setOnboardingHistory(newHistory)
    setInput('')
    setOnboardingLoading(true)
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
        onboardingSelections.classifiedScenario || pickedScenario || scenario || undefined,
        onboardingSelections.mode === 'something_new' ? 'STARTING' : undefined,
        (text) => { draft += text; setOnboardingDraft(draft) },
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
          ...(res.extracted.decision ? { decision: res.extracted.decision! } : {}),
          ...(res.extracted.goals ? { goals: res.extracted.goals! } : {}),
          ...(res.extracted.brief !== undefined ? { brief: res.extracted.brief! } : {}),
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
          if (planned != null) { setSessions(planned); setPlannedFrom({ timelineDays: res.extracted.timelineDays, cadence: res.extracted.cadence ?? cadence }) }
        }
        // Background classify intent when we have initial
        if (res.extracted.initial) {
          entryApi.classifyIntent(res.extracted.initial, res.extracted.mode).then(r => {
            /* A low-confidence answer comes back as null and the card they picked stands. */
            const sure = r.scenario
            if (sure) setOnboardingSelections(prev => ({ ...prev, classifiedScenario: sure }))
          }).catch(() => { /* non-critical */ })
        }
      }
      setOnboardingReady(res.ready)
      persistOnboarding([], onboardingSelections, onboardingStep, updatedHistory, res.ready)
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
      toast.error('That did not send — your message is back in the box. Try again.')
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
  useEffect(() => {
    if (phase !== 'onboarding') return
    const INTRO = THE_OPENING_QUESTION
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
  }, [phase])

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
    sendMut.mutate([...history, userTurn])
  }

  function handleCheckinKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  function autoResize(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    e.target.style.height = '38px'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
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
        groundLabel: groundName || scenario || fallbackGroundName(onboardingSelections.classifiedScenario, onboardingSelections.initial),
        orgName: orgName.trim() || undefined,
        // Prefer the AI-classified scenario; fall back to mode key, then URL param.
        scenario: onboardingSelections.classifiedScenario || onboardingSelections.mode || scenario || undefined,
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
        contributors: inviteAdded.map(entry => {
          const dashIdx = entry.indexOf(' - ')
          if (dashIdx === -1) return { email: entry }
          return { email: entry.slice(0, dashIdx), context: entry.slice(dashIdx + 3) }
        }),
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
        + 'in with Google — use the email option below and it will be waiting for you.',
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
        /* No token means the address already has an account and the server wrote nothing for it - by
           design, since this request is unauthenticated. Post-email edits stay in localStorage and
           travel with the same-browser commit; a token left over from an earlier session must not be
           used to patch a draft this address no longer has. */
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
        groundLabel: groundName || scenario || fallbackGroundName(onboardingSelections.classifiedScenario, onboardingSelections.initial),
        orgName: orgName.trim() || undefined,
        cadence,
        /* The page's default is not a choice; the server records only a confirmed pick as one. */
        cadenceChosen,
        cadenceAnchorDay: (cadence === 'WEEKLY' || cadence === 'FORTNIGHTLY' || cadence === 'MONTHLY') && cadenceAnchorDay != null ? cadenceAnchorDay : undefined,
        workingDays: workingDays.length ? workingDays : undefined,
        checkInBy: checkInBy.trim() || undefined,
        lastCheckInBy: lastCheckInBy.trim() || undefined,
        inviteNote: inviteNote.trim() || undefined,
        contributors: inviteAdded.map(entry => {
          const dashIdx = entry.indexOf(' - ')
          if (dashIdx === -1) return { email: entry }
          return { email: entry.slice(0, dashIdx), context: entry.slice(dashIdx + 3) }
        }),
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
  }, [emailSent, draftToken, groundName, orgName, cadence, cadenceAnchorDay, workingDays, checkInBy, lastCheckInBy, inviteNote, inviteAdded])

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
    setInviteContextFor(e)
    setInviteContext('')
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
    setAddingContributorFor(null)
    setAddingContributorEmail('')
    return true
  }

  function submitInviteContext() {
    if (!inviteContextFor) return
    const entry = inviteContextFor + (inviteContext.trim() ? ` - ${inviteContext.trim()}` : '')
    const newAdded = inviteAdded.includes(inviteContextFor) ? inviteAdded : [...inviteAdded, entry]
    setInviteAdded(newAdded)
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
        payload.contributors = newAdded.map(e => {
          const dashIdx = e.indexOf(' - ')
          if (dashIdx === -1) return { email: e }
          return { email: e.slice(0, dashIdx), context: e.slice(dashIdx + 3) }
        })
        localStorage.setItem('gw_commit_payload', JSON.stringify(payload))
      }
    } catch { /* */ }
  }

  if (showAdminBriefing) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--gw-bg)', padding: '24px 20px' }}>
        <div style={{ maxWidth: 480, width: '100%' }}>
          <div style={{ marginBottom: 24 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-navy)', letterSpacing: '-.01em' }}>Groundwork</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--gw-text)', lineHeight: 1.2, marginBottom: 8 }}>You're up first.</h1>
          <p style={{ fontSize: 14, color: 'var(--gw-sub)', lineHeight: 1.7, marginBottom: 24 }}>
            Yours is the first one in. Here is what to expect.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 16px', background: 'white', borderRadius: 10, border: '1px solid var(--gw-border)' }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>⏱</span>
              <div>
                <CardTitle weight={700}>About 10 minutes</CardTitle>
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.55 }}>Answer in your own words. The questions are based on what you just described. There are no right answers.</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 16px', background: 'white', borderRadius: 10, border: '1px solid var(--gw-border)' }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>📨</span>
              <div>
                <CardTitle weight={700}>Invite links come after</CardTitle>
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.55 }}>Once you finish, you will get invite links to send to the other people involved. They check in independently.</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 16px', background: 'white', borderRadius: 10, border: '1px solid var(--gw-border)' }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>📄</span>
              <div>
                <CardTitle weight={700}>The shared report</CardTitle>
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.55 }}>When everyone is in, the report shows where the team agrees, where it differs, and what to do next.</div>
              </div>
            </div>
          </div>
          <button
            onClick={() => { setShowAdminBriefing(false); startCheckin.mutate() }}
            style={{ width: '100%', padding: '14px 20px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Start my check-in
          </button>
        </div>
      </div>
    )
  }

  return (
    /* The viewport less the nav strip pinned over it, and dvh so a phone's address bar sliding away
       does not leave the composer under the fold. See --gw-bottom-nav in AppShell. */
    <div style={{ height: 'calc(100dvh - var(--gw-bottom-nav, 0px))', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)', position: 'relative', overflow: 'hidden' }}>

      {/* Session header */}
      <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--gw-border)', flexShrink: 0, background: 'white', display: 'flex', alignItems: 'center', gap: 8 }}>
        {user && (
          <button type="button" onClick={() => navigate('/grounds')} style={{ background: 'none', border: 'none', padding: 0, fontFamily: 'inherit', fontSize: 12, color: 'var(--gw-sub)', cursor: 'pointer', flexShrink: 0, userSelect: 'none' }}>← Check-ins</button>
        )}
        <div style={{ flex: 1 }}>
          {renamingGround ? (
            <input
              ref={groundRenameRef}
              value={renameInput}
              onChange={e => setRenameInput(e.target.value)}
              onBlur={() => { setGroundName(renameInput.trim() || groundName); setRenamingGround(false) }}
              onKeyDown={e => { if (e.key === 'Enter') { setGroundName(renameInput.trim() || groundName); setRenamingGround(false) } if (e.key === 'Escape') setRenamingGround(false) }}
              style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-text)', border: '1px solid var(--gw-border)', borderRadius: 5, padding: '2px 8px', fontFamily: 'inherit', outline: 'none', width: '100%', maxWidth: 320 }}
              autoFocus
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {groundName ? (
                <>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-text)' }}>{groundName}</span>
                  <button onClick={() => { setRenameInput(groundName); setRenamingGround(true) }} style={{ background: 'none', border: 'none', color: 'var(--gw-muted)', cursor: 'pointer', fontSize: 12, padding: 0, fontFamily: 'inherit' }} title="Rename">✎</button>
                </>
              ) : (
                <button onClick={() => { setRenameInput(''); setRenamingGround(true) }} style={{ background: 'none', border: '1px dashed var(--gw-border)', borderRadius: 5, color: 'var(--gw-sub)', cursor: 'pointer', fontSize: 12, padding: '2px 10px', fontFamily: 'inherit', fontWeight: 500 }}>
                  {/* "Name this ground" used the product's own word for a thing
                      the reader has not met yet - on the first screen a stranger
                      sees, before anything explains what a ground is. Judged
                      against the weakest reader, as briefed. GW-007. */}
                  Give this a name ✎
                </button>
              )}
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--gw-sub)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            {phase === 'checkin' ? (
              <>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gw-green-live)', display: 'inline-block', flexShrink: 0 }} />
                Session 1 in progress
              </>
            ) : 'Getting started · session is about 10 minutes'}
          </div>
        </div>

        {/* Sessions counter */}
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          {editingSessions ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--gw-sub)' }}>sessions:</span>
              <input
                type="number" min={1}
                value={sessionsInput}
                onChange={e => setSessionsInput(e.target.value)}
                onBlur={() => {
                  const n = Math.max(1, parseInt(sessionsInput) || 1)
                  setSessions(n)
                  setSessionsInput(String(n))
                  setEditingSessions(false)
                  if (n > 1) setShowSessionsUpgrade(true)
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                  if (e.key === 'Escape') setEditingSessions(false)
                }}
                style={{ width: 44, fontSize: 13, border: '1px solid var(--gw-border)', borderRadius: 5, padding: '2px 6px', fontFamily: 'inherit', outline: 'none', textAlign: 'center' }}
                autoFocus
              />
            </div>
          ) : (
            <button
              onClick={() => { setSessionsInput(String(sessions)); setEditingSessions(true) }}
              style={{ background: 'none', border: '1px solid var(--gw-border)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}
              title={plannedFrom ? `${sessions} ${sessions === 1 ? 'session' : 'sessions'} - from ${plannedFrom.timelineDays} days, ${plannedFrom.cadence.toLowerCase()}. Click to change.` : 'Edit number of sessions'}
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
              {/* The space is in the STRING: two spans separated by a margin read as "12sessions planned" in every text extraction. */}
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gw-text)' }}>{sessions}</span>
              <span style={{ fontSize: 10, color: 'var(--gw-sub)' }}>
                {' '}{sessions === 1 ? 'session planned' : 'sessions planned'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Phase stepper: makes which phase you are in legible at a glance.
          1 Describe the situation -> 2 Your check-in (or Hand-off) -> 3 Save & invite. */}
      {(() => {
        /* Both answers at the fork lead into the same first check-in, so the step bar is the same for both. */
        const step = phase === 'onboarding' ? 1 : (closed || showSave ? 3 : 2)
        /* "Hand-off to your lead" named a step that no longer exists - handing the context to
           somebody else was removed on 7 September. Somebody who picks "I set this check-in up only"
           was being promised a hand-off screen they would never reach. */
        const labels = ['What is going on', 'Your check-in', 'Save & invite']
        const hints = [
          "You are telling us what is going on. Nothing is saved yet.",
          "You're saying how you see it.",
          'Save this and invite the people involved.',
        ]
        return (
          <div style={{ padding: '7px 20px', borderBottom: '1px solid var(--gw-border)', background: 'var(--gw-paper)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {labels.map((l, i) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 15, height: 15, borderRadius: '50%', fontSize: 9.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: i + 1 === step ? 'var(--gw-navy)' : (i + 1 < step ? 'var(--gw-green-b)' : '#E5E2DC'), color: i + 1 <= step ? 'white' : 'var(--gw-muted)' }}>{i + 1 < step ? '✓' : i + 1}</span>
                    <span style={{ fontSize: 11.5, fontWeight: i + 1 === step ? 700 : 500, color: i + 1 === step ? 'var(--gw-text)' : 'var(--gw-muted)' }}>{l}</span>
                  </div>
                  {i < labels.length - 1 && <span style={{ color: 'var(--gw-border)', fontSize: 11 }}>→</span>}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--gw-sub)', marginTop: 2 }}>{hints[step - 1]}</div>
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
      {(
        <div style={{ padding: '6px 20px', borderBottom: '1px solid var(--gw-border)', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0 }}>
          {confirmClear ? (
            <span style={{ fontSize: 12, color: 'var(--gw-sub)', display: 'flex', alignItems: 'center', gap: 10 }}>
              {closed
                ? 'This will throw away this session and everything in it. Are you sure?'
                : phase === 'checkin' ? 'This will clear your check-in. Are you sure?' : 'This will start over. Are you sure?'}
              <button onClick={handleClearSession} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: 0, fontFamily: 'inherit' }}>Yes, clear</button>
              <button onClick={() => setConfirmClear(false)} style={{ background: 'none', border: 'none', color: 'var(--gw-sub)', cursor: 'pointer', fontSize: 12, padding: 0, fontFamily: 'inherit' }}>Cancel</button>
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
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
              {phase === 'onboarding' && onboardingHistory.length > 1 && (
                <button
                  onClick={pickADifferentSituation}
                  style={{ background: 'none', border: 'none', color: 'var(--gw-navy)', cursor: 'pointer', fontSize: 11, padding: 0, fontFamily: 'inherit', textDecoration: 'underline' }}
                >
                  ← Pick a different situation
                </button>
              )}
              {/* CONFIRMED ONCE THE CONVERSATION EXISTS. Clearing throws away the transcript, the
                  organisation name and anybody queued to be invited - cheap to confirm, expensive
                  to undo. On the picker with nothing said yet there is nothing to lose, so it goes
                  straight through. Once a session has CLOSED it always confirms: that is the state
                  where somebody has the most written down and the least expectation of losing it. */}
              <button
                onClick={() => (phase === 'checkin' || closed || onboardingHistory.length > 1) ? setConfirmClear(true) : handleClearSession()}
                style={{ background: 'none', border: 'none', color: 'var(--gw-muted)', cursor: 'pointer', fontSize: 11, padding: 0, fontFamily: 'inherit', textDecoration: 'underline' }}
              >
                {closed ? 'Start over' : phase === 'checkin' ? 'Clear check-in' : 'Start over'}
              </button>
            </span>
          )}
        </div>
      )}

      {/* Sessions upgrade prompt */}
      {showSessionsUpgrade && (
        <div style={{ background: 'var(--gw-blue-bg)', borderBottom: '1px solid var(--gw-blue-b)', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ flex: 1, fontSize: 13, color: 'var(--gw-navy)', lineHeight: 1.5 }}>
            {/* There is no per-session billing. The old copy told a brand-new
                person "additional sessions are $5 each" at the moment they were
                deciding whether to start - and it was not even true: their
                first ground is free with unlimited sessions. */}
            <strong>{sessions} sessions</strong> means signing in, and it is free. Save your session below to get set up.
          </div>
          <button onClick={() => { setShowSessionsUpgrade(false); setShowSave(true) }}
            style={{ flexShrink: 0, background: 'var(--gw-navy)', color: 'white', border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Save &amp; set up →
          </button>
          <button onClick={() => setShowSessionsUpgrade(false)} style={{ background: 'none', border: 'none', color: 'var(--gw-sub)', cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>
      )}

      {/* Main content area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

        {/* PHASE: ONBOARDING (AI-driven) */}
        {phase === 'onboarding' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
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
              <div style={{ background: 'var(--gw-amber-bg)', borderBottom: '1px solid var(--gw-amber-bd)', padding: '12px 20px', flexShrink: 0 }}>
                <div style={{ maxWidth: 680, margin: '0 auto' }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--gw-amber-t)', marginBottom: 4 }}>
                    You have used all of your free check-ins
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 10 }}>
                    {refusedByThePlan} You can still set this one up and it stays on this device, but it cannot be saved to your account until then.
                  </div>
                  <button
                    onClick={() => navigate('/billing')}
                    style={{ padding: '8px 16px', borderRadius: 7, background: 'var(--gw-dark)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    See plans
                  </button>
                </div>
              </div>
            )}

            {/* Product intro - shown once before conversation starts */}
            {onboardingHistory.length <= 1 && (
              <div style={{ background: 'var(--gw-blue-bg)', borderBottom: '1px solid var(--gw-blue-b)', padding: '12px 20px', flexShrink: 0 }}>
                <div style={{ maxWidth: 680, margin: '0 auto' }}>
                  <h1 style={{ fontSize: 15, fontWeight: 800, color: 'var(--gw-navy)', margin: '0 0 3px', letterSpacing: '-.01em' }}>Tell us what is going on</h1>
                  <div style={{ fontSize: 13, color: 'var(--gw-navy)', lineHeight: 1.6 }}>
                    A few questions to work out what this is. You get something just for you now, and a shared picture once everybody else has checked in.
                  </div>
                </div>
              </div>
            )}
            <div
              ref={msgsRef}
              aria-live="polite"
              // The picker needs the width for a multi-column grid so all 8
              // cards sit above the fold at laptop heights; conversation
              // bubbles keep the narrow reading column.
              style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12, maxWidth: onboardingHistory.length === 1 && !pickedSituation && phase === 'onboarding' ? 1080 : 680, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}
            >
              {onboardingHistory.map((m, i) => {
                /* A CARD IS A PICK, NOT SOMETHING THEY SAID. The card's message travels as the first
                   user turn so the model has a situation; drawing it as a navy bubble put words in
                   their mouth ("I have a new hire starting and want to..."). It is drawn as a pick. */
                const picked = m.role === 'user' && SITUATION_CARDS.find((c) => c.message === m.content)
                if (picked) {
                  return (
                    <div key={i} style={{ alignSelf: 'flex-end', fontSize: 12.5, color: 'var(--gw-sub)', padding: '6px 12px', border: '1px solid var(--gw-border)', borderRadius: 999, background: 'white' }}>
                      You picked <strong style={{ color: 'var(--gw-text)' }}>{picked.label}</strong>
                    </div>
                  )
                }
                return (
                <div
                  key={i}
                  style={{
                    maxWidth: '82%',
                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                    background: m.role === 'user' ? 'var(--gw-navy)' : 'white',
                    color: m.role === 'user' ? 'white' : 'var(--gw-text)',
                    border: m.role === 'assistant' ? '1px solid var(--gw-border)' : 'none',
                    borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
                    padding: '10px 14px',
                    fontSize: 14,
                    lineHeight: 1.65,
                    whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', minWidth: 0,
                    boxShadow: m.role === 'assistant' ? '0 1px 3px rgba(0,0,0,.06)' : 'none',
                  }}
                >
                  {/* THE LAST PLACE BEFORE A READER'S EYES. `[[SESSION_COMPLETE]]` was photographed
                      in a bubble in production, with its markdown asterisks intact. Stripped on the
                      server too - this is a net, not the fix. */}
                  {nothingInternalReachesTheBubble(m.content)}
                </div>
                )
              })}

              {/* Situation cards - shown only before user has sent first message */}
              {onboardingHistory.length === 1 && !onboardingLoading && !pickedSituation && (
                <div style={{ alignSelf: 'flex-start', width: '100%' }}>
                  {/* Seventeen situations will not fit above the fold at a
                      laptop height - measured: even stripping the descriptions
                      leaves 152px over, so the old "everything visible at once"
                      rule is unreachable rather than merely expensive. The
                      descriptions stay, because recognising your own situation
                      matters MORE as the list gets longer. What was missing is
                      any signal that the first screen is not the whole set. */}
                  {/* DESCRIBE YOUR OWN, FIRST. It used to sit at the bottom under "None of these?",
                      which is the right words for the end of a list and the wrong ones for the top:
                      nothing has come before it to be none of. Same order as /grounds/new. */}
                  <button
                    onClick={() => { setPickedSituation('other'); setPickedScenario(null) }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                      textAlign: 'left', padding: '14px 16px', borderRadius: 10,
                      border: '1.5px solid var(--gw-navy)', background: 'white',
                      cursor: 'pointer', fontFamily: 'inherit', marginBottom: 12,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      {/* Her words, and the same pair the setup step asks with - see whose-situation-is-it. */}
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 2 }}>{THE_WORDS.describeOwnQuestion}</div>
                      <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.45 }}>{THE_WORDS.describeOwnHelp}</div>
                    </div>
                    <span style={{ fontSize: 16, color: 'var(--gw-navy)', flexShrink: 0 }}>&rarr;</span>
                  </button>

                  {/*
                    THE SECOND ROUTE, DRAWN AS ONE. This was 11px in the muted grey - the size and
                    colour used for captions - directly under a full-width bordered card, so two
                    ways in read as one way in and a remark about it.
                  */}
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-text)', marginBottom: 6 }}>
                    {OR_PICK_ONE_THAT_FITS}
                  </div>
                  <select
                    className="gw-select"
                    value={situationGroup}
                    onChange={(e) => setSituationGroup(e.target.value)}
                    aria-label="Which kind of situation"
                    style={{ marginBottom: 10 }}
                  >
                    {SITUATION_GROUPS.map(g => (
                      <option key={g.key} value={g.key}>
                        {/* COUNTED FROM WHAT THE GROUP ACTUALLY RENDERS. This counted the entry
                            chat's own list while the grid below now renders the catalogue's, so a
                            situation present in one and not the other would have shown a number that
                            did not match the cards under it. */}
                        {g.heading} ({SCENARIOS.filter(c => c.scenario !== 'OPEN_READ' && groupOf(c) === g.key).length})
                      </option>
                    ))}
                  </select>

                  {/* One block per group, driven by SITUATION_GROUPS. This was
                      two hand-copied sixty-line blocks differing only by their
                      filter, which is how this picker fell eight cards behind
                      /grounds/new without anyone noticing. */}
                  {/* ONE GROUP AT A TIME, chosen above. Every group at once is what the "scroll for
                      the rest" line existed to apologise for. */}
                  {SITUATION_GROUPS.filter(g => g.key === situationGroup).map((group) => {
                    const cards = SITUATION_CARDS.filter(c => c.group === group.key)
                    if (!cards.length) return null
                    return (
                      <div key={group.key}>
                        {/*
                          * THE SAME CARD AS /grounds/new, BECAUSE IT IS LITERALLY THE SAME COMPONENT.
                          *
                          * This block used to draw its own: a smaller title, a 9.5px italic "typically
                          * 90 days", and an "i" that opened a paragraph. The wizard drew a coloured
                          * tag, the moment you would open the app, and a "How it runs" disclosure.
                          * Same twenty-two situations, same groups, two different objects - and
                          * reported twice, the second time after the LISTS had been reconciled:
                          * "the scenario cards on the entry chat still look different from what's in
                          * the wizard".
                          *
                          * It renders SCENARIOS now, the catalogue the signed-in picker reads, rather
                          * than a second list of the same situations. What stays here is the one thing
                          * that is genuinely different about this door: clicking does not select, it
                          * SENDS - there is no Continue on a chat - so the sentence that starts the
                          * conversation is looked up from the card.
                          */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(235px, 1fr))', gap: 8 }}>
                          {SCENARIOS.filter(c => c.scenario !== 'OPEN_READ' && groupOf(c) === group.key).map(card => (
                            <SituationCard
                              key={card.cardKey}
                              card={card}
                              label={card.label}
                              expanded={openCardInfo === card.label}
                              onToggleExpanded={() => setOpenCardInfo(openCardInfo === card.label ? null : card.label)}
                              onPick={() => {
                                const said = whatThisCardSays(card.label)
                                if (!said) return
                                setPickedSituation(card.label)
                                setPickedScenario(card.scenario)
                                sendOnboarding(said)
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                  {/*
                    * THE DESCRIBE-YOUR-OWN CARD USED TO BE HERE, AT THE BOTTOM.
                    *
                    * Its whole history is people trying to make the last item in a list findable:
                    * first it looked disabled, then it was made to look like every other card and
                    * became eighteenth in a scroll of near-identical tiles, then it was given an
                    * accent edge and an arrow. Each fix was right about the problem and could not
                    * reach it, because the problem was the position.
                    *
                    * It is the first thing on the picker now, above the dropdown, and its words
                    * changed with the move: "None of these?" is the right question at the end of a
                    * list and the wrong one at the top, where nothing has come before it to be none
                    * of.
                    */}
                </div>
              )}

              {onboardingLoading && (
                <div className="gw-msg-loading" style={{
                  maxWidth: '82%', alignSelf: 'flex-start', background: 'white', color: 'var(--gw-text)',
                  border: '1px solid var(--gw-border)', borderRadius: '4px 16px 16px 16px',
                  padding: '10px 14px', fontSize: 14, lineHeight: 1.65,
                  boxShadow: '0 1px 3px rgba(0,0,0,.06)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', minWidth: 0,
                }}>
                  {onboardingDraft ? onboardingDraft : (
                    <>
                      <span style={{ marginRight: 6, fontStyle: 'normal', color: 'var(--gw-muted)', fontSize: 11 }}>Thinking</span>
                      <span className="gw-dot" /><span className="gw-dot" /><span className="gw-dot" />
                    </>
                  )}
                </div>
              )}

              {/* The fork, shown when the AI signals ready. Replaces the old
                  "are you involved?" question (which drove nothing but
                  check-in-vs-skip; ownership was never derived from it). */}
              {onboardingReady && !onboardingLoading && flowPath !== 'lead' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: '82%', alignSelf: 'flex-start', marginTop: 4 }}>
                  <div style={{
                    background: 'white', color: 'var(--gw-text)', border: '1px solid var(--gw-border)',
                    borderRadius: '4px 16px 16px 16px', padding: '10px 14px', fontSize: 14, lineHeight: 1.65,
                    boxShadow: '0 1px 3px rgba(0,0,0,.06)', marginBottom: 4,
                  }}>
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
                        <div style={{ marginBottom: 10 }}>
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
                          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: .3, color: 'var(--gw-sub)', marginBottom: 5 }}>
                            What I've got so far
                          </div>
                          {sum.have.map((h) => (
                            <div key={h.label} style={{ display: 'flex', gap: 7, fontSize: 12.5, lineHeight: 1.5, marginBottom: 3 }}>
                              <span style={{ color: 'var(--gw-sub)', fontWeight: 700, flex: '0 0 56px' }}>{shortLabel(h.label)}</span>
                              <span style={{ color: 'var(--gw-text)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{h.value}</span>
                            </div>
                          ))}
                          {sum.missing.length > 0 && (
                            <div style={{ fontSize: 12.5, lineHeight: 1.55, marginTop: 6, color: 'var(--gw-amber-t)' }}>
                              <span style={{ fontWeight: 700 }}>Not said yet: </span>
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
                      <div style={{ fontWeight: 700 }}>From what you wrote, you are one of the people involved.</div>
                    ) : null}
                  </div>
                  <button
                    onClick={startSelfPath}
                    style={{
                      padding: '11px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                      border: '1px solid var(--gw-border)', background: 'white',
                      color: 'var(--gw-text)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                    }}
                  >
                    I set this up and check in myself
                  </button>
                  <button
                    onClick={othersGiveTheAccounts}
                    style={{
                      padding: '11px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                      border: '1px solid var(--gw-border)', background: 'white',
                      color: 'var(--gw-text)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                    }}
                  >
                    I check in once to set the context, then only they check in
                  </button>
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
                <div style={{ fontSize: 13, color: 'var(--gw-sub)', textAlign: 'center', padding: 16 }}>
                  Starting your session…
                </div>
              )}
            </div>

            {/* Text input for onboarding - hidden once ready, loading checkin, or cards not yet dismissed */}
            {!startCheckin.isPending && !onboardingReady && !(onboardingHistory.length === 1 && !pickedSituation) && (
              <div style={{ borderTop: '1px solid var(--gw-border)', background: 'white', flexShrink: 0 }}>
                {/* Doc-add panel: paste or upload a document + context; the AI reads it. */}
                {showDocPanel && (
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--gw-border)', background: 'var(--gw-paper-2)' }}>
                    <div style={{ maxWidth: 680, margin: '0 auto' }}>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                        {(['paste', 'upload'] as const).map(t => (
                          <button key={t} onClick={() => setDocTab(t)}
                            style={{ fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
                              border: `1px solid ${docTab === t ? 'var(--gw-navy)' : 'var(--gw-border)'}`,
                              background: docTab === t ? 'var(--gw-navy)' : 'white', color: docTab === t ? 'white' : 'var(--gw-sub)' }}>
                            {t === 'paste' ? 'Paste text' : 'Upload file'}
                          </button>
                        ))}
                        <div style={{ flex: 1 }} />
                        <button onClick={() => setShowDocPanel(false)} style={{ fontSize: 12, color: 'var(--gw-sub)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                      </div>
                      {docTab === 'upload' && (
                        <label style={{ display: 'block', border: '1px dashed var(--gw-border)', borderRadius: 8, padding: '14px', textAlign: 'center', fontSize: 12, color: 'var(--gw-sub)', cursor: 'pointer', marginBottom: 8, background: 'white' }}>
                          📎 Choose a text file (.txt, .md, .csv). For PDF or Word, paste the text instead.
                          <input type="file" accept=".txt,.md,.csv,.json,.log" style={{ display: 'none' }}
                            onChange={e => { const f = e.target.files?.[0]; if (f) handleDocFileUpload(f) }} />
                        </label>
                      )}
                      <input type="text" placeholder="What is this? e.g. the onboarding guide I shared" value={docLabel}
                        onChange={e => setDocLabel(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid var(--gw-border)', borderRadius: 6, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 6 }} />
                      <textarea placeholder={docTab === 'upload' ? 'File contents will appear here once read. You can edit before sending.' : 'Paste the document text here…'}
                        value={docPasteText} onChange={e => setDocPasteText(e.target.value)} rows={5}
                        style={{ width: '100%', padding: '8px 10px', fontSize: 12, border: '1px solid var(--gw-border)', borderRadius: 6, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', resize: 'vertical', marginBottom: 6 }} />
                      <input type="text" placeholder="Anything to note about it? (optional)" value={docContextNote}
                        onChange={e => setDocContextNote(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid var(--gw-border)', borderRadius: 6, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 8 }} />
                      <button onClick={submitOnboardingDoc} disabled={!docPasteText.trim() || onboardingLoading}
                        style={{ padding: '9px 16px', borderRadius: 6, background: 'var(--gw-navy)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', opacity: (docPasteText.trim() && !onboardingLoading) ? 1 : 0.4 }}>
                        Add document and let Groundwork read it
                      </button>
                    </div>
                  </div>
                )}
                <div style={{ padding: '10px 16px' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', maxWidth: 680, margin: '0 auto' }}>
                    <button
                      onClick={() => setShowDocPanel(v => !v)}
                      disabled={onboardingLoading}
                      title="Add a document (paste or upload) instead of typing it out"
                      style={{ padding: '0 12px', borderRadius: 6, background: 'white', color: 'var(--gw-navy)', border: '1px solid var(--gw-border)', cursor: 'pointer', fontSize: 13, fontWeight: 700, height: 38, whiteSpace: 'nowrap', opacity: onboardingLoading ? 0.5 : 1 }}
                    >
                      + Doc
                    </button>
                    {/* A textarea, like the check-in composer two screens later: Enter sends, Shift+Enter breaks a
                        line, and a multi-line setup answer keeps its shape. Same position, same handler. */}
                    <textarea
                      placeholder="Type your response, or add a document with + Doc"
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (input.trim()) sendOnboarding(input) } }}
                      disabled={onboardingLoading}
                      rows={1}
                      style={{
                        flex: 1, padding: '10px 12px', fontSize: 13, border: '1px solid var(--gw-border)', resize: 'none', minHeight: 38, maxHeight: 120, lineHeight: 1.4,
                        borderRadius: 6, fontFamily: 'inherit', outline: 'none', background: 'white',
                        color: 'var(--gw-text)', opacity: onboardingLoading ? 0.5 : 1,
                      }}
                      autoFocus
                    />
                    <button
                      onClick={() => { if (input.trim()) sendOnboarding(input) }}
                      disabled={!input.trim() || onboardingLoading}
                      aria-label="Send message"
                      style={{ padding: '0 14px', borderRadius: 6, background: 'var(--gw-navy)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 18, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (input.trim() && !onboardingLoading) ? 1 : 0.35 }}
                    >
                      ↑
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PHASE: CHECK-IN (AI-driven, message 15+) */}
        {phase === 'checkin' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {/* Not-signed-up reminder: the entry user has no account until they save. */}
            {!user && (
              <div style={{ background: 'var(--gw-amber-bg)', borderBottom: '1px solid var(--gw-amber-b-soft)', padding: '8px 16px', flexShrink: 0 }}>
                <div style={{ maxWidth: 680, margin: '0 auto', fontSize: 12.5, color: 'var(--gw-amber-t)', lineHeight: 1.5 }}>
                  You are not signed up yet. Your answers are saved to this device as you go, but save your email at the end to keep this record.
                </div>
              </div>
            )}
            <div
              ref={msgsRef}
              aria-live="polite"
              style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 680, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}
            >
              {startCheckin.isPending && (
                <div style={{ fontSize: 13, color: 'var(--gw-sub)', textAlign: 'center', padding: 24 }}>Starting your session…</div>
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
              {!startCheckin.isPending && displayedHistory.length <= 2 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2px 12px 10px' }}>
                  <Rule />
                  <span style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--gw-sub)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    Setup done · your check-in starts here
                  </span>
                  <Rule />
                </div>
              )}
              {!startCheckin.isPending && displayedHistory.length <= 2 && (
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', textAlign: 'center', padding: '4px 12px 8px', lineHeight: 1.5 }}>
                  What you say from here is yours, and it goes on your private record. About 10 minutes, a few exchanges (around 3 answers), then you can end the session to get your report.
                </div>
              )}
              {!startCheckin.isPending && displayedHistory.length <= 2 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', fontSize: 12, color: 'var(--gw-sub)', padding: '0 12px 10px', lineHeight: 1.5 }}>
                  <VennIcon size={22} />
                  <span>Your individual report is private. The shared report shows where everyone agrees and where they differ.</span>
                </div>
              )}
              {displayedHistory.map((m, i) => {
                return (
                  <div
                    key={i}
                    style={{
                      maxWidth: '82%',
                      alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                      background: m.role === 'user' ? 'var(--gw-navy)' : 'white',
                      color: m.role === 'user' ? 'white' : 'var(--gw-text)',
                      border: m.role === 'assistant' ? '1px solid var(--gw-border)' : 'none',
                      borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
                      padding: '10px 14px',
                      fontSize: 14,
                      lineHeight: 1.65,
                      whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', minWidth: 0,
                      opacity: (m.content === '…') ? 0.45 : 1,
                      transition: 'opacity .3s',
                      boxShadow: m.role === 'assistant' ? '0 1px 3px rgba(0,0,0,.06)' : 'none',
                    }}
                  >
                    {m.content === '…' ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {[0, 1, 2].map(i2 => (
                          <span key={i2} style={{
                            display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                            background: 'var(--gw-sub)',
                            animation: 'gwDotBounce 1.2s ease-in-out infinite',
                            animationDelay: `${i2 * 0.2}s`,
                          }} />
                        ))}
                        <style>{`@keyframes gwDotBounce { 0%,80%,100%{transform:translateY(0);opacity:.4} 40%{transform:translateY(-5px);opacity:1} }`}</style>
                      </span>
                    ) : nothingInternalReachesTheBubble(m.content)}
                    {streamingIdx === i && <span style={{ display: 'inline-block', width: 2, height: '1em', background: 'var(--gw-navy)', marginLeft: 2, verticalAlign: 'text-bottom', animation: 'blink .7s step-end infinite' }} />}
                  </div>
                )
              })}
            </div>

            {/* Natural close prompt */}
            {showEndPrompt && !closed && (
              <div style={{ padding: '12px 20px', background: 'var(--gw-blue-bg)', borderTop: '1px solid var(--gw-blue-b)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, fontSize: 13, color: 'var(--gw-navy)', lineHeight: 1.5 }}>
                  This session has reached a natural close. Would you like to end and see your report?
                </div>
                <button
                  onClick={() => { setShowEndPrompt(false); setEndPromptDismissed(true) }}
                  style={{ padding: '7px 12px', borderRadius: 6, background: 'none', border: '1px solid var(--gw-border)', color: 'var(--gw-sub)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                >
                  Keep going
                </button>
                <button
                  onClick={() => setShowEndConfirm(true)}
                  style={{ padding: '7px 14px', borderRadius: 6, background: 'var(--gw-navy)', color: 'white', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                >
                  End session
                </button>
              </div>
            )}

            {/* Quick action chips */}
            {!closed && displayedHistory.length >= 1 && (
              <div style={{ padding: '8px 16px', borderTop: '1px solid var(--gw-border)', display: 'flex', gap: 7, flexWrap: 'wrap', flexShrink: 0, background: 'white', alignItems: 'center' }}>
                {QUICK_ACTIONS.map(a => (
                  <button key={a.label} onClick={() => send(a.msg)} disabled={loading}
                    style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, border: '1px solid var(--gw-border)', background: 'transparent', color: 'var(--gw-sub)', cursor: 'pointer', fontFamily: 'inherit', opacity: loading ? 0.5 : 1 }}>
                    {a.label}
                  </button>
                ))}
                <button onClick={() => send('What patterns are you noticing in what I have shared so far?')} disabled={loading}
                  style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, border: '1px solid var(--gw-border)', background: 'transparent', color: 'var(--gw-sub)', cursor: 'pointer', fontFamily: 'inherit', opacity: loading ? 0.5 : 1 }}>
                  Patterns
                </button>
                <label htmlFor="entry-doc-upload-chip" title="Upload a document"
                  style={{ padding: '5px 10px', borderRadius: 20, fontSize: 13, border: '1px solid var(--gw-border)', background: 'transparent', color: 'var(--gw-sub)', cursor: 'pointer', fontFamily: 'inherit', opacity: loading ? 0.5 : 1 }}>
                  📎
                </label>
                <input ref={fileRef} type="file" id="entry-doc-upload-chip" accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.png,.jpg,.jpeg,.md" style={{ display: 'none' }} onChange={handleFileChange} />
                <div style={{ marginLeft: 'auto' }}>
                  <button onClick={() => setShowEndConfirm(true)} disabled={loading}
                    style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, border: '1px solid var(--gw-border)', background: 'transparent', color: 'var(--gw-navy)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, opacity: loading ? 0.5 : 1 }}>
                    End session →
                  </button>
                </div>
              </div>
            )}

            {/* Attached doc pill */}
            {uploadedDoc && (
              <div style={{ padding: '6px 16px', background: 'var(--gw-blue-bg)', borderTop: '1px solid var(--gw-blue-b)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 12, color: 'var(--gw-navy)', flex: 1 }}>📎 {uploadedDoc.name}</span>
                <button onClick={() => setUploadedDoc(null)} style={{ fontSize: 11, color: 'var(--gw-sub)', background: 'none', border: 'none', cursor: 'pointer' }}>× remove</button>
              </div>
            )}

            {/* Input bar / save CTA */}
            {closed && !showSave ? (
              <div style={{ borderTop: '1px solid var(--gw-border)', background: 'white', flexShrink: 0, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-text)' }}>{'What you said is on record.'}</div>
                  <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 2 }}>{skippedCheckin ? 'After this one, only the people you invite check in. You read what comes back.' : 'Invite others to check in - the shared report releases when all parties are in.'}</div>
                </div>
                <button
                  onClick={() => setShowSave(true)}
                  style={{ flexShrink: 0, padding: '8px 16px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Invite &amp; finish →
                </button>
              </div>
            ) : !closed && (
              <div style={{ borderTop: '1px solid var(--gw-border)', background: 'white', flexShrink: 0 }}>
                <div style={{ padding: '10px 16px', display: 'flex', gap: 8, alignItems: 'flex-end', maxWidth: 680, margin: '0 auto' }}>
                  <textarea
                    ref={taRef}
                    placeholder="Type your response."
                    value={input}
                    onChange={autoResize}
                    onKeyDown={handleCheckinKey}
                    disabled={loading}
                    style={{ flex: 1, resize: 'none', height: 38, maxHeight: 120, padding: '8px 10px', fontSize: 13, lineHeight: 1.4, border: '1px solid var(--gw-border)', borderRadius: 6, background: 'white', fontFamily: 'inherit', outline: 'none', color: 'var(--gw-text)' }}
                  />
                  <button onClick={() => send()} disabled={loading || !input.trim()} aria-label="Send message"
                    style={{ padding: '0 14px', borderRadius: 6, background: 'var(--gw-navy)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 18, flexShrink: 0, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (loading || !input.trim()) ? 0.35 : 1 }}>
                    ↑
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Doc context overlay */}
      {docContextMode && uploadedDoc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '14px 14px 0 0', padding: '20px 20px 32px', width: '100%', maxWidth: 560 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--gw-border)', margin: '0 auto 16px' }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-text)', marginBottom: 4 }}>📎 {uploadedDoc.name}</div>
            <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 12, lineHeight: 1.55 }}>
              What context does this document support from what you have shared so far?
            </div>
            <textarea autoFocus placeholder="e.g. This is the brief I referenced when I mentioned the project scope…"
              value={docContext} onChange={e => setDocContext(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitDocContext() } }}
              style={{ width: '100%', resize: 'none', minHeight: 80, padding: '10px 12px', fontSize: 13, lineHeight: 1.55, border: '1px solid var(--gw-border)', borderRadius: 8, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setDocContextMode(false); setUploadedDoc(null) }} style={{ padding: '10px 16px', borderRadius: 8, background: 'none', border: '1px solid var(--gw-border)', color: 'var(--gw-sub)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={submitDocContext} style={{ flex: 1, padding: '10px 16px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Add to session</button>
            </div>
          </div>
        </div>
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
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 50,
        opacity: showSave ? 1 : 0, pointerEvents: showSave ? 'auto' : 'none',
        // visibility keeps the hidden modal out of the accessibility tree and
        // tab order - opacity alone leaves "Your account is on record" readable
        // by screen readers on step 1, before anything is on record.
        visibility: showSave ? 'visible' : 'hidden',
        transition: 'opacity .3s, visibility .3s',
        overflowY: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '24px 16px 48px',
      }}>
        <div style={{ width: '100%', maxWidth: 640, background: 'white', borderRadius: 14, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,.22)' }}>

          {/* Report header */}
          <div style={{ background: 'var(--gw-dark)', color: 'white', padding: '20px 22px 16px' }}>
            <div style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--gw-green-b)', fontWeight: 700, marginBottom: 6 }}>{skippedCheckin ? 'Session 1 · you set the context' : 'Session 1 · your private report'}</div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-.01em', lineHeight: 1.2 }}>{groundName || 'What you said is on record.'}</div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 6 }}>
              <div style={{ flexShrink: 0, marginTop: 2, background: 'white', borderRadius: 4, padding: '2px 3px' }}><VennIcon size={22} /></div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', lineHeight: 1.5 }}>
                {skippedCheckin
                  ? <>You did the first check-in; after this one, only the people you invite check in. Once everyone has checked in, a <b style={{ color: 'rgba(255,255,255,.85)' }}>shared report</b> shows where they agree and where they differ.</>
                  : <>This individual report is private to you. Once everyone has checked in, a separate <b style={{ color: 'rgba(255,255,255,.85)' }}>shared report</b> shows where everyone agrees and where they differ.</>}
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
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,.55)' }}>Depth: {turns} {turns === 1 ? 'exchange' : 'exchanges'}{turns < 4 ? ' · more exchanges strengthen the report' : ''}</span>
                </div>
              )
            })()}
          </div>

          <div style={{ padding: '18px 20px 28px' }}>

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
              <div style={{ marginBottom: 18 }} role="status" aria-live="polite">
                <SlowStep steps={CLOSING_STEPS} note="This one takes about half a minute. It is the only slow step." />
              </div>
            )}

            {/* ISSUE 15: report failed - show retry option */}
            {reportFailed && (
              <div style={{ background: 'var(--gw-clay-bg)', borderRadius: 10, padding: '14px 16px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, fontSize: 13, color: 'var(--gw-clay)', lineHeight: 1.5 }}>
                  We could not generate your report. Your responses are saved.
                </div>
                <button
                  onClick={() => generateSessionReport(reportTurnsForRetry)}
                  style={{ flexShrink: 0, padding: '8px 14px', borderRadius: 7, background: 'var(--gw-clay)', color: 'white', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Retry
                </button>
              </div>
            )}

            {/* Structured report */}
            {sessionReport && (
              <TheReportYouSawAtTheEnd
                report={sessionReport}
                correctedNote={reportWasCorrected && !generatingReport}
                /*
                  HOW OFTEN THIS RUNS, ASKED WHERE SOMEBODY IS STILL THINKING ABOUT THE WORK.

                  `cadenceChosen` already exists on this page for exactly this distinction - it was
                  added because "a value nobody had chosen was indistinguishable" from one somebody
                  picked. Until now nothing acted on it: the unchosen FORTNIGHTLY went into the
                  commit payload as though it had been decided.

                  The standard half is not offered here. There is no Setup tab yet - the check-in is
                  not saved - so a link to it would be a link to nothing.
                */
                stillNeeded={
                  <WhatThisCheckInStillNeeds
                    cadenceUnset={!cadenceChosen}
                    cadence={cadence}
                    onPickCadence={(c) => { setCadence(c as typeof cadence); setCadenceChosen(true) }}
                    standardUnset={false}
                    onGoToSetup={() => { /* no ground yet on this path */ }}
                  />
                }
                onRecordLine={
                  uploadedDoc
                    ? `Built from what you said today, and ${uploadedDoc.name}. Nobody else has attached anything yet.`
                    : 'Built from what you said today. Nothing attached yet.'
                }
                renderAdd={(key, label) =>
                  queuedFromSuggestion.has(key) ? (
                    <div style={{ fontSize: 11.5, color: 'var(--gw-green-t)', fontWeight: 600, marginTop: 6 }}>✓ Added to invite list</div>
                  ) : addingContributorFor === key ? (
                    <>
                      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                        <input
                          type="email" autoFocus placeholder="their@email.com"
                          value={addingContributorEmail} onChange={e => { setAddingContributorEmail(e.target.value); setAddingContributorError('') }}
                          onKeyDown={e => e.key === 'Enter' && queueSuggestedContributor(key, label)}
                          style={{ flex: 1, padding: '6px 9px', borderRadius: 6, border: '1px solid var(--gw-border)', fontSize: 12, fontFamily: 'inherit', outline: 'none' }}
                        />
                        <button onClick={() => queueSuggestedContributor(key, label)} style={{ padding: '6px 10px', borderRadius: 6, background: 'var(--gw-navy)', color: 'white', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Add</button>
                      </div>
                      {addingContributorError && (
                        <div style={{ fontSize: 11.5, color: 'var(--gw-red-t)', marginTop: 4 }}>{addingContributorError}</div>
                      )}
                    </>
                  ) : colleagueNamed(label) ? (
                    /* Already in the organisation: one click, no address to type. */
                    <button
                      onClick={() => queueColleague(colleagueNamed(label)!, label, key)}
                      style={{ marginTop: 6, background: 'none', border: 'none', padding: 0, fontSize: 12, fontWeight: 600, color: 'var(--gw-navy)', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      + Add {colleagueNamed(label)!.name ?? colleagueNamed(label)!.email} ({colleagueNamed(label)!.email})
                    </button>
                  ) : (
                    <button
                      onClick={() => { setAddingContributorFor(key); setAddingContributorEmail(''); setAddingContributorLabel(label); setAddingContributorError('') }}
                      style={{ marginTop: 6, background: 'none', border: 'none', padding: 0, fontSize: 12, fontWeight: 600, color: 'var(--gw-navy)', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
                    >
                      + Add them
                    </button>
                  )
                }
                correctionSlot={
                  <>
                          {/* Anonymous correction: routed through the live engine (/entry/chat),
                              not a one-shot patch. See the comment block above buildCorrectionTurn. */}
                          {!showCorrection ? (
                            <button
                              onClick={() => setShowCorrection(true)}
                              disabled={generatingReport}
                              style={{ marginTop: 10, background: 'none', border: 'none', padding: 0, fontSize: 12, color: 'var(--gw-green-b)', cursor: generatingReport ? 'wait' : 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
                            >
                              This isn't right - correct it
                            </button>
                          ) : (
                            <div style={{ marginTop: 10 }}>
                              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', marginBottom: 6 }}>
                                {/*
                                  W8. "We may ask a follow-up" reads like a warning that
                                  something might go wrong, and next to a button marked
                                  "Send correction" it reads as one-shot - which is what
                                  it looked like to Hafsah, on a flow where the follow-up
                                  loop is in fact wired. Saying plainly that this is a
                                  conversation is the difference between "the deadline is
                                  wrong" and a correction the record can act on.
                                */}
                                What did we get wrong? Say it plainly. This is a conversation, not a form - we will usually ask one thing back before the report changes, because "the deadline is wrong" does not say what the deadline is.
                              </div>
                              {correctionExchange.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                                  {correctionExchange.map((m, i) => (
                                    <div
                                      key={i}
                                      style={{
                                        alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                                        maxWidth: '88%',
                                        padding: '7px 10px',
                                        borderRadius: 8,
                                        fontSize: 12.5,
                                        lineHeight: 1.5,
                                        background: m.role === 'user' ? 'var(--gw-green-b)' : 'rgba(255,255,255,.1)',
                                        color: m.role === 'user' ? 'var(--gw-dark)' : 'rgba(255,255,255,.9)',
                                      }}
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
                                style={{ width: '100%', minHeight: 64, padding: '8px 10px', fontSize: 13, lineHeight: 1.55, border: 'none', borderRadius: 7, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', resize: 'vertical', background: 'rgba(255,255,255,.94)', color: 'var(--gw-text)' }}
                              />
                              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                <button
                                  onClick={submitReportCorrection}
                                  disabled={!correctionText.trim() || correctionLoading || generatingReport}
                                  style={{ padding: '7px 14px', borderRadius: 7, background: 'var(--gw-green-b)', color: 'var(--gw-dark)', fontSize: 12, fontWeight: 700, border: 'none', cursor: !correctionText.trim() || correctionLoading || generatingReport ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: !correctionText.trim() || correctionLoading || generatingReport ? 0.6 : 1 }}
                                >
                                  {generatingReport ? 'Redoing your report...' : correctionLoading ? 'Sending...' : correctionExchange.length > 0 ? 'Send' : 'Start'}
                                </button>
                                {correctionExchange.length > 0 && (
                                  <button
                                    onClick={finishCorrection}
                                    disabled={correctionLoading || generatingReport}
                                    style={{ padding: '7px 12px', borderRadius: 7, background: 'none', color: 'var(--gw-green-b)', fontSize: 12, border: '1px solid rgba(93,202,165,.5)', cursor: 'pointer', fontFamily: 'inherit' }}
                                  >
                                    I'm done, redo my report
                                  </button>
                                )}
                                <button
                                  onClick={() => { setShowCorrection(false); setCorrectionText(''); setCorrectionStartIndex(null) }}
                                  disabled={correctionLoading || generatingReport}
                                  style={{ padding: '7px 12px', borderRadius: 7, background: 'none', color: 'rgba(255,255,255,.6)', fontSize: 12, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
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
              <div style={{ background: '#F0F4FA', borderRadius: 10, padding: '14px 16px', marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-navy)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.06em' }}>What happens next</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(user
                    ? [
                      'Save this. Your invites go out straight away.',
                      'Once they check in, everyone gets the shared report. It shows where you agree and where the conversation still needs to happen.',
                    ]
                    : [
                      'Save your email below to keep access to this report.',
                      'Open the confirmation link we email you - that saves it and sends your invites.',
                      'Once they check in, everyone gets the shared report. It shows where you agree and where the conversation still needs to happen.',
                    ]).map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--gw-navy)', color: 'white', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                      <div style={{ fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.55 }}>{step}</div>
                    </div>
                  ))}
                </div>
              </div>
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
              <div style={{ marginBottom: 20 }}>
                <button
                  onClick={saveAsSignedInUser}
                  disabled={savingAsUser || (generatingReport && !sessionReport)}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: savingAsUser ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: savingAsUser ? 0.6 : 1 }}
                >
                  {savingAsUser ? 'Saving…' : 'Save this →'}
                </button>
                <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', lineHeight: 1.5, textAlign: 'center', paddingTop: 8 }}>
                  Saving to {user.email}. No confirmation needed, you are already signed in.
                </div>
                {/* A WAY OUT OF THE CARD. It covers the whole page, including the page's own Start over,
                    so a card that cannot save (an old empty lead session) was a screen with one button
                    that failed. Seen 10 Sep 2026. Confirmed, like the page's own control. */}
                <div style={{ textAlign: 'center', paddingTop: 6, fontSize: 11.5, color: 'var(--gw-muted)' }}>
                  {confirmClearInCard ? (
                    <span style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}>
                      This throws away this session and everything in it.
                      <button type="button" onClick={handleClearSession} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 11.5, fontWeight: 600, padding: 0, fontFamily: 'inherit' }}>Start over</button>
                      <button type="button" onClick={() => setConfirmClearInCard(false)} style={{ background: 'none', border: 'none', color: 'var(--gw-sub)', cursor: 'pointer', fontSize: 11.5, padding: 0, fontFamily: 'inherit' }}>Keep it</button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmClearInCard(true)}
                      style={{ background: 'none', border: 'none', color: 'var(--gw-muted)', cursor: 'pointer', fontSize: 11.5, padding: 0, fontFamily: 'inherit', textDecoration: 'underline' }}
                    >
                      Start over instead
                    </button>
                  )}
                </div>
              </div>
            ) : !emailSent ? (
              <div style={{ marginBottom: 20 }}>
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
                <input
                  type="text" placeholder="Organisation name (optional)" value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--gw-border)', fontSize: 14, fontFamily: 'inherit', outline: 'none', marginBottom: 8, boxSizing: 'border-box' }}
                />
                {trap.field}
                {/* A form, so Enter and the button are one path and the page's own message is the only channel (noValidate). */}
                <form noValidate onSubmit={e => { e.preventDefault(); handleSave() }}>
                <input type="email" placeholder="your@email.com" value={email} onChange={e => { setEmail(e.target.value); setEmailError('') }}
                  style={{ width: '100%', padding: '11px 13px', borderRadius: 8, border: `1px solid ${emailError ? 'var(--gw-danger)' : 'var(--gw-border)'}`, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 8, outline: 'none' }}
                />
                {emailError && <div style={{ fontSize: 12, color: 'var(--gw-red-t)', marginBottom: 6 }}>{emailError}</div>}
                <button type="submit" disabled={saving || (generatingReport && !sessionReport)} style={{ width: '100%', padding: '12px 16px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: saving ? 'wait' : generatingReport && !sessionReport ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: saving || (generatingReport && !sessionReport) ? 0.5 : 1 }}>
                  {saving ? 'Saving…' : 'Save my check-in →'}
                </button>
                </form>
                <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', lineHeight: 1.5, textAlign: 'center', paddingTop: 8 }}>
                  We'll email you a confirmation link. Your report is saved and your invites go out the moment you open it.
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0 8px' }}>
                      <Rule />
                      <span style={{ fontSize: 11, color: 'var(--gw-muted)' }}>or</span>
                      <Rule />
                    </div>
                    <button
                      onClick={continueWithGoogle}
                      style={{ width: '100%', padding: '11px 16px', borderRadius: 8, background: 'white', color: 'var(--gw-text)', fontSize: 14, fontWeight: 700, border: '1px solid var(--gw-border)', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      Continue with Google
                    </button>
                    <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', lineHeight: 1.5, textAlign: 'center', paddingTop: 8 }}>
                      No confirmation email needed - your check-in is created as soon as you come back.
                    </div>
                  </>
                )}
                {/* The only way out of a full-screen save card, and a keyboard user inside it could not dismiss it. */}
                <button type="button" onClick={() => setShowSave(false)} style={{ display: 'block', margin: '0 auto', background: 'none', border: 'none', fontFamily: 'inherit', textAlign: 'center', fontSize: 12, color: 'var(--gw-muted)', cursor: 'pointer', paddingTop: 10 }}>
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
                style={{ position: 'sticky', top: 8, zIndex: 5, background: 'var(--gw-green-bg)', border: '1px solid var(--gw-green-b-soft)', borderRadius: 10, padding: '14px 16px', marginBottom: 20, boxShadow: '0 2px 10px rgba(0,0,0,.06)' }}
              >
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-green-t)', marginBottom: 4 }}>Check your email</div>
                <div style={{ fontSize: 13, color: 'var(--gw-green-t)', lineHeight: 1.6 }}>We sent a link to <strong>{email}</strong>. Click it to finish setting up and get your invite link.</div>
                {inviteAdded.length > 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--gw-green-t)', lineHeight: 1.6, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--gw-green-b-soft)' }}>
                    <strong>Waiting to send ({inviteAdded.length}):</strong> {inviteAdded.map(e => e.split(' - ')[0]).join(', ')}. Invites go out when you confirm your email.
                  </div>
                ) : (
                  /* Saying nothing here read as "you have left something
                     undone". Nobody added is a perfectly good place to stop. */
                  <div style={{ fontSize: 12, color: 'var(--gw-green-t)', lineHeight: 1.6, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--gw-green-b-soft)' }}>
                    No one added yet. You can invite people whenever you're ready.
                  </div>
                )}
              </div>
            )}

            {/* Admin setup - only shown after email sent */}
            {emailSent && (
            <div>
            <div style={{ borderTop: '1px solid var(--gw-border)', marginBottom: 18 }} />

            {/* Ground + org naming */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-sub)', marginBottom: 6 }}>Name this situation</div>
              <input
                type="text" placeholder="e.g. Kwame, first 90 days" value={groundName}
                onChange={e => setGroundName(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--gw-border)', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', marginBottom: 8 }}
              />
              {/* Asked one step earlier now, where both the email and Google paths pass. */}

              <FieldLabel>
                How often does everyone check in?
                {!cadenceChosen && (
                  <span style={{ fontWeight: 500, color: '#8A7B66' }}> Not set yet - this will run every 2 weeks unless you pick.</span>
                )}
              </FieldLabel>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                {(['ONE_TIME', 'DAILY', 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'SEQUENTIAL'] as const).map(c => {
                  const labels: Record<string, string> = { ONE_TIME: 'One time', DAILY: 'Daily', WEEKLY: 'Weekly', FORTNIGHTLY: 'Every 2 weeks', MONTHLY: 'Monthly', SEQUENTIAL: 'When I check in' }
                  return (
                  <button key={c} onClick={() => { setCadence(c); setCadenceChosen(true) }} style={{
                    flex: '1 0 30%', padding: '9px 4px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    border: `1px solid ${cadenceChosen && cadence === c ? 'var(--gw-navy)' : 'var(--gw-border)'}`,
                    background: cadenceChosen && cadence === c ? 'var(--gw-blue-bg)' : 'white',
                    color: cadenceChosen && cadence === c ? 'var(--gw-navy)' : 'var(--gw-sub)',
                  }}>
                    {labels[c]}
                  </button>
                )})}
              </div>
              {/* Weekday anchor for weekly-style cadences ("every Monday") */}
              {(cadence === 'WEEKLY' || cadence === 'FORTNIGHTLY') && (
                <div style={{ marginBottom: 8 }}>
                  <FieldLabel>On which day? (optional)</FieldLabel>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => (
                      <button key={d} onClick={() => setCadenceAnchorDay(cadenceAnchorDay === i ? null : i)} style={{
                        flex: 1, padding: '6px 0', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                        border: `1px solid ${cadenceAnchorDay === i ? 'var(--gw-navy)' : 'var(--gw-border)'}`,
                        background: cadenceAnchorDay === i ? 'var(--gw-blue-bg)' : 'white', color: cadenceAnchorDay === i ? 'var(--gw-navy)' : 'var(--gw-muted)',
                      }}>{d}</button>
                    ))}
                  </div>
                </div>
              )}
              {/*
                WHICH DAYS THIS TEAM WORKS.

                A daily cadence was +1 day flat, so it landed on Saturdays and Sundays, and daily is
                the one rhythm with no day picker - so "weekdays only" could not be said at all.
                Offered for every rhythm rather than only daily, because a fortnightly anchor lands
                on a weekend too, just more quietly.

                Nothing is pre-selected. Monday to Friday is one region's office week, not a fact
                about anybody's: field teams work Saturdays and the week starts on Sunday across
                much of where this is used.
              */}
              {cadence !== 'ONE_TIME' && (
                <div style={{ marginBottom: 8 }}>
                  <FieldLabel>Which days does this team work? (optional)</FieldLabel>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                    {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => {
                      const on = workingDays.includes(i)
                      return (
                        <button key={d} type="button"
                          onClick={() => setWorkingDays(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i].sort((a, b) => a - b))}
                          style={{
                            flex: 1, padding: '6px 0', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                            border: `1px solid ${on ? 'var(--gw-navy)' : 'var(--gw-border)'}`,
                            background: on ? 'var(--gw-blue-bg)' : 'white', color: on ? 'var(--gw-navy)' : 'var(--gw-muted)',
                          }}>{d}</button>
                      )
                    })}
                  </div>
                  <button type="button" onClick={() => setWorkingDays(workingDays.length === 5 && WEEKDAYS.every(d => workingDays.includes(d)) ? [] : [...WEEKDAYS])}
                    style={{ background: 'none', border: 'none', color: 'var(--gw-navy)', cursor: 'pointer', fontSize: 11.5, padding: 0, fontFamily: 'inherit' }}>
                    {workingDays.length === 5 && WEEKDAYS.every(d => workingDays.includes(d)) ? 'Clear — any day is fine' : 'Weekdays only, skip weekends'}
                  </button>
                </div>
              )}

              {/* Day-of-month anchor for monthly ("on the 1st") */}
              {cadence === 'MONTHLY' && (
                <div style={{ marginBottom: 8 }}>
                  <FieldLabel>On which day of the month? (optional)</FieldLabel>
                  <select value={cadenceAnchorDay ?? ''} onChange={e => setCadenceAnchorDay(e.target.value ? Number(e.target.value) : null)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--gw-border)', fontSize: 13, fontFamily: 'inherit', background: 'white', color: cadenceAnchorDay != null ? 'var(--gw-text)' : 'var(--gw-muted)' }}>
                    <option value="">No fixed day (every ~30 days)</option>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>{day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of the month</option>
                    ))}
                  </select>
                </div>
              )}
              <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginBottom: 10, lineHeight: 1.5 }}>
                {cadence === 'ONE_TIME' ? 'Single session · one answer per person, no follow-up cadence.' :
                 cadence === 'DAILY' ? 'Daily · a fresh check-in opens each day.' :
                 cadence === 'WEEKLY' ? `Weekly${cadenceAnchorDay != null ? ` · every ${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][cadenceAnchorDay]}` : ''} · typical resolution in 4-6 weeks.` :
                 cadence === 'MONTHLY' ? `Monthly${cadenceAnchorDay != null ? ` · on the ${cadenceAnchorDay}${cadenceAnchorDay === 1 ? 'st' : cadenceAnchorDay === 2 ? 'nd' : cadenceAnchorDay === 3 ? 'rd' : 'th'}` : ''} · typical resolution in 3-4 months.` :
                 cadence === 'SEQUENTIAL' ? 'No fixed schedule · when you check in, your team gets their next check-in. Good for cascading updates to a group (e.g. field officers).' :
                 `Every 2 weeks${cadenceAnchorDay != null ? ` · on ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][cadenceAnchorDay]}` : ''} · typical resolution in 6-8 weeks.`}
              </div>
              {cadence === 'ONE_TIME' ? (
                <>
                  <FieldLabel>Complete by</FieldLabel>
                  <input
                    type="date" value={checkInBy}
                    onChange={e => setCheckInBy(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${emailError && !checkInBy ? 'var(--gw-danger)' : 'var(--gw-border)'}`, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', color: checkInBy ? 'var(--gw-text)' : 'var(--gw-muted)' }}
                  />
                </>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <FieldLabel>Start date <span style={{ fontWeight: 400 }}>(first check-in)</span></FieldLabel>
                    <input
                      type="date" value={checkInBy}
                      onChange={e => setCheckInBy(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${emailError && !checkInBy ? 'var(--gw-danger)' : 'var(--gw-border)'}`, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', color: checkInBy ? 'var(--gw-text)' : 'var(--gw-muted)' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <FieldLabel>End date <span style={{ fontWeight: 400 }}>(last check-in, optional)</span></FieldLabel>
                    <input
                      type="date" value={lastCheckInBy}
                      onChange={e => setLastCheckInBy(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--gw-border)', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', color: lastCheckInBy ? 'var(--gw-text)' : 'var(--gw-muted)' }}
                    />
                  </div>
                </div>
              )}
              {emailError && !checkInBy && emailError.toLowerCase().includes('date') && (
                <div style={{ fontSize: 11.5, color: 'var(--gw-danger)', marginTop: 6, fontWeight: 600 }}>Pick a date above so we know when to expect the first check-in.</div>
              )}

              {/*
                WHAT THE FOUR FIELDS ACTUALLY PRODUCE.

                A rhythm, a day of the week, a start date and a set of working days are four
                controls nobody can compose in their head, and the only way to find out what they
                produced was to wait for the first check-in to open on the wrong day. It says
                "would" rather than "will" because nothing is scheduled until the check-in exists.
              */}
              {(() => {
                const dates = whenTheCheckInsLand({
                  cadence: cadence as CadenceName,
                  anchorDay: cadenceAnchorDay,
                  startsAt: checkInBy ? new Date(`${checkInBy}T00:00:00`) : null,
                  workingDays,
                  howMany: cadence === 'DAILY' ? 5 : 4,
                })
                return (
                  <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--gw-bg)', border: '1px solid var(--gw-border)', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gw-muted)', marginBottom: 5 }}>
                      {dates.length > 1 ? 'Check-ins would open on' : 'The check-in would open on'}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--gw-text)', lineHeight: 1.6 }}>
                      {dates.map(sayTheDate).join(' · ')}{dates.length > 1 ? ' · and on from there' : ''}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--gw-sub)', marginTop: 6, lineHeight: 1.5 }}>
                      {whatIsSetAndWhatIsNot({
                        name: groundName,
                        cadenceChosen,
                        startsAt: checkInBy ? new Date(`${checkInBy}T00:00:00`) : null,
                        workingDays,
                        peopleAdded: inviteAdded.length,
                      })}
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* Invite contributors - before create account */}
            {(() => {
              const s = onboardingSelections.classifiedScenario || onboardingSelections.mode || scenario || pickedSituation || ''
              // Matches scenario keys AND card labels (pickedSituation stores the
              // label). New reframed labels first; the old labels stay so a
              // session saved before the reframe still restores correctly.
              const isSensitive = [
                'PIP', 'DRIFT', 'REALIGN_TEAM',
                "Someone's work is off track", 'Running a performance improvement plan', 'Co-founder or partner disagreement', 'A project is off track', 'You and a team member see it differently',
                'Running a PIP', 'Team member not delivering', 'Cofounder or partner dispute',
              ].some(k => s.includes(k))
              const inviteHeading = isSensitive ? 'Let them share their side' : 'Invite people'
              const inviteSubtext = isSensitive
                ? 'Send them a link so they can give their own version of the same work. When both sides are in, the report shows where you agree and where the conversation still needs to happen. It does not score anyone.'
                : 'Each person gives their own version of the shared work, including their own part in it. When everyone has answered, the report shows where people agree, where they differ, and what the gap means for the work.'
              return (
            <div style={{ borderBottom: '1px solid var(--gw-border)', marginBottom: 16, paddingBottom: 16 }}>
              <FieldLabel>{inviteHeading}</FieldLabel>
              <div style={{ fontSize: 12, color: 'var(--gw-muted)', lineHeight: 1.55, marginBottom: 10 }}>
                {inviteSubtext}
              </div>
              <div style={{ fontSize: 12, color: 'var(--gw-navy)', background: 'var(--gw-blue-bg)', border: '1px solid var(--gw-blue-b)', borderRadius: 8, padding: '8px 11px', lineHeight: 1.5, marginBottom: 10 }}>
                Add them here now. Anyone you added from the report above is already on this list. Invites don't go out yet - they're sent once you save this check-in and confirm your email.
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
                  */}
                How many people you can add depends on your plan, not on the check-in.
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
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.55, marginBottom: 10 }}>
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
                  <div style={{ background: 'var(--gw-amber-bg)', border: '1px solid var(--gw-amber-b-soft)', borderRadius: 8, padding: '10px 12px', marginBottom: 12, fontSize: 12, color: 'var(--gw-amber-t)', lineHeight: 1.55 }}>
                    {notice}
                  </div>
                ) : null
              })()}

              {inviteAdded.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                  {inviteAdded.map(e => (
                    <div key={e} style={{ fontSize: 12, color: 'var(--gw-green-t)', background: 'var(--gw-green-bg)', borderRadius: 6, padding: '5px 10px' }}>✓ {e}</div>
                  ))}
                </div>
              )}

              {/* Colleagues, picked the way a group chat picks them: search, tick, one button. Each goes on the list without a note; notes can be added on Setup. */}
              {!inviteContextFor && !bulkInviteMode && (
                <PeoplePicker
                  people={colleagues.filter((c) => c.email !== user?.email)}
                  alreadyIn={inviteAdded.map((e) => e.split(' - ')[0])}
                  onAdd={(picked) => {
                    for (const c of picked) queueColleague(c)
                    toast.success(picked.length === 1 ? `${picked[0].name ?? picked[0].email} is on the list.` : `${picked.length} people are on the list. Invites go out when you save.`)
                  }}
                />
              )}

              {inviteContextFor ? (
                <div style={{ background: 'var(--gw-paper-2)', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-text)' }}>{inviteContextFor}</div>
                    {bulkQueue.length > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--gw-muted)' }}>{bulkQueue.length} more after this</div>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 8, lineHeight: 1.5 }}>What do you want them to focus on or cover?</div>
                  <textarea autoFocus placeholder="e.g. They are the other side of this. They own the delivery timeline."
                    value={inviteContext} onChange={e => setInviteContext(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitInviteContext() } }}
                    style={{ width: '100%', resize: 'none', minHeight: 60, padding: '8px 10px', fontSize: 13, lineHeight: 1.5, border: '1px solid var(--gw-border)', borderRadius: 7, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 8 }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => {
                      // Add without context, then advance queue
                      const newAdded = inviteAdded.includes(inviteContextFor) ? inviteAdded : [...inviteAdded, inviteContextFor]
                      setInviteAdded(newAdded)
                      setInviteContext('')
                      const [next, ...rest] = bulkQueue
                      if (next) { setBulkQueue(rest); setInviteContextFor(next) } else { setInviteContextFor(null) }
                    }} style={{ padding: '8px 14px', borderRadius: 7, background: 'none', border: '1px solid var(--gw-border)', color: 'var(--gw-sub)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Skip</button>
                    <button onClick={submitInviteContext} style={{ flex: 1, padding: '8px 14px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Add person</button>
                  </div>
                </div>
              ) : bulkInviteMode ? (
                <div>
                  <textarea
                    autoFocus
                    placeholder="Paste emails separated by commas or line breaks&#10;e.g. alice@co.com, bob@co.com"
                    value={bulkInviteText}
                    onChange={e => setBulkInviteText(e.target.value)}
                    style={{ width: '100%', resize: 'none', minHeight: 80, padding: '10px 12px', fontSize: 13, lineHeight: 1.5, border: '1px solid var(--gw-border)', borderRadius: 8, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 8 }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => { setBulkInviteMode(false); setBulkInviteText('') }} style={{ padding: '9px 14px', borderRadius: 7, background: 'none', border: '1px solid var(--gw-border)', color: 'var(--gw-sub)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                    <button
                      onClick={() => {
                        const emails = bulkInviteText
                          .split(/[\n,]+/)
                          .map(e => e.trim().toLowerCase())
                          /* Not validation: this filters model-extracted mentions down to the ones that are addresses at all. Kept as is. */
                          .filter(e => e.includes('@') && !inviteAdded.some(a => a.startsWith(e)))
                        if (emails.length === 0) return
                        setBulkInviteText('')
                        setBulkInviteMode(false)
                        // Queue all emails through the per-contributor context prompt
                        const [first, ...rest] = emails
                        setBulkQueue(rest)
                        setInviteContextFor(first)
                        setInviteContext('')
                      }}
                      style={{ flex: 1, padding: '9px 14px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      Add all
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input type="email" placeholder="name@company.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addInviteEmail()}
                      style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--gw-border)', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
                    />
                    <button onClick={addInviteEmail} style={{ flexShrink: 0, padding: '10px 16px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Add</button>
                  </div>
                  <button
                    onClick={() => setBulkInviteMode(true)}
                    style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--gw-navy)', cursor: 'pointer', fontFamily: 'inherit', padding: 0, textDecoration: 'underline', marginBottom: 10 }}
                  >
                    Paste multiple emails
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, fontSize: 12, color: 'var(--gw-navy)', background: 'var(--gw-blue-bg)', border: '1px solid var(--gw-blue-b)', borderRadius: 7, padding: '8px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {window.location.origin}/invite?token={inviteToken}
                    </div>
                    <button onClick={copyInviteLink} style={{ flexShrink: 0, padding: '8px 12px', borderRadius: 7, background: 'var(--gw-paper-2)', color: 'var(--gw-text)', fontSize: 12, fontWeight: 600, border: '1px solid var(--gw-border)', cursor: 'pointer', fontFamily: 'inherit' }}>
                      {copiedLink ? 'Copied!' : 'Copy link'}
                    </button>
                  </div>
                  <input type="text" placeholder="Add a note to send with your link (optional)" value={inviteNote} onChange={e => setInviteNote(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--gw-border)', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', marginTop: 8 }}
                  />
                </>
              )}
            </div>
              )
            })()}

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
              <div style={{ textAlign: 'center', paddingTop: 8 }}>
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
                <button
                  onClick={() => { if (inviteContextFor) submitInviteContext(); setShowSave(false) }}
                  style={{ padding: '11px 28px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Done
                </button>
                {/*
                  W7. "DONE" CLOSED THE PANEL AND SAID NOTHING ABOUT THE EMAIL.
                  She pressed it and was left on the report with no sign that
                  anything had been sent, on a flow whose whole next step happens
                  in her inbox. The panel closing is the only feedback there was,
                  and a panel closing is what "Cancel" looks like.
                */}
                <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', paddingTop: 8, lineHeight: 1.6 }}>
                  {/*
                    Counts the person still sitting in the note box, because "Done"
                    now commits them. Reading inviteAdded alone made this sentence
                    quietly wrong by one: it promised to send 1 invite while two
                    people had been named.
                  */}
                  Nothing else to do here. The link is in your inbox at <strong>{email}</strong>{(() => {
                    const pending = inviteContextFor && !inviteAdded.some(e => e === inviteContextFor || e.startsWith(`${inviteContextFor} - `)) ? 1 : 0
                    const n = inviteAdded.length + pending
                    return n > 0 ? ` - opening it saves your check-in and sends the ${n} invite${n === 1 ? '' : 's'}` : ' - opening it saves your check-in'
                  })()}. You can reopen this any time from the bar below.
                </div>
              </div>
            ) : closed ? null : (
              <button type="button" onClick={() => setShowSave(false)} style={{ display: 'block', margin: '0 auto', background: 'none', border: 'none', fontFamily: 'inherit', textAlign: 'center', fontSize: 12, color: 'var(--gw-muted)', cursor: 'pointer', paddingTop: 4 }}>
                Later
              </button>
            )}
          </div>
        </div>
      </div>

      {/* New scenario conflict modal */}
      {showNewScenarioConflict && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,22,40,0.55)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 24, maxWidth: 380, width: '100%' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--gw-dark)', marginBottom: 8 }}>You have a check-in in progress</div>
            <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.65, marginBottom: 18 }}>
              Starting a new one clears the one you were setting up, and nothing you said in it is kept. Keep it to carry on where you left off.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => {
                  setShowNewScenarioConflict(false); setPendingNewScenario(null)
                  /* Came from the rail with a saved setup: keeping it means restoring it, which the plain address does. */
                  if (wantsANewOne) navigate('/start', { replace: true })
                }}
                style={{ flex: 1, padding: '10px', borderRadius: 8, background: 'var(--gw-paper-2)', color: 'var(--gw-sub)', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Keep current session
              </button>
              <button
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
                style={{ flex: 1, padding: '10px', borderRadius: 8, background: 'var(--gw-dark)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Start new scenario
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End session confirmation modal */}
      {showEndConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,22,40,0.55)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 24, maxWidth: 380, width: '100%' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--gw-dark)', marginBottom: 8 }}>End this session?</div>
            <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.65, marginBottom: 8 }}>
              Your answers are saved on this device. Ending this session generates your report, and this session's answers then lock.
            </div>
            <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.65, marginBottom: 18 }}>
              Once you save your record below, you can revisit and correct it any time from your report. The shared report releases once all parties have checked in.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowEndConfirm(false)}
                style={{ flex: 1, padding: '10px', borderRadius: 8, background: 'var(--gw-paper-2)', color: 'var(--gw-sub)', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Keep going
              </button>
              <button
                onClick={() => { setShowEndConfirm(false); handleEndSession() }}
                style={{ flex: 1, padding: '10px', borderRadius: 8, background: 'var(--gw-dark)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                End session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
