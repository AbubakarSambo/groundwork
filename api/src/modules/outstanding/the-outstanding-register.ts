/**
 * THE OUTSTANDING REGISTER: A VIEW OVER WHAT IS ALREADY KEPT, NEVER A SECOND STORE (spec 30.2).
 *
 * Every row is read from a commitment, a dependency, an obligation, a to-do or a request that exists
 * already. What the register adds is kept beside them in `register_notes`, one row per source row: a real
 * date read from the words, what an item is waiting for, the question that needs the principal's decision,
 * and the flag for carrying it into next year. The words somebody said are never changed.
 *
 * THE RULES THAT MUST BE PREDICTABLE (they are about what is closed, so code holds them):
 *   - "Done" without proof is "unverified", never completed (conversation/settled-by-proof.ts).
 *   - A later proof settles an earlier pending. A request raised after the proof is a new pending and
 *     keeps the item open. The history stays: every source is kept on the row.
 *   - Silence is never completion. Nothing here closes anything because time passed.
 *   - A vague "done" earns one precise question, put to whoever said it, never to the principal.
 *
 * WHAT A DELEGATE READS is what the principal could read, minus the principal's private to-do list. The
 * list is not built for a delegate at all (`forADelegate`).
 */
import { whenTheyMeant } from '../conversation/when-words-mean-a-date';
import { thePaymentsNow } from '../principal-work/the-payments-work';
import { sayMoney } from '../principal-work/the-money';

export type RegisterStatus =
  | 'open'
  | 'in progress'
  | 'blocked'
  | 'awaiting decision'
  | 'awaiting external party'
  | 'completed'
  | 'cancelled'
  | 'unverified';

export type SourceKind = 'commitment' | 'dependency' | 'obligation' | 'todo' | 'request';

export interface ASource {
  kind: SourceKind;
  id: string;
  /** In plain words, for a person: "a check-in", "a pasted document", "a request". */
  from: string;
  /** What was said there, word for word where it was kept so. */
  said: string;
  at: Date;
}

export interface TheRegisterRow {
  /** The key two sources share when they are one item. Unique per row. */
  key: string;
  item: string;
  workstream: string | null;
  /** A name, or the word "unconfirmed". Never invented. */
  owner: string;
  actionNeeded: string;
  status: RegisterStatus;
  /** What was said about when, untouched. */
  whenSaid: string | null;
  /** A real date, and whether it was read from the words (inferred) or given. */
  dueOn: Date | null;
  dueInferred: boolean;
  dependency: string | null;
  decision: { question: string; options: string[] } | null;
  sources: ASource[];
  lastVerifiedAt: Date;
  carryForward: boolean;
  /** How it was settled where it was: SAID, PROVEN, CONFIRMED. */
  settledBy: string | null;
  /** The one question that would close it, for the person who said it was done. Null when none is needed. */
  questionForTheOwner: string | null;
  /** Somebody (the sender, or a reviewer in a document) said the claim is unsupported. It is never counted as done until something independent shows it. */
  disputed?: boolean;
}

/** A pair that might be the same thing, asked about and never merged on a guess. */
export interface AMatchToAskAbout {
  a: { key: string; item: string; from: string };
  b: { key: string; item: string; from: string };
  question: string;
}

export interface TheRegister {
  rows: TheRegisterRow[];
  toAsk: AMatchToAskAbout[];
}

/* ------------------------------------------------------------------ the status rules */

export interface AStateInput {
  kind: SourceKind;
  /** The source's own state, as stored. */
  state: string;
  settledBy?: string | null;
  /** For a dependency: waiting on somebody outside. */
  external?: boolean;
  /** What the note says it is waiting for. */
  awaiting?: string | null;
}

