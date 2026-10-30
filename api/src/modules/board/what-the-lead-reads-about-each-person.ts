import type { AStoredPersonsRecord } from './the-persons-record-store';
import { theOneThingToCoach, type ACoaching, type AThingToCoach, type AClaim, type ThePersonsRecord } from './the-persons-record';
import { theRecordInWords, theCoachingInWords, aClaimSaidFor, type TheRecordInWords, type APartOfTheRecord } from './the-persons-record-in-words';

/**
 * WHAT THE LEAD READS ABOUT EACH PERSON (Groundwork does the managing, part 2; Hafsah, 21 October 2026: "The lead reads the morning
 * summary and the weekly report, acts on what needs him, and about once a month looks properly at the board to make tough decisions
 * about his team. He needs to see who is really delivering and who isn't being honest.").
 *
 * Read only from each person's stored record (the-persons-record-store.ts) and what the lead's board already serves her. Nothing here
 * is rebuilt on opening a page, and nothing is a score or a label on a person: every sentence says what happened, with the days and
 * their own words beside it.
 *
 * THREE READINGS, EACH FOR THE LEAD ALONE (the callers serve them only to the person who runs the check-in):
 *  - WHO GROUNDWORK COULD NOT MOVE (the morning summary and the weekly letter). Only where Groundwork already coached the person in
 *    their check-ins, read it again after a check-in since, and found it the same or worse. Then the lead is told what happened, what
 *    Groundwork already tried, and the one move ("so call Joseph"). Before that, it is Groundwork's to manage and the lead is not told.
 *  - WHAT THEY DELIVERED, WITH PROOF (the board): deals won, with what shows each one, and what they said was done that nothing shows.
 *  - WHERE THEY STAND (the board): one plain line, "doing well", "improving", "needs coaching on" one thing, or "needs a hard
 *    conversation" about one thing, always with the evidence beside it. A plan or an exit is the lead's decision, never Groundwork's,
 *    so neither is ever suggested. Built only where the organisation keeps judgements of a person on (person-judgements.ts): the
 *    callers do not call it otherwise.
 */

export type AKindOfCheckIn = 'sales' | 'collections' | 'matter';

/**
 * THE COACHING GROUNDWORK GAVE THAT HAS NOT WORKED, the point where the lead is told: read again after their check-ins since, and the same
 * or worse. On what they said (proof, a figure that changed), one check-in since is enough, because the lead's numbers rest on it; on
 * anything else, two, because one late or vague check-in is still Groundwork's to coach.
 */
export function theCoachingThatDidNotWork(coaching: readonly ACoaching[]): ACoaching | null {
  return [...coaching].reverse().find((c) => !c.done && !!c.since && (c.outcome === 'the same' || c.outcome === 'worse')
    && (c.about === 'proof' || c.about === 'changes' || (c.since.sessions?.length ?? 0) >= 2)) ?? null;
}

