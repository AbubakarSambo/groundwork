/**
 * The board's reads about people, as pure functions over plain data.
 *
 * WHY THIS FILE EXISTS
 *
 * These reads used to live inside BoardService, each one issuing its own Prisma
 * queries. That made them impossible to check: the only way to find out what the
 * board would say about someone was to run a twelve-session conversation against
 * a live model and look. Two separate fixes to the same read regressed between
 * runs without anyone noticing, because nothing could tell us they had.
 *
 * So the deciding is separated from the fetching. The service fetches; this file
 * decides. Everything here is a pure function of its input, which means the
 * captured output of a real run can be replayed through it in milliseconds and
 * asserted against what is actually true about each person
 * (see __fixtures__/ground-truth.ts).
 *
 * The rule that follows from that: no read logic goes back into the service. If
 * it decides something about a person, it belongs here where it can be checked.
 */
import { CheckInStatus, DependencyStatus } from '@prisma/client';
import {
  CoverageKind,
  CoverageRead,
  classifyCoverageReason,
} from './coverage';
import { MIN_COACHING_CONFIDENCE, roleMapFor } from './role-maps';

// ---------------------------------------------------------------------------
// Input shapes - plain data, no Prisma client, no ground object.
// ---------------------------------------------------------------------------

export type ReadParticipant = {
  id: string;
  roleAsDescribed: string | null;
  managingOnly: boolean;
  detectedFunction: string | null;
  detectedFunctionConfidence: number | null;
};

export type ReadCheckIn = {
  participantId: string;
  sessionNumber: number;
  status: CheckInStatus;
};

export type ReadEntry = {
  participantId: string;
  /** Session the entry was recorded in; null when it is not tied to a check-in. */
  sessionNumber: number | null;
  text: string;
};

export type ReadMention = {
  sourceParticipantId: string;
  aboutParticipantId: string;
  kind: string; // CREDIT | COVERAGE | BLOCKED_BY
  sessionNumber: number;
};

export type ReadDependency = {
  fromParticipantId: string;
  onParticipantId: string | null;
  onLabel: string | null;
  what: string;
  status: DependencyStatus;
  /** Sort key only. A number is enough and keeps fixtures readable. */
  createdAt?: Date | number;
};

export type ReadInput = {
  participants: ReadParticipant[];
  checkIns: ReadCheckIn[];
  entries: ReadEntry[];
  mentions: ReadMention[];
  dependencies: ReadDependency[];
  /**
   * Do the people on this ground actually work together?
   *
   * On a cohort - many people in the same role, each in a different place,
   * deliberately not influencing each other - they do not. That is not a
   * property of what they happened to say; it is what the ground IS, so it comes
   * from the scenario family rather than being guessed at from the record.
   *
   * It matters because every fairness read is built on colleagues describing
   * each other. Where there are no colleagues, some of those reads cannot be
   * made honestly at all. Defaults to true, so a caller that does not know
   * assumes collaboration and keeps the existing behaviour.
   */
  peopleWorkTogether?: boolean;
};

export type NameOf = (participantId: string) => string | null;

// ---------------------------------------------------------------------------
// How sure are we? (F2)
// ---------------------------------------------------------------------------

/**
 * Below this, a read is computed but NOT shown.
 *
 * Every read here is built on top of an extraction step that a language model
 * performed, which means none of it is certain. Showing a confident-sounding
 * sentence about someone's contribution on the back of two data points is the
 * failure mode this product cannot afford: it is the sentence a manager
 * remembers. So each read carries how much evidence sits under it, and a read
 * that thin is withheld rather than hedged - a hedge still gets read as a
 * verdict.
 */
export const MIN_READ_CONFIDENCE = 0.45;

export type Confidence = {
  /** 0-1. How much this read should be trusted. */
  confidence: number;
  /** How many separate pieces of evidence it rests on. */
  evidenceCount: number;
  /** Whether it clears the floor and may be shown at all. */
  shown: boolean;
  /** Plain-language statement of what it rests on, always displayed with it. */
  basis: string;
};

/**
 * Confidence rises with the AMOUNT of evidence and with CORROBORATION.
 *
 * Corroboration matters more than volume: one colleague independently naming
 * what someone did is worth more than five self-reported lines, because the
 * self-reported lines all come from the same person with the same incentive.
 */
