import { useState, useEffect } from 'react'
import { keep, whatWasKept, forget, howLongAgo } from '@/lib/what-you-typed-survives-a-reload'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { groundsApi, type GroundScenario, type GroundMoment, type GroundCadence } from '@/api/grounds'
import { SituationCard } from '@/components/gw/SituationCard'
import { SELECTABLE_CADENCES, sessionsFor } from '@/lib/cadence'
import { billingApi, FALLBACK_FREE_LIMITS } from '@/api/billing'
import { entryApi } from '@/api/entry'
import { SCENARIO_LABELS, GROUPS_YOU_PICK_FROM, SCENARIO_FACTS, CADENCE_VALUE, RECOMMENDED_MOMENT, COACH_CARD, type ScenarioGroupKey } from '@/lib/scenario-catalog'
import { coachApi, MIN_INTENTION_LENGTH, COACHING_PRICE } from '@/api/coach'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth'
import { STAGE, stepsThisPersonSees, stepAfter, stepBefore } from './the-steps-this-person-sees'
import { theWordsForPickingASituation } from './whose-situation-is-it'
import { rememberWhoWasNotInvited } from './who-was-not-invited'

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
  /**
   * THE ONE LINE ON THE CARD FACE, and the thing a person actually recognises themselves in.
   *
   * Not a description of the situation - the moment you would open the app. "You hired a sales lead.
   * They start Monday", not "getting a new hire and their manager aligned on expectations". Something
   * specific that has already happened, with a date or a number in it where there is one.
   *
   * The `examples` above are still here and still useful, but they belong behind the disclosure: three
   * recogniser lines on twenty card faces is the wall of text that made the picker unreadable.
   */
  moment: string
  /** What gets agreed and pinned before the run starts. Half of `desc`. */
  agreed: string
  /** What the run of check-ins then tests against it. The other half of `desc`. */
  tests: string
}

// Reframed per FEATURE_scenario_reframe.md: action-focused labels, plain
// descriptions, and recognizer sub-examples. DISPLAY ONLY - every card still
// submits its untouched GroundScenario enum key; packs, classifier keys, and
// the report schema are unchanged.
/** One device, one browser, and cleared the moment the check-in exists. */
const DRAFT_KEY = 'gw-new-ground-draft'