const times = (n: number) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`);

/** What they said was sold, paid or signed, in the words that fit the kind: "a client had paid" on fee notes. */
function whatTheySaid(claims: readonly AClaim[], kind: AKindOfCheckIn): string {
  const kinds = new Set(claims.map((c) => c.kind));
  if (kinds.size === 1 && kinds.has('payment')) return kind === 'sales' ? 'a customer had paid' : 'a client had paid';
  if (kinds.has('payment')) return 'something was sold or paid';
  return 'something was sold or signed';
}

/**
 * ONE LINE FOR THE LEAD'S MORNING ABOUT ONE PERSON GROUNDWORK COULD NOT MOVE, or null. "Joseph said 3 times that something was sold or
 * paid, with nothing on file to show it, and took 2 of those back later. Groundwork asked for the proof and has coached Joseph on it
 * since Monday 12 October, and nothing has changed, so call Joseph."
 */
export function whoGroundworkCouldNotMove(stored: AStoredPersonsRecord | null | undefined, name: string, kind: AKindOfCheckIn): string | null {
  if (!stored || !name) return null;
  const c = theCoachingThatDidNotWork(stored.coaching ?? []);
  if (!c) return null;
  const r = stored.record;
  const s = r.summary;
  const since = `since ${c.givenOn}`;
  const after = c.outcome === 'worse' ? 'it has got worse' : 'nothing has changed';
  const coached = `Groundwork has coached ${name} on it ${since}, and ${after}, so call ${name}.`;
  switch (c.about) {
    case 'proof': {
      const unproven = r.claims.filter((x) => !x.proven);
      if (!unproven.length) return null;
      const back = unproven.filter((x) => !!x.takenBack).length;
      const asked = unproven.some((x) => x.askedForProof);
      return `${name} said ${times(unproven.length)} that ${whatTheySaid(unproven, kind)} with nothing on file${back ? `, and took ${back} back later` : ''}. Groundwork ${asked ? 'asked for the proof and has coached' : 'has coached'} ${name} ${since}, and ${after}, so call ${name}.`;
    }
    case 'changes': {
      const one = r.changes.filter((x) => !x.putRight && x.what === 'units').pop();
      if (!one) return null;
      return `${name}'s figure for ${one.about} went from ${one.from} units on ${one.fromOn} to ${one.to} units on ${one.toOn}, with nothing said about why. ${coached}`;
    }
    case 'promises': {
      const due = s.keptOnTime + s.keptLate + s.notDone + s.late;
      return `${name} has not kept ${s.notDone + s.late} of the ${due} promises that came due. ${coached}`;
    }
    case 'blockers':
      return `${name} raised ${s.blockersRaised} blockers and said what was tried first on ${s.blockersTriedFirst} of them. ${coached}`;
    case 'focus': {
      const one = r.focus.filter((f) => f.canBuy === 'not now').sort((a, b) => b.sessions.length - a.sessions.length)[0];
      if (!one) return null;
      return `${name} has spent ${one.sessions.length} check-ins on ${one.deal}, which cannot buy now. ${coached}`;
    }
    case 'check-ins':
      return `${name} did ${s.checkInsDone} of ${s.checkInsDue} check-ins, ${s.checkInsOnTime} of them on time, and ${s.checkInsSpecific} named the item, what changed and the day. ${coached}`;
  }
  return null;
}

/* ------------------------------------------------------------------------------------------------ where they stand */

export type AStanding = 'doing well' | 'improving' | 'needs coaching' | 'needs a hard conversation' | 'too early to say';

/** What one thing is, said as something to get better at ("needs coaching on ..."). */
const THE_SKILL: Record<AThingToCoach, string> = {
  proof: 'adding proof when saying something is done',
  changes: 'saying so when a figure changes',
  promises: 'keeping promises, and saying early when a date will move',
  blockers: 'trying something before raising a blocker',
  focus: 'spending time on deals that can buy',
  'check-ins': 'checking in on time and naming the item, what changed and the day',
};
/**
 * The skill, said for this person (browser test, 21 October 2026): "checking in on time and naming the item" was said of borrowers who
 * checked in on time five weeks running. For their check-ins, only the parts that fell short are named.
 */
function theSkillFor(about: AThingToCoach, s: ThePersonsRecord['summary']): string {
  if (about !== 'check-ins') return THE_SKILL[about];
  const parts = [
    ...(s.checkInsDue && s.checkInsDone / s.checkInsDue < 0.8 ? ['checking in every time'] : []),
    /* On time is read against the check-ins they did: somebody who missed most of them is told to check in, not also to be on time (item 5). */
    ...(s.checkInsDone && s.checkInsOnTime / s.checkInsDone < 0.7 ? ['checking in on time'] : []),
    ...((s.checkInsDone ? s.checkInsSpecific / s.checkInsDone : 0) < 0.7 ? ['naming the item, what changed and the day'] : []),
  ];
  return parts.length ? (parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0]) : THE_SKILL[about];
}
/** What one thing is, said as what happened ("needs a hard conversation about ..."). */
const THE_PROBLEM: Record<AThingToCoach, string> = {
  proof: 'saying things were done with nothing on file to show it',
  changes: 'figures that changed with nothing said about why',
  promises: 'promises that were not kept',
  blockers: 'raising blockers with nothing tried first',
  focus: 'time spent on deals that cannot buy now',
  'check-ins': 'check-ins that were missed, late or vague',
};
/** Which part of the record in words holds the evidence for one thing. */
const THE_PART: Record<AThingToCoach, RegExp> = {
  proof: /^What .+ said and what shows it$/,
  changes: /^Figures that changed$/,
  promises: /^Promises$/,
  blockers: /^Blockers$/,
  focus: /^Where .+ time went$/,
  'check-ins': /check-ins$/,
};