export function confidenceOf(args: {
  sessions: number;
  checkableEntries: number;
  corroborations: number;
}): Confidence {
  const { sessions, checkableEntries, corroborations } = args;
  const evidenceCount = checkableEntries + corroborations;

  // Sessions set the ceiling: nothing read off one or two check-ins deserves
  // to be stated confidently no matter how much was said in them.
  const ceiling = sessions <= 1 ? 0.3 : sessions === 2 ? 0.5 : sessions < 5 ? 0.8 : 1;
  const fromVolume = Math.min(0.5, checkableEntries * 0.08);
  const fromCorroboration = Math.min(0.4, corroborations * 0.15);
  const confidence = Math.min(ceiling, 0.15 + fromVolume + fromCorroboration);

  const parts: string[] = [`${sessions} check-in${sessions === 1 ? '' : 's'}`];
  parts.push(`${checkableEntries} checkable thing${checkableEntries === 1 ? '' : 's'} named`);
  parts.push(
    corroborations
      ? `${corroborations} independently confirmed by someone else`
      : 'none of it confirmed by anyone else',
  );

  return {
    confidence: Math.round(confidence * 100) / 100,
    evidenceCount,
    shown: confidence >= MIN_READ_CONFIDENCE,
    basis: `Based on ${parts.join(', ')}.`,
  };
}

// ---------------------------------------------------------------------------
// Handoffs
// ---------------------------------------------------------------------------

const stamp = (d?: Date | number) => (d instanceof Date ? d.getTime() : (d ?? 0));

/**
 * Collapse handoffs that are really the same one.
 *
 * Extraction dedupes on write, but every ground created before that fix has the
 * duplicates already - 27 rows for about 4 real handoffs in the live run, which
 * made the summary read "13 blocked" when 2 people were. Deduping on READ too
 * means existing grounds are fixed as well as new ones.
 *
 * The newest row wins, because a handoff someone has stopped describing as
 * blocking is no longer blocking.
 */