/** One source's status. Only proof completes anything. */
export function statusOfOneSource(s: AStateInput): RegisterStatus {
  if (s.awaiting === 'decision') return 'awaiting decision';
  if (s.awaiting === 'external') return 'awaiting external party';
  switch (s.kind) {
    case 'commitment':
      if (s.state === 'DROPPED') return 'cancelled';
      if (s.state === 'DONE') return s.settledBy === 'PROVEN' || s.settledBy === 'CONFIRMED' ? 'completed' : 'unverified';
      return 'open';
    case 'todo':
      if (s.state === 'DROPPED') return 'cancelled';
      /* A to-do ticked off is a note to self: it is somebody's word, not proof. */
      return s.state === 'DONE' ? 'unverified' : 'open';
    case 'dependency':
      if (s.external) return 'awaiting external party';
      return s.state === 'BLOCKING' ? 'blocked' : 'in progress';
    case 'obligation':
      if (/both sides say it was done|waived|released/.test(s.state)) return 'completed';
      if (/they say it was done|said it was done/.test(s.state)) return 'unverified';
      if (/cancel|void/.test(s.state)) return 'cancelled';
      return 'open';
    case 'request':
      return s.state === 'waiting' ? 'awaiting decision' : s.state === 'declined' || s.state === 'cancelled' ? 'cancelled' : 'completed';
  }
}

const SEVERITY: RegisterStatus[] = ['awaiting decision', 'blocked', 'awaiting external party', 'in progress', 'open', 'unverified', 'cancelled', 'completed'];

/**
 * WHAT ONE ITEM IS, GIVEN ALL ITS SOURCES. A proof settles every pending that came before it, and a
 * pending that came after it keeps the item open. With only "said done" and nothing shown, it stays
 * unverified. Cancelled needs every source to say so.
 */
export function statusOfAnItem(parts: { status: RegisterStatus; at: Date; settledAt?: Date | null }[]): RegisterStatus {
  if (!parts.length) return 'open';
  const proofs = parts.filter((p) => p.status === 'completed');
  const pending = parts.filter((p) => p.status !== 'completed' && p.status !== 'cancelled' && p.status !== 'unverified');
  const unproven = parts.filter((p) => p.status === 'unverified');
  if (proofs.length) {
    const proofAt = Math.max(...proofs.map((p) => (p.settledAt ?? p.at).getTime()));
    const laterPending = pending.filter((p) => p.at.getTime() > proofAt);
    if (!laterPending.length) return 'completed';
    return worst(laterPending.map((p) => p.status));
  }
  if (pending.length) return worst(pending.map((p) => p.status));
  if (unproven.length) return 'unverified';
  return 'cancelled';
}

function worst(statuses: RegisterStatus[]): RegisterStatus {
  return [...statuses].sort((a, b) => SEVERITY.indexOf(a) - SEVERITY.indexOf(b))[0];
}

/** One precise question, for the person who said it was done. It asks for what a proof would be. */
export function theOneQuestion(item: string, owner: string): string | null {
  if (owner === 'unconfirmed') return `Who is doing this? "${item}"`;
  return `You said "${item}" is done. What was it, who got it, and on which day?`;
}

/* ------------------------------------------------------------------ the same thing said in two places */

const FILLER = new Set(['the', 'a', 'an', 'to', 'of', 'and', 'for', 'on', 'in', 'by', 'with', 'please', 'will', 'i', 'we', 'you', 'it', 'is', 'be', 'that', 'this', 'send', 'sent', 'sending', 'prepare', 'prepared', 'follow', 'up', 'friday', 'monday', 'tuesday', 'wednesday', 'thursday', 'week', 'next', 'this']);

function stem(w: string): string {
  return w.replace(/(?:ing|ed|es|s)$/, '');
}

/** The words that carry the meaning, as a set. "Send the ministry the revised brief" and "revised brief to ministry" share theirs. */
export function theWordsThatMatter(text: string): Set<string> {
  const out = new Set<string>();
  for (const w of text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)) {
    if (w.length < 3 || FILLER.has(w)) continue;
    out.add(stem(w));
  }
  return out;
}

export type HowAlike = 'same' | 'maybe' | 'different';

