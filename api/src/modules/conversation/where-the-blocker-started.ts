import { createHash } from 'crypto';

/**
 * WHERE A BLOCKER STARTED (request 18, D3 trace.txt): the steps it went through across check-ins.
 *
 * WHAT THE MODEL IS GIVEN. Only the handoffs on record in the check-ins the chain passes through, each
 * with an id, its check-in and its owners as plain tokens ("person 1"), never names. WHAT IT GIVES
 * BACK is checked in code against that record before anything is stored (`theTraceTheRecordSupports`):
 * every step cites a handoff that exists, takes its check-in and owner from that handoff and not from
 * the model, sounds of nothing the handoff does not say, and names nobody. A trace that fails one test
 * is not stored at all: a half-checked chain is worse than none.
 *
 * NO LABEL ON ANYBODY, NO RATING. The sentences say what happened and why. They are checked for words
 * that judge a person.
 */

export const TRACE_STEP_KINDS = ['need', 'request', 'question', 'approval', 'priority', 'delay', 'effect'] as const;
export type TraceStepKind = (typeof TRACE_STEP_KINDS)[number];

export const BLOCKER_TRACE_PROMPT_KEY = 'blocker_trace';

export const BLOCKER_TRACE_PROMPT = `You are following ONE blocker back through the check-ins it passes through, so a lead can see where it started.

You are given HANDOFFS that people said they are waiting on, each with an id, the check-in it was said in, who raised it and who holds it (as "person 1", "person 2"), what it is about, what happens when it clears, what they said they had done, and when they said it is due. This is the whole record. Use nothing else.

Write the steps the blocker went through, from where it started to where it is felt, each one taken from ONE handoff:
- need: what somebody needs, and by when.
- request: what was asked of another check-in.
- question: a question that was put and not answered.
- approval: a sign-off or rule that has to be passed.
- priority: something else that came first.
- delay: what is late because of it.
- effect: what this costs the work.
Use only the kinds the record supports. Two or three steps is a good answer. Never add a step the handoffs do not say.

For each step give: kind, sourceId (the id of the handoff it comes from), whose (raised = the person who raised that handoff, holds = the person it waits on), and text, one plain sentence of what happened, in full words, using the handoff's own facts (their dates, their things). Say nothing about how quickly or slowly anyone acted.

Then give:
- whereItStarted: one plain sentence of where it started and why it is stuck, joined from the steps. Begin with the words "the request" or a similar plain noun, never a name.
- decisionNeeded: one plain question that would settle it ("Sign off Westgate's credit terms this week?"), or null if the record does not show a decision.
- decisionOwner: the token of the person who decides ("person 2"), or null if the record does not say.

NEVER write a person's name, a person token, or an email address in any sentence. NEVER judge a person: no "slow", "late on their part", "failed", "fault", "blame", "careless". Say what happened, why, and what would change it. If the handoffs do not show a blocker passing through more than one check-in, return no steps.`;

export const BLOCKER_TRACE_SCHEMA = {
  name: 'emit_blocker_trace',
  description: 'Emit the steps a blocker went through, each taken from one handoff on record.',
  input_schema: {
    type: 'object',
    properties: {
      steps: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            kind: { type: 'string', enum: [...TRACE_STEP_KINDS] },
            sourceId: { type: 'string', description: 'The id of the handoff this step comes from.' },
            whose: { type: 'string', enum: ['raised', 'holds'] },
            text: { type: 'string', description: 'One plain sentence. No names.' },
          },
          required: ['kind', 'sourceId', 'whose', 'text'],
        },
      },
      whereItStarted: { type: ['string', 'null'] },
      decisionNeeded: { type: ['string', 'null'] },
      decisionOwner: { type: ['string', 'null'] },
    },
    required: ['steps'],
  },
};

export interface HandoffOnRecord {
  id: string;
  groundId: string;
  waitingOnGroundId: string | null;
  fromParticipantId: string;
  onParticipantId: string | null;
  what: string;
  then?: string | null;
  triedSaid?: string | null;
  dueSaid?: string | null;
  onLabel?: string | null;
  createdAt: Date | string;
}

