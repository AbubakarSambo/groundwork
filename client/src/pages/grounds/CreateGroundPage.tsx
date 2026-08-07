import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { endStatesFor } from '@/lib/end-states'
import { useMutation, useQuery } from '@tanstack/react-query'
import { groundsApi, type GroundScenario, type GroundMoment, type GroundCadence } from '@/api/grounds'
import { TIMED_CADENCES, sessionsFor } from '@/lib/cadence'
import { billingApi, FREE_GROUND_LIMIT } from '@/api/billing'
import { entryApi } from '@/api/entry'
import { toast } from 'sonner'

interface ScenarioCard {
  // Unique per CARD, not per scenario: two cards can map to the same scenario
  // key (the realignment card and the describe-your-own card both use
  // REALIGN_TEAM's pack), so selection tracks the card, while what is SENT to
  // the API is always the untouched scenario enum key.
  cardKey: string
  scenario: GroundScenario
  label: string
  desc: string
  tag: string
  tagBg: string
  tagColor: string
  // Recognizer lines ("e.g. ...") shown under the description so people can
  // self-select from concrete situations, not abstract labels.
  examples?: string[]
}

// Reframed per FEATURE_scenario_reframe.md: action-focused labels, plain
// descriptions, and recognizer sub-examples. DISPLAY ONLY - every card still
// submits its untouched GroundScenario enum key; packs, classifier keys, and
// the report schema are unchanged.
export const SCENARIOS: ScenarioCard[] = [
  { cardKey: 'NEW_HIRE', scenario: 'NEW_HIRE', label: 'New hire', tag: 'Starting', tagBg: '#E8F8F5', tagColor: '#085041',
    desc: 'Get you and a new hire on the same page about the role, expectations, and what early success looks like, before anything drifts. You each answer separately; the report shows where you already match and where you do not.',
    examples: [
      'Someone starts Monday and you want to be sure you both mean the same thing by "doing well."',
      'You just hired a senior person and need what they own pinned down before day one.',
      'A new joiner and their manager each writing what success looks like in the first 90 days.',
    ] },
  { cardKey: 'NEW_PROJECT', scenario: 'NEW_PROJECT', label: 'New project', tag: 'Starting', tagBg: '#E8F8F5', tagColor: '#085041',
    desc: 'Line everyone up on scope, ownership, and what "done" means before the work starts. Each person answers on their own; the report shows the gaps to close first.',
    examples: [
      'Kicking off a build and you want scope and "done" agreed before anyone writes code.',
      'A cross-team project where each team quietly assumes a different owner.',
      'Starting work with a client and you want both sides\' version of the goal on record.',
    ] },
  { cardKey: 'NEW_ADVISOR', scenario: 'NEW_ADVISOR', label: 'New advisor or board member', tag: 'Starting', tagBg: '#E8F8F5', tagColor: '#085041',
    desc: 'Pin down what the advisor will actually contribute, on what terms, so "available" does not quietly stand in for "contributing."',
    examples: [
      'Bringing on an advisor for equity and you want it clear what they will actually do for it.',
      'A new board member joining, each side writing what they expect from the relationship.',
    ] },
  { cardKey: 'NEW_COFOUNDER', scenario: 'NEW_COFOUNDER', label: 'New partner or co-founder', tag: 'Starting', tagBg: '#E8F8F5', tagColor: '#085041',
    desc: 'Put what each of you expects to build, own, and contribute in writing, before those assumptions collide.',
    examples: [
      'You and a co-founder splitting equity and roles and want the assumptions said out loud first.',
      'A new equal partner joining the founding team.',
    ] },
  { cardKey: 'NEW_MANAGER', scenario: 'NEW_MANAGER', label: 'New manager or lead', tag: 'Starting', tagBg: '#E8F8F5', tagColor: '#085041',
    desc: 'Get clear on scope, reporting, and success for someone stepping into an existing team or role.',
    examples: [
      'An interim leader stepping into an existing team for six months.',
      'A new manager taking over mid-project and you want scope and authority clear.',
    ] },
  { cardKey: 'CONTRACT_RENEWAL', scenario: 'CONTRACT_RENEWAL', label: 'Contract or renewal', tag: 'Renewal', tagBg: '#EEF4FB', tagColor: '#0C447C',
    desc: 'Both sides give an honest account of how the term actually went, and what a fair next one looks like.',
    examples: [
      'A contractor\'s term is ending and you are deciding whether to renew.',
      'An agency engagement up for renewal and you want an honest account of what got delivered.',
    ] },
  { cardKey: 'RECOGNITION', scenario: 'RECOGNITION', label: 'Raise, promotion, or recognition', tag: 'Recognition', tagBg: '#FDF3E3', tagColor: '#8A5C1A',
    desc: 'Build the evidence behind the ask before the conversation, and see how the decision-maker reads the same record, so you both start from the same picture.',
    examples: [
      'You are going to ask for a raise and want the evidence lined up first.',
      'Someone is up for promotion and you want their record and your read to match before the talk.',
    ] },
  { cardKey: 'PIP', scenario: 'PIP', label: 'Performance improvement plan', tag: 'Accountability', tagBg: '#FCEBEB', tagColor: '#791F1F',
    desc: 'Run a fair plan with both sides on the same page: the concern, the support available, and what success looks like at the end.',
    examples: [
      'You are putting someone on a formal plan and want both sides on the concern and what success looks like.',
      'A capability concern where you want a fair record, not a he-said-she-said.',
    ] },
  { cardKey: 'OKR_ALIGNMENT', scenario: 'OKR_ALIGNMENT', label: 'Goals & planning', tag: 'Planning', tagBg: '#EEF4FB', tagColor: '#0C447C',
    desc: 'Check everyone is genuinely on the same goals and plan, and catch the gaps and overlaps before the cycle locks in.',
    examples: [
      'Planning season and you want to check everyone\'s goals actually connect before they lock.',
      'Two teams whose objectives depend on each other and you are not sure the handoff is agreed.',
    ] },
  { cardKey: 'WORKPLAN_BUDGET', scenario: 'WORKPLAN_BUDGET', label: 'Workplan & budget', tag: 'Planning', tagBg: '#EEF4FB', tagColor: '#0C447C',
    desc: 'Check each person has actually built their plan and budget, and that it holds up against the resources available.',
    examples: [
      'Start of the quarter and you want each person\'s plan and budget to hold up against real resources.',
      'A plan that looks fine on paper but you suspect the budget behind it was assumed, not approved.',
    ] },
  { cardKey: 'PULSE_CHECK', scenario: 'PULSE_CHECK', label: 'Quick check-in', tag: 'Recurring', tagBg: '#E8F8F5', tagColor: '#085041',
    desc: 'A fast, repeatable read from each person: what is moving, what is stuck, what has changed. About five minutes.',
    examples: [
      'A fast fortnightly read from each person on what is moving and what is stuck.',
      'You want a lightweight recurring signal without calling a meeting.',
    ] },
  { cardKey: 'DRIFT', scenario: 'DRIFT', label: 'Something\'s off track', tag: 'Off track', tagBg: '#FDF3E3', tagColor: '#8A5C1A',
    desc: 'Name what was agreed, what actually happened, and the exact gap, so a vague worry becomes something you can act on. Fits a person not delivering, a project that has slipped, or a partnership under strain.',
    examples: [
      'A project blew up or is badly behind and everyone has a different story about why.',
      'A senior hire is not delivering what they were brought in to do.',
      'Cash is tight and you need everyone seeing the same runway and what has to change.',
    ] },
  { cardKey: 'BOARD_STRATEGY', scenario: 'BOARD_STRATEGY', label: 'Board & leadership strategy', tag: 'Leadership', tagBg: '#EEF4FB', tagColor: '#0C447C',
    desc: 'Each leader gives their own read on strategy before the room debates it, so quiet disagreement shows up now, not after the decision.',
    examples: [
      'Before a strategy offsite, you want each leader\'s real read so quiet disagreement shows up early.',
      'The board looks aligned in the room but you suspect it is not on one big bet.',
    ] },
  { cardKey: 'COHORT_CHECK', scenario: 'COHORT_CHECK', label: 'Cohort check-in', tag: 'Recurring', tagBg: '#E8F8F5', tagColor: '#085041',
    desc: 'An ongoing read from many people in the same role, each answering on their own. See the pattern, who is on track and who is stuck, without them swaying each other. For a group who are new, use "Onboarding a group" instead.',
    examples: [
      'Twenty field officers each answering the same question so you can see the pattern.',
      'A training cohort where you want to see who is on track and who is stuck without them influencing each other.',
    ] },
  // ONBOARDING A GROUP, WHERE THE PERIOD ALSO DECIDES SOMETHING.
  //
  // There was no home for this. The half about settling people in mapped to "New
  // hire", which is one person and their manager; the half about many people at
  // once mapped to "Cohort check-in", which reads as a recurring pulse with no
  // beginning or end; and the half about deciding whether someone is right for
  // the role mapped only to "Performance improvement plan", which is a far more
  // loaded thing to pick and would be the wrong thing to tell four new starters
  // they are on. Someone onboarding a cohort had to choose which third of their
  // situation to describe. It runs on the cohort machinery, which is the correct
  // shape - separate people, same questions, no swaying each other - and says so
  // in language the person actually has in their head.
  { cardKey: 'COHORT_ONBOARDING', scenario: 'COHORT_CHECK', label: 'Onboarding a group', tag: 'Starting', tagBg: '#E8F8F5', tagColor: '#085041',
    desc: 'Several people starting the same role at once, each answering on their own. Settle them in, and see early who is finding it and who is struggling, before the end of the period decides anything.',
    examples: [
      'Four new managers on a three month onboarding that is also their probation.',
      'A cohort of new starters where you need to know by month two, not month three, who needs help.',
      'Trainees in different locations who never work together but are all learning the same job.',
    ] },
  { cardKey: 'ACUTE_SHOCK', scenario: 'ACUTE_SHOCK', label: 'A shock just hit', tag: 'Urgent', tagBg: '#FCEBEB', tagColor: '#791F1F',
    desc: 'A jarring event just happened. Get everyone\'s honest read of what actually happened and where things really stand, before anyone decides anything.',
    examples: [
      'A major client pulled out overnight and everyone has a different version of why.',
      'An incident just took things down and people are scrambling to understand what happened.',
      'Sudden bad news hit the team and you want honest reads before any decisions get made.',
    ] },
  { cardKey: 'REALIGN_TEAM', scenario: 'REALIGN_TEAM', label: 'Get a team back on the same page', tag: 'Team', tagBg: '#FDF3E3', tagColor: '#8A5C1A',
    desc: 'You and your team see the situation differently. Each person gives their honest read before the group talks, so the conversation starts from a shared picture.',
    examples: [
      'The team is pulling two ways on a decision and you want each person\'s honest read before the meeting.',
      'Priorities shifted and everyone is working off a different idea of what matters now.',
      'After a reorg or a change, the team quietly disagrees about where things stand.',
    ] },
  // The genuine free-text path, separated from the realignment scenario above.
  // It runs on REALIGN_TEAM's general pack and leans on the brief the person
  // writes; a later iteration can route it through classifyIntent.
  // "Anything else" quietly resolved to REALIGN_TEAM, which is a private,
  // board-less sensing ground. So whatever the person described - a project
  // kickoff, a renewal, a cohort - they got a shape chosen for them and never
  // saw a board. It says what it will do now, and the copy no longer promises
  // that we will work out the right ground, because nothing does that.
  { cardKey: 'DESCRIBE_OWN', scenario: 'REALIGN_TEAM', label: 'Describe your own situation', tag: 'Anything else', tagBg: '#F5F3EF', tagColor: '#6B6560',
    desc: 'None of these quite fit? Describe it in your own words and we will open a ground where each person gives their own read first, privately, before anyone talks. If it turns out to be one of the situations above, pick that instead - it shapes the questions people are asked.' },
]

