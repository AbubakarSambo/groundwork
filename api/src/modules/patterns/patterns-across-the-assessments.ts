/**
 * LAYER 2: WHAT THE RECORD SHOWS ABOUT A PERSON OVER TIME (Hafsah's brief of 31 October 2026, part 3; her F2 decisions of
 * 2 November 2026; ~/Desktop/assessment-test/false-flags.md, section 5).
 *
 * THE ONE OWNER of anything Groundwork states about a person's behaviour, good or bad. Every page that says something about how a
 * person works reads it from here; nothing else decides it.
 *
 * HOW IT COUNTS (standards, sections 2 and 3: patterns built over time, each naming its instances; assume people lie, forget and
 * are biased, the lead included; trust evidence; the record is the only limit):
 *   - AN INSTANCE IS ONE DISTINCT ITEM, never one conversation. A promise is the record's promise (GroundCommitment, the owner of
 *     a promise's state, named to the read as `c:<id>`): the same promise reported in three check-ins is one item. A claim or a
 *     wait the read says is the same as one in the previous assessment (`previousItem`) is the same item.
 *   - ONLY THE PERSON'S OWN ACTIONS ARE INSTANCES OF THEIR BEHAVIOUR. A client's promise to pay, an office's delay, somebody else's
 *     obligation is part of their work, never evidence about them.
 *   - THE WHOLE RECORD COUNTS. Proof given in any check-in settles the claim it proves; a missed session is simply not there, so it
 *     never breaks a run.
 *   - A RE-PROMISE PAST ITS DAY COUNTS AS NOT KEPT: each day that passed is one instance (the read marks `dayPassed`).
 *   - SILENCE IS NEVER A FINDING. A promise "not mentioned", a claim nobody asked proof for, a wait with no word of what was tried:
 *     each becomes the next check-in's question for that person (`toAskNextTime`), never a line for the lead.
 *   - A PATTERN NEEDS TWO DISTINCT ITEMS FROM TWO DIFFERENT CHECK-INS before it is stated (three for a strength built from kept
 *     and proved work). Below that it is nothing: one missed promise is one missed promise.
 *
 * WHAT IT ALSO HOLDS (F2): the role each person is really playing against the role they were given, with the evidence; where each
 * person's effort goes against the team's priorities; and the lead's bias, her own setup words about each person (her view)
 * against that person's own record.
 *
 * WHO READS IT: the lead only (who-reads-the-record-across-time.ts). Observations, role signals and the lead's view are hers; a
 * participant never reads the lead's judgement. Nothing here is a label on a person: each line says what happened, in their
 * words, and where.
 */
import type { AnItem, TheAssessment } from '../conversation/the-assessment';

export type APatternKey =
  | 'slipping-promises'
  | 'claims-rarely-proved'
  | 'quiet-excellence'
  | 'overload'
  | 'ownership'
  | 'role-differs-from-given'
  | 'focus-away-from-the-priorities'
  | 'the-leads-bias';

/** Distinct items from at least this many different check-ins before anything is stated. */
export const CHECK_INS_BEFORE_A_PATTERN = 2;
/** Distinct items before a pattern holds; a strength built from kept and proved work asks for three. */
export const ITEMS_BEFORE_A_PATTERN = 2;
export const ITEMS_BEFORE_A_STRENGTH = 3;

export interface AnInstance {
  checkInId: string;
  sessionNumber: number;
  /** The day of the check-in the instance was seen in, YYYY-MM-DD. */
  on: string | null;
  /** What the item is, in a few plain words (the promise, the claim, the wait). */
  item: string;
  /** Their own words, from that check-in. */
  words: string[];
}

export interface APatternAcrossAssessments {
  key: APatternKey;
  /** The participant it is about. For the lead's bias, the lead; `aboutWhom` names the person her view is about. */
  participantId: string;
  aboutWhom?: string;
  /** A strength, something to work on, a sign the load is too much, or something for the lead to look at in herself. */
  kind: 'strength' | 'needs work' | 'too much on';
  /** What happened, in one plain sentence, for the lead. Never a label. */
  saying: string;
  instances: AnInstance[];
  /** 'holds' when it has its distinct items from different check-ins; 'forming' when it has some, not yet enough (never shown). */
  state: 'forming' | 'holds';
}