/**
 * Whether two lines are the one commitment. High overlap with the same (or an unknown) owner is the same;
 * a middling overlap is asked about, never merged; the rest are different. Two different owners are never
 * the same on overlap alone, since the same task can be two people's.
 *
 * This is the safe default reading. A model's reading of the same pair can replace it through `theyMatch`
 * on `buildTheRegister`; the three outcomes and the rule that "maybe" is asked stay the same.
 */
export function howAlike(a: { text: string; owner: string }, b: { text: string; owner: string }): HowAlike {
  const wa = theWordsThatMatter(a.text);
  const wb = theWordsThatMatter(b.text);
  if (!wa.size || !wb.size) return 'different';
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared += 1;
  const score = shared / Math.min(wa.size, wb.size);
  const sameOwner = a.owner === b.owner || a.owner === 'unconfirmed' || b.owner === 'unconfirmed';
  if (score >= 0.75 && shared >= 2 && sameOwner) return 'same';
  if (score >= 0.5 && shared >= 2) return 'maybe';
  return 'different';
}

/* ------------------------------------------------------------------ building it */

interface Raw {
  sourceKind: SourceKind;
  sourceId: string;
  from: string;
  text: string;
  action: string;
  owner: string;
  workstream: string | null;
  whenSaid: string | null;
  dueGiven: Date | null;
  state: string;
  settledBy: string | null;
  settledAt: Date | null;
  at: Date;
  updatedAt: Date;
  external: boolean;
  dependency: string | null;
  decision: { question: string; options: string[] } | null;
  disputed?: boolean;
}

export interface AWaitingForThePrincipal {
  ref: string;
  firstName: string;
  thing: string;
}

export interface BuildArgs {
  organizationId: string;
  principalUserId: string;
  now: Date;
  /** A delegate never reads the principal's private to-do list. */
  forADelegate: boolean;
  /** What waits for the principal to decide, as the suites already serve it to her. */
  waitingForThePrincipal?: AWaitingForThePrincipal[];
  /** A model's reading of whether two lines are one commitment. Falls back to `howAlike`. */
  theyMatch?: (a: { text: string; owner: string }, b: { text: string; owner: string }) => HowAlike;
}

const FROM: Record<string, string> = { PASTE: 'a pasted document', CHECK_IN: 'a check-in', LEAD: 'the lead' };
const nameOf = (u: any): string => (u ? [u.firstName, u.lastName].filter(Boolean).join(' ') : '') || 'unconfirmed';

