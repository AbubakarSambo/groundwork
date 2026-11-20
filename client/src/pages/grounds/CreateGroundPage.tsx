import { useState, useEffect } from 'react'
import { keep, whatWasKept, forget, howLongAgo } from '@/lib/what-you-typed-survives-a-reload'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { type GroundScenario, type GroundMoment } from '@/api/grounds'
import { SituationCard } from '@/components/gw/SituationCard'
import { OR_PICK_ONE_THAT_FITS } from '@/lib/one-way-to-say-what-a-situation-does'
import { billingApi, FALLBACK_FREE_LIMITS } from '@/api/billing'
import { entryApi } from '@/api/entry'
import { SCENARIO_LABELS, GROUPS_YOU_PICK_FROM, SCENARIO_FACTS, RECOMMENDED_MOMENT, COACH_CARD, type ScenarioGroupKey } from '@/lib/scenario-catalog'
import { coachApi, MIN_INTENTION_LENGTH, COACHING_PRICE } from '@/api/coach'
import { useAuthStore } from '@/stores/auth'
import { planLimitNotice } from '@/lib/the-plan-limit-notice-fits-the-reader'
import { STAGE, stepsThisPersonSees, stepAfter, stepBefore } from './the-steps-this-person-sees'
import { theWordsForPickingASituation } from './whose-situation-is-it'
import { looksLikeAnAddress } from '@/components/gw/an-address-that-can-receive-mail'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import {
  Page, PageTitle, Button, Callout, Note, Panel, Section, Stack, FieldLabel, TextField, TextArea, Select, Tag,
} from '@/components/gw/ui'