/** THE ROLE EACH PERSON IS REALLY PLAYING, against the role they were given, with the evidence (lead only). */
export interface TheRoleTheyPlay {
  given: string | null;
  /** Where the given role came from: their own job title, or how the lead described them in setup. */
  givenBy: 'their job title' | 'the lead in setup' | null;
  playing: { checkInId: string; sessionNumber: number; on: string | null; playing: string; fits: 'fits' | 'differs' | 'cannot tell'; words: string[] }[];
  fits: 'fits' | 'differs' | 'cannot tell';
  saying: string;
}

/** WHERE EACH PERSON'S EFFORT GOES against the team's priorities, across their check-ins (lead only). */
export interface WhereTheirEffortGoes {
  areas: { area: string; items: number; onAPriority: number; offAPriority: number }[];
  onAPriority: number;
  offAPriority: number;
  saying: string;
}

/** THE LEAD'S VIEW OF ONE PERSON: her own setup words about them (Hafsah, 2 November: "the lead's own words about people in setup as her view"). */
export interface TheLeadsView {
  leadParticipantId: string;
  /** The lead's first name, for the line she reads ("you" is used in the sentence; the name is kept for the record). */
  leadName: string;
  /** How she spoke of this person in setup, and her words. */
  spokenOf: 'praise' | 'criticism' | 'neutral';
  words: string[];
  setupCheckInId: string;
  on: string | null;
  /** The role she gave them in setup, when she gave one. */
  role: string | null;
}

/** EVERYTHING LAYER 2 HOLDS FOR ONE PERSON, kept on their newest assessment as `acrossTime`. */
export interface TheRecordAcrossTime {
  patterns: APatternAcrossAssessments[];
  role: TheRoleTheyPlay | null;
  focus: WhereTheirEffortGoes | null;
  /** What the next check-in carries for this person, and the one owner of it: what the record cannot settle, and what they said
   *  last time to confirm (each wait still open, each promise of their own). Their own items only, never a judgement. */
  toAskNextTime: string[];
}

export interface AnAssessmentSeen {
  checkInId: string;
  sessionNumber: number;
  on: string | null;
  assessment: TheAssessment;
}

const text = (v: unknown) => String(v ?? '').trim();
const day = (on: string | null) => (on ? on.slice(0, 10) : null);
const firstNameOf = (name: string) => name.trim().split(/\s+/)[0] || name;
/** Their words in quotation marks, as the end of a sentence: the sentence's own full stop is theirs when they gave one. */
const quote = (s: string) => { const w = s.trim().replace(/^"+|"+$/g, ''); return /[.?!]$/.test(w) ? `"${w}"` : `"${w}."`; };
const lowerFirst = (s: string) => s.replace(/\.$/, '').replace(/^([A-Z])(?=[a-z])/, (c) => c.toLowerCase());
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The conversations that count: a missed session holds nothing, so it is simply not there. */
const answered = (seen: AnAssessmentSeen[]) => seen.filter((s) => s.assessment && s.assessment.about?.howItEnded !== 'missed');

/** An item's identity across check-ins: the record's promise id, else the earlier item it is the same as, else itself. */
const ownKey = (s: AnAssessmentSeen, i: AnItem) => `${s.checkInId}/${i.id}`;

function aPattern(
  key: APatternKey, participantId: string, kind: APatternAcrossAssessments['kind'], saying: string, instances: AnInstance[],
  opts: { items?: number; aboutWhom?: string } = {},
): APatternAcrossAssessments | null {
  if (!instances.length) return null;
  const checkIns = new Set(instances.map((i) => i.checkInId)).size;
  const holds = instances.length >= (opts.items ?? ITEMS_BEFORE_A_PATTERN) && checkIns >= CHECK_INS_BEFORE_A_PATTERN;
  return { key, participantId, kind, saying, instances, state: holds ? 'holds' : 'forming', ...(opts.aboutWhom ? { aboutWhom: opts.aboutWhom } : {}) };
}