/** The principal's own register, from what she runs. Reads nothing she could not read. */
export async function buildTheRegister(prisma: any, a: BuildArgs): Promise<TheRegister> {
  const grounds: any[] = (await prisma.ground.findMany({ where: { organizationId: a.organizationId, initiatorId: a.principalUserId }, select: { id: true, label: true } })) ?? [];
  const groundIds = grounds.map((g) => g.id);
  const labelOf = new Map<string, string>(grounds.map((g) => [g.id, g.label]));
  const raws: Raw[] = [];

  if (groundIds.length) {
    const participants: any[] = (await prisma.groundParticipant.findMany({ where: { groundId: { in: groundIds } }, select: { id: true, email: true, userId: true } })) ?? [];
    const userIds = participants.map((p) => p.userId).filter(Boolean);
    const users: any[] = userIds.length ? (await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, firstName: true, lastName: true } })) ?? [] : [];
    const userById = new Map(users.map((u) => [u.id, u]));
    const ownerOf = (participantId: string | null): string => {
      if (!participantId) return 'unconfirmed';
      const p = participants.find((x) => x.id === participantId);
      if (!p) return 'unconfirmed';
      const n = nameOf(userById.get(p.userId));
      return n !== 'unconfirmed' ? n : (p.email ?? 'unconfirmed').split('@')[0];
    };

    const commitments: any[] = (await prisma.groundCommitment.findMany({ where: { groundId: { in: groundIds } } })) ?? [];
    for (const c of commitments) {
      raws.push({
        sourceKind: 'commitment', sourceId: c.id, from: FROM[c.source] ?? 'a check-in', text: c.text,
        action: c.action ?? c.text, owner: ownerOf(c.participantId), workstream: labelOf.get(c.groundId) ?? null,
        whenSaid: c.whenSaid ?? null, dueGiven: null, state: c.status, settledBy: c.settledBy ?? null, settledAt: c.settledAt ?? null,
        at: c.createdAt, updatedAt: c.updatedAt ?? c.createdAt, external: false, dependency: null, decision: null,
      });
    }

    const dependencies: any[] = (await prisma.groundDependency.findMany({ where: { groundId: { in: groundIds }, status: { notIn: ['CLEARED'] } } })) ?? [];
    for (const d of dependencies) {
      const onWhom = d.onParticipantId ? ownerOf(d.onParticipantId) : (d.onLabel ?? null);
      raws.push({
        sourceKind: 'dependency', sourceId: d.id, from: 'a check-in', text: `Get ${d.what}`,
        action: onWhom ? `Get ${d.what} from ${onWhom}.` : `Get ${d.what}.`, owner: ownerOf(d.fromParticipantId), workstream: labelOf.get(d.groundId) ?? null,
        whenSaid: null, dueGiven: null, state: d.status, settledBy: null, settledAt: null,
        at: d.createdAt ?? new Date(0), updatedAt: d.updatedAt ?? d.createdAt ?? new Date(0), external: !d.onParticipantId, dependency: onWhom ? `Waiting on ${onWhom}` : 'Waiting on somebody outside', decision: null,
      });
    }

    const obligations: any[] = (await prisma.obligation.findMany({ where: { groundId: { in: groundIds } } })) ?? [];
    for (const o of obligations) {
      raws.push({
        sourceKind: 'obligation', sourceId: o.id, from: 'an agreement', text: o.says,
        action: o.says, owner: o.whose ?? 'unconfirmed', workstream: labelOf.get(o.groundId) ?? null,
        whenSaid: null, dueGiven: o.dueOn ?? null, state: o.state, settledBy: null, settledAt: null,
        at: o.createdAt, updatedAt: o.updatedAt ?? o.createdAt, external: false, dependency: null, decision: null,
      });
    }
  }

  /* What the people she asked have told Groundwork themselves, outside any check-in (team-loop): their promises, what each waits on, and what shows it done. */
  const contacts: any[] = (await prisma.outreachContact?.findMany?.({ where: { principalUserId: a.principalUserId, state: 'introduced' } }).catch(() => [])) ?? [];
  const theirPeople: any[] = contacts.some((c) => c.personId) ? (await prisma.person.findMany({ where: { id: { in: contacts.map((c) => c.personId).filter(Boolean) } }, select: { id: true, externalId: true } })) ?? [] : [];
  if (theirPeople.length) {
    const nameOfExternal = new Map<string, string>(theirPeople.map((p) => [p.externalId, contacts.find((c) => c.personId === p.id)?.name ?? 'unconfirmed']));
    const told: any[] = (await prisma.commitment.findMany({ where: { organizationId: a.organizationId, personExternalId: { in: [...nameOfExternal.keys()] }, source: 'team_reply' } })) ?? [];
    for (const c of told) {
      /* A claim somebody disputed is open on the row but is only ever somebody's word: it reads as "said, with nothing to show it", never as a task or as done. */
      const disputed = String(c.provenBy ?? '').startsWith('disputed:') && c.state !== 'DROPPED';
      raws.push({
        sourceKind: 'commitment', sourceId: c.id, from: 'what they told Groundwork', text: c.text, action: c.text, owner: nameOfExternal.get(c.personExternalId) ?? 'unconfirmed', workstream: null,
        whenSaid: c.dueSaid ?? null, dueGiven: c.dueAt ?? null, disputed,
        state: c.state === 'KEPT' || disputed ? 'DONE' : c.state === 'DROPPED' ? 'DROPPED' : 'UNKNOWN',
        settledBy: disputed ? 'SAID' : c.state === 'KEPT' ? (String(c.provenBy ?? '').startsWith('material:') ? 'PROVEN' : 'SAID') : null, settledAt: c.resolvedAt ?? null,
        at: c.statedAt ?? c.createdAt, updatedAt: c.resolvedAt ?? c.statedAt ?? c.createdAt, external: false, dependency: c.waitingOn ? `Waiting on ${c.waitingOn}` : null, decision: null,
      });
    }
  }

  if (!a.forADelegate) {
    const me = await prisma.person.findFirst({ where: { organizationId: a.organizationId, linkedUserId: a.principalUserId }, select: { externalId: true } }).catch(() => null);
    if (me?.externalId) {
      const todos: any[] = (await prisma.todo.findMany({ where: { organizationId: a.organizationId, personExternalId: me.externalId, state: { in: ['OPEN', 'DONE'] } } })) ?? [];
      for (const t of todos) {
        raws.push({
          sourceKind: 'todo', sourceId: t.id, from: 'your own list', text: t.text, action: t.text, owner: 'you', workstream: null,
          whenSaid: t.dueSaid ?? null, dueGiven: t.dueAt ?? null, state: t.state, settledBy: null, settledAt: t.doneAt ?? null,
          at: t.createdAt, updatedAt: t.doneAt ?? t.createdAt, external: false, dependency: null, decision: null,
        });
      }
    }
  }

  for (const w of a.waitingForThePrincipal ?? []) {
    raws.push({
      sourceKind: 'request', sourceId: w.ref, from: 'a request', text: w.thing, action: `Decide on ${w.thing}.`, owner: 'you', workstream: null,
      whenSaid: null, dueGiven: null, state: 'waiting', settledBy: null, settledAt: null, at: a.now, updatedAt: a.now, external: false, dependency: null,
      decision: { question: `Do you approve ${w.thing}?`, options: ['Approve it', 'Decline it'] },
    });
  }

  /*
   * HER PAYMENTS ARE ON THE SAME LIST (Fatima round 2, C2). A question about a payment (an approval nobody has seen, a payment said to be paid with nothing to
   * show it, two amounts) is the same question the payments flow put to her or to the owner, read from the same place (thePaymentsNow), so "What needs my
   * decision?" cannot say "nothing" while "Did you approve it?" is waiting in her mail, and "What is outstanding?" cannot say "nothing" while payments are open.
   */
  const payments = await thePaymentsNow(prisma, { organizationId: a.organizationId, principalUserId: a.principalUserId }).catch(() => null);
  for (const d of payments?.discrepancies ?? []) {
    const what = `the payment of ${d.latest.amount ? sayMoney(d.latest.amount) : 'an amount I could not read'} to ${d.latest.payee}${d.latest.reference ? `, reference ${d.latest.reference}` : ''}`;
    const asksHer = d.kind === 'approval missing';
    const text = d.kind === 'approval missing' ? what.replace(/^the /, '').replace(/^./, (c) => c.toUpperCase()) : d.kind === 'no proof' ? `Proof that ${what} was paid` : `Which figure is right for ${what}`;
    raws.push({
      sourceKind: asksHer ? 'request' : 'obligation', sourceId: `payment:${d.id}`, from: 'the payments tracker', text, action: asksHer ? `Decide on ${what}.` : text,
      owner: asksHer ? 'you' : d.latest.owner ?? 'unconfirmed', workstream: 'Payments', whenSaid: null, dueGiven: null,
      state: asksHer ? 'waiting' : 'open', settledBy: null, settledAt: null, at: d.latest.receivedAt, updatedAt: d.latest.receivedAt, external: false, dependency: null,
      decision: asksHer ? { question: `Did you approve ${what}?`, options: ['Yes, I approved it', 'No, I did not'] } : null,
    });
  }

  const notes: any[] = (await prisma.registerNote.findMany({ where: { organizationId: a.organizationId, principalUserId: a.principalUserId } })) ?? [];
  const noteOf = new Map(notes.map((n) => [`${n.sourceKind}:${n.sourceId}`, n]));
  return assemble(raws, noteOf, a);
}