export interface WhereTheyStand {
  standing: AStanding;
  /** The one plain line: "Joseph needs a hard conversation about saying things were done with nothing on file to show it." */
  says: string;
  /** The evidence beside it, one full sentence each, from the record and the coaching. */
  evidence: string[];
  /** The one thing it is about, where it needs work. */
  about?: AThingToCoach;
}

/** What a plan to help them would start from: "Help Joseph with adding proof when saying something is done." */
export const aPlanToHelpWith = (name: string, about: AThingToCoach) => `Help ${name} with ${THE_SKILL[about]}.`;

/**
 * ONE PLAIN LINE ON WHERE A PERSON STANDS, WITH THE EVIDENCE BESIDE IT, or null where nothing is on record yet. In this order:
 *  - a hard conversation, where Groundwork coached them and it did not work, on what they said (proof, a figure that changed), or on
 *    anything else after two of their check-ins since;
 *  - coaching on one thing, where Groundwork is coaching them on it now, or the record says it needs work and nothing was coached yet;
 *  - improving, where a coaching worked and nothing else needs work;
 *  - doing well, where nothing needs work.
 */
export function whereTheyStand(stored: AStoredPersonsRecord | null | undefined, name: string, label: string): WhereTheyStand | null {
  if (!stored || !name) return null;
  const r = stored.record;
  const s = r.summary;
  if (!s.claims && !s.checkInsDue && !s.promisesDue && !s.blockersRaised) return null;
  const words = theRecordInWords(r, stored.coaching, { self: false, firstName: name }, label);
  const partSays = (about: AThingToCoach) => words.parts.find((p) => THE_PART[about].test(p.heading))?.says ?? null;
  const coachingSaid = (c: ACoaching) => { const w = theCoachingInWords(c, { self: false, firstName: name }); return [w.said, w.since]; };
  const coaching = stored.coaching ?? [];
  const open = [...coaching].reverse().find((c) => !c.done) ?? null;
  const failed = theCoachingThatDidNotWork(coaching);
  const evidenceFor = (about: AThingToCoach, c: ACoaching | null) => [partSays(about), ...(c ? coachingSaid(c) : [])].filter((x): x is string => !!x);

  if (failed) {
    return { standing: 'needs a hard conversation', says: `${name} needs a hard conversation about ${THE_PROBLEM[failed.about]}.`, evidence: evidenceFor(failed.about, failed), about: failed.about };
  }
  if (open) return { standing: 'needs coaching', says: `${name} needs coaching on ${theSkillFor(open.about, s)}.`, evidence: evidenceFor(open.about, open), about: open.about };
  const next = theOneThingToCoach(r);
  if (next) return { standing: 'needs coaching', says: `${name} needs coaching on ${theSkillFor(next, s)}.`, evidence: evidenceFor(next, null), about: next };
  const worked = [...coaching].reverse().find((c) => c.outcome === 'better') ?? null;
  const theGood = (['proof', 'promises', 'check-ins'] as AThingToCoach[]).map(partSays).filter((x): x is string => !!x);
  /*
   * DOING WELL ONLY WHERE NOTHING FALLS SHORT (final real-model check, item 5). Peter answered on Monday and none of the days after, and his
   * board said "Peter is doing well." beside "Peter did one of two check-ins". Brian's said it beside a promise past its day. Where the
   * record holds something that fell short but not yet enough to coach on, it is too early to say, and the facts are given as they are.
   */
  const kept = s.keptOnTime + s.keptLate;
  const shortOf = (['proof', 'promises', 'changes', 'check-ins'] as AThingToCoach[]).filter((a) =>
    a === 'proof' ? s.claims > 0 && s.proven / s.claims < 0.5
      : a === 'promises' ? s.late + s.notDone > kept
      : a === 'changes' ? s.changed > 0
      : s.checkInsDue > 0 && (s.checkInsDue - s.checkInsDone >= 2 || s.checkInsDone / s.checkInsDue < 0.75));
  if (shortOf.length) {
    const facts = (['proof', 'promises', 'changes', 'check-ins'] as AThingToCoach[]).map(partSays).filter((x): x is string => !!x);
    return { standing: 'too early to say', says: `It is too early to say how ${name} is doing.`, evidence: [...(worked ? coachingSaid(worked) : []), ...facts].slice(0, 4) };
  }
  if (worked) return { standing: 'improving', says: `${name} is improving.`, evidence: [...coachingSaid(worked), ...theGood].slice(0, 4) };
  return { standing: 'doing well', says: `${name} is doing well.`, evidence: theGood.slice(0, 3) };
}

