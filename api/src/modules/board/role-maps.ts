/**
 * Role maps: what good and going-wrong look like, per function.
 *
 * The map does TWO different jobs on two different surfaces:
 *
 *  1. IN THE CHAT (see buildRoleProbeBlock): it tunes what gets asked. A
 *     salesperson gets pushed on named buyers, a product lead on whether they
 *     have actually decided, an engineer on what someone else can now do -
 *     because those are the specific ways each function tends to go wrong. The
 *     probe is always a NEUTRAL question about the work; the failure mode is
 *     never named in the question. The mode falls out of the SHAPE of the
 *     answer.
 *
 *  2. ON THE BOARD (see buildContributionReads): it is the lens that reads each
 *     person against their own function's version of on-track, never all of
 *     them on one shared scale. Tech and sales do not share a unit.
 *
 * HARD RULES, carried from the design:
 *  - Detection runs on the person's OWN account only. Never surface another
 *    party's words to prompt them.
 *  - Success signals surface immediately (credit fast). Failure signals need a
 *    PATTERN over the three-period rule before they become a board read (flag
 *    slow) - which is patterns.service.ts's existing observe()/observePositive
 *    split, reused, not reimplemented.
 *  - The engine never renders a verdict about a person ("this person is
 *    avoidant"). It shows the record in the role's own terms, with the reason
 *    attached, and the human decides.
 *  - If the remit is undefined, do NOT assess. Gate first. You cannot measure
 *    someone against a bar that was never set.
 */

/** Functions with a tuned map. Deliberately a small starting library, not all nine. */
export enum RoleFunction {
  SALES = 'SALES',
  PRODUCT = 'PRODUCT',
  ENGINEERING = 'ENGINEERING',
  OPS = 'OPS',
  PROJECT_MANAGEMENT = 'PROJECT_MANAGEMENT',
  MANAGEMENT = 'MANAGEMENT',
  CEO = 'CEO',
  MARKETING = 'MARKETING',
  FINANCE = 'FINANCE',
  /**
   * THE TENTH, ADDED BECAUSE A LIVE RUN COULD NOT SEE THE MOST COMMON JUNIOR HIRE.
   *
   * A twelve-session ground about a new hire clearing a support queue and shadowing
   * client accounts scored ZERO on all nine functions. Detection was behaving
   * correctly - its signals were tightened after an entire software team came out as
   * SALES at 0.78 - so the gap was not a loose regex. There simply was no map for
   * the work.
   *
   * The consequence was silent and total: no role-tuned probes and no coaching, for
   * everybody doing support or customer-facing work, which is a very large number of
   * the people this product is for.
   */
  SUPPORT = 'SUPPORT',
}

/**
 * The role-agnostic floor. These apply to ANYONE in any role, so a person whose
 * job was never mapped still gets read fairly - the modes are the floor, not the
 * job buckets. An unmapped role derives its remit live and watches these.
 */
export enum UniversalMode {
  VAGUENESS = 'VAGUENESS',
  AVOIDANCE = 'AVOIDANCE',
  NON_COMMITMENT = 'NON_COMMITMENT',
  ILLEGIBILITY = 'ILLEGIBILITY',
  INVISIBILITY = 'INVISIBILITY',
  UNDER_PERSISTENCE = 'UNDER_PERSISTENCE',
  DIFFUSION = 'DIFFUSION',
}

export interface RoleMap {
  fn: RoleFunction;
  label: string;
  /** The one way ownership breaks here. */
  rootFailure: string;
  /** The one thing mastery looks like here. */
  rootSuccess: string;
  /** What "on track" means in THIS function's terms - the board's yardstick. */
  onTrackMeans: string;
  /** What going wrong looks like - never shown as a verdict, only as a lens. */
  goingWrongLooksLike: string;
  /**
   * The neutral probes the chat asks. Each is a normal question about the work.
   * None of them name a failure mode. The answer's shape is the signal.
   */
  neutralProbes: string[];
  /**
   * How this function's people get unfairly read, and what the engine must
   * therefore protect. This is the fairness half of the map, and it is why the
   * map is not just a stick.
   */
  protectAgainst: string;
  /** Universal modes this function most often expresses. */
  commonModes: UniversalMode[];
  /**
   * The observable behaviours the coach NOTICES, in this function's own terms.
   *
   * Deliberately concrete. "Avoids the hard conversation" is a behaviour a
   * person can recognise in their own week and do something about; "avoidant" is
   * a label stapled to a person and is the thing this product refuses to
   * produce. The difference between the two is the entire design.
   *
   * Paired by index: failureSignals[n] is the thing going wrong and
   * successSignals[n] is what it looks like when it goes right. That pairing is
   * what makes a staircase possible - the coach always knows what it is coaching
   * TOWARD, not just what it noticed.
   *
   * Optional while the maps are being filled in. A map without them still works:
   * it reads against onTrackMeans and asks its neutral probes, exactly as today.
   */
  failureSignals?: string[];
  successSignals?: string[];
}