/* ---------------------------------------------------------------------------------------------------------------------
 * PROMISES. The record's promise (`c:<id>`) is the item; the first check-in that shows its day passed without it done is its
 * instance, and later reports of the same promise are the same item.
 * ------------------------------------------------------------------------------------------------------------------- */

interface APromiseRead { key: string; s: AnAssessmentSeen; due: AnItem }

function thePromisesRead(seen: AnAssessmentSeen[]) {
  const slipped = new Map<string, APromiseRead>();
  const kept = new Map<string, APromiseRead>();
  const notMentioned = new Map<string, APromiseRead>();
  for (const s of answered(seen)) {
    for (const due of (s.assessment.comparedWithLastTime?.promisesDue ?? []) as AnItem[]) {
      const key = text(due.previousItem);
      /* Only a promise the record holds as theirs: an item with no record id is a report of something already settled. */
      if (!key.startsWith('c:')) continue;
      const read = { key, s, due };
      const missed = due.outcome === 'not kept' || (due.outcome === 'still open' && due.dayPassed === true);
      /* Settled stays settled: once kept, a later report of the same promise counts for nothing; kept late is not kept on time. */
      if (missed && !slipped.has(key) && !kept.has(key)) slipped.set(key, read);
      if (due.outcome === 'kept' && !kept.has(key) && !slipped.has(key)) kept.set(key, read);
      /* The latest word on each: "not mentioned" now, and not settled since, is the next check-in's question. */
      if (due.outcome === 'not mentioned') notMentioned.set(key, read); else notMentioned.delete(key);
    }
  }
  for (const k of [...slipped.keys(), ...kept.keys()]) notMentioned.delete(k);
  return { slipped: [...slipped.values()], kept: [...kept.values()], notMentioned: [...notMentioned.values()] };
}

const thePromise = (due: AnItem) => text(due.promise) || text(due.words);
const promiseInstance = (r: APromiseRead): AnInstance => ({
  checkInId: r.s.checkInId, sessionNumber: r.s.sessionNumber, on: day(r.s.on), item: thePromise(r.due), words: text(r.due.words) ? [text(r.due.words)] : [],
});

/* ---------------------------------------------------------------------------------------------------------------------
 * CLAIMS. A claim that needed proof (the read's `needsProof`: something said to be done, sold, paid or true that a document,
 * a photo or another person could show; never "I did not do it", a plan or a feeling) is settled by proof in any check-in: its
 * own, a later claim that is the same one and proved, or a later document that proves it. An instance is a claim whose proof was
 * asked for or promised (`proofAsked`) and never came. One nobody asked proof for is a question for next time.
 * ------------------------------------------------------------------------------------------------------------------- */

interface AClaimRead { key: string; s: AnAssessmentSeen; claim: AnItem; proved: boolean }

function theClaimsRead(seen: AnAssessmentSeen[]) {
  const claims = new Map<string, AClaimRead>();
  /* Which earlier item a later one is the same as, so proof later settles it. */
  const sameAs = new Map<string, string>();
  const ofPrevious = (s: AnAssessmentSeen, id: unknown) => {
    const prev = s.assessment.comparedWithLastTime?.previousCheckInId;
    return prev && text(id) ? `${prev}/${text(id)}` : null;
  };
  const root = (k: string) => { let r = k; const been = new Set<string>(); while (sameAs.has(r) && !been.has(r)) { been.add(r); r = sameAs.get(r)!; } return r; };
  for (const s of answered(seen)) {
    for (const c of (s.assessment.claims ?? []) as AnItem[]) {
      const key = ownKey(s, c);
      const earlier = ofPrevious(s, c.previousItem);
      if (earlier && claims.has(root(earlier))) sameAs.set(key, root(earlier));
      const r = root(key);
      const proved = c.proof === 'proved';
      const had = claims.get(r);
      if (had) { had.proved = had.proved || proved; had.claim = { ...had.claim, proofAsked: had.claim.proofAsked === true || c.proofAsked === true }; }
      else claims.set(r, { key: r, s, claim: c, proved });
    }
    for (const d of (s.assessment.documents ?? []) as AnItem[]) {
      const proves = ofPrevious(s, d.provesItem);
      const r = proves ? claims.get(root(proves)) : undefined;
      if (r) r.proved = true;
    }
  }
  const all = [...claims.values()];
  const needed = all.filter((c) => c.claim.needsProof === true);
  return {
    proved: all.filter((c) => c.proved),
    neededAndProved: needed.filter((c) => c.proved),
    askedAndNotProved: needed.filter((c) => !c.proved && c.claim.proofAsked === true),
    notAskedYet: needed.filter((c) => !c.proved && c.claim.proofAsked !== true),
  };
}

