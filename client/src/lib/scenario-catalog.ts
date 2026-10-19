import type { SubscriptionPlan } from '@/api/billing'

/**
 * ONE NAME PER SITUATION, FOR EVERY SURFACE THAT OFFERS IT.
 *
 * The same eighteen situations were listed in three hand-maintained places and no two agreed:
 *
 *   the use-cases page (marketing)   17 cards
 *   the entry chat                   16 cards
 *   the signed-in setup flow         18 cards, covering only 17 situations
 *
 * And they used three different vocabularies for the same things - "New hire" against "New hire
 * starting", "Goals & planning" against "Setting shared goals", "Workplan & budget" against
 * "Workplan and budget". A person who read the public page and then signed up met a different list.
 *
 * TWO REAL DEFECTS THE COUNTS WERE HIDING, both found by listing the enum against the cards rather
 * than by reading the lists:
 *
 *   1. CRISIS_ALIGNMENT had no card in the signed-in picker at all. It existed only in the routing
 *      map that resolves a `?scenario=` parameter, so "A big decision" was reachable by following a
 *      link from the marketing site and impossible to choose from inside the product.
 *   2. COHORT_CHECK had two cards ("Many people in the same role" and "Onboarding several people at
 *      once"), which is why the flow showed 18 cards for 17 situations.
 *
 * WHY LABELS AND NOT WHOLE CARDS. Each surface needs different fields - the setup flow wants
 * examples and a tag, the entry chat wants an opening message and a timeline hint, the marketing
 * page is static HTML in a separate build. What has to agree is the NAME of the thing and the fact
 * that every situation is offered somewhere. That is what this holds.
 *
 * THE LABEL SAYS WHAT THE CHECK-IN IS FOR, NOT ONLY WHAT IS HAPPENING TO YOU.
 *
 * These used to describe the situation - "A new hire starting", "A workplan and budget" - chosen
 * for somebody scanning the list for their own circumstances. That was right as far as it went, and
 * it had stopped being true of the list: two cards had been written in a different voice, so a
 * person scanning saw twenty cards saying what was happening to them and two saying what they would
 * get. A picker in two voices reads as two products.
 *
 * So all of them now name the job: "Help a New Hire Get Started", "Get a Project Back on Track".
 * The situation is still recognisable in every one - which was the point of the old rule and is not
 * given up here - and the promise is added to it.
 *
 * WHAT THE OLD NOTE WAS REALLY GUARDING still holds, and is the reason none of these is called what
 * its enum is called: never name the PROCESS. "Help Someone Get Back on Track" rather than
 * "Performance improvement plan", which also keeps the word "performance" out of the product - a
 * decision taken for the participant-facing strings and quietly broken here once already.
 *
 * THE ENUM NAMES LIE ABOUT THESE TWO, AND THE CARDS DO NOT.
 *
 * PULSE_CHECK is not the pulse check. It is the RECURRING read, "Keep a Read on Live Work". SNAPSHOT
 * is the quick one-off, which is what most people mean by a pulse check, and its card is
 * "Take the Pulse of the Team". The enum was named before the cards were and nobody renamed it, so
 * reading the schema gives you the opposite of the truth. Read the labels, not the keys.
 *
 * The two were a single card once and nobody could tell them apart. The fix for that is not a
 * different name: it is that their descriptions say plainly which is which. "Regularly understand
 * how work is going while it is happening" against "get a quick picture of how people are
 * experiencing the work right now", and one card says "Once only, not on a schedule" in its own
 * opening line. That is what separates them, and it does the job a renamed label was standing in
 * for.
 */