export const ROLE_MAPS: Record<RoleFunction, RoleMap> = {
  [RoleFunction.SALES]: {
    fn: RoleFunction.SALES,
    label: 'Sales and expansion',
    rootFailure: 'Avoidance. Fear of exposure and rejection, dressed as productivity.',
    rootSuccess: 'Deliberate exposure. The scary right thing, in reps, on the right targets.',
    onTrackMeans: 'Named buyers with budget and authority, real pipeline moving, dated next actions.',
    goingWrongLooksLike: 'Plenty of activity and warm conversations, no named buyer who can actually decide.',
    neutralProbes: [
      'Which of those conversations was with someone who can actually buy, budget and authority?',
      'Which ones specifically, by name?',
      'It went quiet, then what did you try?',
      'What is the next action on that, and by when?',
    ],
    protectAgainst:
      'A rep is made to feel like a failure by a broken internal clock: the buyer-side process takes weeks and none of it is visible to them. Silence is usually a stage, not a rejection.',
    commonModes: [UniversalMode.AVOIDANCE, UniversalMode.UNDER_PERSISTENCE, UniversalMode.VAGUENESS],
    // Paired by index, so the coach always knows what it is coaching TOWARD.
    // Sales is where the coaching is most valuable and most dangerous, because
    // the failure is nearly always fear and fear is not a character flaw. Every
    // line here is a thing somebody did last week, not a thing they are.
    failureSignals: [
      'Works the friendly contact rather than the person who can sign',
      'Counts conversations as pipeline',
      'Lets a deal go quiet and calls it a maybe',
      'Spends the week on admin, CRM tidying and internal decks',
      'Chases many small easy targets instead of the few that matter',
      'Describes next steps with no date and no owner',
      'Discounts early to keep a deal warm',
      'Blames the market, the product or marketing for a flat month',
      'Avoids the deal that has gone wrong rather than reopening it',
      'Reports the pipeline as healthier than it is',
    ],
    successSignals: [
      'Gets to the person with budget and authority, even when it is awkward',
      'Counts a deal as real only when somebody who can decide has said what happens next',
      'Follows up after silence, more than once, without apologising for existing',
      'Spends the week in front of buyers, and does the admin around it',
      'Picks the accounts worth the effort and stays on them',
      'Leaves every conversation with a dated next action somebody agreed to',
      'Holds the price and finds out what is actually blocking the decision',
      'Names what they would do differently, then does it',
      'Goes back to the lost deal and asks what really happened',
      'Says plainly which deals are not going to happen',
    ],
  },

  [RoleFunction.PRODUCT]: {
    fn: RoleFunction.PRODUCT,
    label: 'Product',
    rootFailure: 'Non-commitment. Judgment lags, so ownership dissolves into perpetual input.',
    rootSuccess: 'Owned decisions. Makes the call and owns the reasoning, so a wrong bet is examinable.',
    onTrackMeans: 'Decisions actually made and owned, with the reasoning, specific enough to be falsifiable.',
    goingWrongLooksLike: 'Endlessly gathering feedback, direction stated so vaguely nobody can own or disprove it.',
    neutralProbes: [
      'What is the call, and what is the reasoning behind it?',
      'Have you decided, or is this still gathering?',
      'Who owns that decision?',
      'What would you need to actually decide?',
    ],
    protectAgainst:
      'Product runs on slow feedback. Punishing it with a fast metric reads a normal feedback lag as failure.',
    commonModes: [UniversalMode.NON_COMMITMENT, UniversalMode.VAGUENESS],
    // Paired by index, so the coach always knows what it is coaching TOWARD.
    // Product fails quietly, because a decision not made looks like
    // diligence and shipping nothing looks like care.
    failureSignals: [
      'Gathers more input rather than making the call',
      'Ships a spec, not a working thing anybody uses',
      'Keeps everything on the roadmap so nothing is cut',
      'Takes requirements from whoever asked loudest',
      'Reports progress as work in flight rather than as a change a user would notice',
      'Leaves the trade-off unstated so nobody objects',
      'Hands engineering an unresolved question and calls it a brief',
      'Never revisits a shipped thing to see whether it worked',
    ],
    successSignals: [
      'Makes the call with what is known and says what would change it',
      'Gets something real in front of a user and watches what happens',
      'Cuts the things that will not happen and says so out loud',
      'Traces the requirement to somebody the product is actually for',
      'Reports what a user can now do that they could not before',
      'Names the trade-off and who it costs',
      'Resolves the question, or says plainly that it is open and why',
      'Goes back and checks whether it did the thing it was for',
    ],
  },

  [RoleFunction.ENGINEERING]: {
    fn: RoleFunction.ENGINEERING,
    label: 'Engineering',
    rootFailure: 'Illegibility. Real work invisible to non-engineers, so ownership hides.',
    rootSuccess: 'Legible delivery. Ships outcomes and makes them visible in others’ terms.',
    onTrackMeans: 'Shipped and stable, described so a non-engineer can see what changed, blocked stated distinctly from behind.',
    goingWrongLooksLike: 'Committed to "working on" rather than delivering; real foundational work nobody can read.',
    neutralProbes: [
      'What can someone else do now that they could not before?',
      'What shipped that a non-engineer would notice?',
      'Is that blocked, or behind? If blocked, on whom?',
      'What is the shippable thing, and by when?',
    ],
    protectAgainst:
      'The invisible load-bearer and the blocked-not-slacking person both look like low contribution on a naive read. Foundational work must be surfaced and credited, and blocked must never read as behind.',
    commonModes: [UniversalMode.ILLEGIBILITY, UniversalMode.INVISIBILITY],
    // Paired by index, so the coach always knows what it is coaching TOWARD.
    // Engineering's coaching risk is the opposite of sales: the work is
    // legible, so it is easy to notice the wrong things. None of these is about
    // how fast anybody is.
    failureSignals: [
      'Reports work as done when nobody else can use it',
      'Rebuilds rather than asks the person who knows',
      'Sits on a blocker rather than raising it',
      'Polishes the part that is interesting and leaves the part that is needed',
      'Estimates to please rather than to inform',
      'Leaves the thing they know is fragile unmentioned',
      'Works alone on something several people depend on',
      'Treats a review comment as an attack, or skips review',
    ],
    successSignals: [
      'Calls it done when somebody else has used it',
      'Asks early, and goes back to building',
      'Raises the blocker the day it blocks, without treating it as a confession',
      'Finishes the needed part first, then improves it',
      'Gives the real estimate and says what it depends on',
      'Names the fragile part before it breaks, in writing',
      'Brings the dependents in early enough to change it',
      'Uses review to find the thing they missed',
    ],
  },

  [RoleFunction.OPS]: {
    fn: RoleFunction.OPS,
    label: 'Operations and people',
    rootFailure: 'Invisibility. Seen only in failure, and "no drama" rewards avoidance.',
    rootSuccess: 'Held and visible. Handoffs hold, hard conversations happen on time, the good is surfaced.',
    onTrackMeans: 'Handoffs held and owned, the hard conversation had on time, preventive work visible.',
    goingWrongLooksLike: '"No issues" that turns out to be suppression; handoffs dropped and owned by nobody.',
    neutralProbes: [
      'What held or ran this period that nobody would have noticed?',
      'What did you prevent?',
      'Which conversation is still waiting to be had?',
      'Who owns that handoff?',
    ],
    protectAgainst:
      'Ops is noticed only when something breaks, so a good period looks like an empty account. Preventive work has to be actively credited or the role reads as low contribution for doing its job well.',
    commonModes: [UniversalMode.INVISIBILITY, UniversalMode.AVOIDANCE],
    // Paired by index, so the coach always knows what it is coaching TOWARD.
    // Operations is the function most often invisible when it works, which is
    // why the success half matters more here than anywhere.
    failureSignals: [
      'Firefights the same failure repeatedly without fixing the cause',
      'Holds the process in their own head',
      'Absorbs everybody else\'s slack silently',
      'Reports that things ran, not what nearly did not',
      'Adds a check rather than removing the thing that fails',
      'Becomes the only person who can do it',
      'Chases people for updates instead of changing where the update lives',
      'Says yes to every request and lets the queue decide',
    ],
    successSignals: [
      'Fixes the cause once, and says what will now not happen again',
      'Writes it down so somebody else can run it',
      'Says what they absorbed and what it cost',
      'Names the near miss while it is still cheap',
      'Removes the failing step where it can be removed',
      'Trains a second person on purpose',
      'Makes the state visible so nobody has to be chased',
      'Says what will not happen this period, and to whom',
    ],
  },

  [RoleFunction.PROJECT_MANAGEMENT]: {
    fn: RoleFunction.PROJECT_MANAGEMENT,
    label: 'Project management',
    rootFailure: 'Coordination without ownership. Owns the status report, not the outcome.',
    rootSuccess: 'Drives the outcome through others. Clears blockers, holds the critical path.',
    onTrackMeans: 'Blockers driven to cleared, handoffs owned, real risks managed, bad news escalated early.',
    goingWrongLooksLike: 'Reports that something is blocked without driving it; everything green, then a deadline surprise.',
    neutralProbes: [
      'What are you doing to clear that, and who owns the unblock?',
      'What is the real risk to delivery here, not the task list?',
      'What is not on track that has not been said out loud yet?',
    ],
    protectAgainst:
      'A PM with no real authority can be blamed for slippage they could not prevent. Read what they drove, not only what slipped.',
    commonModes: [UniversalMode.DIFFUSION, UniversalMode.UNDER_PERSISTENCE],
    // Paired by index, so the coach always knows what it is coaching TOWARD.
    // Project management fails by reporting rather than by moving. The
    // signal is nearly always the gap between the status and the state.
    failureSignals: [
      'Reports status rather than moving the blocked thing',
      'Keeps the plan green by moving the dates',
      'Chases updates from everyone and decides nothing',
      'Escalates without a recommendation',
      'Tracks tasks nobody is actually blocked on',
      'Lets a dependency on another team sit unnamed',
      'Holds the meeting because it is in the calendar',
      'Owns the plan and nothing in it',
    ],
    successSignals: [
      'Goes and unblocks the blocked thing, then reports it',
      'Says the date has moved and what it means for everything after it',
      'Makes the small decisions so the work does not wait on a meeting',
      'Escalates with a recommendation and what they need decided',
      'Tracks the few things everything else waits on',
      'Names the other team, the person, and the date',
      'Cancels the meeting when there is nothing it can decide',
      'Owns an outcome, not a document',
    ],
  },

  [RoleFunction.CEO]: {
    fn: RoleFunction.CEO,
    label: 'Founder or CEO',
    rootFailure: 'Diffusion. Owning wins, distributing losses, and carrying everything so nobody else owns anything.',
    rootSuccess: 'Concentrated ownership of the whole, distributed ownership of the parts.',
    onTrackMeans: 'Doing the work only they can do, the hard strategy calls made and owned, leadership authoring their own commitments.',
    goingWrongLooksLike: 'Busy in the weeds on comfortable work; strategy perpetually "exploring"; misses framed as the team\'s.',
    neutralProbes: [
      'What did you do this period that only you could have done?',
      'Did they author that, or did you hand it to them?',
      'That call has been open a while - what is the decision, and when?',
      'Whose was that miss?',
    ],
    protectAgainst:
      'A founder is carrying genuine ambiguity nobody else can resolve. Reading "unresolved" as avoidance misses that some calls honestly cannot be made yet.',
    commonModes: [UniversalMode.DIFFUSION, UniversalMode.AVOIDANCE, UniversalMode.NON_COMMITMENT],
    // Paired by index, so the coach always knows what it is coaching TOWARD.
    // The chief executive is the hardest to coach and the easiest to flatter, so
    // these are deliberately the things nobody else in the company will say.
    failureSignals: [
      'Works on the part of the business they enjoy',
      'Keeps every decision, so everything waits',
      'Talks to the friendly customers and investors',
      'Reorganises around a people problem rather than resolving it',
      'Announces a direction and does not repeat it',
      'Reports the story rather than the numbers',
      'Hires slowly for the gap they personally fill',
      'Protects a long-serving person past the point it is fair to everyone else',
    ],
    successSignals: [
      'Works on the part the business most needs, including the dull part',
      'Gives real decisions away and lives with how they are made',
      'Talks to the ones who said no, and listens',
      'Has the conversation, and makes the call',
      'Says the same direction until people can say it back',
      'Says the number, then the story',
      'Hires for their own weakest area first',
      'Acts on it, and says why, kindly',
    ],
  },

  [RoleFunction.MARKETING]: {
    fn: RoleFunction.MARKETING,
    label: 'Marketing and growth',
    rootFailure: 'Vanity. Optimising the measurable and flattering over what moves revenue or mission.',
    rootSuccess: 'Outcome-tied growth. Every activity owns a line to pipeline, conversion, or mission.',
    onTrackMeans: 'Activity tied to a named outcome, channel bets made and learned from, dead channels killed.',
    goingWrongLooksLike: 'Reach and impressions reported with no revenue line; busy producing with no owned number.',
    neutralProbes: [
      'What did that turn into - pipeline, conversion, sign-ups?',
      'Which number do you own here?',
      'Which channel is not working, and what happens to it?',
      'Who is the audience that actually buys, and are you reaching them?',
    ],
    protectAgainst:
      'Brand and positioning work pays off slowly and indirectly. Demanding an immediate revenue line for every activity punishes the work that compounds.',
    commonModes: [UniversalMode.ILLEGIBILITY, UniversalMode.NON_COMMITMENT],
    // Paired by index, so the coach always knows what it is coaching TOWARD.
    // Marketing is measured on the easiest numbers to move, so the failure is
    // usually a real result nobody can trace to a real person.
    failureSignals: [
      'Reports reach rather than anybody who came closer to buying',
      'Produces more content rather than finding out what worked',
      'Rewrites the message without talking to a customer',
      'Runs the campaign the team enjoys planning',
      'Hands sales leads nobody has qualified',
      'Keeps a channel because it is set up',
      'Claims a result the numbers do not support',
      'Waits for the brand to be finished before going out',
    ],
    successSignals: [
      'Reports the people who came closer, by name where possible',
      'Finds out what worked and does that again',
      'Takes the words from a customer and uses theirs',
      'Runs the one the buyers respond to',
      'Hands over leads with what is known about them and why they might buy',
      'Stops the channel that is not working and says so',
      'Says what the numbers do and do not show',
      'Goes out with what exists and improves it in public',
    ],
  },

  [RoleFunction.FINANCE]: {
    fn: RoleFunction.FINANCE,
    label: 'Finance',
    rootFailure: 'False precision, or avoiding the hard truth. Hiding behind process and numbers rather than surfacing what owners must act on.',
    rootSuccess: 'Honest stewardship. Surfaces the hard truth plainly and owns the call it should drive.',
    onTrackMeans: 'The implication of the number owned, uncomfortable truths surfaced early, decisions the numbers do not support challenged.',
    goingWrongLooksLike: 'Reports figures without the implication; over-models to avoid an owned call; lets a known problem sit.',
    neutralProbes: [
      'What decision should that number drive?',
      'What is the uncomfortable version of this?',
      'Is there anything in here that does not support a decision already made?',
      'What is the call you would make on this, at your best guess?',
    ],
    protectAgainst:
      'Finance is often the messenger for bad news it did not cause. Reading the delivery of a hard truth as negativity punishes exactly the behaviour the role exists for.',
    commonModes: [UniversalMode.AVOIDANCE, UniversalMode.NON_COMMITMENT],
    // Paired by index, so the coach always knows what it is coaching TOWARD.
    // Finance goes wrong by being accurate and late, or accurate and unread.
    // None of these is about arithmetic.
    failureSignals: [
      'Reports the numbers after the decision was made',
      'Tracks the burn without saying what it means',
      'Sends a report nobody reads',
      'Says no without an alternative',
      'Waits for a request rather than raising the risk',
      'Keeps the model where only they can use it',
      'Chases a small variance and misses a large exposure',
      'Softens bad news until it is unactionable',
    ],
    successSignals: [
      'Gets the number in front of the decision, even if it is rough',
      'Says how long the money lasts, in weeks, plainly',
      'Says the one thing in it somebody has to act on',
      'Says what could be afforded instead',
      'Raises the risk before anybody asks',
      'Makes it something the team can ask questions of',
      'Works on the exposure that could actually hurt',
      'Delivers bad news early and clearly, with the options',
    ],
  },

  [RoleFunction.MANAGEMENT]: {
    fn: RoleFunction.MANAGEMENT,
    label: 'Management',
    rootFailure:
      'Failure to create ownership in others. Two poles, same root: abdication (nobody held) or control (nobody allowed to own).',
    rootSuccess: 'Multiplies ownership. Gets others to author and own outcomes, holds them with care.',
    onTrackMeans: 'People author their own commitments, slips get noticed and raised, hard conversations happen on time.',
    goingWrongLooksLike:
      'An account full of work the team should own (control), or commitments that slip with no follow-up (abdication).',
    neutralProbes: [
      'Which of these should someone else own, and what would it take to hand it over?',
      'Did they author that, or did you hand it to them?',
      'Last period they committed to something - did that happen?',
      'Which conversation have you been putting off?',
    ],
    protectAgainst:
      'Management is a different competency from the craft. A strong individual contributor made lead is failing at a NEW skill, not regressing at their old one.',
    commonModes: [UniversalMode.DIFFUSION, UniversalMode.AVOIDANCE],
    // Paired by index: failure[n] is the thing going wrong, success[n] is what
    // it looks like when it goes right, so the coach always knows what it is
    // coaching TOWARD. Management is filled first because it is the highest
    // value coaching in the system and the only map that is lead-only.
    failureSignals: [
      'Does the work themselves instead of delegating it',
      "Redoes the team's work, lets nobody truly own anything",
      'Assigns tasks rather than getting people to author their own commitments',
      'Lets commitments slip quietly, never closes the loop',
      'Defers the hard conversation, the feedback, the performance call',
      'Gives vague direction, then is frustrated when it is not met',
      'Never develops anyone, so the team stays dependent and the manager stays the bottleneck',
      'Takes the credit, or lets it go to the loudest rather than the real contributor',
      'Manages everyone identically, ignoring what each person needs',
      'Avoids conflict on the team and lets tension sit',
      'Rewards visible busyness over real contribution',
      'Hoards decisions, so the team waits on them for everything',
      'Protects a poor performer by never confronting them, and loads the good ones instead',
      'Tries once on a people problem, then tolerates it or reorganises around it',
    ],
    successSignals: [
      'Hands over real ownership, not just tasks, and then lets go',
      'Lets people do it their own way without redoing it',
      'Gets each person to author their own commitments, in their own words',
      'Notices a slip and asks about it, with care',
      'Has the hard conversation on time, kindly and clearly',
      'Gives direction specific enough that somebody can own it and meet it',
      'Develops people toward independence and removes themselves as the bottleneck',
      'Credits the real contributor, including the quiet one',
      'Manages each person to what that person actually needs',
      'Surfaces team tension and works it before it festers',
      'Can tell real contribution from busyness, and rewards the first',
      'Pushes decisions down so the team moves without waiting',
      'Confronts the poor performer and protects the people carrying the load',
      'Stays with a people problem until it is genuinely resolved',
    ],
  },

  /**
   * SUPPORT AND CUSTOMER-FACING WORK.
   *
   * The function whose failure mode is the opposite of sales: not avoidance but
   * absorption. A good support person makes problems disappear, and the better they
   * are at it the less anybody can see - which is why the SUCCESS half of the signals
   * here matters more than in any other map, and why protectAgainst is about being
   * read as low-value rather than being read as failing.
   */
  [RoleFunction.SUPPORT]: {
    fn: RoleFunction.SUPPORT,
    label: 'Support and customer-facing work',
    rootFailure:
      'Absorption without a trace. Everything gets handled, nothing gets fixed at the cause, and the person becomes the fix.',
    rootSuccess:
      'Handles what is in front of them and makes the next one unnecessary. The queue gets shorter because the causes do.',
    onTrackMeans:
      'Named customers unblocked, the repeated problem traced to a cause somebody else can fix, and what was learned written where the team can find it.',
    goingWrongLooksLike:
      'A very full week, a queue the same length as last week, and nothing anybody else could pick up.',
    neutralProbes: [
      'Which of those came back a second time, and what was the underlying thing?',
      'Who else could have handled that one, and what would they have needed?',
      'What did you learn this week that is not written down anywhere?',
      'Which customer is still waiting, and on what?',
    ],
    protectAgainst:
      'Support work is invisible when it goes well: the reward for solving something cleanly is that nobody hears about it. So this person is routinely read as low-value by people counting outputs, and their real contribution - the escalations that never happened - leaves no record unless somebody asks for it.',
    /**
     * INVISIBILITY, not a mode called absorption - there is no such mode, and
     * reaching for one I had imagined was worth catching: the seven universal modes
     * are fixed, and support's failure expresses itself as work nobody can see
     * (INVISIBILITY) and work that belongs to nobody (DIFFUSION).
     */
    commonModes: [UniversalMode.INVISIBILITY, UniversalMode.DIFFUSION],
    // Paired by index, so the coach always knows what it is coaching TOWARD.
    // Written to absorption rather than avoidance: nearly every line here is
    // somebody doing too much of the right thing in the wrong place.
    failureSignals: [
      'Fixes the same kind of problem repeatedly without naming the cause',
      'Handles a ticket that belonged to somebody else rather than routing it',
      'Keeps the workaround in their head instead of writing it down',
      'Absorbs an angry customer and tells nobody it happened',
      'Lets a customer wait while working on something easier to finish',
      'Escalates with the customer\'s words and no read of what is actually wrong',
      'Closes a ticket the customer has not agreed is resolved',
      'Works through the queue in the order it arrived rather than by what is at stake',
      'Never asks the team that caused the problem to fix it',
      'Says the week was fine when it was survived',
    ],
    successSignals: [
      'Traces the repeat to a cause and hands it to whoever can remove it',
      'Routes what is not theirs, with enough context that it does not bounce back',
      'Writes the workaround down where the next person will find it',
      'Says a customer was angry, and what it was about, without dressing it up',
      'Tells the customer who is waiting where they stand, before they ask',
      'Escalates with a read: what is broken, who is affected, what they tried',
      'Closes it when the customer says it is done',
      'Takes the one that costs the most first, and says why the others waited',
      'Goes back to the team that caused it and asks for the fix',
      'Says plainly when a week was survived rather than worked',
    ],
  },
};