const theClaim = (c: AnItem) => text(c.claim) || text(c.words);
const claimInstance = (r: AClaimRead): AnInstance => ({
  checkInId: r.s.checkInId, sessionNumber: r.s.sessionNumber, on: day(r.s.on), item: theClaim(r.claim), words: text(r.claim.words) ? [text(r.claim.words)] : [],
});

/* ---------------------------------------------------------------------------------------------------------------------
 * WAITS. A wait they said they had already done something about, once per wait (the same wait again is `previousItem`).
 * ------------------------------------------------------------------------------------------------------------------- */

function theWaitsTheyActedOn(seen: AnAssessmentSeen[]): AnInstance[] {
  const out = new Map<string, AnInstance>();
  const sameAs = new Map<string, string>();
  for (const s of answered(seen)) {
    const prev = s.assessment.comparedWithLastTime?.previousCheckInId;
    for (const b of (s.assessment.blockers ?? []) as AnItem[]) {
      const key = ownKey(s, b);
      const earlier = prev && text(b.previousItem) ? `${prev}/${text(b.previousItem)}` : null;
      const r = earlier ? sameAs.get(earlier) ?? earlier : key;
      sameAs.set(key, r);
      if (!text(b.triedSaid) || out.has(r)) continue;
      out.set(r, { checkInId: s.checkInId, sessionNumber: s.sessionNumber, on: day(s.on), item: text(b.what) || text(b.words), words: [text(b.triedSaid)] });
    }
  }
  return [...out.values()];
}

/* ---------------------------------------------------------------------------------------------------------------------
 * THE ROLE THEY PLAY, AND WHERE THEIR EFFORT GOES.
 * ------------------------------------------------------------------------------------------------------------------- */

function theRoleTheyPlay(name: string, seen: AnAssessmentSeen[], givenInSetup: string | null): TheRoleTheyPlay | null {
  const first = firstNameOf(name);
  const playing = answered(seen)
    .filter((s) => text(s.assessment.roleAgainstGiven?.playing))
    .map((s) => ({
      checkInId: s.checkInId, sessionNumber: s.sessionNumber, on: day(s.on), playing: text(s.assessment.roleAgainstGiven!.playing),
      fits: s.assessment.roleAgainstGiven!.fits, words: ((s.assessment.roleSignals ?? []) as AnItem[]).map((r) => text(r.words)).filter(Boolean).slice(0, 3),
    }));
  if (!playing.length) return null;
  const ownTitle = [...answered(seen)].reverse().map((s) => text(s.assessment.roleAgainstGiven?.given)).find(Boolean) ?? null;
  const given = ownTitle || givenInSetup || null;
  const givenBy: TheRoleTheyPlay['givenBy'] = ownTitle ? 'their job title' : givenInSetup ? 'the lead in setup' : null;
  const differs = playing.filter((p) => p.fits === 'differs');
  const fitsCount = playing.filter((p) => p.fits === 'fits');
  const fits: TheRoleTheyPlay['fits'] = differs.length >= CHECK_INS_BEFORE_A_PATTERN && differs.length > fitsCount.length ? 'differs'
    : fitsCount.length >= CHECK_INS_BEFORE_A_PATTERN && fitsCount.length >= differs.length ? 'fits' : 'cannot tell';
  const last = playing[playing.length - 1];
  const example = last.words[0] ? ` For example, ${first} said ${quote(last.words[0])}` : ` The latest was ${lowerFirst(last.playing)}.`;
  const givenLine = given ? `${first}'s role is ${given}${givenBy === 'the lead in setup' ? ', as you described it in setup' : ''}. ` : '';
  const saying = fits === 'differs'
    ? `${givenLine}In ${plural(differs.length, 'check-in', 'check-ins')}, the work ${first} described was something else, such as ${[...new Set(differs.map((d) => lowerFirst(d.playing)))].slice(-3).join(' and ')}.${example}`
    : fits === 'fits'
      ? `${givenLine}In ${plural(fitsCount.length, 'check-in', 'check-ins')}, the work ${first} described fits that role.${example}`
      : `${givenLine}The check-ins do not yet show clearly what role ${first} is playing.${example}`;
  return { given, givenBy, playing, fits, saying };
}