export const SCENARIOS: ScenarioCard[] = [
  { cardKey: 'NEW_HIRE', scenario: 'NEW_HIRE', label: SCENARIO_LABELS.NEW_HIRE, tag: 'Starting', tagBg: 'var(--gw-green-bg)', tagColor: 'var(--gw-green-t)',
    desc: "Agree what the role is and what doing it well looks like in the first 90 days, and make sure they have actually seen it. Each check-in then tests what they are doing against that, so a mismatch surfaces in week two instead of at a review.",
    moment: 'You hired a sales lead. They start Monday.',
    agreed: 'Agree what the role is and what doing it well looks like in the first 90 days, and make sure they have actually seen it.',
    tests: 'Each check-in then tests what they are doing against that, so a mismatch surfaces in week two instead of at a review.',
    examples: [
      'Someone starts Monday and you want to be sure you both mean the same thing by "doing well."',
      'You just hired a senior person and need what they own pinned down before day one.',
      'A new joiner and their manager each writing what success looks like in the first 90 days.',
    ] },
  { cardKey: 'ROLE_HANDOVER', scenario: 'ROLE_HANDOVER', label: SCENARIO_LABELS.ROLE_HANDOVER, tag: 'Starting', tagBg: 'var(--gw-green-bg)', tagColor: 'var(--gw-green-t)',
    desc: "Agree what is actually outstanding, what is fragile, and which relationships come with the role rather than the person. Each check-in then tests what has really transferred against that, so the gaps are named while the person who can close them is still here.",
    moment: 'Someone is leaving a role in a month and their replacement starts next week.',
    agreed: 'Both sides write down what is outstanding, what is fragile, and which relationships come with the role.',
    tests: 'Each check-in tests what has actually transferred against that, so the gaps are named while the person who can close them is still here.',
    examples: [
      'Someone is leaving in four weeks and their replacement has already started.',
      'A role is moving between two people and nobody has written down what the first one was carrying.',
      'You want the incoming person to say what they would be guessing about, before they stop noticing.',
    ] },
  { cardKey: 'CONTRACT_REVIEW', scenario: 'CONTRACT_REVIEW', label: SCENARIO_LABELS.CONTRACT_REVIEW, tag: 'Starting', tagBg: 'var(--gw-green-bg)', tagColor: 'var(--gw-green-t)',
    desc: "Before you sign, each side writes down its own expectations separately - what the numbers are actually of, who does what, and what happens if. Each check-in then tests the two accounts against each other, so a difference surfaces while changing it is still free.",
    moment: 'You are two weeks from signing and both sides think it is clear.',
    agreed: 'Each side says, on its own, what it expects to give and to get, and what the numbers are actually of.',
    tests: 'The check-ins compare the two accounts, so "twenty per cent of gross" and "twenty per cent of net" is found now rather than in a year.',
    examples: [
      'A revenue share where both sides are sure what the percentage applies to, and have never said it out loud.',
      'A licence where one side assumes a client list is fixed and the other assumes it grows.',
      'A partnership you are about to sign with somebody you would rather not fall out with.',
    ] },
  { cardKey: 'IMPLEMENTATION_TRACKING', scenario: 'IMPLEMENTATION_TRACKING', label: SCENARIO_LABELS.IMPLEMENTATION_TRACKING, tag: 'Planning', tagBg: 'var(--gw-blue-bg)', tagColor: 'var(--gw-navy)',
    desc: "A quiet monthly read on an agreement that is running. Each check-in tests what is actually happening against what was agreed, and most months it should say the numbers reconcile and nothing needs anybody - which is the point. When something does not add up, it stays on the record until somebody explains it.",
    moment: 'The contract has been running for eight months and neither side has looked at it since.',
    agreed: 'What each side reports, where the figures come from, and what falls due when.',
    tests: 'Each month asks what changed, carries anything unexplained forward, and says plainly when a period is clear.',
    examples: [
      'A revenue share where the reported figure and the filed figure have never been put side by side.',
      'An arrangement that has quietly drifted from what was signed, and both sides half know it.',
      'A relationship that is fine, where you would like to be able to prove it was fine.',
    ] },
  { cardKey: 'NEW_PROJECT', scenario: 'NEW_PROJECT', label: SCENARIO_LABELS.NEW_PROJECT, tag: 'Starting', tagBg: 'var(--gw-green-bg)', tagColor: 'var(--gw-green-t)',
    desc: "Agree scope, who owns what, and what \"done\" means before anyone starts. The check-ins then test the work against that, so a quiet change of scope or a task nobody owns shows up while there is still time to act.",
    moment: 'You are kicking off a six-month build with four people on it.',
    agreed: 'Agree scope, who owns what, and what "done" means before anyone starts.',
    tests: 'The check-ins then test the work against that, so a quiet change of scope or a task nobody owns shows up while there is still time to act.',
    examples: [
      'Kicking off a build and you want scope and "done" agreed before anyone writes code.',
      'A cross-team project where each team quietly assumes a different owner.',
      'Starting work with a client and you want both sides\' version of the goal on record.',
    ] },
  { cardKey: 'NEW_ADVISOR', scenario: 'NEW_ADVISOR', label: SCENARIO_LABELS.NEW_ADVISOR, tag: 'Starting', tagBg: 'var(--gw-green-bg)', tagColor: 'var(--gw-green-t)',
    desc: "Agree up front what the advisor will actually contribute, and on what terms. Each check-in across the year tests the work against that, so \"available\" cannot quietly replace contributing.",
    moment: 'An advisor is joining for 1% and you want their year set out before they start.',
    agreed: 'Agree up front what the advisor will actually contribute, and on what terms.',
    tests: 'Each check-in across the year tests the work against that, so "available" cannot quietly replace contributing.',
    examples: [
      'Bringing on an advisor for equity and you want it clear what they will actually do for it.',
      'A new board member joining, each side writing what they expect from the relationship.',
    ] },
  { cardKey: 'NEW_COFOUNDER', scenario: 'NEW_COFOUNDER', label: SCENARIO_LABELS.NEW_COFOUNDER, tag: 'Starting', tagBg: 'var(--gw-green-bg)', tagColor: 'var(--gw-green-t)',
    desc: "Each of you sets down what you expect to build, own and contribute, before the assumptions harden. The check-ins over the next 90 days test what each of you is actually doing against that, so a drift in who carries what surfaces while it is still a conversation.",
    moment: 'You and your co-founder are splitting equity next week.',
    agreed: 'Each of you sets down what you expect to build, own and contribute, before the assumptions harden.',
    tests: 'The check-ins over the next 90 days test what each of you is actually doing against that, so a drift in who carries what surfaces while it is still a conversation.',
    examples: [
      'You and a co-founder splitting equity and roles and want the assumptions said out loud first.',
      'A new equal partner joining the founding team.',
    ] },
  { cardKey: 'NEW_MANAGER', scenario: 'NEW_MANAGER', label: SCENARIO_LABELS.NEW_MANAGER, tag: 'Starting', tagBg: 'var(--gw-green-bg)', tagColor: 'var(--gw-green-t)',
    desc: "Agree what they own, who they report to, and what success looks like in the first 90 days. Each check-in then tests what they are doing against what you handed over, so a gap in scope shows up in week three rather than month three.",
    moment: 'A new manager is taking over a team of eight, mid-project.',
    agreed: 'Agree what they own, who they report to, and what success looks like in the first 90 days.',
    tests: 'Each check-in then tests what they are doing against what you handed over, so a gap in scope shows up in week three rather than month three.',
    examples: [
      'An interim leader stepping into an existing team for six months.',
      'A new manager taking over mid-project and you want scope and authority clear.',
    ] },
  { cardKey: 'CONTRACT_RENEWAL', scenario: 'CONTRACT_RENEWAL', label: SCENARIO_LABELS.CONTRACT_RENEWAL, tag: 'Renewal', tagBg: 'var(--gw-blue-bg)', tagColor: 'var(--gw-navy)',
    desc: "Set out what the term was meant to deliver, from both sides. The check-ins across the renewal window test the real work against that, so you negotiate the next term from a record instead of from impressions.",
    moment: 'An agency contract ends in six weeks and you are not sure what you got.',
    agreed: 'Set out what the term was meant to deliver, from both sides.',
    tests: 'The check-ins across the renewal window test the real work against that, so you negotiate the next term from a record instead of from impressions.',
    examples: [
      'A contractor\'s term is ending and you are deciding whether to renew.',
      'An agency engagement up for renewal and you want an honest account of what got delivered.',
    ] },
  { cardKey: 'RECOGNITION', scenario: 'RECOGNITION', label: SCENARIO_LABELS.RECOGNITION, tag: 'Recognition', tagBg: 'var(--gw-amber-bg)', tagColor: 'var(--gw-amber-t)',
    desc: "The person sets out their case and the evidence behind it; you set out what the decision actually turns on. Over the month the check-ins test that evidence against that bar, so the answer rests on the record rather than on who asked most recently.",
    moment: 'Someone asked for a raise on Friday.',
    agreed: 'The person sets out their case and the evidence behind it; you set out what the decision actually turns on.',
    tests: 'Over the month the check-ins test that evidence against that bar, so the answer rests on the record rather than on who asked most recently.',
    examples: [
      'You are going to ask for a raise and want the evidence lined up first.',
      'Someone is up for promotion and you want their record and your read to match before the talk.',
    ] },
  { cardKey: 'PIP', scenario: 'PIP', label: SCENARIO_LABELS.PIP, tag: 'Accountability', tagBg: 'var(--gw-red-bg)', tagColor: 'var(--gw-red-t)',
    desc: "Agree the concern, the support on offer, and the standard being measured, and make sure they have seen it. Every check-in across the 90 days tests the work against that same standard, so the decision at the end rests on a run of evidence rather than a write-up assembled afterwards.",
    moment: 'A senior person has missed three deadlines and you are thinking about letting them go.',
    agreed: 'Agree the concern, the support on offer, and the standard being measured, and make sure they have seen it.',
    tests: 'Every check-in across the 90 days tests the work against that same standard, so the decision at the end rests on a run of evidence rather than a write-up assembled afterwards.',
    examples: [
      'You are putting someone on a formal plan and want both sides on the concern and what success looks like.',
      'A capability concern where you want a fair record, not a he-said-she-said.',
    ] },
  { cardKey: 'OKR_ALIGNMENT', scenario: 'OKR_ALIGNMENT', label: SCENARIO_LABELS.OKR_ALIGNMENT, tag: 'Planning', tagBg: 'var(--gw-blue-bg)', tagColor: 'var(--gw-navy)',
    desc: "Each person writes the two or three objectives they think matter most, before the room converges on one version. The check-ins across the quarter then test what people are actually working on against those objectives, so effort aimed at the wrong thing shows up early.",
    moment: 'The quarter starts in two weeks and six people would name different priorities.',
    agreed: 'Each person writes the two or three objectives they think matter most, before the room converges on one version.',
    tests: 'The check-ins across the quarter then test what people are actually working on against those objectives, so effort aimed at the wrong thing shows up early.',
    examples: [
      'Planning season and you want to check everyone\'s goals actually connect before they lock.',
      'Two teams whose objectives depend on each other and you are not sure the handoff is agreed.',
    ] },
  { cardKey: 'WORKPLAN_BUDGET', scenario: 'WORKPLAN_BUDGET', label: SCENARIO_LABELS.WORKPLAN_BUDGET, tag: 'Planning', tagBg: 'var(--gw-blue-bg)', tagColor: 'var(--gw-navy)',
    desc: "Each person commits to their own plan and budget, and the numbers have to hold together. The check-ins then test spend and delivery against what they committed, so an overlap or an overrun shows up while there is still quarter left.",
    moment: 'Two teams have each budgeted for the same hire.',
    agreed: 'Each person commits to their own plan and budget, and the numbers have to hold together.',
    tests: 'The check-ins then test spend and delivery against what they committed, so an overlap or an overrun shows up while there is still quarter left.',
    examples: [
      'Start of the quarter and you want each person\'s plan and budget to hold up against real resources.',
      'A plan that looks fine on paper but you suspect the budget behind it was assumed, not approved.',
    ] },
  { cardKey: 'PULSE_CHECK', scenario: 'PULSE_CHECK', label: SCENARIO_LABELS.PULSE_CHECK, tag: 'Recurring', tagBg: 'var(--gw-green-bg)', tagColor: 'var(--gw-green-t)',
    desc: "A lightweight recurring check-in, with no setup and no target to measure against: about five minutes each on one thing going well, one thing stuck, and what has changed since last time. Reach for this when you want a temperature read, not a record. If there is a specific thing you need people held to, pick that situation instead.",
    moment: 'You want to know what your team is actually doing, every week.',
    agreed: 'Agree what the team is working on and what each person owns.',
    tests: 'Each check-in then tests what that person actually did since last time, so work drifting off what was agreed shows up week by week rather than at the end.',
    examples: [
      'A quick read every two weeks from each person on what is moving and what is stuck.',
      'You want a lightweight recurring signal without calling a meeting.',
    ] },
  { cardKey: 'DRIFT', scenario: 'DRIFT', label: SCENARIO_LABELS.DRIFT, tag: 'Off track', tagBg: 'var(--gw-amber-bg)', tagColor: 'var(--gw-amber-t)',
    desc: "Pin down what was agreed, what actually exists now, and the exact gap between them. The check-ins then test whether that gap is closing or holding, so something unresolved three sessions running reads as a pattern rather than bad luck.",
    moment: 'The project is eight weeks late and everyone has a different reason.',
    agreed: 'Pin down what was agreed, what actually exists now, and the exact gap between them.',
    tests: 'The check-ins then test whether that gap is closing or holding, so something unresolved three sessions running reads as a pattern rather than bad luck.',
    examples: [
      'A project blew up or is badly behind and everyone has a different story about why.',
      'A senior hire is not delivering what they were brought in to do.',
      'Cash is tight and you need everyone seeing the same runway and what has to change.',
    ] },
  /**
   * THE CARD THAT DID NOT EXIST. CRISIS_ALIGNMENT was in the enum, in the routing map that
   * resolves `?scenario=a+big+decision` from the marketing site, and in the report packs - but it
   * had no card here, so the only way to open one was to follow a link in from outside. Someone
   * already signed in, looking at eighteen cards, could not choose it.
   *
   * It sits beside BOARD_STRATEGY because that is the card people were picking instead, and the
   * two are genuinely different: a strategy ground is a standing read on direction, this is one
   * decision with a date on it.
   */
  { cardKey: 'CRISIS_ALIGNMENT', scenario: 'CRISIS_ALIGNMENT', label: SCENARIO_LABELS.CRISIS_ALIGNMENT, tag: 'Deciding', tagBg: 'var(--gw-blue-bg)', tagColor: 'var(--gw-navy)',
    desc: "One real choice, with a date on it. Each person's own read comes in before the room converges, and the check-ins after it test whether what people are doing matches what was actually decided.",
    moment: 'You are deciding this month whether to shut down a product line.',
    agreed: 'One real choice with a date on it, and each person\'s own read before the room converges.',
    tests: 'The check-ins after it test whether what people are doing matches what was actually decided.',
    examples: [
      'A hiring, budget, or direction call where you want each person\'s real view first.',
      'A decision everyone will agree to in the meeting and re-litigate afterwards.',
      'Two options on the table and you suspect the quiet objection is the important one.',
    ] },
  { cardKey: 'BOARD_STRATEGY', scenario: 'BOARD_STRATEGY', label: SCENARIO_LABELS.BOARD_STRATEGY, tag: 'Leadership', tagBg: 'var(--gw-blue-bg)', tagColor: 'var(--gw-navy)',
    desc: "Each leader sets out their own read on the strategy before the room debates it. The check-ins across the quarter then test whether what the business is actually doing matches the strategy that was agreed, so quiet disagreement shows up now rather than after the decision.",
    moment: 'The board agreed the strategy in the room, and two of them have since told you privately they disagree.',
    agreed: 'Each leader sets out their own read on the strategy before the room debates it.',
    tests: 'The check-ins across the quarter then test whether what the business is actually doing matches the strategy that was agreed, so quiet disagreement shows up now rather than after the decision.',
    examples: [
      'Before a strategy offsite, you want each leader\'s real read so quiet disagreement shows up early.',
      'The board looks aligned in the room but you suspect it is not on one big bet.',
    ] },
  { cardKey: 'COHORT_CHECK', scenario: 'COHORT_CHECK', label: SCENARIO_LABELS.COHORT_CHECK, tag: 'Recurring', tagBg: 'var(--gw-green-bg)', tagColor: 'var(--gw-green-t)',
    desc: "One set of expectations, many people in the same role, each answering on their own. The check-ins test each person's work against that same frame, so you see who is on track and who is stuck without them swaying each other. For a group who are new, use \"Onboarding several people at once\" instead.",
    moment: 'Twenty field officers, and you only hear from the three who call.',
    agreed: 'One set of expectations, for many people in the same role, each answering on their own.',
    tests: 'The check-ins test each person\'s work against that same frame, so you see who is on track and who is stuck without them swaying each other.',
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
  /**
   * THE ONE-OFF READ, WHICH HAD NO CARD BECAUSE IT HAD NO SCENARIO.
   *
   * PULSE_CHECK's card is "a regular read on live work" and its interview is recurring - it asks what
   * changed since last time. Somebody who wanted a single temperature read had to open that and
   * abandon it after one session. This is that read, as its own thing.
   *
   * It sits next to the two recurring cards deliberately: all three answer "I want to know how things
   * are going", and the only way to tell them apart is to read them side by side. Hence notThisOneIf
   * on all three.
   */
  { cardKey: 'SNAPSHOT', scenario: 'SNAPSHOT', label: SCENARIO_LABELS.SNAPSHOT, tag: 'One time', tagBg: 'var(--gw-paper-2)', tagColor: 'var(--gw-sub)',
    desc: 'One honest read from everyone, once. No setup and no target: about five minutes each on what is going well, what is stuck and what has changed. If there is a specific thing you need people held to, pick that situation instead.',
    moment: 'You want one honest read from everyone this week.',
    agreed: 'Nothing. No setup and no target to measure against, which is the point.',
    tests: 'Nothing over time either: one check-in, one honest read from each person on what is going well, what is stuck and what has changed. A temperature read, not a record. If there is a specific thing you need people held to, pick that situation instead.',
    examples: [
      'You want to know how people are actually doing this week, without booking a meeting.',
      'Something feels off across the team and you want a read before deciding whether it needs watching.',
    ] },
  { cardKey: 'COHORT_ONBOARDING', scenario: 'COHORT_CHECK', label: 'Onboarding several people at once', tag: 'Starting', tagBg: 'var(--gw-green-bg)', tagColor: 'var(--gw-green-t)',
    desc: "Several people starting the same role at once, each answering on their own against the same expectations. The check-ins test how each of them is settling against those, so you see early who is finding it and who is struggling, before the end of the period decides anything.",
    moment: 'Six new managers, each running a different branch, all started this month.',
    agreed: 'The same expectations for several people starting the same role together.',
    tests: 'The check-ins test how each of them is settling against those, so you see early who is finding it and who is struggling, before the end of the period decides anything.',
    examples: [
      'Four new managers on a three month onboarding that is also their probation.',
      'A cohort of new starters where you need to know by month two, not month three, who needs help.',
      'Trainees in different locations who never work together but are all learning the same job.',
    ] },
  { cardKey: 'ACUTE_SHOCK', scenario: 'ACUTE_SHOCK', label: SCENARIO_LABELS.ACUTE_SHOCK, tag: 'Urgent', tagBg: 'var(--gw-red-bg)', tagColor: 'var(--gw-red-t)',
    desc: "Something has just happened that nobody planned for, and accounts of it are already diverging. The first check-in gets each person's version down while it is fresh and separates the facts everyone agrees on from the ones still contested, and a follow-up a week later tests what turned out different once the dust settled.",
    moment: 'Your biggest client left on Tuesday and you want them back.',
    agreed: 'First the facts everyone actually has, separated from what is being repeated. Then what you are now trying to achieve, with a date on it.',
    tests: 'Each daily check-in tests what that person did against that objective, so a recovery that is stalling shows up on day three rather than at the end of the fortnight.',
    examples: [
      'A major client pulled out overnight and everyone has a different version of why.',
      'An incident just took things down and people are scrambling to understand what happened.',
      'Sudden bad news hit the team and you want honest reads before any decisions get made.',
    ] },
  { cardKey: 'REALIGN_TEAM', scenario: 'REALIGN_TEAM', label: SCENARIO_LABELS.REALIGN_TEAM, tag: 'Team', tagBg: 'var(--gw-amber-bg)', tagColor: 'var(--gw-amber-t)',
    desc: "Each person gives their own read of the situation before the group talks, rather than the loudest version becoming the account. That first session sets out what you do and do not agree on, and the check-ins after it test whether the gap closed or only went quiet.",
    moment: 'You and your ops lead have stopped agreeing on what matters.',
    agreed: 'Each person gives their own read of the situation before the group talks, and that first session sets out what you do and do not agree on.',
    tests: 'The check-ins after it test whether the gap closed or only went quiet.',
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
  /**
   * ITEM 2: THE CARD NO LONGER CARRIES SOMEBODY ELSE'S SCENARIO.
   *
   * This used to say `scenario: 'REALIGN_TEAM'`, which conflated two different things - the card the
   * person clicked, and the scenario being created. If routing failed, the ground silently inherited
   * REALIGN_TEAM: its board, its questions, its end states. A cohort of clinic managers who never
   * work together would have got a "get a team back on the same page" ground, and nothing would have
   * said so. It carries OPEN_READ now, which exists precisely for "we do not know yet".
   */
  /**
   * ITEM 3: IT IS THE FIRST PICK NOW, SO IT STOPPED READING LIKE THE LAST ONE.
   *
   * Every word here was written for a card sitting at the bottom of six groups under a heading
   * called "Not sure yet": the tag said "Anything else", the line said "Something is off and you
   * cannot name it yet", and the body opened "None of these quite fit?" and pointed at "the
   * situations above". At the top of the step all four are wrong - nothing has come before it to be
   * anything else than, the situation need not be a problem, and the named situations are below.
   *
   * It is also no longer only for somebody who cannot name their situation. It is for anybody who
   * would rather say it in their own words, which is a different and much larger offer.
   */
  { cardKey: 'DESCRIBE_OWN', scenario: 'OPEN_READ', label: SCENARIO_LABELS.OPEN_READ, tag: 'In your own words', tagBg: 'var(--gw-paper-2)', tagColor: 'var(--gw-sub)',
    desc: "Say what is happening in your own words. Each person gives their own read first, privately, and the check-ins that follow test whether that picture holds up. If it turns out to be one of the named situations below, pick that instead: it sets the objective and shapes the questions people are asked.",
    moment: 'You would rather describe it yourself than pick from a list.',
    agreed: 'Nothing fixed: each person gives their own read first, privately, because the situation is not named yet.',
    tests: 'The check-ins that follow test whether that picture holds up. If it turns out to be one of the named situations below, pick that instead: it sets the objective and shapes the questions people are asked.', },
]

/**
 * WHICH SHELF A CARD SITS ON.
 *
 * `SCENARIO_FACTS` holds the group per SITUATION, which covers nineteen of the twenty cards. The
 * twentieth is COHORT_ONBOARDING: it shares COHORT_CHECK's scenario, and the two belong on different
 * shelves - the recurring cohort read is "a read on live work", and onboarding a group of people who
 * all started this month is "starting something". A person looking for one would not find it filed
 * under the other.
 *
 * So the override is per CARD and there is exactly one of them. If a second appears, the grouping
 * probably wants to live on the card rather than on the situation.
 */
const CARD_GROUP: Record<string, ScenarioGroupKey> = {
  COHORT_ONBOARDING: 'starting',
}

/**
 * WHICH HEADING A CARD SITS UNDER, and it is not always its scenario's group.
 *
 * COHORT_CHECK is offered twice - as an ongoing read of a group, and as onboarding one - so two
 * cards share a scenario and cannot both take the scenario's group. The override is per CARD.
 *
 * Exported because the entry chat renders these same cards now, and reading the facts directly there
 * filed both cohort cards under one heading and silently dropped the onboarding one from the picker.
 */
export function groupOfCard(card: { cardKey: string; scenario: string }): ScenarioGroupKey {
  return CARD_GROUP[card.cardKey] ?? SCENARIO_FACTS[card.scenario as keyof typeof SCENARIO_FACTS].group
}

export function cardsInGroup(group: ScenarioGroupKey): ScenarioCard[] {
  return SCENARIOS.filter(c => groupOfCard(c) === group)
}

/**
 * THE NAME PEOPLE ACTUALLY READ, WHICH IS A SUBJECT LINE IN SOMEBODY ELSE'S INBOX.
 *
 * This label is interpolated straight into the participant invite: "Sahar invited you to check in
 * on: {label}". So it is not an internal title, it is the first thing a person reads about work they
 * are about to be asked to account for.
 *
 * TWO GENERATIONS OF THIS WERE WRONG, AND THE SECOND WAS MINE.
 *
 * First it fell back to the raw scenario enum, producing "NEW HIRE ground" and "PIP ground" in
 * shouting caps, named after a database value. Nineteen of twenty-two existing rows still hold those.
 *
 * Then I replaced it with the person's name first - "Abubakar, new hire" - to make an inbox
 * recognisable. That reads as "Sahar invited you to check in on: Abubakar", which makes the
 * PARTICIPANT the subject of the sentence. The rule is that a message to the second party is
 * anchored to the topic and never to the person, so the name has to go.
 *
 * It is the topic, in the words on the card they just clicked, and nothing else.
 */
function groundNameFallback(cardLabel: string | undefined, scenario: string | null): string {
  const base = cardLabel?.trim();
  if (base) return base;
  /** No card label is a routing failure, not a naming decision. Say the situation, not the enum. */
  return (scenario ?? 'Check-in').replace(/_/g, ' ').toLowerCase().replace(/^./, c => c.toUpperCase());
}

interface MomentOption { moment: GroundMoment; label: string; sub: string }
const MOMENTS: MomentOption[] = [
  { moment: 'STARTING',    label: 'At the start',    sub: 'Set expectations before the work begins.' },
  { moment: 'RECOGNITION', label: 'Mid-way',          sub: 'Acknowledge progress. Name what has changed.' },
  { moment: 'RESOLUTION',  label: 'Reaching an end',  sub: 'Close a chapter. Agree on what happened.' },

]


interface Participant {
  email: string
  role: string
  note: string
  /** ISO date. Set only for somebody who has not begun; a future date holds their invite until then. */
  startsAt?: string
}

const SCENARIO_FROM_LABEL: Record<string, GroundScenario> = {
  'new hire':           'NEW_HIRE',
  'handover':           'ROLE_HANDOVER',
  'role handover':      'ROLE_HANDOVER',
  'new project':        'NEW_PROJECT',
  'new board member':   'NEW_ADVISOR',
  'new partner':        'NEW_COFOUNDER',
  'contract renewal':   'CONTRACT_RENEWAL',
  'agreement before signing': 'CONTRACT_REVIEW',
  'contract review':    'CONTRACT_REVIEW',
  'agreement that is running': 'IMPLEMENTATION_TRACKING',
  'implementation tracking': 'IMPLEMENTATION_TRACKING',
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
  /**
   * CRISIS_ALIGNMENT WAS THE ONE SCENARIO NOTHING ON THE HOME PAGE COULD REACH.
   *
   * Found by listing every GroundScenario against every routing key rather than by
   * reading the list, which is why it survived: sixteen of seventeen resolved, and
   * a missing entry looks like nothing at all. The /entry picker has had "A big
   * decision" all along, so the situation was reachable from one entrance and not
   * the other.
   */
  'a big decision': 'CRISIS_ALIGNMENT',
  'describe your own situation': 'REALIGN_TEAM',
}

/**
 * The stored value is accepted as well as the picker label, and that is what lets the assistant
 * link here. A suggestion carries a `GroundScenario`, not the words on a card - and translating it
 * to a label on the API side would mean a second copy of the map above, kept in step by hand.
 * Accepting the value directly leaves one map, in the place that owns the wording.
 */
export /**
 * The run in dates rather than in a duration.
 *
 * "6 check-ins over 90 days" is true and does not answer what somebody is actually asking, which is
 * when the first one happens and when this is finished. Both are already known on this screen.
 */
function runDates(startsOn: string, timelineDays: number): string {
  const start = startsOn ? new Date(`${startsOn}T09:00:00`) : new Date()
  const end = new Date(start.getTime() + timelineDays * 86_400_000)
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  /* "starting today to 27 Nov" was the first wording and reads as a mistake out loud. */
  return startsOn ? `from ${fmt(start)} to ${fmt(end)}` : `starting today, ending ${fmt(end)}`
}

export function scenarioFromParam(param: string | null): GroundScenario | null {
  if (!param) return null
  const stored = param.trim().toUpperCase().replace(/[\s+-]+/g, '_')
  if (SCENARIO_VALUES.has(stored)) return stored as GroundScenario
  return SCENARIO_FROM_LABEL[param.toLowerCase().replace(/\+/g, ' ')] ?? null
}

/** Every value the picker can produce. Derived from the map, so it cannot fall behind it. */
const SCENARIO_VALUES = new Set<string>(Object.values(SCENARIO_FROM_LABEL))

// The old numbering comment lived here and described a flow that has not existed for some time -
// including a "4=resolution" step that offered the end states. It is gone, `END_STATES` is imported
// by nothing but the spec that mirrors it, and end states are chosen at the CLOSE now. The stale
// comment is what kept the guide claiming you set a resolution state before a check-in starts.
// STAGE below is the ordering; the-steps-this-person-sees.ts decides who is shown what.
/**
 * THE STEPS HAVE NAMES NOW, AND THE NUMBERS ARE DERIVED FROM THEM.
 *
 * The flow was held as bare integers in thirty-three places - nine `setStep(n)` calls, twenty-one
 * `step === n` comparisons, three relational ones - with no single statement of what the order is.
 * Two of those are conditional jumps that encode plan state and card type, so reading the file did
 * not tell you the order either.
 *
 * That has already cost something. The picker's wide layout was written for the situation step and
 * its condition said `step === 1`; the steps were renumbered, the condition kept the old number,
 * and the widening silently applied to the "who is this for?" question instead - for months, until
 * an audit measured the page. Nothing failed, because a number is always a valid number.
 *
 * This changes no behaviour whatsoever: same values, same order, same screens. It means a renumber
 * is one edit here rather than thirty-three edits that all still compile if you get one wrong. The
 * eight-to-four cut this flow needs is not safe until that is true.
 */


/**
 * What each step is asking, in the words already on that step's own heading.
 *
 * Taken from the headings rather than invented, so the header and the page cannot say two
 * different things about the same screen. Step 5 is the one that no longer renders - see the note
 * on the end-state step - and is skipped rather than renumbered, because renumbering would break
 * every link and saved position that already exists.
 */
const STEP_NAMES: Record<number, string> = {
  [STAGE.who]: 'Who checks in',
  [STAGE.situation]: 'The situation',
  [STAGE.coach]: 'A coach',
  [STAGE.describe]: 'Describe it',
  [STAGE.plan]: 'Your plan',
  [STAGE.timeline]: 'How long it runs',
  [STAGE.people]: 'Who is in it',
  [STAGE.brief]: 'The brief',
}

/**
 * The shortest description the router can do anything with. Named, because it is enforced on the
 * button, dimmed on the button's style, and now counted down in the hint - three places that were
 * three separate literals.
 */
const MIN_OWN_DESCRIPTION = 20

export function CreateGroundPage() {
  // Asked once, on load, so the answer is on screen before any effort is spent.
  /**
   * The live free limit. This page rendered the hardcoded 10 in four sentences while the API read
   * the number an admin had set, so lowering the limit in the admin panel changed what the server
   * enforced and none of the four sentences a person actually read.
   */
  const { data: livePricing } = useQuery({
    queryKey: ['public-pricing'],
    queryFn: billingApi.getPricing,
    staleTime: 60 * 1000,
  })
  const freeLimit = livePricing?.free.groundLimit ?? FALLBACK_FREE_LIMITS.groundLimit

  const canCreate = useQuery({
    queryKey: ['can-create-ground'],
    queryFn: () => billingApi.checkCanCreateGround(),
    retry: false,
  })
  const navigate = useNavigate()
  /* Twenty cards is a wall even in six groups, if your words are not our headings. */
  /**
   * WHICH GROUP IS OPEN. One at a time now, chosen from a dropdown, instead of six expanded lists
   * with a jump bar over them. Defaults to the first group rather than to nothing, so the step
   * always has cards on it - a picker that shows nothing until you choose a heading is a step that
   * looks broken when it loads.
   */
  const [situationGroup, setSituationGroup] = useState<ScenarioGroupKey>(GROUPS_YOU_PICK_FROM[0].key as ScenarioGroupKey)
  /* The describe-your-own card, looked up rather than written out again - it is the same card the
     catalogue has always carried, just no longer inside a group. */
  /**
   * HOW MANY THIS STEP OFFERS, COUNTED OFF THE CARDS IT RENDERS.
   *
   * It read HOW_MANY_NAMED_SITUATIONS, which counts SCENARIO_LABELS minus the open one - 21. The
   * dropdown's group counts sum to 22, because they count CARDS, and COHORT_CHECK has two of them:
   * "Several people in the same role" and "Onboarding several people at once" are one scenario
   * offered as two situations. So the sentence said 21 while the thing under it offered 22.
   *
   * The number somebody is reading is "how many can I pick between", which is the cards. Counted
   * off the same array the groups are counted off, so the two cannot disagree again.
   *
   * (I had also written in the catalogue that the COHORT sharing "no longer holds". It does - my
   * regex had counted `scenario:` occurrences including OPEN_READ and got 22 distinct where there
   * are 21. Corrected there.)
   */
  const namedCardCount = SCENARIOS.filter(c => c.scenario !== 'OPEN_READ').length

  const openCard = SCENARIOS.find(c => c.scenario === 'OPEN_READ')
  const groupNow = GROUPS_YOU_PICK_FROM.find(g => g.key === situationGroup)
  /* null means "not searching" - show the grouped list. An empty array means "searched, found
     nothing", which is a different thing and gets a different message. */

  const [searchParams] = useSearchParams()
  const [step, setStep] = useState(1)
  /* Coaching is a paid feature, the same as the integration API. Null means nobody has ever paid. */
  const onAPaidPlan = !!useAuthStore(s => s.user?.organization?.subscriptionPlan)

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
  /**
   * 90 AND FORTNIGHTLY ARE NOW ONLY THE PRE-SELECTION STATE, seeded from the chosen situation.
   *
   * They used to be the values every ground was actually created with, because the client always
   * sent them - so the engine's per-scenario timeline was dead code on the path people use. A 14-day
   * shock ran for 90 days; a year-long advisory ran for 90 days.
   */
  const qc = useQueryClient()
  const [timelineDays, setTimelineDays] = useState(90)
  /*
   * WHEN THE CHECK-IN STARTS, WHICH IS NOT ALWAYS TODAY.
   *
   * `Ground.startsAt` has existed all along - the server stores it and gates the first check-in on
   * it - and nothing in this flow ever set it. So a lead setting up a 90 day onboarding three weeks
   * before somebody's first day had a 90 day clock that started the moment they pressed create.
   * Empty means today, which is what every existing check-in has always done.
   */
  const [startsOn, setStartsOn] = useState('')
  /** Which card has its "how it runs" open. One at a time, so the grid does not jump around. */
  const [openArc, setOpenArc] = useState<string | null>(null)
  /** The twenty-first card. Its own state because it creates nothing and shares no step with the rest. */
  const [coachOpen, setCoachOpen] = useState(false)
  const [coachSent, setCoachSent] = useState(false)
  const [coachErr, setCoachErr] = useState<string | null>(null)
  const [coachBusy, setCoachBusy] = useState(false)
  const [coach, setCoach] = useState({ name: '', orgName: '', email: '', teamSize: '', intention: '', triedAlready: false })
  /*
   * WHEN THEY WANT THE FIRST CONVERSATION - asked here, before the check-in is set up.
   *
   * Her spec for this step: schedule the first conversation BEFORE you decide. A coach whose first
   * conversation lands after the check-in is already running is help with something that has
   * already happened. Empty is a real answer and stays one; a coach comes back to agree a time.
   */
  const [coachWhen, setCoachWhen] = useState('')
  const [cadence, setCadence] = useState<GroundCadence>('FORTNIGHTLY')
  const [participants, setParticipants] = useState<Participant[]>([])
  const [pEmail, setPEmail] = useState('')
  const [pRole, setPRole] = useState('')
  const [pNote, setPNote] = useState('')
  /**
   * WHEN THIS PERSON STARTS, IF THEY HAVE NOT YET.
   *
   * Only shown for the situations that are set up about somebody before they begin. A future date holds
   * their invitation until the day, because an email asking somebody to account for their work can
   * otherwise land before they have signed a contract, and cannot be recalled once read.
   */
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkText, setBulkText] = useState('')
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
  const [leadEmail, setLeadEmail] = useState('')
  const [leadName, setLeadName] = useState('')
  /* The words for step 2 depend on whose situation it is - "someone else sets the context" makes
     every "you" on that step point at the wrong person. See whose-situation-is-it.ts. */
  const theWords = theWordsForPickingASituation()
  const [leadRemit, setLeadRemit] = useState('')
  const [groundName, setGroundName] = useState('')

  /**
   * WHAT WAS TYPED, KEPT ON THIS DEVICE UNTIL IT LANDS.
   *
   * This form kept exactly one thing — the situation card — and held everything else in component
   * state: the brief somebody wrote carefully, the people they listed, the dates, the lead, the
   * remits. A reload, an accidental back, a session timing out or a phone reclaiming a
   * backgrounded tab lost the lot, at the end of eight steps.
   *
   * Cleared the moment the check-in exists. A draft that outlives the thing it was drafting is
   * worse than losing it: it reappears, somebody finishes it a second time, and everybody is
   * invited twice.
   */
  const [restored, setRestored] = useState<Date | null>(null)

  useEffect(() => {
    const kept = whatWasKept<Record<string, unknown>>(DRAFT_KEY)
    if (!kept.value) return
    const d = kept.value as any
    if (typeof d.groundName === 'string') setGroundName(d.groundName)
    if (typeof d.brief === 'string') setBrief(d.brief)
    if (typeof d.ownDescription === 'string') setOwnDescription(d.ownDescription)
    if (typeof d.leadEmail === 'string') setLeadEmail(d.leadEmail)
    if (typeof d.leadName === 'string') setLeadName(d.leadName)
    if (typeof d.leadRemit === 'string') setLeadRemit(d.leadRemit)
    if (typeof d.startsOn === 'string') setStartsOn(d.startsOn)
    if (typeof d.bulkText === 'string') setBulkText(d.bulkText)
    if (typeof d.timelineDays === 'number') setTimelineDays(d.timelineDays)
    if (Array.isArray(d.participants)) setParticipants(d.participants)
    setRestored(kept.at)
    /* Once, on arrival. Restoring on every render would fight the person as they type. */
  }, [])

  useEffect(() => {
    /* Nothing typed yet is nothing worth keeping — an empty draft would offer to restore a blank
       form, which reads as the product having lost something. */
    const anything = brief.trim() || ownDescription.trim() || groundName.trim()
      || participants.length > 0 || bulkText.trim() || leadEmail.trim()
    if (!anything) return
    keep(DRAFT_KEY, {
      groundName, brief, ownDescription, leadEmail, leadName, leadRemit,
      startsOn, bulkText, timelineDays, participants,
    })
  }, [groundName, brief, ownDescription, leadEmail, leadName, leadRemit, startsOn, bulkText, timelineDays, participants])

  // Billing step state
  const [billingChecked, setBillingChecked] = useState(false)
  const [billingFree, setBillingFree] = useState(false)
  /* True when the check itself failed, which is neither allowed nor refused. */
  const [billingUnknown, setBillingUnknown] = useState(false)
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
  const briefShort = briefWords > 0 && briefWords < 20 /* BRIEF_WORDS_WORTH_READING, declared below with the other two */
  /**
   * MUST MATCH GroundsService.MEANS_SOMETHING (api/src/modules/grounds/grounds.service.ts).
   *
   * Below this, the server has nothing to invite anyone into: a brief this
   * short doesn't clear `assertSomethingToBeInvitedInto`, so `POST /grounds`
   * succeeds but the very next call, adding whoever was staged on "Who is in
   * it", 400s - "Nobody can be invited yet". The button used to only require
   * a non-empty brief, so it happily let people through to that dead end.
   * Matching the real gate here means the button itself is honest about what
   * "Continue" is actually going to do.
   */
  /**
   * TWO LIMITS ON THIS BOX, IN TWO DIFFERENT UNITS, NEITHER OF THEM STATED.
   *
   * The counter under the box reads "N words". The rule that actually blocked inviting anybody
   * counted CHARACTERS - 40 of them - so you could watch a number climb while the thing stopping
   * you was measuring something else, and nothing anywhere said either figure. Reported as: we need
   * to be clear about the word count limit on this page.
   *
   * Both are words now, and both are printed. The floor is the same intent as the old
   * forty characters: enough that the first person invited is told something.
   *
   * And the ceiling is real and was also unmentioned: the server accepts 4,000 characters
   * (@MaxLength on CreateGroundDto.brief) and would refuse the request beyond it. Nothing on the
   * page said so, so a long brief could be typed and lost on submit.
   */
  const BRIEF_WORDS_TO_INVITE = 8
  const BRIEF_WORDS_WORTH_READING = 20
  const BRIEF_CHARS_MAX = 4000
  const briefTooShortToInvite = participants.length > 0 && briefWords < BRIEF_WORDS_TO_INVITE

  // When entering step 2 (billing), auto-check
  useEffect(() => {
    if (step === STAGE.situation && !billingChecked) {
      setBillingLoading(true)
      setBillingUnknown(false)
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
        /*
         * WE COULD NOT ASK IS NOT THE SAME AS YOU ARE OUT.
         *
         * This treated any failure — a dropped connection, a 500, a timeout — as "not allowed",
         * and the screen for not-allowed is "Subscribe to create more". So a blip told a paying
         * admin to buy something they already have, and there was no way to tell that answer from
         * a real one.
         */
        setBillingChecked(true)
        setBillingLoading(false)
        setBillingFree(false)
        setBillingUnknown(true)
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
      const ground = await groundsApi.create({
        label: groundName.trim() || groundNameFallback(SCENARIOS.find(c => c.cardKey === selectedCard)?.label, scenario),
        scenario: scenario!,
        moment: moment!,
        timelineDays,
        cadence,
        ...(startsOn ? { startsAt: new Date(`${startsOn}T09:00:00`).toISOString() } : {}),
        brief: (brief.trim() || ownDescription.trim()) || undefined,
        ...(appliedAccessCode ? { accessCode: appliedAccessCode } : {}),
        /**
         * Sent at CREATE now, not via the follow-up confirmLead call that used to
         * run here. An admin's own ground is created OPEN, not AWAITING_LEAD, so
         * confirmLead's AWAITING_LEAD-only guard threw "already been confirmed"
         * on every single call for this flow, into a silent catch - meaning the
         * choice on the very first wizard step was dropped every time. The server
         * applies it at creation and skips the creator's own check-in when set.
         */
        ...(alsoAParty !== null ? { managingOnly: !alsoAParty } : {}),
      } as Parameters<typeof groundsApi.create>[0] & { accessCode?: string; managingOnly?: boolean })
      // Use allSettled so a failed invite email never blocks navigation to the
      // newly-created ground. Failed invites are surfaced as warnings after redirect.
      const results = await Promise.allSettled(participants.map(p =>
        groundsApi.addParticipant(ground.id, {
          email: p.email,
          roleAsDescribed: p.role || undefined,
          note: p.note || undefined,
          /*
           * The check-in's start date, which is what holds an invitation until somebody's first
           * day. Only sent when it is in the future - a past or absent date means invite now,
           * exactly as it always did.
           */
          startsAt: p.startsAt ?? (startsOn && new Date(`${startsOn}T09:00:00`).getTime() > Date.now()
            ? new Date(`${startsOn}T09:00:00`).toISOString()
            : undefined),
        })
      ))
      /*
       * THE SERVER'S OWN REASON, PER PERSON, RATHER THAN A COUNT.
       *
       * This counted rejections and said "2 invites could not be sent - retry from the check-in
       * page", which is wrong twice over. Retrying does not help when the reason is a seat limit or
       * an email that is already on the check-in, and the person is left guessing at a rule nobody
       * told them: the lead who saw this concluded the product would only add people already in the
       * organisation, which is not what it said and not what happened.
       *
       * The API answers every one of these with a sentence written for a person. It was being
       * thrown away one line before it reached them.
       */
      const failed = results
        .map((r, i) => ({ r, email: participants[i].email }))
        .filter((x): x is { r: PromiseRejectedResult; email: string } => x.r.status === 'rejected')
        .map(({ r, email }) => ({
          email,
          because: (r.reason as any)?.response?.data?.message
            ?? (r.reason as any)?.message
            ?? 'The invite did not send.',
        }))
      /*
       * WHO WAS ADDED BUT NOT EMAILED, WHICH NOTHING COUNTED.
       *
       * An invitation waits when the check-in starts in the future: the row is written with
       * `invitedAt: null` and no mail goes, on purpose, because a mail that has been read cannot be
       * recalled. Only refusals were reported here, so setting a start date and adding five people
       * produced a cheerful "Check-in opened" and five people who heard nothing - reported exactly
       * that way, with no clue on any screen as to why.
       */
      const waiting = results
        .filter((r): r is PromiseFulfilledResult<{ invitedAt?: string | null }> => r.status === 'fulfilled')
        .filter((r) => !r.value?.invitedAt).length
      return { ground, failed, waiting }
    },
    onSuccess: ({ ground, failed, waiting }) => {
      toast.success('Check-in opened')
      /* Said once, with the number, rather than per person - it is one fact about the check-in. */
      if (waiting > 0) {
        toast.info(
          waiting === 1
            ? 'One person is on the check-in and will be invited on the start date.'
            : `${waiting} people are on the check-in and will be invited on the start date.`,
        )
      }
      /* It exists now, so the draft must not. See the note on DRAFT_KEY. */
      forget(DRAFT_KEY)
      /*
       * THE RAIL DOES NOT KNOW IT EXISTS UNTIL SOMEBODY TELLS IT.
       *
       * The sidebar reads `['grounds']` and this navigated away without invalidating it, so a
       * person who had just created a check-in landed on its page with the rail still showing the
       * list from before - their new one simply absent from the place they had been told to look
       * for it. It appeared later, whenever something else happened to refetch.
       */
      qc.invalidateQueries({ queryKey: ['grounds'] })
      /* One toast per person, each carrying the reason that person was refused for. */
      for (const f of failed) toast.warning(`${f.email}: ${f.because}`)
      /*
       * AND WRITTEN DOWN, because a toast does not survive the navigation on the next line, let
       * alone a reload. The admin's list of five silently became three and the destination page
       * recorded none of it. See who-was-not-invited.ts.
       */
      rememberWhoWasNotInvited(ground.id, failed)
      navigate(`/grounds/${ground.id}`)
    },
    /*
     * THE SERVER'S OWN REASON, WHERE IT GAVE ONE.
     *
     * This said "Could not open it. Try again." to everything, which is right for a network blip
     * and wrong for every refusal - and the product now has a refusal that will never come good by
     * retrying: somebody who has not been named as able to open check-ins. Telling them to try
     * again sends them round a loop the product knows they cannot leave.
     *
     * Only a 4xx message is shown. A 500 carries an internal message that is nobody's business, and
     * "try again" is the honest answer to one anyway.
     */
    onError: (e: any) => {
      const status = e?.response?.status
      const said = e?.response?.data?.message
      toast.error(
        status >= 400 && status < 500 && typeof said === 'string' && said
          ? said
          : 'Could not open it. Try again.',
      )
    },
  })

  function addParticipant() {
    const email = pEmail.trim()
    if (!email || !email.includes('@')) return
    if (participants.find(p => p.email === email)) return
    setParticipants(v => [...v, { email, role: pRole.trim(), note: pNote.trim(), startsAt: undefined }])
    setPEmail(''); setPRole(''); setPNote('')
  }

  function addBulk() {
    const emails = bulkText.split(/[\n,;]+/).map(e => e.trim()).filter(e => e.includes('@'))
    const fresh = emails.filter(e => !participants.find(p => p.email === e))
    setParticipants(v => [...v, ...fresh.map(e => ({ email: e, role: '', note: '', startsAt: undefined as string | undefined }))])
    setBulkText('')
    setBulkMode(false)
  }

  /**
   * THE STEPS THIS PERSON WILL ACTUALLY SEE, IN ORDER.
   *
   * Three of the eight are conditional, and every part of the flow worked that out for itself:
   * `next` had its own arithmetic, `back` had a special case with a comment apologising for it,
   * and the counter said "of 8" to somebody who would be shown six. Skipping a step in three
   * places and counting it in a fourth is how "Step 5 of 8" appeared directly after step 3.
   *
   * So the flow is a list now. Forward is the next entry, back is the previous one, and the
   * counter is a position in it. A step that is not for this person is not in the list, and
   * cannot be counted, landed on by Back, or stepped over by arithmetic that forgot it.
   *
   * THE BILLING STEP EARNS ITS PLACE OR IT IS NOT THERE. It has two states: "no payment needed,
   * press Continue", and a real refusal with an access-code box. The first is a screen whose only
   * content is that it has nothing to say - shown in the middle of setting something up, between
   * describing the situation and saying how long it runs. It is in the list only when the check
   * has come back and come back blocking. While the check is still running it stays in, because a
   * person must not be walked past a refusal that had not arrived yet.
   */
  const visibleSteps = stepsThisPersonSees({
    onAPaidPlan,
    describingOwnSituation: selectedCard === 'DESCRIBE_OWN',
    billingSettledAndFree: billingChecked && billingFree,
  })

  function back() {
    const previous = stepBefore(visibleSteps, step)
    if (previous === null) navigate('/grounds')
    else setStep(previous)
  }

  // Display dot index: step 1 → dot 1, step 2 (billing) → dot 2, steps 3-6 → dots 3-6
  /**
   * One dot per stage, and the dot count comes from STAGE rather than a number typed here - the
   * comment this replaces said "(6)" while the constant said 8, which is what a second copy of a
   * fact does when the first one changes.
   */
  const displayStep = Math.max(1, visibleSteps.indexOf(step) + 1)
  /** Not `Object.keys(STAGE).length`: that counts steps this person is never shown. */
  const totalStepsForThisPerson = visibleSteps.length

  /* Only the open card's label depends on who is reading; every other one is its own name. */
  const cardLabel = (card: ScenarioCard) =>
    card.scenario === 'OPEN_READ' ? theWords.describeOwnLabel : card.label

  const renderSituation = (card: ScenarioCard) => {
                        const facts = SCENARIO_FACTS[card.scenario]
                        const isSel = selectedCard === card.cardKey
                        const arcOpen = openArc === card.cardKey
                        const pick = () => {
                          setScenario(card.scenario)
                          setSelectedCard(card.cardKey)
                          sessionStorage.setItem('gw-new-ground-card', card.cardKey)
                          /* Seeding, not setting. Both were hardcoded here - 90 days and
                             fortnightly for every situation - so the engine's per-scenario
                             timeline was never reached on the path people use. The lead still
                             changes either one at step 3. */
                          setTimelineDays(facts.timelineDays)
                          setCadence(CADENCE_VALUE[facts.cadence] as GroundCadence)
                          /* And where in the arc. Step one required this second choice and disabled
                             Continue until it was answered, without saying which choice was missing -
                             while the card just clicked already answered it. Still changeable below. */
                          setMoment(RECOMMENDED_MOMENT[card.scenario] as GroundMoment)
                        }
                        return (
                          <SituationCard
                            key={card.cardKey}
                            card={card}
                            label={cardLabel(card)}
                            selected={isSel}
                            focusable={isSel || (!selectedCard && card.cardKey === SCENARIOS[0].cardKey)}
                            expanded={arcOpen}
                            onToggleExpanded={() => setOpenArc(arcOpen ? null : card.cardKey)}
                            onPick={pick}
                            extra={
                              /*
                               * WHERE YOU ACTUALLY TYPE IT, SAID ON THE CARD.
                               *
                               * Every other card on this step is a complete choice: pick it and the
                               * step is answered. This one is a promise of a text box that lives on
                               * the NEXT screen, and the card looked identical to the others - so
                               * picking it appeared to do nothing, and the field it leads to could
                               * not be found. Reported as exactly that.
                               *
                               * Passed in rather than built into the card, because it is true of
                               * this screen only: the entry chat has no next screen to promise.
                               */
                              card.scenario === 'OPEN_READ' && isSel ? (
                                <div style={{ fontSize: 11.5, color: 'var(--gw-navy)', fontWeight: 600, marginTop: 2 }}>
                                  You write it on the next screen, in your own words.
                                </div>
                              ) : undefined
                            }
                          />
                        )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      {/*
        * SAID, RATHER THAN QUIETLY DONE.
        *
        * A form that fills itself in without saying so is a form somebody does not trust: they
        * cannot tell what is theirs and what the product invented. And there has to be a way to
        * say no — coming back to start a different check-in and finding the last one's brief in
        * the box is worse than an empty form.
        */}
      {restored && (
        <div
          role="status"
          style={{
            background: 'var(--gw-blue-bg)',
            borderBottom: '1px solid var(--gw-border)',
            padding: '9px 20px',
            fontSize: 13,
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span>Picked up where you left off {howLongAgo(restored)} — on this device.</span>
          {/* "Start fresh" was `gw-btn-ghost`, which no stylesheet defines - so it rendered as a
              raw browser button inside a styled banner. Same silent failure as the seven `gw-in`
              fields; found by the guard written for those. `gw-btn-sm` is the small muted control
              this actually is. */}
          <button
            type="button"
            className="gw-btn-sm"
            style={{ margin: 0 }}
            onClick={() => {
              forget(DRAFT_KEY)
              window.location.reload()
            }}
          >
            Start fresh
          </button>
        </div>
      )}
      <div className="gw-hdr">
        {/* The rail already says Groundwork two inches to the left. This said it again, so
              the page's own name is here instead - which is the thing a second line of
              chrome could usefully carry. W13-11. */}
              {/*
                * THE HEADER NAMES THE PAGE AND WHERE YOU ARE IN IT.
                *
                * It said "What's going on?" on all six steps - the name of the first question, on
                * screens that were asking five other things. A person halfway through had no way to
                * tell how far in they were except by counting six grey dots.
                */}
              <h1 className="gw-logo gw-page-h1">Set up a check-in</h1>
              <span style={{ fontSize: 13, color: 'var(--gw-sub)', marginLeft: 10 }}>
                Step {displayStep} of {totalStepsForThisPerson} · {STEP_NAMES[step] ?? ''}
              </span>
        <button className="gw-back" onClick={back}>← Back</button>
      </div>

      {/*
        * THE PICKER GETS THE WHOLE WIDTH. EVERY OTHER STEP STAYS NARROW.
        *
        * The grid was already `repeat(auto-fill, minmax(275px, 1fr))` and could have laid out four
        * across the whole time - it never did, because the body is capped at 540px, which fits
        * exactly one column. So twenty-one situations came down as one column and one very long
        * scroll, and the jump bar above them exists because of it.
        *
        * Only the picker. The others are a form - a timeline, a list of people, a brief - and a
        * form read across 1160px is worse, not better: the eye has to travel the width of the
        * screen between a label and its field. 1160 is four 275px cards and their gaps.
        *
        * IT SAID `step === 1`, AND THE PICKER IS STEP 2.
        *
        * The steps were renumbered - the same edit that left "Step 6 (was 5)" further down - and
        * this condition kept the old number. So the widening above was written, explained at
        * length, and then quietly stopped applying to anything: step 1 is the three-option "who is
        * this for?" question, which wants the narrow column, and the twenty-one cards went back to
        * being squeezed into 540px on a 1280px screen.
        *
        * Worse than a plain regression, because the card grid asks for its column count from the
        * VIEWPORT, not from its container. At 1280px wide the grid asked for four columns and got
        * a 508px box to put them in, so the cards came out about 119px across - narrower than they
        * had ever been in a single column.
        */}
      <div className="gw-bd" style={{ maxWidth: step === STAGE.situation ? 1160 : 540, margin: '0 auto', width: '100%' }}>
        {/* Step dots */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {Array.from({ length: totalStepsForThisPerson }, (_, i) => i + 1).map(n => (
            <div key={n} className={`cg-step-dot${displayStep === n ? ' active' : displayStep > n ? ' done' : ''}`} />
          ))}
        </div>

        {/* Step 1: Scenario + Moment */}
        {/* The picking screens share one shell. Named rather than ranged: this read
            `step >= STAGE.who && step <= STAGE.describe`, and `who` is the LAST step now, so a
            range would have hidden every one of them. */}
        {(step === STAGE.situation || step === STAGE.coach || step === STAGE.describe || step === STAGE.who) && (
          <div>
            {/* SAID BEFORE THE SETUP WORK, NOT AFTER IT, WHICH MEANS IT HAD TO MOVE WITH THE STEPS.
                The API refuses an eleventh check-in correctly, but it refused it at submit - so the
                admin picked a card, named it, set the timeline and the people, and only then was
                told she could not. The block was right; the timing made it feel like a trick.
                It sat inside the "who checks in" step because that step was FIRST. That step is now
                LAST, so leaving it there would have put the refusal back at the end - the exact bug,
                reintroduced by moving a neighbour. It belongs to whichever screen opens the flow. */}
            {step === STAGE.situation && (<>
            {/* Say the limit is reached BEFORE the setup work, not after it.
                The API refuses an eleventh ground correctly, but it refused it
                at submit - so the admin picked a card, named the ground, set
                the timeline and the people, and only then was told she could
                not. The block was right; the timing made it feel like a trick. */}
            {canCreate.data && !canCreate.data.allowed && (
              <div style={{ background: 'var(--gw-amber-bg)', border: '1px solid var(--gw-amber-bd)', borderRadius: 8, padding: '12px 14px', marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-amber-t)', marginBottom: 4 }}>
                  You have used all {freeLimit} of your free check-ins
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 10 }}>
                  {canCreate.data.reason ?? 'Subscribe to open more.'} You can still look
                  around here, but this one cannot be created until then.
                </div>
                <button
                  onClick={() => navigate('/billing')}
                  style={{ padding: '8px 16px', borderRadius: 7, background: 'var(--gw-dark)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  See plans
                </button>
              </div>
            )}
            </>)}

            {/* ---- LAST: who checks in against this ----
                 Numbered comments used to label these ("STEP 1: who this check-in is for"), and the
                 numbers went stale the moment a step moved. Named now: the order lives in
                 stepsThisPersonSees and a comment that repeats it is a second copy that can drift. */}
            {step === STAGE.who && (<>
            {/* MOVED FROM STEP 4 TO THE TOP OF STEP 1.
                It decides what everything the person types afterwards IS. A party's words are their
                own account; a non-party's are context about other people, which this product treats
                as "a place to look, never a thing that is true". Asked at step 4, the words were
                collected first and classified once they were already written.
                It also matters most for the commonest case: somebody told to set this up has no
                situation of their own, and "someone else runs this" was three steps out of reach. */}
            <div role="radiogroup" aria-label="Where do you sit in this check-in?" style={{ border: '1px solid var(--gw-border)', borderRadius: 10, padding: '12px 14px', marginBottom: 16, background: 'white' }}>
              {/*
                * WHO IS THIS FOR, ANSWERED IN TERMS OF WHO WRITES THE OBJECTIVE AND WHO CHECKS IN.
                *
                * It asked "where do you sit in this?" and offered "I am part of this too" against
                * "I am setting it up for others", which describes a seating plan. The thing being
                * decided is concrete and this hid it: who sets the context and the objective, and
                * who then checks in against it. Her words, and they are better than what was here:
                *
                *   "i'll setup the context and objective and me and other checkin against it,
                *    i'll setup the context and others checkin against it,
                *    someone else is setting up the context, i am just setting the checkin and
                *    inviting them to run it"
                *
                * The same three now read the same way in the entry chat - see ONBOARD_SYSTEM in
                * entry.service.ts, which asks this in conversation rather than as radio buttons.
                */}
              {/* THE WORDS FOLLOWED THE SCREEN. "Who is this check-in for? ... Everything after it
                  is asking you for one or the other" was written for the FIRST screen, and there is
                  nothing after this one - it is the last thing before the check-in opens. */}
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>Last thing: do you check in on this too?</div>
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 9, lineHeight: 1.5 }}>
                You have written what this is about. This decides whether you also give your own account against it, or read what comes back. You can change it later.
              </div>
              {[
                { v: true, label: 'I check in too', sub: 'You give your own account against this, alongside everyone else, and it goes in the report with theirs.', other: false },
                { v: false, label: 'They check in, I read the reports', sub: 'They give the accounts. Nothing asks you to check in, and nothing measures you.', other: false },
                /*
                 * THE THIRD ANSWER IS GONE. HER CALL, AND HER REASON.
                 *
                 * "I think we should remove the whole org admin setting a context and handing it
                 * over to a lead. It seems like it is confusing. maybe you set context but you can
                 * add someone to have oversight."
                 *
                 * It was the one answer that produced a check-in belonging to somebody who was not
                 * in the room: this person filled in a situation, a timeline and a roster, and then
                 * a lead was emailed to confirm a context they had not written and could not see
                 * until they accepted. Two people half-owned it and neither could finish it alone.
                 *
                 * What is left is the real distinction: you write what good looks like, and either
                 * you check in against it or you read what comes back. Anybody who needs to watch
                 * without writing it is added as oversight in the check-in's own settings, after it
                 * exists - which is where every other "who else should see this" question is asked.
                 */
              ].map((o) => (
                <div
                  key={o.label}
                  role="radio"
                  tabIndex={alsoAParty === o.v || (alsoAParty === null && o.v) ? 0 : -1}
                  aria-checked={alsoAParty === o.v}
                  aria-label={`${o.label}. ${o.sub}`}
                  onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setAlsoAParty(o.v) } }}
                  onClick={() => { setAlsoAParty(o.v) }}
                  className={`cg-sit-card${alsoAParty === o.v ? ' selected' : ''}`}
                  style={{ marginBottom: 6 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{o.label}</div>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${alsoAParty === o.v ? 'var(--gw-navy)' : 'var(--gw-border)'}`, background: alsoAParty === o.v ? 'var(--gw-navy)' : 'transparent', flexShrink: 0 }} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.45 }}>{o.sub}</div>
                </div>
              ))}
              {/*
                * "YOUR PART IN THE WORK" IS GONE, AND IT WAS NEVER GOING ANYWHERE.
                *
                * Her call: the chat asks this anyway, and there are too many places asking you for
                * things. Both true - the check-in asks it in these words: "What are you bringing to
                * this, what are you responsible for, and what does your contribution look like over
                * the next period? Not the vision. The work."
                *
                * And it was worse than redundant. Traced before removing it: `myRemit` was held in
                * component state, written into the saved draft, and sent to the server by NEITHER
                * create path. It asked a question on the way in and threw the answer away, so the
                * only thing it ever did was make the screen longer.
                *
                * `leadRemit` on the other branch is kept: that one is sent at creation, and it is
                * about somebody who is not here to be asked yet.
                */}
            </div>

            </>)}

            {/* ---- FIRST: which situation ---- */}
            {step === STAGE.situation && (<>
            {/*
              * ONE PICK AT THE TOP, THEN A DROPDOWN. What this replaced and why:
              *
              * A "Not sure yet" GROUP holding a single card. Its heading and its blurb existed to
              * introduce one option, and in a dropdown it would have been an entry leading back to
              * what the page has already offered. The card it held is the important one, so it is
              * now the first thing on the step rather than the first of six groups.
              *
              * A SEARCH BOX over twenty-one items. It was added for the person who knows their
              * situation but not our heading for it, and a dropdown answers that better: the
              * headings are the questions, and picking one changes what is below it. A search also
              * has to be told when it finds nothing, which is a second empty state to keep true.
              *
              * SIX GROUPS ALL EXPANDED, with a jump bar above them to cope with the length. The
              * length was the problem the jump bar was managing. One group at a time has no length
              * to manage.
              */}
            <div className="gw-sub-t" style={{ marginBottom: 14 }}>
              {/* Whose situation this is decides the pronouns - see whose-situation-is-it.ts.
                  NAMED situations, because the describe-your-own card is no longer one of the
                  things being counted: it is the pick above them. */}
              {namedCardCount} {theWords.intro}
            </div>

            {/* THE FIRST PICK. Same card, same renderer, same selection behaviour as any other -
                duplicating the JSX for it is how it would start behaving differently. */}
            {openCard && (
              <div role="radiogroup" aria-label={theWords.describeOwnLabel} className="cg-group-grid one" style={{ marginBottom: 20 }}>
                {renderSituation(openCard)}
              </div>
            )}

            <label className="gw-label" htmlFor="cg-group">Or select from the options below</label>
            <select
              id="cg-group"
              className="gw-select"
              value={situationGroup}
              onChange={(e) => setSituationGroup(e.target.value as ScenarioGroupKey)}
              style={{ marginBottom: 12 }}
            >
              {GROUPS_YOU_PICK_FROM.map(g => (
                <option key={g.key} value={g.key}>
                  {g.heading} ({cardsInGroup(g.key as ScenarioGroupKey).length})
                </option>
              ))}
            </select>

            {/* The group's own question, which is what its heading is short for. */}
            <p className="cg-group-q">{groupNow?.question}</p>

            {/* Real radios in one radiogroup over what is actually on screen. It used to span every
                group at once because every group was on screen at once. */}
            {/* `id` is here as a stable anchor for the-picker-gets-the-whole-width.spec.ts, which
                used to find this block by its aria-label. That label now names the chosen group,
                which is better for a screen reader and useless as a marker - a guard cannot anchor
                on a string that varies. */}
            <div id="cg-situations" role="radiogroup" aria-label={groupNow?.heading ?? 'Situations'} style={{ marginBottom: 24 }}>
              <div className={`cg-group-grid${cardsInGroup(situationGroup).length === 1 ? ' one' : ''}`}>
                {cardsInGroup(situationGroup).map(renderSituation)}
              </div>
            </div>

            </>)}

            {/* ---- THEN: a coach, before you decide ---- */}
            {step === STAGE.coach && (<>
            {/*
              * A STEP OF ITS OWN, BEFORE THE SITUATION IS WRITTEN DOWN.
              *
              * The coach used to sit at the bottom of the same screen as the twenty-one situation
              * cards, below a group called "Not sure yet", where it read as the thing you scroll
              * past. Two things were wrong with that: it is a decision, not a card, and it is a
              * decision worth making BEFORE you write the situation down rather than after - the
              * whole point of a coach is help shaping what you are about to set up.
              *
              * PAID, LIKE THE API, AND GREYED THE SAME WAY. Coaching is not on the free plan, and
              * the honest place to say so is here rather than in a reply to a request somebody has
              * already spent ten minutes writing. Nothing is hidden: the card is readable, dimmed,
              * and offers the two real answers - go and pay, or carry on without one.
              */}
            {!onAPaidPlan && (
              <div style={{ background: 'var(--gw-amber-bg)', border: '1px solid var(--gw-amber-bd)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--gw-amber-t)', marginBottom: 5 }}>
                  Working with a coach is part of a paid plan
                </div>
                <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 10 }}>
                  You can carry on and set this check-in up without one - most teams do. If you want a
                  person alongside it, the plans are one click away and you will come back to this step.
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => navigate('/pricing')}
                    style={{ fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', padding: '7px 14px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', border: 'none' }}
                  >
                    See the plans
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(stepAfter(visibleSteps, step))}
                    style={{ fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', padding: '7px 14px', borderRadius: 7, background: 'white', color: 'var(--gw-sub)', border: '1px solid var(--gw-border)' }}
                  >
                    Skip this
                  </button>
                </div>
              </div>
            )}
            <div style={{ opacity: onAPaidPlan ? 1 : 0.55, pointerEvents: onAPaidPlan ? 'auto' : 'none' }}>
            {/* THE COACH CARD. Outside the radiogroup on purpose: it is not a situation, it
                creates nothing, and it must not be selectable as one.

                LAST ON THE PAGE, WHICH IS NOT THE SAME AS BEING THE LAST RESORT. It used to read
                "Not sure this is the right tool yet" and sat directly under "Not sure yet", so the
                order and the words agreed on the wrong thing: that a coach is what you fall back on
                when you cannot name your situation. It is the opposite - somebody who knows exactly
                what they are dealing with and wants a person alongside while they run it. The words
                say that now, and it stays at the end because it is the one card that creates
                nothing, not because it ranks last. */}
            <section className="cg-group" id="cg-coach">
              <div className="cg-group-head"><h3>{COACH_CARD.heading}</h3></div>
              <p className="cg-group-q">{COACH_CARD.question}</p>
              <div className="cg-group-grid one">
                <div className="cg-sit-card" style={{ cursor: 'default' }}>
                  <span style={{ alignSelf: 'flex-start', fontSize: 10.5, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 5, background: 'var(--gw-clay-bg)', color: 'var(--gw-clay)' }}>A coach</span>
                  <div style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.3 }}>{COACH_CARD.label}</div>
                  <p className="cg-moment">{COACH_CARD.moment}</p>
                  <p style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.55, margin: 0 }}>{COACH_CARD.whatHappens}</p>
                  {/* The cost is here, before the button, not after a reply has been chased. */}
                  <p style={{ fontSize: 12.5, color: 'var(--gw-text)', lineHeight: 1.55, margin: 0, padding: '9px 11px', background: 'var(--gw-paper-2)', borderRadius: 6 }}>{COACH_CARD.cost}</p>

                  {coachSent ? (
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-green-t)', margin: 0 }}>
                      Thanks. We have your request and have emailed you. Nothing has been created here and nobody on your team was contacted.
                    </p>
                  ) : !coachOpen ? (
                    <button type="button" className="cg-more" onClick={() => setCoachOpen(true)}>Ask a coach &#8250;</button>
                  ) : (
                    <div style={{ display: 'grid', gap: 8 }}>
                      {([
                        { k: 'name', label: 'Your name', ph: '' },
                        { k: 'orgName', label: 'Organisation', ph: '' },
                        { k: 'email', label: 'Work email', ph: 'you@company.com' },
                        { k: 'teamSize', label: 'Roughly how many people', ph: 'e.g. 12' },
                      ] as const).map(f => (
                        <label key={f.k} style={{ fontSize: 12, fontWeight: 600, color: 'var(--gw-sub)', display: 'grid', gap: 3 }}>
                          {f.label}
                          <input
                            className="gw-select"
                            value={(coach as any)[f.k]}
                            placeholder={f.ph}
                            onChange={e => setCoach({ ...coach, [f.k]: e.target.value })}
                          />
                        </label>
                      ))}
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--gw-sub)', display: 'grid', gap: 3 }}>
                        What do you want help with?
                        <textarea
                          className="gw-select"
                          rows={3}
                          value={coach.intention}
                          placeholder="A line or two is enough. It is what the first reply is written from."
                          onChange={e => setCoach({ ...coach, intention: e.target.value })}
                        />
                        <span style={{ fontSize: 11, color: coach.intention.trim().length >= MIN_INTENTION_LENGTH ? 'var(--gw-muted)' : 'var(--gw-amber-t)' }}>
                          {coach.intention.trim().length >= MIN_INTENTION_LENGTH
                            ? 'Thanks, that is enough to reply to.'
                            : `A little more, please. ${MIN_INTENTION_LENGTH - coach.intention.trim().length} characters to go.`}
                        </span>
                      </label>
                      <label style={{ fontSize: 12, color: 'var(--gw-sub)', display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                        <input type="checkbox" checked={coach.triedAlready} onChange={e => setCoach({ ...coach, triedAlready: e.target.checked })} />
                        <span>I have already tried opening a check-in</span>
                      </label>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--gw-sub)', display: 'grid', gap: 3 }}>
                        When would you like the first conversation?
                        <input
                          className="gw-input"
                          type="datetime-local"
                          value={coachWhen}
                          min={new Date(Date.now() + 3600_000).toISOString().slice(0, 16)}
                          onChange={e => setCoachWhen(e.target.value)}
                          style={{ maxWidth: 260 }}
                        />
                        {/*
                          * A REQUEST, NOT A BOOKING, and it has to keep saying so. Nothing here
                          * holds a slot in anybody's calendar - a coach confirms - and somebody
                          * leaving this page believing they have an appointment would be worse off
                          * than if it had never asked.
                          */}
                        <span style={{ fontSize: 11, color: 'var(--gw-muted)', fontWeight: 400, lineHeight: 1.5 }}>
                          Optional, and it is a request rather than a booking - a coach confirms. Leave it
                          empty and we will come back to you to agree a time.
                        </span>
                      </label>
                      {/*
                        * WHAT IT COSTS, BEFORE THE SEND BUTTON.
                        *
                        * `COACHING_PRICE` says in its own comment that the price is "shown before
                        * the send button rather than after a reply is chased", and only `.note` was
                        * ever rendered - so the two figures were exported, kept in step with the
                        * pricing page, and read by nobody. Somebody asking to speak to a coach
                        * learned the number in the reply.
                        */}
                      <p style={{ fontSize: 11.5, color: 'var(--gw-muted)', margin: 0, lineHeight: 1.5 }}>
                        {COACHING_PRICE.hourly}, or {COACHING_PRICE.retained}. {COACHING_PRICE.note}
                      </p>
                      {coachErr && <p style={{ fontSize: 12, color: 'var(--gw-red-t)', margin: 0 }}>{coachErr}</p>}
                      <button
                        type="button"
                        className="gw-btn"
                        style={{ margin: 0 }}
                        disabled={coachBusy || !coach.name.trim() || !coach.orgName.trim() || !coach.email.includes('@') || !coach.teamSize.trim() || coach.intention.trim().length < MIN_INTENTION_LENGTH}
                        onClick={async () => {
                          setCoachBusy(true); setCoachErr(null)
                          try {
                            await coachApi.request({
                              ...coach,
                              intention: coach.intention.trim(),
                              /* Sent as an instant, because a wall-clock string means a different
                                 moment to the person asking and the coach reading it. */
                              ...(coachWhen ? { preferredAt: new Date(coachWhen).toISOString() } : {}),
                            })
                            setCoachSent(true)
                          } catch (e: any) {
                            setCoachErr(e?.response?.data?.message ?? 'That did not send. Try again in a moment.')
                          } finally {
                            setCoachBusy(false)
                          }
                        }}
                      >
                        {coachBusy ? 'Sending...' : 'Send request'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>

            </div>
            </>)}

            {/* ---- THEN: describe it in your own words ---- */}
            {step === STAGE.describe && (<>
            {selectedCard === 'DESCRIBE_OWN' && (
              <div style={{ border: '1px solid var(--gw-border)', borderRadius: 10, padding: '14px 16px', marginBottom: 18, background: 'white' }}>
                <label className="gw-label" htmlFor="own-situation">Describe it in your own words</label>
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 8, lineHeight: 1.5 }}>
                  What is happening, who is involved, and what you want out of it. We will suggest the closest
                  situation and you can change it - what gets picked decides the questions people are asked.
                </div>
                <textarea id="own-situation" className="gw-ta" rows={4} value={ownDescription}
                  onChange={(e) => { setOwnDescription(e.target.value); setRoutedTo(null); setRouteFailed(false) }}
                  placeholder="e.g. Four new clinic managers on a three month probation. They run separate clinics and never work together, but they all report to me." />
                {/*
                  A BUTTON THAT REFUSES AND WILL NOT SAY WHY. W-UX-7.
                  
                  Twenty characters, enforced in two places on this line and stated in neither. A
                  person who typed "new manager" got a greyed-out button, no message, and no way to
                  find out what was wrong - the only remaining move is to guess or to leave.
                  
                  The coach form three hundred lines up already does this properly, counting down the
                  characters it still wants. Same treatment, same reason.
                */}
                {ownDescription.trim().length > 0 && ownDescription.trim().length < MIN_OWN_DESCRIPTION && (
                  <div style={{ fontSize: 11, color: 'var(--gw-amber-t)', marginTop: 6 }}>
                    A little more, please. {MIN_OWN_DESCRIPTION - ownDescription.trim().length} characters to go.
                  </div>
                )}
                <button
                  disabled={ownDescription.trim().length < MIN_OWN_DESCRIPTION || routing}
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
                  style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: 'white', background: 'var(--gw-navy)', border: 'none', borderRadius: 7, padding: '8px 14px', cursor: 'pointer', fontFamily: 'inherit', opacity: ownDescription.trim().length < MIN_OWN_DESCRIPTION || routing ? 0.45 : 1 }}>
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
                    {/*
                      * ITEM 1: SAY WHAT THEY ARE ACTUALLY GETTING.
                      *
                      * This used to promise "a general ground" while handing over a REALIGN_TEAM one.
                      * Now the general ground genuinely exists, so the sentence is true - and it names
                      * the trade rather than glossing it.
                    */}
                    We could not tell which of the situations above this is closest to, so we will open an
                    <b> open read</b>: each person gives their own account privately and the report shows where
                    they differ. That works when the shape is genuinely unclear. If one of the cards above does
                    fit, pick it instead - a named situation asks sharper questions than this one can.
                  </div>
                )}
              </div>
            )}

            </>)}

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
                  /*
                   * ONE BAR, FOUR STEPS, AND EACH ONE ONLY ASKS FOR ITS OWN THING.
                   *
                   * This used to gate on everything at once, because everything was on one screen:
                   * a person could not continue until they had picked a situation AND a moment AND
                   * described it, with a single line of help trying to say which was missing. Split
                   * into steps, each has one thing to be waiting for, so the message is exact.
                   */
                  const needsRouting = selectedCard === 'DESCRIBE_OWN' && !routedTo && !routeFailed

                  const blocked =
                    step === STAGE.who ? alsoAParty === null
                    : step === STAGE.situation ? (!scenario || !moment)
                    : step === STAGE.describe ? needsRouting
                    : false

                  const why =
                    step === STAGE.who ? 'Choose one to continue'
                    : step === STAGE.situation ? (!scenario ? 'Pick a situation to continue' : 'Pick where you are in it to continue')
                    : step === STAGE.describe ? 'Describe the situation above, then let us find the closest match'
                    : ''

                  /* Step 4 only exists for the free-text path; a card already says what this is. */
                  /*
                   * THE COACH STEP IS SKIPPED FOR ANYBODY WHO CANNOT USE IT.
                   *
                   * On the free plan step three showed two things: a block saying coaching is paid,
                   * and the coach card itself, dimmed and inert beneath it. Two cards to say one
                   * thing, in the middle of setting a check-in up, to somebody who cannot act on
                   * either. It read as an obstacle because it was one.
                   *
                   * Paid plans still get the step, with the card and without the block above it.
                   */
                  /* Was its own arithmetic, with two bare 4s and two bare 5s the naming pass
                     did not reach, and it had to know which steps get skipped - the same knowledge
                     `back` and the counter each held separately. One list, asked three ways. */
                  const next = stepAfter(visibleSteps, step)

                  return (
                    <>
                      {/* WHEN THERE IS NOTHING AFTER THIS STEP, CONTINUE IS THE END OF THE FLOW.
                          `stepAfter` returns the SAME step when it is the last one - its documented
                          contract - so this used to leave somebody exactly where they were with no
                          message. That is live now rather than theoretical: "who checks in" moved
                          to the end, so this bar IS the last screen. */}
                      <button
                        className="gw-btn"
                        disabled={blocked || create.isPending}
                        onClick={() => (next === step ? create.mutate() : setStep(next))}
                        style={{ margin: 0 }}
                      >
                        {next === step ? (create.isPending ? 'Opening…' : 'Open the check-in') : 'Continue'}
                      </button>
                      {blocked ? (
                        <div style={{ fontSize: 11, color: 'var(--gw-sub)', textAlign: 'center', marginTop: 5 }}>{why}</div>
                      ) : null}
                    </>
                  )
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Step 2 (1.5): Billing check */}
        {step === STAGE.plan && (
          <div>
            <h1 className="gw-ttl">Before you continue</h1>

            {billingLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '32px 0', color: 'var(--gw-sub)', fontSize: 14 }}>
                <div style={{ width: 18, height: 18, border: '2px solid var(--gw-border)', borderTopColor: 'var(--gw-navy)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                Checking your account…
              </div>
            )}

            {!billingLoading && billingChecked && billingFree && (
              <div>
                <div style={{ background: 'var(--gw-green-bg)', border: '1px solid var(--gw-green-b)', borderRadius: 10, padding: '20px 18px', marginBottom: 20 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gw-green-t)', marginBottom: 6 }}>No payment needed</div>
                  {/* One statement about what they have, not two that disagree.
                      This said "unlimited Grounds" directly above "0 of 10
                      Grounds used" - the first thing a new admin reads about
                      money, contradicting itself. A paid plan really is
                      unlimited; the free tier is not, and should say so once. */}
                  <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
                    {groundsUsed != null && !appliedAccessCode
                      ? <>Your free plan includes {freeLimit} check-ins, with unlimited sessions and reports in each. You have used <b>{groundsUsed}</b>.</>
                      : <>This one is covered. Unlimited sessions and reports.</>}
                  </div>
                </div>
                {/* The warning stays, but only when they are actually near the
                    wall. Repeating the count when they have eight left is noise. */}
                {groundsUsed != null && !appliedAccessCode && groundsUsed >= freeLimit - 2 && (
                  <div style={{ fontSize: 12.5, color: 'var(--gw-amber-t)', background: 'var(--gw-amber-bg)', border: '1px solid var(--gw-amber-b-soft)', borderRadius: 8, padding: '10px 12px', marginBottom: 16, lineHeight: 1.5 }}>
                    Only {freeLimit - groundsUsed} {freeLimit - groundsUsed === 1 ? 'check-in' : 'check-ins'} left on the free plan. After that you will need a subscription to open another.
                  </div>
                )}
                <button className="gw-btn" onClick={() => setStep(stepAfter(visibleSteps, step))} style={{ margin: '12px 0 0' }}>Continue →</button>
              </div>
            )}

            {!billingLoading && billingChecked && billingUnknown && (
              <div style={{ background: 'var(--gw-amber-bg)', border: '1px solid var(--gw-amber-b-soft)', borderRadius: 10, padding: '16px 18px', marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-amber-t)', marginBottom: 6 }}>We could not check your plan just then</div>
                <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 14 }}>
                  This is our side, not yours — nothing about your plan has changed. Try again, and if it
                  keeps failing you can carry on setting this up and create it in a moment.
                </div>
                <button
                  onClick={() => setBillingChecked(false)}
                  style={{ padding: '8px 16px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Try again
                </button>
              </div>
            )}

            {!billingLoading && billingChecked && !billingFree && !billingUnknown && (
              <div>
                <div style={{ background: 'var(--gw-card)', border: '1.5px solid var(--gw-border)', borderRadius: 10, padding: '20px 18px', marginBottom: 20 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 6 }}>Subscribe to create more</div>
                  <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 16 }}>
                    Your free plan includes {freeLimit} check-ins. Subscribe for unlimited check-ins, sessions, and reports.
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
                  <div style={{ background: 'var(--gw-bg)', border: '1px solid var(--gw-border)', borderRadius: 8, padding: 14, marginTop: 8 }}>
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
                      <div style={{ fontSize: 12, color: 'var(--gw-red-t)', marginTop: 8 }}>{codeError}</div>
                    )}
                  </div>
                )}

                {codeApplied && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ background: 'var(--gw-green-bg)', border: '1px solid var(--gw-green-b)', borderRadius: 10, padding: '16px 18px', marginBottom: 12 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-green-t)', marginBottom: 4 }}>Code applied</div>
                      <div style={{ fontSize: 12, color: 'var(--gw-sub)' }}>Your access code has been validated and will be used when the check-in is created.</div>
                    </div>
                    <button className="gw-btn" onClick={() => setStep(stepAfter(visibleSteps, step))}>Continue →</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3 (was 2): Timeframe + cadence */}
        {step === STAGE.timeline && (
          <div>
            <h1 className="gw-ttl">How long will this run?</h1>
            <div className="gw-sub-t">Set the timeframe and how often each party checks in.</div>
            <div className="gw-fld">
              <label className="gw-label" htmlFor="gw-timeframe">Recommended timeframe</label>
              {/* PRESETS AS SHORTCUTS, NOT AS THE ONLY ANSWERS.
                  This was a fixed menu of seven values, so 45 days could not be expressed anywhere -
                  and a situation whose recommendation was not on the list (the one-off read, at one
                  day) made the control show a value the product had not chosen. The number field is
                  the truth; the buttons just fill it in. */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {[
                  { d: 7, label: '1 week' }, { d: 14, label: '2 weeks' }, { d: 30, label: '30 days' },
                  { d: 60, label: '60 days' }, { d: 90, label: '90 days' }, { d: 180, label: '6 months' },
                  { d: 365, label: '12 months' },
                ].map(o => (
                  <button
                    key={o.d}
                    type="button"
                    onClick={() => setTimelineDays(o.d)}
                    aria-pressed={timelineDays === o.d}
                    style={{
                      fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
                      padding: '5px 11px', borderRadius: 100,
                      border: `1px solid ${timelineDays === o.d ? 'var(--gw-navy)' : 'var(--gw-border)'}`,
                      background: timelineDays === o.d ? 'var(--gw-blue-bg)' : 'white',
                      color: timelineDays === o.d ? 'var(--gw-navy)' : 'var(--gw-sub)',
                    }}
                  >{o.label}</button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  id="gw-timeframe"
                  className="gw-select"
                  type="number"
                  min={1}
                  max={730}
                  value={timelineDays}
                  onChange={e => {
                    // Empty or nonsense must not become NaN days on the ground.
                    const n = Math.round(Number(e.target.value))
                    if (Number.isFinite(n)) setTimelineDays(Math.min(730, Math.max(1, n)))
                  }}
                  style={{ maxWidth: 110 }}
                />
                <span style={{ fontSize: 13, color: 'var(--gw-sub)' }}>days</span>
              </div>
            </div>
            {/* WHEN IT STARTS. The most common real case is setting a check-in up before the
                person it is about arrives, and until now the clock started anyway. */}
            <div className="gw-fld">
              <label className="gw-label" htmlFor="gw-starts">When does this start?</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <input
                  id="gw-starts"
                  className="gw-input"
                  type="date"
                  value={startsOn}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={e => setStartsOn(e.target.value)}
                  style={{ maxWidth: 190 }}
                />
                {startsOn && (
                  <button
                    type="button"
                    onClick={() => setStartsOn('')}
                    style={{ fontSize: 12, color: 'var(--gw-sub)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
                  >
                    Start today instead
                  </button>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 5, lineHeight: 1.55 }}>
                Leave it empty to start today. Set a date and nothing opens, and no time is counted, until then - useful when somebody has not joined yet.
              </div>
            </div>
            <div className="gw-fld">
              <label className="gw-label" htmlFor="gw-cadence">Recommended cadence</label>
              <select id="gw-cadence" className="gw-select" value={cadence} onChange={e => setCadence(e.target.value as GroundCadence)}>
                {SELECTABLE_CADENCES.map(c => <option key={c.cadence} value={c.cadence}>{c.label}</option>)}
              </select>
            </div>
            <div className="gw-box gw-box-blue" style={{ marginBottom: 24 }}>
              {/* THE DATES, NOT JUST THE DURATION. "6 check-ins over 90 days" does not answer the
                  question a person actually has, which is when the first one happens and when this
                  is over. Both are known here and neither was shown. */}
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                {sessionTotal} {sessionTotal === 1 ? 'check-in' : 'check-ins'} over {timelineDays} {timelineDays === 1 ? 'day' : 'days'}, {runDates(startsOn, timelineDays)}
              </div>
              <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
                Both are set from the situation you picked, and you can change either one now. Every check-in produces a report for each person. Afterwards the lead can still change the timeframe or the cadence at any time.
              </div>
              <div style={{ marginTop: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, background: 'var(--gw-green-bg)', color: 'var(--gw-green-t)', borderRadius: 20, padding: '2px 8px' }}>Included in your plan</span>
              </div>
            </div>
            <button className="gw-btn" onClick={() => setStep(stepAfter(visibleSteps, step))} style={{ margin: 0 }}>Continue</button>
          </div>
        )}

        {/* Step 4 (was 3): Participants */}
        {step === STAGE.people && (
          <div>
            <h1 className="gw-ttl">Who is in this check-in?</h1>
            <div className="gw-sub-t">Add everyone who will check in. They can be from different organisations. You can add more at any time.</div>

            {/*
              * WHAT ADDING SOMEBODY ACTUALLY DOES, SAID ON THE SCREEN THAT DOES IT.
              *
              * This said nothing, and the consequence is not small. Traced through the code rather
              * than assumed: `participants.service.ts` accept() looks the address up, and if there
              * is no account it creates a User in THIS organisation with role MEMBER, verified,
              * inside the same transaction that accepts the invitation. No approval, no queue,
              * nobody asked. And a seat is any active user in the org - see common/seats.ts - so
              * that new account counts toward the plan the moment they accept.
              *
              * So somebody setting up a check-in for two people outside the company is adding two
              * members to their organisation and two people to their bill, and nothing on the way
              * through says so. Said plainly here, and only what is true: an approval step for
              * this does not exist yet, so this does not promise one.
              */}
            <div style={{ background: 'var(--gw-blue-bg)', borderLeft: '3px solid var(--gw-navy)', borderRadius: '0 8px 8px 0', padding: '10px 14px', margin: '10px 0 16px', fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
              Anyone here who does not already have a Groundwork account gets one in your organisation
              when they accept, so they can write their own account of this. Everyone with an account
              counts toward your plan.
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
              <div style={{ background: 'var(--gw-bg)', border: '1px solid var(--gw-border)', borderRadius: 8, padding: 12, marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-sub)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Paste emails</div>
                <textarea
                  rows={4}
                  value={bulkText}
                  onChange={e => setBulkText(e.target.value)}
                  placeholder={'one@example.com\ntwo@example.com\nthree@example.com'}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--gw-border)', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', color: 'var(--gw-text)', background: 'white', resize: 'vertical', boxSizing: 'border-box', marginBottom: 8 }}
                />
                <div style={{ fontSize: 11, color: 'var(--gw-sub)', marginBottom: 8 }}>Separate by line, comma, or semicolon. Roles and notes can be added after.</div>
                <button onClick={addBulk} style={{ width: '100%', padding: 9, borderRadius: 6, background: 'none', color: 'var(--gw-navy)', fontSize: 13, fontWeight: 600, border: '1.5px dashed var(--gw-blue-b)', cursor: 'pointer', fontFamily: 'inherit' }}>Add all</button>
              </div>
            ) : (
            <div style={{ background: 'var(--gw-bg)', border: '1px solid var(--gw-border)', borderRadius: 8, padding: 12, marginBottom: 14 }}>
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
              {/*
                * "WHEN DO THEY START?" USED TO BE ASKED HERE, AND IT WAS THE SECOND DATE ON THE
                * SAME FLOW.
                *
                * Step six asks when the check-in starts. This asked when the person starts, four
                * steps later, and the two read as the same question asked twice - which is exactly
                * how somebody sets one and not the other and gets a clock they did not mean.
                *
                * The field was doing real work: a future date holds the invitation, so an email
                * asking a new hire to account for their work cannot land before they have signed a
                * contract, and cannot be recalled once read. That protection is kept and the
                * question is not: a participant now inherits the check-in's own start date, which
                * for an onboarding IS their first day and has already been asked for once.
                */}
              <button onClick={addParticipant} style={{ width: '100%', padding: 9, borderRadius: 6, background: 'none', color: 'var(--gw-navy)', fontSize: 13, fontWeight: 600, border: '1.5px dashed var(--gw-blue-b)', cursor: 'pointer', fontFamily: 'inherit' }}>+ Add this person to the list</button>
            </div>
            )}

            {participants.length > 0 && (
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', background: 'var(--gw-bg)', borderRadius: 7, padding: '10px 12px', marginBottom: 14, lineHeight: 1.6 }}>
                Each person gets their own private check-in. Nobody can see what anyone else wrote until the report is activated.
              </div>
            )}

            {/* WHAT ACTUALLY LIMITS THE NUMBER, WHICH IS THE PLAN AND NOT THE CHECK-IN.
                This said "Up to 20 per ground" and there is no 20 anywhere in the product. The API is
                explicit that there is no per-check-in limit at all - "all scenarios support any number
                of participants, the initiator decides who needs to be in the ground, no hard-coded
                per-scenario cap" - and the real ceilings are the free member limit and the org's plan.
                So 20 was lower than Growth (100) and Scale (500) and higher than free (5): wrong in
                both directions at once. */}
            {participants.length > 0 && (
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 10 }}>
                {participants.length} {participants.length === 1 ? 'person' : 'people'} added.
                {' '}How many you can add depends on your plan, not on the check-in.
              </div>
            )}

            {/* Handing the ground over needs an address to hand it to. Better to
                stop here than to create a ground nobody is leading. */}
            {/*
              * "+ Add to this check-in" sat directly above "Continue" and the two read as rival
              * ways of doing the same thing - one of them adds the person in the box to a list, the
              * other leaves the step. Now the first says which person and which list, and the
              * second says how many it is continuing with, so neither can be mistaken for the
              * other.
              */}
            {/*
              * THROUGH THE ORDERING, NOT PAST IT. This said `setStep(STAGE.brief)`, which was
              * true for everybody until the brief became a step somebody can skip. A hardcoded
              * next screen is exactly what `stepsThisPersonSees` exists to stop - and here it
              * would have walked a setter onto the one screen the decision above says is not
              * theirs. When there is nothing after this step, this button is the end of the flow
              * and starts the check-in itself.
              */}
            <button
              className="gw-btn"
              disabled={participants.length === 0 || create.isPending}
              onClick={() => {
                const next = stepAfter(visibleSteps, STAGE.people)
                if (next === STAGE.people) create.mutate()
                else setStep(next)
              }}
              style={{ margin: 0 }}
            >
              {create.isPending
                ? 'Opening…'
                : stepAfter(visibleSteps, STAGE.people) === STAGE.people
                  ? 'Start check-in →'
                  : participants.length === 0
                    ? 'Continue'
                    : `Continue with ${participants.length} ${participants.length === 1 ? 'person' : 'people'}`}
            </button>
            {/*
              THE OTHER HALF OF THE SAME REFUSAL, WHICH SAID NOTHING. W-UX-7.
              
              Two conditions disable this button and only one of them explained itself. Somebody who
              had added nobody yet - the ordinary first state of this step - got a dead Continue and
              no sentence anywhere on the screen. The lead-email case, added later, was written
              properly and made the gap look like it did not exist.
            */}
            {participants.length === 0 ? (
              <div style={{ fontSize: 11.5, color: 'var(--gw-sub)', textAlign: 'center', marginTop: 5 }}>
                Add at least one person to continue. A check-in needs somebody to check in.
              </div>
            ) : null}
            {/*
              * THIS SKIPPED TO THE NEXT STEP, AND FOR A SETTER THERE IS NO NEXT STEP.
              *
              * `setStep(stepAfter(...))` returns the SAME step when there is nothing after it - the
              * documented contract of stepAfter - so once the brief was skipped for somebody
              * setting a check-in up for a lead, this control did nothing at all. Pressing it left
              * you exactly where you were, with no message. My own doing, from removing that step.
              *
              * It starts the check-in in that case, which is what "skip" means on the last screen.
              */}
            <div style={{ fontSize: 12, color: 'var(--gw-sub)', textAlign: 'center', marginTop: 10, cursor: create.isPending ? 'not-allowed' : 'pointer', opacity: create.isPending ? 0.45 : 1 }}
              onClick={() => {
                if (create.isPending) return
                const next = stepAfter(visibleSteps, step)
                if (next === step) create.mutate()
                else setStep(next)
              }}>
              {stepAfter(visibleSteps, step) === step ? 'Skip - start it and add people after' : 'Skip - add participants after'}
            </div>
            {/* WHERE, because "after" on its own is not an instruction. Reported as: if you skip at
                the start, how do you add them later? */}
            <div style={{ fontSize: 11, color: 'var(--gw-muted)', textAlign: 'center', marginTop: 4, lineHeight: 1.5 }}>
              You add people on the check-in's own page afterwards, under Add someone. The shared
              report cannot be built until at least one other person has checked in.
            </div>
          </div>
        )}

        {/*
          * STEP 5, THE END STATE, IS GONE FROM CREATION. Her call, and the right one.
          *
          * It asked, before a single session had happened, "What does a successful outcome look
          * like?" - and on a NEW HIRE ground the options were Keep the hire / Restructure the role /
          * Let them go / Extend evaluation period. Its own copy said "Everyone sees it before the
          * first session", so a person starting on Monday could see that their manager had already
          * picked from a menu that included letting them go. That turns a welcome into a file.
          *
          * Three further reasons it should never have been here:
          *  - it was collected, echoed back in the summary as "Resolution: X", and then never stored.
          *    Fourteen grounds, `end_state` empty on every one.
          *  - the NEW_PROJECT and DRIFT lists contain an option literally called "Continue", beside a
          *    Continue button, so one word meant two things on one screen.
          *  - a decision about how something ends is not knowable at the moment it begins. Asking for
          *    it up front invites a guess and then dignifies the guess as an agreement.
          *
          * The end state now belongs to CLOSING a ground, where the record can actually inform it,
          * and is visible only to the lead and org admins. Step numbering is unchanged so the rest of
          * the wizard keeps working; this step simply no longer renders.
        */}

        {/* Step 6 (was 5): Opening brief + ground name */}
        {step === STAGE.brief && (
          <div>
            <h1 className="gw-ttl">What is this about?</h1>
            <div className="gw-sub-t">Your version of the brief. Each person writes their own in their first session. The report shows where accounts agree and where they differ.</div>

            <div style={{ position: 'relative', marginBottom: 6 }}>
              <textarea
                rows={6}
                value={brief}
                /* Capped where the server caps it, so a long brief is stopped as it is typed rather
                   than refused after somebody has written it. */
                maxLength={BRIEF_CHARS_MAX}
                onChange={e => setBrief(e.target.value)}
                placeholder="What is this about? What needs to be true at the end?"
                style={{ width: '100%', padding: '12px 14px', border: '1px solid var(--gw-border)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', color: 'var(--gw-text)', background: 'white', resize: 'vertical', lineHeight: 1.65, boxSizing: 'border-box' }}
              />
              {/* The count, and what it is counting towards - a bare number tells you nothing about
                  whether you have enough. */}
              <div style={{ position: 'absolute', bottom: 8, right: 10, fontSize: 11, color: 'var(--gw-sub)' }}>
                {briefWords} {briefWords === 1 ? 'word' : 'words'}
                {briefTooShortToInvite
                  ? ` · ${BRIEF_WORDS_TO_INVITE - briefWords} more to invite anyone`
                  : briefShort
                    ? ` · ${BRIEF_WORDS_WORTH_READING} is where these start to work`
                    : ''}
              </div>
            </div>

            {briefTooShortToInvite ? (
              <div style={{ fontSize: 12, color: 'var(--gw-amber-t)', background: 'var(--gw-amber-bg)', border: '1px solid var(--gw-amber-b)', borderRadius: 7, padding: '10px 12px', marginBottom: 12, lineHeight: 1.6 }}>
                A little more before you can invite anyone: {BRIEF_WORDS_TO_INVITE} words is the floor and you have {briefWords}. With nobody else checked in yet and nothing else on Context, the brief is the only thing telling {participants.length === 1 ? 'them' : 'people'} what this is about.
              </div>
            ) : briefShort && (
              <div style={{ fontSize: 12, color: 'var(--gw-amber-t)', background: 'var(--gw-amber-bg)', border: '1px solid var(--gw-amber-b)', borderRadius: 7, padding: '10px 12px', marginBottom: 12, lineHeight: 1.6 }}>
                A brief this short will produce weaker first sessions - around {BRIEF_WORDS_WORTH_READING} words is where these start to work, and you have {briefWords}. The questions each person is asked are shaped by what you write here. You can write up to {BRIEF_CHARS_MAX.toLocaleString()} characters.
              </div>
            )}


            {/*
              * WHERE YOU ARE IN THE SITUATION, ASKED WHERE YOU SAY WHAT IT IS ABOUT.
              *
              * It used to sit at the bottom of the situation step, under twenty-one cards and a
              * fixed action bar - "hard to see", and reported as such. Her call: put it on the
              * page where you describe what this is about, which is also where it belongs by
              * meaning. Both questions here are about the same thing: what is going on, and how
              * far through it you are.
              *
              * Picking a card already sets a recommended moment (see pick() in renderSituation),
              * so nobody can arrive at the end without one and this is a change-it control rather
              * than a required question. That is also why skipping this whole step for somebody who
              * is only setting a check-in up for a lead loses nothing.
              */}
            {scenario && (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Where are you in this situation?</div>
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 6 }}>Are you just starting, mid-way through, or wrapping up? This shapes the questions each person answers.</div>
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
            <div className="gw-fld" style={{ marginTop: 16 }}>
              <label className="gw-label" htmlFor="gw-ground-name">Name <span style={{ fontWeight: 400, color: 'var(--gw-muted)' }}>(optional)</span></label>
              <input
                id="gw-ground-name"
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
                {/*
                  * ITEM 3: THE ROUTING DECISION, SHOWN WHERE IT IS CHEAPEST TO CATCH.
                  *
                  * On the free-text path a model picked the shape, and the shape decides the board,
                  * the questions and the endings. Until now that choice was made two steps earlier and
                  * never repeated, so the last screen before creating showed no sign that anything had
                  * been guessed. If the guess is wrong this is the moment to notice - after this, the
                  * questions people get asked are already decided.
                */}
                {selectedCard === 'DESCRIBE_OWN' && (
                  routedTo ? (
                    <div style={{ color: 'var(--gw-sub)' }}>
                      Read from your description as <b>{SCENARIOS.find(c => c.scenario === routedTo)?.label}</b>.
                      Go back if that is not it.
                    </div>
                  ) : (
                    <div style={{ color: 'var(--gw-sub)' }}>
                      Opening as an <b>open read</b>, because your description did not match a named situation.
                    </div>
                  )
                )}
                {participants.length > 0 && <div>{participants.length} participant{participants.length !== 1 ? 's' : ''} invited</div>}
                {appliedAccessCode && <div style={{ color: 'var(--gw-green-t)', fontWeight: 600 }}>Access code applied</div>}
              </div>
            </div>

            {/* THROUGH THE ORDERING, NOT PAST IT. This called `create.mutate()` because the brief
                was the last screen. It is not any more - "who checks in against this" comes after
                it - and a hardcoded ending is exactly what `stepsThisPersonSees` exists to stop. */}
            <button className="gw-btn" onClick={() => { const n = stepAfter(visibleSteps, STAGE.brief); if (n === STAGE.brief) create.mutate(); else setStep(n) }} disabled={create.isPending || !brief.trim() || briefTooShortToInvite} style={{ margin: 0 }}>
              {/* "Talk it through" described the conversation and not the button. It opens the
                  check-in, so it says so. */}
              {create.isPending ? 'Opening…' : stepAfter(visibleSteps, STAGE.brief) === STAGE.brief ? 'Start check-in →' : 'Continue →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