/**
 * Universal probes for a role with no tuned map. The engine derives the remit
 * from the person's own account, infers what owning it well looks like, and
 * watches these - while being honest that its confidence is lower than on a
 * tuned map (tentative wording on unmapped roles, confident on mapped ones).
 */
export const UNIVERSAL_PROBES: Record<UniversalMode, string> = {
  [UniversalMode.VAGUENESS]: 'Which ones specifically? By when, exactly?',
  [UniversalMode.AVOIDANCE]: 'Which of those actually moves the outcome?',
  [UniversalMode.NON_COMMITMENT]: 'What is the call, and has it been made?',
  [UniversalMode.ILLEGIBILITY]: 'What can someone else do now that they could not before?',
  [UniversalMode.INVISIBILITY]: 'What worked this period that nobody noticed? What did you prevent?',
  [UniversalMode.UNDER_PERSISTENCE]: 'It went quiet, then what? What did you try when that stalled?',
  [UniversalMode.DIFFUSION]: 'Whose was that? What did you do that someone else should own?',
};

/** Confidence below this must not be coached from - hold the profile open instead. */
export const MIN_COACHING_CONFIDENCE = 0.5;

export function roleMapFor(fn: string | null | undefined): RoleMap | null {
  if (!fn) return null;
  return ROLE_MAPS[fn as RoleFunction] ?? null;
}