export function dedupeDependencies<T extends ReadDependency>(deps: T[]): T[] {
  const norm = (t: string) =>
    (t ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\b(the|a|an|my|our|his|her|their|this|that|some|more|any|for|to)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const out: T[] = [];
  for (const d of [...deps].sort((a, b) => stamp(a.createdAt) - stamp(b.createdAt))) {
    const key = norm(d.what);
    const hit = out.find(
      (e) =>
        e.fromParticipantId === d.fromParticipantId &&
        (norm(e.what) === key || norm(e.what).includes(key) || key.includes(norm(e.what))),
    );
    if (hit) {
      (hit as any).status = d.status;
      (hit as any).what = d.what;
      (hit as any).onParticipantId = d.onParticipantId ?? hit.onParticipantId;
      (hit as any).onLabel = d.onLabel ?? hit.onLabel;
      continue;
    }
    out.push({ ...d });
  }
  return out;
}

/**
 * Does this handoff have enough substance to protect the person behind it? (R3)
 *
 * "Blocked" switches off every negative read about someone, which makes it the
 * most valuable thing on the board to claim. If a passing remark in one sentence
 * were enough, the honest way to look productive would be to mention being stuck
 * once and never again - and the person genuinely stuck for six sessions would be
 * indistinguishable from them.
 *
 * A claim counts when it says who and what. Naming the person it sits with, or
 * describing the thing being waited on in more than a couple of words, is the
 * bar - it is low on purpose, because the aim is to exclude the throwaway
 * mention, not to make people prove they are stuck.
 */
export function blockerHasSubstance(d: ReadDependency): boolean {
  const open = d.status === DependencyStatus.BLOCKING || d.status === DependencyStatus.WAITING;
  if (!open) return false;

  // YOU CANNOT BE BLOCKED ON YOURSELF.
  //
  // A lead saying "I still owe the team the decision on the budget" was recorded
  // as a handoff from her to herself, and the board then read it as "part of this
  // is blocked on someone else, which is different from being behind". She was
  // the someone else. Being blocked switches off every negative read about a
  // person, so this hands the one who is actually holding a decision up the exact
  // protection meant for the people waiting on them - and it is the easiest
  // possible thing to trip accidentally, because naming your own outstanding
  // decision is a normal thing to say in a check-in.
  if (d.onParticipantId && d.onParticipantId === d.fromParticipantId) return false;
  const named = !!d.onParticipantId || !!d.onLabel?.trim();
  const described = (d.what ?? '').trim().split(/\s+/).filter(Boolean).length >= 3;
  return named && described;
}

/** Who is genuinely waiting on someone else, after deduping and the substance bar. */
export function blockedParticipantIds(deps: ReadDependency[]): Set<string> {
  return new Set(dedupeDependencies(deps).filter(blockerHasSubstance).map((d) => d.fromParticipantId));
}

// ---------------------------------------------------------------------------
// Contribution against role
// ---------------------------------------------------------------------------

/**
 * An admission that nothing happened, dressed as a record entry.
 *
 * "I have not closed anything since Loop, if I am honest" was stored as MEDIUM
 * verifiability in the live run - an admission of absence counted as evidence of
 * work. The conversation's specificity counter already understands negation;
 * the tier stamped on the stored entry never learned it, so the honest person
 * saying they have nothing scored the same as the person who shipped.
 */
const ADMITS_ABSENCE =
  /\b(nothing|not|no|none|never|without|yet to|hasn'?t|haven'?t|didn'?t|cannot|can'?t|couldn'?t|unable|still waiting|nowhere)\b/i;

const rawTier = (text: string): 'HIGH' | 'MEDIUM' | 'LOW' => {
  const m = /^\[VERIFIABILITY:(HIGH|MEDIUM|LOW)\]/.exec(text ?? '');
  return (m?.[1] as any) ?? 'LOW';
};

const body = (text: string) =>
  (text ?? '')
    .replace(/^\[VERIFIABILITY:(HIGH|MEDIUM|LOW)\]\s*/, '')
    .replace(/\[INFERRED:[^\]]*\]/g, '')
    .trim();

const tierOf = (text: string): 'HIGH' | 'MEDIUM' | 'LOW' =>
  ADMITS_ABSENCE.test(body(text)) ? 'LOW' : rawTier(text);

/**
 * Drop the echoes of an achievement already on the record.
 *
 * In the live run "I closed Loop this week" was stored as a fresh HIGH entry in
 * sessions 1, 2 AND 4 - one customer, three pieces of evidence. People restate
 * their last win when they have nothing new, which is human and not dishonest,
 * but counting it again each time fills a quiet stretch with the same old news
 * and makes a person who has stopped delivering look steady. The one person in
 * the run who genuinely went quiet read as "steady across the period" for
 * exactly this reason.
 *
 * The FIRST time something is said is the evidence. Every restatement after it
 * is a repeat, and repeats are dropped rather than counted.
 */
export function withoutRepeats<T extends { participantId: string; text: string; sessionNumber: number | null }>(
  entries: T[],
): T[] {
  const norm = (t: string) =>
    body(t)
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const seen = new Map<string, Set<string>>();
  const ordered = [...entries].sort((a, b) => (a.sessionNumber ?? 0) - (b.sessionNumber ?? 0));
  const keep: T[] = [];
  for (const e of ordered) {
    const key = norm(e.text);
    if (!key) continue;
    const mine = seen.get(e.participantId) ?? new Set<string>();
    // Substring either way, because a restatement is rarely word-perfect.
    const repeat = [...mine].some((k) => k === key || (key.length > 15 && (k.includes(key) || key.includes(k))));
    if (repeat) continue;
    mine.add(key);
    seen.set(e.participantId, mine);
    keep.push(e);
  }
  return keep;
}

/** Plain-language shape of someone's record over the sessions that have run. */
export function shapeOf(bySession: Map<number, number>, lastSession: number): string | null {
  if (lastSession < 3) return null;
  const at = (n: number) => bySession.get(n) ?? 0;
  const third = Math.max(1, Math.floor(lastSession / 3));
  const sum = (from: number, to: number) => {
    let t = 0;
    for (let i = from; i <= to; i++) t += at(i);
    return t;
  };
  const early = sum(1, third);
  const late = sum(third * 2 + 1, lastSession);

  let longestGap = 0,
    run = 0,
    gapEnd = 0;
  for (let i = 1; i <= lastSession; i++) {
    if (at(i) === 0) {
      run++;
      if (run > longestGap) {
        longestGap = run;
        gapEnd = i;
      }
    } else run = 0;
  }

  if (longestGap >= 3) {
    const gapStart = gapEnd - longestGap + 1;
    const recovered = late > 0 && gapEnd < lastSession;
    return recovered
      ? `Nothing checkable from session ${gapStart} to ${gapEnd}, then picked up again. The middle of this period is the part worth asking about, not the total.`
      : `Nothing checkable since session ${gapStart}.`;
  }
  if (early > 0 && late === 0) return 'Contributed early, nothing checkable in the most recent sessions.';
  if (early === 0 && late > 0) return 'Slow start, contributing now.';
  if (early > 0 && late > 0) return 'Steady across the period.';
  return null;
}

export type ContributionRead = {
  participantId: string;
  name: string | null;
  remit: string | null;
  remitDefined: boolean;
  position: null;
  positionLabel?: null;
  reason: string | null;
  note?: string;
  fn?: string | null;
  fnLabel?: string | null;
  fnConfident?: boolean;
  isBlocked?: boolean;
  ownVoice?: null;
  guard?: string;
} & Partial<Confidence>;

/**
 * Contribution against role: each person read in THEIR function's own terms,
 * never on one shared scale, because tech and sales do not share a unit.
 *
 * Three hard rules enforced here:
 *  - An UNDEFINED remit shows NO position at all. You cannot measure someone
 *    against a bar that was never set, and an undefined role is often the real
 *    problem rather than the person.
 *  - A position is never returned without its reason attached.
 *  - A read too thin to trust is withheld, not softened.
 */
export function buildContribution(input: ReadInput, nameOf: NameOf): ContributionRead[] {
  const blocked = blockedParticipantIds(input.dependencies);
  const entries = withoutRepeats(input.entries);
  // Whether anyone here is in a position to confirm anyone else's account. On a
  // cohort of people who each work somewhere different, nobody is - and a lead
  // reading these needs telling that, because it is the difference between "no
  // second account agrees" and "no second account exists".
  const peopleWorkTogether = input.peopleWorkTogether !== false;
  const lastSession = input.checkIns.reduce((m, c) => Math.max(m, c.sessionNumber), 0);

  return input.participants
    .filter((p) => !p.managingOnly)
    .map((p): ContributionRead => {
      const remitDefined = !!p.roleAsDescribed?.trim();
      if (!remitDefined) {
        return {
          participantId: p.id,
          name: nameOf(p.id),
          remit: p.roleAsDescribed ?? null,
          remitDefined: false,
          position: null,
          reason: null,
          note:
            'No position shown, because the role was never clearly defined. Define what it is responsible for before assessing anyone against it. An undefined role is often the real problem, not the person.',
          confidence: 0,
          evidenceCount: 0,
          shown: false,
          basis: 'No role was defined, so there is nothing to read against.',
        };
      }

      const map = roleMapFor(p.detectedFunction as any);
      const fnConfident = (p.detectedFunctionConfidence ?? 0) >= MIN_COACHING_CONFIDENCE;
      const mine = input.checkIns.filter((c) => c.participantId === p.id);
      const completed = mine.filter((c) => c.status === CheckInStatus.COMPLETED).length;

      const myEntries = entries.filter((e) => e.participantId === p.id);
      const high = myEntries.filter((e) => tierOf(e.text) === 'HIGH').length;
      const medium = myEntries.filter((e) => tierOf(e.text) === 'MEDIUM').length;
      const checkable = high + medium;
      const bySession = new Map<number, number>();
      for (const e of myEntries) {
        if (e.sessionNumber == null) continue;
        bySession.set(e.sessionNumber, (bySession.get(e.sessionNumber) ?? 0) + (tierOf(e.text) === 'LOW' ? 0 : 1));
      }

      // CORROBORATION, not counting. (R1)
      //
      // How much someone typed is a measure of how they write. Whether anyone
      // else independently named what they did is a measure of whether it
      // happened. The person who describes their work modestly and the person
      // who describes it lavishly produce very different totals for the same
      // week of work; only corroboration tells them apart.
      const corroborations = input.mentions.filter(
        (m) => m.aboutParticipantId === p.id && m.sourceParticipantId !== p.id && m.kind === 'CREDIT',
      ).length;

      const conf = confidenceOf({ sessions: completed, checkableEntries: checkable, corroborations });
      const isBlocked = blocked.has(p.id);

      // A READ THAT ONLY REPORTS AN ABSENCE IS HONEST AT ANY CONFIDENCE.
      //
      // The floor exists to stop thin evidence turning into a verdict about a
      // person. "Nothing named so far could be checked by anyone else" is not a
      // verdict - it is a statement about what the record contains, and it is the
      // single most useful thing to tell a lead who has to make a decision about
      // someone. Withholding it for low confidence produced silence about exactly
      // the person the product should have had something to say about, which is
      // the opposite of the intent.
      const onlyReportsAbsence = checkable === 0;

      // NO on-track / below-track label. Any threshold that produced one would
      // be invented, and a label reads as a score on the person no matter how
      // it is worded. What the record actually shows is the read; that is all
      // this returns.
      const reasonParts: string[] = [];
      if (myEntries.length === 0) {
        reasonParts.push(`${completed} check-in${completed === 1 ? '' : 's'} on record, nothing specific named yet.`);
      } else if (checkable === 0) {
        reasonParts.push(
          `${completed} check-in${completed === 1 ? '' : 's'} on record. Nothing named so far could be checked by anyone else - no named people, organisations, numbers or dates.`,
        );
      } else {
        reasonParts.push(
          `${completed} check-in${completed === 1 ? '' : 's'} on record. ${checkable} of ${myEntries.length} things named are specific enough to check later${high ? `, ${high} backed by something concrete` : ''}.`,
        );
        const shape = shapeOf(bySession, lastSession);
        // The same protection the coverage read gives the quiet load-bearer has
        // to apply to the sentence about their record too. "Nothing checkable
        // since session 11" about the engineer whose colleagues are crediting him
        // that same week is a true statement that leaves a false impression, and
        // the false impression is what gets remembered.
        if (shape) reasonParts.push(
          corroborations > 0 && /^Nothing checkable/.test(shape)
            ? `${shape} Other people were still naming them as the reason things moved during that stretch, so this is more likely work described modestly than work that stopped.`
            : shape,
        );
      }
      if (corroborations > 0) {
        reasonParts.push(
          `${corroborations} of these ${corroborations === 1 ? 'was' : 'were'} independently named by someone else, which is worth more than the count of what was said.`,
        );
      }
      if (isBlocked) {
        // Blocked must NEVER read as behind. This is the protection the
        // engineering and PM maps both call for, applied generally.
        reasonParts.push(
          'Part of this is blocked on someone else (see what people are waiting on), which is different from being behind. Separate the two before reading anything into it.',
        );
      }
      if (!peopleWorkTogether && completed >= 3) {
        // The limitation itself, stated plainly. Someone who does the work and
        // describes it flatly looks identical to someone who did not do it, and
        // on this kind of ground there is no colleague who could tell them apart.
        reasonParts.push(
          'Nobody else on this ground sees this person\'s work, so there is no second account to check any of this against. Read it as one account, not as confirmed.',
        );
      }
      if (map) {
        reasonParts.push(`Read against ${map.label}: on track here means ${map.onTrackMeans.toLowerCase()}`);
        if (!fnConfident) reasonParts.push('This read of their function is still provisional.');
      }

      return {
        participantId: p.id,
        name: nameOf(p.id),
        remit: p.roleAsDescribed,
        remitDefined: true,
        position: null,
        positionLabel: null,
        reason: reasonParts.join(' '),
        fn: p.detectedFunction ?? null,
        fnLabel: map?.label ?? null,
        fnConfident,
        isBlocked,
        ownVoice: null,
        ...conf,
        shown: onlyReportsAbsence ? true : conf.shown,
        guard:
          'Each person against their own role, in its own terms, never on one scale. A position is never shown without its reason, and never at all if the role was not defined. This shows what the record holds, not a rating of anyone.',
      };
    });
}

// ---------------------------------------------------------------------------
// Where work is landing
// ---------------------------------------------------------------------------

export type CoverageResult = { scope: 'role'; reads: (CoverageRead & Partial<Confidence>)[] };

/**
 * Where work is landing. Two-sided, coupled to the reason it cannot
 * self-determine, own-voice enabled, and only where the remit is defined.
 *
 * Computed at ROLE scope only - the sharpest individual read. The other three
 * scopes are in the type but are not derivable until a department or company
 * structure exists to read them at, so they are deliberately absent rather than
 * faked.
 */
export function buildCoverage(input: ReadInput, nameOf: NameOf): CoverageResult {
  const blocked = blockedParticipantIds(input.dependencies);
  const entries = withoutRepeats(input.entries);

  // CAN ANYONE HERE CORROBORATE ANYONE?
  //
  // The quiet-record signal below is only safe because of its guard: someone who
  // goes quiet in their own account is protected if colleagues keep crediting
  // them through the silence. That guard reads the ABSENCE of credit as evidence.
  //
  // Where nobody can credit anybody, absence of credit means nothing, and the
  // guard fails open on everyone. Four clinic managers each running a separate
  // clinic in a different town never see each other's work. Run against exactly
  // that shape, the manager who finished all fourteen modules and was signed off
  // unsupervised was read as "nothing specific for six check-ins in a row, worth
  // asking where the work is going" - and so was the trainer, whose job is
  // training rather than clinic output. On a ground deciding whether people keep
  // their jobs, that is the most damaging sentence this product could produce.
  //
  // This is deliberately NOT inferred from whether credit happens to appear. A
  // delivery team who simply had a quiet fortnight would then lose the signal
  // too, and that signal is the whole point of the read. It comes from what kind
  // of ground this is, which the scenario family already knows.
  //
  // What someone's record does or does not hold still gets said either way - by
  // the contribution read, in the language of the record rather than the language
  // of work going missing.
  const peopleWorkTogether = input.peopleWorkTogether !== false;
  const reads: (CoverageRead & Partial<Confidence>)[] = [];

  for (const p of input.participants) {
    if (p.managingOnly) continue;
    const remitDefined = !!p.roleAsDescribed?.trim();

    // Leaking out: others describing doing work that sits in THIS person's remit.
    const leakingOut = input.mentions.filter((m) => m.aboutParticipantId === p.id && m.kind === 'COVERAGE');
    // Absorbing in: THIS person describing picking up work that is someone else's.
    const absorbingIn = input.mentions.filter((m) => m.sourceParticipantId === p.id && m.kind === 'COVERAGE');
    // Credit is the opposite signal and must never be counted as coverage - it
    // is the hidden-contribution read, and confusing the two would turn "people
    // say you unblocked them" into "your work is slipping".
    const credited = input.mentions.filter((m) => m.aboutParticipantId === p.id && m.kind === 'CREDIT');

    const myEntries = entries.filter((e) => e.participantId === p.id);
    const own = myEntries.length;
    const denom = own + leakingOut.length;
    const pct = denom === 0 ? 0 : Math.round((leakingOut.length / denom) * 100);

    const myCheckIns = input.checkIns.filter((c) => c.participantId === p.id);
    const completedCount = myCheckIns.filter((c) => c.status === CheckInStatus.COMPLETED).length;
    const lastSessionNumber = myCheckIns.reduce((m, c) => Math.max(m, c.sessionNumber), 0);

    // SECOND SIGNAL: their own record thinning out.
    //
    // Waiting for a colleague to narrate "I did Kavon's work" misses the
    // commonest way ownership drops, because nobody says that - they just
    // quietly do more of their own. Their OWN record going quiet is the tell.
    //
    // CONSECUTIVE quiet periods, not total. Counting total quiet sessions
    // flagged the steady engineer who describes his work modestly - exactly the
    // "invisible work" person the engineering map says to protect - just as hard
    // as the person who genuinely went dark for a month.
    // "Added nothing specific to the record" has to mean exactly that. Counting
    // any entry at all let a run of restated old news and admissions of nothing
    // read as an active session.
    const sessionsWithEntries = new Set<number>(
      myEntries
        .filter((e) => tierOf(e.text) !== 'LOW')
        .map((e) => e.sessionNumber)
        .filter((n): n is number => n != null),
    );
    let longestQuietRun = 0,
      run = 0,
      quietRunEnd = 0;
    for (let n = 1; n <= lastSessionNumber; n++) {
      if (!sessionsWithEntries.has(n)) {
        run++;
        if (run > longestQuietRun) {
          longestQuietRun = run;
          quietRunEnd = n;
        }
      } else run = 0;
    }
    const quietRunStart = quietRunEnd - longestQuietRun + 1;

    // THE HIDDEN CONTRIBUTOR GUARD.
    //
    // Someone can go quiet in their OWN account and still be doing the work -
    // the engineer whose sessions read "stable, consolidating and documenting so
    // it is not all in my head". That is real work described unverifiably, and
    // it is exactly the person the engineering map says to protect from being
    // read as low contribution.
    //
    // What separates them from a genuine drop is whether OTHER people are
    // crediting them DURING the quiet stretch. If colleagues keep naming you as
    // the reason something moved while your own account is modest, that is
    // underclaim, not a drop.
    const creditedDuringQuietRun = credited.some(
      (m) => m.sessionNumber >= quietRunStart && m.sessionNumber <= quietRunEnd,
    );

    // Three consecutive periods is the same bar every other negative read has
    // to clear.
    const ownRecordThinning =
      peopleWorkTogether &&
      completedCount >= 3 &&
      longestQuietRun >= 3 &&
      !blocked.has(p.id) &&
      !creditedDuringQuietRun;

    const kind: CoverageKind =
      (leakingOut.length >= 2 && pct >= 40) || ownRecordThinning
        ? CoverageKind.LEAKING
        : absorbingIn.length >= 2
          ? CoverageKind.ABSORBING
          : CoverageKind.STABLE;

    // Rising over periods, from the sessions the coverage mentions land in. A
    // single period of someone covering is not a pattern - the three-period
    // discipline applies here as it does everywhere else.
    const leakSessions = new Set(leakingOut.map((m) => m.sessionNumber));
    const risingPeriods = Math.max(leakSessions.size, ownRecordThinning ? longestQuietRun : 0);

    const { reason, reasonText } = classifyCoverageReason({
      kind,
      isBlocked: blocked.has(p.id),
      remitDefined,
      ownVoiceClaimsDelegation: false,
      risingPeriods,
    });

    const base = !remitDefined
      ? 'The role was never defined, so there is no boundary to measure against.'
      : kind === CoverageKind.LEAKING && leakingOut.length >= 2
        ? `${leakingOut.length} time${leakingOut.length === 1 ? '' : 's'} across ${risingPeriods} session${risingPeriods === 1 ? '' : 's'}, someone else described doing work that sits in this remit, against ${own} thing${own === 1 ? '' : 's'} named here directly.`
        : kind === CoverageKind.LEAKING
          ? `${longestQuietRun} check-ins in a row added nothing specific to the record, and nothing is blocking them. The work has not stopped existing, so it is worth asking where it is going.`
          : kind === CoverageKind.ABSORBING
            ? `This account describes picking up work outside this remit ${absorbingIn.length} time${absorbingIn.length === 1 ? '' : 's'}.`
            : "Nothing in anyone's account describes this person's work moving elsewhere.";

    // Credit is surfaced WHATEVER the coverage reading is. The person absorbing
    // other people's work is very often the same quiet load-bearer others keep
    // crediting, and dropping their credit because they also picked something up
    // would lose exactly the contribution this is meant to catch.
    const creditNote = credited.length
      ? ` Others credit them ${credited.length} time${credited.length === 1 ? '' : 's'} for moving something forward.`
      : '';

    // Confidence comes from evidence, never from its absence. Counting the quiet
    // run here made the read more certain the less the person said, which is
    // circular: silence was treated as proof of the conclusion drawn from it.
    const conf = confidenceOf({
      sessions: completedCount,
      checkableEntries: leakingOut.length + absorbingIn.length,
      corroborations: credited.length,
    });

    reads.push({
      participantId: p.id,
      name: nameOf(p.id),
      scope: 'role',
      pct,
      kind,
      trend: risingPeriods >= 3 ? 'rising' : 'stable',
      what: remitDefined ? base + creditNote : base,
      reason,
      reasonText,
      ownVoice: null,
      coupledToBlocker: blocked.has(p.id),
      remitDefined,
      // A STABLE read is a statement that nothing was found, which is honest at
      // any confidence. The floor exists to stop thin evidence turning into a
      // read ABOUT someone, so it only gates the two that do.
      ...conf,
      shown: kind === CoverageKind.STABLE ? true : conf.shown,
    } as CoverageRead & Confidence);
  }

  return { scope: 'role', reads };
}
