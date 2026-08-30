import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { groundsApi, type GroundScenario, type GroundMoment, type GroundCadence } from '@/api/grounds'
import { SELECTABLE_CADENCES, sessionsFor } from '@/lib/cadence'
import { billingApi, FALLBACK_FREE_LIMITS } from '@/api/billing'
import { entryApi } from '@/api/entry'
import { SCENARIO_LABELS, SCENARIO_GROUPS, SCENARIO_FACTS, CADENCE_VALUE, RECOMMENDED_MOMENT, COACH_CARD, ASKS_WHEN_THEY_START, recommendedSessions, type ScenarioGroupKey } from '@/lib/scenario-catalog'
import { coachApi, MIN_INTENTION_LENGTH, COACHING_PRICE } from '@/api/coach'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth'

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
    desc: "Each person gives their own read of the situation before the group talks, rather than the loudest version becoming the account. That first round sets out what you do and do not agree on, and the check-ins after it test whether the gap closed or only went quiet.",
    moment: 'You and your ops lead have stopped agreeing on what matters.',
    agreed: 'Each person gives their own read of the situation before the group talks, and that first round sets out what you do and do not agree on.',
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
  { cardKey: 'DESCRIBE_OWN', scenario: 'OPEN_READ', label: SCENARIO_LABELS.OPEN_READ, tag: 'Anything else', tagBg: 'var(--gw-paper-2)', tagColor: 'var(--gw-sub)',
    desc: "None of these quite fit? Describe it in your own words. Each person gives their own read first, privately, and the check-ins that follow test whether that picture holds up. If it turns out to be one of the situations above, pick that instead: it sets the objective and shapes the questions people are asked.",
    moment: 'Something is off and you cannot name it yet.',
    agreed: 'Nothing fixed: each person gives their own read first, privately, because the situation is not named yet.',
    tests: 'The check-ins that follow test whether that picture holds up. If it turns out to be one of the situations above, pick that instead: it sets the objective and shapes the questions people are asked.', },
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