/* ------------------------------------------------------------------------------------------------ what they delivered, with proof */

export interface WhatTheyDelivered {
  heading: string;
  /** What is won or done with something on file that shows it, one sentence each. */
  proven: string[];
  /** What they said was won or done that nothing on file shows yet, one sentence each. */
  onlySaid: string[];
  empty: string | null;
}

const A_DEPOSIT = /\bdeposit\b/i;
const amountOf = (r: any): string | null => {
  const f = r?.fields ?? {};
  const v = String(r?.value ?? f.Value ?? '').trim();
  if (v && /\d/.test(v) && !A_DEPOSIT.test(v)) return v;
  const q = String(f.Quoted ?? '').trim();
  return q && /\d/.test(q) ? q : null;
};
const unitsOf = (r: any): number | null => { const n = Number(String(r?.fields?.Units ?? '').replace(/[^\d]/g, '')); return n > 0 ? n : null; };

/** What shows a won deal, from the board's own row, or the latest proven claim about it: "the M-Pesa code RCD8M1LS4W", "a payment record". */
function whatShowsIt(row: any, claims: readonly AClaim[], name: string): string | null {
  const said = [...claims].reverse().find((c) => c.proven && c.about && String(c.about).toLowerCase() === String(row?.name ?? '').toLowerCase());
  if (said?.proofSays) return said.proofSays.replace(/^A document you added$/, `a document ${name} added`).replace(/^A reference you typed$/, `a reference ${name} typed`).replace(/^A colleague confirmed it$/, 'a colleague’s confirmation').replace(/^The /, 'the ').replace(/^A /, 'a ');
  if (row?.mpesaCode) return `the M-Pesa code ${row.mpesaCode}`;
  if (row?.paymentRecord) return 'a payment record';
  if (row?.signedOrder) return 'a signed order';
  return null;
}

/**
 * WHAT ONE PERSON DELIVERED, WITH PROOF. On a sales check-in, the deals the lead's board serves as theirs: each one won, with its amount
 * and what shows it, and each one said to be won that nothing shows. On any other check-in, what they said was paid, signed or done,
 * with what shows it, from their record. The heading says it by their role: "What Njeri recorded as paid, with proof".
 */
export function whatTheyDelivered(o: { participantId: string; name: string; role: string | null; kind: AKindOfCheckIn; board: any; stored: AStoredPersonsRecord | null }): WhatTheyDelivered {
  const claims = o.stored?.record.claims ?? [];
  if (o.kind === 'sales') {
    const rows: any[] = ((o.board?.workRecords ?? []) as any[]).filter((s) => s?.section === 'Deal grid').flatMap((s) => (s.rows ?? []) as any[])
      .filter((r) => (r.kind ?? 'deal') === 'deal' && r.ownerParticipantId === o.participantId);
    const proven = rows.filter((r) => r.group === 'won').map((r) => {
      /* What was sold, as its payment shows it (polish round 15, U14: Juja Hardware's 2 units, not the 5 Joseph asked a price for). */
      const sold = r.soldFields ? { ...r, value: null, fields: r.soldFields } : r;
      const amount = amountOf(sold);
      const units = unitsOf(sold);
      /* A deposit only is said as a deposit, with the code that shows it, never "a payment record" (final real-model check, item 10). */
      if (r.deposit?.says) {
        const code = r.mpesaCode ? `, and the M-Pesa code ${r.mpesaCode} shows it` : '';
        return `${r.name} is won${units ? ` for ${units} ${units === 1 ? 'unit' : 'units'}` : ''} on a deposit${code}. ${r.deposit.says}`;
      }
      const shows = whatShowsIt(r, claims, o.name);
      return `${r.name} is won${units ? ` for ${units} ${units === 1 ? 'unit' : 'units'}` : ''}${amount ? `${units ? ' at' : ' for'} ${amount}` : ''}${shows ? `, and ${shows} shows it` : ''}.`;
    });
    const onlySaid = rows.filter((r) => r.group === 'said-won').map((r) => {
      const amount = amountOf(r);
      return `${o.name} said ${r.name} is won${amount ? ` for ${amount}` : ''}, and nothing on file shows it yet.`;
    });
    return { heading: `What ${o.name} won, with proof`, proven, onlySaid, empty: proven.length || onlySaid.length ? null : `${o.name} has no deal won on record yet.` };
  }
  const who = { self: false, firstName: o.name };
  const proven = claims.filter((c) => c.proven).map((c) => aClaimSaidFor(c, who));
  const onlySaid = claims.filter((c) => !c.proven).map((c) => aClaimSaidFor(c, who));
  const role = String(o.role ?? '');
  const heading = /account/i.test(role) ? `What ${o.name} recorded as paid, with proof`
    : /paralegal/i.test(role) ? `What ${o.name} filed and followed up, with proof`
    /* A borrower repays a loan; they do not collect it (browser test: "What Achieng collected, with proof"). */
    : /borrower/i.test(role) ? `What ${o.name} repaid, with proof`
    : o.kind === 'collections' ? `What ${o.name} collected, with proof`
    : `What ${o.name} delivered, with proof`;
  return { heading, proven, onlySaid, empty: proven.length || onlySaid.length ? null : `Nothing ${o.name} said was paid, signed or done is on record yet.` };
}

