import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { entryApi } from '@/api/entry'
import { authApi } from '@/api/auth'
import { useEntryStore } from '@/stores/entry'
import { useAuthStore } from '@/stores/auth'
import { VennIcon } from '@/components/gw/VennIcon'
import { toast } from 'sonner'

const STORAGE_KEY = 'gw_entry_session'

interface Turn { role: 'user' | 'assistant'; content: string }
interface EntrySession {
  scenario: string
  history: Turn[]
  closed: boolean
  report?: string
  email?: string
  onboardingStep?: number
  onboardingSelections?: OnboardingSelections
}

interface OnboardingSelections {
  mode: string
  initial: string
  whoInvolved?: string
  goals?: string[]
  checkinTiming?: string
  timeframe?: string
  cadence?: string
  decision?: string
  brief?: string
  classifiedScenario?: string
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

/** After a reload, the coordinator/lead path (closed, empty history) lands
 * back on the open save card - the only place it can go. */
export function leadReturnsToSaveCard(saved: { closed?: boolean; flowPath?: string }): boolean {
  return saved.flowPath === 'lead' && !!saved.closed
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
export const ONBOARD_READY_CLOSER =
  'Thank you. That gives me what I need to set this up for you.'
// The reply to actually display: when the endpoint signals ready but the reply
// still asks a question, show the clean closer instead so no question is
// stranded. Otherwise show the reply verbatim.
export function onboardDisplayReply(reply: string, ready: boolean): string {
  return ready && replyHasQuestion(reply) ? ONBOARD_READY_CLOSER : reply
}

// --- Anonymous correction (ISSUE-17 safe) -----------------------------------
// A non-logged-in user can correct the report's read of their situation. The
// correction is ONE user-authored turn appended to the in-session transcript;
// the report then REGENERATES from the corrected transcript via the same
// stateless /entry/report path. Report fields are never patched directly - a
// report the transcript does not support is exactly the dishonesty the product
// exists to prevent. Nothing touches the server's state: the corrected
// transcript lives in React state + localStorage until the user commits with an
// email. Corrections accumulate (each stays in the transcript), and if the user
// later commits, the corrected account is what gets persisted.
export const CORRECTION_PREFIX = 'Correction from me:'

export function buildCorrectionTurn(text: string): { role: 'user'; content: string } {
  return {
    role: 'user',
    content: `${CORRECTION_PREFIX} ${text.trim()}. This is the accurate account - please update your read of my situation to reflect it.`,
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
export function composeLeadBrief(sels: { initial?: string; whoInvolved?: string; decision?: string; goals?: string[]; brief?: string }): string {
  return [
    sels.initial ? `What this ground is for: ${sels.initial}` : '',
    sels.whoInvolved ? `Who is part of this: ${sels.whoInvolved}` : '',
    sels.decision ? `Why now: ${sels.decision}` : '',
    sels.goals?.length ? `Goals: ${sels.goals.join(', ')}` : '',
    sels.brief ? `Focus: ${sels.brief}` : '',
  ].filter(Boolean).join('. ')
}

// Display labels for the alignmentStatus ladder. DISPLAY ONLY - the underlying
// data values ('Unresolved'...'Aligned') are the AI report schema's enum and are
// what the report JSON carries; they must never change. Only what the person
// SEES is reframed here.
export const STATUS_DISPLAY: Record<'Unresolved' | 'Mixed' | 'Emerging' | 'Clear' | 'Aligned', string> = {
  Unresolved: 'Just started',
  Mixed: 'Taking shape',
  Emerging: 'Getting there',
  Clear: 'Clear',
  Aligned: 'Shared',
}


// Recognizer sub-examples ("e.g. ...") sit under each card's description so
// people can self-select from concrete situations, not abstract labels.
//
// CRITICAL: the `message` field is what actually routes (it is sent to the AI
// and drives classification) - labels and details are DISPLAY ONLY and can be
// reframed freely; message fields must never change as part of a copy pass.
// Pinned verbatim by entry-cards-routing.spec.ts.
export const SITUATION_CARDS = [
  {
    group: 'positive',
    label: 'New hire starting',
    detail: 'Get you and a new hire meaning the same thing by "doing well", before anything drifts.',
    message: 'I have a new hire starting and want to make sure we set clear expectations from the beginning.',
    examples: [
      'Someone starts Monday and you want to be sure you both mean the same thing by "doing well."',
      'A new joiner and their manager each writing what success looks like in the first 90 days.',
    ],
  },
  {
    group: 'positive',
    label: 'New project',
    detail: 'Line everyone up on goals, roles, and what "done" means before the work starts.',
    message: 'We are starting a new project and I want to get the team aligned on goals and roles from the beginning.',
    examples: [
      'Kicking off a build and you want scope and "done" agreed before anyone starts.',
      'A cross-team project where each team quietly assumes a different owner.',
    ],
  },
  {
    group: 'positive',
    label: 'A new way of working together',
    detail: 'Someone new is in the picture: a partner, a manager, a changed team. Say what each of you expects before those assumptions harden.',
    message: 'We have a new working arrangement starting and want to make sure we are set up well.',
    examples: [
      'A new equal partner joining and you want the assumptions said out loud first.',
      'An interim leader stepping into an existing team and scope needs pinning down.',
    ],
  },
  {
    group: 'positive',
    label: 'Setting shared goals',
    detail: "A team agreeing on what matters most this period, so effort doesn't spread in different directions.",
    message: 'We are setting shared goals for this period and I want everyone aligned on what matters most.',
    examples: [
      'A team agreeing on the two or three priorities that matter most before the quarter starts.',
      'Several people who each quietly think something different is the top priority right now.',
    ],
  },
  {
    group: 'positive',
    label: 'A big decision',
    detail: "A group making a real choice, each person's honest read before you commit.",
    message: 'We are making a big decision and I want each person\'s honest read before we commit.',
    examples: [
      'A hiring, budget, or direction call where you want each person\'s real view before the room converges.',
      'A choice everyone will nod along to in the meeting - you want the honest reads first.',
    ],
  },
  {
    group: 'negative',
    label: "Someone's work is off track",
    detail: 'Deadlines or expectations are slipping, and you want the exact gap named before the conversation.',
    message: 'A team member is not delivering and I need to address it. I want to make sure I have the full picture before we talk.',
    examples: [
      'A senior hire is not delivering what they were brought in to do.',
      'Deadlines keep slipping and you want the specific gap named before the conversation.',
      'You are putting someone on a formal improvement plan and want both sides on the concern and what good looks like.',
    ],
  },
  {
    group: 'negative',
    label: 'A project is off track',
    detail: "What was agreed and what exists no longer match. Get each person's honest read before the group talks.",
    message: 'A project of mine has drifted from what we originally agreed and I want to realign the team on where things actually stand.',
    examples: [
      'A project blew up or is badly behind and everyone has a different story about why.',
      'What was agreed and what exists no longer match, and you want the gap named.',
    ],
  },
  {
    group: 'negative',
    label: 'You and someone see it differently',
    detail: 'Close the gap before it grows. Each of you gives your honest read first.',
    message: 'I need to realign with a team member. I think we see the current situation differently and want to get both our accounts on record.',
    examples: [
      'Priorities shifted and you two are working off different ideas of what matters now.',
      'You and a co-founder or partner see contributions or direction differently and want both accounts first.',
    ],
  },
]

// Quick actions shown after the check-in starts
const QUICK_ACTIONS = [
  { label: 'Check in', msg: 'I want to keep going with my check-in.' },
  { label: 'My report', msg: 'Give me a summary of what my record shows so far.' },
  { label: 'What am I missing?', msg: 'What is missing from my record that would make it stronger?' },
  { label: 'Review my goals', msg: 'Review the goals I set at the start of this ground and tell me where I stand against each one.' },
  { label: 'Cross-reference', msg: 'Cross-reference what I have shared with what you know about how the other party sees this situation.' },
]

export function EntryChatPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const scenario = params.get('scenario') ?? ''
  const urlMode = params.get('mode') ?? ''
  const urlInitial = params.get('initial') ?? ''

  const user = useAuthStore(s => s.user)
  const { groundName, setGroundName, sessions, setSessions } = useEntryStore()
  const [renamingGround, setRenamingGround] = useState(false)
  const [renameInput, setRenameInput] = useState('')
  const [editingSessions, setEditingSessions] = useState(false)
  const [sessionsInput, setSessionsInput] = useState('1')
  const [showSessionsUpgrade, setShowSessionsUpgrade] = useState(false)
  const groundRenameRef = useRef<HTMLInputElement>(null)

  // Situation cards shown before user types first message
  const [pickedSituation, setPickedSituation] = useState<string | null>(null)
  // Once the user dismisses the natural-close banner, never re-show it
  const [endPromptDismissed, setEndPromptDismissed] = useState(false)

  // Onboarding state
  const defaultSels: OnboardingSelections = { mode: urlMode || 'new', initial: urlInitial || '' }
  const [onboardingStep, setOnboardingStep] = useState(1)
  const [onboardingSelections, setOnboardingSelections] = useState<OnboardingSelections>(defaultSels)
  const [onboardingHistory, setOnboardingHistory] = useState<Turn[]>([])
  const [onboardingReady, setOnboardingReady] = useState(false)
  const [onboardingLoading, setOnboardingLoading] = useState(false)
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

  const [showEndConfirm, setShowEndConfirm] = useState(false)

  // Save card
  const [showSave, setShowSave] = useState(false)
  // Token authorizing pre-auth updates to the server-side draft (issued at
  // entry-save). Survives reloads so post-email edits keep syncing.
  const [draftToken, setDraftToken] = useState<string | null>(() => {
    try { return localStorage.getItem('gw_draft_token') } catch { return null }
  })
  const [sessionReport, setSessionReport] = useState<import('@/api/entry').EntryReport | null>(null)
  const [generatingReport, setGeneratingReport] = useState(false)
  // Anonymous correction: inline "what did we get wrong?" box on the report.
  const [showCorrection, setShowCorrection] = useState(false)
  const [correctionText, setCorrectionText] = useState('')
  // Flow fork after onboarding: 'self' = this is my situation, I give my
  // account now (the check-in). 'lead' = I am setting this up for my team and
  // someone else runs the first check-in (the coordinator path - no check-in,
  // no report for me; the lead is invited to confirm and becomes the initiator).
  const [flowPath, setFlowPath] = useState<'self' | 'lead' | null>(null)
  const [leadName, setLeadName] = useState('')
  const [leadEmail, setLeadEmail] = useState('')
  const [leadNote, setLeadNote] = useState('')
  const [orgName, setOrgName] = useState('')
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState('')
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
  const [cadenceAnchorDay, setCadenceAnchorDay] = useState<number | null>(null) // 0=Sun..6=Sat for "every Monday"
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

  // Seed ground name
  useEffect(() => {
    const defaultName = scenario ? scenario.replace(/\+/g, ' ') : ''
    setGroundName(defaultName)
    setSessions(1)
  }, [])

  // Load or start session
  useEffect(() => {
    const saved = loadSession()
    const branch = saved ? entryRestoreBranch(saved, scenario) : 'fresh'
    // Closed-but-unsaved sessions MUST restore too: they hold the report and
    // the locked transcript. Excluding them made the fallback below DELETE an
    // ended session on reload, right when it is most valuable.
    if (saved && branch === 'restore') {
      // Restore existing session
      setHistory(saved.history)
      if (saved.report) { try { setSessionReport(JSON.parse(saved.report)) } catch { /* legacy plain text - discard */ } }
      // Coordinator/lead path survives reload: restore the fork + lead details.
      if ((saved as any).flowPath === 'lead') {
        setFlowPath('lead')
        const l = (saved as any).lead
        if (l) { setLeadEmail(l.email ?? ''); setLeadName(l.name ?? ''); setLeadNote(l.contextNote ?? '') }
      }
      if (saved.email) setEmail(saved.email)
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
        // coordinator lands back where they left off.
        if (leadReturnsToSaveCard(saved as any)) setShowSave(true)
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
      if (urlInitial || scenario) {
        const sels: OnboardingSelections = { mode: urlMode || 'new', initial: urlInitial || scenario || '' }
        setOnboardingSelections(sels)
        persistOnboarding([], sels, 1)
      }
    }
  }, [])

  function persistOnboarding(h: Turn[], sels: OnboardingSelections, step: number, obHistory?: Turn[], obReady?: boolean) {
    saveSession({ scenario, history: h, closed: false, onboardingStep: step, onboardingSelections: sels, ...(obHistory !== undefined ? { onboardingHistory: obHistory, onboardingReady: obReady ?? false } : {}) } as any)
  }

  function persistCheckin(h: Turn[], cl = false, rep = '') {
    saveSession({ scenario, history: h, closed: cl, report: rep, onboardingStep: ONBOARDING_STEPS, onboardingSelections })
  }

  // Typewriter streaming effect for check-in phase
  useEffect(() => {
    if (phase !== 'checkin') return
    const lastIdx = history.length - 1
    const last = history[lastIdx]
    if (!last || last.role !== 'assistant' || last.content === '…') {
      setDisplayedHistory(history)
      setStreamingIdx(null)
      return
    }
    if (displayedHistory[lastIdx]?.content === last.content) return

    setStreamingIdx(lastIdx)
    let i = 0
    const full = last.content
    const CHUNK = 2
    const DELAY = 25
    const base = history.slice(0, lastIdx)
    const tick = setInterval(() => {
      i += CHUNK
      setDisplayedHistory([...base, { role: 'assistant', content: full.slice(0, i) }])
      if (i >= full.length) {
        clearInterval(tick)
        setDisplayedHistory(history)
        setStreamingIdx(null)
      }
    }, DELAY)
    return () => clearInterval(tick)
  }, [history, phase])

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight
  }, [displayedHistory, loading, onboardingStep, phase])

  // Start first check-in question (AI-generated) after onboarding
  const startCheckin = useMutation({
    mutationFn: () => {
      const ctx = [
        onboardingSelections.initial ? `What this ground is for: ${onboardingSelections.initial}` : '',
        onboardingSelections.whoInvolved ? `Who is part of this: ${onboardingSelections.whoInvolved}` : '',
        onboardingSelections.decision ? `What made them open this record today: ${onboardingSelections.decision}` : '',
        onboardingSelections.goals?.length ? `What they want this ground to get right: ${onboardingSelections.goals.join(', ')}` : '',
        onboardingSelections.brief ? `What to focus on or probe: ${onboardingSelections.brief}` : '',
      ].filter(Boolean).join('. ')
      return entryApi.chat([{
        role: 'user',
        content: `I have completed the onboarding. Here is my context. ${ctx}. Please ask me your first specific check-in question based on what I told you. Reference my situation and what I said I need. Do not open generically. Do not ask what my role is. Ask one direct specific question drawn from what I have shared.`,
      }], scenario || undefined, groundName || undefined)
    },
    onSuccess: (res) => {
      const transition: Turn = { role: 'assistant', content: 'Good, I have what I need. Now let me ask you about your side of this.' }
      const h: Turn[] = [transition, { role: 'assistant', content: res.reply }]
      setHistory(h)
      setDisplayedHistory(h)
      setPhase('checkin')
      persistCheckin(h)
    },
    onError: () => toast.error('Could not start check-in. Please try again.'),
  })

  const sendMut = useMutation({
    mutationFn: (msgs: Turn[]) => entryApi.chat(msgs, scenario || undefined, groundName || undefined),
    onSuccess: (res, msgs) => {
      const newTurn: Turn = { role: 'assistant', content: res.reply }
      const updated = [...msgs, newTurn]
      setHistory(updated)
      setLoading(false)
      // Consume the backend's completion signal (previously ignored: the client
      // re-derived its own phrase-match and threw res.sessionComplete away). The reply
      // phrase-match stays as a backstop for phrasings the backend's own matcher misses.
      const replyLower = res.reply.toLowerCase()
      const isNaturalClose = res.sessionComplete === true || SESSION_END_PATTERNS.some(p => replyLower.includes(p))
      if (isNaturalClose && !closed && !endPromptDismissed) {
        setShowEndPrompt(true)
      }
      persistCheckin(updated)
    },
    onError: () => {
      setLoading(false)
      setHistory(prev => prev.filter(m => m.role !== 'assistant' || m.content !== '…'))
      toast.error('Message failed. Try again.')
    },
  })

  const [reportTurnsForRetry, setReportTurnsForRetry] = useState<Turn[] | null>(null)

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

  // Anonymous correction: append ONE correction turn to the in-session
  // transcript and regenerate the report from the corrected transcript (same
  // stateless path as the original report - see the helpers near the top).
  // If regeneration fails, this degrades to the existing retry card, which
  // retries with the corrected turns, so the correction is not lost.
  function submitReportCorrection() {
    const text = correctionText.trim()
    if (!text || generatingReport) return
    const corrected = withCorrection(history, text)
    setHistory(corrected)
    setShowCorrection(false)
    setCorrectionText('')
    generateSessionReport(corrected)
  }
  const reportWasCorrected = history.some(isCorrectionTurn)

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
  function submitLeadCapture() {
    const email = leadEmail.trim()
    if (!email.includes('@')) return
    setOnboardingStep(ONBOARDING_STEPS + 1)
    setPhase('checkin')
    setClosed(true)
    setShowSave(true)
    saveSession({
      scenario, history: [], closed: true, onboardingStep: ONBOARDING_STEPS, onboardingSelections,
      flowPath: 'lead', lead: { email, name: leadName.trim() || undefined, contextNote: leadNote.trim() || undefined },
    } as any)
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
      const res = await entryApi.onboard(newHistory)
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
          ...(res.extracted.decision ? { decision: res.extracted.decision! } : {}),
          ...(res.extracted.goals ? { goals: res.extracted.goals! } : {}),
          ...(res.extracted.brief !== undefined ? { brief: res.extracted.brief! } : {}),
        }))
        // Background classify intent when we have initial
        if (res.extracted.initial) {
          entryApi.classifyIntent(res.extracted.initial, res.extracted.mode).then(r => {
            setOnboardingSelections(prev => ({ ...prev, classifiedScenario: r.scenario }))
          }).catch(() => { /* non-critical */ })
        }
      }
      setOnboardingReady(res.ready)
      persistOnboarding([], onboardingSelections, onboardingStep, updatedHistory, res.ready)
      setTimeout(() => {
        if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight
      }, 50)
    } catch {
      toast.error('Could not send message. Please try again.')
      setOnboardingHistory(onboardingHistory) // revert
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

  // Kick off the AI onboarding with the intro message on mount (if onboarding history is empty)
  useEffect(() => {
    if (phase !== 'onboarding' || onboardingHistory.length > 0) return
    const INTRO = `What brings you here? Pick the situation that fits or describe it below.`
    // If URL params pre-populate, inject as first user message
    if (urlInitial) {
      const preloadedHistory: Turn[] = [
        { role: 'assistant', content: INTRO },
        { role: 'user', content: urlInitial },
      ]
      setOnboardingHistory(preloadedHistory)
      sendOnboarding(urlInitial)
    } else {
      setOnboardingHistory([{ role: 'assistant', content: INTRO }])
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
      if (content.length > 8000) {
        toast.warning(`${file.name} is large - only the first portion will be used in this session.`)
      }
      setUploadedDoc({ name: file.name, content: content.slice(0, 8000) })
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
    const content = `[Document: "${uploadedDoc.name}"]\n${uploadedDoc.content}\n\nContext from me: ${ctx || 'See attached document.'}`
    setUploadedDoc(null)
    setDocContext('')
    setLoading(true)
    const userTurn: Turn = { role: 'user', content }
    setHistory(prev => [...prev, userTurn, { role: 'assistant', content: '…' }])
    sendMut.mutate([...history, userTurn])
  }

  async function handleSave() {
    const trimmed = email.trim()
    if (!trimmed || !trimmed.includes('@')) { setEmailError('Please enter a valid email address.'); return }
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
    const commitPayload = {
        groundLabel: groundName || scenario || 'My first ground',
        orgName: orgName.trim() || undefined,
        // Prefer the AI-classified scenario; fall back to mode key, then URL param.
        scenario: onboardingSelections.classifiedScenario || onboardingSelections.mode || scenario || undefined,
        cadence: cadence === 'ONE_TIME' ? 'FORTNIGHTLY' : cadence,
        cadenceAnchorDay: (cadence === 'WEEKLY' || cadence === 'FORTNIGHTLY' || cadence === 'MONTHLY') && cadenceAnchorDay != null ? cadenceAnchorDay : undefined,
        checkInBy: checkInBy.trim() || undefined,
        lastCheckInBy: lastCheckInBy.trim() || undefined,
        reportSummary: sessionReport ? { alignmentStatus: sessionReport.alignmentStatus, whatGroundworkSaw: sessionReport.whatGroundworkSaw } : undefined,
        inviteNote: inviteNote.trim() || undefined,
        // Each contributor gets its own token - the server generates one per participant.
        // Do NOT pass a shared inviteToken here; it would cause unique constraint failures
        // on the second contributor and silently drop them.
        contributors: inviteAdded.map(entry => {
          const dashIdx = entry.indexOf(' - ')
          if (dashIdx === -1) return { email: entry }
          return { email: entry.slice(0, dashIdx), context: entry.slice(dashIdx + 3) }
        }),
        // Coordinator/lead path: the lead runs the first check-in; the
        // onboarding context travels as the brief (there is no transcript).
        ...(flowPath === 'lead' && leadEmail.trim().includes('@')
          ? {
              lead: { email: leadEmail.trim(), name: leadName.trim() || undefined, contextNote: leadNote.trim() || undefined },
              brief: composeLeadBrief(onboardingSelections) || undefined,
            }
          : {}),
      }
      try {
      const res = await authApi.entrySave(trimmed, { payload: commitPayload, history })
      setEmailSent(true)
      if (res.draftToken) {
        setDraftToken(res.draftToken)
        try { localStorage.setItem('gw_draft_token', res.draftToken) } catch { /* */ }
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
        groundLabel: groundName || scenario || 'My first ground',
        orgName: orgName.trim() || undefined,
        cadence: cadence === 'ONE_TIME' ? 'FORTNIGHTLY' : cadence,
        cadenceAnchorDay: (cadence === 'WEEKLY' || cadence === 'FORTNIGHTLY' || cadence === 'MONTHLY') && cadenceAnchorDay != null ? cadenceAnchorDay : undefined,
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
          if (patch.checkInBy !== undefined) payload.checkInBy = patch.checkInBy
          if (patch.lastCheckInBy !== undefined) payload.lastCheckInBy = patch.lastCheckInBy
          localStorage.setItem('gw_commit_payload', JSON.stringify(payload))
        }
      } catch { /* */ }
    }, 800)
    return () => clearTimeout(t)
  }, [emailSent, draftToken, groundName, orgName, cadence, cadenceAnchorDay, checkInBy, lastCheckInBy, inviteNote, inviteAdded])

  function copyInviteLink() {
    const link = `${window.location.origin}/invite?token=${inviteToken}`
    navigator.clipboard.writeText(link).then(() => {
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    })
  }

  function addInviteEmail() {
    const e = inviteEmail.trim()
    if (!e || !e.includes('@')) return
    setInviteEmail('')
    setInviteContextFor(e)
    setInviteContext('')
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
            Your check-in is the first account on this ground. Here is what to expect.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 16px', background: 'white', borderRadius: 10, border: '1px solid var(--gw-border)' }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>⏱</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 2 }}>About 10 minutes</div>
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.55 }}>Answer in your own words. The questions are based on what you just described. There are no right answers.</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 16px', background: 'white', borderRadius: 10, border: '1px solid var(--gw-border)' }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>📨</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 2 }}>Invite links come after</div>
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.55 }}>Once you finish, you will get invite links to send to the other people involved. They check in independently.</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 16px', background: 'white', borderRadius: 10, border: '1px solid var(--gw-border)' }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>📄</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 2 }}>The shared report - not your words</div>
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.55 }}>Nobody reads what you write. When everyone is in, the report shows where all accounts agree or differ. It does not quote anyone.</div>
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
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)', position: 'relative', overflow: 'hidden' }}>

      {/* Session header */}
      <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--gw-border)', flexShrink: 0, background: 'white', display: 'flex', alignItems: 'center', gap: 8 }}>
        {user && (
          <span onClick={() => navigate('/grounds')} style={{ fontSize: 12, color: 'var(--gw-sub)', cursor: 'pointer', flexShrink: 0, userSelect: 'none' }}>← Grounds</span>
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
                  Name this ground ✎
                </button>
              )}
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--gw-sub)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            {phase === 'checkin' ? (
              <>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block', flexShrink: 0 }} />
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
              title="Edit number of sessions"
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gw-text)' }}>1/{sessions}</span>
              <span style={{ fontSize: 10, color: 'var(--gw-sub)', marginLeft: 4 }}>sessions</span>
            </button>
          )}
        </div>
      </div>

      {/* Phase stepper: makes which phase you are in legible at a glance.
          1 Describe the situation -> 2 Your check-in (or Hand-off) -> 3 Save & invite. */}
      {(() => {
        const step = phase === 'onboarding' ? (flowPath === 'lead' ? 2 : 1) : (closed || showSave ? 3 : 2)
        const labels = ['Describe the situation', flowPath === 'lead' ? 'Hand-off to your lead' : 'Your check-in', 'Save & invite']
        const hints = [
          "You're describing the situation. Nothing is saved to an account yet.",
          flowPath === 'lead' ? "You're naming the lead who runs the first check-in." : "You're giving your own account. It stays private until the report.",
          'Save your ground and invite the people involved.',
        ]
        return (
          <div style={{ padding: '7px 20px', borderBottom: '1px solid var(--gw-border)', background: '#FAFAF8', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {labels.map((l, i) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 15, height: 15, borderRadius: '50%', fontSize: 9.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: i + 1 === step ? 'var(--gw-navy)' : (i + 1 < step ? '#5DCAA5' : '#E5E2DC'), color: i + 1 <= step ? 'white' : 'var(--gw-muted)' }}>{i + 1 < step ? '✓' : i + 1}</span>
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
      {!closed && (
        <div style={{ padding: '6px 20px', borderBottom: '1px solid var(--gw-border)', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0 }}>
          {confirmClear ? (
            <span style={{ fontSize: 12, color: 'var(--gw-sub)', display: 'flex', alignItems: 'center', gap: 10 }}>
              {phase === 'checkin' ? 'This will clear your check-in. Are you sure?' : 'This will start over. Are you sure?'}
              <button onClick={handleClearSession} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: 0, fontFamily: 'inherit' }}>Yes, clear</button>
              <button onClick={() => setConfirmClear(false)} style={{ background: 'none', border: 'none', color: 'var(--gw-sub)', cursor: 'pointer', fontSize: 12, padding: 0, fontFamily: 'inherit' }}>Cancel</button>
            </span>
          ) : (
            <button
              onClick={() => phase === 'checkin' ? setConfirmClear(true) : handleClearSession()}
              style={{ background: 'none', border: 'none', color: 'var(--gw-muted)', cursor: 'pointer', fontSize: 11, padding: 0, fontFamily: 'inherit', textDecoration: 'underline' }}
            >
              {phase === 'checkin' ? 'Clear check-in' : 'Start over'}
            </button>
          )}
        </div>
      )}

      {/* Sessions upgrade prompt */}
      {showSessionsUpgrade && (
        <div style={{ background: 'var(--gw-blue-bg)', borderBottom: '1px solid var(--gw-blue-b)', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ flex: 1, fontSize: 13, color: 'var(--gw-navy)', lineHeight: 1.5 }}>
            <strong>{sessions} sessions</strong> needs an account. First session is free. Additional sessions are $5 each. Save your session below to get set up.
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
            {/* Product intro - shown once before conversation starts */}
            {onboardingHistory.length <= 1 && (
              <div style={{ background: 'var(--gw-blue-bg)', borderBottom: '1px solid var(--gw-blue-b)', padding: '12px 20px', flexShrink: 0 }}>
                <div style={{ maxWidth: 680, margin: '0 auto' }}>
                  <h1 style={{ fontSize: 15, fontWeight: 800, color: 'var(--gw-navy)', margin: '0 0 3px', letterSpacing: '-.01em' }}>Set up your Groundwork</h1>
                  <div style={{ fontSize: 13, color: 'var(--gw-navy)', lineHeight: 1.6 }}>
                    Answer a few questions about the situation. You get a private summary now; a shared report follows once the other people check in.
                  </div>
                </div>
              </div>
            )}
            <div
              ref={msgsRef}
              // The picker needs the width for a multi-column grid so all 8
              // cards sit above the fold at laptop heights; conversation
              // bubbles keep the narrow reading column.
              style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12, maxWidth: onboardingHistory.length === 1 && !pickedSituation && phase === 'onboarding' ? 1080 : 680, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}
            >
              {onboardingHistory.map((m, i) => (
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
                    whiteSpace: 'pre-wrap',
                    boxShadow: m.role === 'assistant' ? '0 1px 3px rgba(0,0,0,.06)' : 'none',
                  }}
                >
                  {m.content}
                </div>
              ))}

              {/* Situation cards - shown only before user has sent first message */}
              {onboardingHistory.length === 1 && !onboardingLoading && !pickedSituation && (
                <div style={{ alignSelf: 'flex-start', width: '100%' }}>
                  <div style={{ fontSize: 11, color: 'var(--gw-sub)', marginBottom: 5, fontWeight: 500 }}>Starting something</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(235px, 1fr))', gap: 6, marginBottom: 10 }}>
                    {SITUATION_CARDS.filter(c => c.group === 'positive').map(card => (
                      <button
                        key={card.label}
                        onClick={() => { setPickedSituation(card.label); sendOnboarding(card.message) }}
                        style={{
                          textAlign: 'left', padding: '8px 11px', borderRadius: 10,
                          border: '1px solid var(--gw-border)', background: 'white',
                          cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--gw-text)', marginBottom: 1 }}>{card.label}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--gw-sub)', lineHeight: 1.4 }}>{card.detail}</div>
                        {card.examples && card.examples.length > 0 && (
                          <div style={{ marginTop: 3 }}>
                            {card.examples.map((ex, i) => (
                              // one visual line per recognizer keeps every card
                              // above the fold; the full text stays in title
                              <div key={i} title={`e.g. ${ex}`} style={{ fontSize: 10.5, color: 'var(--gw-muted)', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>e.g. {ex}</div>
                            ))}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--gw-sub)', marginBottom: 5, fontWeight: 500 }}>When something needs addressing</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(235px, 1fr))', gap: 6 }}>
                    {SITUATION_CARDS.filter(c => c.group === 'negative').map(card => (
                      <button
                        key={card.label}
                        onClick={() => { setPickedSituation(card.label); sendOnboarding(card.message) }}
                        style={{
                          textAlign: 'left', padding: '8px 11px', borderRadius: 10,
                          border: '1px solid var(--gw-border)', background: 'white',
                          cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--gw-text)', marginBottom: 1 }}>{card.label}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--gw-sub)', lineHeight: 1.4 }}>{card.detail}</div>
                        {card.examples && card.examples.length > 0 && (
                          <div style={{ marginTop: 3 }}>
                            {card.examples.map((ex, i) => (
                              // one visual line per recognizer keeps every card
                              // above the fold; the full text stays in title
                              <div key={i} title={`e.g. ${ex}`} style={{ fontSize: 10.5, color: 'var(--gw-muted)', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>e.g. {ex}</div>
                            ))}
                          </div>
                        )}
                      </button>
                    ))}
                    {/* The describe-your-own option lives IN the grid: it
                        fills the empty last-row slot and keeps the whole
                        picker above the fold at laptop heights (suite L). */}
                    <button
                      onClick={() => setPickedSituation('other')}
                      style={{
                        textAlign: 'left', padding: '8px 11px', borderRadius: 10,
                        border: '1px dashed var(--gw-border)', background: 'transparent',
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--gw-sub)', marginBottom: 1 }}>My situation is different - I will describe it</div>
                      <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', lineHeight: 1.4 }}>Tell it in your own words and we set up from there.</div>
                    </button>
                  </div>
                </div>
              )}

              {onboardingLoading && (
                <div className="gw-msg-loading" style={{
                  maxWidth: '82%', alignSelf: 'flex-start', background: 'white', color: 'var(--gw-text)',
                  border: '1px solid var(--gw-border)', borderRadius: '4px 16px 16px 16px',
                  padding: '10px 14px', fontSize: 14, lineHeight: 1.65,
                  boxShadow: '0 1px 3px rgba(0,0,0,.06)',
                }}>
                  <span style={{ marginRight: 6, fontStyle: 'normal', color: 'var(--gw-muted)', fontSize: 11 }}>Thinking</span>
                  <span className="gw-dot" /><span className="gw-dot" /><span className="gw-dot" />
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
                    How do you want to run this?
                  </div>
                  <button
                    onClick={startSelfPath}
                    style={{
                      padding: '11px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                      border: '1px solid var(--gw-border)', background: 'white',
                      color: 'var(--gw-text)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                    }}
                  >
                    This is my situation - I'll give my account now
                  </button>
                  <button
                    onClick={() => setFlowPath('lead')}
                    style={{
                      padding: '11px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                      border: '1px solid var(--gw-border)', background: 'white',
                      color: 'var(--gw-text)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                    }}
                  >
                    I'm setting this up for my team - someone else will run it
                  </button>
                </div>
              )}

              {/* Lead capture (coordinator path): who runs the first check-in. */}
              {onboardingReady && !onboardingLoading && flowPath === 'lead' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: '82%', alignSelf: 'flex-start', marginTop: 4 }}>
                  <div style={{
                    background: 'white', color: 'var(--gw-text)', border: '1px solid var(--gw-border)',
                    borderRadius: '4px 16px 16px 16px', padding: '12px 14px', fontSize: 14, lineHeight: 1.65,
                    boxShadow: '0 1px 3px rgba(0,0,0,.06)',
                  }}>
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>Who runs the first check-in?</div>
                    <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.55, marginBottom: 10 }}>
                      They'll be invited to confirm the ground and give the first account. You'll see the ground as its coordinator.
                    </div>
                    <input
                      type="text" placeholder="Their name (optional)" value={leadName}
                      onChange={e => setLeadName(e.target.value)}
                      style={{ width: '100%', padding: '9px 11px', fontSize: 13, border: '1px solid var(--gw-border)', borderRadius: 7, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 6 }}
                    />
                    <input
                      type="email" placeholder="their@email.com" value={leadEmail}
                      onChange={e => setLeadEmail(e.target.value)}
                      style={{ width: '100%', padding: '9px 11px', fontSize: 13, border: '1px solid var(--gw-border)', borderRadius: 7, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 6 }}
                    />
                    <textarea
                      placeholder="Anything the lead should know? (optional)" value={leadNote}
                      onChange={e => setLeadNote(e.target.value)}
                      style={{ width: '100%', minHeight: 52, padding: '9px 11px', fontSize: 13, lineHeight: 1.5, border: '1px solid var(--gw-border)', borderRadius: 7, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', resize: 'vertical', marginBottom: 8 }}
                    />
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button
                        onClick={submitLeadCapture}
                        disabled={!leadEmail.trim().includes('@')}
                        style={{ padding: '9px 16px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: leadEmail.trim().includes('@') ? 'pointer' : 'not-allowed', fontFamily: 'inherit', opacity: leadEmail.trim().includes('@') ? 1 : 0.55 }}
                      >
                        Continue →
                      </button>
                      <button
                        onClick={() => setFlowPath(null)}
                        style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--gw-sub)', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', padding: 0 }}
                      >
                        Actually, this is my situation
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {startCheckin.isPending && (
                <div style={{ fontSize: 13, color: 'var(--gw-sub)', textAlign: 'center', padding: 16 }}>
                  Starting your check-in…
                </div>
              )}
            </div>

            {/* Text input for onboarding - hidden once ready, loading checkin, or cards not yet dismissed */}
            {!startCheckin.isPending && !onboardingReady && !(onboardingHistory.length === 1 && !pickedSituation) && (
              <div style={{ borderTop: '1px solid var(--gw-border)', background: 'white', flexShrink: 0 }}>
                {/* Doc-add panel: paste or upload a document + context; the AI reads it. */}
                {showDocPanel && (
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--gw-border)', background: '#F7F6F3' }}>
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
                    <input
                      type="text"
                      placeholder="Type your response, or add a document with + Doc"
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && input.trim()) { sendOnboarding(input); } }}
                      disabled={onboardingLoading}
                      style={{
                        flex: 1, padding: '10px 12px', fontSize: 13, border: '1px solid var(--gw-border)',
                        borderRadius: 6, fontFamily: 'inherit', outline: 'none', background: 'white',
                        color: 'var(--gw-text)', opacity: onboardingLoading ? 0.5 : 1,
                      }}
                      autoFocus
                    />
                    <button
                      onClick={() => { if (input.trim()) sendOnboarding(input) }}
                      disabled={!input.trim() || onboardingLoading}
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
              <div style={{ background: '#FDF3E3', borderBottom: '1px solid #F5D9A0', padding: '8px 16px', flexShrink: 0 }}>
                <div style={{ maxWidth: 680, margin: '0 auto', fontSize: 12.5, color: '#8A5C1A', lineHeight: 1.5 }}>
                  You are not signed up yet. Your answers are saved to this device as you go, but save your email at the end to keep this record.
                </div>
              </div>
            )}
            <div
              ref={msgsRef}
              style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 680, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}
            >
              {startCheckin.isPending && (
                <div style={{ fontSize: 13, color: 'var(--gw-sub)', textAlign: 'center', padding: 24 }}>Starting your check-in…</div>
              )}
              {!startCheckin.isPending && displayedHistory.length <= 2 && (
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', textAlign: 'center', padding: '4px 12px 8px', lineHeight: 1.5 }}>
                  About 10 minutes, a few exchanges (around 3 answers), then you can end the session to get your report.
                </div>
              )}
              {!startCheckin.isPending && displayedHistory.length <= 2 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', fontSize: 12, color: 'var(--gw-sub)', padding: '0 12px 10px', lineHeight: 1.5 }}>
                  <VennIcon size={22} />
                  <span>Your individual report is private. The shared report shows where everyone's accounts agree or differ.</span>
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
                      whiteSpace: 'pre-wrap',
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
                    ) : m.content}
                    {streamingIdx === i && <span style={{ display: 'inline-block', width: 2, height: '1em', background: 'var(--gw-navy)', marginLeft: 2, verticalAlign: 'text-bottom', animation: 'blink .7s step-end infinite' }} />}
                  </div>
                )
              })}
            </div>

            {/* Natural close prompt */}
            {showEndPrompt && !closed && (
              <div style={{ padding: '12px 20px', background: '#EEF4FB', borderTop: '1px solid #BFDBFE', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
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
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-text)' }}>{skippedCheckin ? 'Ground ready to hand off.' : 'Your account is on record.'}</div>
                  <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 2 }}>{skippedCheckin ? 'Your lead runs the first check-in; you\'ll see the ground as its coordinator.' : 'Invite others to check in - the shared report releases when all parties are in.'}</div>
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
                  <button onClick={() => send()} disabled={loading || !input.trim()}
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

      {/* Save card */}
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 30,
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
          <div style={{ background: '#0A1628', color: 'white', padding: '20px 22px 16px' }}>
            <div style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: '#5DCAA5', fontWeight: 700, marginBottom: 6 }}>{skippedCheckin ? 'New ground · run by your lead' : 'Session 1 · your private report'}</div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-.01em', lineHeight: 1.2 }}>{groundName || (skippedCheckin ? 'Set up your org account.' : 'Your account is on record.')}</div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 6 }}>
              <div style={{ flexShrink: 0, marginTop: 2, background: 'white', borderRadius: 4, padding: '2px 3px' }}><VennIcon size={22} /></div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', lineHeight: 1.5 }}>
                {skippedCheckin
                  ? <>Your lead runs the first check-in; you'll see the ground as its coordinator. Once everyone has checked in, a <b style={{ color: 'rgba(255,255,255,.85)' }}>shared report</b> shows where their accounts agree or differ.</>
                  : <>This individual report is private to you. Once everyone has checked in, a separate <b style={{ color: 'rgba(255,255,255,.85)' }}>shared report</b> shows where everyone's accounts agree or differ.</>}
              </div>
            </div>
            {history.filter(m => m.role === 'user').length > 0 && (() => {
              const turns = history.filter(m => m.role === 'user').length
              const depth = turns < 4 ? 1 : turns < 8 ? 2 : turns < 12 ? 3 : turns < 16 ? 4 : 5
              const label = depth <= 1 ? 'Thin · more exchanges strengthen the report' : depth <= 2 ? 'Moderate · a solid start' : depth <= 3 ? 'Good' : depth <= 4 ? 'Strong' : 'Rich'
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                  {[1,2,3,4,5].map(n => <div key={n} style={{ width: 7, height: 7, borderRadius: 2, background: n <= depth ? '#5DCAA5' : 'rgba(255,255,255,.18)' }} />)}
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,.55)' }} title="How concrete and specific your answers were (Thin, Fair, Good, Strong)">Specificity: {label}</span>
                </div>
              )
            })()}
          </div>

          <div style={{ padding: '18px 20px 28px' }}>

            {/* Generating state */}
            {generatingReport && !sessionReport && (
              <div style={{ background: '#F5F3EF', borderRadius: 10, padding: '14px 16px', marginBottom: 18, fontSize: 13, color: '#6B6560' }}>
                Generating your session report…
              </div>
            )}

            {/* ISSUE 15: report failed - show retry option */}
            {!generatingReport && !sessionReport && closed && reportTurnsForRetry && (
              <div style={{ background: '#F8ECEA', borderRadius: 10, padding: '14px 16px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, fontSize: 13, color: '#B5675A', lineHeight: 1.5 }}>
                  We could not generate your report. Your responses are saved.
                </div>
                <button
                  onClick={() => generateSessionReport(reportTurnsForRetry)}
                  style={{ flexShrink: 0, padding: '8px 14px', borderRadius: 7, background: '#B5675A', color: 'white', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Retry
                </button>
              </div>
            )}

            {/* Structured report */}
            {sessionReport && (
              <>
                {/* What we heard from you */}
                <div style={{ background: '#0A1628', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                    <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: '#5DCAA5', fontWeight: 700 }}>What we heard from you</div>
                    {reportWasCorrected && !generatingReport && (
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,.55)', fontStyle: 'normal' }}>Updated after your correction</div>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,.93)' }}>{sessionReport.whatGroundworkSaw}</p>
                  {/* Anonymous correction: one appended turn + full regeneration.
                      Never patches report fields (see helpers near top of file). */}
                  {!showCorrection ? (
                    <button
                      onClick={() => setShowCorrection(true)}
                      disabled={generatingReport}
                      style={{ marginTop: 10, background: 'none', border: 'none', padding: 0, fontSize: 12, color: '#5DCAA5', cursor: generatingReport ? 'wait' : 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
                    >
                      This isn't right - correct it
                    </button>
                  ) : (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', marginBottom: 6 }}>What did we get wrong? Say it plainly and we'll redo the report.</div>
                      <textarea
                        autoFocus
                        value={correctionText}
                        onChange={e => setCorrectionText(e.target.value)}
                        placeholder="e.g. The deadline is not May - it is March 1."
                        style={{ width: '100%', minHeight: 64, padding: '8px 10px', fontSize: 13, lineHeight: 1.55, border: 'none', borderRadius: 7, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', resize: 'vertical', background: 'rgba(255,255,255,.94)', color: '#1A1916' }}
                      />
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button
                          onClick={submitReportCorrection}
                          disabled={!correctionText.trim() || generatingReport}
                          style={{ padding: '7px 14px', borderRadius: 7, background: '#5DCAA5', color: '#0A1628', fontSize: 12, fontWeight: 700, border: 'none', cursor: !correctionText.trim() || generatingReport ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: !correctionText.trim() || generatingReport ? 0.6 : 1 }}
                        >
                          {generatingReport ? 'Redoing your report...' : 'Redo my report'}
                        </button>
                        <button
                          onClick={() => { setShowCorrection(false); setCorrectionText('') }}
                          disabled={generatingReport}
                          style={{ padding: '7px 12px', borderRadius: 7, background: 'none', color: 'rgba(255,255,255,.6)', fontSize: 12, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* How complete your account is (one-sided until others check in) */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, letterSpacing: '.09em', textTransform: 'uppercase', color: '#9B9590', fontWeight: 700, marginBottom: 6 }}>How complete your account is</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: '#1A1916' }}>{STATUS_DISPLAY[sessionReport.alignmentStatus] ?? sessionReport.alignmentStatus}</div>
                  <div style={{ fontSize: 12, color: '#6B6560', marginTop: 3, lineHeight: 1.5 }}>{sessionReport.alignmentBasis}</div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
                    {(['Unresolved','Mixed','Emerging','Clear','Aligned'] as const).map(s => {
                      const order = ['Unresolved','Mixed','Emerging','Clear','Aligned']
                      const on = order.indexOf(s) <= order.indexOf(sessionReport.alignmentStatus)
                      // "Shared" (data value 'Aligned') requires a second party, so it stays locked in a one-sided report.
                      const locked = s === 'Aligned'
                      const bg = on ? '#0C447C' : '#EFEDE8'
                      return (
                        <div key={s} style={{ flex: 1, textAlign: 'center', fontSize: 9, letterSpacing: '.03em', textTransform: 'uppercase', padding: '5px 2px', borderRadius: 5, fontWeight: 700, background: bg, color: on ? 'white' : (locked ? '#B8B4AE' : '#9B9590'), border: locked ? '1px dashed #CFCBC4' : 'none' }}>{locked ? `${STATUS_DISPLAY[s]} 🔒` : STATUS_DISPLAY[s]}</div>
                      )
                    })}
                  </div>
                  <div style={{ fontSize: 11, color: '#9B9590', marginTop: 6, lineHeight: 1.5 }}>
                    Reading left to right: <b>Just started</b> (little saved yet) → <b>Taking shape</b> → <b>Getting there</b> → <b>Clear</b> (your side is well defined) → <b>Shared</b>. This is your side only. It becomes "Shared" once the other person checks in too.
                  </div>
                </div>

                {/* What's still open */}
                {sessionReport.areasRequiringAlignment.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, letterSpacing: '.09em', textTransform: 'uppercase', color: '#9B9590', fontWeight: 700, marginBottom: 8 }}>What's still open</div>
                    {sessionReport.areasRequiringAlignment.map((a, i) => (
                      <div key={i} style={{ border: '1px solid #E2E0DB', borderLeft: '3px solid #E8A94A', borderRadius: 10, padding: '11px 13px', marginBottom: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 7 }}>{a.title}</div>
                        <div style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 5 }}><span style={{ fontSize: 9, letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700, color: '#9B9590', display: 'block', marginBottom: 1 }}>What we noticed</span>{a.observation}</div>
                        <div style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 5 }}><span style={{ fontSize: 9, letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700, color: '#9B9590', display: 'block', marginBottom: 1 }}>Why it matters</span>{a.whyItMatters}</div>
                        <div style={{ background: '#E7F6EF', borderRadius: 7, padding: '7px 9px', fontSize: 12, color: '#085041', lineHeight: 1.5 }}><span style={{ fontSize: 9, letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700, color: '#085041', opacity: .75, display: 'block', marginBottom: 2 }}>What to do next</span>{a.recommendedMove}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Clear on your side (not mutual agreement - only one party has checked in) */}
                {sessionReport.alignmentReached.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, letterSpacing: '.09em', textTransform: 'uppercase', color: '#9B9590', fontWeight: 700, marginBottom: 8 }}>Clear on your side</div>
                    {sessionReport.alignmentReached.map((a, i) => (
                      <div key={i} style={{ border: '1px solid #E2E0DB', borderLeft: '3px solid #5DCAA5', borderRadius: 10, padding: '11px 13px', marginBottom: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{a.title}</div>
                        <div style={{ fontSize: 12, color: '#6B6560', lineHeight: 1.5 }}>{a.note}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Suggested parties */}
                {sessionReport.suggestedParties && sessionReport.suggestedParties.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, letterSpacing: '.09em', textTransform: 'uppercase', color: '#9B9590', fontWeight: 700, marginBottom: 8 }}>Recommended additions</div>
                    <div style={{ border: '1px solid #E2E0DB', borderLeft: '3px solid #0C447C', borderRadius: 10, padding: '11px 13px', background: '#F4F7FC' }}>
                      <div style={{ fontSize: 12, color: '#6B6560', lineHeight: 1.6, marginBottom: 10 }}>
                        Based on this check-in, these roles would strengthen the ground. Their account would change or confirm what is currently on record from one side only.
                      </div>
                      {sessionReport.suggestedParties.map((p, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderTop: i > 0 ? '0.5px solid #D8E2F0' : undefined }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1916', marginBottom: 2 }}>{p.role}</div>
                            <div style={{ fontSize: 12, color: '#6B6560', lineHeight: 1.4 }}>{p.reason}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mentioned people */}
                {sessionReport.mentionedPeople && sessionReport.mentionedPeople.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, letterSpacing: '.09em', textTransform: 'uppercase', color: '#9B9590', fontWeight: 700, marginBottom: 8 }}>People mentioned</div>
                    <div style={{ border: '1px solid #E2E0DB', borderRadius: 10, padding: '11px 13px', background: '#FAFAF8' }}>
                      <div style={{ fontSize: 12, color: '#6B6560', lineHeight: 1.6, marginBottom: 10 }}>
                        These people came up in this check-in. Adding them to the ground gives you a fuller picture.
                      </div>
                      {sessionReport.mentionedPeople.map((p, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderTop: i > 0 ? '0.5px solid #E2E0DB' : undefined }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1916', marginBottom: 2 }}>{p.name}</div>
                            <div style={{ fontSize: 12, color: '#6B6560', lineHeight: 1.4 }}>{p.context}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Where this leaves you — the one-glance summary of the detail above */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, letterSpacing: '.09em', textTransform: 'uppercase', color: '#9B9590', fontWeight: 700, marginBottom: 4 }}>Where this leaves you</div>
                  <div style={{ fontSize: 11, color: '#9B9590', marginBottom: 8, lineHeight: 1.5 }}>A one-glance summary of your side. "Worth revisiting" is what we will check back on with you next time, not a task list.</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      { k: 'Settled', v: sessionReport.honestClose.aligned, bg: '#E7F6EF', kc: '#085041' },
                      { k: 'Still open', v: sessionReport.honestClose.open, bg: '#FDF3E3', kc: '#8A5C1A' },
                      { k: 'Worth revisiting', v: sessionReport.honestClose.revisit, bg: '#EEF4FB', kc: '#0C447C' },
                      { k: 'Watch for', v: sessionReport.honestClose.risk,  bg: '#F8ECEA', kc: '#B5675A' },
                    ].map(({ k, v, bg, kc }) => (
                      <div key={k} style={{ background: bg, borderRadius: 8, padding: '9px 11px', fontSize: 12, lineHeight: 1.5, color: '#1A1916' }}>
                        <span style={{ fontSize: 9, letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700, color: kc, display: 'block', marginBottom: 3 }}>{k}</span>
                        {v}
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 11.5, color: '#9B9590', marginTop: 8 }}>
                    {uploadedDoc
                      ? `On record: ${uploadedDoc.name}. No contributor documents yet.`
                      : 'On record: your account. No documents uploaded yet.'}
                  </div>
                </div>
              </>
            )}

            {/* What happens next - shown after report is ready, before signup */}
            {(sessionReport || (!generatingReport && closed)) && !emailSent && (
              <div style={{ background: '#F0F4FA', borderRadius: 10, padding: '14px 16px', marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#0C447C', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.06em' }}>What happens next</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    'Save your email below to keep access to this report.',
                    'Open the confirmation link we email you - that saves your ground and sends your invites.',
                    'Once they check in, you both receive the shared report at the same time. It shows where you agree and where the conversation still needs to happen.',
                  ].map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#0C447C', color: 'white', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                      <div style={{ fontSize: 13, color: '#1A1916', lineHeight: 1.55 }}>{step}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Create account - right after the report, before all admin */}
            {!emailSent ? (
              <div style={{ marginBottom: 20 }}>
                <input type="email" placeholder="your@email.com" value={email} onChange={e => { setEmail(e.target.value); setEmailError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  style={{ width: '100%', padding: '11px 13px', borderRadius: 8, border: `1px solid ${emailError ? '#C0392B' : '#E2E0DB'}`, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 8, outline: 'none' }}
                />
                {emailError && <div style={{ fontSize: 12, color: '#791F1F', marginBottom: 6 }}>{emailError}</div>}
                <button onClick={handleSave} disabled={generatingReport && !sessionReport} style={{ width: '100%', padding: '12px 16px', borderRadius: 8, background: '#0C447C', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: generatingReport && !sessionReport ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: generatingReport && !sessionReport ? 0.5 : 1 }}>
                  Save my ground →
                </button>
                <div style={{ fontSize: 11.5, color: '#9B9590', lineHeight: 1.5, textAlign: 'center', paddingTop: 8 }}>
                  We'll email you a confirmation link. Your report is saved and your invites go out the moment you open it.
                </div>
                <div onClick={() => setShowSave(false)} style={{ textAlign: 'center', fontSize: 12, color: '#9B9590', cursor: 'pointer', paddingTop: 10 }}>
                  Not now
                </div>
              </div>
            ) : (
              <div style={{ background: '#E7F6EF', border: '1px solid #B6E8D4', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#085041', marginBottom: 4 }}>Check your email</div>
                <div style={{ fontSize: 13, color: '#085041', lineHeight: 1.6 }}>We sent a link to <strong>{email}</strong>. Click it to finish setting up and get your invite link.</div>
                {inviteAdded.length > 0 && (
                  <div style={{ fontSize: 12, color: '#085041', lineHeight: 1.6, marginTop: 8, paddingTop: 8, borderTop: '1px solid #B6E8D4' }}>
                    <strong>Waiting to send ({inviteAdded.length}):</strong> {inviteAdded.map(e => e.split(' - ')[0]).join(', ')}. Invites go out when you confirm your email.
                  </div>
                )}
              </div>
            )}

            {/* Admin setup - only shown after email sent */}
            {emailSent && (
            <div>
            <div style={{ borderTop: '1px solid #E2E0DB', marginBottom: 18 }} />

            {/* Ground + org naming */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6B6560', marginBottom: 6 }}>Name this situation</div>
              <input
                type="text" placeholder="e.g. Kwame, first 90 days" value={groundName}
                onChange={e => setGroundName(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E0DB', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', marginBottom: 8 }}
              />
              <input
                type="text" placeholder="Organisation name (optional)" value={orgName}
                onChange={e => setOrgName(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E0DB', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', marginBottom: 8 }}
              />
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6B6560', marginBottom: 4 }}>How often do contributors check in?</div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                {(['ONE_TIME', 'DAILY', 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'SEQUENTIAL'] as const).map(c => {
                  const labels: Record<string, string> = { ONE_TIME: 'One time', DAILY: 'Daily', WEEKLY: 'Weekly', FORTNIGHTLY: 'Every 2 weeks', MONTHLY: 'Monthly', SEQUENTIAL: 'When I check in' }
                  return (
                  <button key={c} onClick={() => setCadence(c)} style={{
                    flex: '1 0 30%', padding: '9px 4px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    border: `1px solid ${cadence === c ? '#0C447C' : '#E2E0DB'}`,
                    background: cadence === c ? '#EEF4FB' : 'white',
                    color: cadence === c ? '#0C447C' : '#6B6560',
                  }}>
                    {labels[c]}
                  </button>
                )})}
              </div>
              {/* Weekday anchor for weekly-style cadences ("every Monday") */}
              {(cadence === 'WEEKLY' || cadence === 'FORTNIGHTLY') && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#6B6560', marginBottom: 4 }}>On which day? (optional)</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => (
                      <button key={d} onClick={() => setCadenceAnchorDay(cadenceAnchorDay === i ? null : i)} style={{
                        flex: 1, padding: '6px 0', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                        border: `1px solid ${cadenceAnchorDay === i ? '#0C447C' : '#E2E0DB'}`,
                        background: cadenceAnchorDay === i ? '#EEF4FB' : 'white', color: cadenceAnchorDay === i ? '#0C447C' : '#9B9590',
                      }}>{d}</button>
                    ))}
                  </div>
                </div>
              )}
              {/* Day-of-month anchor for monthly ("on the 1st") */}
              {cadence === 'MONTHLY' && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#6B6560', marginBottom: 4 }}>On which day of the month? (optional)</div>
                  <select value={cadenceAnchorDay ?? ''} onChange={e => setCadenceAnchorDay(e.target.value ? Number(e.target.value) : null)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E0DB', fontSize: 13, fontFamily: 'inherit', background: 'white', color: cadenceAnchorDay != null ? '#1A1916' : '#9B9590' }}>
                    <option value="">No fixed day (every ~30 days)</option>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>{day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of the month</option>
                    ))}
                  </select>
                </div>
              )}
              <div style={{ fontSize: 11, color: '#9B9590', marginBottom: 10, lineHeight: 1.5 }}>
                {cadence === 'ONE_TIME' ? 'Single session · one account per party, no follow-up cadence.' :
                 cadence === 'DAILY' ? 'Daily · a fresh check-in opens each day.' :
                 cadence === 'WEEKLY' ? `Weekly${cadenceAnchorDay != null ? ` · every ${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][cadenceAnchorDay]}` : ''} · typical resolution in 4-6 weeks.` :
                 cadence === 'MONTHLY' ? `Monthly${cadenceAnchorDay != null ? ` · on the ${cadenceAnchorDay}${cadenceAnchorDay === 1 ? 'st' : cadenceAnchorDay === 2 ? 'nd' : cadenceAnchorDay === 3 ? 'rd' : 'th'}` : ''} · typical resolution in 3-4 months.` :
                 cadence === 'SEQUENTIAL' ? 'No fixed schedule · when you check in, your team gets their next check-in. Good for cascading updates to a group (e.g. field officers).' :
                 `Every 2 weeks${cadenceAnchorDay != null ? ` · on ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][cadenceAnchorDay]}` : ''} · typical resolution in 6-8 weeks.`}
              </div>
              {cadence === 'ONE_TIME' ? (
                <>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#6B6560', marginBottom: 4 }}>Complete by</div>
                  <input
                    type="date" value={checkInBy}
                    onChange={e => setCheckInBy(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${emailError && !checkInBy ? '#C0392B' : '#E2E0DB'}`, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', color: checkInBy ? '#1A1916' : '#9B9590' }}
                  />
                </>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#6B6560', marginBottom: 4 }}>Start date <span style={{ fontWeight: 400 }}>(first check-in)</span></div>
                    <input
                      type="date" value={checkInBy}
                      onChange={e => setCheckInBy(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${emailError && !checkInBy ? '#C0392B' : '#E2E0DB'}`, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', color: checkInBy ? '#1A1916' : '#9B9590' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#6B6560', marginBottom: 4 }}>End date <span style={{ fontWeight: 400 }}>(last check-in, optional)</span></div>
                    <input
                      type="date" value={lastCheckInBy}
                      onChange={e => setLastCheckInBy(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E0DB', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', color: lastCheckInBy ? '#1A1916' : '#9B9590' }}
                    />
                  </div>
                </div>
              )}
              {emailError && !checkInBy && emailError.toLowerCase().includes('date') && (
                <div style={{ fontSize: 11.5, color: '#C0392B', marginTop: 6, fontWeight: 600 }}>Pick a date above so we know when to expect the first check-in.</div>
              )}
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
              const inviteHeading = isSensitive ? 'Let them share their side' : 'Invite contributors'
              const inviteSubtext = isSensitive
                ? 'Send them a link so they can share their account independently. They cannot see what you wrote. When both sides are in, the report shows where you agree and where the conversation still needs to happen.'
                : 'Each person checks in independently. Nobody reads anyone else\'s words directly. When all accounts are in, the report shows where everyone agrees, where they differ, and what the gap means.'
              return (
            <div style={{ borderBottom: '1px solid #E2E0DB', marginBottom: 16, paddingBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6B6560', marginBottom: 4 }}>{inviteHeading}</div>
              <div style={{ fontSize: 12, color: '#9B9590', lineHeight: 1.55, marginBottom: 10 }}>
                {inviteSubtext}
              </div>
              {(() => {
                const s = onboardingSelections.classifiedScenario || onboardingSelections.mode || scenario
                const notices: Record<string, string> = {
                  PIP: 'Performance improvement grounds document a process. They do not replace formal HR procedures, employment policy, or legal obligation. Ensure your organisation\'s HR process is followed in parallel.',
                  DRIFT: 'This ground was opened on a situation that has already moved off course. Inviting contributors now means their account will reflect the current state, not the original agreement. Make sure that is what you want on record.',
                  REALIGN_TEAM: 'Realignment grounds surface disagreement directly. Contributors will give independent accounts that may differ significantly from yours. The report will show those gaps without filtering them.',
                }
                const notice = notices[s ?? '']
                return notice ? (
                  <div style={{ background: '#FFF8EC', border: '1px solid #F5DFA0', borderRadius: 8, padding: '10px 12px', marginBottom: 12, fontSize: 12, color: '#7A5200', lineHeight: 1.55 }}>
                    {notice}
                  </div>
                ) : null
              })()}

              {inviteAdded.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                  {inviteAdded.map(e => (
                    <div key={e} style={{ fontSize: 12, color: '#085041', background: '#E7F6EF', borderRadius: 6, padding: '5px 10px' }}>✓ {e}</div>
                  ))}
                </div>
              )}

              {inviteContextFor ? (
                <div style={{ background: '#F5F3EF', border: '1px solid #E2E0DB', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1916' }}>{inviteContextFor}</div>
                    {bulkQueue.length > 0 && (
                      <div style={{ fontSize: 11, color: '#9B9590' }}>{bulkQueue.length} more after this</div>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#6B6560', marginBottom: 8, lineHeight: 1.5 }}>What do you want them to focus on or account for?</div>
                  <textarea autoFocus placeholder="e.g. They are the other side of this. They own the delivery timeline."
                    value={inviteContext} onChange={e => setInviteContext(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitInviteContext() } }}
                    style={{ width: '100%', resize: 'none', minHeight: 60, padding: '8px 10px', fontSize: 13, lineHeight: 1.5, border: '1px solid #E2E0DB', borderRadius: 7, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 8 }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => {
                      // Add without context, then advance queue
                      const newAdded = inviteAdded.includes(inviteContextFor) ? inviteAdded : [...inviteAdded, inviteContextFor]
                      setInviteAdded(newAdded)
                      setInviteContext('')
                      const [next, ...rest] = bulkQueue
                      if (next) { setBulkQueue(rest); setInviteContextFor(next) } else { setInviteContextFor(null) }
                    }} style={{ padding: '8px 14px', borderRadius: 7, background: 'none', border: '1px solid #E2E0DB', color: '#6B6560', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Skip</button>
                    <button onClick={submitInviteContext} style={{ flex: 1, padding: '8px 14px', borderRadius: 7, background: '#0C447C', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Add contributor</button>
                  </div>
                </div>
              ) : bulkInviteMode ? (
                <div>
                  <textarea
                    autoFocus
                    placeholder="Paste emails separated by commas or line breaks&#10;e.g. alice@co.com, bob@co.com"
                    value={bulkInviteText}
                    onChange={e => setBulkInviteText(e.target.value)}
                    style={{ width: '100%', resize: 'none', minHeight: 80, padding: '10px 12px', fontSize: 13, lineHeight: 1.5, border: '1px solid #E2E0DB', borderRadius: 8, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 8 }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => { setBulkInviteMode(false); setBulkInviteText('') }} style={{ padding: '9px 14px', borderRadius: 7, background: 'none', border: '1px solid #E2E0DB', color: '#6B6560', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                    <button
                      onClick={() => {
                        const emails = bulkInviteText
                          .split(/[\n,]+/)
                          .map(e => e.trim().toLowerCase())
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
                      style={{ flex: 1, padding: '9px 14px', borderRadius: 7, background: '#0C447C', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
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
                      style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E0DB', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
                    />
                    <button onClick={addInviteEmail} style={{ flexShrink: 0, padding: '10px 16px', borderRadius: 8, background: '#0C447C', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Add</button>
                  </div>
                  <button
                    onClick={() => setBulkInviteMode(true)}
                    style={{ background: 'none', border: 'none', fontSize: 12, color: '#0C447C', cursor: 'pointer', fontFamily: 'inherit', padding: 0, textDecoration: 'underline', marginBottom: 10 }}
                  >
                    Paste multiple emails
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, fontSize: 12, color: '#0C447C', background: '#EEF4FB', border: '0.5px solid #BFDBFE', borderRadius: 7, padding: '8px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {window.location.origin}/invite?token={inviteToken}
                    </div>
                    <button onClick={copyInviteLink} style={{ flexShrink: 0, padding: '8px 12px', borderRadius: 7, background: '#F5F3EF', color: '#1A1916', fontSize: 12, fontWeight: 600, border: '0.5px solid #E2E0DB', cursor: 'pointer', fontFamily: 'inherit' }}>
                      {copiedLink ? 'Copied!' : 'Copy link'}
                    </button>
                  </div>
                  <input type="text" placeholder="Add a note to send with your link (optional)" value={inviteNote} onChange={e => setInviteNote(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E0DB', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', marginTop: 8 }}
                  />
                </>
              )}
            </div>
              )
            })()}

            </div>
            )}

            {closed ? (
              <div style={{ textAlign: 'center', paddingTop: 8 }}>
                <button onClick={() => setShowSave(false)} style={{ padding: '11px 28px', borderRadius: 8, background: '#0C447C', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Done
                </button>
                <div style={{ fontSize: 11.5, color: '#9B9590', paddingTop: 8 }}>You can reopen this any time from the bar below.</div>
              </div>
            ) : (
              <div onClick={() => setShowSave(false)} style={{ textAlign: 'center', fontSize: 12, color: '#9B9590', cursor: 'pointer', paddingTop: 4 }}>
                Later
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New scenario conflict modal */}
      {showNewScenarioConflict && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,22,40,0.55)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 24, maxWidth: 380, width: '100%' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0A1628', marginBottom: 8 }}>You have a check-in in progress</div>
            <div style={{ fontSize: 13, color: '#6B6560', lineHeight: 1.65, marginBottom: 18 }}>
              Starting a new scenario will clear your current session. Your progress will be lost.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { setShowNewScenarioConflict(false); setPendingNewScenario(null) }}
                style={{ flex: 1, padding: '10px', borderRadius: 8, background: '#F5F3EF', color: '#6B6560', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Keep current session
              </button>
              <button
                onClick={() => {
                  if (pendingNewScenario) {
                    clearEntrySession()
                    setOnboardingSelections(pendingNewScenario.sels)
                    setOnboardingHistory([])
                    setOnboardingReady(false)
                    persistOnboarding([], pendingNewScenario.sels, 1)
                  }
                  setShowNewScenarioConflict(false)
                  setPendingNewScenario(null)
                }}
                style={{ flex: 1, padding: '10px', borderRadius: 8, background: '#0A1628', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
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
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0A1628', marginBottom: 8 }}>End this session?</div>
            <div style={{ fontSize: 13, color: '#6B6560', lineHeight: 1.65, marginBottom: 8 }}>
              Your answers are saved on this device. Ending this session generates your report, and this session's answers then lock.
            </div>
            <div style={{ fontSize: 13, color: '#6B6560', lineHeight: 1.65, marginBottom: 18 }}>
              Once you save your record below, you can revisit and correct it any time from your report. The shared report releases once all parties have checked in.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowEndConfirm(false)}
                style={{ flex: 1, padding: '10px', borderRadius: 8, background: '#F5F3EF', color: '#6B6560', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Keep going
              </button>
              <button
                onClick={() => { setShowEndConfirm(false); handleEndSession() }}
                style={{ flex: 1, padding: '10px', borderRadius: 8, background: '#0A1628', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
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