function whereTheirEffortGoes(name: string, seen: AnAssessmentSeen[]): WhereTheirEffortGoes | null {
  const first = firstNameOf(name);
  const byArea = new Map<string, { area: string; items: number; onAPriority: number; offAPriority: number }>();
  for (const s of answered(seen)) {
    for (const a of (s.assessment.areas ?? []) as AnItem[]) {
      const area = text(a.area) || 'Other work';
      const row = byArea.get(area.toLowerCase()) ?? { area, items: 0, onAPriority: 0, offAPriority: 0 };
      row.items += 1;
      if (a.fitsAPriority === 'yes') row.onAPriority += 1;
      if (a.fitsAPriority === 'no') row.offAPriority += 1;
      byArea.set(area.toLowerCase(), row);
    }
  }
  const areas = [...byArea.values()].sort((a, b) => b.items - a.items);
  if (!areas.length) return null;
  const on = areas.reduce((n, a) => n + a.onAPriority, 0);
  const off = areas.reduce((n, a) => n + a.offAPriority, 0);
  const most = areas.slice(0, 3).map((a) => a.area).join(', ');
  const saying = on + off
    ? `Of the ${plural(on + off, 'piece of work', 'pieces of work')} ${first} talked about that can be set against the team's priorities, ${on} served a priority and ${off} did not. Most of it was about ${most}.`
    : `Most of what ${first} talked about was about ${most}.`;
  return { areas, onAPriority: on, offAPriority: off, saying };
}

/* ---------------------------------------------------------------------------------------------------------------------
 * THE PATTERNS FOR ONE PERSON.
 * ------------------------------------------------------------------------------------------------------------------- */

function thePatternsFor(participantId: string, name: string, seen: AnAssessmentSeen[]): APatternAcrossAssessments[] {
  const first = firstNameOf(name);
  const promises = thePromisesRead(seen);
  const claims = theClaimsRead(seen);
  const found: (APatternAcrossAssessments | null)[] = [];

  found.push(aPattern('slipping-promises', participantId, 'needs work',
    `${first} has let ${plural(promises.slipped.length, 'promised day', 'promised days')} pass without the work done.`,
    promises.slipped.map(promiseInstance)));

  /* Claims rarely proved: only claims that needed proof, whose proof was asked for or promised and never came, and only when they outnumber the ones proved. */
  if (claims.askedAndNotProved.length > claims.neededAndProved.length) {
    found.push(aPattern('claims-rarely-proved', participantId, 'needs work',
      `${first} has said ${plural(claims.askedAndNotProved.length, 'piece of work was', 'pieces of work were')} done without showing the proof, though it was asked for.`,
      claims.askedAndNotProved.map(claimInstance)));
  }

  /* Quiet excellence: promises kept and work proved, with no promised days slipping. */
  const strong = [...promises.kept.map(promiseInstance), ...claims.proved.map(claimInstance)].sort((a, b) => a.sessionNumber - b.sessionNumber);
  if (promises.slipped.length < ITEMS_BEFORE_A_PATTERN) {
    const parts = [promises.kept.length && `kept ${plural(promises.kept.length, 'promise', 'promises')}`, claims.proved.length && `shown proof for ${plural(claims.proved.length, 'piece of work', 'pieces of work')}`].filter(Boolean);
    found.push(aPattern('quiet-excellence', participantId, 'strength', `${first} has ${parts.join(' and ')}.`, strong, { items: ITEMS_BEFORE_A_STRENGTH }));
  }

  /* Overload: their own words about having too much on, once per check-in. */
  const overload = answered(seen).flatMap((s) => {
    const o = ((s.assessment.observations ?? []) as AnItem[]).filter((x) => x.observed === 'overload');
    return o.length ? [{ checkInId: s.checkInId, sessionNumber: s.sessionNumber, on: day(s.on), item: text(o[0].what) || text(o[0].words), words: o.map((x) => text(x.words)).filter(Boolean).slice(0, 3) }] : [];
  });
  found.push(aPattern('overload', participantId, 'too much on', `In ${plural(overload.length, 'check-in', 'check-ins')}, ${first} described having too much on.`, overload));

  /* Ownership: what they had already tried, said before they raised a wait. */
  const acted = theWaitsTheyActedOn(seen);
  found.push(aPattern('ownership', participantId, 'strength',
    `${first} said what had already been tried before raising ${plural(acted.length, 'thing that was', 'things that were')} in the way.`, acted));

  return found.filter((p): p is APatternAcrossAssessments => !!p);
}