/** Joins sources that are one item, asks about the ones that may be, and gives every item its status. */
export function assemble(raws: Raw[], noteOf: Map<string, any>, a: Pick<BuildArgs, 'now' | 'theyMatch'>): TheRegister {
  const same = a.theyMatch ?? howAlike;
  const keyOf = (r: Raw) => `${r.sourceKind}:${r.sourceId}`;
  /* Union-find over sources: an earlier yes (a shared registerKey) or a confident match joins two. */
  const parent = new Map<string, string>(raws.map((r) => [keyOf(r), keyOf(r)]));
  const find = (k: string): string => (parent.get(k) === k ? k : find(parent.get(k)!));
  const join = (x: string, y: string) => { parent.set(find(x), find(y)); };

  const byKey = new Map<string, Raw[]>();
  for (const r of raws) {
    const k = noteOf.get(keyOf(r))?.registerKey;
    if (k) byKey.set(k, [...(byKey.get(k) ?? []), r]);
  }
  for (const group of byKey.values()) for (const r of group.slice(1)) join(keyOf(group[0]), keyOf(r));

  const toAsk: AMatchToAskAbout[] = [];
  for (let i = 0; i < raws.length; i += 1) {
    for (let j = i + 1; j < raws.length; j += 1) {
      const x = raws[i];
      const y = raws[j];
      if (x.sourceKind === 'request' || y.sourceKind === 'request') continue;
      /* A payment question is its own matter: it is never guessed to be a line somebody said. */
      if (x.sourceId.startsWith('payment:') || y.sourceId.startsWith('payment:')) continue;
      if (find(keyOf(x)) === find(keyOf(y))) continue;
      const nx = noteOf.get(keyOf(x));
      const ny = noteOf.get(keyOf(y));
      if ((nx?.notTheSameAs ?? []).includes(keyOf(y)) || (ny?.notTheSameAs ?? []).includes(keyOf(x))) continue;
      const verdict = same({ text: x.text, owner: x.owner }, { text: y.text, owner: y.owner });
      if (verdict === 'same') join(keyOf(x), keyOf(y));
      else if (verdict === 'maybe') {
        toAsk.push({
          a: { key: keyOf(x), item: x.text, from: x.from },
          b: { key: keyOf(y), item: y.text, from: y.from },
          question: `Is "${x.text}" from ${x.from} the same thing as "${y.text}" from ${y.from}? I have kept them apart until you tell me.`,
        });
      }
    }
  }

  const groups = new Map<string, Raw[]>();
  for (const r of raws) groups.set(find(keyOf(r)), [...(groups.get(find(keyOf(r))) ?? []), r]);

  const rows: TheRegisterRow[] = [];
  for (const [key, members] of groups) {
    const ordered = [...members].sort((p, q) => p.at.getTime() - q.at.getTime());
    const parts = ordered.map((r) => ({
      status: statusOfOneSource({ kind: r.sourceKind, state: r.state, settledBy: r.settledBy, external: r.external, awaiting: noteOf.get(keyOf(r))?.awaiting ?? null }),
      at: r.at,
      settledAt: r.settledAt,
    }));
    const status = statusOfAnItem(parts);
    /* The fullest wording leads, and a confirmed owner beats "unconfirmed". */
    const lead = [...ordered].sort((p, q) => q.action.length - p.action.length)[0];
    const owner = ordered.find((r) => r.owner !== 'unconfirmed')?.owner ?? 'unconfirmed';
    const withWhen = ordered.find((r) => r.whenSaid) ?? null;
    const noted = ordered.map((r) => noteOf.get(keyOf(r))).filter(Boolean);
    const givenDue = ordered.find((r) => r.dueGiven)?.dueGiven ?? null;
    const notedDue: Date | null = noted.find((n) => n.dueOn)?.dueOn ?? null;
    const readDue = !givenDue && !notedDue && withWhen ? whenTheyMeant(withWhen.whenSaid, withWhen.at) : null;
    const dueOn = givenDue ?? notedDue ?? readDue;
    const decisionNote = noted.find((n) => n.decisionQuestion);
    const fromRequest = ordered.find((r) => r.decision)?.decision ?? null;
    const decision = status === 'awaiting decision' ? (decisionNote ? { question: decisionNote.decisionQuestion, options: decisionNote.decisionOptions ?? [] } : fromRequest) : null;
    const verifiedAt = new Date(Math.max(...ordered.map((r) => (r.settledAt ?? r.updatedAt).getTime()), ...noted.map((n) => (n.lastVerifiedAt ? new Date(n.lastVerifiedAt).getTime() : 0))));
    const flagged = noted.find((n) => n.carryForward !== null && n.carryForward !== undefined)?.carryForward;
    const open = status !== 'completed' && status !== 'cancelled';
    const beyondTheYear = !!dueOn && dueOn.getUTCFullYear() > a.now.getUTCFullYear();
    rows.push({
      key,
      item: lead.text,
      workstream: ordered.find((r) => r.workstream)?.workstream ?? null,
      owner,
      actionNeeded: lead.action,
      status,
      whenSaid: withWhen?.whenSaid ?? null,
      dueOn,
      dueInferred: !!readDue && !givenDue && !notedDue,
      dependency: ordered.find((r) => r.dependency)?.dependency ?? null,
      decision,
      sources: ordered.map((r) => ({ kind: r.sourceKind, id: r.sourceId, from: r.from, said: r.text, at: r.at })),
      lastVerifiedAt: verifiedAt,
      carryForward: open && (flagged ?? beyondTheYear),
      settledBy: ordered.find((r) => r.settledBy)?.settledBy ?? null,
      questionForTheOwner: status === 'unverified' && !ordered.some((r) => r.disputed) ? theOneQuestion(lead.text, owner) : null,
      ...(ordered.some((r) => r.disputed) ? { disputed: true } : {}),
    });
  }
  rows.sort((p, q) => (p.dueOn?.getTime() ?? Infinity) - (q.dueOn?.getTime() ?? Infinity) || p.item.localeCompare(q.item));
  return { rows, toAsk };
}