/**
 * Maps a stated role/remit to the closest function as a STARTING PRIOR only.
 * Detection is continuous: the engine revises this from what the person's work
 * is actually made of over sessions, and a title is weak evidence. Someone
 * titled "product manager" whose account is all coordination and unblocking
 * reads as functionally PROJECT_MANAGEMENT, and the revision is what catches it.
 *
 * Returns a low confidence deliberately: a title alone should never be enough
 * to coach from.
 */
export function priorFunctionFromRole(
  roleText: string | null | undefined,
): { fn: RoleFunction; confidence: number } | null {
  if (!roleText?.trim()) return null;
  const t = roleText.toLowerCase();

  // ORDER MATTERS. Specific compound titles are matched BEFORE the generic
  // manager/lead pattern, or "project manager" and "product manager" both get
  // swallowed by \bmanager\b and read as people-management, which is wrong for
  // both of them.
  if (/\b(project manager|programme manager|program manager|pmo|delivery manager|delivery lead|scrum master)\b/.test(t)) {
    return { fn: RoleFunction.PROJECT_MANAGEMENT, confidence: 0.4 };
  }
  if (/\b(product manager|product owner|product lead|head of product|product)\b/.test(t)) {
    return { fn: RoleFunction.PRODUCT, confidence: 0.4 };
  }
  /**
   * SUPPORT TITLES GO FIRST, and a probe is why rather than a theory.
   *
   * With this branch after the engineer one, "Support engineer, new hire" matched
   * \bengineer\b and resolved to ENGINEERING - so on the very record that prompted
   * this map, the stated role DISAGREED with the account and knocked 0.1 off the
   * confidence. The title was right, the account was right, and the ordering made
   * them argue.
   *
   * Same trap the file already warns about for "project manager" and "product
   * manager". Support titles are nearly all compounds that another branch claims:
   * support engineer, customer success manager, service desk analyst, technical
   * support lead, account manager.
   */
  if (/\b(support|customer success|customer service|service desk|help ?desk|technical support|csm|customer experience|account manager)\b/.test(t)) {
    return { fn: RoleFunction.SUPPORT, confidence: 0.4 };
  }
  if (/\b(engineer|engineering|developer|dev|technical lead|tech lead|cto|architect)\b/.test(t)) {
    return { fn: RoleFunction.ENGINEERING, confidence: 0.4 };
  }
  if (/\b(sales|account exec|account executive|business development|revenue|growth|partnerships)\b/.test(t)) {
    return { fn: RoleFunction.SALES, confidence: 0.4 };
  }
  if (/\b(marketing|brand|content|comms|communications|demand gen)\b/.test(t)) {
    return { fn: RoleFunction.MARKETING, confidence: 0.4 };
  }
  if (/\b(finance|financial|cfo|accountant|accounting|controller|treasury)\b/.test(t)) {
    return { fn: RoleFunction.FINANCE, confidence: 0.4 };
  }
  // CEO/founder before the generic leadership pattern: a founder leads people
  // too, but the founder map is the more useful primary lens for them.
  if (/\b(ceo|founder|co-?founder|managing director|md)\b/.test(t)) {
    return { fn: RoleFunction.CEO, confidence: 0.4 };
  }
  if (/\b(ops|operations|people|hr|human resources|chief of staff)\b/.test(t)) {
    return { fn: RoleFunction.OPS, confidence: 0.4 };
  }
  // Generic people-leadership LAST. Management sits on top of a functional map
  // rather than replacing it, so this is the fallback when the title says
  // "leads people" without naming the craft.
  if (/\b(head of|vp|chief|director|manager|people lead|team lead|line manager)\b/.test(t)) {
    return { fn: RoleFunction.MANAGEMENT, confidence: 0.35 };
  }
  return null;
}