export interface ScenarioCard {
  // Unique per CARD, not per scenario: two cards can map to the same scenario
  // key (the realignment card and the describe-your-own card both use
  // REALIGN_TEAM's pack), so selection tracks the card, while what is SENT to
  // the API is always the untouched scenario enum key.
  cardKey: string
  scenario: GroundScenario
  label: string
  desc: string
  /*
   * NO TAG HERE. It was three fields per card and a third vocabulary beside the group headings and
   * the labels, and it had drifted from both - a monthly read on a running agreement wore
   * "Planning" while living in the reads. Deriving it from the group fixed the drift and left the
   * real problem: a chip repeating the heading above it, on every card under that heading.
   */
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
  { cardKey: 'NEW_HIRE', scenario: 'NEW_HIRE', label: SCENARIO_LABELS.NEW_HIRE,
    desc: "Agree what the job is, and what doing it well looks like in the first 90 days. Make sure they have seen it. Each check-in compares what they are doing with that. A mismatch shows up in week two, not at a review.",
    moment: 'Help a new team member settle in, understand their role, and surface what they need.',
    agreed: 'Agree what the job is, and what doing it well looks like in the first 90 days. Make sure they have seen it.',
    tests: 'Each check-in compares what they are doing with that. A mismatch shows up in week two, not at a review.',
    examples: [
      'You hired a sales lead. They start Monday.',
      'Someone starts Monday and you want to be sure you both mean the same thing by "doing well."',
      'You just hired a senior person and need what they own pinned down before day one.',
      'A new joiner and their manager each writing what success looks like in the first 90 days.',
    ] },
  { cardKey: 'ROLE_HANDOVER', scenario: 'ROLE_HANDOVER', label: SCENARIO_LABELS.ROLE_HANDOVER,
    desc: "Both sides write down what is outstanding, what is fragile, and which relationships come with the role rather than the person. Each check-in asks what has really transferred. The gaps get named while the person who can close them is still here.",
    moment: 'Help someone take over a role without losing important context or work.',
    agreed: 'Both sides write down what is outstanding, what is fragile, and which relationships come with the role rather than the person.',
    tests: 'Each check-in asks what has really transferred. The gaps get named while the person who can close them is still here.',
    examples: [
      'Someone is leaving a role in a month and their replacement starts next week.',
      'Someone is leaving in four weeks and their replacement has already started.',
      'A role is moving between two people and nobody has written down what the first one was carrying.',
      'You want the incoming person to say what they would be guessing about, before they stop noticing.',
    ] },
  { cardKey: 'CONTRACT_REVIEW', scenario: 'CONTRACT_REVIEW', label: SCENARIO_LABELS.CONTRACT_REVIEW,
    desc: "Before you sign, each side writes down its own expectations: what the numbers are actually of, who does what, and what happens if. The check-ins put the two versions side by side. A difference turns up while changing it is still free.",
    moment: 'Make sure the people involved understand and are comfortable with an agreement.',
    agreed: 'Each side writes down, on its own, what it expects to give and to get, and what the numbers are actually of.',
    tests: 'The check-ins put the two versions side by side. "Twenty per cent of gross" and "twenty per cent of net" turn up now, not in a year.',
    examples: [
      'You are two weeks from signing and both sides think it is clear.',
      'A revenue share where both sides are sure what the percentage applies to, and have never said it out loud.',
      'A licence where one side assumes a client list is fixed and the other assumes it grows.',
      'A partnership you are about to sign with somebody you would rather not fall out with.',
    ] },
  { cardKey: 'IMPLEMENTATION_TRACKING', scenario: 'IMPLEMENTATION_TRACKING', label: SCENARIO_LABELS.IMPLEMENTATION_TRACKING,
    desc: "A quiet monthly read on an agreement that is running. Each check-in compares what is happening with what was agreed. Most months it should say the numbers reconcile and nothing needs anybody, which is the point. When something does not add up, it stays on the record until somebody explains it.",
    moment: 'Understand how an agreement is working in practice.',
    agreed: 'What each side reports, where the figures come from, and what falls due when.',
    tests: 'Each month asks what changed. Anything unexplained carries forward, and a clear period is called clear.',
    examples: [
      'The contract has been running for eight months and neither side has looked at it since.',
      'A revenue share where the reported figure and the filed figure have never been put side by side.',
      'An arrangement that has quietly drifted from what was signed, and both sides half know it.',
      'A relationship that is fine, where you would like to be able to prove it was fine.',
    ] },
  { cardKey: 'NEW_PROJECT', scenario: 'NEW_PROJECT', label: SCENARIO_LABELS.NEW_PROJECT,
    desc: "Agree scope, who owns what, and what \"done\" means before anyone starts. The check-ins compare the work with that. Scope that quietly changed, or a task nobody owns, turns up while you can still act.",
    moment: 'Get everyone clear on the work, their role, and what needs to happen.',
    agreed: 'Agree the scope, who owns what, and what done means, before anyone starts.',
    tests: 'The check-ins compare the work with that. Scope that quietly changed, or a task nobody owns, turns up while you can still act.',
    examples: [
      'You are kicking off a six-month build with four people on it.',
      'Kicking off a build and you want scope and "done" agreed before anyone writes code.',
      'A cross-team project where each team quietly assumes a different owner.',
      'Starting work with a client and you want both sides\' version of the goal on record.',
    ] },
  { cardKey: 'NEW_ADVISOR', scenario: 'NEW_ADVISOR', label: SCENARIO_LABELS.NEW_ADVISOR,
    desc: "Agree up front what the advisor will actually contribute, and on what terms. Each check-in across the year tests the work against that, so \"available\" cannot quietly replace contributing.",
    moment: 'Build a shared understanding of the role, expectations, and contribution.',
    agreed: 'Agree up front what the advisor will actually contribute, and on what terms.',
    tests: 'Each check-in across the year asks what they did. Being available cannot quietly replace contributing.',
    examples: [
      'An advisor is joining for 1% and you want their year set out before they start.',
      'Bringing on an advisor for equity and you want it clear what they will actually do for it.',
      'A new board member joining, each side writing what they expect from the relationship.',
    ] },
  { cardKey: 'NEW_COFOUNDER', scenario: 'NEW_COFOUNDER', label: SCENARIO_LABELS.NEW_COFOUNDER,
    desc: "Each of you writes down what you expect to build, own and contribute, before the assumptions harden. The check-ins over the next 90 days ask what each of you actually did. If who carries what starts to drift, you find out while it is still a conversation.",
    moment: 'Build a shared understanding of a new co-founder or partner relationship.',
    agreed: 'Each of you writes down what you expect to build, own and contribute, before the assumptions harden.',
    tests: 'The check-ins over the next 90 days ask what each of you actually did. If who carries what starts to drift, you find out while it is still a conversation.',
    examples: [
      'You and your co-founder are splitting equity next week.',
      'You and a co-founder splitting equity and roles and want the assumptions said out loud first.',
      'A new equal partner joining the founding team.',
    ] },
  { cardKey: 'NEW_MANAGER', scenario: 'NEW_MANAGER', label: SCENARIO_LABELS.NEW_MANAGER,
    desc: "Agree what they own, who they report to, and what doing well looks like in the first 90 days. Each check-in compares what they are doing with what you handed over. A gap in scope shows up in week three, not month three.",
    moment: 'Help a new manager understand the team and how the work is going.',
    agreed: 'Agree what they own, who they report to, and what doing well looks like in the first 90 days.',
    tests: 'Each check-in compares what they are doing with what you handed over. A gap in scope shows up in week three, not month three.',
    examples: [
      'A new manager is taking over a team of eight, mid-project.',
      'An interim leader stepping into an existing team for six months.',
      'A new manager taking over mid-project and you want scope and authority clear.',
    ] },
  { cardKey: 'CONTRACT_RENEWAL', scenario: 'CONTRACT_RENEWAL', label: SCENARIO_LABELS.CONTRACT_RENEWAL,
    desc: "Both sides write down what the term was meant to deliver. The check-ins through the renewal window compare that with the real work. You negotiate the next term from a record, not from impressions.",
    moment: 'Understand how a working relationship is going before deciding what happens next.',
    agreed: 'Both sides write down what the term was meant to deliver.',
    tests: 'The check-ins through the renewal window compare that with the real work. You negotiate the next term from a record, not from impressions.',
    examples: [
      'An agency contract ends in six weeks and you are not sure what you got.',
      'A contractor\'s term is ending and you are deciding whether to renew.',
      'An agency engagement up for renewal and you want an honest read of what got delivered.',
    ] },
  { cardKey: 'RECOGNITION', scenario: 'RECOGNITION', label: SCENARIO_LABELS.RECOGNITION,
    desc: "The person sets out their case and the evidence for it. You set out what the decision actually turns on. Over the month the check-ins hold that evidence against that bar. The answer comes from the record, not from who asked most recently.",
    moment: "Understand someone's contribution and experience before making a recognition decision.",
    agreed: 'The person sets out their case and the evidence for it. You set out what the decision actually turns on.',
    tests: 'Over the month the check-ins hold that evidence against that bar. The answer comes from the record, not from who asked most recently.',
    examples: [
      'Someone asked for a raise on Friday.',
      'You are going to ask for a raise and want the evidence lined up first.',
      'Someone is up for promotion and you want their record and your read to match before the talk.',
    ] },
  { cardKey: 'PIP', scenario: 'PIP', label: SCENARIO_LABELS.PIP,
    desc: "Agree the concern, the support on offer, and the standard being measured. Make sure they have seen it. Every check-in over the 90 days holds the work against that same standard. The decision at the end rests on a run of evidence, not on a write-up done afterwards.",
    moment: "Understand what is getting in the way when someone's work is off track.",
    agreed: 'Agree the concern, the support on offer, and the standard being measured. Make sure they have seen it.',
    tests: 'Every check-in over the 90 days holds the work against that same standard. The decision at the end rests on a run of evidence, not on a write-up done afterwards.',
    examples: [
      'A senior person has missed three deadlines and you are thinking about letting them go.',
      'You are putting someone on a formal plan and want both sides on the concern and what success looks like.',
      'A capability concern where you want a fair record, not a he-said-she-said.',
    ] },
  { cardKey: 'OKR_ALIGNMENT', scenario: 'OKR_ALIGNMENT', label: SCENARIO_LABELS.OKR_ALIGNMENT,
    /*
     * THE WORKPLAN BELONGS HERE TOO, AND IT IS NOT THE WORKPLAN CARD.
     *
     * "Sometimes workplans are attached to goals, and if they exist and who is responsible for
     * what, we need to track it well." A goal with a plan under it is the ordinary case, not a
     * second situation - the plan is how the goal is meant to happen and who is meant to do it.
     * Build a Workplan and Budget stays its own card for the other job: the plan and the money ARE
     * the thing being agreed, and each person's plan has to hold together with everybody else's.
     *
     * Here it is a thing that may or may not exist, and the check-in asks rather than assumes. A
     * goal with no plan under it is a real answer and the card must not read as demanding one.
     */
    desc: "Everyone writes the two or three objectives they think matter most, before the team settles on one version. Where there is a plan under an objective, it says what happens and who owns which part. The check-ins through the quarter ask what people are actually working on. Effort aimed at the wrong thing shows up early.",
    moment: 'Set goals, targets or OKRs and a workplan, and keep track of how the work is going.',
    agreed: 'Everyone writes the two or three objectives they think matter most, before the team settles on one version. Where a workplan sits under a goal, it says what happens and who owns which part.',
    tests: 'The check-ins through the quarter ask what people are actually working on, and what they said they would do. Effort aimed at the wrong thing shows up early, and so does a part of the plan nobody has picked up.',
    examples: [
      'The quarter starts in two weeks and six people would name different priorities.',
      'Planning season and you want to check everyone\'s goals actually connect before they lock.',
      'Two teams whose objectives depend on each other and you are not sure the handoff is agreed.',
      'A goal with a workplan under it, and no one place saying who owns which part of the plan.',
    ] },
  /**
   * THE SECOND GOAL CARD, WHICH HAS NEVER BEEN IN A PICKER.
   *
   * Both goal cards run on OKR_ALIGNMENT, because a cascade is detected from what somebody says
   * rather than declared at setup - and the card had been written up in SITUATION_CARDS, a list
   * that turns out to render nowhere. So of the two cards there is copy for, one could be chosen
   * and the other could only be stumbled into by typing a sentence that happened to sound like a
   * cascade. Its own copy comes from that entry, unchanged.
   *
   * `cardKey` is its own, because two cards sharing a scenario is exactly what cardKey is for.
   */
  { cardKey: 'OKR_CASCADE', scenario: 'OKR_ALIGNMENT', label: 'Connect Goals Across the Team',
    desc: 'The goal at the top is written down. Each team lead or partner then writes the goal and target they own underneath it, in their own words. The check-ins ask whether each one still connects to the goal above it, and whether they add up. A team quietly working to its own number shows up while the quarter can still absorb it.',
    moment: 'Set a main goal, then have team leads and partners set their own goals and targets.',
    agreed: 'The goal at the top. Each team lead or partner then writes the goal and target they own underneath it, in their own words.',
    tests: 'The check-ins ask whether each one still connects to the goal above it, and whether they add up. A team quietly working to its own number shows up while the quarter can still absorb it.',
    examples: [
      'A company target with three departments each writing their own results under it.',
      'Team goals that each look sensible on their own and may not add up to the thing at the top.',
    ] },
  { cardKey: 'WORKPLAN_BUDGET', scenario: 'WORKPLAN_BUDGET', label: SCENARIO_LABELS.WORKPLAN_BUDGET,
    desc: "Each person commits to their own plan and budget, and the numbers have to add up together. The check-ins ask what was spent and what was delivered. An overlap or an overrun shows up while there is still quarter left.",
    moment: "Bring people's plans together so the work and budget line up.",
    agreed: 'Each person commits to their own plan and budget, and the numbers have to add up together.',
    tests: 'The check-ins ask what was spent and what was delivered. An overlap or an overrun shows up while there is still quarter left.',
    examples: [
      'Two teams have each budgeted for the same hire.',
      'Start of the quarter and you want each person\'s plan and budget to hold up against real resources.',
      'A plan that looks fine on paper but you suspect the budget behind it was assumed, not approved.',
    ] },
  { cardKey: 'PULSE_CHECK', scenario: 'PULSE_CHECK', label: SCENARIO_LABELS.PULSE_CHECK,
    desc: "A short recurring check-in, with no setup and no target. Each one asks about one thing going well, one thing stuck, and what has changed since last time. Use it for a temperature read, not a record. If there is a specific thing you need people held to, pick one of the others.",
    moment: 'Regularly understand how work is going while it is happening.',
    agreed: 'Agree what the team is working on and what each person owns.',
    tests: 'Each check-in asks what that person did since last time. Work drifting off what was agreed shows up week by week, not at the end.',
    examples: [
      'You want to know what your team is actually doing.',
      'A quick read every two weeks from each person on what is moving and what is stuck.',
      'You want a lightweight recurring signal without calling a meeting.',
    ] },
  { cardKey: 'DRIFT', scenario: 'DRIFT', label: SCENARIO_LABELS.DRIFT,
    desc: "Pin down what was agreed, what exists now, and the gap between them. The check-ins ask whether that gap is closing. The same thing unresolved three check-ins running is a pattern, not bad luck.",
    moment: 'Understand why a project is off track and what needs to change.',
    agreed: 'Pin down what was agreed, what exists now, and the gap between them.',
    tests: 'The check-ins ask whether that gap is closing. The same thing unresolved three check-ins running is a pattern, not bad luck.',
    examples: [
      'The project is eight weeks late and everyone has a different reason.',
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
  { cardKey: 'CRISIS_ALIGNMENT', scenario: 'CRISIS_ALIGNMENT', label: SCENARIO_LABELS.CRISIS_ALIGNMENT,
    desc: "One real choice, with a date on it. Each person gives their own read before the group settles. The check-ins after it ask whether what people are doing matches what was decided.",
    moment: 'Bring different views together around an important decision.',
    agreed: 'One real choice with a date on it, and each person\'s own read before the group settles.',
    tests: 'The check-ins after it ask whether what people are doing matches what was decided.',
    examples: [
      'You are deciding this month whether to shut down a product line.',
      'A hiring, budget, or direction call where you want each person\'s real view first.',
      'A decision everyone will agree to in the meeting and re-litigate afterwards.',
      'Two options on the table and you suspect the quiet objection is the important one.',
    ] },
  { cardKey: 'BOARD_STRATEGY', scenario: 'BOARD_STRATEGY', label: SCENARIO_LABELS.BOARD_STRATEGY,
    desc: "Each leader writes their own read on the strategy before the room debates it. The check-ins through the quarter ask whether what the business is doing matches the strategy that was agreed. Quiet disagreement surfaces now, not after the decision.",
    moment: 'Understand how leaders see the direction and where their views differ.',
    agreed: 'Each leader writes their own read on the strategy before the room debates it.',
    tests: 'The check-ins through the quarter ask whether what the business is doing matches the strategy that was agreed. Quiet disagreement surfaces now, not after the decision.',
    examples: [
      'The board agreed the strategy in the room, and two of them have since told you privately they disagree.',
      'Before a strategy offsite, you want each leader\'s real read so quiet disagreement shows up early.',
      'The board looks aligned in the room but you suspect it is not on one big bet.',
    ] },
  { cardKey: 'COHORT_CHECK', scenario: 'COHORT_CHECK', label: SCENARIO_LABELS.COHORT_CHECK,
    desc: "One set of expectations, for several people in the same role, each answering on their own. The check-ins hold every person's work against the same frame. You see who is on track and who is stuck, without anyone swaying anyone else. For a group who are new, use \"Onboarding several people at once\" instead.",
    moment: 'Understand how people doing similar work are experiencing it.',
    agreed: 'One set of expectations, for several people in the same role, each answering on their own.',
    tests: 'The check-ins test each person\'s work against that same frame, so you see who is on track and who is stuck without them swaying each other.',
    examples: [
      'Twenty field officers, and you only hear from the three who call.',
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
  /**
   * ASK ONE QUESTION, GET ONE REPORT. THE LIGHTEST CARD HERE, AND THE ONLY ONE WHOSE QUESTION IS
   * THEIRS.
   *
   * Hafsah, 18 September 2026: "You write one line about what you want to know, drop in their
   * emails, and pick how often you want it - daily, weekly, every two weeks. They answer on their
   * own link, and the updates come back to you as one picture."
   *
   * THE WORD DOING THE WORK IS "ONE", and it is a positioning decision rather than a style one: one
   * line, one link, one report. The pitch is ask your team one thing and get one answer back.
   * Cadence, links and reports are how it works and not what it is, so the card leads with the ask
   * and mentions the machinery once.
   *
   * WHY IT IS NOT SNAPSHOT AND NOT THE PULSE. A snapshot happens once. The pulse spends a whole
   * first session working out what each person owns before it asks how anything is going. This one
   * asks the lead's own question, on a rhythm, and sets nothing up.
   */
  /**
   * INTERROGATE A GROUP ONCE, TO TURN WHAT THEY KNOW INTO A DIRECTION.
   *
   * The one card here that is not about the people answering. They are not being checked on and are
   * not reporting on their work: they hold knowledge about their own market, and one session with
   * twenty of them, read together, says where to go next. Run as a snapshot it asked twenty-four
   * business owners what they would do about it and by when, which is a survey with homework.
   */
  { cardKey: 'DISCOVERY', scenario: 'DISCOVERY', label: SCENARIO_LABELS.DISCOVERY,
    desc: 'Ask a group what they know, once, and read the answers together. Each person is taken through what they are trying to grow, what stops them, and where they would go if it went. The report comes back as a direction: the regions, markets, value chains, actors and data gaps the room named, and how many named each.',
    moment: 'You have a decision to make about where to focus, and the people who know are not in your team.',
    agreed: 'Nothing. Nobody is committing to anything and nobody is being tracked.',
    tests: 'Nothing over time. There is one check-in, and the value is in reading twenty accounts against each other rather than in asking anybody twice.',
    examples: [
      'Where should we expand next, and what data would we need to do it?',
      'Which value chains matter most to the people who actually trade in them?',
      'What is stopping our customers from growing, and where would they go if it stopped?',
    ] },
  { cardKey: 'TEAM_UPDATES', scenario: 'TEAM_UPDATES', label: SCENARIO_LABELS.TEAM_UPDATES,
    desc: 'Ask one question, everyone answers on their own link, you get one report. It comes back every week, or however often you pick. Two minutes to set up: who, the one line you want answered, and how often. No target to agree and nothing to set up.',
    moment: 'You want to know one thing from your team, regularly, without booking a meeting.',
    agreed: 'Nothing. You write the question; they answer that question.',
    tests: 'Nothing over time against a target, because there is not one. Each period everyone answers your line on their own link, and the report shows what each person said, where they line up, where they do not, and what nobody is holding.',
    examples: [
      'Can you share an update on how sales is going for you this quarter, or if you have any blockers?',
      'What shipped this week, and what slipped?',
      'What are your three priorities this quarter, and what is blocking you?',
      'What is the one thing you need from me before Friday?',
    ] },
  { cardKey: 'SNAPSHOT', scenario: 'SNAPSHOT', label: SCENARIO_LABELS.SNAPSHOT,
    desc: 'One honest read from everyone, once, with no setup and no target. Each person says what is going well, what is stuck and what has changed. If there is a specific thing you need people held to, pick that situation instead.',
    moment: 'Get a quick picture of how people are experiencing the work right now.',
    agreed: 'Nothing. No setup and no target to measure against, which is the point.',
    tests: 'Nothing over time either. One check-in, and one honest read from each person on what is going well, what is stuck, and what has changed. A temperature read, not a record. If there is a specific thing you need people held to, pick one of the others.',
    examples: [
      'You want one honest read from everyone this week.',
      'You want to know how people are actually doing this week, without booking a meeting.',
      'Something feels off across the team and you want a read before deciding whether it needs watching.',
    ] },
  { cardKey: 'COHORT_ONBOARDING', scenario: 'COHORT_CHECK', label: 'Onboarding several people at once',
    desc: "Several people start the same role at once. Each answers on their own, against the same expectations. The check-ins ask how each of them is settling. You see early who has found their feet and who is struggling, before the end of the period decides anything.",
    moment: 'Help several people starting the same role at once settle in, and see who is on track.',
    agreed: 'The same expectations for several people starting the same role together.',
    tests: 'The check-ins ask how each of them is settling. You see early who has found their feet and who is struggling, before the end of the period decides anything.',
    examples: [
      'Six new managers, each running a different branch, all started this month.',
      'Four new managers on a three month onboarding that is also their probation.',
      'A cohort of new starters where you need to know by month two, not month three, who needs help.',
      'Trainees in different locations who never work together but are all learning the same job.',
    ] },
  { cardKey: 'ACUTE_SHOCK', scenario: 'ACUTE_SHOCK', label: SCENARIO_LABELS.ACUTE_SHOCK,
    desc: "Something has just happened that nobody planned for, and the versions of it are already drifting apart. The first check-in gets each person's version down while it is fresh, and separates the facts everyone agrees on from the ones still argued over. A follow-up a week later asks what turned out differently once the dust settled.",
    moment: 'Give people a private way to explain what happened and what needs attention.',
    agreed: 'First the facts everyone actually has, kept apart from what is being repeated. Then what you are trying to achieve now, with a date on it.',
    tests: 'Each daily check-in asks what that person did. A recovery that is stalling shows up on day three, not at the end of the fortnight.',
    examples: [
      'Your biggest client left on Tuesday and you want them back.',
      'A major client pulled out overnight and everyone has a different version of why.',
      'An incident just took things down and people are scrambling to understand what happened.',
      'Sudden bad news hit the team and you want honest reads before any decisions get made.',
    ] },
  { cardKey: 'REALIGN_TEAM', scenario: 'REALIGN_TEAM', label: SCENARIO_LABELS.REALIGN_TEAM,
    desc: "Each person gives their own read before the group talks, so the loudest version does not become the official one. The first check-in sets out what you agree on and what you do not. The check-ins after it ask whether the gap closed or only went quiet.",
    moment: "Understand different views when people don't see a situation the same way.",
    agreed: 'Each person gives their own read before the group talks. The first check-in sets out what you agree on and what you do not.',
    tests: 'The check-ins after it ask whether the gap closed or only went quiet.',
    examples: [
      'You and your ops lead have stopped agreeing on what matters.',
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
  { cardKey: 'DESCRIBE_OWN', scenario: 'OPEN_READ', label: SCENARIO_LABELS.OPEN_READ,
    desc: "Say what is happening in your own words. Each person gives their own read first, privately. The check-ins that follow ask whether that picture holds. If it turns out to be one of the situations below, pick that instead: it sets the objective and shapes the questions people are asked.",
    moment: "Give people a starting point when the situation doesn't fit a predefined scenario.",
    agreed: 'Nothing fixed. Each person gives their own read first, privately, because nobody has named the situation yet.',
    tests: 'The check-ins that follow ask whether that picture holds. If it turns out to be one of the situations below, pick that instead: it sets the objective and shapes the questions people are asked.',
    /* The line this card used to lead with. Every other card keeps its concrete one here; this is
       the only one that had nowhere to put it, so it got somewhere. */
    examples: [
      'You would rather describe it yourself than pick from a list.',
    ], },
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
  /* Shares OKR_ALIGNMENT's scenario and its group, but named here so it cannot be missed. */
  OKR_CASCADE: 'planning',
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
  const fmt = (d: Date) => whenItWas(d, 'day')
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
 * WHAT EACH STEP IS ABOUT, AS A FRAGMENT A SENTENCE CAN FINISH WITH ("This is step 2 of 3, about a
 * coach."). Taken from the same ordering as the step headings, so the page's progress sentence and
 * the step itself cannot say two different things. Step 5 is the one that no longer renders - see
 * the note on the end-state step - and is skipped rather than renumbered, because renumbering would
 * break every link and saved position that already exists.
 *
 * Was a title-case label shown after a middle dot ("Step 3 of 4 · The situation") - two pieces
 * joined by punctuation rather than a sentence (group 3, piece 4 wording pass).
 */
const STEP_ABOUT: Record<number, string> = {
  [STAGE.who]: 'who checks in',
  [STAGE.situation]: 'the situation',
  [STAGE.coach]: 'a coach',
  [STAGE.describe]: 'describing it',
  [STAGE.plan]: 'your plan',
  [STAGE.timeline]: 'how long it runs',
  [STAGE.people]: 'who is in it',
  [STAGE.brief]: 'the brief',
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
  const freeLimit = livePricing?.free?.groundLimit ?? FALLBACK_FREE_LIMITS.groundLimit

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
  /* B-127: only an admin can open Plan and billing, so only an admin is offered "See plans". */
  const isAdmin = useAuthStore(s => s.user?.role === 'ADMIN')

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
  /** An hour from when this screen opened, computed once rather than on every render. */
  const [coachMinWhen] = useState(() => new Date(Date.now() + 3600_000).toISOString().slice(0, 16))
  const [participants, setParticipants] = useState<Participant[]>([])
  /**
   * WHEN THIS PERSON STARTS, IF THEY HAVE NOT YET.
   *
   * Only shown for the situations that are set up about somebody before they begin. A future date holds
   * their invitation until the day, because an email asking somebody to account for their work can
   * otherwise land before they have signed a contract, and cannot be recalled once read.
   */
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
  /* U.19: the server's refusal when the organisation has no plan and the free plan has stopped for it. */
  const [noPlan, setNoPlan] = useState<string | null>(null)
  const [showCodeInput, setShowCodeInput] = useState(false)
  const [codeInput, setCodeInput] = useState('')
  const [codeApplied, setCodeApplied] = useState(false)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [codeChecking, setCodeChecking] = useState(false)
  const [appliedAccessCode, setAppliedAccessCode] = useState<string | null>(null)
  const [billingLoading, setBillingLoading] = useState(false)


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

  // When entering step 2 (billing), auto-check
  useEffect(() => {
    if (step === STAGE.situation && !billingChecked) {
      setBillingLoading(true)
      setBillingUnknown(false)
      billingApi.checkCanCreateGround().then(res => {
        setBillingChecked(true)
        setBillingLoading(false)
        if (res.groundsUsed != null) setGroundsUsed(res.groundsUsed)
        setNoPlan(res.noPlan ? (res.reason ?? null) : null)
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

  /**
   * HAND THE REST TO THE CONVERSATION.
   *
   * Everything the removed screens collected is what the setup conversation already gathers and
   * extracts, and it gathers it better. The scenario travels so the conversation opens on that
   * situation's own first question rather than asking what has just been chosen.
   */
  function handOverToTheConversation() {
    if (!scenario) return
    forget(DRAFT_KEY)
    const q = new URLSearchParams({ scenario })
    if (moment) q.set('mode', moment === 'STARTING' ? 'new' : 'underway')
    navigate(`/start?${q.toString()}`)
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
                        const facts = SCENARIO_FACTS[card.scenario as keyof typeof SCENARIO_FACTS]
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
                          /* Seeded as the card's own recommendation. The cadence was seeded here
                             too and set on a later screen; that screen is gone and the conversation
                             asks how long and how often in the person's own words, so a seed
                             nothing reads would be a value pretending to be a choice. */
                          setTimelineDays(facts.timelineDays)
                          /* And where in the arc. Step one required this second choice and disabled
                             Continue until it was answered, without saying which choice was missing -
                             while the card just clicked already answered it. Still changeable below. */
                          setMoment(RECOMMENDED_MOMENT[card.scenario as keyof typeof RECOMMENDED_MOMENT] as GroundMoment)
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
                                <div className="gwui-situation-extra-note">
                                  You write it on the next screen, in your own words.
                                </div>
                              ) : undefined
                            }
                          />
                        )
  }

  /**
   * REBUILT FROM THE SHARED PARTS (group 3, piece 4, B1-starting-a-check-in): the page frame is
   * `Page`, the header is `PageTitle` (crumbs "Check-ins / New check-in", the back control as a
   * quiet `Button` in its action slot), the restored-draft notice is a `Callout`, and every
   * tinted box below - the free-limit notice, the paid-plan gate, the billing states - is a
   * `Callout` or a `Panel`. No prototype screen matches this one exactly (the prototype's own B1
   * replaces this wizard with a conversation - see the note on `SituationCard`), so the values
   * carried over are the product's own, now behind named classes instead of inline styles. No API
   * call, no state, and no step's own logic changed.
   *
   * THE PROGRESS LINE WAS TWO PIECES JOINED BY A MIDDLE DOT ("Step 3 of 4 · The situation"), and
   * the banner below it joined two clauses with a dash ("…left off just now - on this device.").
   * Both are one plain sentence now (`STEP_ABOUT` above).
   */
  return (
    <Page>
      {restored && (
        <Callout role="status">
          Picked up where you left off {howLongAgo(restored)}, on this device.{' '}
          {/* "Start fresh" was `gw-btn-ghost`, which no stylesheet defines - so it rendered as a
              raw browser button inside a styled banner. Same silent failure as the seven `gw-in`
              fields; found by the guard written for those. */}
          <button
            type="button"
            className="gwui-plain-link"
            onClick={() => {
              forget(DRAFT_KEY)
              window.location.reload()
            }}
          >
            Start fresh
          </button>
        </Callout>
      )}
      <PageTitle
        title="Set up a check-in"
        subtitle={`This is step ${displayStep} of ${totalStepsForThisPerson}, about ${STEP_ABOUT[step] ?? 'this'}.`}
        action={<Button kind="quiet" onClick={back}>← Back</Button>}
      />

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
        */}
      <div className={`gwui-cg-body${step === STAGE.situation ? ' gwui-cg-body-wide' : ''}`}>
        {/* Step dots */}
        <div className="gwui-wizard-dots">
          {Array.from({ length: totalStepsForThisPerson }, (_, i) => i + 1).map(n => (
            <div key={n} className={`gwui-wizard-dot${displayStep === n ? ' gwui-wizard-dot-active' : displayStep > n ? ' gwui-wizard-dot-done' : ''}`} />
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
            {/*
              * THE SCREENS THAT ASKED WHAT THE CONVERSATION ASKS WERE HERE.
              *
              * The timeline, the people, the brief, and who checks in against it. Every one
              * collected something the setup conversation already gathers and extracts, and
              * collected it worse - a textarea cannot say "you have said what but not who", cannot
              * press on a vague answer, and cannot tell a new hire's setup from a contract
              * renewal's. Then the flow ended on an admin board rather than on this person's own
              * check-in and a report, so most people who set one up never gave an account at all.
              *
              * REMOVED ONLY AFTER THE RULES THEY CARRIED MOVED. Those screens were the only place
              * six things were enforced - the plan limit before the work, the server's own refusal
              * sentence, who was not invited written down rather than toasted, who is waiting for a
              * start date, the draft, and naming a check-in from the words somebody clicked. They
              * are on the conversation's save now; see the-rules-came-with-the-flow.spec.ts.
              *
              * Deleting first and repointing the specs would have left six rules quietly
              * unenforced and a suite claiming otherwise.
              */}
            {step === STAGE.situation && (<>
            {/* Say the limit is reached BEFORE the setup work, not after it.
                The API refuses an eleventh ground correctly, but it refused it
                at submit - so the admin picked a card, named the ground, set
                the timeline and the people, and only then was told she could
                not. The block was right; the timing made it feel like a trick. */}
            {canCreate.data && !canCreate.data.allowed && (
              <Callout tone="warning" title={
                /* U.19: once the free trial's switch is on, a new organisation has no free check-ins at all. */
                canCreate.data.noPlan ? 'No plan yet' : `You have used all ${freeLimit} of your free check-ins`
              }>
                {planLimitNotice({
                  reason: canCreate.data.reason ?? 'Subscribe to open more.',
                  isAdmin,
                  continuation: 'You can still look around here, but this one cannot be created until then.',
                  onSeePlans: () => navigate('/billing'),
                })}
              </Callout>
            )}
            </>)}

            {/* ---- LAST: who checks in against this ----
                 Numbered comments used to label these ("STEP 1: who this check-in is for"), and the
                 numbers went stale the moment a step moved. Named now: the order lives in
                 stepsThisPersonSees and a comment that repeats it is a second copy that can drift. */}

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
            <Stack gap={18}>
              <p className="gwui-panel-text-muted">
                {/* Whose situation this is decides the pronouns - see whose-situation-is-it.ts.
                    NAMED situations, because the describe-your-own card is no longer one of the
                    things being counted: it is the pick above them. */}
                {namedCardCount} {theWords.intro}
              </p>

              {/* THE FIRST PICK. Same card, same renderer, same selection behaviour as any other -
                  duplicating the JSX for it is how it would start behaving differently. */}
              {openCard && (
                <div role="radiogroup" aria-label={theWords.describeOwnLabel} className="gwui-situation-grid gwui-situation-grid-one">
                  {renderSituation(openCard)}
                </div>
              )}

              {/* The same second route, said the same way. See OR_PICK_ONE_THAT_FITS. */}
              <div>
                <FieldLabel htmlFor="cg-group">{OR_PICK_ONE_THAT_FITS}</FieldLabel>
                <Select
                  id="cg-group"
                  value={situationGroup}
                  onChange={(e) => setSituationGroup(e.target.value as ScenarioGroupKey)}
                >
                  {GROUPS_YOU_PICK_FROM.map(g => (
                    <option key={g.key} value={g.key}>
                      {g.heading} ({cardsInGroup(g.key as ScenarioGroupKey).length})
                    </option>
                  ))}
                </Select>
                {/* The group's own question, which is what its heading is short for. */}
                <p className="gwui-situation-group-q">{groupNow?.question}</p>
              </div>

              {/* Real radios in one radiogroup over what is actually on screen. It used to span every
                  group at once because every group was on screen at once. */}
              {/* `id` is here as a stable anchor for the-picker-gets-the-whole-width.spec.ts, which
                  used to find this block by its aria-label. That label now names the chosen group,
                  which is better for a screen reader and useless as a marker - a guard cannot anchor
                  on a string that varies. */}
              <div id="cg-situations" role="radiogroup" aria-label={groupNow?.heading ?? 'Situations'}>
                <div className={`gwui-situation-grid${cardsInGroup(situationGroup).length === 1 ? ' gwui-situation-grid-one' : ''}`}>
                  {cardsInGroup(situationGroup).map(renderSituation)}
                </div>
              </div>
            </Stack>

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
              <Callout tone="warning" title="Working with a coach is part of a paid plan">
                You can carry on and set this check-in up without one - most teams do. If you want a
                person alongside it, the plans are one click away and you will come back to this step.{' '}
                <button type="button" className="gwui-plain-link" onClick={() => navigate('/pricing')}>See the plans</button>
                {' '}
                <button type="button" className="gwui-plain-link" onClick={() => setStep(stepAfter(visibleSteps, step))}>Skip this</button>
              </Callout>
            )}
            <div className={onAPaidPlan ? undefined : 'gwui-cg-dimmed'}>
            {/* THE COACH CARD. Outside the radiogroup on purpose: it is not a situation, it
                creates nothing, and it must not be selectable as one.

                LAST ON THE PAGE, WHICH IS NOT THE SAME AS BEING THE LAST RESORT. It used to read
                "Not sure this is the right tool yet" and sat directly under "Not sure yet", so the
                order and the words agreed on the wrong thing: that a coach is what you fall back on
                when you cannot name your situation. It is the opposite - somebody who knows exactly
                what they are dealing with and wants a person alongside while they run it. The words
                say that now, and it stays at the end because it is the one card that creates
                nothing, not because it ranks last. */}
            <section className="gwui-situation-group" id="cg-coach">
              <div className="gwui-situation-group-head"><h3>{COACH_CARD.heading}</h3></div>
              <p className="gwui-situation-group-q">{COACH_CARD.question}</p>
              <div className="gwui-situation-grid gwui-situation-grid-one">
                <Panel>
                  <Stack gap={10}>
                    <Tag>A coach</Tag>
                    <div className="gwui-situation-title">{COACH_CARD.label}</div>
                    <p className="gwui-situation-moment">{COACH_CARD.moment}</p>
                    <p className="gwui-panel-text-muted">{COACH_CARD.whatHappens}</p>
                    {/* The cost is here, before the button, not after a reply has been chased. */}
                    <Callout>{COACH_CARD.cost}</Callout>

                    {coachSent ? (
                      <Callout tone="success">
                        Thanks. We have your request and have emailed you. Nothing has been created here and nobody on your team was contacted.
                      </Callout>
                    ) : !coachOpen ? (
                      <button type="button" className="gwui-plain-link" onClick={() => setCoachOpen(true)}>Ask a coach &#8250;</button>
                    ) : (
                      <Stack gap={10}>
                        {([
                          { k: 'name', label: 'Your name', ph: '' },
                          { k: 'orgName', label: 'Organisation', ph: '' },
                          { k: 'email', label: 'Work email', ph: 'you@company.com' },
                          { k: 'teamSize', label: 'Roughly how many people', ph: 'e.g. 12' },
                        ] as const).map(f => (
                          <div key={f.k}>
                            <FieldLabel htmlFor={`coach-${f.k}`}>{f.label}</FieldLabel>
                            <TextField
                              id={`coach-${f.k}`}
                              value={(coach as any)[f.k]}
                              placeholder={f.ph}
                              onChange={e => setCoach({ ...coach, [f.k]: e.target.value })}
                            />
                          </div>
                        ))}
                        <div>
                          <FieldLabel htmlFor="coach-intention">What do you want help with?</FieldLabel>
                          <TextArea
                            id="coach-intention"
                            rows={3}
                            value={coach.intention}
                            placeholder="A line or two is enough. It is what the first reply is written from."
                            onChange={e => setCoach({ ...coach, intention: e.target.value })}
                          />
                          <Note tone={coach.intention.trim().length >= MIN_INTENTION_LENGTH ? undefined : 'error'}>
                            {coach.intention.trim().length >= MIN_INTENTION_LENGTH
                              ? 'Thanks, that is enough to reply to.'
                              : `A little more, please. ${MIN_INTENTION_LENGTH - coach.intention.trim().length} characters to go.`}
                          </Note>
                        </div>
                        <label className="gwui-cg-checkbox-row">
                          <input type="checkbox" checked={coach.triedAlready} onChange={e => setCoach({ ...coach, triedAlready: e.target.checked })} />
                          <span>I have already tried opening a check-in</span>
                        </label>
                        <div>
                          <FieldLabel htmlFor="coach-when">When would you like the first conversation?</FieldLabel>
                          <TextField
                            id="coach-when"
                            type="datetime-local"
                            value={coachWhen}
                            min={coachMinWhen}
                            onChange={e => setCoachWhen(e.target.value)}
                          />
                          {/*
                            * A REQUEST, NOT A BOOKING, and it has to keep saying so. Nothing here
                            * holds a slot in anybody's calendar - a coach confirms - and somebody
                            * leaving this page believing they have an appointment would be worse off
                            * than if it had never asked.
                            */}
                          <p className="gwui-fine">
                            This is optional, and it is a request rather than a booking, because a coach confirms.
                            Leave it empty and we will come back to you to agree a time.
                          </p>
                        </div>
                        {/*
                          * WHAT IT COSTS, BEFORE THE SEND BUTTON.
                          *
                          * `COACHING_PRICE` says in its own comment that the price is "shown before
                          * the send button rather than after a reply is chased", and only `.note` was
                          * ever rendered - so the two figures were exported, kept in step with the
                          * pricing page, and read by nobody. Somebody asking to speak to a coach
                          * learned the number in the reply.
                          */}
                        <p className="gwui-fine">
                          {COACHING_PRICE.hourly}, or {COACHING_PRICE.retained}. {COACHING_PRICE.note}
                        </p>
                        {coachErr && <Note tone="error">{coachErr}</Note>}
                        {/* Secondary, not primary: the fixed "Continue" bar below is this screen's
                            one navy button, and a lead can have this form open at the same time. */}
                        <Button
                          kind="secondary"
                          disabled={coachBusy || !coach.name.trim() || !coach.orgName.trim() || !looksLikeAnAddress(coach.email) || !coach.teamSize.trim() || coach.intention.trim().length < MIN_INTENTION_LENGTH}
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
                        </Button>
                      </Stack>
                    )}
                  </Stack>
                </Panel>
              </div>
            </section>

            </div>
            </>)}

            {/* ---- THEN: describe it in your own words ---- */}
            {step === STAGE.describe && (<>
            {selectedCard === 'DESCRIBE_OWN' && (
              <Panel>
                <Stack gap={10}>
                  {/*
                    THE SAME QUESTION THE ENTRY CHAT ASKS. The two doors asked for this in their own
                    words - one said "Describe your own situation / tell it in your own words", this
                    one said "Describe it in your own words" and then explained the routing - so the
                    same act had two names depending on how somebody arrived.
                    What the sentence under it must keep saying is the routing, because it is true
                    here and it is the thing a person needs to know before typing.
                  */}
                  <div>
                    <FieldLabel htmlFor="own-situation">{theWords.describeOwnQuestion}</FieldLabel>
                    <p className="gwui-panel-text-muted">
                      {theWords.describeOwnHelp} I will suggest the closest situation and you can change
                      it, because what gets picked decides the questions people are asked.
                    </p>
                    <TextArea id="own-situation" rows={4} value={ownDescription}
                      onChange={(e) => { setOwnDescription(e.target.value); setRoutedTo(null); setRouteFailed(false) }}
                      placeholder="e.g. Four new clinic managers on a three month probation. They run separate clinics and never work together, but they all report to me." />
                    {/*
                      A BUTTON THAT REFUSES AND WILL NOT SAY WHY. W-UX-7.

                      Twenty characters, enforced in two places on this line and stated in neither. A
                      person who typed "new manager" got a greyed-out button, no message, and no way to
                      find out what was wrong - the only remaining move is to guess or to leave.

                      The coach form above already does this properly, counting down the characters it
                      still wants. Same treatment, same reason.
                    */}
                    {ownDescription.trim().length > 0 && ownDescription.trim().length < MIN_OWN_DESCRIPTION && (
                      <Note tone="error">
                        A little more, please. {MIN_OWN_DESCRIPTION - ownDescription.trim().length} characters to go.
                      </Note>
                    )}
                  </div>
                  {/* Secondary, not primary: the fixed "Continue" bar below is this screen's one
                      navy button. */}
                  <Button
                    kind="secondary"
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
                    }}>
                    {routing ? 'Reading it…' : 'Find the closest situation'}
                  </Button>

                  {routedTo && (
                    <Callout tone="info">
                      From what you wrote, this looks like <b>{SCENARIOS.find(c => c.scenario === routedTo)?.label}</b>.
                      That is what I will set up. If it is not right, pick a card above instead, because
                      your description is kept either way.
                    </Callout>
                  )}
                  {routeFailed && (
                    <Callout tone="warning">
                      {/* Saying so beats picking one quietly. The shape decides the
                          board, the mode and the questions - too much to guess at. */}
                      {/*
                        * ITEM 1: SAY WHAT THEY ARE ACTUALLY GETTING.
                        *
                        * This used to promise "a general ground" while handing over a REALIGN_TEAM one.
                        * Now the general ground genuinely exists, so the sentence is true - and it names
                        * the trade rather than glossing it.
                      */}
                      I could not tell which of the situations above this is closest to, so I will open an
                      <b> open read</b>: each person answers privately and the report shows where
                      they differ. That works when the shape is genuinely unclear. If one of the cards above
                      does fit, pick it instead, because a named situation asks sharper questions than this
                      one can.
                    </Callout>
                  )}
                </Stack>
              </Panel>
            )}

            </>)}

            {/* Fixed action bar: the 17-card grid pushes the page well past
                any laptop fold, and position:sticky binds to the .gw-bd
                overflow ancestor (which is not what actually scrolls here),
                so the bar is FIXED to the real viewport instead. Suite L
                enforces its visibility at 1366x768 and 1280x720. */}
            <div className="gwui-cg-fixed-spacer" />
            <div className="gwui-cg-fixed-bar">
              <div className="gwui-cg-fixed-bar-inner">
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
                    step === STAGE.situation ? (!scenario || !moment)
                    : step === STAGE.describe ? needsRouting
                    : false

                  const why =
                    step === STAGE.situation ? (!scenario ? 'Pick a situation to continue' : 'Pick where you are in it to continue')
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
                      {/*
                        * THE END OF THIS FLOW IS THE CONVERSATION, NOT A CREATED CHECK-IN.
                        *
                        * The picker used to be screen two of eight, and the last of them called
                        * `create.mutate()`. The screens in between asked for exactly what the setup
                        * conversation already asks for and extracts - what this is about, who is in
                        * it, why now, how long, how often, the brief - and asked for them worse: a
                        * textarea cannot press on a vague answer or tell a new hire's setup from a
                        * contract renewal's. Then it ended on an admin board rather than on this
                        * person's own check-in and a report, so most people who set one up never
                        * gave an account at all.
                        *
                        * Her words, over "Step 5 of 5 - The brief": "this page should not really
                        * exist... the entry chat and the wizard should be similar, right?"
                        *
                        * So picking a situation hands over, with the situation already chosen so
                        * nobody is asked to pick it twice. Nothing is created here any more: the
                        * ground is created when the conversation is saved, by the same commit the
                        * entry chat has always used.
                        */}
                      <Button
                        disabled={blocked}
                        onClick={() => (next === step ? handOverToTheConversation() : setStep(next))}
                      >
                        {next === step ? 'Continue →' : 'Continue'}
                      </Button>
                      {blocked ? (
                        <p className="gwui-fine" style={{ textAlign: 'center' }}>{why}</p>
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
          <Section heading="Before you continue">
            <Stack gap={18}>
              {billingLoading && (
                <div className="gwui-spinner">
                  <div className="gwui-spinner-dot" aria-hidden />
                  Checking…
                </div>
              )}

              {!billingLoading && billingChecked && billingFree && (
                <Stack gap={12}>
                  <Callout tone="success" title="No payment needed">
                    {/* One statement about what they have, not two that disagree.
                        This said "unlimited Grounds" directly above "0 of 10
                        Grounds used" - the first thing a new admin reads about
                        money, contradicting itself. A paid plan really is
                        unlimited; the free tier is not, and should say so once. */}
                    {groundsUsed != null && !appliedAccessCode
                      ? <>Your free plan includes {freeLimit} check-ins, with unlimited check-ins and reports in each. You have used <b>{groundsUsed}</b>.</>
                      : <>This one is covered. Unlimited check-ins and reports.</>}
                  </Callout>
                  {/* The warning stays, but only when they are actually near the
                      wall. Repeating the count when they have eight left is noise. */}
                  {groundsUsed != null && !appliedAccessCode && groundsUsed >= freeLimit - 2 && (
                    <Callout tone="warning">
                      Only {freeLimit - groundsUsed} {freeLimit - groundsUsed === 1 ? 'check-in' : 'check-ins'} left on the free plan. After that you will need a subscription to open another.
                    </Callout>
                  )}
                  <Button onClick={() => setStep(stepAfter(visibleSteps, step))}>Continue →</Button>
                </Stack>
              )}

              {!billingLoading && billingChecked && billingUnknown && (
                <Callout tone="warning" title="We could not check your plan just then">
                  This is our side, not yours, and nothing about your plan has changed. Try again, and if it
                  keeps failing you can carry on setting this up and create it in a moment.{' '}
                  <button type="button" className="gwui-plain-link" onClick={() => setBillingChecked(false)}>Try again</button>
                </Callout>
              )}

              {!billingLoading && billingChecked && !billingFree && !billingUnknown && (
                <Stack gap={18}>
                  <Panel>
                    <Stack gap={10}>
                      <h3 className="t-h3">{noPlan ? 'No plan yet' : 'Subscribe to create more'}</h3>
                      <p className="gwui-panel-text-muted">
                        {noPlan ?? `Your free plan includes ${freeLimit} check-ins. Subscribe for unlimited check-ins and reports.`}
                      </p>
                      {/* A LINK, NOT A BUTTON: it only goes to the pricing page, and this step's one
                          primary action is "Continue →" once a code is applied below. */}
                      <Link to="/pricing" className="gwui-plain-link">View plans →</Link>
                    </Stack>
                  </Panel>

                  {!showCodeInput && (
                    <p style={{ textAlign: 'center' }}>
                      <button type="button" className="gwui-plain-link" onClick={() => setShowCodeInput(true)}>I have an access code</button>
                    </p>
                  )}

                  {showCodeInput && (
                    <Panel>
                      <FieldLabel htmlFor="cg-access-code">Access code</FieldLabel>
                      <div className="gwui-invite-link-row">
                        <TextField
                          id="cg-access-code"
                          value={codeInput}
                          onChange={e => { setCodeInput(e.target.value); setCodeError(null) }}
                          placeholder="Enter your code"
                          onKeyDown={e => e.key === 'Enter' && applyCode()}
                        />
                        <Button kind="secondary" size="small" onClick={applyCode} disabled={codeChecking || !codeInput.trim()}>
                          {codeChecking ? 'Checking…' : 'Apply code'}
                        </Button>
                      </div>
                      {codeError && <Note tone="error">{codeError}</Note>}
                    </Panel>
                  )}

                  {codeApplied && (
                    <Stack gap={12}>
                      <Callout tone="success" title="Code applied">
                        Your access code has been validated and will be used when the check-in is created.
                      </Callout>
                      <Button onClick={() => setStep(stepAfter(visibleSteps, step))}>Continue →</Button>
                    </Stack>
                  )}
                </Stack>
              )}
            </Stack>
          </Section>
        )}

        {/* Step 3 (was 2): Timeframe + cadence */}

        {/* Step 4 (was 3): Participants */}

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
      </div>
    </Page>
  )
}