interface MomentOption { moment: GroundMoment; label: string; sub: string }
const MOMENTS: MomentOption[] = [
  { moment: 'STARTING',    label: 'At the start',    sub: 'Set expectations before the work begins.' },
  { moment: 'RECOGNITION', label: 'Mid-way',          sub: 'Acknowledge progress. Name what has changed.' },
  { moment: 'RESOLUTION',  label: 'Reaching an end',  sub: 'Close a chapter. Agree on what happened.' },

]


interface Participant { email: string; role: string; note: string }

const SCENARIO_FROM_LABEL: Record<string, GroundScenario> = {
  'new hire':           'NEW_HIRE',
  'new project':        'NEW_PROJECT',
  'new board member':   'NEW_ADVISOR',
  'new partner':        'NEW_COFOUNDER',
  'contract renewal':   'CONTRACT_RENEWAL',
  'new direction':      'DRIFT',
  'pip':                'PIP',
  'goals & planning':   'OKR_ALIGNMENT',
  'pulse check':        'PULSE_CHECK',
  'board strategy':     'BOARD_STRATEGY',
  'cohort check-in':    'COHORT_CHECK',
  'realign a project':  'DRIFT',
  'realign with a team member': 'REALIGN_TEAM',
  'a shock just hit':   'ACUTE_SHOCK',
  'other':              'REALIGN_TEAM',
  // Reframed labels (old labels above are kept so existing links keep working).
  'new advisor or board member': 'NEW_ADVISOR',
  'new partner or co-founder': 'NEW_COFOUNDER',
  'new manager or lead': 'NEW_MANAGER',
  'contract or renewal': 'CONTRACT_RENEWAL',
  'raise, promotion, or recognition': 'RECOGNITION',
  'performance improvement plan': 'PIP',
  'workplan & budget':  'WORKPLAN_BUDGET',
  'quick check-in':     'PULSE_CHECK',
  "something's off track": 'DRIFT',
  'board & leadership strategy': 'BOARD_STRATEGY',
  'get a team back on the same page': 'REALIGN_TEAM',
  'describe your own situation': 'REALIGN_TEAM',
}