/* ------------------------------------------------------------------------------------------------ the weekly letter */

/**
 * What moved this week with proof, at most `atMost`, the latest kept, said in the order it happened: what they said, in their words and
 * with the day, and what shows it. The same customer said twice on one day by one person is said once, in the fuller words.
 */
export function whatMovedWithProof(people: { name: string; stored: AStoredPersonsRecord | null }[], since: Date, until: Date, atMost = 5): string[] {
  const out = new Map<string, { at: number; c: AClaim; name: string }>();
  for (const p of people) {
    for (const c of p.stored?.record.claims ?? []) {
      const at = new Date(c.at).getTime();
      if (!c.proven || at < since.getTime() || at > until.getTime()) continue;
      const key = c.about ? `${p.name}|${c.about}|${c.on}` : `${p.name}|${c.lineId}`;
      const had = out.get(key);
      if (!had || c.said.length > had.c.said.length) out.set(key, { at, c, name: p.name });
    }
  }
  return [...out.values()].sort((a, b) => a.at - b.at).slice(-atMost).map((x) => aClaimSaidFor(x.c, { self: false, firstName: x.name }));
}

/** The evidence behind what they said with nothing on file: their latest claims in their words with the day, what they took back, once each, and a figure that changed. */
function theProofEvidence(stored: AStoredPersonsRecord, name: string, words: TheRecordInWords, atMost = 4): string[] {
  const q = (t: string) => `“${String(t ?? '').trim().replace(/^[“"]|[”"]$/g, '')}”`;
  const out: string[] = [];
  const said = new Set<string>();
  for (const c of [...stored.record.claims].filter((x) => !x.proven).reverse()) {
    out.push(`On ${c.on} ${name} said ${q(c.said)}${c.takenBack ? '' : ' Nothing on file shows it yet.'}`);
    if (c.takenBack && !said.has(c.takenBack.lineId)) { said.add(c.takenBack.lineId); out.push(`On ${c.takenBack.on} ${name} said ${q(c.takenBack.said)}`); }
  }
  const figure = (words.parts.find((x) => /^Figures that changed$/.test(x.heading))?.evidence ?? []).find((e) => !/put the figure/.test(e));
  return [...out.slice(0, figure ? atMost - 1 : atMost), ...(figure ? [figure] : [])];
}

/**
 * WHO NEEDS THE LEAD THIS WEEK, WITH THE EVIDENCE: the person Groundwork could not move, then the lines behind it, with the days and
 * their words (at most three), so the lead can see what was said against what was proved.
 */
export function whoNeedsYouThisWeek(people: { name: string; stored: AStoredPersonsRecord | null }[], kind: AKindOfCheckIn, label: string): { says: string; evidence: string[] }[] {
  const out: { says: string; evidence: string[] }[] = [];
  for (const p of people) {
    const says = whoGroundworkCouldNotMove(p.stored, p.name, kind);
    if (!says || !p.stored) continue;
    const c = theCoachingThatDidNotWork(p.stored.coaching)!;
    const words: TheRecordInWords = theRecordInWords(p.stored.record, p.stored.coaching, { self: false, firstName: p.name }, label);
    const part: APartOfTheRecord | undefined = words.parts.find((x) => THE_PART[c.about].test(x.heading));
    out.push({ says, evidence: c.about === 'proof' ? theProofEvidence(p.stored, p.name, words) : (part?.evidence ?? []).filter((e) => !/ shows it\.$/.test(e)).slice(0, 3) });
  }
  return out;
}