export function cardsInGroup(group: ScenarioGroupKey): ScenarioCard[] {
  return SCENARIOS.filter(c => (CARD_GROUP[c.cardKey] ?? SCENARIO_FACTS[c.scenario].group) === group)
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

// Step numbering: 1=scenario, 1.5=billing (stored as step=2 internally), 2=timeframe (step=3), 3=participants (step=4), 4=resolution (step=5), 5=brief (step=6)
// We use integer steps internally: 1,2,3,4,5,6
const TOTAL_STEPS = 8

/**
 * What each step is asking, in the words already on that step's own heading.
 *
 * Taken from the headings rather than invented, so the header and the page cannot say two
 * different things about the same screen. Step 5 is the one that no longer renders - see the note
 * on the end-state step - and is skipped rather than renumbered, because renumbering would break
 * every link and saved position that already exists.
 */
const STEP_NAMES: Record<number, string> = {
  1: 'Who it is for',
  2: 'The situation',
  3: 'A coach',
  4: 'Describe it',
  5: 'Your plan',
  6: 'How long it runs',
  7: 'Who is in it',
  8: 'The brief',
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
  const [pStartsAt, setPStartsAt] = useState('')
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
          label: groundName.trim() || groundNameFallback(SCENARIOS.find(c => c.cardKey === selectedCard)?.label, scenario),
          scenario: scenario!,
          moment: moment!,
          timelineDays,
          cadence,
          ...(startsOn ? { startsAt: new Date(`${startsOn}T09:00:00`).toISOString() } : {}),
          brief: (brief.trim() || ownDescription.trim()) || undefined,
        /**
         * Sent at CREATE now, not only afterwards. The follow-up confirmLead call below still runs
         * for the flows where it applies, but it throws "already been confirmed" on a ground an
         * admin created for themselves - into a silent catch - so this choice was being dropped
         * every time. The server applies it at creation and skips the creator's own check-in.
         */
        ...(alsoAParty !== null ? { managingOnly: !alsoAParty } : {}),
          participants: participants.length
            ? participants.map((p) => ({ email: p.email, roleAsDescribed: p.role || undefined }))
            : undefined,
        })
        return { ground, failedInvites: 0 }
      }
      const ground = await groundsApi.create({
        label: groundName.trim() || groundNameFallback(SCENARIOS.find(c => c.cardKey === selectedCard)?.label, scenario),
        scenario: scenario!,
        moment: moment!,
        timelineDays,
        cadence,
        ...(startsOn ? { startsAt: new Date(`${startsOn}T09:00:00`).toISOString() } : {}),
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
        groundsApi.addParticipant(ground.id, { email: p.email, roleAsDescribed: p.role || undefined, note: p.note || undefined, startsAt: p.startsAt })
      ))
      const failed = results.filter(r => r.status === 'rejected').length
      return { ground, failedInvites: failed }
    },
    onSuccess: ({ ground, failedInvites }) => {
      toast.success('Check-in opened')
      if (failedInvites > 0) toast.warning(`${failedInvites} invite${failedInvites > 1 ? 's' : ''} could not be sent. You can retry from the check-in page.`)
      navigate(`/grounds/${ground.id}`)
    },
    onError: () => toast.error('Could not open it. Try again.'),
  })

  function addParticipant() {
    const email = pEmail.trim()
    if (!email || !email.includes('@')) return
    if (participants.find(p => p.email === email)) return
    setParticipants(v => [...v, { email, role: pRole.trim(), note: pNote.trim(), startsAt: pStartsAt || undefined }])
    setPEmail(''); setPRole(''); setPNote(''); setPStartsAt('')
  }

  function addBulk() {
    const emails = bulkText.split(/[\n,;]+/).map(e => e.trim()).filter(e => e.includes('@'))
    const fresh = emails.filter(e => !participants.find(p => p.email === e))
    setParticipants(v => [...v, ...fresh.map(e => ({ email: e, role: '', note: '', startsAt: undefined as string | undefined }))])
    setBulkText('')
    setBulkMode(false)
  }

  function back() {
    /* Step 4 only exists on the free-text path, so going back from 5 has to skip it there too -
       otherwise Back lands on a screen the person was never shown on the way in. */
    if (step === 5 && selectedCard !== 'DESCRIBE_OWN') { setStep(3); return }
    if (step > 1) setStep(s => s - 1)
    else navigate('/grounds')
  }

  // Display dot index: step 1 → dot 1, step 2 (billing) → dot 2, steps 3-6 → dots 3-6
  // We show TOTAL_STEPS dots (6), mapping internal step directly
  const displayStep = step

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
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
              <span className="gw-logo">Set up a check-in</span>
              <span style={{ fontSize: 13, color: 'var(--gw-sub)', marginLeft: 10 }}>
                Step {displayStep} of {TOTAL_STEPS} · {STEP_NAMES[displayStep] ?? ''}
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
        * Only step one. The other five are a form - a timeline, a list of people, a brief - and a
        * form read across 1160px is worse, not better: the eye has to travel the width of the
        * screen between a label and its field. 1160 is four 275px cards and their gaps.
        */}
      <div className="gw-bd" style={{ maxWidth: step === 1 ? 1160 : 540, margin: '0 auto', width: '100%' }}>
        {/* Step dots */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(n => (
            <div key={n} className={`cg-step-dot${displayStep === n ? ' active' : displayStep > n ? ' done' : ''}`} />
          ))}
        </div>

        {/* Step 1: Scenario + Moment */}
        {step >= 1 && step <= 4 && (
          <div>
            {/* ---- STEP 1: who this check-in is for ---- */}
            {step === 1 && (<>
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
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>Who is this check-in for?</div>
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 9, lineHeight: 1.5 }}>
                This decides who writes the objective and who is asked to check in against it. Everything after it is asking you for one or the other. You can change it later.
              </div>
              {[
                { v: true, label: 'I set the context and objective, and I check in too', sub: 'You write what this is about and what good looks like. You check in against it alongside everyone else.', other: false },
                { v: false, label: 'I set the context and objective, others check in', sub: 'You write what this is about and what good looks like. They check in against it. Nothing asks you to check in, and nothing measures you.', other: false },
                { v: false, label: 'Someone else sets the context', sub: 'You are setting the check-in up and inviting them. They write what it is about, check in themselves, and see the results.', other: true },
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
                    They get an invitation to lead this check-in. Until they accept it, nobody is asked to check in.
                  </div>
                </div>
              )}
            </div>

            </>)}

            {/* ---- STEP 2: which situation ---- */}
            {step === 2 && (<>
            <div className="gw-sub-t" style={{ marginBottom: 2 }}>
              Twenty situations, grouped by the question you are actually asking. Every one of them is an
              objective agreed at the start, then a run of check-ins testing the work against it. Pick the
              closest fit: it sets the questions people are asked and how often.
            </div>

            {/* Jump bar. The concrete failure this fixes: the recurring read sat at position
                eleven of twenty in one unbroken list, and the person who built the product
                could not find it. Nothing was wrong with the card. */}
            <nav className="cg-jump" aria-label="Jump to a group of situations">
              {SCENARIO_GROUPS.map(g => (
                <a key={g.key} href={`#cg-${g.key}`}>{g.heading} <b>{cardsInGroup(g.key).length}</b></a>
              ))}
            </nav>

            {/* Real radios in ONE radiogroup spanning every group, not one per section:
                a person arrowing through this is choosing among twenty situations, not
                among six lists. The headings are structure, not separate controls. */}
            <div role="radiogroup" aria-label="What is this for?" style={{ marginBottom: 24 }}>
              {SCENARIO_GROUPS.map(g => {
                const cards = cardsInGroup(g.key)
                if (cards.length === 0) return null
                return (
                  <section key={g.key} id={`cg-${g.key}`} className="cg-group">
                    <div className="cg-group-head">
                      <h3>{g.heading}</h3>
                      <span>{cards.length} {cards.length === 1 ? 'situation' : 'situations'}</span>
                    </div>
                    <p className="cg-group-q">{g.question}</p>
                    <div className={`cg-group-grid${cards.length === 1 ? ' one' : ''}`}>
                      {cards.map(s => {
                        const facts = SCENARIO_FACTS[s.scenario]
                        const sessions = recommendedSessions(s.scenario)
                        const isSel = selectedCard === s.cardKey
                        const open = openArc === s.cardKey
                        const pick = () => {
                          setScenario(s.scenario)
                          setSelectedCard(s.cardKey)
                          sessionStorage.setItem('gw-new-ground-card', s.cardKey)
                          /* Seeding, not setting. Both were hardcoded here - 90 days and
                             fortnightly for every situation - so the engine's per-scenario
                             timeline was never reached on the path people use. The lead still
                             changes either one at step 3. */
                          setTimelineDays(facts.timelineDays)
                          setCadence(CADENCE_VALUE[facts.cadence] as GroundCadence)
                          /* And where in the arc. Step one required this second choice and disabled
                             Continue until it was answered, without saying which choice was missing -
                             while the card just clicked already answered it. Still changeable below. */
                          setMoment(RECOMMENDED_MOMENT[s.scenario] as GroundMoment)
                        }
                        return (
                          <div
                            key={s.cardKey}
                            role="radio"
                            tabIndex={isSel || (!selectedCard && s.cardKey === SCENARIOS[0].cardKey) ? 0 : -1}
                            aria-checked={isSel}
                            aria-label={`${s.label}. ${s.moment} ${s.desc}`}
                            onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); pick() } }}
                            className={`cg-sit-card${isSel ? ' selected' : ''}`}
                            onClick={pick}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 5, background: s.tagBg, color: s.tagColor }}>{s.tag}</span>
                              <div className="cg-sit-check" />
                            </div>
                            <div style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.3 }}>{s.label}</div>
                            <p className="cg-moment">{s.moment}</p>

                            <button
                              type="button"
                              className="cg-more"
                              aria-expanded={open}
                              onClick={(e) => { e.stopPropagation(); setOpenArc(open ? null : s.cardKey) }}
                            >
                              {open ? 'How it runs \u2039' : 'How it runs \u203A'}
                            </button>
                            {open && (
                              <dl className="cg-arc">
                                <div>
                                  <dt>Agreed at the start</dt>
                                  <dd>{s.agreed}</dd>
                                </div>
                                <div>
                                  <dt>What the check-ins test</dt>
                                  <dd>{s.tests}</dd>
                                </div>
                                {facts.notThisOneIf && (
                                  <div className="warn">
                                    <dt>Not this one if</dt>
                                    <dd>{facts.notThisOneIf}</dd>
                                  </div>
                                )}
                                {s.examples && s.examples.length > 0 && (
                                  <div>
                                    <dt>Also this</dt>
                                    <dd>{s.examples.map((ex, i) => <div key={i}>{ex}</div>)}</dd>
                                  </div>
                                )}
                              </dl>
                            )}

                            <dl className="cg-meta">
                              <div><dt>Recommended cadence</dt><dd>{facts.cadence}</dd></div>
                              <div><dt>Runs for</dt><dd>{facts.timelineDays === 1 ? 'Once' : `${facts.timelineDays} days`}</dd></div>
                              <div><dt>Check-ins</dt><dd>{sessions}</dd></div>
                            </dl>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                )
              })}
            </div>

            </>)}

            {/* ---- STEP 3: a coach, before you decide ---- */}
            {step === 3 && (<>
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
                    onClick={() => setStep(selectedCard === 'DESCRIBE_OWN' ? 4 : 5)}
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
                          className="gw-in"
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
                      <p style={{ fontSize: 11.5, color: 'var(--gw-muted)', margin: 0, lineHeight: 1.5 }}>{COACHING_PRICE.note}</p>
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

            {/* ---- STEP 4: describe it in your own words ---- */}
            {step === 4 && (<>
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

            {/* The moment belongs with the situation, so it is bound to step 2 rather than to
                wherever it happens to sit in the file. */}
            {step === 2 && scenario && (
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
                  const describing = selectedCard === 'DESCRIBE_OWN'

                  const blocked =
                    step === 1 ? alsoAParty === null
                    : step === 2 ? (!scenario || !moment)
                    : step === 4 ? needsRouting
                    : false

                  const why =
                    step === 1 ? 'Choose one to continue'
                    : step === 2 ? (!scenario ? 'Pick a situation to continue' : 'Pick where you are in it to continue')
                    : step === 4 ? 'Describe the situation above, then let us find the closest match'
                    : ''

                  /* Step 4 only exists for the free-text path; a card already says what this is. */
                  const next = step === 3 ? (describing ? 4 : 5) : step + 1

                  return (
                    <>
                      <button className="gw-btn" disabled={blocked} onClick={() => setStep(next)} style={{ margin: 0 }}>Continue</button>
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
        {step === 5 && (
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
                <button className="gw-btn" onClick={() => setStep(6)} style={{ margin: '12px 0 0' }}>Continue →</button>
              </div>
            )}

            {!billingLoading && billingChecked && !billingFree && (
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
                    <button className="gw-btn" onClick={() => setStep(6)}>Continue →</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3 (was 2): Timeframe + cadence */}
        {step === 6 && (
          <div>
            <div className="gw-ttl">How long will this run?</div>
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
                  className="gw-in"
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
                Both are set from the situation you picked, and you can change either one now. Every check-in produces a report for each person. Afterwards the person leading this check-in can still change the timeframe or the cadence at any time.
              </div>
              <div style={{ marginTop: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, background: 'var(--gw-green-bg)', color: 'var(--gw-green-t)', borderRadius: 20, padding: '2px 8px' }}>Included in your plan</span>
              </div>
            </div>
            <button className="gw-btn" onClick={() => setStep(7)} style={{ margin: 0 }}>Continue</button>
          </div>
        )}

        {/* Step 4 (was 3): Participants */}
        {step === 7 && (
          <div>
            <div className="gw-ttl">Who is in this check-in?</div>
            <div className="gw-sub-t">Add everyone who will check in. They can be from different organisations. You can add more at any time.</div>


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
              {/* WHEN THEY START, only where "they have not started" is a normal answer.
                  A future date holds their invitation until the day: an email asking somebody to
                  account for their work can otherwise arrive before they have signed a contract, and
                  cannot be recalled once it has been read. */}
              {scenario && ASKS_WHEN_THEY_START.includes(scenario as never) && (
              <div className="gw-fld">
                <label className="gw-label" htmlFor="gw-starts">When do they start? (optional)</label>
                <input
                  id="gw-starts"
                  className="gw-input"
                  type="date"
                  value={pStartsAt}
                  onChange={e => setPStartsAt(e.target.value)}
                />
                <div style={{ fontSize: 11.5, color: 'var(--gw-sub)', marginTop: 4, lineHeight: 1.5 }}>
                  {pStartsAt && new Date(pStartsAt).getTime() > Date.now()
                    ? 'They will not be invited until then, and nothing before that date is counted as theirs.'
                    : 'Leave this blank if they have already started.'}
                </div>
              </div>
              )}
              <button onClick={addParticipant} style={{ width: '100%', padding: 9, borderRadius: 6, background: 'none', color: 'var(--gw-navy)', fontSize: 13, fontWeight: 600, border: '1.5px dashed var(--gw-blue-b)', cursor: 'pointer', fontFamily: 'inherit' }}>+ Add to this check-in</button>
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
            <button className="gw-btn" disabled={participants.length === 0 || (runByOther && !leadEmail.includes('@'))} onClick={() => setStep(8)} style={{ margin: 0 }}>Continue</button>
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
            ) : runByOther && !leadEmail.includes('@') ? (
              <div style={{ fontSize: 11.5, color: 'var(--gw-sub)', textAlign: 'center', marginTop: 5 }}>
                Add the email address of the person who will lead this check-in.
              </div>
            ) : null}
            <div style={{ fontSize: 12, color: 'var(--gw-sub)', textAlign: 'center', marginTop: 10, cursor: (runByOther && !leadEmail.includes('@')) ? 'not-allowed' : 'pointer', opacity: (runByOther && !leadEmail.includes('@')) ? 0.45 : 1 }}
              onClick={() => { if (!(runByOther && !leadEmail.includes('@'))) setStep(8) }}>
              Skip - add participants after
            </div>
            <div style={{ fontSize: 11, color: 'var(--gw-muted)', textAlign: 'center', marginTop: 4, lineHeight: 1.5 }}>
              The shared report cannot generate until at least one other person has checked in.
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
        {step === 8 && (
          <div>
            <div className="gw-ttl">What is this about?</div>
            <div className="gw-sub-t">Your version of the brief. Each person writes their own in their first session. The report shows where accounts agree and where they differ.</div>

            <div style={{ position: 'relative', marginBottom: 6 }}>
              <textarea
                rows={6}
                value={brief}
                onChange={e => setBrief(e.target.value)}
                placeholder="What is this about? What needs to be true at the end?"
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

            <button className="gw-btn" onClick={() => create.mutate()} disabled={create.isPending || !brief.trim()} style={{ margin: 0 }}>
              {create.isPending ? 'Opening…' : 'Talk it through →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