/** Somebody said two lines are the same thing, or are not. Written once, never asked again. */
export async function recordTheMatchAnswer(
  prisma: any,
  a: { organizationId: string; principalUserId: string; aKey: string; bKey: string; same: boolean },
): Promise<void> {
  const split = (k: string) => { const i = k.indexOf(':'); return { kind: k.slice(0, i), id: k.slice(i + 1) }; };
  const x = split(a.aKey);
  const y = split(a.bKey);
  const shared = `same:${[a.aKey, a.bKey].sort().join('|')}`;
  for (const [me, other] of [[x, a.bKey], [y, a.aKey]] as const) {
    const where = { principalUserId_sourceKind_sourceId: { principalUserId: a.principalUserId, sourceKind: me.kind, sourceId: me.id } };
    const found = await prisma.registerNote.findUnique({ where });
    if (a.same) {
      await prisma.registerNote.upsert({ where, create: { organizationId: a.organizationId, principalUserId: a.principalUserId, sourceKind: me.kind, sourceId: me.id, registerKey: shared }, update: { registerKey: shared } });
    } else {
      const apart = [...(found?.notTheSameAs ?? []), other];
      await prisma.registerNote.upsert({ where, create: { organizationId: a.organizationId, principalUserId: a.principalUserId, sourceKind: me.kind, sourceId: me.id, notTheSameAs: apart }, update: { notTheSameAs: apart } });
    }
  }
}