export interface ParticipantOnRecord {
  id: string;
  groundId: string;
  email?: string | null;
  nameGiven?: string | null;
  user?: { firstName: string | null; lastName: string | null } | null;
}

export interface TheModelsTrace {
  steps?: { kind?: string; sourceId?: string; whose?: string; text?: string }[];
  whereItStarted?: string | null;
  decisionNeeded?: string | null;
  decisionOwner?: string | null;
}

export interface StoredStep {
  kind: TraceStepKind;
  groundId: string;
  /** The person whose step it is (the one who raised it, or the one it waits on). An id, never a name. */
  personId: string | null;
  text: string;
  sourceId: string;
}

export interface StoredTrace {
  startGroundId: string;
  endGroundId: string;
  steps: StoredStep[];
  whereItStarted: string;
  decisionNeeded: string | null;
  decisionOwnerParticipantId: string | null;
}

/**
 * THE CHAIN FROM ONE HANDOFF: that handoff, then every open handoff in the check-in it waits on, and
 * so on outwards, to four check-ins. Only handoffs that wait on another check-in lead further.
 */
export function theChainFrom(anchor: HandoffOnRecord, open: HandoffOnRecord[]): { handoffs: HandoffOnRecord[]; groundIds: string[] } {
  const groundIds = [anchor.groundId];
  const handoffs = [anchor];
  let frontier = anchor.waitingOnGroundId;
  while (frontier && !groundIds.includes(frontier) && groundIds.length < 4) {
    groundIds.push(frontier);
    const there = open.filter((h) => h.groundId === frontier && h.id !== anchor.id);
    handoffs.push(...there);
    /* Continue along the newest handoff there that waits on yet another check-in. */
    const onward = there.filter((h) => h.waitingOnGroundId && !groundIds.includes(h.waitingOnGroundId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    frontier = onward?.waitingOnGroundId ?? null;
  }
  return { handoffs: handoffs.slice(0, 24), groundIds };
}

/** What changes the trace: nothing else is read, so nothing else rebuilds it. */
export function theInputKey(handoffs: HandoffOnRecord[]): string {
  const rows = [...handoffs].sort((a, b) => a.id.localeCompare(b.id))
    .map((h) => [h.id, h.groundId, h.waitingOnGroundId, h.what, h.then ?? '', h.triedSaid ?? '', h.dueSaid ?? '', h.onParticipantId ?? ''].join('|'));
  return createHash('sha256').update(rows.join('\n')).digest('hex');
}

/** The record as the model reads it: check-ins and people as plain tokens, no names. */
export function theRecordForTheModel(handoffs: HandoffOnRecord[], groundIds: string[]) {
  const person = new Map<string, string>();
  const token = (id: string | null) => (id ? (person.get(id) ?? (person.set(id, `person ${person.size + 1}`), person.get(id)!)) : null);
  const text = handoffs.map((h) => ({
    id: h.id,
    checkIn: `check-in ${groundIds.indexOf(h.groundId) + 1}`,
    raisedBy: token(h.fromParticipantId),
    heldBy: token(h.onParticipantId),
    waitingOnCheckIn: h.waitingOnGroundId && groundIds.includes(h.waitingOnGroundId) ? `check-in ${groundIds.indexOf(h.waitingOnGroundId) + 1}` : null,
    about: h.what,
    whenItClears: h.then ?? null,
    whatTheySaidTheyDid: h.triedSaid ?? null,
    dueSaid: h.dueSaid ?? null,
    saidOn: new Date(h.createdAt).toISOString().slice(0, 10),
  }));
  return { text: JSON.stringify(text, null, 2), tokens: person };
}

const STOP = new Set(['that', 'this', 'with', 'from', 'have', 'been', 'will', 'they', 'their', 'there', 'than', 'then', 'when', 'what', 'were', 'which', 'would', 'about', 'into', 'before', 'after', 'asked', 'still', 'wait', 'waiting', 'needs', 'need']);
const contentWords = (t: string) => (t.toLowerCase().match(/[a-z0-9]{4,}/g) ?? []).filter((w) => !STOP.has(w));

const JUDGING = /\b(slow|slowly|lazy|laziness|fault|blame|blamed|failed|failure|careless|negligent|incompetent|excuse|excuses|dropped the ball|unreliable)\b/i;

/** Every way a person could be named in a sentence, from the people on the record. */
export function namesOn(people: ParticipantOnRecord[]): string[] {
  const out = new Set<string>();
  for (const p of people) {
    const first = (p.user?.firstName ?? '').trim();
    const last = (p.user?.lastName ?? '').trim();
    for (const part of [first, last, ...(p.nameGiven ?? '').split(/\s+/)]) if (part.trim().length >= 3) out.add(part.trim().toLowerCase());
    if (p.email) { out.add(p.email.toLowerCase()); const local = p.email.split('@')[0]; if (local.length >= 3) out.add(local.toLowerCase()); }
  }
  return [...out];
}

const namesSomebody = (sentence: string, names: string[]) => {
  const s = sentence.toLowerCase();
  if (/\bperson \d+\b|\bparticipant [a-z]\b|@/.test(s)) return true;
  return names.some((n) => new RegExp(`(^|[^a-z])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`).test(s));
};

/**
 * THE CHECK THAT EVERY STEP COMES FROM THE RECORD. Returns the trace to store, or null when any test
 * fails. The check-in and the owner of each step are read off the handoff it cites, never off the model.
 */
export function theTraceTheRecordSupports(
  model: TheModelsTrace | null | undefined,
  anchor: HandoffOnRecord,
  handoffs: HandoffOnRecord[],
  people: ParticipantOnRecord[],
  tokens: Map<string, string>,
): StoredTrace | null {
  if (!model || !Array.isArray(model.steps)) return null;
  const byId = new Map(handoffs.map((h) => [h.id, h]));
  const names = namesOn(people);
  const steps: StoredStep[] = [];
  for (const s of model.steps) {
    const source = s?.sourceId ? byId.get(s.sourceId) : undefined;
    const text = (s?.text ?? '').trim();
    if (!source || !(TRACE_STEP_KINDS as readonly string[]).includes(s?.kind ?? '')) return null;
    if (text.length < 8 || text.length > 240 || namesSomebody(text, names) || JUDGING.test(text)) return null;
    /* It must say something the handoff says: at least one of its own words. */
    const own = new Set(contentWords([source.what, source.then, source.triedSaid, source.dueSaid, source.onLabel].filter(Boolean).join(' ')));
    if (!contentWords(text).some((w) => own.has(w))) return null;
    steps.push({
      kind: s.kind as TraceStepKind,
      groundId: source.groundId,
      personId: (s.whose === 'holds' ? source.onParticipantId : source.fromParticipantId) ?? null,
      text: /[.?!]$/.test(text) ? text : `${text}.`,
      sourceId: source.id,
    });
  }
  /* A chain crosses check-ins: two steps at least, from two check-ins at least, ending where the blocker is felt. */
  if (steps.length < 2 || new Set(steps.map((x) => x.groundId)).size < 2) return null;
  if (steps[steps.length - 1].groundId !== anchor.groundId) return null;

  const started = (model.whereItStarted ?? '').trim().replace(/^where it started:?\s*/i, '');
  if (started.length < 12 || started.length > 320 || namesSomebody(started, names) || JUDGING.test(started)) return null;
  const decision = (model.decisionNeeded ?? '').trim();
  if (decision && (decision.length > 200 || namesSomebody(decision, names) || JUDGING.test(decision))) return null;

  /* The one who decides must be somebody on this record. */
  const ownerToken = (model.decisionOwner ?? '').trim().toLowerCase();
  const ownerId = ownerToken ? ([...tokens.entries()].find(([, t]) => t === ownerToken)?.[0] ?? null) : null;

  return {
    startGroundId: steps[0].groundId,
    endGroundId: steps[steps.length - 1].groundId,
    steps,
    whereItStarted: `Where it started: ${started.charAt(0).toLowerCase()}${started.slice(1)}${/[.!?]$/.test(started) ? '' : '.'}`,
    decisionNeeded: decision ? `Decision needed: ${decision.charAt(0).toLowerCase()}${decision.slice(1)}` : null,
    decisionOwnerParticipantId: decision ? ownerId : null,
  };
}