function scenarioFromParam(param: string | null): GroundScenario | null {
  if (!param) return null
  return SCENARIO_FROM_LABEL[param.toLowerCase().replace(/\+/g, ' ')] ?? null
}

// Step numbering: 1=scenario, 1.5=billing (stored as step=2 internally), 2=timeframe (step=3), 3=participants (step=4), 4=resolution (step=5), 5=brief (step=6)
// We use integer steps internally: 1,2,3,4,5,6
const TOTAL_STEPS = 6

export function CreateGroundPage() {
  // Asked once, on load, so the answer is on screen before any effort is spent.
  const canCreate = useQuery({
    queryKey: ['can-create-ground'],
    queryFn: () => billingApi.checkCanCreateGround(),
    retry: false,
  })
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState(1)

  const [scenario, setScenario] = useState<GroundScenario | null>(
    () => scenarioFromParam(searchParams.get('scenario'))
  )
  // Selection is per CARD (two cards share REALIGN_TEAM: the realignment card
  // and the describe-your-own card). `scenario` above stays the enum key that
  // is actually submitted.
  const [selectedCard, setSelectedCard] = useState<string | null>(
    () => {
      const s = scenarioFromParam(searchParams.get('scenario'))
      // Prefer the card the person actually picked. Two cards share
      // COHORT_CHECK - an ongoing pulse and a fixed onboarding period - so
      // resolving by scenario alone silently returned whichever came first in
      // the list, and someone restoring an "Onboarding a group" draft found
      // "Cohort check-in" selected instead.
      const savedCard = sessionStorage.getItem('gw-new-ground-card')
      if (savedCard && SCENARIOS.some(c => c.cardKey === savedCard)) return savedCard
      return s ? (SCENARIOS.find(c => c.scenario === s)?.cardKey ?? null) : null
    }
  )
  const [moment, setMoment] = useState<GroundMoment | null>(null)
  const [timelineDays, setTimelineDays] = useState(90)
  const [cadence, setCadence] = useState<GroundCadence>('FORTNIGHTLY')
  const [participants, setParticipants] = useState<Participant[]>([])
  const [pEmail, setPEmail] = useState('')
  const [pRole, setPRole] = useState('')
  const [pNote, setPNote] = useState('')
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [resolutionState, setResolutionState] = useState<string | null>(null)
  const [brief, setBrief] = useState('')
  /**
   * Is the person setting this up part of it themselves?
   *
   * The main create flow never asked. Only the guided /entry walkthrough did, so
   * an admin who opened a ground from the app was silently made a party to it -
   * or silently left out of it - without ever being offered the choice, and the
   * first they knew was a check-in link arriving for a project they only
   * administer. It is a one-line question and it changes who is measured.
   */
  const [alsoAParty, setAlsoAParty] = useState<boolean | null>(null)
  const [myRemit, setMyRemit] = useState('')
  /**
   * Does someone ELSE run this ground?
   *
   * There were two creation paths and neither could do the whole job. This one
   * had all seventeen situations and a timeframe but no way to say another
   * person runs it; the other could name a lead but offered five situations and
   * never asked how long the ground runs. An admin opening a three-month
   * onboarding led by a colleague could not express that in either. Asking here
   * folds the second path into this one.
   */
  /**
   * The free-text path. Whatever someone typed here used to be thrown away and
   * the ground opened as REALIGN_TEAM - private, no board - so a person who
   * described a probation cohort in detail got a container that cannot run one.
   * The classifier that reads a description and picks a scenario already exists
   * and is used by the guided walkthrough; this just asks it, and then SHOWS
   * the answer rather than applying it silently. Which scenario it picks matters
   * less than the person being able to see and change it, because that choice
   * decides the board, the mode and the questions everyone gets asked.
   */
  const [ownDescription, setOwnDescription] = useState('')
  const [routing, setRouting] = useState(false)
  const [routedTo, setRoutedTo] = useState<GroundScenario | null>(null)
  const [routeFailed, setRouteFailed] = useState(false)
  const [runByOther, setRunByOther] = useState(false)
  const [leadEmail, setLeadEmail] = useState('')
  const [leadName, setLeadName] = useState('')
  const [leadRemit, setLeadRemit] = useState('')
  const [groundName, setGroundName] = useState('')

  // Billing step state
  const [billingChecked, setBillingChecked] = useState(false)
  const [billingFree, setBillingFree] = useState(false)
  const [groundsUsed, setGroundsUsed] = useState<number | null>(null)
  const [showCodeInput, setShowCodeInput] = useState(false)
  const [codeInput, setCodeInput] = useState('')
  const [codeApplied, setCodeApplied] = useState(false)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [codeChecking, setCodeChecking] = useState(false)
  const [appliedAccessCode, setAppliedAccessCode] = useState<string | null>(null)
  const [billingLoading, setBillingLoading] = useState(false)

  const sessionTotal = sessionsFor(timelineDays, cadence) ?? 1

  const briefWords = brief.trim() ? brief.trim().split(/\s+/).length : 0
  const briefShort = briefWords > 0 && briefWords < 20

  // When entering step 2 (billing), auto-check
  useEffect(() => {
    if (step === 2 && !billingChecked) {
      setBillingLoading(true)
      billingApi.checkCanCreateGround().then(res => {
        setBillingChecked(true)
        setBillingLoading(false)
        if (res.groundsUsed != null) setGroundsUsed(res.groundsUsed)
        if (res.allowed) {
          setBillingFree(true)
        } else {
          setBillingFree(false)
        }
      }).catch(() => {
        setBillingChecked(true)
        setBillingLoading(false)
        setBillingFree(false)
      })
    }
  }, [step, billingChecked])

  async function applyCode() {
    if (!codeInput.trim()) return
    setCodeChecking(true)
    setCodeError(null)
    try {
      const res = await billingApi.checkCanCreateGround(codeInput.trim())
      if (res.allowed && res.freeReason) {
        setCodeApplied(true)
        setAppliedAccessCode(codeInput.trim())
        setCodeError(null)
      } else {
        setCodeError('This code is not valid or has already been used.')
      }
    } catch {
      setCodeError('Could not validate the code. Try again.')
    } finally {
      setCodeChecking(false)
    }
  }

  const create = useMutation({
    mutationFn: async () => {
      // Handing the ground to a lead is a different creation call, but it is the
      // same set of answers - so it is the same flow, not a second form that
      // happens to be missing half the fields.
      if (runByOther) {
        const ground = await groundsApi.createForLead({
          leadEmail: leadEmail.trim(),
          leadName: leadName.trim() || undefined,
          leadRemit: leadRemit.trim() || undefined,
          label: groundName.trim() || `${scenario?.replace(/_/g, ' ')} ground`,
          scenario: scenario!,
          moment: moment!,
          timelineDays,
          cadence,
          brief: (brief.trim() || ownDescription.trim()) || undefined,
          participants: participants.length
            ? participants.map((p) => ({ email: p.email, roleAsDescribed: p.role || undefined }))
            : undefined,
        })
        return { ground, failedInvites: 0 }
      }
      const ground = await groundsApi.create({
        label: groundName.trim() || `${scenario?.replace(/_/g, ' ')} ground`,
        scenario: scenario!,
        moment: moment!,
        timelineDays,
        cadence,
        resolutionState: resolutionState ?? undefined,
        brief: (brief.trim() || ownDescription.trim()) || undefined,
        ...(appliedAccessCode ? { accessCode: appliedAccessCode } : {}),
      } as Parameters<typeof groundsApi.create>[0] & { accessCode?: string })
      // Use allSettled so a failed invite email never blocks navigation to the
      // newly-created ground. Failed invites are surfaced as warnings after redirect.
      // Record whether the person opening this is a party to it before anyone is
      // invited, so the very first check-in round already knows who it is for.
      if (alsoAParty !== null) {
        try {
          await groundsApi.confirmLead(ground.id, {
            managingOnly: !alsoAParty,
            remit: alsoAParty ? (myRemit.trim() || undefined) : undefined,
          })
        } catch {
          // Non-fatal: the same choice can still be made on the ground page.
        }
      }
      const results = await Promise.allSettled(participants.map(p =>
        groundsApi.addParticipant(ground.id, { email: p.email, roleAsDescribed: p.role || undefined, note: p.note || undefined })
      ))
      const failed = results.filter(r => r.status === 'rejected').length
      return { ground, failedInvites: failed }
    },
    onSuccess: ({ ground, failedInvites }) => {
      toast.success('Ground opened')
      if (failedInvites > 0) toast.warning(`${failedInvites} invite${failedInvites > 1 ? 's' : ''} could not be sent. You can retry from the ground page.`)
      navigate(`/grounds/${ground.id}`)
    },
    onError: () => toast.error('Could not open ground. Try again.'),
  })

  function addParticipant() {
    const email = pEmail.trim()
    if (!email || !email.includes('@')) return
    if (participants.find(p => p.email === email)) return
    setParticipants(v => [...v, { email, role: pRole.trim(), note: pNote.trim() }])
    setPEmail(''); setPRole(''); setPNote('')
  }

  function addBulk() {
    const emails = bulkText.split(/[\n,;]+/).map(e => e.trim()).filter(e => e.includes('@'))
    const fresh = emails.filter(e => !participants.find(p => p.email === e))
    setParticipants(v => [...v, ...fresh.map(e => ({ email: e, role: '', note: '' }))])
    setBulkText('')
    setBulkMode(false)
  }

  function back() {
    if (step > 1) setStep(s => s - 1)
    else navigate('/grounds')
  }

  // Display dot index: step 1 → dot 1, step 2 (billing) → dot 2, steps 3-6 → dots 3-6
  // We show TOTAL_STEPS dots (6), mapping internal step directly
  const displayStep = step

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      <div className="gw-hdr">
        <a href="https://myground.work" target="_blank" rel="noopener noreferrer" className="gw-logo" style={{ textDecoration: 'none', color: 'inherit' }}>Groundwork</a>
        <button className="gw-back" onClick={back}>← Back</button>
      </div>

      <div className="gw-bd" style={{ maxWidth: 540, margin: '0 auto', width: '100%' }}>
        {/* Step dots */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(n => (
            <div key={n} className={`cg-step-dot${displayStep === n ? ' active' : displayStep > n ? ' done' : ''}`} />
          ))}
        </div>

        {/* Step 1: Scenario + Moment */}
        {step === 1 && (
          <div>
            {/* Say the limit is reached BEFORE the setup work, not after it.
                The API refuses an eleventh ground correctly, but it refused it
                at submit - so the admin picked a card, named the ground, set
                the timeline and the people, and only then was told she could
                not. The block was right; the timing made it feel like a trick. */}
            {canCreate.data && !canCreate.data.allowed && (
              <div style={{ background: '#FDF3E3', border: '1px solid #F0DFC0', borderRadius: 8, padding: '12px 14px', marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#8A5C1A', marginBottom: 4 }}>
                  You have used all {FREE_GROUND_LIMIT} of your free grounds
                </div>
                <div style={{ fontSize: 12.5, color: '#6B6560', lineHeight: 1.6, marginBottom: 10 }}>
                  {canCreate.data.reason ?? 'Subscribe to open more grounds.'} You can still look
                  around here, but this one cannot be created until then.
                </div>
                <button
                  onClick={() => navigate('/billing')}
                  style={{ padding: '8px 16px', borderRadius: 7, background: '#0A1628', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  See plans
                </button>
              </div>
            )}
            <div className="gw-ttl">What is this ground for?</div>
            <div className="gw-sub-t">Select the situation that fits best.</div>
            <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginBottom: 10 }}>Choose one that best describes your situation.</div>
            {/* Real radios, not clickable divs. The cards were reachable only by
                mouse: nothing focused, nothing announced itself as a choice, and
                arrow keys did nothing - so the very first step of the product was
                unusable from a keyboard or a screen reader. */}
            <div role="radiogroup" aria-label="What is this ground for?" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginBottom: 24 }}>
              {SCENARIOS.map(s => (
                <div
                  key={s.cardKey}
                  role="radio"
                  tabIndex={selectedCard === s.cardKey || (!selectedCard && s.cardKey === SCENARIOS[0].cardKey) ? 0 : -1}
                  aria-checked={selectedCard === s.cardKey}
                  aria-label={`${s.label}. ${s.desc}`}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setScenario(s.scenario); setSelectedCard(s.cardKey); sessionStorage.setItem('gw-new-ground-card', s.cardKey) }
                  }}
                  className={`cg-sit-card${selectedCard === s.cardKey ? ' selected' : ''}`}
                  onClick={() => { setScenario(s.scenario); setSelectedCard(s.cardKey); sessionStorage.setItem('gw-new-ground-card', s.cardKey) }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: s.tagBg, color: s.tagColor }}>{s.tag}</span>
                    <div className="cg-sit-radio" style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${selectedCard === s.cardKey ? 'var(--gw-navy)' : 'var(--gw-border)'}`, background: selectedCard === s.cardKey ? 'var(--gw-navy)' : 'transparent', flexShrink: 0 }} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{s.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.5 }}>{s.desc}</div>
                  {s.examples && s.examples.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      {s.examples.map((ex, i) => (
                        <div key={i} style={{ fontSize: 11, color: 'var(--gw-muted)', lineHeight: 1.5 }}>e.g. {ex}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {selectedCard === 'DESCRIBE_OWN' && (
              <div style={{ border: '1px solid var(--gw-border)', borderRadius: 10, padding: '14px 16px', marginBottom: 18, background: 'white' }}>
                <label className="gw-label" htmlFor="own-situation">Describe it in your own words</label>
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 8, lineHeight: 1.5 }}>
                  What is happening, who is involved, and what you want out of it. We will suggest the closest
                  situation and you can change it - what gets picked decides the questions people are asked.
                </div>
                <textarea id="own-situation" className="gw-in" rows={4} value={ownDescription}
                  onChange={(e) => { setOwnDescription(e.target.value); setRoutedTo(null); setRouteFailed(false) }}
                  placeholder="e.g. Four new clinic managers on a three month probation. They run separate clinics and never work together, but they all report to me." />
                <button
                  disabled={ownDescription.trim().length < 20 || routing}
                  onClick={() => {
                    setRouting(true); setRouteFailed(false)
                    entryApi.classifyIntent(ownDescription.trim())
                      .then((r: any) => {
                        const picked = r?.scenario as GroundScenario | undefined
                        if (picked && SCENARIOS.some(c => c.scenario === picked)) { setRoutedTo(picked); setScenario(picked) }
                        else setRouteFailed(true)
                      })
                      .catch(() => setRouteFailed(true))
                      .finally(() => setRouting(false))
                  }}
                  style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: 'white', background: 'var(--gw-navy)', border: 'none', borderRadius: 7, padding: '8px 14px', cursor: 'pointer', fontFamily: 'inherit', opacity: ownDescription.trim().length < 20 || routing ? 0.45 : 1 }}>
                  {routing ? 'Reading it…' : 'Find the closest situation'}
                </button>

                {routedTo && (
                  <div style={{ marginTop: 10, fontSize: 12.5, lineHeight: 1.55, background: 'var(--gw-blue-bg)', border: '1px solid var(--gw-blue-b)', borderRadius: 8, padding: '10px 12px' }}>
                    From what you wrote, this looks like <b>{SCENARIOS.find(c => c.scenario === routedTo)?.label}</b>.
                    That is what we will set up. If it is not right, pick a card above instead - your description is
                    kept either way.
                  </div>
                )}
                {routeFailed && (
                  <div style={{ marginTop: 10, fontSize: 12.5, lineHeight: 1.55, background: 'var(--gw-amber-bg)', border: '1px solid var(--gw-amber-b)', borderRadius: 8, padding: '10px 12px' }}>
                    {/* Saying so beats picking one quietly. The shape decides the
                        board, the mode and the questions - too much to guess at. */}
                    We could not tell which situation this is closest to. We will open a general ground where each
                    person gives their own read privately, which works for most things - or pick a card above if one fits.
                  </div>
                )}
              </div>
            )}

            {scenario && (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Where are you in this situation?</div>
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 6 }}>Are you just starting, mid-way through, or wrapping up? This shapes the questions each contributor answers.</div>
                <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginBottom: 10 }}>Choose one that best describes your situation.</div>
                <div role="radiogroup" aria-label="Where are you in this situation?" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  {MOMENTS.map(m => (
                    <div
                      key={m.moment}
                      role="radio"
                      tabIndex={moment === m.moment || (!moment && m.moment === MOMENTS[0].moment) ? 0 : -1}
                      aria-checked={moment === m.moment}
                      aria-label={`${m.label}. ${m.sub}`}
                      onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setMoment(m.moment) } }}
                      className={`cg-sit-card${moment === m.moment ? ' selected' : ''}`}
                      onClick={() => setMoment(m.moment)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{m.label}</div>
                        <div className="cg-sit-radio" style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${moment === m.moment ? 'var(--gw-navy)' : 'var(--gw-border)'}`, background: moment === m.moment ? 'var(--gw-navy)' : 'transparent', flexShrink: 0 }} />
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--gw-sub)' }}>{m.sub}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Fixed action bar: the 17-card grid pushes the page well past
                any laptop fold, and position:sticky binds to the .gw-bd
                overflow ancestor (which is not what actually scrolls here),
                so the bar is FIXED to the real viewport instead. Suite L
                enforces its visibility at 1366x768 and 1280x720. */}
            <div style={{ height: 76 }} />
            <div className="cg-fixed-bar" style={{ background: 'var(--gw-bg)', borderTop: '1px solid var(--gw-border)', padding: '10px 20px', zIndex: 20 }}>
              <div style={{ width: 'min(560px, 100%)' }}>
                {/* On the free-text path, the description has to have been read
                    before we move on - otherwise the ground silently becomes
                    whatever the card happens to default to, which is the whole
                    bug this replaces. */}
                {(() => {
                  const needsRouting = selectedCard === 'DESCRIBE_OWN' && !routedTo && !routeFailed
                  const blocked = !scenario || !moment || needsRouting
                  return (
                    <>
                      <button className="gw-btn" disabled={blocked} onClick={() => setStep(2)} style={{ margin: 0 }}>Continue</button>
                      {blocked ? (
                        <div style={{ fontSize: 11, color: 'var(--gw-sub)', textAlign: 'center', marginTop: 5 }}>
                          {needsRouting
                            ? 'Describe the situation above, then let us find the closest match'
                            : !scenario ? 'Pick a situation to continue' : 'Pick where you are in it (below the cards) to continue'}
                        </div>
                      ) : null}
                    </>
                  )
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Step 2 (1.5): Billing check */}
        {step === 2 && (
          <div>
            <div className="gw-ttl">Before you continue</div>

            {billingLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '32px 0', color: 'var(--gw-sub)', fontSize: 14 }}>
                <div style={{ width: 18, height: 18, border: '2px solid var(--gw-border)', borderTopColor: 'var(--gw-navy)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                Checking your account…
              </div>
            )}

            {!billingLoading && billingChecked && billingFree && (
              <div>
                <div style={{ background: 'var(--gw-green-bg, #E8F8F5)', border: '1px solid var(--gw-green-b, #A7D9CC)', borderRadius: 10, padding: '20px 18px', marginBottom: 20 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#085041', marginBottom: 6 }}>No payment needed</div>
                  {/* One statement about what they have, not two that disagree.
                      This said "unlimited Grounds" directly above "0 of 10
                      Grounds used" - the first thing a new admin reads about
                      money, contradicting itself. A paid plan really is
                      unlimited; the free tier is not, and should say so once. */}
                  <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
                    {groundsUsed != null && !appliedAccessCode
                      ? <>Your free plan includes {FREE_GROUND_LIMIT} grounds, with unlimited sessions and reports in each. You have used <b>{groundsUsed}</b>.</>
                      : <>This one is covered. Unlimited sessions and reports.</>}
                  </div>
                </div>
                {/* The warning stays, but only when they are actually near the
                    wall. Repeating the count when they have eight left is noise. */}
                {groundsUsed != null && !appliedAccessCode && groundsUsed >= FREE_GROUND_LIMIT - 2 && (
                  <div style={{ fontSize: 12.5, color: '#8A5C1A', background: '#FDF3E3', border: '1px solid #F5D9A0', borderRadius: 8, padding: '10px 12px', marginBottom: 16, lineHeight: 1.5 }}>
                    Only {FREE_GROUND_LIMIT - groundsUsed} {FREE_GROUND_LIMIT - groundsUsed === 1 ? 'ground' : 'grounds'} left on the free plan. After that you will need a subscription to open another.
                  </div>
                )}
                <button className="gw-btn" onClick={() => setStep(3)} style={{ margin: '12px 0 0' }}>Continue →</button>
              </div>
            )}

            {!billingLoading && billingChecked && !billingFree && (
              <div>
                <div style={{ background: 'var(--gw-card)', border: '1.5px solid var(--gw-border)', borderRadius: 10, padding: '20px 18px', marginBottom: 20 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 6 }}>Subscribe to create more Grounds</div>
                  <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 16 }}>
                    Your free plan includes 10 Grounds. Subscribe for unlimited Grounds, sessions, and reports.
                  </div>
                  <a
                    href="/pricing"
                    style={{ display: 'inline-block', fontSize: 13, fontWeight: 600, background: 'var(--gw-navy)', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', textDecoration: 'none' }}
                  >
                    View plans →
                  </a>
                </div>

                {!showCodeInput && (
                  <div style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => setShowCodeInput(true)}
                      style={{ fontSize: 12, color: 'var(--gw-sub)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}
                    >
                      I have an access code
                    </button>
                  </div>
                )}

                {showCodeInput && (
                  <div style={{ background: 'var(--gw-bg)', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: 14, marginTop: 8 }}>
                    <label className="gw-label">Access code</label>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <input
                        className="gw-input"
                        value={codeInput}
                        onChange={e => { setCodeInput(e.target.value); setCodeError(null) }}
                        placeholder="Enter your code"
                        style={{ flex: 1 }}
                        onKeyDown={e => e.key === 'Enter' && applyCode()}
                      />
                      <button
                        onClick={applyCode}
                        disabled={codeChecking || !codeInput.trim()}
                        style={{ padding: '0 16px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: codeChecking || !codeInput.trim() ? 0.6 : 1 }}
                      >
                        {codeChecking ? 'Checking…' : 'Apply code'}
                      </button>
                    </div>
                    {codeError && (
                      <div style={{ fontSize: 12, color: '#791F1F', marginTop: 8 }}>{codeError}</div>
                    )}
                  </div>
                )}

                {codeApplied && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ background: 'var(--gw-green-bg, #E8F8F5)', border: '1px solid var(--gw-green-b, #A7D9CC)', borderRadius: 10, padding: '16px 18px', marginBottom: 12 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#085041', marginBottom: 4 }}>Code applied</div>
                      <div style={{ fontSize: 12, color: 'var(--gw-sub)' }}>Your access code has been validated and will be used when the Ground is created.</div>
                    </div>
                    <button className="gw-btn" onClick={() => setStep(3)}>Continue →</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3 (was 2): Timeframe + cadence */}
        {step === 3 && (
          <div>
            <div className="gw-ttl">How long will this ground run?</div>
            <div className="gw-sub-t">Set the timeframe and how often each party checks in.</div>
            <div className="gw-fld">
              <label className="gw-label">Timeframe</label>
              <select className="gw-select" value={timelineDays} onChange={e => setTimelineDays(+e.target.value)}>
                <option value={7}>1 week</option>
                <option value={14}>2 weeks</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
                <option value={180}>6 months</option>
                <option value={365}>12 months</option>
              </select>
            </div>
            <div className="gw-fld">
              <label className="gw-label">Check-in cadence</label>
              <select className="gw-select" value={cadence} onChange={e => setCadence(e.target.value as GroundCadence)}>
                {TIMED_CADENCES.map(c => <option key={c.cadence} value={c.cadence}>{c.label}</option>)}
              </select>
            </div>
            <div className="gw-box gw-box-blue" style={{ marginBottom: 24 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{sessionTotal} sessions over {timelineDays} days</div>
              <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
                Every session includes a report for each contributor. You can change the cadence or add sessions at any time.
              </div>
              <div style={{ marginTop: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, background: 'var(--gw-green-bg)', color: 'var(--gw-green-t)', borderRadius: 20, padding: '2px 8px' }}>Included in your plan</span>
              </div>
            </div>
            <button className="gw-btn" onClick={() => setStep(4)} style={{ margin: 0 }}>Continue</button>
          </div>
        )}

        {/* Step 4 (was 3): Participants */}
        {step === 4 && (
          <div>
            <div className="gw-ttl">Who is in this ground?</div>
            <div className="gw-sub-t">Add everyone who will check in. Contributors can be from different organisations. You can add more at any time.</div>

            {/* Are YOU in this, or setting it up for other people?
                Only the guided walkthrough ever asked. Coming through this flow,
                an admin was assigned an answer without being offered the choice -
                and it decides whether they get check-in links and whether the
                board reads them as one of the people doing the work. */}
            <div role="radiogroup" aria-label="Where do you sit in this ground?" style={{ border: '1px solid var(--gw-border)', borderRadius: 10, padding: '12px 14px', marginBottom: 16, background: 'white' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>And where do you sit in this?</div>
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 9, lineHeight: 1.5 }}>
                This decides whether you get check-in links yourself. You can change it later.
              </div>
              {[
                { v: true, label: 'I am part of this too', sub: 'You check in like everyone else, and your account is read alongside theirs.', other: false },
                { v: false, label: 'I am setting it up for others', sub: 'You organise and read the results. Nothing asks you to check in, and nothing measures you.', other: false },
                { v: false, label: 'Someone else runs this', sub: 'You set it up and hand it over. They lead it, check in themselves, and see the results.', other: true },
              ].map((o) => (
                <div
                  key={o.label}
                  role="radio"
                  tabIndex={(alsoAParty === o.v && runByOther === o.other) || (alsoAParty === null && o.v) ? 0 : -1}
                  aria-checked={alsoAParty === o.v && runByOther === o.other}
                  aria-label={`${o.label}. ${o.sub}`}
                  onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setAlsoAParty(o.v); setRunByOther(o.other) } }}
                  onClick={() => { setAlsoAParty(o.v); setRunByOther(o.other) }}
                  className={`cg-sit-card${alsoAParty === o.v && runByOther === o.other ? ' selected' : ''}`}
                  style={{ marginBottom: 6 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{o.label}</div>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${alsoAParty === o.v && runByOther === o.other ? 'var(--gw-navy)' : 'var(--gw-border)'}`, background: alsoAParty === o.v && runByOther === o.other ? 'var(--gw-navy)' : 'transparent', flexShrink: 0 }} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.45 }}>{o.sub}</div>
                </div>
              ))}
              {alsoAParty === true && !runByOther && (
                <input
                  className="gw-in"
                  aria-label="What you are responsible for"
                  placeholder="What are you responsible for here? (optional)"
                  value={myRemit}
                  onChange={(e) => setMyRemit(e.target.value)}
                  style={{ marginTop: 4 }}
                />
              )}
              {runByOther && (
                <div style={{ marginTop: 4 }}>
                  <input className="gw-in" type="email" aria-label="The lead's email address"
                    placeholder="Their email address" value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)} />
                  <input className="gw-in" aria-label="The lead's name"
                    placeholder="Their name (optional)" value={leadName}
                    onChange={(e) => setLeadName(e.target.value)} style={{ marginTop: 6 }} />
                  {/* Without this the lead is the one person on the ground with no
                      stated remit, and the only person the board cannot read. */}
                  <input className="gw-in" aria-label="What the lead is responsible for"
                    placeholder="What are they responsible for? (optional, they can set this themselves)"
                    value={leadRemit} onChange={(e) => setLeadRemit(e.target.value)} style={{ marginTop: 6 }} />
                  <div style={{ fontSize: 11.5, color: 'var(--gw-sub)', marginTop: 6, lineHeight: 1.5 }}>
                    They get an invitation to lead this ground. Until they accept it, nobody is asked to check in.
                  </div>
                </div>
              )}
            </div>

            {participants.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14 }}>
                {participants.map((p, i) => (
                  <div key={i} className="gw-prow gw-prow-static">
                    <div className={`gw-av gw-av-${i % 6}`}>{p.email.charAt(0).toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{p.email}</div>
                      {p.role && <div style={{ fontSize: 11, color: 'var(--gw-muted)' }}>{p.role}</div>}
                    </div>
                    <button style={{ fontSize: 11, color: 'var(--gw-muted)', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setParticipants(v => v.filter((_, j) => j !== i))}>Remove</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <button onClick={() => { setBulkMode(false) }} style={{ fontSize: 12, fontWeight: bulkMode ? 400 : 700, color: bulkMode ? 'var(--gw-sub)' : 'var(--gw-navy)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>Add one by one</button>
              <span style={{ color: 'var(--gw-border)', fontSize: 12 }}>|</span>
              <button onClick={() => { setBulkMode(true) }} style={{ fontSize: 12, fontWeight: bulkMode ? 700 : 400, color: bulkMode ? 'var(--gw-navy)' : 'var(--gw-sub)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>Paste multiple emails</button>
            </div>

            {bulkMode ? (
              <div style={{ background: 'var(--gw-bg)', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: 12, marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-sub)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Paste emails</div>
                <textarea
                  rows={4}
                  value={bulkText}
                  onChange={e => setBulkText(e.target.value)}
                  placeholder={'one@example.com\ntwo@example.com\nthree@example.com'}
                  style={{ width: '100%', padding: '10px 12px', border: '0.5px solid var(--gw-border)', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', color: 'var(--gw-text)', background: 'white', resize: 'vertical', boxSizing: 'border-box', marginBottom: 8 }}
                />
                <div style={{ fontSize: 11, color: 'var(--gw-sub)', marginBottom: 8 }}>Separate by line, comma, or semicolon. Roles and notes can be added after.</div>
                <button onClick={addBulk} style={{ width: '100%', padding: 9, borderRadius: 6, background: 'none', color: 'var(--gw-navy)', fontSize: 13, fontWeight: 600, border: '1.5px dashed var(--gw-blue-b)', cursor: 'pointer', fontFamily: 'inherit' }}>Add all</button>
              </div>
            ) : (
            <div style={{ background: 'var(--gw-bg)', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: 12, marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-sub)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Add someone new</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <div className="gw-fld" style={{ margin: 0 }}>
                  <label className="gw-label">Email address</label>
                  <input className="gw-input" type="email" value={pEmail} onChange={e => setPEmail(e.target.value)} placeholder="their@email.com" />
                </div>
                <div className="gw-fld" style={{ margin: 0 }}>
                  <label className="gw-label">Their role <span style={{ fontWeight: 400, color: 'var(--gw-muted)' }}>(optional)</span></label>
                  <input className="gw-input" value={pRole} onChange={e => setPRole(e.target.value)} placeholder="e.g. Head of Engineering" />
                </div>
              </div>
              <div className="gw-fld" style={{ margin: '0 0 8px' }}>
                <label className="gw-label">Personal note in the invite email <span style={{ fontWeight: 400, color: 'var(--gw-muted)' }}>(optional)</span></label>
                <input className="gw-input" value={pNote} onChange={e => setPNote(e.target.value)} placeholder="e.g. Looking forward to building this together." onKeyDown={e => e.key === 'Enter' && addParticipant()} />
              </div>
              <button onClick={addParticipant} style={{ width: '100%', padding: 9, borderRadius: 6, background: 'none', color: 'var(--gw-navy)', fontSize: 13, fontWeight: 600, border: '1.5px dashed var(--gw-blue-b)', cursor: 'pointer', fontFamily: 'inherit' }}>+ Add to this ground</button>
            </div>
            )}

            {participants.length > 0 && (
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', background: 'var(--gw-bg)', borderRadius: 7, padding: '10px 12px', marginBottom: 14, lineHeight: 1.6 }}>
                Each person gets their own private check-in. Nobody can see what anyone else wrote until the report is activated.
              </div>
            )}

            {participants.length > 0 && (
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 10 }}>
                {participants.length} {participants.length === 1 ? 'person' : 'people'} added. Up to 20 per ground.
              </div>
            )}

            {scenario === 'NEW_HIRE' && participants.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', background: 'var(--gw-amber-bg)', border: '0.5px solid var(--gw-amber-b)', borderRadius: 7, padding: '10px 12px', marginBottom: 12, lineHeight: 1.6 }}>
                For coaching or mentoring, one ground per person works best. Each person keeps their own private record across sessions.
              </div>
            )}

            {/* Handing the ground over needs an address to hand it to. Better to
                stop here than to create a ground nobody is leading. */}
            <button className="gw-btn" disabled={participants.length === 0 || (runByOther && !leadEmail.includes('@'))} onClick={() => setStep(5)} style={{ margin: 0 }}>Continue</button>
            {runByOther && !leadEmail.includes('@') && (
              <div style={{ fontSize: 11.5, color: 'var(--gw-sub)', textAlign: 'center', marginTop: 5 }}>
                Add the email address of the person who will lead this ground.
              </div>
            )}
            <div style={{ fontSize: 12, color: 'var(--gw-sub)', textAlign: 'center', marginTop: 10, cursor: (runByOther && !leadEmail.includes('@')) ? 'not-allowed' : 'pointer', opacity: (runByOther && !leadEmail.includes('@')) ? 0.45 : 1 }}
              onClick={() => { if (!(runByOther && !leadEmail.includes('@'))) setStep(5) }}>
              Skip - add participants after
            </div>
            <div style={{ fontSize: 11, color: 'var(--gw-muted)', textAlign: 'center', marginTop: 4, lineHeight: 1.5 }}>
              The shared report cannot generate until at least one other person has checked in.
            </div>
          </div>
        )}

        {/* Step 5 (was 4): Resolution state */}
        {step === 5 && (
          <div>
            <div className="gw-ttl">What does a successful outcome look like?</div>
            <div className="gw-sub-t">The end state this ground builds toward, in this situation's own terms. Everyone sees it before the first session; the ground closes only when all parties confirm the same end state - and you are not locked in if the record reveals something different.</div>

            {/* The scenario's OWN end states (mirror of the server's
                resolution vocabulary) - the start target and the closing
                outcome now speak the same language. Existing grounds keep
                their old generic strings untouched. */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-sub)', textTransform: 'uppercase', letterSpacing: '.06em', margin: '12px 0 6px' }}>Where this ground can land</div>
              {endStatesFor(scenario).map(r => (
                <div
                  key={r.value}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: 'white', border: `1.5px solid ${resolutionState === r.label ? 'var(--gw-navy)' : 'var(--gw-border)'}`, borderRadius: 8, padding: '12px 14px', cursor: 'pointer', marginBottom: 6, transition: 'border-color .15s' }}
                  onClick={() => setResolutionState(r.label)}
                >
                  <div style={{ width: 16, height: 16, borderRadius: '50%', border: `1.5px solid ${resolutionState === r.label ? 'var(--gw-navy)' : 'var(--gw-border)'}`, background: resolutionState === r.label ? 'var(--gw-navy)' : 'transparent', flexShrink: 0, marginTop: 1, transition: 'all .15s' }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{r.label}</div>
                    {r.description && <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.5 }}>{r.description}</div>}
                  </div>
                </div>
              ))}
            </div>

            <button className="gw-btn" disabled={!resolutionState} onClick={() => setStep(6)} style={{ margin: 0 }}>Continue</button>
          </div>
        )}

        {/* Step 6 (was 5): Opening brief + ground name */}
        {step === 6 && (
          <div>
            <div className="gw-ttl">What is this ground about?</div>
            <div className="gw-sub-t">Your version of the brief. Each contributor writes their own in their first session. The report shows where accounts agree and where they differ.</div>

            <div style={{ position: 'relative', marginBottom: 6 }}>
              <textarea
                rows={6}
                value={brief}
                onChange={e => setBrief(e.target.value)}
                placeholder="What is this ground about? What needs to be true at the end?"
                style={{ width: '100%', padding: '12px 14px', border: '0.5px solid var(--gw-border)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', color: 'var(--gw-text)', background: 'white', resize: 'vertical', lineHeight: 1.65, boxSizing: 'border-box' }}
              />
              <div style={{ position: 'absolute', bottom: 8, right: 10, fontSize: 11, color: 'var(--gw-sub)' }}>{briefWords} words</div>
            </div>

            {briefShort && (
              <div style={{ fontSize: 12, color: 'var(--gw-amber-t)', background: 'var(--gw-amber-bg)', border: '0.5px solid var(--gw-amber-b)', borderRadius: 7, padding: '10px 12px', marginBottom: 12, lineHeight: 1.6 }}>
                A brief this short will produce weaker first sessions. The questions are shaped by what you write here. Add more context.
              </div>
            )}

            <div className="gw-fld" style={{ marginTop: 16 }}>
              <label className="gw-label">Ground name <span style={{ fontWeight: 400, color: 'var(--gw-muted)' }}>(optional)</span></label>
              <input
                className="gw-input"
                value={groundName}
                onChange={e => setGroundName(e.target.value)}
                placeholder={`e.g. COO onboarding, Q3 2025`}
              />
            </div>

            <div className="gw-box gw-box-blue" style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Summary</div>
              <div style={{ fontSize: 12, lineHeight: 1.7 }}>
                <div>{SCENARIOS.find(s => s.cardKey === selectedCard)?.label ?? (scenario ?? '').replace(/_/g, ' ')} · {MOMENTS.find(m => m.moment === moment)?.label ?? moment}</div>
                <div>{sessionTotal} sessions · {cadence.toLowerCase()}</div>
                {resolutionState && <div>Resolution: {resolutionState}</div>}
                {participants.length > 0 && <div>{participants.length} participant{participants.length !== 1 ? 's' : ''} invited</div>}
                {appliedAccessCode && <div style={{ color: '#085041', fontWeight: 600 }}>Access code applied</div>}
              </div>
            </div>

            <button className="gw-btn" onClick={() => create.mutate()} disabled={create.isPending || !brief.trim()} style={{ margin: 0 }}>
              {create.isPending ? 'Opening…' : 'Open the ground →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
