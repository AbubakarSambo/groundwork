/**
 * A CHECK-IN WITH NO AIM HAS NOTHING TO READ AGAINST - AND PUTTING THE AIM IN THE GATE MADE IT WORSE.
 *
 * READ THIS BEFORE REACHING FOR IT AGAIN. The reasoning below is still right and the change was
 * still wrong, measured three times on 18 September 2026 against the same 22 lazy-lead setups:
 *
 *   before        an aim 3/22   why-now 10/22   finished 14/22
 *   aim in gate   an aim 0/22   why-now  6/22
 *   tightened     an aim 0/22   why-now  0/22
 *   and routed    an aim 0/22   why-now  2/22   finished  6/22
 *
 * WHAT ACTUALLY WENT WRONG, and it is not the gate. `ready` is read by the screen, not the model, so
 * the gate alone cannot change a conversation. What changed the conversation was everything added
 * ALONGSIDE it - a paragraph telling setup the aim was the one thing it could not skip, and a field
 * added to the extraction schema. The paragraph made the interview monomaniacal. The field crowded
 * a 256-token extraction call, and the two fields described next to it, why-now and the aim itself,
 * are exactly the two that collapsed.
 *
 * SO THE LESSON IS THE ONE THE WHOLE DAY KEEPS TEACHING: adding to a prompt subtracts somewhere
 * else, and you do not get to choose where. It is true of the conversation prompt and it is true of
 * the little extraction prompt nobody thinks of as a prompt.
 *
 * WHAT IS KEPT. This file, unwired, because the reasoning is sound and the next attempt should start
 * from it rather than rediscover it. When the aim is chased again it has to be chased WITHOUT adding
 * weight: by taking something out of the extraction call to make room, or by asking for the aim on
 * the screen where a field costs no tokens at all.
 *
 * ---
 *
 * A CHECK-IN WITH NO AIM HAS NOTHING TO READ AGAINST.
 *
 * Setup finished when three fields were present: what kind of thing this is, what it is about, and
 * why now. None of those is a target. So a lead who did not volunteer one was never asked for one,
 * setup said it was done, and every session afterwards had nothing to measure work against.
 *
 * MEASURED, 18 September 2026. All 22 situations were set up by a lead whose every answer was true
 * and thin - "the team", "next quarter", "not sure yet", "can you just set it up". Across the 22,
 * setup captured what the situation was about 20 times and captured AN AIM THREE TIMES. A cadence
 * once. Most of them finished anyway. Every one of the twenty-five conversations rated that day lost
 * its points in the same column, and no wording moved it, because the gate never asked.
 *
 * SO THE AIM JOINS THE GATE. Not as a fourth hoop for its own sake: it is the thing the product
 * exists to read work against, and it is the only field with no sensible default. A cadence has one
 * (the situation's own timeline). Who is involved has one (the lead alone, and the screen says so).
 * An aim has none - nobody else can supply it and nothing can be inferred from it being absent.
 *
 * AND SAYING THERE IS NOT ONE IS AN ANSWER. Hafsah's rule, learned from "My team": a required field
 * somebody cannot answer becomes a field they invent. So a lead who says there is no target, or that
 * they do not know yet, has answered - `noAimAndTheySaidSo` records that and the gate opens. What is
 * not acceptable is never asking.
 */

/**
 * THE SITUATIONS THAT HAVE NO AIM ON PURPOSE, AND THIS LIST IS THE WHOLE POINT OF BEING CAREFUL.
 *
 * SNAPSHOT's own pack says "DO NOT SET UP ANYTHING... Do not ask what they own, what they are
 * working to, what success looks like". One honest read from everyone, once. Forcing an aim here
 * would break the one situation in the product that is deliberately a single report.
 *
 * PULSE_CHECK does have a target, and the lead is not the one who gives it: its pack establishes
 * what each PERSON owns in their own first session, because the whole read is each person against
 * their own work. Demanding one from the lead at setup asks the wrong human.
 *
 * TEAM_UPDATES has no aim by construction rather than by omission: the lead writes one line saying
 * what they want to know, and that line is the whole of it. Somebody who wanted a target opened a
 * different card. Asking for one here is the setup conversation the card exists to avoid.
 *
 * OPEN_READ is the situation whose shape is not known yet - that is its entire reason for existing,
 * and its pack says so. An aim demanded before anybody knows what this is would be invented.
 */
export const NO_AIM_BY_DESIGN = ['SNAPSHOT', 'PULSE_CHECK', 'OPEN_READ', 'TEAM_UPDATES', 'DISCOVERY'] as const;

export function anAimIsOwedHere(scenario?: string | null): boolean {
  if (!scenario) return true;
  return !(NO_AIM_BY_DESIGN as readonly string[]).includes(scenario);
}

export interface WhatSetupGot {
  mode?: string;
  initial?: string;
  decision?: string;
  goals?: string[];
  /** Set when the lead has said, in words, that there is no target or they do not know one yet. */
  noAimAndTheySaidSo?: boolean;
}

/** Whether an aim has been settled, either by giving one or by saying plainly there is not one. */
export function theAimIsSettled(got: WhatSetupGot, scenario?: string | null): boolean {
  if (!anAimIsOwedHere(scenario)) return true;
  if (got.noAimAndTheySaidSo) return true;
  return !!got.goals?.length;
}

/**
 * The gate. Three fields as before, plus the aim.
 *
 * `theSetupHasStoppedAsking` still overrides this elsewhere, and that is deliberate: a gate that can
 * never open is shut, and stranding somebody in front of a screen with nothing to click is worse
 * than a thin check-in. This makes setup ASK; it does not make it refuse.
 */
export function onboardingIsReady(got: WhatSetupGot, scenario?: string | null): boolean {
  /*
   * THE AIM IS DELIBERATELY NOT REQUIRED HERE. See the head of this file: requiring it measured
   * worse three times running, and the reason is that this gate is read by the screen rather than by
   * the model, so it cannot make setup ask - while everything added alongside it to make setup ask
   * took other answers away. `theAimIsSettled` stays exported and tested, ready for an attempt that
   * does not cost anything to make.
   */
  void scenario;
  /* WHY NOW DOES NOT HOLD SETUP OPEN (first experience, round 2, 31 October 2026). A sales lead answered "We are behind on our
     quarterly target" and was asked what makes this the right time three more times: the extraction read her answer as a
     restatement, the gate stayed shut, and the block that lists what is missing told the model to ask again each turn, over
     "twice is enough". Setup's instructions still ask it once; its answer is kept when given. */
  return !!(got.mode && got.initial);
}

/** What setup never got, named for the log and for the block that tells the model what is missing. */
export function whatSetupNeverGot(got: WhatSetupGot, scenario?: string | null): string[] {
  const missing: string[] = [];
  if (!got.mode) missing.push('what kind of situation this is');
  if (!got.initial) missing.push('what it is about');
  if (!theAimIsSettled(got, scenario)) missing.push('an aim to read the work against');
  return missing;
}