export const SCENARIO_LABELS = {
  NEW_HIRE: 'Help a new hire get started',
  ROLE_HANDOVER: 'Hand over a role smoothly',
  NEW_PROJECT: 'Get a new project off to a good start',
  NEW_COFOUNDER: 'Start a new partnership well',
  NEW_MANAGER: 'Help a new manager take over',
  NEW_ADVISOR: 'Start an advisor or board relationship',
  /**
   * NAMED FOR THE JOB, NOT THE MECHANISM.
   *
   * "Setting shared goals" describes what the product does. What somebody arrives wanting is to set
   * targets and then keep a team moving against them. A second card sits beside this one for the
   * other job - one goal at the top with other teams writing their own underneath - and it runs on
   * this same scenario, because a cascade is detected from what people say rather than declared at
   * setup. See SITUATION_CARDS.
   */
  OKR_ALIGNMENT: 'Set goals and keep the team on track',
  WORKPLAN_BUDGET: 'Build a workplan and budget',
  BOARD_STRATEGY: 'Align on strategy',
  CRISIS_ALIGNMENT: 'Work through a big decision',
  PULSE_CHECK: 'Keep a read on live work',
  COHORT_CHECK: 'Check how the same role is going',
  CONTRACT_RENEWAL: 'Check in before a contract ends or renews',
  /**
   * TWO CARDS, BECAUSE THESE ARE TWO MOMENTS — and neither is CONTRACT_RENEWAL above, which is one
   * person's engagement ending and sits beside a new hire and a performance plan.
   *
   * The labels say when, because when is the only thing somebody needs to tell them apart:
   * before you sign, and after.
   */
  CONTRACT_REVIEW: 'Check an agreement before signing',
  IMPLEMENTATION_TRACKING: 'Check how an agreement is going',
  RECOGNITION: 'Support a raise, promotion or recognition',
  PIP: 'Help someone get back on track',
  DRIFT: 'Get a project back on track',
  REALIGN_TEAM: 'See where people see things differently',
  ACUTE_SHOCK: 'Make sense of something serious',
  OPEN_READ: 'Work through something else',
  /**
   * THE ONE-OFF, AND IT DOES RUN - the note here used to say it was "the only one that does not",
   * which stopped being true when it got a card, a group, a cadence and a place in both pickers.
   * A comment asserting the opposite of the code beside it is worse than no comment.
   *
   * PULSE_CHECK above is "a regular read on live work" - what your team is doing, week after week,
   * against what they own, for up to a year. This is the one-off: one honest read from everybody
   * today, no target and no second session. They were the same card once, which is why neither could
   * be found - the label described the recurring one and the interview behind it did the snapshot.
   */
  SNAPSHOT: 'Take the pulse of the team',
  /**
   * ONE LINE, ONE LINK, ONE REPORT. Hafsah's words, 18 September 2026, and the word doing the work
   * is "one": the pitch is ask your team one thing and get one answer back. Cadence, links and
   * reports are how it works rather than what it is, so none of them is in the name.
   */
  TEAM_UPDATES: 'Get updates from your team',
  DISCOVERY: 'Work out where to focus',
} as const

export type ScenarioKey = keyof typeof SCENARIO_LABELS

/** Every situation, in the order a person is most likely to be looking for it. */
export const SCENARIO_KEYS = Object.keys(SCENARIO_LABELS) as ScenarioKey[]

/**
 * The catalog name, or a readable fallback for a scenario added to the enum before this file.
 *
 * The fallback title-cases rather than returning the raw key, because the callers render this
 * straight onto a page a lead reads: the admin page previously showed "Acute Shock" for a scenario
 * its own map had never heard of, and returning `key` would have replaced that with "ACUTE_SHOCK"
 * shouting on their dashboard. A missing entry should look like an oversight, not like a database
 * value leaking through.
 */