/**
 * The chat-side block: the probes for this person's function, injected into the
 * scenario pack. Goes into buildScenarioPackForParty, NOT into ENGINE_RULES -
 * the `system` prompt is invariant-checked and reseeded on boot, and a bad edit
 * there hard-fails Nest startup.
 *
 * Returns '' when there is no map or confidence is too low, so an uncertain
 * profile simply adds nothing rather than coaching from a guess.
 */
export function buildRoleProbeBlock(
  fn: string | null | undefined,
  confidence: number | null | undefined,
): string {
  const map = roleMapFor(fn);
  if (!map) return '';
  const confident = (confidence ?? 0) >= MIN_COACHING_CONFIDENCE;

  const probes = map.neutralProbes.map((p) => `- ${p}`).join('\n');
  const hedge = confident
    ? ''
    : '\nThis read of their function is PROVISIONAL. Ask these as ordinary questions about the work, and do not lean on them or imply a conclusion about how they are working.';

  return `READING THIS PERSON'S WORK IN ITS OWN TERMS (${map.label})

For this function, on track means: ${map.onTrackMeans}
Where it usually goes wrong: ${map.goingWrongLooksLike}

Ask the natural next question from this list when it genuinely fits what they just told you. These are ordinary questions about the work, not a checklist to run:
${probes}

NEVER name a failure mode in a question. Do not ask "are you avoiding this" or "are you being vague". Ask about the work; how they answer is the signal, and it is yours to read, not theirs to be told.

Be fair to this function specifically: ${map.protectAgainst}${hedge}`;
}

