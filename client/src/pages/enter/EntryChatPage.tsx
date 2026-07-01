import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { entryApi } from '@/api/entry'
import { authApi } from '@/api/auth'
import { useEntryStore } from '@/stores/entry'
import { useAuthStore } from '@/stores/auth'
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
export function hasPendingEntry(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const p = JSON.parse(raw)
    return !!(p?.history?.length)
  } catch { return false }
}

const ONBOARDING_STEPS = 7

const MODE_BUTTON_MAP: Record<string, string> = {
  'Starting something': 'something_new',
  'Already underway': 'already_underway',
  'Already happened': 'look_back',
  'Regular check-in': 'recurring',
}

const MODE_BUTTON_DESCRIPTIONS: Record<string, string> = {
  'Starting something': 'A new hire, project, partnership, handover, role, or collaboration starting now.',
  'Already underway': 'Something in motion: a delivery, a team, a review, a protocol, a handover, or an ongoing relationship.',
  'Already happened': 'A decision, project, meeting, or conversation that needs to go on record now that it is done.',
  'Regular check-in': 'A recurring ritual: weekly, fortnightly, or monthly, for a team, a mentee, a group, or a distributed field team.',
}

const GOAL_OPTIONS = [
  'Verify readiness or delivery',
  'Set expectations before we begin',
  'Understand what happened',
  'Get alignment on a decision or plan',
  'Something else',
]


const SESSION_END_PATTERNS = [
  'here is what is now in your record',
  'now in your record from today',
  'your record from today',
  'come back when',
  'the record is here and',
  'your record is here',
  'next step options',
  'here is what is now in the record',
  'option to not have',
  'your record is saved as is',
  'cannot be verified from this account',
  'your contribution is saved',
]

const MODE_INTROS: Record<string, string> = {
  something_new: 'Good.\n\nThe best time to set expectations is before anyone has had a chance to assume.',
  already_underway: 'Good.\n\nChecking in while something is moving is what keeps it on track.',
  look_back: 'Good.\n\nGetting this on record while the details are still fresh is the right call.',
  recurring: 'Good.\n\nA regular check-in builds the kind of record that actually shows what is happening over time.',
}

interface OnboardingMessage {
  text: string
  buttons?: string[]
  buttonDescriptions?: Record<string, string>
  multiSelect?: boolean
  placeholder?: string
}