export function scenarioLabel(key: string, brief?: string | null): string {
  /*
   * TWO CARDS SHARE OKR_ALIGNMENT, SO A SCENARIO ALONE CANNOT NAME THE CHECK-IN.
   *
   * Watched live: a cascade check-in labelled "Set Goals and Keep the Team on Track" - the other
   * card's name - because a label resolved from the scenario and the scenario now has two.
   *
   * What tells them apart is the sentence the person picked the card with, which is the check-in's
   * brief. Same read as the server's, deliberately: the two must never disagree about which
   * conversation this is, and a caller with no brief to hand gets the same answer as before.
   */
  if (key === 'OKR_ALIGNMENT' && SOUNDS_LIKE_A_CASCADE.test(brief ?? '')) return 'Connect Goals Across the Team'
  /*
   * THE ANCHOR'S OWN SCENARIO HAS A NAME BUT NO CARD.
   *
   * `HELP_TEAM_UNDERSTAND` is served for an anchor check-in and must read as a plain sentence
   * everywhere a situation's name is printed - but it must never gain a card, because nobody
   * picks it from a situation picker; it is set only by the anchor's own path. Keeping it out of
   * `SCENARIO_LABELS` keeps it out of `SCENARIO_KEYS`, which both pickers build their cards from.
   */
  if (key === 'HELP_TEAM_UNDERSTAND') return 'Help my team understand'
  /* Collect what's owed (Release 2) is offered only where its switch is on, so it is kept out of SCENARIO_LABELS for the same reason (lib/collect-whats-owed.ts). */
  if (key === 'COLLECTIONS') return 'Collect what’s owed'
  const known = (SCENARIO_LABELS as Record<string, string>)[key]
  if (known) return known
  return key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

/** Kept in step with whichCard() on the server. Two readers of one sentence, one answer. */
const SOUNDS_LIKE_A_CASCADE = /overarching|underneath it|sits under|main goal|cascad|across departments|connect to the/i

/**
 * A label back to its situation, for links that carry `?scenario=a+big+decision`.
 *
 * Derived from the labels above rather than typed out again. The old hand-written map had two
 * answers for one label - "describe your own situation" resolved to REALIGN_TEAM while its own card
 * said OPEN_READ - which is exactly the kind of thing a derived map cannot express.
 */
export const SCENARIO_FROM_LABEL: Record<string, ScenarioKey> = Object.fromEntries(
  SCENARIO_KEYS.map(k => [SCENARIO_LABELS[k].toLowerCase(), k]),
)

/** Unused import guard: keeps the plan type import honest if this file grows. */
export type _PlanRef = SubscriptionPlan


/**
 * THE SIX QUESTIONS SOMEBODY IS ACTUALLY ASKING WHEN THEY OPEN THIS.
 *
 * Twenty cards in one unbroken list is not a list, it is a wall. The failure was concrete: the
 * recurring read sat at position eleven of twenty with no heading above it, and the person who built
 * this product could not find it. Nothing was wrong with the card.
 *
 * These groups are not categories of situation - they are the question a person already has in their
 * head. Somebody who has just lost a client is not looking for "urgent", they are looking for the
 * shelf marked "something is off".
 */
/**
 * HOW MANY THERE ARE, COUNTED RATHER THAN WRITTEN DOWN.
 *
 * The set-up wizard opened with "Twenty situations, grouped by the question you are actually
 * asking". There are twenty-two. Two were added - an agreement before it is signed, and one that is
 * running - and the sentence that counts them was not part of that change, because nothing tied
 * the number to the list.
 *
 * The stale comment beside the search count made the same mistake worse by explaining it: it said
 * twenty-one cards covered twenty situations because COHORT_ONBOARDING shared COHORT_CHECK's
 * situation. They are separate scenarios now, so the reconciliation it described no longer holds
 * and the wrong number had a justification attached to it.
 *
 * The entry chat has always rendered `SITUATION_CARDS.length`. This is the same idea for everything
 * that reads the catalogue, so the number cannot drift again.
 */
export const HOW_MANY_SITUATIONS = Object.keys(SCENARIO_LABELS).length

/**
 * AND HOW MANY ARE NAMED, which is a different number and the one a picker should quote.
 *
 * `OPEN_READ` is "describe your own situation". It is a card in the catalogue because it has to
 * behave like one - it carries a cadence and a timeline - but it is not a situation we named, and
 * it now sits at the top of the set-up wizard as the first pick rather than inside a group. A line
 * that says "22 situations, pick the closest fit" while one of the twenty-two is "none of these"
 * is counting the escape hatch as an option.
 *
 * NOT THE NUMBER THE PICKER PRINTS, and I had it wrong there for an hour. This counts LABELS; the
 * picker offers CARDS, and there are more cards than scenarios because COHORT_CHECK has two -
 * "Several people in the same role" and "Onboarding several people at once" are one scenario
 * offered as two situations. So this is 21 and the picker is 22, and the page counts its own cards.
 *
 * I had also written elsewhere that the COHORT sharing "no longer holds". It does: the regex I
 * checked with counted `scenario:` occurrences including OPEN_READ and reported 22 distinct where
 * there are 21.
 */
export const HOW_MANY_NAMED_SITUATIONS = Object.keys(SCENARIO_LABELS).filter(
  (k) => k !== 'OPEN_READ',
).length


export const SCENARIO_GROUPS = [
  /**
   * FIRST, NOT LAST. It sat at the bottom of six groups, which is where you put a last resort - and
   * the person who cannot name their situation is precisely the person who will not read to the
   * bottom of twenty cards to find out they did not have to. Putting it first costs the person who
   * DOES know their situation one line of scrolling, and saves the person who does not from the
   * whole wall. It is also the honest answer when the search finds nothing.
   */
  { key: 'open', heading: 'Not sure yet',
    question: 'You cannot name it, so nothing below should be guessed on your behalf.' },
  /**
   * WAS "SETTING THE TARGET", AND TWO OF ITS FIVE CARDS DO NOT SET ONE.
   *
   * A big decision is not a target and neither is a strategy the room has not converged on. What
   * the five have in common is getting people pointed the same way, which is what the group is
   * called now. The one that genuinely did not belong - a monthly read on an agreement already
   * running - moved to the reads, where it had always belonged.
   *
   * AND IT IS FIRST, WHICH IS WHY THE ORDER OF THIS ARRAY IS NOT COSMETIC. The dropdown is built
   * from it and opens on its first pickable group, so the order decides what somebody lands on. It
   * opened on "Beginning something well" while the list had been agreed the other way round.
   */
  { key: 'planning', heading: 'Getting people aligned',
    question: "You are deciding what the period is for, and you want each person's own answer before the team settles on one version." },
  { key: 'starting', heading: 'Beginning something well',
    question: 'Nothing has gone wrong. You want the expectations written down before they harden into assumptions.' },
  { key: 'reading', heading: 'Get a read',
    question: 'Work is already running and you want to know what is actually happening in it. These sit close together, so each card says when not to pick it.' },
  { key: 'person', heading: 'A decision about someone',
    question: 'Something is being decided about somebody, and both of you should be reading the same record when it is.' },
  { key: 'off', heading: 'Something is off',
    question: 'It has already happened. What separates these is whether the gap is against something agreed, between two people, or the result of one event.' },
] as const
/**
 * The groups somebody actually chooses between. "Not sure yet" held one card, the describe-your-own
 * one, and that card is now the first thing on the step - so the group is an empty heading and a
 * dropdown entry that leads back to what you have already been offered.
 */
export const GROUPS_YOU_PICK_FROM = SCENARIO_GROUPS.filter((g) => g.key !== 'open')

export type ScenarioGroupKey = (typeof SCENARIO_GROUPS)[number]['key']



/**
 * THE COACH CARD, WHICH IS A CHOICE RATHER THAN A LAST RESORT.
 *
 * It read "Not sure this is the right tool yet" over "None of the above is your situation, or you
 * would rather somebody walked you through it first" - which sells coaching to the confused. That
 * is the wrong audience and the wrong idea of the product. Her words:
 *
 *   "a coach is not about being unsure but people who want guided use and mentoring of their team
 *    towards the right choices even with groundwork doing this some want a human touch."
 *
 * So the person this is for is not lost. They are often the most deliberate person on the screen:
 * they know what they are dealing with, they intend to run it themselves, and they want somebody
 * experienced alongside while they do. Framing that as "not sure" tells exactly the wrong person
 * this is for them, and tells the right person it is not.
 *
 * WHAT DID NOT CHANGE, AND WHY. The price stays on the card and the sentence saying the software
 * works without it stays too. Reframing this as a positive choice makes it more tempting, not less,
 * and a card that becomes more attractive while going quiet about what it costs is a card that
 * sells something. Nothing is created, nobody is contacted, and it says so.
 *
 * It is NOT in SCENARIO_GROUPS above and NOT in SCENARIO_FACTS below, deliberately. Every guard in this
 * codebase asserts that a group contains situations and a situation has a scenario, a cadence and a
 * timeline. This has none of those, because nothing is created - and a card that is not a scenario must
 * not be able to pass a test that says it is one.
 */
export const COACH_CARD = {
  key: 'ASK_A_COACH',
  heading: 'Work with a coach alongside this',
  question: 'You want somebody experienced helping you steer your team through it, not just the software.',
  label: 'Ask to speak to a coach',
  moment: 'You know what you are dealing with. You want a person in it with you.',
  whatHappens: 'Nothing is created and nobody on your team is contacted. You tell us what you are dealing with, we email you back, and a coach picks it up from there.',
  /*
   * THE SAME NUMBERS THE PRICING PAGE SHOWS, and they were not. This card said $5,000 and $500
   * while the site said $7,500 and $700 - two prices for one thing, one of them inside the product
   * somebody is already paying for. A person who read the card and then the page has no way to know
   * which is real, and the one they will remember is the cheaper one.
   */
  cost: 'Coaching is $7,500 a year for twelve sessions, or $700 per month with no retainer. The software works without it, and most teams run it themselves.',
} as const


export type CadenceLabel = 'Daily' | 'Weekly' | 'Every 2 weeks' | 'Monthly' | 'One time'

/**
 * WHAT A CARD SHOWS BESIDE ITS NAME, AND WHAT SETUP IS SEEDED FROM.
 *
 * `cadence` and `timelineDays` MIRROR THE API, and that is a copy on purpose. The client cannot
 * import from `api/`, and both values have to be on screen before anything is created - the whole
 * point is that the lead sees the recommendation and can change it. So it is a copy with a guard
 * that fails when the two disagree, the same arrangement as the two pricing pages.
 *
 * WHY THE TIMELINE IS HERE AT ALL. `CreateGroundPage` hardcoded `timelineDays = 90` and always sent
 * it, so the API's per-scenario timeline was never reached on the path people actually use. A
 * 14-day shock got 90 days. A year-long advisory got 90 days.
 *
 * `notThisOneIf` exists for exactly three cards. The recurring read, the cohort read and the one-off
 * snapshot all answer "I want to know how things are going", and no tag can tell them apart.
 */
export interface ScenarioFacts {
  group: ScenarioGroupKey
  cadence: CadenceLabel
  timelineDays: number
  /**
   * TRUE FOR THE ONES THAT DO NOT END, and `timelineDays` is only a seed for those.
   *
   * A probation, a handover and a contract all finish, so "usually runs for 90 days" is the honest
   * thing to print on the card. A regular read on live work does not finish - you stop it when you
   * stop wanting it - and printing 30 days there answered a question nobody asked with a number that
   * read as a cap. Reported as exactly that: "I have a sales team and I want to monitor them for a
   * year, this should be the one, but it is not from the entry chat."
   */
  ongoing?: boolean
  notThisOneIf?: string
}

export const SCENARIO_FACTS: Record<ScenarioKey, ScenarioFacts> = {
  NEW_HIRE:         { group: 'starting', cadence: 'Every 2 weeks', timelineDays: 90 },
  ROLE_HANDOVER:    { group: 'starting', cadence: 'Weekly',        timelineDays: 30 },
  CONTRACT_REVIEW:  { group: 'starting', cadence: 'Every 2 weeks', timelineDays: 60,
                      notThisOneIf: 'It is already signed. Use "an agreement that is running" instead.' },
  NEW_PROJECT:      { group: 'starting', cadence: 'Every 2 weeks', timelineDays: 90 },
  NEW_ADVISOR:      { group: 'starting', cadence: 'Monthly',       timelineDays: 365 },
  NEW_COFOUNDER:    { group: 'starting', cadence: 'Every 2 weeks', timelineDays: 90 },
  NEW_MANAGER:      { group: 'starting', cadence: 'Every 2 weeks', timelineDays: 90 },

  OKR_ALIGNMENT:    { group: 'planning', cadence: 'Every 2 weeks', timelineDays: 90 },
  WORKPLAN_BUDGET:  { group: 'planning', cadence: 'Monthly',       timelineDays: 90 },
  BOARD_STRATEGY:   { group: 'planning', cadence: 'Monthly',       timelineDays: 90 },
  CRISIS_ALIGNMENT: { group: 'planning', cadence: 'Every 2 weeks', timelineDays: 60 },
  IMPLEMENTATION_TRACKING: { group: 'reading', cadence: 'Monthly',  timelineDays: 365,
                      notThisOneIf: 'Nothing is signed yet. Use "an agreement before it is signed" instead.' },

  /*
   * THE TWO THAT DO NOT END, AND THE CARD SAID THEY RAN FOR 30 DAYS.
   *
   * Her words: "I have a sales team and I want to monitor them for a year, this should be the one,
   * but it is not from the entry chat." She was reading the card, and the card told her thirty days.
   *
   * The 30 is a seed, not a limit - it fills the timeline field so somebody who says nothing gets a
   * sensible first period, and they set the real length two screens later. Every other situation has
   * a natural end (a probation, a handover, a contract) and for those a number is the honest answer.
   * These two run until you stop them, so printing a number was answering a question they do not
   * have, with a figure that then read as a cap.
   */
  /* A year. It offered four weekly sessions and then stopped, which is not a regular read on live
     work - see DEFAULT_TIMELINE_DAYS, which this has to agree with. */
  PULSE_CHECK:      { group: 'reading',  cadence: 'Monthly',       timelineDays: 365, ongoing: true,
                      notThisOneIf: 'Everyone does the same job in parallel. Use "several people in the same role" instead.' },
  COHORT_CHECK:     { group: 'reading',  cadence: 'Every 2 weeks', timelineDays: 30, ongoing: true,
                      notThisOneIf: 'They all started together. Use "onboarding several people at once" instead.' },
  /* One line, one link, one report. The lightest thing here: no target to set and nothing to agree,
     so the only decisions are who, what, and how often. */
  TEAM_UPDATES:     { group: 'reading',  cadence: 'Weekly',        timelineDays: 90, ongoing: true,
                      notThisOneIf: 'You need people held to something. Then pick that situation, so there is an aim to read the work against.' },
  /* Interrogate a group once, to turn what they know into a direction. One session by design: the
     direction comes from reading the accounts together, not from asking anybody a second time. */
  DISCOVERY:        { group: 'reading',  cadence: 'One time',      timelineDays: 1,
                      notThisOneIf: 'You want to know how the work is going. This asks a room what they know so you can decide where to go next, which is a different question.' },
  SNAPSHOT:         { group: 'reading',  cadence: 'One time',      timelineDays: 1,
                      notThisOneIf: 'There is a specific thing you need people held to. Then pick that situation, so there is something to measure against.' },

  RECOGNITION:      { group: 'person',   cadence: 'Every 2 weeks', timelineDays: 30 },
  CONTRACT_RENEWAL: { group: 'person',   cadence: 'Every 2 weeks', timelineDays: 60 },
  PIP:              { group: 'person',   cadence: 'Weekly',        timelineDays: 90 },

  DRIFT:            { group: 'off',      cadence: 'Weekly',        timelineDays: 90 },
  REALIGN_TEAM:     { group: 'off',      cadence: 'Every 2 weeks', timelineDays: 60 },
  ACUTE_SHOCK:      { group: 'off',      cadence: 'Daily',         timelineDays: 14 },

  OPEN_READ:        { group: 'open',     cadence: 'Every 2 weeks', timelineDays: 30 },
}

/**
 * WHETHER A SITUATION IS ONE OF THE THREE THE ENGINE REACHES A VERDICT ON: a performance plan
 * (`PIP`), a promotion or raise (`RECOGNITION`), or a renewal (`CONTRACT_RENEWAL`). Decision 17
 * names exactly these three, and the API's own `isEvaluationCheckIn` (`is-this-an-evaluation-check-
 * in.ts`) already tests this same equality against `BoardFamily.EVALUATION` - which is exactly the
 * `'person'` group here, no more and no less.
 *
 * A COPY, LIKE THE CADENCE ABOVE, because the client cannot import from `api/`. It stands in for a
 * field the engine does not send yet: the invitation ("The people in this check-in...") needs to
 * know, for its own scenario, whether admins can read it, and the server has no per-check-in flag
 * for that (engine request 78, still open). Once request 78 lands, the invitation should read the
 * server's own field instead of this guess, and this function can be retired for that path.
 */
export function isEvaluationScenario(scenario: string | null | undefined): boolean {
  if (!scenario) return false
  const facts = (SCENARIO_FACTS as Record<string, ScenarioFacts>)[scenario]
  return facts?.group === 'person'
}

/**
 * WHERE IN THE ARC A SITUATION USUALLY STARTS. MIRRORS THE ENGINE'S RECOMMENDED_MOMENT.
 *
 * Step one of setup has a second required choice - "where are you in this situation?" - and Continue
 * stayed disabled until it was answered, with no explanation of which of the two choices was missing.
 * Meanwhile the card the person had just clicked already answered it: "you hired a sales lead, they
 * start Monday" is at the start, and "the project is eight weeks late and everyone has a different
 * reason" is not.
 *
 * So this pre-selects it, and the person can still change it. A copy of the engine's map for the same
 * reason the cadence is a copy: the client cannot import from api/, and the value has to be on screen
 * before anything is created. The guard that fails when they disagree is
 * the-recommended-rhythm-agrees-with-the-engine.spec.ts.
 *
 * RECOGNITION IS THE MIDDLE, not the recognition scenario. Rows hold the value, so it stays and the
 * words a person reads say "mid-way".
 */
export type MomentValue = 'STARTING' | 'RECOGNITION' | 'RESOLUTION'

export const RECOMMENDED_MOMENT: Record<ScenarioKey, MomentValue> = {
  NEW_HIRE: 'STARTING',
  ROLE_HANDOVER: 'STARTING',
  CONTRACT_REVIEW: 'STARTING',
  IMPLEMENTATION_TRACKING: 'RECOGNITION',
  NEW_PROJECT: 'STARTING',
  NEW_COFOUNDER: 'STARTING',
  NEW_MANAGER: 'STARTING',
  NEW_ADVISOR: 'STARTING',
  OKR_ALIGNMENT: 'STARTING',
  WORKPLAN_BUDGET: 'STARTING',
  BOARD_STRATEGY: 'STARTING',
  CRISIS_ALIGNMENT: 'STARTING',
  PULSE_CHECK: 'STARTING',
  PIP: 'STARTING',
  ACUTE_SHOCK: 'STARTING',

  COHORT_CHECK: 'RECOGNITION',
  DRIFT: 'RECOGNITION',
  REALIGN_TEAM: 'RECOGNITION',
  OPEN_READ: 'RECOGNITION',
  TEAM_UPDATES: 'STARTING',
  DISCOVERY: 'STARTING',
  SNAPSHOT: 'RECOGNITION',
  RECOGNITION: 'RECOGNITION',

  CONTRACT_RENEWAL: 'RESOLUTION',
}

/** The cadence enum value behind each label, for seeding the dropdown at setup. */
export const CADENCE_VALUE: Record<CadenceLabel, string> = {
  'Daily': 'DAILY',
  'Weekly': 'WEEKLY',
  'Every 2 weeks': 'FORTNIGHTLY',
  'Monthly': 'MONTHLY',
  'One time': 'ONE_TIME',
}

/**
 * THE SITUATIONS THAT ARE SET UP ABOUT SOMEBODY BEFORE THEY BEGIN.
 *
 * A hire whose first day is next month, an advisor whose year has not opened, a manager taking over on
 * the first, a cohort all starting together. Opening the ground early is the point: agreeing what good
 * looks like before anybody can be judged against it is the whole reason those grounds exist.
 *
 * Only these five offer a start date, because only on these is "they have not started" a normal answer.
 * Asking it on a drift or a shock would be noise on a screen that already has enough on it.
 */
export const ASKS_WHEN_THEY_START: ScenarioKey[] = [
  'NEW_HIRE',
  'NEW_COFOUNDER',
  'NEW_ADVISOR',
  'NEW_MANAGER',
  'COHORT_CHECK',
]

/** How many check-ins a situation holds at its recommended rhythm. Always one for a one-off. */
export function recommendedSessions(key: ScenarioKey): number {
  const f = SCENARIO_FACTS[key]
  const step: Record<CadenceLabel, number | null> = {
    'Daily': 1, 'Weekly': 7, 'Every 2 weeks': 14, 'Monthly': 30, 'One time': null,
  }
  const d = step[f.cadence]
  if (d === null) return 1
  return Math.max(1, Math.floor(f.timelineDays / d))
}