/**
 * A NOTICED BEHAVIOUR, WITH WHAT IT WOULD LOOK LIKE GOING RIGHT, AND WHY IT WAS
 * NOTICED AT ALL.
 *
 * The reason is not decoration and it is not optional. A read shown without it
 * is an accusation: "avoids the hard conversation" lands as a character
 * judgement. The same read with its reason attached is a description of a record
 * that a person can look at and disagree with:
 *
 *   "Hard conversations have come up in three check-ins and none has happened
 *    yet, and nothing in your account says you were blocked."
 *
 * That difference is also what protects the person who is blocked rather than
 * avoiding. Any read that cannot state its reason has not earned the right to
 * be shown, so this returns null rather than guessing.
 *
 * Paired by index with the success signal, so the coach always knows what it is
 * coaching TOWARD, rather than only what it noticed.
 */
export interface SignalRead {
  /** What was noticed, in the function's own terms. Never a label. */
  noticed: string;
  /** What the same thing looks like when it goes right. The destination. */
  lookingLike: string;
  /** Why this was noticed. Always shown with it, never separable. */
  reason: string;
}

export function signalRead(
  fn: string | null | undefined,
  index: number,
  reason: string,
): SignalRead | null {
  const map = roleMapFor(fn);
  if (!map?.failureSignals?.length || !map.successSignals?.length) return null;
  if (index < 0 || index >= map.failureSignals.length) return null;

  // A read with no reason is an accusation. Refuse rather than surface one.
  if (!reason?.trim()) return null;

  return {
    noticed: map.failureSignals[index],
    lookingLike: map.successSignals[index],
    reason: reason.trim(),
  };
}