function buildOnboardingMessages(sels: OnboardingSelections): OnboardingMessage[] {
  const modeKey = sels.mode || 'something_new'
  const intro = MODE_INTROS[modeKey] || MODE_INTROS['something_new']

  return [
    // Step 1: situation type
    {
      text: `Groundwork builds a picture from what everyone involved has seen, experienced, and agreed. Each person adds their own account. Nobody reads anyone else's words directly. The report shows where accounts agree and where they differ.\n\nWhat kind of situation are we dealing with?`,
      buttons: ['Starting something', 'Already underway', 'Already happened', 'Regular check-in'],
      buttonDescriptions: MODE_BUTTON_DESCRIPTIONS,
    },
    // Step 2: what is this about
    {
      text: `${intro}\n\nWhat is this about?`,
      placeholder: 'Describe the situation.',
    },
    // Step 3: who is involved
    {
      text: 'Who else is involved?',
      placeholder: 'Name who is part of this and what their role is.',
    },
    // Step 4: why now
    {
      text: "What's making this important to get on record right now?",
      placeholder: 'What prompted this.',
    },
    // Step 5: goals
    {
      text: 'What do you need from this?',
      buttons: GOAL_OPTIONS,
      multiSelect: true,
      placeholder: 'Or say it in your own words.',
    },
    // Step 6: brief — what to focus on, probe, or watch for
    {
      text: "Is there anything specific you want the tool to focus on or ask about?\n\nThis could be a topic you know matters, something you want people to be specific about, or context the tool should use to ask sharper questions. You can skip this if nothing comes to mind.",
      placeholder: 'What to focus on, probe, or watch for.',
      buttons: ['Skip'],
    },
    // Step 7: party or observer choice
    {
      text: "Last thing. Are you one of the people in this situation, or are you setting it up for them?\n\nIf you are involved, you check in first, then invite the others. If you are not involved, you skip straight to inviting them.",
      buttons: ["I'm involved — let's begin.", "Setting this up for others"],
    },
  ]
}

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

  // Onboarding state
  const defaultSels: OnboardingSelections = { mode: urlMode || 'new', initial: urlInitial || '' }
  const [onboardingStep, setOnboardingStep] = useState(1)
  const [onboardingSelections, setOnboardingSelections] = useState<OnboardingSelections>(defaultSels)
  const [onboardingMessages, setOnboardingMessages] = useState<OnboardingMessage[]>(
    () => buildOnboardingMessages(defaultSels)
  )

  // Check-in chat state (phase 2)
  const [history, setHistory] = useState<Turn[]>([])
  const [displayedHistory, setDisplayedHistory] = useState<Turn[]>([])
  const [streamingIdx, setStreamingIdx] = useState<number | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [closed, setClosed] = useState(false)
  const [phase, setPhase] = useState<'onboarding' | 'checkin'>('onboarding')
  const [selectedGoals, setSelectedGoals] = useState<string[]>([])
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
  const [sessionReport, setSessionReport] = useState<import('@/api/entry').EntryReport | null>(null)
  const [generatingReport, setGeneratingReport] = useState(false)
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
  const [skippedCheckin] = useState(false)
  const [checkInBy, setCheckInBy] = useState('')
  const [lastCheckInBy, setLastCheckInBy] = useState('')
  const [cadence, setCadence] = useState<'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ONE_TIME'>('FORTNIGHTLY')
  const [bulkInviteMode, setBulkInviteMode] = useState(false)
  const [bulkInviteText, setBulkInviteText] = useState('')
  const [bulkQueue, setBulkQueue] = useState<string[]>([])

  // Stable invite token — generated once and stored in entryStorage
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
    if (saved && !saved.closed && !scenario) {
      // Restore existing session
      setHistory(saved.history)
      if (saved.report) { try { setSessionReport(JSON.parse(saved.report)) } catch { /* legacy plain text — discard */ } }
      if (saved.email) setEmail(saved.email)
      if (saved.onboardingSelections) {
        setOnboardingSelections(saved.onboardingSelections)
        setOnboardingMessages(buildOnboardingMessages(saved.onboardingSelections))
      }
      const step = saved.onboardingStep ?? 0
      if (step >= ONBOARDING_STEPS && saved.history.length > 0) {
        setPhase('checkin')
        setOnboardingStep(ONBOARDING_STEPS)
      } else if (step > 0) {
        setPhase('onboarding')
        setOnboardingStep(step)
      }
    } else if (saved && !saved.closed && scenario) {
      // Show inline conflict modal instead of window.confirm
      const sels: OnboardingSelections = { mode: urlMode || 'new', initial: urlInitial || scenario || '' }
      setPendingNewScenario({ sels })
      setShowNewScenarioConflict(true)
    } else {
      clearEntrySession()
      if (urlInitial || scenario) {
        const sels: OnboardingSelections = { mode: urlMode || 'new', initial: urlInitial || scenario || '' }
        setOnboardingSelections(sels)
        setOnboardingMessages(buildOnboardingMessages(sels))
        persistOnboarding([], sels, 1)
      }
    }
  }, [])

  function persistOnboarding(h: Turn[], sels: OnboardingSelections, step: number) {
    saveSession({ scenario, history: h, closed: false, onboardingStep: step, onboardingSelections: sels })
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
      const h: Turn[] = [{ role: 'assistant', content: res.reply }]
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
      const replyLower = res.reply.toLowerCase()
      const isNaturalClose = SESSION_END_PATTERNS.some(p => replyLower.includes(p))
      if (isNaturalClose && !closed) {
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

  // Advance onboarding step
  function advanceOnboarding(buttonChoice?: string) {
    const currentStep = onboardingStep
    let newSels = { ...onboardingSelections }

    // Step 7: party path — show briefing before check-in starts
    if (buttonChoice === "I am involved. Let's begin." || buttonChoice === "I'm involved — let's begin.") {
      setOnboardingStep(ONBOARDING_STEPS + 1)
      persistOnboarding([], newSels, ONBOARDING_STEPS)
      setShowAdminBriefing(true)
      return
    }

    // Step 7: manager path — skip check-in, go straight to save card
    if (buttonChoice === "I am setting this up for others" || buttonChoice === "Setting this up for others") {
      setOnboardingStep(ONBOARDING_STEPS + 1)
      persistOnboarding([], newSels, ONBOARDING_STEPS)
      const ctx = [
        newSels.initial ? `What this ground is for: ${newSels.initial}` : '',
        newSels.whoInvolved ? `Who is part of this: ${newSels.whoInvolved}` : '',
        newSels.goals?.length ? `Goals: ${newSels.goals.join(', ')}` : '',
      ].filter(Boolean).join('. ')
      const managerHistory: Turn[] = [
        { role: 'user', content: `[MANAGER MODE] This ground was set up by a coordinator who is not a party to the situation. Context: ${ctx || 'No additional context provided.'}` },
        { role: 'assistant', content: 'Your ground is set up. Invite the people involved to add their accounts.' },
      ]
      setHistory(managerHistory)
      setPhase('checkin')
      setClosed(true)
      setShowSave(true)
      persistCheckin(managerHistory, true)
      return
    }

    // Step 5 multi-select: toggle goal without advancing
    // "Something else" requires text — don't add it as a goal string; the text input handles it
    if (currentStep === 5 && buttonChoice && GOAL_OPTIONS.includes(buttonChoice) && buttonChoice !== 'Something else') {
      setSelectedGoals(prev =>
        prev.includes(buttonChoice) ? prev.filter(g => g !== buttonChoice) : [...prev, buttonChoice]
      )
      return
    }

    // Capture inputs per step
    if (currentStep === 1) {
      // Mode selection buttons
      if (buttonChoice && MODE_BUTTON_MAP[buttonChoice]) {
        newSels = { ...newSels, mode: MODE_BUTTON_MAP[buttonChoice] }
      }
    } else if (currentStep === 2) {
      const val = input.trim()
      if (!val) return
      newSels = { ...newSels, initial: val }
      setInput('')
      // Background intent classification — updates scenario without blocking the user
      entryApi.classifyIntent(val, newSels.mode).then(r => {
        setOnboardingSelections(prev => ({ ...prev, classifiedScenario: r.scenario }))
      }).catch(() => { /* non-critical */ })
    } else if (currentStep === 3) {
      const val = input.trim()
      if (!val) return
      newSels = { ...newSels, whoInvolved: val }
      setInput('')
    } else if (currentStep === 4) {
      const val = input.trim()
      if (!val) return
      newSels = { ...newSels, decision: val }
      setInput('')
    } else if (currentStep === 5) {
      const textGoal = input.trim()
      const goals = [...selectedGoals, ...(textGoal ? [textGoal] : [])]
      if (goals.length === 0) return
      newSels = { ...newSels, goals }
      setInput('')
      setSelectedGoals([])
    } else if (currentStep === 6) {
      if (buttonChoice === 'Skip') {
        newSels = { ...newSels, brief: '' }
      } else {
        const val = input.trim()
        newSels = { ...newSels, brief: val }
        setInput('')
      }
    }

    setOnboardingSelections(newSels)
    setOnboardingMessages(buildOnboardingMessages(newSels))

    const nextStep = currentStep + 1
    if (nextStep > ONBOARDING_STEPS) {
      setOnboardingStep(ONBOARDING_STEPS + 1)
      persistOnboarding([], newSels, ONBOARDING_STEPS)
      startCheckin.mutate()
      return
    }

    setOnboardingStep(nextStep)
    persistOnboarding([], newSels, nextStep)
    setTimeout(() => {
      if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight
    }, 50)
  }

// Check-in send
  function send(text?: string) {
    const content = (text ?? input).trim()
    if (!content || loading || closed) return
    setInput('')
    if (taRef.current) taRef.current.style.height = '38px'
    setLoading(true)
    const userTurn: Turn = { role: 'user', content }
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
        toast.warning(`${file.name} is large — only the first portion will be used in this session.`)
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
    if (!checkInBy.trim()) { setEmailError('Please set a date for the first check-in.'); return }
    setEmailError('')
    try {
      await authApi.entrySave(trimmed)
      setEmailSent(true)
      // Persist metadata needed for the post-auth commit call.
      // ISSUE 17: do NOT store raw conversation history client-side before email is confirmed.
      // The full conversation is already on the server after check-in completes.
      // Only store UI-restoration metadata here.
      const commitPayload = {
        groundLabel: groundName || scenario || 'My first ground',
        orgName: orgName.trim() || undefined,
        // Prefer the AI-classified scenario; fall back to mode key, then URL param.
        scenario: onboardingSelections.classifiedScenario || onboardingSelections.mode || scenario || undefined,
        cadence: cadence === 'ONE_TIME' ? 'FORTNIGHTLY' : cadence,
        checkInBy: checkInBy.trim() || undefined,
        lastCheckInBy: lastCheckInBy.trim() || undefined,
        reportSummary: sessionReport ? { alignmentStatus: sessionReport.alignmentStatus, whatGroundworkSaw: sessionReport.whatGroundworkSaw } : undefined,
        inviteNote: inviteNote.trim() || undefined,
        // Each contributor gets its own token — the server generates one per participant.
        // Do NOT pass a shared inviteToken here; it would cause unique constraint failures
        // on the second contributor and silently drop them.
        contributors: inviteAdded.map(entry => {
          const dashIdx = entry.indexOf(' — ')
          if (dashIdx === -1) return { email: entry }
          return { email: entry.slice(0, dashIdx), context: entry.slice(dashIdx + 3) }
        }),
      }
      try { localStorage.setItem('gw_commit_payload', JSON.stringify(commitPayload)) } catch { /* */ }
    } catch (err: any) {
      setEmailError(err?.response?.data?.message ?? 'Could not send link. Please try again.')
    }
  }

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
    const entry = inviteContextFor + (inviteContext.trim() ? ` — ${inviteContext.trim()}` : '')
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
          const dashIdx = e.indexOf(' — ')
          if (dashIdx === -1) return { email: e }
          return { email: e.slice(0, dashIdx), context: e.slice(dashIdx + 3) }
        })
        localStorage.setItem('gw_commit_payload', JSON.stringify(payload))
      }
    } catch { /* */ }
  }

  const currentOnboardingMsg = onboardingMessages[onboardingStep - 1]

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
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 2 }}>The shared report — not your words</div>
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

      {/* Start over / clear check-in — hidden once session is closed */}
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

        {/* PHASE: ONBOARDING */}
        {phase === 'onboarding' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div
              ref={msgsRef}
              style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 680, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}
            >
              {onboardingMessages.slice(0, onboardingStep).map((msg, idx) => {
                const isActive = idx === onboardingStep - 1
                // Show user's answer for completed steps
                const stepNum = idx + 1
                const userAnswer: string | null = !isActive ? (
                  stepNum === 1 ? (onboardingSelections.mode ? { something_new: 'Something new', look_back: 'Look back', look_forward: 'Look forward', both: 'Both' }[onboardingSelections.mode] ?? null : null)
                  : stepNum === 2 ? (onboardingSelections.initial ?? null)
                  : stepNum === 3 ? (onboardingSelections.whoInvolved ?? null)
                  : stepNum === 4 ? (onboardingSelections.decision ?? null)
                  : stepNum === 5 ? (onboardingSelections.goals?.join(', ') ?? null)
                  : stepNum === 6 ? (onboardingSelections.brief || null)
                  : null
                ) : null
                return (
                  <div key={idx} style={{ transition: 'opacity .3s', opacity: 1 }}>
                    <div style={{
                      maxWidth: '88%',
                      background: 'white',
                      color: 'var(--gw-text)',
                      border: '1px solid var(--gw-border)',
                      borderRadius: '4px 16px 16px 16px',
                      padding: '12px 16px',
                      fontSize: 14,
                      lineHeight: 1.7,
                      whiteSpace: 'pre-wrap',
                      boxShadow: '0 1px 3px rgba(0,0,0,.06)',
                    }}>
                      {msg.text}
                    </div>
                    {userAnswer && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                        <div style={{
                          maxWidth: '82%', background: 'var(--gw-navy)', color: 'white',
                          borderRadius: '16px 16px 4px 16px', padding: '10px 14px',
                          fontSize: 14, lineHeight: 1.65, whiteSpace: 'pre-wrap',
                        }}>
                          {userAnswer}
                        </div>
                      </div>
                    )}

                    {isActive && msg.buttons && (
                      <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', flexDirection: msg.buttonDescriptions ? 'column' : 'row', maxWidth: '88%' }}>
                        {msg.buttons.map(btn => {
                          const isSelected = msg.multiSelect && selectedGoals.includes(btn)
                          const desc = msg.buttonDescriptions?.[btn]
                          return (
                            <button
                              key={btn}
                              onClick={() => advanceOnboarding(btn)}
                              style={desc ? {
                                padding: '12px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                                border: '1px solid var(--gw-border)', background: 'white',
                                color: 'var(--gw-text)', cursor: 'pointer', fontFamily: 'inherit',
                                textAlign: 'left', transition: 'border-color .15s',
                              } : {
                                padding: '8px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                                border: `1px solid ${isSelected ? 'var(--gw-navy)' : 'var(--gw-border)'}`,
                                background: isSelected ? 'var(--gw-navy)' : 'white',
                                color: isSelected ? 'white' : 'var(--gw-text)',
                                cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
                              }}
                            >
                              {desc ? (
                                <>
                                  <div style={{ fontWeight: 700, marginBottom: 3 }}>{btn}</div>
                                  <div style={{ fontSize: 12, color: 'var(--gw-sub)', fontWeight: 400, lineHeight: 1.45 }}>{desc}</div>
                                </>
                              ) : btn}
                            </button>
                          )
                        })}
                        {msg.multiSelect && selectedGoals.length > 0 && (
                          <button
                            onClick={() => advanceOnboarding()}
                            style={{
                              padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                              background: 'var(--gw-navy)', color: 'white',
                              border: '1px solid var(--gw-navy)', cursor: 'pointer', fontFamily: 'inherit',
                            }}
                          >
                            Confirm →
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {startCheckin.isPending && (
                <div style={{ fontSize: 13, color: 'var(--gw-sub)', textAlign: 'center', padding: 16 }}>
                  Starting your check-in…
                </div>
              )}
            </div>

            {/* Text input — steps with a text placeholder only; button-only steps (1 and 6) hide the bar */}
            {!startCheckin.isPending && currentOnboardingMsg && onboardingStep < ONBOARDING_STEPS && !!currentOnboardingMsg.placeholder && (
              <div style={{ borderTop: '1px solid var(--gw-border)', background: 'white', flexShrink: 0 }}>
                <div style={{ padding: '10px 16px' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', maxWidth: 680, margin: '0 auto' }}>
                    <input
                      type="text"
                      placeholder={currentOnboardingMsg.placeholder ?? 'Type your response.'}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && input.trim()) advanceOnboarding() }}
                      style={{
                        flex: 1, padding: '10px 12px', fontSize: 13, border: '1px solid var(--gw-border)',
                        borderRadius: 6, fontFamily: 'inherit', outline: 'none', background: 'white',
                        color: 'var(--gw-text)',
                      }}
                      autoFocus
                    />
                    <button
                      onClick={() => { if (input.trim()) advanceOnboarding() }}
                      disabled={!input.trim()}
                      style={{ padding: '0 14px', borderRadius: 6, background: 'var(--gw-navy)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 18, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: input.trim() ? 1 : 0.35 }}
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
            <div
              ref={msgsRef}
              style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 680, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}
            >
              {startCheckin.isPending && (
                <div style={{ fontSize: 13, color: 'var(--gw-sub)', textAlign: 'center', padding: 24 }}>Starting your check-in…</div>
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
                    {m.content}
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
                  onClick={() => setShowEndPrompt(false)}
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
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-text)' }}>Your account is on record.</div>
                  <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 2 }}>Invite others to check in — the shared report releases when all parties are in.</div>
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
        transition: 'opacity .3s',
        overflowY: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '24px 16px 48px',
      }}>
        <div style={{ width: '100%', maxWidth: 640, background: 'white', borderRadius: 14, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,.22)' }}>

          {/* Report header */}
          <div style={{ background: '#0A1628', color: 'white', padding: '20px 22px 16px' }}>
            <div style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: '#5DCAA5', fontWeight: 700, marginBottom: 6 }}>{skippedCheckin ? 'New ground' : 'Session 1 · your private report'}</div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-.01em', lineHeight: 1.2 }}>{groundName || (skippedCheckin ? 'Set up your ground.' : 'Your account is on record.')}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginTop: 4 }}>This is your private report — only you can see it. The shared report generates once all parties have checked in. It does not quote you.</div>
            {history.filter(m => m.role === 'user').length > 0 && (() => {
              const turns = history.filter(m => m.role === 'user').length
              const depth = turns < 4 ? 1 : turns < 8 ? 2 : turns < 12 ? 3 : turns < 16 ? 4 : 5
              const label = depth <= 1 ? 'Thin · more exchanges strengthen the report' : depth <= 2 ? 'Moderate · a solid start' : depth <= 3 ? 'Good' : depth <= 4 ? 'Strong' : 'Rich'
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                  {[1,2,3,4,5].map(n => <div key={n} style={{ width: 7, height: 7, borderRadius: 2, background: n <= depth ? '#5DCAA5' : 'rgba(255,255,255,.18)' }} />)}
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,.55)' }}>Session depth: {label}</span>
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

            {/* ISSUE 15: report failed — show retry option */}
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
                {/* What Groundwork saw */}
                <div style={{ background: '#0A1628', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                  <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: '#5DCAA5', fontWeight: 700, marginBottom: 8 }}>What Groundwork saw</div>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,.93)' }}>{sessionReport.whatGroundworkSaw}</p>
                </div>

                {/* Alignment status */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, letterSpacing: '.09em', textTransform: 'uppercase', color: '#9B9590', fontWeight: 700, marginBottom: 6 }}>Alignment status</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: '#1A1916' }}>{sessionReport.alignmentStatus}</div>
                  <div style={{ fontSize: 12, color: '#6B6560', marginTop: 3, lineHeight: 1.5 }}>{sessionReport.alignmentBasis}</div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
                    {(['Unresolved','Mixed','Emerging','Clear','Aligned'] as const).map(s => {
                      const order = ['Unresolved','Mixed','Emerging','Clear','Aligned']
                      const on = order.indexOf(s) <= order.indexOf(sessionReport.alignmentStatus)
                      const fullyAligned = sessionReport.alignmentStatus === 'Aligned'
                      const bg = on ? (fullyAligned ? '#085041' : '#0C447C') : '#EFEDE8'
                      return (
                        <div key={s} style={{ flex: 1, textAlign: 'center', fontSize: 9, letterSpacing: '.03em', textTransform: 'uppercase', padding: '5px 2px', borderRadius: 5, fontWeight: 700, background: bg, color: on ? 'white' : '#9B9590' }}>{s}</div>
                      )
                    })}
                  </div>
                </div>

                {/* Areas requiring alignment */}
                {sessionReport.areasRequiringAlignment.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, letterSpacing: '.09em', textTransform: 'uppercase', color: '#9B9590', fontWeight: 700, marginBottom: 8 }}>Areas requiring alignment</div>
                    {sessionReport.areasRequiringAlignment.map((a, i) => (
                      <div key={i} style={{ border: '1px solid #E2E0DB', borderLeft: '3px solid #E8A94A', borderRadius: 10, padding: '11px 13px', marginBottom: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 7 }}>{a.title}</div>
                        <div style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 5 }}><span style={{ fontSize: 9, letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700, color: '#9B9590', display: 'block', marginBottom: 1 }}>Observation</span>{a.observation}</div>
                        <div style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 5 }}><span style={{ fontSize: 9, letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700, color: '#9B9590', display: 'block', marginBottom: 1 }}>Why it matters</span>{a.whyItMatters}</div>
                        <div style={{ background: '#E7F6EF', borderRadius: 7, padding: '7px 9px', fontSize: 12, color: '#085041', lineHeight: 1.5 }}><span style={{ fontSize: 9, letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700, color: '#085041', opacity: .75, display: 'block', marginBottom: 2 }}>Recommended move</span>{a.recommendedMove}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Alignment reached */}
                {sessionReport.alignmentReached.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, letterSpacing: '.09em', textTransform: 'uppercase', color: '#9B9590', fontWeight: 700, marginBottom: 8 }}>Alignment reached</div>
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

                {/* Honest close */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, letterSpacing: '.09em', textTransform: 'uppercase', color: '#9B9590', fontWeight: 700, marginBottom: 8 }}>An honest close</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      { k: 'Aligned', v: sessionReport.honestClose.aligned, bg: '#E7F6EF', kc: '#085041' },
                      { k: 'Open',    v: sessionReport.honestClose.open,    bg: '#FDF3E3', kc: '#8A5C1A' },
                      { k: 'Revisit', v: sessionReport.honestClose.revisit, bg: '#EEF4FB', kc: '#0C447C' },
                      { k: 'Risk',    v: sessionReport.honestClose.risk,    bg: '#F8ECEA', kc: '#B5675A' },
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

            {/* Divider */}
            <div style={{ borderTop: '1px solid #E2E0DB', marginBottom: 18 }} />

            {/* Ground + org naming */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6B6560', marginBottom: 6 }}>Name this ground</div>
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
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                {(['ONE_TIME', 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY'] as const).map(c => (
                  <button key={c} onClick={() => setCadence(c)} style={{
                    flex: 1, padding: '9px 0', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    border: `1px solid ${cadence === c ? '#0C447C' : '#E2E0DB'}`,
                    background: cadence === c ? '#EEF4FB' : 'white',
                    color: cadence === c ? '#0C447C' : '#6B6560',
                  }}>
                    {c === 'FORTNIGHTLY' ? 'Every 2 weeks' : c === 'ONE_TIME' ? 'One time' : c.charAt(0) + c.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: '#9B9590', marginBottom: 10, lineHeight: 1.5 }}>
                {cadence === 'ONE_TIME' ? 'Single session · one account per party, no follow-up cadence.' :
                 cadence === 'WEEKLY' ? 'Weekly · typical resolution in 4–6 weeks.' :
                 cadence === 'MONTHLY' ? 'Monthly · typical resolution in 3–4 months.' :
                 'Every 2 weeks · typical resolution in 6–8 weeks.'}
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
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#6B6560', marginBottom: 4 }}>First check-in</div>
                    <input
                      type="date" value={checkInBy}
                      onChange={e => setCheckInBy(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${emailError && !checkInBy ? '#C0392B' : '#E2E0DB'}`, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', color: checkInBy ? '#1A1916' : '#9B9590' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#6B6560', marginBottom: 4 }}>Last check-in <span style={{ fontWeight: 400 }}>(optional)</span></div>
                    <input
                      type="date" value={lastCheckInBy}
                      onChange={e => setLastCheckInBy(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E0DB', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', color: lastCheckInBy ? '#1A1916' : '#9B9590' }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Invite contributors — before create account */}
            <div style={{ borderBottom: '1px solid #E2E0DB', marginBottom: 16, paddingBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6B6560', marginBottom: 4 }}>Invite contributors</div>
              <div style={{ fontSize: 12, color: '#9B9590', lineHeight: 1.55, marginBottom: 10 }}>
                Each person checks in independently and adds their own contribution to this ground's record. Nobody reads anyone else's words directly. When all accounts are in, the report shows where everyone agrees, where they differ, and what the gap means.
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

            {/* Create account — after invite so ground is fully configured first */}
            {!emailSent ? (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6B6560', marginBottom: 4 }}>Create your account</div>
                <div style={{ fontSize: 12, color: '#9B9590', marginBottom: 8, lineHeight: 1.5 }}>Enter your email to save this ground and send invites. You will receive the report when it is ready. You can add more contributors any time after.</div>
                <input type="email" placeholder="you@company.com" value={email} onChange={e => { setEmail(e.target.value); setEmailError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  style={{ width: '100%', padding: '11px 13px', borderRadius: 8, border: '1px solid #E2E0DB', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 8, outline: 'none' }}
                />
                {emailError && <div style={{ fontSize: 12, color: '#791F1F', marginBottom: 6 }}>{emailError}</div>}
                <button onClick={handleSave} style={{ width: '100%', padding: '12px 16px', borderRadius: 8, background: '#0C447C', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Create account →
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '10px 0', marginBottom: 16 }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>✓</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Check your email</div>
                <div style={{ fontSize: 13, color: '#6B6560', lineHeight: 1.6 }}>We sent a link to <strong>{email}</strong>. Click it to finish setting up your account and set a password.</div>
              </div>
            )}

            <div onClick={() => setShowSave(false)} style={{ textAlign: 'center', fontSize: 12, color: '#9B9590', cursor: 'pointer', paddingTop: 4 }}>
              {closed ? 'Close (you can reopen this from the bar below)' : 'Later'}
            </div>
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
                    setOnboardingMessages(buildOnboardingMessages(pendingNewScenario.sels))
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
              Your responses are already saved. Ending closes this session permanently — you will not be able to add to it.
            </div>
            <div style={{ fontSize: 13, color: '#6B6560', lineHeight: 1.65, marginBottom: 18 }}>
              The shared report releases once all parties have checked in. You can start a new session any time.
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