/** What the record cannot settle, as the next check-in's questions to this person: their own items, in their words. */
function whatToAskNextTime(name: string, seen: AnAssessmentSeen[]): string[] {
  const promises = thePromisesRead(seen);
  const claims = theClaimsRead(seen);
  const out: string[] = [];
  for (const r of promises.notMentioned) out.push(`You said you would ${thePromise(r.due).replace(/^I will /i, '').replace(/\.$/, '')}. What happened with it?`);
  for (const r of claims.notAskedYet) out.push(`You said ${quote(text(r.claim.words) || theClaim(r.claim))} Can you share something that shows it, such as a document, a photo or a slip?`);
  const latest = answered(seen).slice(-1)[0];
  /* What they said last time that matters, put back to them to confirm (Hafsah's corrections, change 2c): each wait still open and
     each promise of their own. Where it was recorded wrong, their answer corrects it, like any claim. */
  for (const b of ((latest?.assessment.blockers ?? []) as AnItem[])) {
    if (b.status !== 'CLEARED' && text(b.words)) out.push(`Last time you said ${quote(text(b.words))} Is that still where it stands?`);
  }
  for (const p of ((latest?.assessment.promises ?? []) as AnItem[]).filter((x) => x.byThePerson === true)) {
    const what = (text(p.clear) || text(p.action)).replace(/^I will /i, '').replace(/\.$/, '');
    if (what) out.push(`Last time you said you would ${lowerFirst(what)}. Did it happen?`);
  }
  for (const q of ((latest?.assessment.stillOpen ?? []) as AnItem[])) { const t = text(q.question); if (t) out.push(/[.?!]$/.test(t) ? t : `${t}?`); }
  return [...new Set(out)].slice(0, 8);
}

/**
 * THE LEAD'S BIAS: her view of a person (her own setup words about them) against that person's own record. Stated only when the
 * record clearly points the other way: she spoke critically and the record shows a strength and nothing to work on, or she
 * praised and the record shows something to work on and no strength. It is about the lead, and read by the lead alone.
 */
export function theLeadsBias(member: { participantId: string; name: string }, view: TheLeadsView | null, theirs: APatternAcrossAssessments[]): APatternAcrossAssessments | null {
  if (!view || view.spokenOf === 'neutral' || !view.words.length) return null;
  const holding = theirs.filter((p) => p.state === 'holds' && p.key !== 'the-leads-bias');
  const strength = holding.filter((p) => p.kind === 'strength');
  const work = holding.filter((p) => p.kind === 'needs work');
  const against = view.spokenOf === 'criticism' ? (strength.length && !work.length ? strength : []) : (work.length && !strength.length ? work : []);
  if (!against.length) return null;
  const first = firstNameOf(member.name);
  const herWords: AnInstance = { checkInId: view.setupCheckInId, sessionNumber: 1, on: day(view.on), item: `What you said about ${first} in setup`, words: view.words.slice(0, 3) };
  const record = against.flatMap((p) => p.instances);
  return {
    key: 'the-leads-bias', participantId: view.leadParticipantId, aboutWhom: member.name, kind: 'needs work',
    saying: `In setup you said of ${first}, ${quote(view.words[0])} Since then, ${first}'s own record shows something different. ${against.map((p) => p.saying).join(' ')}`,
    instances: [herWords, ...record], state: 'holds',
  };
}

/**
 * EVERYTHING THE RECORD SHOWS ABOUT ONE PERSON, from their own assessments (oldest first), and the lead's setup view of them when
 * there is one. Computed when each assessment is written, kept on it, read by the lead's pages.
 */
export function theRecordAcrossTime(
  participantId: string,
  seen: AnAssessmentSeen[],
  leadsView: TheLeadsView | null = null,
): TheRecordAcrossTime {
  const name = seen[seen.length - 1]?.assessment.about.who ?? 'This person';
  const isTheLead = !!seen[seen.length - 1]?.assessment.about.isTheLead;
  const patterns = isTheLead ? [] : thePatternsFor(participantId, name, seen);
  const role = isTheLead ? null : theRoleTheyPlay(name, seen, leadsView?.role ?? null);
  const focus = isTheLead ? null : whereTheirEffortGoes(name, seen);
  if (role?.fits === 'differs') {
    patterns.push({ key: 'role-differs-from-given', participantId, kind: 'needs work', saying: role.saying, state: 'holds',
      instances: role.playing.filter((p) => p.fits === 'differs').map((p) => ({ checkInId: p.checkInId, sessionNumber: p.sessionNumber, on: p.on, item: p.playing, words: p.words })) });
  }
  if (focus && focus.offAPriority >= ITEMS_BEFORE_A_STRENGTH && focus.offAPriority > focus.onAPriority) {
    const off = answered(seen).flatMap((s) => ((s.assessment.areas ?? []) as AnItem[]).filter((a) => a.fitsAPriority === 'no')
      .map((a) => ({ checkInId: s.checkInId, sessionNumber: s.sessionNumber, on: day(s.on), item: text(a.item) || text(a.area), words: text(a.words) ? [text(a.words)] : [] })));
    const p = aPattern('focus-away-from-the-priorities', participantId, 'needs work', focus.saying, off, { items: ITEMS_BEFORE_A_STRENGTH });
    if (p) patterns.push(p);
  }
  const bias = isTheLead ? null : theLeadsBias({ participantId, name }, leadsView, patterns);
  if (bias) patterns.push(bias);
  return { patterns, role, focus, toAskNextTime: isTheLead ? [] : whatToAskNextTime(name, seen) };
}

/** The lead's view of one person, read from her setup assessment: what she said about them there, and the role she gave them. */
export function theLeadsViewOf(name: string, setup: AnAssessmentSeen | null, leadName: string): TheLeadsView | null {
  const s = setup?.assessment?.setup;
  if (!setup || !s) return null;
  const first = firstNameOf(name).toLowerCase();
  const isAbout = (v: unknown) => text(v).toLowerCase().split(/[^a-z'-]+/).includes(first);
  const notes = ((s.privateNotes ?? []) as AnItem[]).filter((n) => isAbout(n.about));
  const team = ((s.team ?? []) as AnItem[]).filter((t) => isAbout(t.name));
  const people = ((setup.assessment.people ?? []) as AnItem[]).filter((p) => isAbout(p.name));
  const said = [...notes, ...people.filter((p) => p.spokenOf === 'praise' || p.spokenOf === 'criticism')];
  const tones = said.map((x) => x.spokenOf).filter((t) => t === 'praise' || t === 'criticism');
  const spokenOf: TheLeadsView['spokenOf'] = tones.includes('criticism') && !tones.includes('praise') ? 'criticism'
    : tones.includes('praise') && !tones.includes('criticism') ? 'praise' : 'neutral';
  const words = [...new Set(said.map((x) => text(x.words)).filter(Boolean))];
  const role = team.map((t) => text(t.role)).find(Boolean) ?? null;
  if (!words.length && !role) return null;
  return { leadParticipantId: setup.assessment.about.participantId, leadName, spokenOf, words, setupCheckInId: setup.checkInId, on: setup.on, role };
}

/** The record across time kept on an assessment, read back; an older shape (a bare list) reads as nothing. */
export function theRecordAcrossTimeIn(a: TheAssessment | null | undefined): TheRecordAcrossTime | null {
  const r = (a as any)?.acrossTime;
  return r && typeof r === 'object' && !Array.isArray(r) && Array.isArray(r.patterns) ? (r as TheRecordAcrossTime) : null;
}
